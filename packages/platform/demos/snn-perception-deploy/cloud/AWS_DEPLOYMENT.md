# AWS Deployment Guide for SNN Perception Demo

Complete guide for deploying the SNN Perception Demo on Amazon Web Services (AWS).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Options](#deployment-options)
4. [Option 1: ECS Fargate (Recommended)](#option-1-ecs-fargate-recommended)
5. [Option 2: EC2 with Docker](#option-2-ec2-with-docker)
6. [Option 3: Elastic Beanstalk](#option-3-elastic-beanstalk)
7. [CloudFront CDN Setup](#cloudfront-cdn-setup)
8. [Monitoring with CloudWatch](#monitoring-with-cloudwatch)
9. [Cost Estimation](#cost-estimation)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **AWS Account** with appropriate IAM permissions
- **AWS CLI** installed and configured (`aws configure`)
- **Docker** installed locally
- **Terraform** (optional, for infrastructure as code)
- **Domain name** (optional, for custom SSL)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                               │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │  Route 53    │────────▶│  CloudFront  │                    │
│  │   (DNS)      │         │    (CDN)     │                    │
│  └──────────────┘         └───────┬──────┘                    │
│                                   │                             │
│                           ┌───────▼──────┐                     │
│                           │  ALB (HTTPS) │                     │
│                           └───────┬──────┘                     │
│                                   │                             │
│  ┌────────────────────────────────┼────────────────────┐       │
│  │          ECS Fargate Cluster   │                    │       │
│  │  ┌─────────────────────────────▼───────────┐       │       │
│  │  │  ECS Service (Auto Scaling 2-10 tasks)  │       │       │
│  │  │  ┌──────────────────────────────────┐   │       │       │
│  │  │  │  Task 1: SNN Perception Container│   │       │       │
│  │  │  └──────────────────────────────────┘   │       │       │
│  │  │  ┌──────────────────────────────────┐   │       │       │
│  │  │  │  Task 2: SNN Perception Container│   │       │       │
│  │  │  └──────────────────────────────────┘   │       │       │
│  │  └─────────────────────────────────────────┘       │       │
│  └──────────────────────────────────────────────────────       │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  CloudWatch  │    │  S3 Bucket   │    │  ECR Repo    │    │
│  │ (Monitoring) │    │  (Assets)    │    │ (Container)  │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Options

### Comparison

| Option | Complexity | Cost/Month | Scalability | Managed | Best For |
|--------|-----------|------------|-------------|---------|----------|
| **ECS Fargate** | Medium | $30-80 | Auto-scaling | High | Production |
| **EC2** | Low | $15-40 | Manual | Low | Testing |
| **Elastic Beanstalk** | Low | $25-60 | Auto-scaling | Medium | Quick deploy |

---

## Option 1: ECS Fargate (Recommended)

Fully managed container orchestration with auto-scaling.

### Step 1: Build and Push Docker Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name snn-perception-demo --region us-east-1

# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
docker build -t snn-perception-demo:latest \
  -f packages/platform/demos/snn-perception-deploy/Dockerfile \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=1.0.0 \
  .

# Tag for ECR
docker tag snn-perception-demo:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/snn-perception-demo:latest

# Push to ECR
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/snn-perception-demo:latest
```

### Step 2: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name snn-perception-cluster --region us-east-1

# Create task execution role (if not exists)
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-role.json

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

**ecs-task-execution-role.json**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Step 3: Create Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "snn-perception-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "snn-perception",
      "image": "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/snn-perception-demo:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        },
        {
          "containerPort": 443,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "LOG_LEVEL", "value": "info"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/snn-perception",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "/usr/local/bin/healthcheck.sh"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```

Register task:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### Step 4: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer --name snn-perception-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application \
  --region us-east-1

# Create target group
aws elbv2 create-target-group --name snn-perception-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region us-east-1

# Create listener (HTTP)
aws elbv2 create-listener --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>

# Create listener (HTTPS) - requires ACM certificate
aws elbv2 create-listener --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<CERTIFICATE_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

### Step 5: Create ECS Service with Auto Scaling

```bash
# Create service
aws ecs create-service --cluster snn-perception-cluster \
  --service-name snn-perception-service \
  --task-definition snn-perception-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=snn-perception,containerPort=80" \
  --region us-east-1

# Configure auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/snn-perception-cluster/snn-perception-service \
  --min-capacity 2 \
  --max-capacity 10

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name snn-cpu-scaling \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/snn-perception-cluster/snn-perception-service \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

---

## Option 2: EC2 with Docker

Simpler deployment for testing and development.

### Step 1: Launch EC2 Instance

```bash
# Launch t3.medium instance (2 vCPU, 4 GB RAM)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=snn-perception-demo}]' \
  --user-data file://ec2-user-data.sh
```

**ec2-user-data.sh**:
```bash
#!/bin/bash
# Install Docker
yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repo (or copy files)
mkdir -p /opt/snn-perception
cd /opt/snn-perception

# Copy docker-compose.yml and configs
# (Use S3 or other method to transfer files)

# Start services
docker-compose up -d
```

### Step 2: Configure Security Group

Allow inbound traffic:
- **Port 80** (HTTP)
- **Port 443** (HTTPS)
- **Port 22** (SSH, for management)
- **Port 9090** (Prometheus, restrict to your IP)
- **Port 3000** (Grafana, restrict to your IP)

---

## Option 3: Elastic Beanstalk

Quickest deployment with managed infrastructure.

### Step 1: Create Application

```bash
# Initialize EB application
eb init snn-perception-demo --platform docker --region us-east-1

# Create environment
eb create snn-perception-prod --instance-type t3.medium --scale 2-10

# Deploy
eb deploy
```

### Step 2: Configure HTTPS

```bash
# Request ACM certificate
aws acm request-certificate --domain-name snn.hololand.io \
  --validation-method DNS \
  --region us-east-1

# Add HTTPS listener in EB console or via .ebextensions
```

---

## CloudFront CDN Setup

Improve global performance with CloudFront.

### Step 1: Create CloudFront Distribution

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**cloudfront-config.json**:
```json
{
  "CallerReference": "snn-perception-2026-03-08",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "alb-origin",
        "DomainName": "snn-perception-alb-xxxxx.us-east-1.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "alb-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "Enabled": true,
  "Comment": "SNN Perception Demo CDN",
  "ViewerCertificate": {
    "ACMCertificateArn": "<CERTIFICATE_ARN>",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

---

## Monitoring with CloudWatch

### Custom Metrics for SNN Inference

Create Lambda function to scrape Prometheus metrics and push to CloudWatch:

```python
import boto3
import requests

cloudwatch = boto3.client('cloudwatch')

def lambda_handler(event, context):
    metrics_url = 'http://alb-endpoint/metrics'
    response = requests.get(metrics_url)

    # Parse Prometheus metrics
    for line in response.text.split('\n'):
        if line.startswith('snn_inference_latency_ms'):
            value = float(line.split()[-1])
            cloudwatch.put_metric_data(
                Namespace='SNN/Perception',
                MetricData=[{
                    'MetricName': 'InferenceLatency',
                    'Value': value,
                    'Unit': 'Milliseconds'
                }]
            )
```

### CloudWatch Alarms

```bash
# High latency alarm
aws cloudwatch put-metric-alarm --alarm-name snn-high-latency \
  --metric-name InferenceLatency \
  --namespace SNN/Perception \
  --statistic Average \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <SNS_TOPIC_ARN>
```

---

## Cost Estimation

### ECS Fargate (Production)

| Resource | Quantity | Cost/Month |
|----------|----------|------------|
| Fargate vCPU (1 vCPU × 2 tasks) | ~1460 hours | $29.20 |
| Fargate Memory (2 GB × 2 tasks) | ~2920 GB-hours | $9.60 |
| ALB | 1 | $16.20 |
| Data Transfer | ~100 GB | $9.00 |
| CloudWatch Logs | ~10 GB | $5.00 |
| **Total** | | **$69/month** |

### EC2 (Testing)

| Resource | Cost/Month |
|----------|------------|
| t3.medium (2 vCPU, 4 GB) | $30.40 |
| EBS (30 GB SSD) | $3.00 |
| Data Transfer (50 GB) | $4.50 |
| **Total** | **$38/month** |

---

## Troubleshooting

### Issue: Container fails health checks

**Solution**: Check CloudWatch Logs:
```bash
aws logs tail /ecs/snn-perception --follow
```

### Issue: High latency from certain regions

**Solution**: Enable CloudFront caching for static assets.

### Issue: Auto-scaling not working

**Solution**: Verify CloudWatch metrics are being published and scaling policies are correct.

---

## Next Steps

1. **Deploy to production**: `aws ecs update-service --cluster snn-perception-cluster --service snn-perception-service --force-new-deployment`
2. **Monitor metrics**: Access Grafana at `http://<ALB_DNS>:3000`
3. **Load test**: See `../load-testing/README.md` for artillery scripts
4. **Optimize costs**: Review CloudWatch metrics and adjust task count

---

**AWS Deployment Guide v1.0.0**
Last Updated: 2026-03-08
