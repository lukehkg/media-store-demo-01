"""
ECS Service Scheduler Lambda Function
Starts or stops ECS services based on EventBridge schedule
"""

import json
import boto3
import os
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize ECS client
ecs_client = boto3.client('ecs', region_name=os.environ.get('AWS_REGION', 'eu-west-1'))

# Get environment variables
ECS_CLUSTER = os.environ.get('ECS_CLUSTER')
ECS_SERVICE_BACKEND = os.environ.get('ECS_SERVICE_BACKEND')
ECS_SERVICE_FRONTEND_ADMIN = os.environ.get('ECS_SERVICE_FRONTEND_ADMIN')
ECS_SERVICE_FRONTEND_CLIENT = os.environ.get('ECS_SERVICE_FRONTEND_CLIENT')

# List of all ECS services to manage
ECS_SERVICES = [
    ECS_SERVICE_BACKEND,
    ECS_SERVICE_FRONTEND_ADMIN,
    ECS_SERVICE_FRONTEND_CLIENT
]


def get_service_desired_count(service_name):
    """Get current desired count for an ECS service"""
    try:
        response = ecs_client.describe_services(
            cluster=ECS_CLUSTER,
            services=[service_name]
        )
        if response['services']:
            return response['services'][0]['desiredCount']
        return None
    except Exception as e:
        logger.error(f"Error getting desired count for {service_name}: {str(e)}")
        return None


def update_service_desired_count(service_name, desired_count):
    """Update desired count for an ECS service"""
    try:
        response = ecs_client.update_service(
            cluster=ECS_CLUSTER,
            service=service_name,
            desiredCount=desired_count
        )
        logger.info(f"Updated {service_name} desired count to {desired_count}")
        return response
    except Exception as e:
        logger.error(f"Error updating {service_name}: {str(e)}")
        raise


def start_services():
    """Start all ECS services (set desired count to configured values)"""
    logger.info("Starting ECS services...")
    
    # Desired counts from environment or default to 1
    desired_counts = {
        ECS_SERVICE_BACKEND: int(os.environ.get('BACKEND_DESIRED_COUNT', '1')),
        ECS_SERVICE_FRONTEND_ADMIN: int(os.environ.get('FRONTEND_ADMIN_DESIRED_COUNT', '1')),
        ECS_SERVICE_FRONTEND_CLIENT: int(os.environ.get('FRONTEND_CLIENT_DESIRED_COUNT', '1'))
    }
    
    results = []
    for service_name in ECS_SERVICES:
        if not service_name:
            continue
            
        current_count = get_service_desired_count(service_name)
        target_count = desired_counts.get(service_name, 1)
        
        if current_count == target_count:
            logger.info(f"{service_name} already at desired count: {target_count}")
            results.append({
                'service': service_name,
                'action': 'no_change',
                'desired_count': target_count
            })
        else:
            try:
                update_service_desired_count(service_name, target_count)
                results.append({
                    'service': service_name,
                    'action': 'started',
                    'desired_count': target_count,
                    'previous_count': current_count
                })
            except Exception as e:
                results.append({
                    'service': service_name,
                    'action': 'error',
                    'error': str(e)
                })
    
    return results


def stop_services():
    """Stop all ECS services (set desired count to 0)"""
    logger.info("Stopping ECS services...")
    
    results = []
    for service_name in ECS_SERVICES:
        if not service_name:
            continue
            
        current_count = get_service_desired_count(service_name)
        
        if current_count == 0:
            logger.info(f"{service_name} already stopped")
            results.append({
                'service': service_name,
                'action': 'no_change',
                'desired_count': 0
            })
        else:
            try:
                update_service_desired_count(service_name, 0)
                results.append({
                    'service': service_name,
                    'action': 'stopped',
                    'desired_count': 0,
                    'previous_count': current_count
                })
            except Exception as e:
                results.append({
                    'service': service_name,
                    'action': 'error',
                    'error': str(e)
                })
    
    return results


def lambda_handler(event, context):
    """
    Lambda handler function
    Expects event with 'action' field: 'start' or 'stop'
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Get action from event
    action = None
    if isinstance(event, dict):
        action = event.get('action')
    elif isinstance(event, str):
        try:
            event_dict = json.loads(event)
            action = event_dict.get('action')
        except:
            action = event
    
    if not action:
        logger.error("No action specified in event")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': 'No action specified. Expected "start" or "stop"'
            })
        }
    
    action = action.lower()
    
    try:
        if action == 'start':
            results = start_services()
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'action': 'start',
                    'results': results,
                    'message': 'Services started successfully'
                })
            }
        elif action == 'stop':
            results = stop_services()
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'action': 'stop',
                    'results': results,
                    'message': 'Services stopped successfully'
                })
            }
        else:
            logger.error(f"Invalid action: {action}")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Invalid action: {action}. Expected "start" or "stop"'
                })
            }
    except Exception as e:
        logger.error(f"Error processing action {action}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

