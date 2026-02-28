# Brittney Cloud API - Monitoring Stack

Complete monitoring infrastructure with Prometheus, Grafana, and AlertManager.

## Quick Start (Development)

```bash
cd infrastructure/monitoring

# Start monitoring stack
docker-compose up -d

# Access dashboards
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

## Components

### Prometheus (Port 9090)

Metrics collection and storage:
- Scrapes brittney-cloud-api every 15s
- Scrapes brittney-inference pods
- Scrapes node-exporter (CPU, memory, disk)
- Scrapes GPU metrics (NVIDIA DCGM)
- Scrapes PostgreSQL exporter
- Scrapes Redis exporter

**Configuration:** `prometheus.yml`

### Grafana (Port 3000)

Visualization dashboards:
- **Operations Dashboard** - RPS, latency, errors, queue depth, GPU utilization
- **Business Dashboard** - MRR, DAU, conversion funnel, revenue by tier

**Credentials:** admin/admin (change in production!)

**Dashboards:** `grafana/dashboards/`

### AlertManager (Port 9093)

Alert routing and notification:
- Critical alerts → PagerDuty
- Warning alerts → Slack #brittney-warnings
- Business metrics → Slack #brittney-business
- Info alerts → Slack #brittney-info

**Configuration:** `alertmanager.yml`

**Alert Rules:** `alerts/brittney-alerts.yml`

## Metrics Reference

### Request Metrics

```promql
# Request rate (RPS)
sum(rate(brittney_requests_total[5m]))

# Error rate
sum(rate(brittney_errors_total[5m])) / sum(rate(brittney_requests_total[5m]))

# P95 latency
histogram_quantile(0.95, sum(rate(brittney_request_duration_seconds_bucket[5m])) by (le))
```

### Token Metrics

```promql
# Token processing rate
sum(rate(brittney_tokens_total[5m]))

# Tokens by model
sum(rate(brittney_tokens_total[5m])) by (model)

# Tokens by type (prompt vs completion)
sum(rate(brittney_tokens_total[5m])) by (type)
```

### Business Metrics

```promql
# Monthly Recurring Revenue (MRR)
sum(increase(brittney_cost_usd_total{tier!="free"}[30d])) / 30 * 30

# Daily Active Users
count(count by (user_id) (increase(brittney_requests_total[1d])))

# Paid conversion rate
count(count by (user_id) (brittney_requests_total{tier!="free"}))
/
count(count by (user_id) (brittney_requests_total)) * 100
```

### Infrastructure Metrics

```promql
# GPU utilization
avg(DCGM_FI_DEV_GPU_UTIL) by (gpu)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Active inference pods
count(up{job="brittney-inference"} == 1)
```

## Alert Rules

### Critical Alerts (PagerDuty)

- **HighErrorRate** - Error rate >5% for 5 minutes
- **InstanceDown** - API instance down for 1 minute
- **LowReplicaCount** - <3 inference pods running

### Warning Alerts (Slack)

- **HighLatency** - P95 latency >5s for 10 minutes
- **QueueBacklog** - Queue depth >100 for 5 minutes
- **HighMemoryUsage** - Memory >90% for 5 minutes
- **CostSpike** - Hourly cost >$100

### Info Alerts (Slack)

- **HighGPUUtilization** - GPU >95% for 10 minutes (sustained load)
- **RateLimitAbuse** - >10 rate limit hits/sec
- **LowFreeTierConversion** - >80% free tier usage
- **SignupSpike** - Free tier requests doubled in 1 hour

## Production Setup

### 1. Update AlertManager Config

Edit `alertmanager.yml`:

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

### 2. Deploy to Kubernetes

```bash
# Create ConfigMaps
kubectl create configmap prometheus-config --from-file=prometheus.yml -n brittney-prod
kubectl create configmap prometheus-alerts --from-file=alerts/ -n brittney-prod
kubectl create configmap alertmanager-config --from-file=alertmanager.yml -n brittney-prod

# Deploy Prometheus
kubectl apply -f kubernetes/prometheus-deployment.yaml

# Deploy Grafana
kubectl apply -f kubernetes/grafana-deployment.yaml

# Deploy AlertManager
kubectl apply -f kubernetes/alertmanager-deployment.yaml
```

### 3. Configure Grafana Data Sources

Add Prometheus data source:
- URL: `http://prometheus:9090`
- Access: Server (proxy)

Import dashboards from `grafana/dashboards/`

### 4. Verify Alerts

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check alert rules
curl http://localhost:9090/api/v1/rules

# Trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -d '[{"labels":{"alertname":"TestAlert","severity":"warning"}}]'
```

## Troubleshooting

### No metrics showing in Grafana

1. Check Prometheus is scraping targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. Verify API is exposing metrics:
   ```bash
   curl http://localhost:8080/metrics
   ```

3. Check Grafana data source connection

### Alerts not firing

1. Check AlertManager config:
   ```bash
   curl http://localhost:9093/api/v1/status
   ```

2. Verify alert rules are loaded:
   ```bash
   curl http://localhost:9090/api/v1/rules
   ```

3. Check Slack webhook is correct

### High memory usage in Prometheus

- Reduce retention period (default: 15 days)
- Decrease scrape interval (default: 15s)
- Add metric relabeling to drop unused metrics

## Best Practices

1. **Alert Fatigue**: Only alert on actionable items
2. **SLOs**: Define Service Level Objectives before creating alerts
3. **Runbooks**: Add runbook links to alert annotations
4. **Testing**: Test alerts before deploying to production
5. **Review**: Review dashboards and alerts monthly

## Next Steps

- [ ] Set up Slack webhooks
- [ ] Configure PagerDuty integration
- [ ] Create custom dashboards for your team
- [ ] Define SLOs and SLIs
- [ ] Set up log aggregation (Loki)
- [ ] Add distributed tracing (Tempo)

## Support

For issues with monitoring stack:
- Prometheus docs: https://prometheus.io/docs
- Grafana docs: https://grafana.com/docs
- AlertManager docs: https://prometheus.io/docs/alerting/latest/alertmanager/
