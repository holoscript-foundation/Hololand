# Brittney Private Network Setup

This guide explains how to set up a private Brittney network for managed development and advancement, with the ability to launch a public network in the future.

## Overview

The Brittney network supports three modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Private** | All requests require authentication | Development, testing, internal team |
| **Hybrid** | Local inference public, cloud requires auth | Semi-open community |
| **Public** | All features available to everyone | Open community (future) |

---

## Quick Start (5 minutes)

### 1. Initialize Your Private Network

```bash
cd packages/brittney-service
npx tsx scripts/setup-network.ts --init private
```

This will:
- Generate a **Master Key** (save this securely!)
- Create `~/.hololand/network-keys.json` (network state)
- Update `~/.hololand/config.json` with admin key

### 2. Add Your Friend as a Client

```bash
npx tsx scripts/setup-network.ts --add-client "Friend Name"
```

This generates a unique **Client Key** to share with them.

### 3. Start the Brittney Server

```bash
# With network authentication enabled
pnpm dev
```

Server runs at `http://localhost:11435` by default.

---

## Detailed Setup

### For the Network Admin (You)

#### Initialize Network
```bash
npx tsx scripts/setup-network.ts --init private
```

Output:
```
✨ Brittney Network Initialized
================================

Network ID: hololand-abc123-def456
Mode: PRIVATE

🔐 MASTER KEY (save this securely!):

   your-master-key-here-save-it-somewhere-safe

⚠️  This key will NOT be shown again.
```

**Important:** Save the master key in a password manager or secure location.

#### Manage Clients
```bash
# Add a new client (inference only)
npx tsx scripts/setup-network.ts --add-client "Alice"

# Add an admin (can change settings)
npx tsx scripts/setup-network.ts --add-admin "Bob"

# List all clients
npx tsx scripts/setup-network.ts --list-clients

# Revoke access
npx tsx scripts/setup-network.ts --revoke "Alice"
```

#### View Configuration
```bash
npx tsx scripts/setup-network.ts --show-config
```

---

### For Clients (Your Friend)

Your admin will give you a **Client Key**. Use it in one of these ways:

#### Option 1: Environment Variable
```bash
export BRITTNEY_AUTH_KEY="your-client-key-here"
```

#### Option 2: Config File
Add to `~/.hololand/config.json`:
```json
{
  "authKey": "your-client-key-here"
}
```

#### Option 3: Per-Request Header
```bash
curl -H "Authorization: Bearer your-client-key-here" \
  http://server:11435/api/chat
```

---

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BRITTNEY NETWORK                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐       ┌─────────────────────────────────┐ │
│  │   Admin     │       │      Brittney Server            │ │
│  │ (You)       │──────▶│  - Master Key Auth              │ │
│  │ Master Key  │       │  - Model Management             │ │
│  └─────────────┘       │  - Client Management            │ │
│                        │  - Cloud API Access (if needed)  │ │
│  ┌─────────────┐       └─────────────────────────────────┘ │
│  │  Client 1   │                     │                     │
│  │ (Friend)    │─────────────────────┘                     │
│  │ Client Key  │       ▼                                   │
│  └─────────────┘  ┌─────────────────────────────────────┐ │
│                   │      Local Ollama                    │ │
│  ┌─────────────┐  │  - brittney:latest (default)        │ │
│  │  Client 2   │  │  - brittney-v2:latest               │ │
│  │ (Another)   │──┤  - No API key needed                │ │
│  │ Client Key  │  └─────────────────────────────────────┘ │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Server Configuration

### Running the Server

```bash
# Development
cd packages/brittney-service
pnpm dev

# Production
pnpm start

# With custom port
BRITTNEY_PORT=8080 pnpm start

# Exposed to network (not just localhost)
BRITTNEY_HOST=0.0.0.0 pnpm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BRITTNEY_ADMIN_KEY` | Master admin key | (from network setup) |
| `BRITTNEY_PORT` | Server port | 11435 |
| `BRITTNEY_HOST` | Bind address | localhost |
| `BRITTNEY_DISALLOW_PUBLIC_CLOUD` | Block unauth cloud access | true |

### Generate Environment File

```bash
npx tsx scripts/setup-network.ts --generate-env
```

Creates `~/.hololand/.env.brittney` with all settings.

---

## Client Usage

### Making Authenticated Requests

```typescript
// Using fetch
const response = await fetch('http://server:11435/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clientKey}`,
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Create a spinning cube in HoloScript' }
    ]
  }),
});
```

### Using the Brittney Client Library

```typescript
import { BrittneyClient } from '@hololand/brittney-service/client';

const client = new BrittneyClient({
  serverUrl: 'http://server:11435',
  authKey: process.env.BRITTNEY_AUTH_KEY,
});

const result = await client.chat('Create a forest scene with glowing mushrooms');
console.log(result.content);
```

---

## Security Best Practices

### Do:
- Store master key in a password manager
- Use separate client keys for each user
- Revoke keys when users leave
- Use HTTPS in production (reverse proxy)
- Keep server behind firewall

### Don't:
- Share your master key
- Commit keys to git
- Use the same key for multiple users
- Expose server directly to internet without auth

---

## Transitioning to Public Network

When ready to go public:

### 1. Switch Network Mode
```bash
npx tsx scripts/setup-network.ts --init hybrid
# or
npx tsx scripts/setup-network.ts --init public
```

### 2. Update Config
Edit `~/.hololand/config.json`:
```json
{
  "disallowPublicCloudAccess": false,
  "networkMode": "public"
}
```

### 3. Consider Rate Limiting
The server includes built-in rate limiting. Configure in config:
```json
{
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 60
  }
}
```

---

## API Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `POST /api/chat` | Yes (private mode) | Chat completion |
| `POST /api/generate-holoscript` | Yes (private mode) | Generate HoloScript code |
| `GET /api/health` | No | Server health check |
| `GET /api/status` | No | Model status |
| `POST /api/config` | Admin only | Update configuration |
| `POST /api/switch-provider` | Admin only | Switch cloud provider |

---

## Troubleshooting

### "Unauthorized" error
- Check your client key is correct
- Verify `Authorization: Bearer <key>` header format
- Ensure server has your key in its client list

### "Cloud access blocked" error
- Server is in private mode
- Ask admin for cloud-enabled key, or use local Ollama model

### Connection refused
- Is the server running? `pnpm dev`
- Check port: `BRITTNEY_PORT`
- Check host binding: `BRITTNEY_HOST=0.0.0.0` for network access

### Model not loaded
- Ensure Ollama is running: `ollama serve`
- Check model exists: `ollama list | grep brittney`
- Pull if needed: `ollama pull brittney:latest`

---

## Related Documentation

- [Quick Reference](./QUICK_REFERENCE.md) - Command quick ref
- [Finetuning Guide](./FINETUNING_GUIDE.md) - Training custom models
- [HoloScript Guide](../../QUICKSTART.md) - Using HoloScript
