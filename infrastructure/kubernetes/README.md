# Brittney Cloud Infrastructure - Kubernetes Deployment

Production-ready Kubernetes manifests for Brittney AI inference service.

## Prerequisites

- **Kubernetes cluster** with GPU support (GKE with T4/A10/L4 nodes)
- **kubectl** configured with cluster access
- **Docker registry** access (GCR, ECR, or Docker Hub)
- **NVIDIA GPU Operator** installed on cluster

## Quick Start

### 1. Build and Push Docker Image

```bash
cd infrastructure/docker
export DOCKER_REGISTRY=gcr.io/hololand-production
./build.sh
docker push ${DOCKER_REGISTRY}/brittney-inference:latest
```

### 2. Deploy to Kubernetes

```bash
cd infrastructure/kubernetes

# Create namespace and resource quotas
kubectl apply -f namespace.yaml

# Deploy inference service
kubectl apply -f brittney-inference-deployment.yaml

# Verify deployment
kubectl get pods -n brittney-prod
kubectl get hpa -n brittney-prod
```

### 3. Verify Service

```bash
# Port-forward to test locally
kubectl port-forward -n brittney-prod svc/brittney-inference 11434:11434

# Test inference
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "brittney-qwen-v23",
    "prompt": "Create a VR portal",
    "stream": false
  }'
```

## Monitoring

### Check Pod Status
```bash
kubectl get pods -n brittney-prod -w
kubectl describe pod <pod-name> -n brittney-prod
kubectl logs <pod-name> -n brittney-prod
```

### Check Auto-Scaling
```bash
# Watch HPA in real-time
kubectl get hpa -n brittney-prod -w

# Check current scaling metrics
kubectl describe hpa brittney-inference-hpa -n brittney-prod
```

### GPU Utilization
```bash
# SSH into node
kubectl exec -it <pod-name> -n brittney-prod -- nvidia-smi

# Check GPU allocation
kubectl describe node <node-name> | grep -A5 "Allocated resources"
```

## Scaling Configuration

**Default Settings:**
- Min replicas: 3
- Max replicas: 50
- CPU threshold: 70%
- Memory threshold: 80%
- Active requests: 10 per pod

**Modify scaling:**
```bash
kubectl edit hpa brittney-inference-hpa -n brittney-prod
```

## Cost Optimization

### Use Spot Instances (60% savings)
```yaml
# In node pool configuration (GKE)
nodePool:
  config:
    preemptible: true
    machineType: n1-standard-4
    accelerators:
    - type: nvidia-tesla-t4
      count: 1
```

### GPU MIG Slicing (Run multiple workloads per GPU)
```bash
# Enable MIG on A100 GPUs
kubectl apply -f gpu-mig-config.yaml
```

## Troubleshooting

### Pods Not Starting
```bash
# Check events
kubectl get events -n brittney-prod --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs <pod-name> -n brittney-prod --previous
```

### Out of GPU Resources
```bash
# Check GPU availability
kubectl describe nodes | grep -A5 "nvidia.com/gpu"

# Increase max replicas or add more GPU nodes
```

### Slow Inference
```bash
# Check if GPU is being used
kubectl exec <pod-name> -n brittney-prod -- nvidia-smi

# Verify model is loaded
kubectl exec <pod-name> -n brittney-prod -- \
  curl http://localhost:11434/api/tags
```

## Production Checklist

- [ ] Docker image built and pushed to registry
- [ ] Kubernetes cluster has GPU node pool
- [ ] NVIDIA GPU Operator installed
- [ ] Namespace and quotas applied
- [ ] Deployment and HPA created
- [ ] Service is reachable internally
- [ ] Prometheus metrics are being collected
- [ ] Grafana dashboards configured
- [ ] Alerts configured in AlertManager
- [ ] PodDisruptionBudget prevents downtime
- [ ] Resource quotas prevent cost overruns

## Next Steps

1. **Set up API Gateway** (Kong) for external access
2. **Configure PostgreSQL** for usage tracking
3. **Configure Redis** for rate limiting
4. **Deploy brittney-cloud-api** service
5. **Set up monitoring** (Prometheus + Grafana)
6. **Configure billing** (Stripe integration)

## Architecture

```
External Traffic
  ↓
Kong API Gateway (authentication, rate limiting)
  ↓
brittney-inference Service (ClusterIP)
  ↓
brittney-inference Pods (3-50 replicas)
  → Ollama + brittney-qwen-v23
  → GPU acceleration
  → Auto-scaling based on load
```

## Support

For issues, contact the Hololand AI Platform team or see:
- [Brittney Setup Guide](../../packages/brittney/service/LOCAL_PIPELINE_SETUP.md)
- [MCP Server Docs](../../packages/brittney/mcp-server/README.md)
