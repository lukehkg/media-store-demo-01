#!/usr/bin/env python3
"""
AWS Cost Calculator Script
Calculates monthly costs based on Terraform configuration and scheduler settings
"""

import json
import sys
import os
import copy
from datetime import datetime, timedelta
from calendar import monthrange

# AWS Pricing (eu-west-1, London) - as of 2024
PRICING = {
    'ecs_fargate': {
        'vcpu_per_hour': 0.04048,
        'memory_per_gb_hour': 0.004445
    },
    'nat_gateway': {
        'per_hour': 0.045,
        'data_processing_per_gb': 0.045
    },
    'alb': {
        'per_hour': 0.0225,
        'lcu_per_hour': 0.008
    },
    'ecr': {
        'storage_per_gb_month': 0.10
    },
    'cloudwatch_logs': {
        'ingestion_per_gb': 0.50,
        'storage_per_gb_month': 0.03
    },
    'data_transfer': {
        'outbound_per_gb': 0.09,
        'inter_az_per_gb': 0.01,
        'free_tier_gb': 1
    },
    'lambda': {
        'requests_per_million': 0.20,
        'compute_per_gb_second': 0.0000166667
    }
}

# Default configuration (from terraform.tfvars.example)
DEFAULT_CONFIG = {
    'region': 'eu-west-1',
    'scheduler_enabled': True,
    'start_time_utc': 7,  # 8 AM GMT+1
    'stop_time_utc': 17,  # 6 PM GMT+1
    'weekdays_only': True,
    'services': {
        'backend': {
            'cpu': 512,  # 0.5 vCPU
            'memory': 1024,  # 1 GB
            'desired_count': 1
        },
        'frontend_admin': {
            'cpu': 256,  # 0.25 vCPU
            'memory': 512,  # 0.5 GB
            'desired_count': 1
        },
        'frontend_client': {
            'cpu': 256,  # 0.25 vCPU
            'memory': 512,  # 0.5 GB
            'desired_count': 1
        }
    },
    'nat_gateway': {
        'enabled': True,
        'single': True,
        'data_processing_gb': 10
    },
    'alb': {
        'enabled': True,
        'average_lcu': 0.5
    },
    'ecr': {
        'repositories': 3,
        'images_per_repo': 10,
        'avg_image_size_gb': 0.5
    },
    'cloudwatch_logs': {
        'ingestion_gb_per_month': 1,
        'retention_days': 3
    },
    'data_transfer': {
        'outbound_gb': 50,
        'inter_az_gb': 10
    }
}


def calculate_hours_per_month(scheduler_enabled, start_hour, stop_hour, weekdays_only):
    """Calculate running hours per month based on scheduler"""
    if not scheduler_enabled:
        return 730  # 24/7 (730 hours/month)
    
    # Calculate hours per day
    hours_per_day = stop_hour - start_hour
    
    if weekdays_only:
        # Monday-Friday only
        # Average: 5 weekdays per week × 4.33 weeks per month = 21.65 days
        days_per_month = 21.65
    else:
        # Every day
        days_per_month = 30.44  # Average days per month
    
    return hours_per_day * days_per_month


def calculate_ecs_fargate_cost(config):
    """Calculate ECS Fargate compute costs"""
    scheduler_enabled = config.get('scheduler_enabled', True)
    start_hour = config.get('start_time_utc', 7)
    stop_hour = config.get('stop_time_utc', 17)
    weekdays_only = config.get('weekdays_only', True)
    
    hours_per_month = calculate_hours_per_month(
        scheduler_enabled, start_hour, stop_hour, weekdays_only
    )
    
    total_cost = 0
    service_costs = {}
    
    for service_name, service_config in config['services'].items():
        cpu_units = service_config['cpu']
        memory_mb = service_config['memory']
        desired_count = service_config['desired_count']
        
        # Convert to vCPU and GB
        vcpu = cpu_units / 1024
        memory_gb = memory_mb / 1024
        
        # Calculate costs
        vcpu_cost = vcpu * hours_per_month * PRICING['ecs_fargate']['vcpu_per_hour'] * desired_count
        memory_cost = memory_gb * hours_per_month * PRICING['ecs_fargate']['memory_per_gb_hour'] * desired_count
        service_cost = vcpu_cost + memory_cost
        
        service_costs[service_name] = {
            'vCPU_cost': round(vcpu_cost, 2),
            'memory_cost': round(memory_cost, 2),
            'total': round(service_cost, 2),
            'hours_per_month': round(hours_per_month, 2)
        }
        
        total_cost += service_cost
    
    return {
        'total': round(total_cost, 2),
        'services': service_costs,
        'hours_per_month': round(hours_per_month, 2),
        'scheduler_enabled': scheduler_enabled
    }


def calculate_nat_gateway_cost(config):
    """Calculate NAT Gateway costs"""
    nat_config = config.get('nat_gateway', {})
    if not nat_config.get('enabled', True):
        return {'total': 0, 'breakdown': {}}
    
    # NAT Gateway is always on (24/7)
    gateway_cost = 730 * PRICING['nat_gateway']['per_hour']
    data_cost = nat_config.get('data_processing_gb', 10) * PRICING['nat_gateway']['data_processing_per_gb']
    
    return {
        'total': round(gateway_cost + data_cost, 2),
        'breakdown': {
            'gateway': round(gateway_cost, 2),
            'data_processing': round(data_cost, 2)
        }
    }


def calculate_alb_cost(config):
    """Calculate Application Load Balancer costs"""
    alb_config = config.get('alb', {})
    if not alb_config.get('enabled', True):
        return {'total': 0, 'breakdown': {}}
    
    # ALB is always on (24/7)
    alb_base_cost = 730 * PRICING['alb']['per_hour']
    lcu_cost = 730 * alb_config.get('average_lcu', 0.5) * PRICING['alb']['lcu_per_hour']
    
    return {
        'total': round(alb_base_cost + lcu_cost, 2),
        'breakdown': {
            'base': round(alb_base_cost, 2),
            'lcu': round(lcu_cost, 2)
        }
    }


def calculate_ecr_cost(config):
    """Calculate ECR storage costs"""
    ecr_config = config.get('ecr', {})
    repositories = ecr_config.get('repositories', 3)
    images_per_repo = ecr_config.get('images_per_repo', 10)
    avg_image_size = ecr_config.get('avg_image_size_gb', 0.5)
    
    total_storage_gb = repositories * images_per_repo * avg_image_size
    cost = total_storage_gb * PRICING['ecr']['storage_per_gb_month']
    
    return {
        'total': round(cost, 2),
        'storage_gb': round(total_storage_gb, 2)
    }


def calculate_cloudwatch_cost(config):
    """Calculate CloudWatch Logs costs"""
    logs_config = config.get('cloudwatch_logs', {})
    ingestion_gb = logs_config.get('ingestion_gb_per_month', 1)
    retention_days = logs_config.get('retention_days', 3)
    
    # Average storage = ingestion / (30 / retention_days)
    avg_storage_gb = ingestion_gb * (retention_days / 30)
    
    ingestion_cost = ingestion_gb * PRICING['cloudwatch_logs']['ingestion_per_gb']
    storage_cost = avg_storage_gb * PRICING['cloudwatch_logs']['storage_per_gb_month']
    
    return {
        'total': round(ingestion_cost + storage_cost, 2),
        'breakdown': {
            'ingestion': round(ingestion_cost, 2),
            'storage': round(storage_cost, 2)
        }
    }


def calculate_data_transfer_cost(config):
    """Calculate data transfer costs"""
    dt_config = config.get('data_transfer', {})
    outbound_gb = dt_config.get('outbound_gb', 50)
    inter_az_gb = dt_config.get('inter_az_gb', 10)
    
    # First 1 GB is free
    outbound_cost = max(0, (outbound_gb - PRICING['data_transfer']['free_tier_gb']) * 
                       PRICING['data_transfer']['outbound_per_gb'])
    inter_az_cost = inter_az_gb * PRICING['data_transfer']['inter_az_per_gb']
    
    return {
        'total': round(outbound_cost + inter_az_cost, 2),
        'breakdown': {
            'outbound': round(outbound_cost, 2),
            'inter_az': round(inter_az_cost, 2)
        }
    }


def calculate_lambda_cost(config):
    """Calculate Lambda function costs (scheduler)"""
    if not config.get('scheduler_enabled', True):
        return {'total': 0, 'breakdown': {}}
    
    # Lambda runs twice per day (start/stop) on weekdays
    # 5 weekdays × 4.33 weeks × 2 invocations = ~43 invocations/month
    # Or every day: 30.44 days × 2 = ~61 invocations/month
    weekdays_only = config.get('weekdays_only', True)
    if weekdays_only:
        invocations = 21.65 * 2  # ~43
    else:
        invocations = 30.44 * 2  # ~61
    
    # Lambda configuration: 256 MB memory, ~5 seconds execution
    memory_gb = 0.256
    execution_seconds = 5
    
    # Free tier: 1M requests and 400,000 GB-seconds free
    requests_cost = max(0, (invocations - 1000000) / 1000000) * PRICING['lambda']['requests_per_million']
    compute_cost = max(0, (invocations * memory_gb * execution_seconds - 400000) / 1000000) * PRICING['lambda']['compute_per_gb_second']
    
    # For small usage, likely within free tier
    total_cost = max(0, requests_cost + compute_cost)
    
    return {
        'total': round(total_cost, 2),
        'breakdown': {
            'requests': round(requests_cost, 2),
            'compute': round(compute_cost, 2),
            'invocations': round(invocations, 0)
        },
        'free_tier_applies': total_cost == 0
    }


def calculate_total_cost(config):
    """Calculate total monthly cost"""
    costs = {
        'ecs_fargate': calculate_ecs_fargate_cost(config),
        'nat_gateway': calculate_nat_gateway_cost(config),
        'alb': calculate_alb_cost(config),
        'ecr': calculate_ecr_cost(config),
        'cloudwatch_logs': calculate_cloudwatch_cost(config),
        'data_transfer': calculate_data_transfer_cost(config),
        'lambda': calculate_lambda_cost(config)
    }
    
    total = sum(c['total'] for c in costs.values())
    
    return {
        'breakdown': costs,
        'total_monthly': round(total, 2),
        'total_annual': round(total * 12, 2),
        'config': {
            'scheduler_enabled': config.get('scheduler_enabled', True),
            'running_hours_per_month': costs['ecs_fargate'].get('hours_per_month', 730)
        }
    }


def print_cost_report(result, original_config=None):
    """Print formatted cost report"""
    print("=" * 70)
    print("AWS MONTHLY COST ANALYSIS")
    print("=" * 70)
    print()
    
    config = result.get('config', {})
    if original_config is None:
        original_config = config
    print(f"Scheduler Enabled: {config['scheduler_enabled']}")
    if config['scheduler_enabled']:
        print(f"Running Hours/Month: {config['running_hours_per_month']:.1f} hours")
        print(f"  (Business hours: Mon-Fri, 8 AM - 6 PM GMT+1)")
    else:
        print("Running Hours/Month: 730 hours (24/7)")
    print()
    
    print("-" * 70)
    print("COST BREAKDOWN")
    print("-" * 70)
    print()
    
    costs = result['breakdown']
    
    # ECS Fargate
    ecs = costs['ecs_fargate']
    print(f"ECS Fargate Compute: ${ecs['total']:.2f}")
    if 'services' in ecs:
        for service, cost in ecs['services'].items():
            print(f"  - {service}: ${cost['total']:.2f} ({cost['hours_per_month']:.1f} hrs)")
    print()
    
    # NAT Gateway
    nat = costs['nat_gateway']
    print(f"NAT Gateway: ${nat['total']:.2f}")
    if 'breakdown' in nat:
        for item, cost in nat['breakdown'].items():
            print(f"  - {item}: ${cost:.2f}")
    print()
    
    # ALB
    alb = costs['alb']
    print(f"Application Load Balancer: ${alb['total']:.2f}")
    if 'breakdown' in alb:
        for item, cost in alb['breakdown'].items():
            print(f"  - {item}: ${cost:.2f}")
    print()
    
    # ECR
    ecr = costs['ecr']
    print(f"ECR Storage: ${ecr['total']:.2f}")
    if 'storage_gb' in ecr:
        print(f"  - Storage: {ecr['storage_gb']:.1f} GB")
    print()
    
    # CloudWatch
    cw = costs['cloudwatch_logs']
    print(f"CloudWatch Logs: ${cw['total']:.2f}")
    if 'breakdown' in cw:
        for item, cost in cw['breakdown'].items():
            print(f"  - {item}: ${cost:.2f}")
    print()
    
    # Data Transfer
    dt = costs['data_transfer']
    print(f"Data Transfer: ${dt['total']:.2f}")
    if 'breakdown' in dt:
        for item, cost in dt['breakdown'].items():
            print(f"  - {item}: ${cost:.2f}")
    print()
    
    # Lambda
    lambda_cost = costs['lambda']
    print(f"Lambda (Scheduler): ${lambda_cost['total']:.2f}")
    if lambda_cost.get('free_tier_applies'):
        print("  - Within AWS Free Tier")
    if 'breakdown' in lambda_cost:
        print(f"  - Invocations/month: {lambda_cost['breakdown'].get('invocations', 0):.0f}")
    print()
    
    print("=" * 70)
    print(f"TOTAL MONTHLY COST: ${result['total_monthly']:.2f}")
    print(f"TOTAL ANNUAL COST:  ${result['total_annual']:.2f}")
    print("=" * 70)
    
    # Savings calculation
    if original_config and original_config.get('scheduler_enabled', True):
        try:
            # Calculate 24/7 cost for comparison
            config_24_7 = copy.deepcopy(original_config)
            config_24_7['scheduler_enabled'] = False
            result_24_7 = calculate_total_cost(config_24_7)
            savings = result_24_7['total_monthly'] - result['total_monthly']
            savings_pct = (savings / result_24_7['total_monthly']) * 100
            
            print()
            print(f"Cost with scheduler: ${result['total_monthly']:.2f}/month")
            print(f"Cost without scheduler (24/7): ${result_24_7['total_monthly']:.2f}/month")
            print(f"Monthly Savings: ${savings:.2f} ({savings_pct:.1f}%)")
            print(f"Annual Savings: ${savings * 12:.2f}")
        except Exception as e:
            print(f"\nNote: Could not calculate 24/7 comparison: {e}")
            import traceback
            traceback.print_exc()


def merge_config(base, override):
    """Deep merge configuration dictionaries"""
    result = copy.deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_config(result[key], value)
        else:
            result[key] = value
    return result

def main():
    """Main function"""
    # Load config from file if provided, otherwise use defaults
    config = copy.deepcopy(DEFAULT_CONFIG)
    
    if len(sys.argv) > 1:
        config_file = sys.argv[1]
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                config = merge_config(config, file_config)
        else:
            print(f"Warning: Config file {config_file} not found, using defaults")
    
    # Calculate costs
    result = calculate_total_cost(config)
    
    # Print report
    print_cost_report(result, config)
    
    # Save to JSON if output file specified
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nCost data saved to {output_file}")


if __name__ == '__main__':
    main()

