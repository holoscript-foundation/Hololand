# HoloScript Playground - Production Deployment Guide

## Overview

This guide covers deploying the HoloScript Playground to production with multi-cloud AI integration, streaming responses, and performance monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [AI Service Configuration](#ai-service-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling & Performance](#scaling--performance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- Node.js 18+
- Docker 20+ & Docker Compose 2+
- Git

### Optional (for cloud deployment)
- AWS CLI / Azure CLI / GCP CLI
- Kubernetes (K8s) cluster
- PostgreSQL 13+ (for persistent storage)
- Redis 6+ (for caching)

## Environment Setup

### 1. Prepare Environment Variables

```bash
# Copy example environment file
cp .env.example .env.production

# Edit with your API keys
nano .env.production
```

### Required Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Claude Configuration
CLAUDE_API_KEY=your-claude-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Optional: Brittney Local
BRITTNEY_API_URL=http://brittney:8000

# Optional: Ollama Local
OLLAMA_URL=http://ollama:11434

# Deployment
API_BASE_URL=https://your-domain.com
WS_URL=wss://your-domain.com
```

### 2. Build Artifacts

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build production bundle
pnpm build

# Verify build output
ls -la dist/
```

## Docker Deployment

### Development Stack

```bash
# Start playground only
docker-compose up holoscript-playground

# Start with Ollama (local LLM)
docker-compose --profile with-ollama up

# Start full stack with all services
docker-compose --profile with-brittney --profile with-ollama --profile with-cache --profile with-database up -d
```

### Production Stack

```bash
# Pull latest image
docker pull holoscript-playground:latest

# Run with production settings
docker run -d \
  --name holoscript-playground \
  -p 3000:3000 \
  -e VITE_ENV=production \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e CLAUDE_API_KEY=$CLAUDE_API_KEY \
  -e API_BASE_URL=https://your-domain.com \
  --restart unless-stopped \
  --health-cmd="curl -f http://localhost:3000 || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  holoscript-playground:latest
```

### Health Checks

```bash
# Check container health
docker ps | grep holoscript-playground

# View logs
docker logs -f holoscript-playground

# Check specific health endpoint
curl http://localhost:3000
```

## Cloud Deployment

### AWS (ECS/Fargate)

```bash
# 1. Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag holoscript-playground:latest $ECR_REGISTRY/holoscript-playground:latest
docker push $ECR_REGISTRY/holoscript-playground:latest

# 2. Create ECS task definition (task-definition.json)
# 3. Deploy with ECS CLI or Terraform
# 4. Configure load balancer with HTTPS

# 5. Scale out
aws ecs update-service \
  --cluster holoscript-cluster \
  --service holoscript-playground \
  --desired-count 3
```

### Azure (Container Instances / App Service)

```bash
# 1. Push to ACR
az acr build --registry $REGISTRY --image holoscript-playground:latest .

# 2. Deploy to App Service
az containerapp create \
  --name holoscript-playground \
  --resource-group $RG \
  --image $REGISTRY.azurecr.io/holoscript-playground:latest \
  --environment $ENVIRONMENT \
  --ingress external \
  --target-port 3000

# 3. Set environment variables
az containerapp update \
  --name holoscript-playground \
  --resource-group $RG \
  --env-vars OPENAI_API_KEY=$OPENAI_API_KEY CLAUDE_API_KEY=$CLAUDE_API_KEY
```

### GCP (Cloud Run)

```bash
# 1. Build and push to Artifact Registry
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/holoscript-playground:latest

# 2. Deploy to Cloud Run
gcloud run deploy holoscript-playground \
  --image gcr.io/$PROJECT_ID/holoscript-playground:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY

# 3. Scale
gcloud run services update-traffic holoscript-playground \
  --to-revisions LATEST=100
```

### Kubernetes (K8s)

```bash
# 1. Create deployment manifest (k8s-deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: holoscript-playground
spec:
  replicas: 3
  selector:
    matchLabels:
      app: holoscript-playground
  template:
    metadata:
      labels:
        app: holoscript-playground
    spec:
      containers:
      - name: playground
        image: holoscript-playground:latest
        ports:
        - containerPort: 3000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: openai-key
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

# 2. Apply manifest
kubectl apply -f k8s-deployment.yaml

# 3. Create service
kubectl apply -f k8s-service.yaml

# 4. Scale
kubectl scale deployment holoscript-playground --replicas=5
```

## AI Service Configuration

### Multi-Provider Setup

The playground automatically falls back through providers in this order:

1. **Brittney** (Local workspace model - no cost)
2. **OpenAI** (GPT-4 Turbo - $0.01/1K tokens)
3. **Claude** (Claude 3 Opus - $0.015/1K tokens)
4. **Ollama** (Local neural-chat - free)
5. **Mock** (Fallback for testing)

### Rate Limiting

```typescript
// Configure rate limits in AIService.ts
const RATE_LIMITS = {
  brittney: 100,    // requests/min
  openai: 20,       // requests/min
  claude: 20,       // requests/min
  ollama: 50        // requests/min
};
```

### Streaming Configuration

```typescript
// Enable/disable streaming based on provider
const STREAMING_ENABLED = {
  brittney: true,   // Supports streaming
  openai: true,     // Supports streaming
  claude: true,     // Supports streaming
  ollama: true,     // Supports streaming
};

// Streaming timeout (seconds)
const STREAM_TIMEOUT = 60;
```

## Monitoring & Logging

### Application Monitoring

```bash
# Install prometheus client
npm install prom-client

# Export metrics endpoint
http://localhost:3000/metrics
```

### Log Aggregation

```bash
# View structured logs
docker logs --follow holoscript-playground | jq '.level, .message'

# Send to Datadog
docker run -e DD_AGENT_HOST=localhost -e DD_LOGS_INJECTION=true holoscript-playground

# Send to ELK Stack
# Configure Filebeat to forward logs to Elasticsearch
```

### Performance Monitoring

Monitor these metrics:
- **FPS**: Target 60+ fps (warning at 30)
- **Frame Time**: Target <16ms (warning >33ms)
- **Memory**: Target <200MB (warning >300MB)
- **API Response Time**: Target <500ms (warning >1000ms)
- **Streaming Latency**: Target <100ms per chunk

## Scaling & Performance

### Horizontal Scaling

```bash
# Docker Swarm
docker service create --name playground --replicas 3 holoscript-playground

# Kubernetes
kubectl scale deployment holoscript-playground --replicas 5

# Load Balancing
# Use nginx/HAProxy for request distribution
```

### Caching Strategy

```bash
# Enable Redis caching
docker-compose --profile with-cache up

# Cache configuration
VITE_CACHE_ENABLED=true
VITE_CACHE_TTL=3600  # 1 hour
```

### CDN Configuration

```bash
# CloudFront (AWS)
# Serve dist/ through CloudFront for global edge delivery

# Cloudflare
# Enable caching and compression for dist/ assets
```

## Troubleshooting

### Common Issues

**Issue**: AI responses are slow
```bash
# Solution: Check provider API status
curl https://api.openai.com/v1/models
curl https://api.anthropic.com/health

# Fallback to local Ollama
docker-compose --profile with-ollama up
```

**Issue**: High memory usage
```bash
# Check performance profiler
curl http://localhost:3000/api/metrics

# Clear cache
curl -X POST http://localhost:3000/api/cache/clear

# Reduce local storage
VITE_STORAGE_QUOTA_MB=25
```

**Issue**: WebSocket connection fails
```bash
# Check WebSocket configuration
WS_URL=wss://your-domain.com

# Verify reverse proxy supports WebSocket
# nginx: enable proxy_http_version 1.1 and Upgrade headers
```

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG=true

# Check browser console
F12 → Console tab

# Check network requests
F12 → Network tab → Filter by XHR/Fetch/WS
```

## Security Considerations

1. **API Keys**: Store in secrets manager, never in code
2. **HTTPS**: Always use TLS in production
3. **CORS**: Configure for specific domains
4. **Rate Limiting**: Implement per-user/IP limits
5. **Authentication**: Add user authentication layer
6. **Content Security Policy**: Enable CSP headers
7. **Input Validation**: Sanitize all user inputs
8. **Code Review**: Audit AI-generated code before execution

## Maintenance

### Regular Updates

```bash
# Update dependencies
pnpm update

# Test updates
pnpm test

# Rebuild and redeploy
pnpm build
docker build -t holoscript-playground:latest .
```

### Backup Strategy

```bash
# Backup user data
docker exec postgres pg_dump holoscript > backup.sql

# Backup cache
redis-cli --rdb /backup/dump.rdb
```

## Support

- Documentation: See [QUICKSTART.md](./QUICKSTART.md)
- Issues: GitHub Issues
- Community: Hololand Discord

---

**Last Updated**: 2024
**Maintainer**: Hololand Team
