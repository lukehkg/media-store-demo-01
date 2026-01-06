#!/bin/bash
# User data script for EC2 instance
# Installs Docker, Docker Compose, and sets up services

set -e

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Install CloudWatch agent (optional)
yum install -y amazon-cloudwatch-agent

# Create application directory
mkdir -p /opt/${project_name}
chown ec2-user:ec2-user /opt/${project_name}

# Log completion
echo "EC2 instance setup completed at $(date)" >> /var/log/user-data.log

