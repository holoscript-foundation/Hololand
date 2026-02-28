# Brittney Cloud API

Cloud-hosted managed Brittney AI inference service with usage-based pricing.

## Features

- **Zero Setup**: No Ollama installation required
- **Auto-scaling**: 3-50 GPU pods scale automatically
- **Usage-based Pricing**: Pay only for what you use
- **Multi-region**: us-east-1, eu-west-1, ap-southeast-1
- **Hybrid Mode**: Seamless local → cloud fallback

## Quick Start

### 1. Get API Key

Sign up at https://dashboard.brittney.ai and copy your API key.

### 2. Enable Hybrid Mode (Existing Local Users)

Update your MCP config (`~/.mcp/config.json`):

```json
{
  "brittney-hololand": {
    "env": {
      "OLLAMA_BASE_URL": "http://localhost:11434",
      "OLLAMA_MODEL": "brittney-qwen-v23:latest",
      "BRITTNEY_CLOUD_API_KEY": "britt_sk_live_your_key_here"
    }
  }
}
```

The client will automatically:
1. Try local Ollama first
2. Fall back to Brittney Cloud if local fails
3. No code changes needed!

### 3. Cloud-Only Mode (No Ollama)

```json
{
  "brittney-hololand": {
    "env": {
      "BRITTNEY_CLOUD_API_KEY": "britt_sk_live_your_key_here",
      "BRITTNEY_CLOUD_ONLY": "true"
    }
  }
}
```

## Pricing

| Tier | Price | Included Tokens | Rate Limit |
|------|-------|----------------|------------|
| **Free** | $0/month | 100K/month | 3/min, 100/day |
| **Pay As You Go** | $0.30/1M tokens | None | 60/min, 10K/day |
| **Pro** | $49/month + overage | 10M/month | 300/min, unlimited |
| **Enterprise** | Custom | 100M+/month | Custom |

## API Usage

### Direct API Call

```bash
curl https://api.brittney.ai/v1/inference \
  -H "Authorization: Bearer britt_sk_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a VR portal with purple particles",
    "model": "brittney-qwen-v23",
    "max_tokens": 2048
  }'
```

### TypeScript/JavaScript

```typescript
import { BrittneyCloudProvider } from '@hololand/inference';

const brittney = new BrittneyCloudProvider({
  apiKey: process.env.BRITTNEY_CLOUD_API_KEY!,
});

const response = await brittney.chat({
  messages: [
    { role: 'user', content: 'Create a fire mage NPC' }
  ],
});

console.log(response.content);
```

## Architecture

```
IDE Agent (VS Code/Cursor)
  ↓
@hololand/inference (Hybrid Client)
  ↓
┌─────────────┬─────────────────┐
│ Local Mode  │  Cloud Mode     │
│ (Preferred) │  (Fallback)     │
└─────────────┴─────────────────┘
  ↓               ↓
Ollama        Brittney Cloud API
localhost     api.brittney.ai
  ↓               ↓
  ↓         ┌─────────────────┐
  ↓         │ Kong API Gateway│
  ↓         │ (auth, limits)  │
  ↓         └─────────────────┘
  ↓               ↓
  ↓         ┌─────────────────┐
  ↓         │ K8s Load Balancer│
  ↓         └─────────────────┘
  ↓               ↓
brittney-qwen-v23 (local)
            Brittney Pods (3-50)
            GPU auto-scaling
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Locally

```bash
# Set up environment
cp .env.example .env

# Start PostgreSQL and Redis (Docker Compose)
docker-compose up -d

# Run migrations
pnpm run migrate

# Start server
pnpm run dev
```

Server runs on http://localhost:8080

### Run Tests

```bash
pnpm test
```

## Deployment

### Build Docker Image

```bash
cd infrastructure/docker
./build.sh
docker push gcr.io/hololand-production/brittney-inference:latest
```

### Deploy to Kubernetes

```bash
cd infrastructure/kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f brittney-inference-deployment.yaml
```

## Monitoring

### Usage Dashboard

https://dashboard.brittney.ai/usage

- Current month usage
- Token consumption
- Cost projection
- Quota warnings

### Metrics (Prometheus)

- `brittney_requests_total` - Total requests
- `brittney_request_duration_seconds` - Latency
- `brittney_tokens_total` - Token usage
- `brittney_errors_total` - Error counts

### Alerts

- High error rate (>5% for 5 min) → PagerDuty
- High latency (P95 >5s for 10 min) → Slack
- Queue backlog (>100 for 5 min) → Auto-scale

## Hybrid Mode Implementation

The `@hololand/inference` package automatically supports hybrid mode:

```typescript
import { InferenceClient } from '@hololand/inference';

const client = new InferenceClient({
  // Local Ollama settings
  local: {
    enabled: true,
    ollamaUrl: 'http://localhost:11434',
    defaultModel: 'brittney-qwen-v23:latest',
  },

  // Brittney Cloud settings
  providers: {
    'brittney-cloud': {
      type: 'brittney-cloud',
      enabled: !!process.env.BRITTNEY_CLOUD_API_KEY,
      apiKey: process.env.BRITTNEY_CLOUD_API_KEY,
    },
  },

  // Hybrid behavior
  preferLocalWhenAvailable: true,  // Try local first
  fallbackToCloud: true,           // Fall back to cloud if local fails
});

// Automatically routes to local or cloud
const response = await client.chat({
  messages: [{ role: 'user', content: 'Create a sword NPC' }],
});
```

## Support

- **Docs**: https://docs.brittney.ai
- **Discord**: https://discord.gg/hololand
- **Email**: support@hololand.ai
- **Status**: https://status.brittney.ai

## License

MIT License - See [LICENSE](LICENSE) for details.
