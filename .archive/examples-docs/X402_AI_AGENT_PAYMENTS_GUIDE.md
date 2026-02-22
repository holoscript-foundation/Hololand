# x402 AI Agent Payments Integration Guide
## HTTP 402 Protocol for Machine Customer API Access

**Document Version**: 1.0
**Last Updated**: February 19, 2026
**Status**: Technical Specification (Phase B/C Implementation)
**Protocol**: HTTP 402 Payment Required
**Provider**: Coinbase Agentic Wallets on Base

---

## Executive Summary

This guide provides comprehensive technical specifications for integrating HTTP 402 payment protocol into Hololand's world generation API, enabling AI agents to programmatically generate 3D worlds via paid API calls.

**Key Benefits**:
- **New Revenue Stream**: $125K-$1.25M/year (Year 5) from machine customers
- **Competitive Moat**: First VR platform with AI agent API access
- **Gasless Payments**: Coinbase subsidizes transaction fees
- **Secure**: Trusted Execution Environment (TEE) prevents prompt injection
- **Open Standard**: HTTP 402 protocol, not vendor-locked

---

## Table of Contents

1. [Overview](#1-overview)
2. [Protocol Specification](#2-protocol-specification)
3. [Technical Architecture](#3-technical-architecture)
4. [API Endpoints](#4-api-endpoints)
5. [Payment Flow](#5-payment-flow)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Phases](#7-implementation-phases)
8. [Code Examples](#8-code-examples)
9. [Testing & Validation](#9-testing--validation)
10. [Monitoring & Analytics](#10-monitoring--analytics)

---

## 1. Overview

### What is x402?

HTTP 402 ("Payment Required") is a standard HTTP status code originally reserved for future digital payment systems. Coinbase Agentic Wallets (launched February 11, 2026) implements this protocol for AI agent payments.

### Use Cases

**1. AI Travel Agents**
```
User: "Plan a virtual tour of ancient Rome"
AI Agent: Calls Hololand API 5x (Forum, Colosseum, Pantheon, Baths, Circus)
Hololand: Returns 5 VR world files ($2.50 total payment)
AI Agent: Assembles complete VR tour package for user
```

**2. Game Studios**
```
Game AI: "Generate 100 procedural dungeon layouts for roguelike game"
Hololand API: Batch processing endpoint
Payment: $40 (100 worlds × $0.40 batch rate)
Output: 100 HoloScript files ready for Unity import
```

**3. Enterprise Training**
```
Corporate LMS: "Create safety training scenario: warehouse fire drill"
Hololand API: Generates VR training world with evacuation routes
Payment: $0.50
Integration: Deploys to 1,000 employees via white-label instance
```

### Revenue Model

| Tier | Price per Call | Use Case | Target Volume (Year 5) |
|------|----------------|----------|-------------------------|
| **Simple** | $0.25 | 1-5 objects | 50K calls/year |
| **Standard** | $0.50 | 5-20 objects | 150K calls/year |
| **Complex** | $1.00 | 20+ objects | 30K calls/year |
| **Batch** | $0.40 | 10+ worlds (20% discount) | 20K calls/year |

**Conservative Revenue**: 250K calls × $0.50 avg = **$125K/year**
**Optimistic Revenue**: 2.5M calls × $0.50 avg = **$1.25M/year**

---

## 2. Protocol Specification

### HTTP 402 Status Code

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment required",
  "amount_usd": 0.50,
  "payment_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "session_id": "sess_abc123xyz",
  "supported_protocols": ["x402", "coinbase-agentic"],
  "payment_deadline": "2026-02-19T12:05:00Z"
}
```

### Request Headers

**Required Headers** (sent by AI agent):
```http
POST /api/v1/generate-world HTTP/1.1
Host: api.hololand.io
Content-Type: application/json
X-Payment-Token: coinbase:tx_abc123xyz456  (after payment)
X-Agent-ID: openai-gpt4-agent-12345       (for tracking)
Authorization: Bearer <api_key>            (rate limiting)
```

### Payment Token Format

Coinbase Agentic Wallet payment tokens follow this format:

```
coinbase:tx_<transaction_hash>_<signature>
```

Example:
```
coinbase:tx_0x9f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c_sig_abc123
```

---

## 3. Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI AGENT                                  │
│  (OpenAI, Anthropic, Google, Custom)                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 1. POST /api/v1/generate-world
                      │    (no payment token)
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                   HOLOLAND API GATEWAY                           │
│  - Check for X-Payment-Token header                             │
│  - If missing → return 402 Payment Required                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 2. HTTP 402 response with payment details
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              COINBASE AGENTIC WALLET                             │
│  - AI agent wallet sends payment                                │
│  - Gasless transaction (Coinbase subsidizes)                    │
│  - TEE (AWS Nitro Enclaves) prevents prompt injection           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 3. POST /api/v1/generate-world
                      │    (with X-Payment-Token header)
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              HOLOLAND PAYMENT VERIFICATION                       │
│  - Verify payment token with Coinbase API                       │
│  - Check amount, session ID, deadline                           │
│  - If valid → process world generation                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 4. Generate HoloScript world
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              HOLOSCRIPT COMPILER                                 │
│  - GPT-4 prompt → HoloScript code                               │
│  - Validate syntax (prevent AI hallucination)                   │
│  - Compile to requested format                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 5. Return world file
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                        AI AGENT                                  │
│  Receives: HoloScript world file + metadata                     │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

**Table: `x402_payments`**
```sql
CREATE TABLE x402_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  agent_id VARCHAR(255),
  payment_token TEXT,
  amount_usd DECIMAL(10, 2),
  payment_status VARCHAR(50), -- 'pending', 'verified', 'failed', 'expired'
  payment_verified_at TIMESTAMP,
  world_id UUID REFERENCES user_worlds(id),
  prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,

  INDEX idx_session_id (session_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_agent_id (agent_id)
);
```

**Table: `x402_api_calls`**
```sql
CREATE TABLE x402_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES x402_payments(id),
  agent_id VARCHAR(255),
  endpoint VARCHAR(255),
  prompt TEXT,
  complexity VARCHAR(50), -- 'simple', 'standard', 'complex', 'batch'
  objects_generated INTEGER,
  processing_time_ms INTEGER,
  response_size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_agent_id (agent_id),
  INDEX idx_created_at (created_at)
);
```

---

## 4. API Endpoints

### 4.1 Generate World (x402 Protected)

**Endpoint**: `POST /api/v1/generate-world`

**Request Body**:
```json
{
  "prompt": "Create a medieval castle courtyard with fountain",
  "format": "holoscript",
  "complexity": "standard",
  "options": {
    "include_lighting": true,
    "include_physics": true,
    "max_objects": 20
  }
}
```

**Response (402 Payment Required)**:
```json
{
  "error": "Payment required",
  "amount_usd": 0.50,
  "payment_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "session_id": "sess_abc123xyz",
  "supported_protocols": ["x402", "coinbase-agentic"],
  "payment_deadline": "2026-02-19T12:05:00Z",
  "complexity": "standard",
  "estimated_objects": 12
}
```

**Response (200 OK - after payment)**:
```json
{
  "world_id": "world_def456uvw",
  "world_url": "https://hololand.io/worlds/def456uvw",
  "format": "holoscript",
  "script": "composition \"Medieval Courtyard\" { ... }",
  "metadata": {
    "objects_generated": 12,
    "processing_time_ms": 2840,
    "complexity": "standard"
  },
  "payment": {
    "session_id": "sess_abc123xyz",
    "amount_paid": 0.50,
    "payment_token": "coinbase:tx_..."
  }
}
```

### 4.2 Batch Generate

**Endpoint**: `POST /api/v1/generate-world/batch`

**Request Body**:
```json
{
  "prompts": [
    "dungeon room 1: entrance hall with torches",
    "dungeon room 2: treasure room with chest",
    "dungeon room 3: monster lair with bones",
    "... (up to 100 prompts)"
  ],
  "format": "holoscript",
  "batch_discount": true
}
```

**Pricing**:
- Standard rate: $0.50 per world
- Batch rate (10+): $0.40 per world (20% discount)

**Response**:
```json
{
  "error": "Payment required",
  "amount_usd": 40.00,
  "batch_size": 100,
  "per_world_price": 0.40,
  "session_id": "sess_batch_abc123",
  "estimated_processing_time_minutes": 8
}
```

### 4.3 Payment Verification (Internal)

**Endpoint**: `POST /api/internal/verify-payment`

**Request Body**:
```json
{
  "payment_token": "coinbase:tx_...",
  "session_id": "sess_abc123xyz",
  "expected_amount": 0.50
}
```

**Response**:
```json
{
  "verified": true,
  "transaction_hash": "0x9f2c3d4e5f6a7b8c...",
  "amount_paid": 0.50,
  "timestamp": "2026-02-19T12:02:34Z",
  "payment_id": "pay_123abc"
}
```

---

## 5. Payment Flow

### Step-by-Step Flow

**Step 1: Initial Request (No Payment)**
```typescript
// AI Agent sends request without payment
const response = await fetch('https://api.hololand.io/api/v1/generate-world', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <api_key>'
  },
  body: JSON.stringify({
    prompt: 'Create a medieval castle',
    format: 'holoscript'
  })
});

// Response: 402 Payment Required
const paymentDetails = await response.json();
// {
//   error: "Payment required",
//   amount_usd: 0.50,
//   payment_address: "0x...",
//   session_id: "sess_abc123"
// }
```

**Step 2: Payment Execution (Coinbase Wallet)**
```typescript
// AI agent's Coinbase Agentic Wallet handles payment
const paymentToken = await coinbaseWallet.pay({
  to: paymentDetails.payment_address,
  amount: paymentDetails.amount_usd,
  session_id: paymentDetails.session_id
});

// Returns: "coinbase:tx_0x9f2c3d4e5f6a7b8c..."
```

**Step 3: Retry Request (With Payment Token)**
```typescript
// AI Agent retries with payment token
const response = await fetch('https://api.hololand.io/api/v1/generate-world', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <api_key>',
    'X-Payment-Token': paymentToken
  },
  body: JSON.stringify({
    prompt: 'Create a medieval castle',
    format: 'holoscript'
  })
});

// Response: 200 OK
const world = await response.json();
// {
//   world_id: "world_def456",
//   script: "composition \"Medieval Castle\" { ... }",
//   world_url: "https://hololand.io/worlds/def456"
// }
```

---

## 6. Security Considerations

### 6.1 Trusted Execution Environment (TEE)

Coinbase Agentic Wallets run inside **AWS Nitro Enclaves** (Trusted Execution Environments) to prevent:

- **Prompt injection attacks**: Malicious prompts attempting to extract payment credentials
- **Wallet key exfiltration**: Direct memory access blocked by TEE
- **Man-in-the-middle**: Encrypted communication channels only

**Architecture**:
```
┌─────────────────────────────────────────┐
│        AWS Nitro Enclave (TEE)          │
│  ┌───────────────────────────────────┐  │
│  │  Coinbase Agentic Wallet Code    │  │
│  │  - Private keys (encrypted)       │  │
│  │  - Payment logic                  │  │
│  │  - Attestation module             │  │
│  └───────────────────────────────────┘  │
│         ↕ Encrypted Communication        │
└─────────────────────────────────────────┘
         ↕ (No direct access)
┌─────────────────────────────────────────┐
│         AI Agent Runtime                 │
│  - Can request payments                  │
│  - Cannot access wallet keys             │
│  - Cannot modify payment amounts         │
└─────────────────────────────────────────┘
```

### 6.2 Payment Verification

**Server-side verification steps**:

1. **Token signature validation**: Verify Coinbase signature on payment token
2. **Amount verification**: Ensure paid amount matches required amount
3. **Session validation**: Check session_id hasn't been reused
4. **Timestamp verification**: Payment must be within 5-minute window
5. **Nonce checking**: Prevent replay attacks

```typescript
async function verifyPayment(paymentToken: string, sessionId: string, expectedAmount: number) {
  // 1. Extract transaction hash from token
  const [provider, txHash, signature] = paymentToken.split(':');

  if (provider !== 'coinbase') {
    throw new Error('Unsupported payment provider');
  }

  // 2. Verify with Coinbase API
  const verification = await coinbaseAPI.verifyTransaction({
    transaction_hash: txHash,
    signature: signature,
    expected_amount: expectedAmount,
    session_id: sessionId
  });

  // 3. Check verification result
  if (!verification.valid) {
    throw new Error('Payment verification failed');
  }

  // 4. Check timestamp (5-minute window)
  const paymentTime = new Date(verification.timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - paymentTime.getTime()) / 60000;

  if (diffMinutes > 5) {
    throw new Error('Payment token expired');
  }

  // 5. Store payment record
  await db.x402_payments.create({
    session_id: sessionId,
    payment_token: paymentToken,
    amount_usd: expectedAmount,
    payment_status: 'verified',
    payment_verified_at: now
  });

  return verification;
}
```

### 6.3 Rate Limiting

**Per-Agent Limits**:
```typescript
const RATE_LIMITS = {
  free_tier: {
    calls_per_hour: 10,
    calls_per_day: 100
  },
  paid_tier: {
    calls_per_hour: 100,
    calls_per_day: 1000
  },
  enterprise: {
    calls_per_hour: 1000,
    calls_per_day: 10000
  }
};
```

**Implementation**:
```typescript
async function checkRateLimit(agentId: string, tier: string) {
  const key = `ratelimit:${agentId}:hour`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour TTL
  }

  const limit = RATE_LIMITS[tier].calls_per_hour;

  if (count > limit) {
    throw new Error(`Rate limit exceeded: ${count}/${limit} calls per hour`);
  }
}
```

---

## 7. Implementation Phases

### Phase B (Months 7-12): POC & Beta

**Month 8: Initial Implementation**
- [ ] Set up Coinbase Agentic Wallet developer account
- [ ] Implement x402 endpoint (beta environment)
- [ ] Add payment verification logic
- [ ] Create test harness with mock AI agent

**Month 9: Security Hardening**
- [ ] Implement TEE attestation verification
- [ ] Add rate limiting (Redis-based)
- [ ] Set up payment fraud monitoring
- [ ] Security audit (internal)

**Month 10: Beta Testing**
- [ ] Recruit 3 AI agent developers for beta
- [ ] Target: 1,000 API calls total
- [ ] Gather feedback on UX, pricing, reliability
- [ ] Fix bugs, optimize performance

**Month 11: Iteration**
- [ ] Implement batch endpoint
- [ ] Add complexity-based pricing
- [ ] Optimize HoloScript generation prompts
- [ ] Documentation for AI developers

**Month 12: Validation Gate**
```
IF (api_calls >= 1000 AND payment_success_rate >= 95%)
  THEN → Proceed to Phase C (public launch)
ELSE IF (api_calls < 500)
  THEN → Extend beta, focus on developer outreach
ELSE
  THEN → Keep as experimental feature, monitor demand
```

### Phase C (Months 13-18): Production Launch

**Month 13: Public API**
- [ ] Launch public x402 API (production)
- [ ] Developer documentation site
- [ ] OpenAPI spec + Postman collection
- [ ] SDKs: Python, TypeScript, Rust

**Month 14-15: Developer Outreach**
- [ ] Langchain integration (add Hololand to tool library)
- [ ] AI Agent hackathon sponsorship ($5K prize pool)
- [ ] OpenAI DevDay booth (if accepted)
- [ ] Anthropic Claude developer community post

**Month 16-18: Scale & Optimize**
- [ ] Multi-region deployment (reduce latency)
- [ ] Caching layer for common prompts
- [ ] Enterprise tier with SLA guarantees
- [ ] Target: 10,000 API calls/month

---

## 8. Code Examples

### 8.1 Server Implementation (TypeScript + tRPC)

```typescript
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { procedure, router } from '../trpc';
import { verifyCoinbasePayment } from '../lib/x402';
import { generateWorldFromPrompt } from '../lib/holoscript';

const x402Router = router({
  generateWorld: procedure
    .input(
      z.object({
        prompt: z.string().min(10).max(500),
        format: z.enum(['holoscript', 'unity', 'webxr']).default('holoscript'),
        complexity: z.enum(['simple', 'standard', 'complex']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { prompt, format } = input;
      const paymentToken = ctx.req.headers['x-payment-token'];

      // Calculate pricing based on complexity
      const complexity = input.complexity || detectComplexity(prompt);
      const pricing = {
        simple: 0.25,
        standard: 0.50,
        complex: 1.00
      };
      const amount = pricing[complexity];

      // Check if payment token provided
      if (!paymentToken) {
        // Generate session ID
        const sessionId = `sess_${crypto.randomUUID()}`;

        // Store pending payment
        await ctx.prisma.x402Payment.create({
          data: {
            sessionId,
            amountUsd: amount,
            paymentStatus: 'pending',
            prompt,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
          }
        });

        // Return 402 Payment Required
        throw new TRPCError({
          code: 'PAYMENT_REQUIRED',
          message: 'Payment required',
          cause: {
            amount_usd: amount,
            payment_address: process.env.HOLOLAND_PAYMENT_WALLET,
            session_id: sessionId,
            supported_protocols: ['x402', 'coinbase-agentic'],
            payment_deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            complexity
          }
        });
      }

      // Verify payment
      const verification = await verifyCoinbasePayment(
        paymentToken as string,
        amount
      );

      if (!verification.valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Payment verification failed'
        });
      }

      // Generate world
      const worldScript = await generateWorldFromPrompt(prompt);

      // Store world in database
      const world = await ctx.prisma.userWorld.create({
        data: {
          title: `AI Generated: ${prompt.slice(0, 50)}`,
          holoscriptSource: worldScript,
          creatorId: ctx.user.id,
          isPublished: false,
          metadata: {
            source: 'x402_api',
            complexity,
            prompt
          }
        }
      });

      // Record API call
      await ctx.prisma.x402ApiCall.create({
        data: {
          paymentId: verification.payment_id,
          agentId: ctx.req.headers['x-agent-id'] as string,
          endpoint: '/api/v1/generate-world',
          prompt,
          complexity,
          objectsGenerated: countObjects(worldScript),
          processingTimeMs: verification.processing_time
        }
      });

      // Return world
      return {
        world_id: world.id,
        world_url: `https://hololand.io/worlds/${world.id}`,
        format,
        script: worldScript,
        metadata: {
          objects_generated: countObjects(worldScript),
          complexity
        },
        payment: {
          session_id: verification.session_id,
          amount_paid: amount
        }
      };
    }),
});

function detectComplexity(prompt: string): 'simple' | 'standard' | 'complex' {
  const wordCount = prompt.split(' ').length;
  if (wordCount < 10) return 'simple';
  if (wordCount < 25) return 'standard';
  return 'complex';
}

function countObjects(script: string): number {
  // Count object declarations in HoloScript
  const matches = script.match(/object\s+"\w+"/g);
  return matches ? matches.length : 0;
}
```

### 8.2 Client SDK (TypeScript)

```typescript
import axios from 'axios';

export class HololandX402Client {
  private apiKey: string;
  private baseURL: string;
  private agentId: string;

  constructor(config: { apiKey: string; agentId: string; baseURL?: string }) {
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.baseURL = config.baseURL || 'https://api.hololand.io';
  }

  async generateWorld(prompt: string, format: string = 'holoscript') {
    try {
      // Step 1: Initial request (expect 402)
      const response = await axios.post(
        `${this.baseURL}/api/v1/generate-world`,
        { prompt, format },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Agent-ID': this.agentId
          },
          validateStatus: (status) => status === 200 || status === 402
        }
      );

      // Step 2: Handle 402 Payment Required
      if (response.status === 402) {
        const paymentDetails = response.data;

        // Execute payment via Coinbase wallet
        const paymentToken = await this.executePayment(paymentDetails);

        // Step 3: Retry with payment token
        const retryResponse = await axios.post(
          `${this.baseURL}/api/v1/generate-world`,
          { prompt, format },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-Agent-ID': this.agentId,
              'X-Payment-Token': paymentToken
            }
          }
        );

        return retryResponse.data;
      }

      // Step 4: Return world if 200 OK
      return response.data;

    } catch (error) {
      console.error('Hololand API Error:', error);
      throw error;
    }
  }

  private async executePayment(details: any): Promise<string> {
    // This would integrate with Coinbase Agentic Wallet SDK
    // For now, this is a placeholder

    // In production:
    // const wallet = new CoinbaseAgenticWallet({ ... });
    // const tx = await wallet.pay({
    //   to: details.payment_address,
    //   amount: details.amount_usd,
    //   session_id: details.session_id
    // });
    // return `coinbase:tx_${tx.hash}_${tx.signature}`;

    throw new Error('Payment execution not implemented - integrate Coinbase SDK');
  }
}

// Usage
const client = new HololandX402Client({
  apiKey: process.env.HOLOLAND_API_KEY!,
  agentId: 'my-ai-agent-123'
});

const world = await client.generateWorld('Create a medieval castle courtyard');
console.log(`World created: ${world.world_url}`);
```

---

## 9. Testing & Validation

### 9.1 Test Scenarios

**Scenario 1: Happy Path**
```typescript
test('x402: successful world generation with payment', async () => {
  // 1. Request without payment → expect 402
  const res1 = await request(app)
    .post('/api/v1/generate-world')
    .send({ prompt: 'medieval castle' })
    .expect(402);

  expect(res1.body).toHaveProperty('session_id');
  expect(res1.body.amount_usd).toBe(0.50);

  // 2. Mock payment token
  const mockPaymentToken = 'coinbase:tx_test123_sig_abc';
  mockCoinbaseVerification({ valid: true, amount: 0.50 });

  // 3. Retry with payment → expect 200
  const res2 = await request(app)
    .post('/api/v1/generate-world')
    .set('X-Payment-Token', mockPaymentToken)
    .send({ prompt: 'medieval castle' })
    .expect(200);

  expect(res2.body).toHaveProperty('world_id');
  expect(res2.body).toHaveProperty('script');
});
```

**Scenario 2: Invalid Payment**
```typescript
test('x402: rejects invalid payment token', async () => {
  const invalidToken = 'invalid:token:format';

  const res = await request(app)
    .post('/api/v1/generate-world')
    .set('X-Payment-Token', invalidToken)
    .send({ prompt: 'medieval castle' })
    .expect(401);

  expect(res.body.error).toContain('Payment verification failed');
});
```

**Scenario 3: Expired Session**
```typescript
test('x402: rejects expired payment session', async () => {
  // Create session 10 minutes ago
  const oldSessionId = await createTestSession({
    createdAt: new Date(Date.now() - 10 * 60 * 1000)
  });

  const res = await request(app)
    .post('/api/v1/generate-world')
    .set('X-Payment-Token', 'coinbase:tx_old_session')
    .send({ prompt: 'medieval castle', session_id: oldSessionId })
    .expect(401);

  expect(res.body.error).toContain('Payment token expired');
});
```

### 9.2 Load Testing

**Target**: 100 concurrent requests, <2s response time

```bash
# Using Apache Bench
ab -n 1000 -c 100 -p request.json -T application/json \
   -H "Authorization: Bearer test_key" \
   https://api.hololand.io/api/v1/generate-world

# Expected results:
# - Requests per second: 50+
# - Mean response time: <2000ms
# - 95th percentile: <3000ms
# - Failed requests: <1%
```

---

## 10. Monitoring & Analytics

### 10.1 Key Metrics

**Dashboard Metrics** (Datadog/New Relic):

1. **Payment Success Rate**: `(verified_payments / total_payment_attempts) * 100`
   - Target: >95%

2. **API Call Volume**: Calls per hour/day/month
   - Target: 10K/month by Month 18

3. **Revenue**: `sum(payment_amounts) / time_period`
   - Target: $5K/month by Month 18

4. **Average Response Time**: P50, P95, P99 latencies
   - Target: P95 <2s

5. **Error Rate**: `(failed_requests / total_requests) * 100`
   - Target: <1%

### 10.2 Alerts

**Critical Alerts** (PagerDuty):

```yaml
alerts:
  - name: "x402 Payment Failure Spike"
    condition: payment_failure_rate > 10%
    window: 5 minutes
    severity: critical

  - name: "x402 High Latency"
    condition: p95_response_time > 5000ms
    window: 10 minutes
    severity: warning

  - name: "x402 API Downtime"
    condition: uptime < 99%
    window: 15 minutes
    severity: critical
```

### 10.3 Analytics Dashboard

**SQL Queries for Reporting**:

```sql
-- Daily revenue
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  SUM(amount_usd) as revenue,
  AVG(amount_usd) as avg_price
FROM x402_payments
WHERE payment_status = 'verified'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top AI agents by volume
SELECT
  agent_id,
  COUNT(*) as call_count,
  SUM(amount_usd) as total_spent,
  AVG(processing_time_ms) as avg_latency
FROM x402_api_calls
GROUP BY agent_id
ORDER BY call_count DESC
LIMIT 10;

-- Complexity distribution
SELECT
  complexity,
  COUNT(*) as count,
  AVG(objects_generated) as avg_objects,
  AVG(processing_time_ms) as avg_time
FROM x402_api_calls
GROUP BY complexity;
```

---

## Appendix A: Coinbase Agentic Wallet Setup

### Developer Account

1. **Sign up**: https://developers.coinbase.com/agentic-wallets
2. **Create API credentials**: Generate API key + secret
3. **Configure webhook**: For payment notifications
4. **Test environment**: Use testnet for development

### SDK Installation

```bash
npm install @coinbase/agentic-wallet-sdk
```

### Configuration

```typescript
import { CoinbaseAgenticWallet } from '@coinbase/agentic-wallet-sdk';

const wallet = new CoinbaseAgenticWallet({
  apiKey: process.env.COINBASE_API_KEY,
  apiSecret: process.env.COINBASE_API_SECRET,
  network: 'base-mainnet', // or 'base-testnet'
  teeEnabled: true // Use Trusted Execution Environment
});

// Verify payment
const verification = await wallet.verifyPayment({
  transactionHash: '0x9f2c3d4e...',
  expectedAmount: 0.50,
  sessionId: 'sess_abc123'
});
```

---

## Appendix B: Pricing Strategy

### Competitive Analysis

| Service | API Type | Pricing | Volume |
|---------|----------|---------|--------|
| **OpenAI DALL-E** | Image generation | $0.04/image (1024×1024) | Millions/day |
| **Midjourney** | Image generation | ~$0.08/image (subscription) | Millions/month |
| **Replicate** | AI model hosting | $0.0001-$0.10/second | Variable |
| **Hololand x402** | 3D world generation | $0.25-$1.00/world | Target: 10K/month (Year 1) |

**Rationale**: 3D world generation is more complex than 2D images, justifying 5-10x higher pricing.

### Dynamic Pricing (Future)

```typescript
// Adjust pricing based on demand
function getDynamicPrice(complexity: string, currentLoad: number): number {
  const basePrices = { simple: 0.25, standard: 0.50, complex: 1.00 };
  const loadMultiplier = currentLoad > 80 ? 1.5 : 1.0; // Surge pricing
  return basePrices[complexity] * loadMultiplier;
}
```

---

## Appendix C: FAQ

**Q: Why x402 instead of traditional API keys?**

**A**: x402 enables pay-per-use for AI agents without requiring pre-funded accounts or subscriptions. Agents can autonomously make API calls and pay on-demand, opening the "machine customer" market.

**Q: What if Coinbase changes pricing or shuts down?**

**A**: HTTP 402 is an open standard. We can integrate with alternative providers (MetaMask, WalletConnect) or implement our own payment system. Coinbase provides initial convenience, not vendor lock-in.

**Q: How do we handle refunds?**

**A**: If world generation fails after payment verification, we automatically refund via Coinbase API or issue API credits for retry.

**Q: What prevents abuse (e.g., generating offensive content)?**

**A**: All prompts are filtered through content moderation API (OpenAI Moderation). Offensive prompts are rejected before processing, and payment is refunded.

---

**Document Status**: Ready for Phase B implementation
**Next Review**: Month 8 (start of x402 POC)
**Maintainer**: Hololand Platform Team
**Contact**: dev@hololand.io

---

*End of x402 AI Agent Payments Integration Guide*
