# Load Testing for SNN Perception Demo

Performance testing suite for validating deployment under 100+ concurrent users.

## Prerequisites

- **Node.js** 18+ installed
- **Artillery** load testing framework
- **jq** (optional, for metrics parsing)

Install Artillery:
```bash
npm install -g artillery
```

Install jq (optional):
```bash
# macOS
brew install jq

# Ubuntu/Debian
apt-get install jq

# Windows
choco install jq
```

---

## Quick Start

### Run Default Load Test

```bash
# From deployment directory
cd packages/platform/demos/snn-perception-deploy/load-testing

# Make script executable
chmod +x run-load-test.sh

# Run test against default target
./run-load-test.sh
```

### Run Against Custom Target

```bash
# Set custom target URL
TARGET_URL=https://your-domain.com ./run-load-test.sh
```

---

## Test Scenarios

The load test configuration (`artillery-config.yml`) includes 6 scenarios:

### 1. Initial Page Load (40% of traffic)

Simulates first-time users loading the demo:
- Fetches HTML, JS, CSS
- Downloads SNN model (58 KB)
- Initializes WebGPU
- **Expected latency**: <200ms (P95)

### 2. Returning User (30% of traffic)

Simulates users with cached assets:
- 304 Not Modified responses
- Minimal data transfer
- **Expected latency**: <50ms (P95)

### 3. Health Check (10% of traffic)

Monitoring endpoint requests:
- `/health` endpoint
- **Expected latency**: <10ms

### 4. Metrics Scrape (5% of traffic)

Prometheus metrics collection:
- `/metrics` endpoint
- **Expected response**: Prometheus text format

### 5. WebSocket Connection (5% of traffic)

Future real-time features:
- WebSocket upgrade
- Subscribe to perception updates
- **Expected**: Successful connection

### 6. Static Assets (10% of traffic)

Images, fonts, icons:
- Cached with 1-year expiry
- **Expected latency**: <100ms

---

## Load Test Phases

### Phase 1: Warm-up (60s)

- **Arrival rate**: 5 users/sec
- **Purpose**: Warm up caches, JIT compilation
- **Expected**: Stable latency after 30s

### Phase 2: Ramp-up (120s)

- **Arrival rate**: 10-25 users/sec (ramp)
- **Purpose**: Gradually increase load
- **Expected**: Latency remains stable

### Phase 3: Sustained Load (300s)

- **Arrival rate**: 50 users/sec
- **Concurrent users**: 100+
- **Purpose**: Validate production capacity
- **Expected**:
  - P95 latency <200ms
  - P99 latency <500ms
  - Error rate <1%

### Phase 4: Spike Test (60s)

- **Arrival rate**: 100 users/sec
- **Purpose**: Test auto-scaling and resilience
- **Expected**: Some latency increase, but no errors

### Phase 5: Cool-down (60s)

- **Arrival rate**: 10 users/sec
- **Purpose**: Return to baseline
- **Expected**: Latency returns to normal

---

## Performance Thresholds

The test enforces the following SLOs (Service Level Objectives):

| Metric | Threshold | Severity |
|--------|-----------|----------|
| **P95 Latency** | <200ms | FAIL |
| **P99 Latency** | <500ms | FAIL |
| **Max Latency** | <2000ms | FAIL |
| **Error Rate** | <1% | FAIL |
| **Success Rate** | >99% | FAIL |

If any threshold is exceeded, the test exits with non-zero status.

---

## Results and Reporting

### Output Files

All results are saved to `results/` directory:

- **JSON Report**: `report_YYYYMMDD_HHMMSS.json` (raw data)
- **HTML Report**: `report_YYYYMMDD_HHMMSS.html` (visual dashboard)

### Sample HTML Report

Open `report_YYYYMMDD_HHMMSS.html` in browser to see:

- **Request Rate**: Requests/sec over time
- **Response Time**: P50, P95, P99 latency graphs
- **Throughput**: Bytes sent/received
- **Errors**: Error rate and types
- **Scenarios**: Breakdown by scenario

### Key Metrics

After running, the script outputs:

```
======================================
Key Performance Metrics
======================================
Total Requests: 15234
Success Rate: 15198
P95 Latency: 127ms
P99 Latency: 289ms
Max Latency: 1542ms
✓ P95 latency within target (<200ms)
✓ P99 latency within target (<500ms)
```

---

## Expected Results

### Baseline Performance (2 ECS Fargate Tasks)

| Metric | Target | Expected |
|--------|--------|----------|
| P50 Latency | <100ms | 45-80ms |
| P95 Latency | <200ms | 110-180ms |
| P99 Latency | <500ms | 220-450ms |
| Max Latency | <2000ms | 800-1800ms |
| Throughput | 50 req/sec | 55-65 req/sec |
| Error Rate | <1% | 0-0.2% |
| CPU Usage | <70% | 40-65% |
| Memory Usage | <80% | 50-70% |

### Auto-Scaling Behavior

- **Scale-out trigger**: CPU >70% for 2 minutes
- **Scale-in trigger**: CPU <30% for 5 minutes
- **Min tasks**: 2
- **Max tasks**: 10

During sustained load phase (50 req/sec), expect:
- **2 tasks** at start
- **3-4 tasks** after 2 minutes (scale-out)
- **Latency reduction** as new tasks come online

---

## Troubleshooting

### High Latency (P95 >200ms)

**Possible causes**:
- Insufficient backend capacity (scale up)
- Database query performance (check CloudWatch)
- Network congestion (check ALB metrics)
- Cold start (WebGPU initialization)

**Solutions**:
- Increase desired task count
- Enable CloudFront caching
- Optimize WebGPU shader compilation

### High Error Rate (>1%)

**Possible causes**:
- Health checks failing (container OOM)
- Rate limiting triggered
- SSL certificate issues

**Solutions**:
- Check CloudWatch Logs for errors
- Increase memory allocation (2GB → 4GB)
- Adjust rate limits in nginx config

### WebSocket Connection Failures

**Possible causes**:
- ALB not configured for WebSocket upgrade
- Timeout too short (default: 60s)

**Solutions**:
- Enable WebSocket support on ALB listener
- Increase idle timeout to 300s

---

## Advanced Testing

### Custom Load Pattern

Edit `artillery-config.yml` to customize phases:

```yaml
phases:
  - duration: 300
    arrivalRate: 100
    name: "Heavy Load: 100 users/sec"
```

### Geographic Load Distribution

Use Artillery's cloud service for multi-region testing:

```bash
artillery run-lambda artillery-config.yml \
  --region us-east-1,eu-west-1,ap-southeast-1
```

### WebGPU-Specific Testing

Create custom scenario to test WebGPU initialization:

```yaml
scenarios:
  - name: "WebGPU Stress Test"
    flow:
      - get:
          url: "/"
      - get:
          url: "/models/warehouse-snn-v1.json"
      - think: 5
      # Simulate inference loop (30 requests at 10Hz for 3 seconds)
      - loop:
        - get:
            url: "/api/inference"
        count: 30
```

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Test on Deploy

on:
  deployment_status:

jobs:
  load-test:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g artillery
      - run: |
          cd packages/platform/demos/snn-perception-deploy/load-testing
          TARGET_URL=${{ secrets.DEPLOY_URL }} ./run-load-test.sh
      - uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-testing/results/
```

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Load Test') {
      steps {
        sh '''
          cd load-testing
          TARGET_URL=${DEPLOY_URL} ./run-load-test.sh
        '''
      }
      post {
        always {
          publishHTML([
            reportDir: 'load-testing/results',
            reportFiles: 'report_*.html',
            reportName: 'Load Test Report'
          ])
        }
      }
    }
  }
}
```

---

## Performance Benchmarks

### Test Results History

| Date | P95 (ms) | P99 (ms) | Error Rate | Concurrent Users | Notes |
|------|----------|----------|------------|------------------|-------|
| 2026-03-08 | 127 | 289 | 0.1% | 120 | Baseline (2 tasks) |
| 2026-03-09 | 98 | 221 | 0.05% | 150 | After CloudFront |
| 2026-03-10 | 82 | 187 | 0.02% | 180 | Nginx optimizations |

---

## Support

For issues or questions:
- Check CloudWatch Logs: `/ecs/snn-perception`
- Review Grafana dashboards: `http://monitoring:3000`
- Open issue: [github.com/hololand/platform/issues](https://github.com/hololand/platform/issues)

---

**Load Testing Suite v1.0.0**
Last Updated: 2026-03-08
