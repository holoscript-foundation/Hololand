# SNN Perception Demo - Production Deployment Guide

Complete deployment package for the SNN Perception Demo with containerization, HTTPS, monitoring, and cloud deployment guides.

## Overview

This deployment package provides everything needed to deploy the SNN Perception Demo to production:

- **Docker containerization** with multi-stage builds
- **Nginx** with HTTPS, WebSocket, and WebGPU support
- **Prometheus + Grafana** monitoring stack
- **Load testing** suite (Artillery) for 100+ concurrent users
- **Cloud deployment guides** for AWS, GCP, and Azure
- **Auto-scaling** configuration
- **Security hardening** checklist

## Package Contents

```
snn-perception-deploy/
├── Dockerfile                      # Multi-stage production build
├── docker-compose.yml              # Full stack orchestration
├── .env.production                 # Production environment config
├── docker/
│   └── healthcheck.sh             # Container health check script
├── nginx/
│   ├── nginx.conf                 # Main nginx configuration
│   ├── default.conf               # Server block configuration
│   └── ssl/
│       └── README.md              # SSL certificate setup
├── monitoring/
│   ├── prometheus.yml             # Prometheus scrape config
│   ├── alerts.yml                 # Alert rules
│   ├── alertmanager.yml           # Alert routing
│   └── grafana/
│       ├── datasources.yml        # Grafana datasources
│       ├── dashboards.yml         # Dashboard provisioning
│       └── dashboards/
│           └── snn-overview.json  # SNN metrics dashboard
├── load-testing/
│   ├── artillery-config.yml       # Load test scenarios
│   ├── run-load-test.sh          # Test runner script
│   └── README.md                  # Testing documentation
├── cloud/
│   ├── AWS_DEPLOYMENT.md          # AWS deployment guide
│   ├── GCP_DEPLOYMENT.md          # GCP deployment guide (TBD)
│   └── AZURE_DEPLOYMENT.md        # Azure deployment guide (TBD)
├── DEPLOYMENT_GUIDE.md            # This file
├── SECURITY_CHECKLIST.md          # Security hardening steps
└── BUILD_OPTIMIZATION.md          # Production build optimization
```

## Quick Start

### Local Docker Deployment

```bash
# 1. Navigate to deployment directory
cd packages/platform/demos/snn-perception-deploy

# 2. Generate self-signed SSL certificate (for testing)
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/C=US/ST=CA/L=SF/O=HoloLand/CN=localhost"
cd ../..

# 3. Start full stack
docker-compose up -d

# 4. Access application
# - Demo: https://localhost
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3000 (admin/admin)

# 5. View logs
docker-compose logs -f snn-perception

# 6. Stop stack
docker-compose down
```

### Production Cloud Deployment

See cloud-specific guides:

- **AWS**: [cloud/AWS_DEPLOYMENT.md](cloud/AWS_DEPLOYMENT.md)
- **GCP**: [cloud/GCP_DEPLOYMENT.md](cloud/GCP_DEPLOYMENT.md) (coming soon)
- **Azure**: [cloud/AZURE_DEPLOYMENT.md](cloud/AZURE_DEPLOYMENT.md) (coming soon)

## Prerequisites

### Development Environment

- **Docker** 24.0+ with BuildKit enabled
- **Docker Compose** 2.20+
- **Node.js** 18+ (for load testing)
- **pnpm** 8.15+ (for building source)

### Production Environment

- **Cloud provider account** (AWS/GCP/Azure)
- **Domain name** (for SSL certificate)
- **SSL certificate** (Let's Encrypt or commercial)
- **Monitoring service** (optional: Datadog, New Relic)

## Configuration

### Environment Variables

Copy `.env.production` to `.env` and customize:

```bash
cp .env.production .env
```

Key settings:

```bash
# Application
NODE_ENV=production
APP_VERSION=1.0.0

# SNN Configuration
VITE_DEFAULT_INFERENCE_HZ=10
VITE_MAX_TRACKED_OBJECTS=32
VITE_CONFIDENCE_THRESHOLD=0.6

# Energy Optimization
VITE_TARGET_BATTERY_HOURS=6
VITE_POWER_BUDGET_W=0.9

# Security
CORS_ORIGINS=https://hololand.io
FORCE_HTTPS=true

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

### SSL/TLS Setup

#### Development (Self-Signed)

```bash
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/C=US/ST=CA/L=SF/O=HoloLand/CN=localhost"
```

#### Production (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d snn-perception.hololand.io

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

Update `nginx/default.conf`:

```nginx
ssl_certificate /etc/letsencrypt/live/snn-perception.hololand.io/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/snn-perception.hololand.io/privkey.pem;
```

## Build and Deploy

### Building Docker Image

```bash
# From HoloLand monorepo root
docker build -t hololand/snn-perception-demo:1.0.0 \
  -f packages/platform/demos/snn-perception-deploy/Dockerfile \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=1.0.0 \
  .
```

### Pushing to Container Registry

#### Docker Hub

```bash
docker login
docker tag hololand/snn-perception-demo:1.0.0 hololand/snn-perception-demo:latest
docker push hololand/snn-perception-demo:1.0.0
docker push hololand/snn-perception-demo:latest
```

#### AWS ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

docker tag hololand/snn-perception-demo:1.0.0 <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/snn-perception-demo:1.0.0

docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/snn-perception-demo:1.0.0
```

#### Google Container Registry

```bash
gcloud auth configure-docker
docker tag hololand/snn-perception-demo:1.0.0 gcr.io/<PROJECT_ID>/snn-perception-demo:1.0.0
docker push gcr.io/<PROJECT_ID>/snn-perception-demo:1.0.0
```

### Deploying with Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Scale application (manual)
docker-compose up -d --scale snn-perception=3

# Update to new version
docker-compose pull
docker-compose up -d
```

## Monitoring

### Accessing Monitoring Services

- **Prometheus**: http://localhost:9090
  - Metrics: http://localhost:9090/metrics
  - Targets: http://localhost:9090/targets
  - Alerts: http://localhost:9090/alerts

- **Grafana**: http://localhost:3000
  - Default credentials: `admin/admin`
  - Dashboard: "SNN Perception Demo - Overview"

- **Alertmanager**: http://localhost:9093
  - View active alerts
  - Silence notifications

### Key Metrics to Monitor

#### SNN Inference Performance

- `snn_inference_latency_ms`: Inference latency (target: <10ms)
- `snn_inference_accuracy`: Model accuracy (target: >0.85)
- `snn_power_consumption_w`: Power usage (target: <1.0W)
- `snn_estimated_battery_hours`: Battery life estimate (target: >5h)
- `snn_tracked_objects_count`: Active tracked objects
- `snn_inference_frequency_hz`: Current inference rate

#### Application Health

- `nginx_connections_active`: Active connections
- `nginx_http_requests_total`: Total HTTP requests
- `nginx_http_request_duration_seconds`: Request latency
- `up`: Service availability (1 = up, 0 = down)

#### System Resources

- `node_cpu_seconds_total`: CPU usage
- `node_memory_MemAvailable_bytes`: Available memory
- `node_filesystem_avail_bytes`: Disk space

### Setting Up Alerts

Alerts are configured in `monitoring/alerts.yml`. Key alerts:

- **ServiceDown**: Triggered when service is unavailable for >1 minute
- **HighErrorRate**: >5% 5xx errors for >5 minutes
- **SlowInferenceLatency**: SNN latency >10ms for >5 minutes
- **HighEnergyConsumption**: Power usage >1.0W for >5 minutes
- **HighCPUUsage**: CPU >80% for >5 minutes

Configure notification channels in `monitoring/alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#snn-perception-alerts'
```

## Load Testing

### Running Load Tests

```bash
cd load-testing

# Install Artillery
npm install -g artillery

# Run test against production
TARGET_URL=https://snn-perception.hololand.io ./run-load-test.sh

# View results
open results/report_*.html
```

### Performance Targets

- **Concurrent Users**: 100+
- **P95 Latency**: <200ms
- **P99 Latency**: <500ms
- **Error Rate**: <1%
- **Throughput**: >50 requests/sec

See [load-testing/README.md](load-testing/README.md) for details.

## Security Hardening

### Checklist

✅ **Container Security**
- [ ] Run as non-root user (UID 1001)
- [ ] Read-only filesystem where possible
- [ ] Minimal base image (Alpine)
- [ ] No secrets in image layers
- [ ] Security scanning (Trivy, Snyk)

✅ **Network Security**
- [ ] HTTPS enforced (HSTS)
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] CORS properly configured
- [ ] Rate limiting enabled

✅ **Application Security**
- [ ] CSP headers configured
- [ ] XSS protection headers
- [ ] CSRF protection
- [ ] Input validation
- [ ] Dependency scanning

✅ **Monitoring & Logging**
- [ ] Centralized logging
- [ ] Alert on security events
- [ ] Log retention policy
- [ ] Audit trail

See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) for full checklist.

## Performance Optimization

### Build Optimizations

- **Multi-stage builds**: Minimize final image size (58 KB model + app)
- **Layer caching**: Order Dockerfile for optimal caching
- **Compression**: Gzip/Brotli enabled for text assets
- **Code splitting**: Vite lazy loading for routes
- **Tree shaking**: Remove unused code

### Runtime Optimizations

- **CDN**: CloudFront for global distribution
- **Caching**: 1-year cache for static assets, 7 days for models
- **HTTP/2**: Enabled for multiplexing
- **Keep-alive**: Connection pooling
- **Worker threads**: WebGPU inference in Web Worker

See [BUILD_OPTIMIZATION.md](BUILD_OPTIMIZATION.md) for details.

## Scaling

### Horizontal Scaling (Docker Compose)

```bash
# Scale to 5 replicas
docker-compose up -d --scale snn-perception=5

# Add load balancer (nginx)
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Auto-Scaling (Cloud)

#### AWS ECS

```bash
# CPU-based scaling (50-80% target)
aws application-autoscaling put-scaling-policy \
  --policy-name snn-cpu-scaling \
  --service-namespace ecs \
  --resource-id service/snn-cluster/snn-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

#### Kubernetes (k8s)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: snn-perception-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: snn-perception
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker-compose logs snn-perception
```

**Common issues**:
- SSL certificate missing: Generate self-signed cert
- Port already in use: Change ports in `docker-compose.yml`
- Memory limit: Increase in `docker-compose.yml`

### High Latency

**Check metrics**:
- Prometheus: http://localhost:9090/graph
- Query: `histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket[5m]))`

**Solutions**:
- Scale horizontally (more containers)
- Enable CDN (CloudFront)
- Optimize WebGPU shader compilation

### Memory Leak

**Monitor memory**:
```bash
docker stats snn-perception
```

**Solutions**:
- Increase memory limit: `mem_limit: 4g`
- Enable swap: `mem_swappiness: 60`
- Restart policy: `restart: unless-stopped`

### SSL Certificate Expired

**Check expiry**:
```bash
openssl x509 -in nginx/ssl/server.crt -noout -dates
```

**Renew (Let's Encrypt)**:
```bash
certbot renew
docker-compose restart snn-perception
```

## Maintenance

### Updating to New Version

```bash
# 1. Pull new image
docker-compose pull

# 2. Stop old containers
docker-compose down

# 3. Start new containers
docker-compose up -d

# 4. Verify health
curl -f https://localhost/health || echo "Failed"
```

### Backup and Restore

**Backup**:
```bash
# Prometheus data
docker run --rm -v snn-perception-deploy_prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz -C /data .

# Grafana dashboards
docker run --rm -v snn-perception-deploy_grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .
```

**Restore**:
```bash
# Prometheus
docker run --rm -v snn-perception-deploy_prometheus-data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/prometheus-backup.tar.gz"

# Grafana
docker run --rm -v snn-perception-deploy_grafana-data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/grafana-backup.tar.gz"
```

## Cost Optimization

### Cloud Cost Estimates

| Platform | Config | Cost/Month |
|----------|--------|------------|
| **AWS ECS Fargate** | 2 tasks (1 vCPU, 2GB) | $69 |
| **AWS EC2** | t3.medium | $38 |
| **GCP Cloud Run** | 2 instances | $45 |
| **Azure Container Instances** | 2 containers | $52 |

### Cost Reduction Strategies

1. **Use spot instances**: 70% cost savings (AWS EC2 Spot, GCP Preemptible)
2. **Right-size resources**: Start with t3.small, scale as needed
3. **Enable auto-scaling**: Scale down during low traffic
4. **Use CDN**: Reduce origin requests by 80%
5. **Optimize images**: Smaller images = faster pulls, less storage

## Support and Resources

### Documentation

- **SNN Perception Demo README**: `../../snn-perception/README.md`
- **Executive Summary**: `../../snn-perception/EXECUTIVE_SUMMARY.md`
- **HoloLand Platform Docs**: https://docs.hololand.io

### Community

- **GitHub Issues**: https://github.com/hololand/platform/issues
- **Slack**: #snn-perception channel
- **Email**: platform@hololand.io

### Monitoring Dashboards

- **Production Status**: https://status.hololand.io
- **Public Metrics**: https://metrics.hololand.io

---

## Next Steps

1. **Deploy to staging**: Test full stack before production
2. **Run load tests**: Validate performance under load
3. **Configure monitoring**: Set up alerts and dashboards
4. **Security audit**: Run vulnerability scans
5. **Go live**: Deploy to production
6. **Monitor**: Watch metrics for first 24 hours

---

**Deployment Package v1.0.0**
**Last Updated**: 2026-03-08
**Maintained by**: HoloLand Platform Team
