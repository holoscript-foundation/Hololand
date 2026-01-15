# uaa2-service API Contract

**Version**: 1.0.0
**Status**: Draft
**License**: This document describes APIs between proprietary systems and the open source HoloScript project.

---

## Overview

This document defines the **public API contract** for consuming uaa2-service functionality.

### Ownership Model

| Project | License | Description |
|---------|---------|-------------|
| **HoloScript** | MIT (Open Source) | VR scene description language and runtime |
| **Hololand** | Elastic License 2.0 | Full metaverse platform built on HoloScript |
| **uaa2-service** | Proprietary | AI orchestration, agent services, and backend infrastructure |

### Integration Paths

1. **HoloScript → uaa2-service**: Open source consumers can use these public APIs
2. **Hololand ↔ uaa2-service**: Internal proprietary integration (deeper access, not covered here)

This contract enables HoloScript users to access AI-powered building, agent avatars, and other uaa2-service features through well-defined public endpoints.

---

## Authentication

All API requests require authentication via API keys or OAuth tokens.

```typescript
// API Key authentication
headers: {
  'Authorization': 'Bearer <API_KEY>',
  'X-Client-ID': '<HOLOLAND_APP_ID>'
}

// OAuth2 flow
POST /oauth/token
{
  "grant_type": "client_credentials",
  "client_id": "<CLIENT_ID>",
  "client_secret": "<CLIENT_SECRET>",
  "scope": "hololand:build hololand:agents"
}
```

---

## Rate Limits

| Tier | Requests/min | Concurrent Connections | Agent Sessions |
|------|--------------|------------------------|----------------|
| Free | 60 | 5 | 1 |
| Pro | 600 | 50 | 10 |
| Enterprise | Unlimited | Unlimited | Unlimited |

---

## 1. HoloScript Builder API

Build VR environments from natural language.

### POST /api/v1/hololand/build

**Request:**
```json
{
  "prompt": "Create a coffee shop with a counter and menu board",
  "options": {
    "style": "modern",
    "complexity": "medium",
    "includePhysics": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "holoScript": "create scene \"Coffee Shop\"\n  create box at (0, 0, 0) ...",
  "confidence": 0.92,
  "metadata": {
    "objectCount": 15,
    "estimatedPolygons": 12500,
    "buildTime": 1.2
  }
}
```

### POST /api/v1/hololand/optimize

Optimize existing HoloScript for performance.

**Request:**
```json
{
  "holoScript": "create cube at (0, 0, 0) ...",
  "target": "mobile"
}
```

**Response:**
```json
{
  "optimizedScript": "...",
  "improvements": {
    "polygonReduction": "35%",
    "textureOptimization": true
  }
}
```

### POST /api/v1/hololand/explain

Get human-readable explanation of HoloScript.

**Request:**
```json
{
  "holoScript": "create sphere at (0, 5, 0) with physics enabled ..."
}
```

**Response:**
```json
{
  "explanation": "This script creates a red sphere 5 units above the ground with physics enabled, meaning it will fall due to gravity...",
  "breakdown": [
    { "line": 1, "description": "Creates a sphere object" },
    { "line": 2, "description": "Positions it at coordinates (0, 5, 0)" }
  ]
}
```

---

## 2. Agent Avatar API

Request AI agents to inhabit Hololand avatars.

### POST /api/v1/agents/spawn

Spawn an agent in a Hololand world.

**Request:**
```json
{
  "agentType": "assistant",
  "worldId": "world_abc123",
  "avatarConfig": {
    "displayName": "Helper Bot",
    "appearance": {
      "model": "humanoid",
      "color": "#667eea"
    }
  },
  "capabilities": ["chat", "guide", "build-assist"]
}
```

**Response:**
```json
{
  "agentSessionId": "session_xyz789",
  "avatarId": "avatar_def456",
  "websocketUrl": "wss://api.uaa2.io/agents/session_xyz789",
  "capabilities": ["chat", "guide", "build-assist"],
  "expiresAt": "2026-01-14T12:00:00Z"
}
```

### WebSocket /agents/{sessionId}

Real-time agent communication.

**Client → Server:**
```json
{
  "type": "user_message",
  "content": "Help me build a table",
  "context": {
    "position": { "x": 0, "y": 0, "z": 5 },
    "selectedObjects": ["obj_123"]
  }
}
```

**Server → Client:**
```json
{
  "type": "agent_response",
  "content": "I'll create a wooden table for you. Here's what I'm adding...",
  "actions": [
    {
      "type": "create_object",
      "holoScript": "create box at (0, 1, 5) with size (2, 0.1, 1) ..."
    },
    {
      "type": "emote",
      "emoteId": "thumbsup"
    }
  ]
}
```

### DELETE /api/v1/agents/{sessionId}

Terminate agent session.

---

## 3. Voice Processing API

Convert voice to HoloScript commands.

### POST /api/v1/voice/transcribe

**Request:**
```
Content-Type: multipart/form-data
audio: <binary audio data>
format: "webm" | "wav" | "mp3"
```

**Response:**
```json
{
  "transcript": "create a red cube above me",
  "confidence": 0.95,
  "language": "en-US"
}
```

### POST /api/v1/voice/build

Transcribe and build in one request.

**Request:**
```
Content-Type: multipart/form-data
audio: <binary audio data>
worldContext: { "currentPosition": {...}, "selectedObjects": [...] }
```

**Response:**
```json
{
  "transcript": "create a red cube above me",
  "holoScript": "create cube at (0, 3, 0) with color red ...",
  "confidence": 0.91
}
```

---

## 4. Knowledge Query API

Query learned patterns and suggestions.

### POST /api/v1/knowledge/patterns

Get VR environment patterns matching a description.

**Request:**
```json
{
  "query": "modern office space",
  "limit": 5,
  "filters": {
    "minConfidence": 0.8,
    "maxPolygons": 50000
  }
}
```

**Response:**
```json
{
  "patterns": [
    {
      "id": "pattern_001",
      "name": "Open Office Layout",
      "description": "Modern open-plan office with standing desks",
      "preview": "https://cdn.uaa2.io/patterns/preview_001.png",
      "confidence": 0.94,
      "usage": 1250
    }
  ]
}
```

### POST /api/v1/knowledge/suggestions

Get contextual suggestions while building.

**Request:**
```json
{
  "currentScript": "create scene \"My Shop\"\n  create counter at (0, 1, 0)",
  "cursorPosition": 2
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "completion",
      "text": "add cash register on counter",
      "confidence": 0.88
    },
    {
      "type": "enhancement",
      "text": "add ambient lighting",
      "confidence": 0.75
    }
  ]
}
```

---

## 5. Spatial Coordination API

Coordinate avatars and objects in VR spaces.

### POST /api/v1/spatial/optimize-formation

Optimize avatar/object positioning.

**Request:**
```json
{
  "entities": [
    { "id": "avatar_1", "position": { "x": 0, "y": 0, "z": 0 } },
    { "id": "avatar_2", "position": { "x": 1, "y": 0, "z": 0 } }
  ],
  "targetZone": {
    "center": { "x": 5, "y": 0, "z": 5 },
    "radius": 10
  },
  "formation": "circle"
}
```

**Response:**
```json
{
  "optimizedPositions": [
    { "id": "avatar_1", "position": { "x": 5, "y": 0, "z": 0 } },
    { "id": "avatar_2", "position": { "x": 0, "y": 0, "z": 5 } }
  ],
  "metrics": {
    "spreadScore": 0.95,
    "collisionFree": true
  }
}
```

### POST /api/v1/spatial/crowd-event

Handle large gatherings.

**Request:**
```json
{
  "eventType": "concert",
  "location": { "x": 100, "y": 0, "z": 100 },
  "expectedAttendees": 500,
  "safetyZones": [...]
}
```

---

## 6. Economy API

Handle in-world transactions (optional integration).

### POST /api/v1/economy/transaction

Process a VR commerce transaction.

**Request:**
```json
{
  "worldId": "world_abc",
  "type": "purchase",
  "from": "user_buyer",
  "to": "user_seller",
  "amount": 100,
  "currency": "HOLO",
  "item": {
    "type": "asset",
    "assetId": "asset_xyz"
  }
}
```

**Response:**
```json
{
  "transactionId": "tx_123456",
  "status": "completed",
  "receipt": {
    "timestamp": "2026-01-13T10:00:00Z",
    "fee": 2,
    "netAmount": 98
  }
}
```

---

## 7. Health & Status

### GET /api/v1/health

Check API availability.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "builder": "operational",
    "agents": "operational",
    "voice": "operational",
    "knowledge": "operational"
  }
}
```

### GET /api/v1/usage

Check current usage and limits.

**Response:**
```json
{
  "tier": "pro",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-01T00:00:00Z"
  },
  "usage": {
    "apiCalls": 15420,
    "agentMinutes": 342,
    "storageGB": 2.5
  },
  "limits": {
    "apiCalls": 100000,
    "agentMinutes": 1000,
    "storageGB": 10
  }
}
```

---

## SDK Integration

### @holoscript/uaa2-client (Open Source)

A thin client library for HoloScript projects to consume uaa2-service APIs:

```typescript
import { UAA2Client } from '@holoscript/uaa2-client';

const client = new UAA2Client({
  apiKey: process.env.UAA2_API_KEY,
  baseUrl: 'https://api.uaa2.io'
});

// Build from natural language
const result = await client.build("Create a forest with pine trees");
console.log(result.holoScript); // Generated HoloScript code

// Spawn an agent
const agent = await client.agents.spawn({
  agentType: 'assistant',
  worldId: myWorld.id
});

// Listen to agent events
agent.on('message', (msg) => console.log(msg));
agent.on('action', (action) => executeAction(action));
```

> **Note**: Hololand (proprietary) has deeper internal integration with uaa2-service beyond this public API.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 429 | Rate Limited - Too many requests |
| 500 | Internal Error - Contact support |

---

## Versioning

- API version in URL path: `/api/v1/...`
- Breaking changes require new major version
- Deprecation notice 6 months before removal

---

## Support

- Documentation: https://docs.uaa2.io/holoscript
- Status Page: https://status.uaa2.io
- Support: support@uaa2.io
