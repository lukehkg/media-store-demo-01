"""
EC2 Instance Scheduler Lambda Function
Starts or stops EC2 instance based on EventBridge schedule
"""

import json
import boto3
import os
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize EC2 client
ec2_client = boto3.client('ec2', region_name=os.environ.get('AWS_REGION', 'eu-west-1'))

# Get environment variables
EC2_INSTANCE_ID = os.environ.get('EC2_INSTANCE_ID')


def get_instance_state(instance_id):
    """Get current state of EC2 instance"""
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        if response['Reservations']:
            instance = response['Reservations'][0]['Instances'][0]
            return instance['State']['Name']
        return None
    except Exception as e:
        logger.error(f"Error getting instance state: {str(e)}")
        return None


def start_instance(instance_id):
    """Start EC2 instance"""
    try:
        current_state = get_instance_state(instance_id)
        if current_state == 'running':
            logger.info(f"Instance {instance_id} is already running")
            return {
                'action': 'no_change',
                'state': 'running'
            }
        elif current_state == 'stopped':
            response = ec2_client.start_instances(InstanceIds=[instance_id])
            logger.info(f"Starting instance {instance_id}")
            return {
                'action': 'started',
                'state': 'pending',
                'response': response
            }
        else:
            logger.warning(f"Instance {instance_id} is in state: {current_state}")
            return {
                'action': 'error',
                'state': current_state,
                'error': f'Instance is in {current_state} state'
            }
    except Exception as e:
        logger.error(f"Error starting instance: {str(e)}")
        raise


def stop_instance(instance_id):
    """Stop EC2 instance"""
    try:
        current_state = get_instance_state(instance_id)
        if current_state == 'stopped':
            logger.info(f"Instance {instance_id} is already stopped")
            return {
                'action': 'no_change',
                'state': 'stopped'
            }
        elif current_state == 'running':
            response = ec2_client.stop_instances(InstanceIds=[instance_id])
            logger.info(f"Stopping instance {instance_id}")
            return {
                'action': 'stopped',
                'state': 'stopping',
                'response': response
            }
        else:
            logger.warning(f"Instance {instance_id} is in state: {current_state}")
            return {
                'action': 'error',
                'state': current_state,
                'error': f'Instance is in {current_state} state'
            }
    except Exception as e:
        logger.error(f"Error stopping instance: {str(e)}")
        raise


def lambda_handler(event, context):
    """
    Lambda handler function
    Expects event with 'action' field: 'start' or 'stop'
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    if not EC2_INSTANCE_ID:
        logger.error("EC2_INSTANCE_ID environment variable not set")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'EC2_INSTANCE_ID not configured'
            })
        }
    
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
            result = start_instance(EC2_INSTANCE_ID)
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'action': 'start',
                    'instance_id': EC2_INSTANCE_ID,
                    'result': result,
                    'message': 'Instance start initiated successfully'
                })
            }
        elif action == 'stop':
            result = stop_instance(EC2_INSTANCE_ID)
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'action': 'stop',
                    'instance_id': EC2_INSTANCE_ID,
                    'result': result,
                    'message': 'Instance stop initiated successfully'
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

