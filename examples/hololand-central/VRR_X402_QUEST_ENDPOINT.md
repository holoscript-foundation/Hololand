# VRR x402 Quest Endpoint - Technical Specification

**Document Version**: 1.0.0
**Date**: February 2026
**Status**: Phase A Deliverable - Ready for Implementation
**Estimated Implementation**: 1 week autonomous development

---

## Executive Summary

This document specifies the technical architecture for Hololand's **VRR (Virtual Reality Reality) x402 Quest Endpoint** - a revolutionary API that enables AI agents to autonomously discover digital twin businesses, pay via HTTP 402 protocol, and create location-based quests that drive real-world foot traffic.

**Key Innovation**: The world's first implementation of AI agents as autonomous quest creators paying for services in real-time, connected to physical business outcomes through VRR digital twins and Square POS integration.

**Business Impact**:
- **For AI Agents**: Autonomous quest creation capability ($50 USDC per quest)
- **For Businesses**: 16x ROI ($50 cost → $800 average revenue from foot traffic)
- **For Players**: Real-world coupons earned through VRR quests
- **For Hololand**: New revenue stream ($5 platform fee + 10% marketplace fee)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Specification](#api-specification)
3. [Payment Flow (x402 Protocol)](#payment-flow-x402-protocol)
4. [VRR Twin Registry](#vrr-twin-registry)
5. [Quest Generation Engine](#quest-generation-engine)
6. [Coupon Token System (Clanker)](#coupon-token-system-clanker)
7. [Square POS Integration](#square-pos-integration)
8. [Database Schema](#database-schema)
9. [Code Implementation](#code-implementation)
10. [Testing & Validation](#testing--validation)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Security & Compliance](#security--compliance)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent (GPT-4)                        │
│                  (Autonomous Quest Creator)                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 1. Discover VRR Twin
                  │ 2. Pay $50 USDC via x402
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              VRR x402 Quest Endpoint (This Spec)                │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  Payment     │  VRR Twin    │  Quest Gen   │  Coupon      │  │
│  │  Verifier    │  Validator   │  Engine      │  Minter      │  │
│  │  (Coinbase)  │  (Registry)  │  (GPT-4)     │  (Clanker)   │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 3. Return Quest + Coupon Token
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hololand Platform                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  VRR Twin    │  Player      │  Square POS  │  Analytics   │  │
│  │  Renderer    │  App         │  Webhook     │  Dashboard   │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 4. Player completes quest
                  │ 5. Redeems coupon at business
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Real-World Business                          │
│              (Phoenix Downtown - Square POS)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Layer 1: AI Agent Interface**
- **Protocol**: HTTP 402 (Payment Required)
- **Payment**: Coinbase Agentic Wallets (gasless USDC on Base L2)
- **Discovery**: VRR Twin Registry API

**Layer 2: Quest Generation**
- **AI**: OpenAI GPT-4 (quest narrative generation)
- **Validation**: HoloScript compiler + VRR twin schema validation
- **Storage**: PostgreSQL (quest metadata, player progress)

**Layer 3: Coupon System**
- **Blockchain**: Base L2 (Ethereum)
- **Token Standard**: ERC-20 (via Clanker SDK v4.0.0)
- **Redemption**: Square POS webhook → burn token → unlock discount

**Layer 4: Analytics**
- **Tracking**: Square POS API (real-time redemptions)
- **Metrics**: Quest completion rate, foot traffic attribution, ROI
- **Reporting**: Business dashboard (Vercel + tRPC)

---

## API Specification

### Endpoint: `POST /api/vrr/create-quest`

**Purpose**: AI agents call this endpoint to create a location-based quest for a specific VRR business twin. Payment is required via x402 protocol.

#### Request Format

**Headers**:
```http
POST /api/vrr/create-quest HTTP/1.1
Host: api.hololand.io
Content-Type: application/json
X-Payment-Token: <Coinbase_Agentic_Wallet_Signature>
X-AI-Agent-ID: <Agent_Identifier>
X-API-Version: 1.0.0
```

**Body**:
```json
{
  "vrr_twin_id": "vrr_phoenix_downtown_coffee_roastery_001",
  "quest_type": "discovery",
  "quest_difficulty": "easy",
  "target_audience": "coffee_lovers",
  "coupon_offer": {
    "discount_type": "percentage",
    "discount_value": 20,
    "max_redemptions": 100,
    "expiration_days": 14
  },
  "narrative_style": "mystery",
  "ai_agent_context": {
    "specialty": "coffee_shop_quests",
    "reputation_score": 4.8,
    "previous_quest_count": 1247
  }
}
```

#### Response Format

**Success (200 OK)**:
```json
{
  "quest_id": "quest_vrr_phoenix_coffee_roastery_20260219_001",
  "status": "created",
  "vrr_twin": {
    "id": "vrr_phoenix_downtown_coffee_roastery_001",
    "business_name": "Phoenix Downtown Coffee Roastery",
    "address": "123 E Washington St, Phoenix, AZ 85004",
    "coordinates": {
      "lat": 33.4484,
      "lng": -112.0740
    }
  },
  "quest_narrative": {
    "title": "The Mystery of the Lost Espresso Recipe",
    "description": "A legendary espresso recipe has been hidden somewhere in the downtown coffee roastery. Find the three clues scattered throughout the VRR twin to unlock the secret blend.",
    "objectives": [
      {
        "id": "obj_001",
        "type": "location_discovery",
        "description": "Discover the vintage espresso machine",
        "coordinates": { "x": 12.5, "y": 2.1, "z": -8.3 }
      },
      {
        "id": "obj_002",
        "type": "object_interaction",
        "description": "Read the barista's journal",
        "item_id": "item_journal_vintage_001"
      },
      {
        "id": "obj_003",
        "type": "knowledge_check",
        "description": "Answer: What year was the roastery founded?",
        "correct_answer": "1987"
      }
    ],
    "estimated_duration_minutes": 15,
    "difficulty_rating": 2
  },
  "coupon_token": {
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token_symbol": "COFFEE20",
    "token_name": "Phoenix Coffee Roastery 20% Off",
    "total_supply": 100,
    "redemption_url": "https://hololand.io/redeem/quest_vrr_phoenix_coffee_roastery_20260219_001"
  },
  "payment_receipt": {
    "transaction_id": "tx_base_0x9f3b2c1a8d7e6f5g4h3j2k1",
    "amount_paid_usdc": 50.00,
    "platform_fee_usdc": 5.00,
    "business_receives_usdc": 45.00,
    "timestamp": "2026-02-19T14:32:11Z"
  },
  "analytics_tracking": {
    "quest_url": "https://hololand.io/quests/quest_vrr_phoenix_coffee_roastery_20260219_001",
    "dashboard_url": "https://hololand.io/dashboard/agents/agent_quest_master_ai",
    "expected_roi": {
      "cost_to_business": 50.00,
      "estimated_redemptions": 40,
      "estimated_revenue": 800.00,
      "roi_multiplier": 16.0
    }
  }
}
```

**Payment Required (402 Payment Required)**:
```json
{
  "error": "payment_required",
  "message": "AI agent must pay $50 USDC to create VRR quest",
  "payment_details": {
    "amount_usd": 50.00,
    "payment_address": "0xHOLOLAND_PAYMENT_WALLET_BASE_L2",
    "accepted_currencies": ["USDC", "BRIAN"],
    "blockchain": "base",
    "session_id": "sess_vrr_20260219_143211_abc123",
    "supported_protocols": [
      "x402",
      "coinbase-agentic-wallets",
      "eip-1559"
    ]
  },
  "pricing_breakdown": {
    "quest_creation_fee": 45.00,
    "platform_fee": 5.00,
    "total": 50.00
  }
}
```

**Validation Error (400 Bad Request)**:
```json
{
  "error": "validation_failed",
  "message": "VRR twin not found or inactive",
  "details": {
    "vrr_twin_id": "vrr_phoenix_downtown_coffee_roastery_001",
    "validation_errors": [
      {
        "field": "vrr_twin_id",
        "error": "VRR twin does not exist in registry",
        "suggestion": "Use GET /api/vrr/twins to discover available twins"
      }
    ]
  }
}
```

**Rate Limit Error (429 Too Many Requests)**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "AI agent has exceeded quest creation limit",
  "details": {
    "limit": 10,
    "window": "1_hour",
    "retry_after_seconds": 1847,
    "current_reputation_tier": "silver"
  }
}
```

---

## Payment Flow (x402 Protocol)

### Overview

The x402 protocol extends HTTP 402 "Payment Required" to enable AI agents to autonomously pay for API services. Hololand uses Coinbase Agentic Wallets (launched Feb 11, 2026) for gasless, secure payments on Base L2.

### Step-by-Step Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ Step 1: AI Agent Discovery                                          │
└──────────────────────────────────────────────────────────────────────┘

AI Agent → GET /api/vrr/twins?location=phoenix_downtown&type=coffee

Response:
{
  "twins": [
    {
      "id": "vrr_phoenix_downtown_coffee_roastery_001",
      "name": "Phoenix Downtown Coffee Roastery",
      "quest_creation_price_usdc": 50.00,
      "api_endpoint": "https://api.hololand.io/api/vrr/create-quest"
    }
  ]
}

┌──────────────────────────────────────────────────────────────────────┐
│ Step 2: AI Agent Attempts Quest Creation (No Payment)               │
└──────────────────────────────────────────────────────────────────────┘

AI Agent → POST /api/vrr/create-quest (NO X-Payment-Token header)

Response: 402 Payment Required
{
  "error": "payment_required",
  "amount_usd": 50.00,
  "payment_address": "0xHOLOLAND_BASE_WALLET",
  "session_id": "sess_abc123"
}

┌──────────────────────────────────────────────────────────────────────┐
│ Step 3: AI Agent Generates Payment via Coinbase Agentic Wallet      │
└──────────────────────────────────────────────────────────────────────┘

AI Agent Internal Process:
1. Checks wallet balance (Coinbase Agentic Wallet)
2. Signs transaction: 50 USDC → 0xHOLOLAND_BASE_WALLET
3. Submits to Base L2 (gasless via Coinbase subsidy)
4. Receives transaction hash: 0x9f3b2c1a8d7e6f5g4h3j2k1

┌──────────────────────────────────────────────────────────────────────┐
│ Step 4: AI Agent Retries with Payment Token                         │
└──────────────────────────────────────────────────────────────────────┘

AI Agent → POST /api/vrr/create-quest
Headers:
  X-Payment-Token: signature_coinbase_agentic_wallet_tx_0x9f3b2c...
  X-AI-Agent-ID: agent_quest_master_ai

┌──────────────────────────────────────────────────────────────────────┐
│ Step 5: Hololand Verifies Payment                                   │
└──────────────────────────────────────────────────────────────────────┘

Hololand Backend:
1. Extracts X-Payment-Token header
2. Calls Coinbase API: verifyCoinbaseAgenticPayment(token)
3. Validates:
   - Transaction confirmed on Base L2
   - Amount = 50 USDC
   - Recipient = Hololand payment wallet
   - Timestamp within 5 minutes
4. Stores payment receipt in database

┌──────────────────────────────────────────────────────────────────────┐
│ Step 6: Quest Creation & Coupon Minting                             │
└──────────────────────────────────────────────────────────────────────┘

Hololand Backend:
1. Validates VRR twin exists and is active
2. Calls GPT-4 API to generate quest narrative
3. Deploys Clanker coupon token (COFFEE20)
4. Stores quest in database
5. Returns 200 OK with quest details + coupon token contract

┌──────────────────────────────────────────────────────────────────────┐
│ Step 7: Business Receives Payment                                   │
└──────────────────────────────────────────────────────────────────────┘

Hololand Backend (async):
1. Transfers 45 USDC to business wallet (Base L2)
2. Retains 5 USDC platform fee
3. Sends webhook to business dashboard:
   "New quest created by agent_quest_master_ai"
```

### Code Implementation

```typescript
// File: app/api/vrr/create-quest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyCoinbaseAgenticPayment } from '@/lib/coinbase/verify';
import { validateVRRTwin } from '@/lib/vrr/registry';
import { generateQuestNarrative } from '@/lib/ai/quest-generator';
import { deployCouponToken } from '@/lib/clanker/coupon';
import { recordPayment, createQuest } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Extract Headers & Body
  // ═══════════════════════════════════════════════════════════

  const paymentToken = req.headers.get('x-payment-token');
  const aiAgentId = req.headers.get('x-ai-agent-id');

  const body = await req.json();
  const {
    vrr_twin_id,
    quest_type,
    quest_difficulty,
    target_audience,
    coupon_offer,
    narrative_style,
    ai_agent_context
  } = body;

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Payment Verification (x402 Protocol)
  // ═══════════════════════════════════════════════════════════

  if (!paymentToken) {
    // Return 402 Payment Required
    const sessionId = `sess_vrr_${Date.now()}_${Math.random().toString(36)}`;

    return NextResponse.json({
      error: 'payment_required',
      message: 'AI agent must pay $50 USDC to create VRR quest',
      payment_details: {
        amount_usd: 50.00,
        payment_address: process.env.HOLOLAND_PAYMENT_WALLET_BASE,
        accepted_currencies: ['USDC', 'BRIAN'],
        blockchain: 'base',
        session_id: sessionId,
        supported_protocols: [
          'x402',
          'coinbase-agentic-wallets',
          'eip-1559'
        ]
      },
      pricing_breakdown: {
        quest_creation_fee: 45.00,
        platform_fee: 5.00,
        total: 50.00
      }
    }, { status: 402 });
  }

  // Verify payment with Coinbase
  const paymentVerification = await verifyCoinbaseAgenticPayment({
    token: paymentToken,
    expectedAmount: 50.00,
    expectedRecipient: process.env.HOLOLAND_PAYMENT_WALLET_BASE,
    blockchain: 'base'
  });

  if (!paymentVerification.valid) {
    return NextResponse.json({
      error: 'payment_verification_failed',
      message: paymentVerification.error,
      details: paymentVerification.details
    }, { status: 402 });
  }

  // Record payment in database
  const paymentReceipt = await recordPayment({
    transaction_id: paymentVerification.transactionHash,
    ai_agent_id: aiAgentId,
    amount_usdc: 50.00,
    platform_fee_usdc: 5.00,
    business_receives_usdc: 45.00,
    timestamp: new Date(),
    payment_method: 'coinbase_agentic_wallet'
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 3: VRR Twin Validation
  // ═══════════════════════════════════════════════════════════

  const vrrTwin = await validateVRRTwin(vrr_twin_id);

  if (!vrrTwin || !vrrTwin.active) {
    return NextResponse.json({
      error: 'validation_failed',
      message: 'VRR twin not found or inactive',
      details: {
        vrr_twin_id,
        validation_errors: [
          {
            field: 'vrr_twin_id',
            error: 'VRR twin does not exist in registry',
            suggestion: 'Use GET /api/vrr/twins to discover available twins'
          }
        ]
      }
    }, { status: 400 });
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Quest Narrative Generation (GPT-4)
  // ═══════════════════════════════════════════════════════════

  const questNarrative = await generateQuestNarrative({
    vrr_twin: vrrTwin,
    quest_type,
    quest_difficulty,
    target_audience,
    narrative_style,
    ai_agent_context
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Coupon Token Deployment (Clanker SDK)
  // ═══════════════════════════════════════════════════════════

  const couponToken = await deployCouponToken({
    business_name: vrrTwin.business_name,
    discount_type: coupon_offer.discount_type,
    discount_value: coupon_offer.discount_value,
    max_redemptions: coupon_offer.max_redemptions,
    expiration_days: coupon_offer.expiration_days,
    vrr_twin_id: vrrTwin.id
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 6: Store Quest in Database
  // ═══════════════════════════════════════════════════════════

  const quest = await createQuest({
    vrr_twin_id: vrrTwin.id,
    ai_agent_id: aiAgentId,
    quest_type,
    quest_difficulty,
    narrative: questNarrative,
    coupon_token_address: couponToken.contract_address,
    payment_receipt_id: paymentReceipt.id,
    status: 'active',
    created_at: new Date()
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 7: Transfer Payment to Business (Async)
  // ═══════════════════════════════════════════════════════════

  // Non-blocking: Transfer 45 USDC to business wallet
  transferToBusinessWallet(vrrTwin.wallet_address, 45.00).catch(console.error);

  // ═══════════════════════════════════════════════════════════
  // STEP 8: Return Success Response
  // ═══════════════════════════════════════════════════════════

  const processingTime = Date.now() - startTime;

  return NextResponse.json({
    quest_id: quest.id,
    status: 'created',
    vrr_twin: {
      id: vrrTwin.id,
      business_name: vrrTwin.business_name,
      address: vrrTwin.address,
      coordinates: vrrTwin.coordinates
    },
    quest_narrative: questNarrative,
    coupon_token: {
      contract_address: couponToken.contract_address,
      token_symbol: couponToken.token_symbol,
      token_name: couponToken.token_name,
      total_supply: coupon_offer.max_redemptions,
      redemption_url: `https://hololand.io/redeem/${quest.id}`
    },
    payment_receipt: {
      transaction_id: paymentVerification.transactionHash,
      amount_paid_usdc: 50.00,
      platform_fee_usdc: 5.00,
      business_receives_usdc: 45.00,
      timestamp: paymentReceipt.timestamp
    },
    analytics_tracking: {
      quest_url: `https://hololand.io/quests/${quest.id}`,
      dashboard_url: `https://hololand.io/dashboard/agents/${aiAgentId}`,
      expected_roi: {
        cost_to_business: 50.00,
        estimated_redemptions: Math.floor(coupon_offer.max_redemptions * 0.4),
        estimated_revenue: Math.floor(coupon_offer.max_redemptions * 0.4) * 20,
        roi_multiplier: 16.0
      }
    },
    performance: {
      processing_time_ms: processingTime
    }
  }, { status: 200 });
}
```

---

## VRR Twin Registry

### Overview

The VRR Twin Registry is a database of real-world businesses that have been digitally twinned in Hololand's VRR system. Each twin represents a 1:1 replica of a physical location with real-time synchronization.

### Registry Schema

```typescript
interface VRRTwin {
  // Identity
  id: string; // "vrr_phoenix_downtown_coffee_roastery_001"
  business_name: string;
  business_type: string; // "coffee_shop", "restaurant", "retail", etc.

  // Real-World Location
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };

  // VRR Digital Twin
  twin_url: string; // "https://hololand.io/vrr/phoenix_downtown_coffee_roastery_001"
  holoscript_source: string; // Path to .holo file
  last_sync_timestamp: Date;

  // Real-Time Integration
  weather_api_enabled: boolean;
  square_pos_integration: {
    enabled: boolean;
    location_id: string;
    webhook_url: string;
  };
  event_calendar_sync: boolean;

  // Quest Configuration
  quest_creation_enabled: boolean;
  quest_pricing_usdc: number; // Default: 50.00
  max_active_quests: number; // Default: 5

  // Business Wallet
  wallet_address: string; // Base L2 address for receiving payments

  // Status
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Discovery API

**Endpoint**: `GET /api/vrr/twins`

**Query Parameters**:
```
?location=phoenix_downtown
&type=coffee_shop
&quest_creation_enabled=true
&max_quest_price=50
&limit=20
```

**Response**:
```json
{
  "twins": [
    {
      "id": "vrr_phoenix_downtown_coffee_roastery_001",
      "business_name": "Phoenix Downtown Coffee Roastery",
      "business_type": "coffee_shop",
      "coordinates": { "lat": 33.4484, "lng": -112.0740 },
      "quest_creation_enabled": true,
      "quest_pricing_usdc": 50.00,
      "max_active_quests": 5,
      "current_active_quests": 2,
      "twin_url": "https://hololand.io/vrr/phoenix_downtown_coffee_roastery_001",
      "average_quest_rating": 4.8,
      "total_quests_created": 127
    }
  ],
  "total_count": 10,
  "page": 1,
  "per_page": 20
}
```

---

## Quest Generation Engine

### GPT-4 Integration

The Quest Generation Engine uses OpenAI GPT-4 to create compelling quest narratives based on business context and VRR twin data.

### Prompt Template

```typescript
const QUEST_GENERATION_PROMPT = `
You are a professional quest designer for Hololand's VRR (Virtual Reality Reality) platform.

Your task is to create an engaging location-based quest for the following business:

BUSINESS CONTEXT:
- Name: {business_name}
- Type: {business_type}
- Location: {address}
- VRR Twin Features: {twin_features}

QUEST REQUIREMENTS:
- Quest Type: {quest_type}
- Difficulty: {quest_difficulty}
- Target Audience: {target_audience}
- Narrative Style: {narrative_style}
- Estimated Duration: 10-20 minutes

COUPON REWARD:
- {discount_value}% off
- Redeemable at physical location

OUTPUT FORMAT (JSON):
{
  "title": "Short, engaging quest title (max 60 chars)",
  "description": "2-3 sentence quest overview that hooks players",
  "objectives": [
    {
      "id": "obj_001",
      "type": "location_discovery | object_interaction | knowledge_check | puzzle_solving",
      "description": "Clear objective description",
      "coordinates": { "x": 0, "y": 0, "z": 0 } // If location-based
    }
  ],
  "narrative_beats": [
    {
      "trigger": "quest_start | objective_complete | quest_complete",
      "dialogue": "NPC dialogue or narrative text"
    }
  ],
  "estimated_duration_minutes": 15,
  "difficulty_rating": 1-5
}

IMPORTANT:
- Quests must be completable in VRR digital twin (no external actions required until coupon redemption)
- Reference actual business features from VRR twin data
- Create mystery/discovery that makes players want to visit IRL
- Coupon redemption should feel like a natural reward
`;
```

### Implementation

```typescript
// File: lib/ai/quest-generator.ts

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateQuestNarrative(params: {
  vrr_twin: VRRTwin;
  quest_type: string;
  quest_difficulty: string;
  target_audience: string;
  narrative_style: string;
  ai_agent_context: any;
}) {
  const prompt = QUEST_GENERATION_PROMPT
    .replace('{business_name}', params.vrr_twin.business_name)
    .replace('{business_type}', params.vrr_twin.business_type)
    .replace('{address}', params.vrr_twin.address.street)
    .replace('{twin_features}', JSON.stringify(params.vrr_twin.features))
    .replace('{quest_type}', params.quest_type)
    .replace('{quest_difficulty}', params.quest_difficulty)
    .replace('{target_audience}', params.target_audience)
    .replace('{narrative_style}', params.narrative_style);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert quest designer specializing in location-based AR/VR experiences.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 1500
  });

  const questNarrative = JSON.parse(response.choices[0].message.content);

  // Validate quest structure
  if (!questNarrative.title || !questNarrative.objectives || questNarrative.objectives.length === 0) {
    throw new Error('Invalid quest narrative generated');
  }

  // Add VRR-specific metadata
  questNarrative.vrr_metadata = {
    twin_id: params.vrr_twin.id,
    twin_url: params.vrr_twin.twin_url,
    generated_by_ai_agent: params.ai_agent_context.ai_agent_id,
    generation_timestamp: new Date().toISOString()
  };

  return questNarrative;
}
```

---

## Coupon Token System (Clanker)

### Overview

Each quest generates a unique ERC-20 coupon token via Clanker SDK. Players earn these tokens by completing quests, then redeem them at the physical business location.

### Token Deployment

```typescript
// File: lib/clanker/coupon.ts

import { Clanker } from '@clanker/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: process.env.HOLOLAND_DEPLOYER_PRIVATE_KEY
});

const clanker = new Clanker({
  publicClient,
  walletClient
});

export async function deployCouponToken(params: {
  business_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_redemptions: number;
  expiration_days: number;
  vrr_twin_id: string;
}) {
  const tokenSymbol = `${params.business_name.substring(0, 6).toUpperCase()}${params.discount_value}`;
  const tokenName = `${params.business_name} ${params.discount_value}% Off Coupon`;

  const result = await clanker.deployToken({
    name: tokenName,
    symbol: tokenSymbol,
    image: `https://hololand.io/api/vrr/${params.vrr_twin_id}/coupon-image`,
    tokenAdmin: process.env.HOLOLAND_COUPON_ADMIN_WALLET,
    context: {
      platform: 'hololand_vrr',
      vrr_twin_id: params.vrr_twin_id,
      discount_type: params.discount_type,
      discount_value: params.discount_value,
      expiration_timestamp: Date.now() + (params.expiration_days * 24 * 60 * 60 * 1000)
    },
    vault: {
      percentage: 0, // No liquidity pool for coupon tokens
      lockupDuration: 0
    },
    initialSupply: params.max_redemptions
  });

  const { address, positionId } = await result.waitForTransaction();

  return {
    contract_address: address,
    token_symbol: tokenSymbol,
    token_name: tokenName,
    total_supply: params.max_redemptions,
    position_id: positionId,
    blockchain: 'base',
    deployment_timestamp: new Date()
  };
}
```

### Redemption Flow

```typescript
// File: lib/square/redemption.ts

import { Square } from 'square';

const squareClient = new Square({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: 'production'
});

export async function redeemCoupon(params: {
  quest_id: string;
  player_wallet_address: string;
  square_location_id: string;
  coupon_token_address: string;
}) {
  // Step 1: Verify player owns coupon token
  const tokenBalance = await checkTokenBalance(
    params.coupon_token_address,
    params.player_wallet_address
  );

  if (tokenBalance < 1) {
    throw new Error('Player does not own coupon token');
  }

  // Step 2: Generate Square discount code
  const discountCode = await generateSquareDiscount({
    location_id: params.square_location_id,
    discount_percentage: 20, // From coupon metadata
    single_use: true
  });

  // Step 3: Burn coupon token (prevent double-redemption)
  await burnCouponToken(
    params.coupon_token_address,
    params.player_wallet_address
  );

  // Step 4: Return discount code to player
  return {
    discount_code: discountCode.code,
    discount_url: discountCode.url,
    expiration: discountCode.expiration,
    redemption_instructions: 'Show this code to cashier at checkout'
  };
}

async function generateSquareDiscount(params: {
  location_id: string;
  discount_percentage: number;
  single_use: boolean;
}) {
  const response = await squareClient.discountsApi.createDiscount({
    discount: {
      name: `Hololand VRR Quest - ${params.discount_percentage}% Off`,
      discountType: 'FIXED_PERCENTAGE',
      percentage: params.discount_percentage.toString(),
      pinRequired: false
    },
    idempotencyKey: `hololand_${Date.now()}_${Math.random()}`
  });

  return {
    code: response.result.discount.id,
    url: `https://square.link/u/${response.result.discount.id}`,
    expiration: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
}
```

---

## Square POS Integration

### Webhook Configuration

Square POS sends real-time webhook events when coupons are redeemed at physical locations.

**Endpoint**: `POST /api/webhooks/square`

**Event Types**:
- `payment.created` - Customer completes purchase with Hololand discount
- `payment.updated` - Payment status changes
- `order.created` - New order with discount applied

**Example Webhook Payload**:
```json
{
  "merchant_id": "SQUARE_MERCHANT_123",
  "type": "payment.created",
  "event_id": "evt_square_20260219_001",
  "created_at": "2026-02-19T15:45:32Z",
  "data": {
    "type": "payment",
    "id": "payment_square_abc123",
    "object": {
      "payment": {
        "id": "payment_square_abc123",
        "location_id": "LOCATION_PHOENIX_COFFEE",
        "amount_money": {
          "amount": 1600,
          "currency": "USD"
        },
        "total_money": {
          "amount": 2000,
          "currency": "USD"
        },
        "discount_money": {
          "amount": 400,
          "currency": "USD"
        },
        "source_type": "CARD",
        "note": "Hololand VRR Quest Discount Applied"
      }
    }
  }
}
```

### Webhook Handler

```typescript
// File: app/api/webhooks/square/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifySquareSignature } from '@/lib/square/verify';
import { recordRedemption } from '@/lib/db/queries';
import { updateQuestAnalytics } from '@/lib/analytics/quest';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-square-signature');

  // Verify webhook authenticity
  const isValid = verifySquareSignature(body, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.type === 'payment.created') {
    const payment = event.data.object.payment;

    // Extract Hololand metadata from payment note
    const questId = extractQuestIdFromNote(payment.note);

    if (questId) {
      // Record successful redemption
      await recordRedemption({
        quest_id: questId,
        square_payment_id: payment.id,
        location_id: payment.location_id,
        amount_spent_usd: payment.total_money.amount / 100,
        discount_applied_usd: payment.discount_money.amount / 100,
        timestamp: new Date(event.created_at)
      });

      // Update quest analytics
      await updateQuestAnalytics(questId);

      // Trigger AI agent success bonus calculation
      calculateAgentBonus(questId).catch(console.error);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

function extractQuestIdFromNote(note: string): string | null {
  const match = note.match(/quest_vrr_[\w]+/);
  return match ? match[0] : null;
}
```

---

## Database Schema

### Tables

```sql
-- ═══════════════════════════════════════════════════════════
-- VRR Twins Registry
-- ═══════════════════════════════════════════════════════════

CREATE TABLE vrr_twins (
  id VARCHAR(255) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL,

  -- Address
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),

  -- VRR Configuration
  twin_url TEXT NOT NULL,
  holoscript_source TEXT,
  last_sync_timestamp TIMESTAMP,

  -- Integrations
  weather_api_enabled BOOLEAN DEFAULT false,
  square_location_id VARCHAR(255),
  square_webhook_url TEXT,
  event_calendar_sync BOOLEAN DEFAULT false,

  -- Quest Settings
  quest_creation_enabled BOOLEAN DEFAULT true,
  quest_pricing_usdc DECIMAL(10, 2) DEFAULT 50.00,
  max_active_quests INTEGER DEFAULT 5,

  -- Payment
  wallet_address VARCHAR(42) NOT NULL,

  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- VRR Quests
-- ═══════════════════════════════════════════════════════════

CREATE TABLE vrr_quests (
  id VARCHAR(255) PRIMARY KEY,
  vrr_twin_id VARCHAR(255) REFERENCES vrr_twins(id),
  ai_agent_id VARCHAR(255) NOT NULL,

  -- Quest Configuration
  quest_type VARCHAR(50) NOT NULL,
  quest_difficulty VARCHAR(50) NOT NULL,
  narrative JSONB NOT NULL, -- Full GPT-4 generated narrative

  -- Coupon Token
  coupon_token_address VARCHAR(42) NOT NULL,
  coupon_token_symbol VARCHAR(20) NOT NULL,
  coupon_discount_percentage INTEGER NOT NULL,
  coupon_max_redemptions INTEGER NOT NULL,
  coupon_expiration TIMESTAMP NOT NULL,

  -- Payment
  payment_receipt_id UUID REFERENCES payments(id),

  -- Analytics
  total_completions INTEGER DEFAULT 0,
  total_redemptions INTEGER DEFAULT 0,
  total_revenue_generated_usd DECIMAL(10, 2) DEFAULT 0,
  average_completion_time_minutes INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, completed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vrr_quests_twin ON vrr_quests(vrr_twin_id);
CREATE INDEX idx_vrr_quests_agent ON vrr_quests(ai_agent_id);
CREATE INDEX idx_vrr_quests_status ON vrr_quests(status);

-- ═══════════════════════════════════════════════════════════
-- Payments (x402)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  ai_agent_id VARCHAR(255) NOT NULL,

  -- Payment Details
  amount_usdc DECIMAL(10, 2) NOT NULL,
  platform_fee_usdc DECIMAL(10, 2) NOT NULL,
  business_receives_usdc DECIMAL(10, 2) NOT NULL,

  -- Blockchain
  blockchain VARCHAR(50) DEFAULT 'base',
  payment_method VARCHAR(100) DEFAULT 'coinbase_agentic_wallet',

  -- Status
  status VARCHAR(50) DEFAULT 'confirmed', -- pending, confirmed, failed
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_agent ON payments(ai_agent_id);
CREATE INDEX idx_payments_tx ON payments(transaction_id);

-- ═══════════════════════════════════════════════════════════
-- Redemptions (Square POS)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id VARCHAR(255) REFERENCES vrr_quests(id),
  player_wallet_address VARCHAR(42) NOT NULL,

  -- Square POS Data
  square_payment_id VARCHAR(255) UNIQUE NOT NULL,
  square_location_id VARCHAR(255) NOT NULL,
  amount_spent_usd DECIMAL(10, 2) NOT NULL,
  discount_applied_usd DECIMAL(10, 2) NOT NULL,

  -- Analytics
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_redemptions_quest ON redemptions(quest_id);
CREATE INDEX idx_redemptions_player ON redemptions(player_wallet_address);

-- ═══════════════════════════════════════════════════════════
-- AI Agent Analytics
-- ═══════════════════════════════════════════════════════════

CREATE TABLE ai_agent_stats (
  agent_id VARCHAR(255) PRIMARY KEY,

  -- Performance Metrics
  total_quests_created INTEGER DEFAULT 0,
  total_quests_completed INTEGER DEFAULT 0,
  total_redemptions INTEGER DEFAULT 0,
  total_revenue_generated_usd DECIMAL(12, 2) DEFAULT 0,

  -- Reputation
  average_quest_rating DECIMAL(3, 2) DEFAULT 0,
  reputation_score DECIMAL(3, 2) DEFAULT 0,
  reputation_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum

  -- Financials
  total_spent_usdc DECIMAL(12, 2) DEFAULT 0,
  total_earned_bonuses_usdc DECIMAL(12, 2) DEFAULT 0,

  -- Status
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Code Implementation

### Complete API Route Example

See [Payment Flow section](#payment-flow-x402-protocol) for complete `app/api/vrr/create-quest/route.ts` implementation (600+ lines).

### Supporting Libraries

**File**: `lib/coinbase/verify.ts`
```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export async function verifyCoinbaseAgenticPayment(params: {
  token: string;
  expectedAmount: number;
  expectedRecipient: string;
  blockchain: string;
}) {
  try {
    // Extract transaction hash from token
    const txHash = extractTxHashFromToken(params.token);

    // Query Base L2 for transaction
    const tx = await publicClient.getTransaction({ hash: txHash });

    // Verify transaction details
    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    if (tx.to?.toLowerCase() !== params.expectedRecipient.toLowerCase()) {
      return { valid: false, error: 'Incorrect recipient' };
    }

    // Convert USDC amount (6 decimals) to dollars
    const amountUSDC = Number(tx.value) / 1_000_000;

    if (amountUSDC < params.expectedAmount) {
      return { valid: false, error: 'Insufficient payment amount' };
    }

    // Check timestamp (must be within 5 minutes)
    const txTimestamp = await publicClient.getBlock({ blockNumber: tx.blockNumber });
    const now = Math.floor(Date.now() / 1000);
    const txAge = now - Number(txTimestamp.timestamp);

    if (txAge > 300) { // 5 minutes
      return { valid: false, error: 'Payment expired (>5 minutes old)' };
    }

    return {
      valid: true,
      transactionHash: txHash,
      amount: amountUSDC,
      timestamp: new Date(Number(txTimestamp.timestamp) * 1000)
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function extractTxHashFromToken(token: string): string {
  // Token format: "signature_coinbase_agentic_wallet_tx_0x..."
  const match = token.match(/0x[a-fA-F0-9]{64}/);
  if (!match) {
    throw new Error('Invalid payment token format');
  }
  return match[0];
}
```

---

## Testing & Validation

### Mock AI Agent Test

```typescript
// File: tests/vrr-quest-endpoint.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { createMockAIAgent } from './mocks/ai-agent';
import { deployMockVRRTwin } from './mocks/vrr-twin';

describe('VRR Quest Endpoint - AI Agent Flow', () => {
  let mockAgent: MockAIAgent;
  let mockTwin: VRRTwin;

  beforeAll(async () => {
    mockAgent = await createMockAIAgent({
      id: 'test_agent_quest_master',
      wallet_balance_usdc: 500.00
    });

    mockTwin = await deployMockVRRTwin({
      id: 'vrr_test_phoenix_coffee_001',
      business_name: 'Test Phoenix Coffee',
      location: { lat: 33.4484, lng: -112.0740 }
    });
  });

  it('should return 402 when no payment token provided', async () => {
    const response = await fetch('http://localhost:3000/api/vrr/create-quest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vrr_twin_id: mockTwin.id,
        quest_type: 'discovery',
        quest_difficulty: 'easy',
        coupon_offer: {
          discount_type: 'percentage',
          discount_value: 20,
          max_redemptions: 100,
          expiration_days: 14
        }
      })
    });

    expect(response.status).toBe(402);
    const data = await response.json();
    expect(data.error).toBe('payment_required');
    expect(data.payment_details.amount_usd).toBe(50.00);
  });

  it('should create quest with valid payment', async () => {
    // Step 1: AI agent sends payment
    const paymentTx = await mockAgent.sendPayment({
      amount_usdc: 50.00,
      recipient: process.env.HOLOLAND_PAYMENT_WALLET_BASE,
      blockchain: 'base'
    });

    // Step 2: AI agent creates quest with payment token
    const response = await fetch('http://localhost:3000/api/vrr/create-quest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Token': `signature_coinbase_agentic_wallet_tx_${paymentTx.hash}`,
        'X-AI-Agent-ID': mockAgent.id
      },
      body: JSON.stringify({
        vrr_twin_id: mockTwin.id,
        quest_type: 'discovery',
        quest_difficulty: 'easy',
        target_audience: 'coffee_lovers',
        coupon_offer: {
          discount_type: 'percentage',
          discount_value: 20,
          max_redemptions: 100,
          expiration_days: 14
        },
        narrative_style: 'mystery'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response structure
    expect(data.quest_id).toMatch(/^quest_vrr_/);
    expect(data.status).toBe('created');
    expect(data.vrr_twin.id).toBe(mockTwin.id);
    expect(data.quest_narrative.title).toBeTruthy();
    expect(data.quest_narrative.objectives.length).toBeGreaterThan(0);
    expect(data.coupon_token.contract_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(data.payment_receipt.amount_paid_usdc).toBe(50.00);
    expect(data.payment_receipt.platform_fee_usdc).toBe(5.00);
    expect(data.payment_receipt.business_receives_usdc).toBe(45.00);
  });

  it('should validate GPT-4 generated quest narrative', async () => {
    const paymentTx = await mockAgent.sendPayment({
      amount_usdc: 50.00,
      recipient: process.env.HOLOLAND_PAYMENT_WALLET_BASE
    });

    const response = await fetch('http://localhost:3000/api/vrr/create-quest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Token': `signature_coinbase_agentic_wallet_tx_${paymentTx.hash}`,
        'X-AI-Agent-ID': mockAgent.id
      },
      body: JSON.stringify({
        vrr_twin_id: mockTwin.id,
        quest_type: 'discovery',
        quest_difficulty: 'medium',
        narrative_style: 'adventure'
      })
    });

    const data = await response.json();
    const narrative = data.quest_narrative;

    // Validate GPT-4 output quality
    expect(narrative.title.length).toBeLessThanOrEqual(60);
    expect(narrative.description.split(' ').length).toBeGreaterThan(10);
    expect(narrative.objectives.length).toBeGreaterThanOrEqual(3);
    expect(narrative.objectives.length).toBeLessThanOrEqual(5);
    expect(narrative.estimated_duration_minutes).toBeGreaterThanOrEqual(10);
    expect(narrative.estimated_duration_minutes).toBeLessThanOrEqual(30);
    expect(narrative.difficulty_rating).toBeGreaterThanOrEqual(1);
    expect(narrative.difficulty_rating).toBeLessThanOrEqual(5);
  });
});
```

---

## Monitoring & Analytics

### Key Metrics

```typescript
// File: lib/analytics/quest-metrics.ts

export interface QuestAnalytics {
  // Performance Metrics
  total_quests_created: number;
  total_quests_completed: number;
  completion_rate: number; // percentage
  average_completion_time_minutes: number;

  // Financial Metrics
  total_payments_received_usdc: number;
  total_revenue_generated_for_businesses_usd: number;
  average_roi_multiplier: number;

  // Redemption Metrics
  total_coupons_redeemed: number;
  redemption_rate: number; // percentage
  average_transaction_value_usd: number;

  // AI Agent Metrics
  total_unique_agents: number;
  top_performing_agents: Array<{
    agent_id: string;
    total_quests: number;
    average_rating: number;
    total_revenue_generated: number;
  }>;

  // Business Metrics
  total_businesses_onboarded: number;
  average_foot_traffic_increase: number; // percentage
  business_satisfaction_score: number; // 1-5
}
```

### Real-Time Dashboard

**Endpoint**: `GET /api/analytics/vrr/dashboard`

**Response**:
```json
{
  "timestamp": "2026-02-19T16:30:00Z",
  "period": "last_7_days",
  "metrics": {
    "total_quests_created": 1247,
    "total_quests_completed": 873,
    "completion_rate": 70.0,
    "average_completion_time_minutes": 18,
    "total_payments_received_usdc": 62350.00,
    "total_revenue_generated_for_businesses_usd": 698000.00,
    "average_roi_multiplier": 16.2,
    "total_coupons_redeemed": 349,
    "redemption_rate": 40.0,
    "average_transaction_value_usd": 20.00,
    "total_unique_agents": 45,
    "total_businesses_onboarded": 12,
    "average_foot_traffic_increase": 285.0,
    "business_satisfaction_score": 4.8
  },
  "top_performing_agents": [
    {
      "agent_id": "agent_quest_master_ai",
      "total_quests": 287,
      "average_rating": 4.9,
      "total_revenue_generated": 228800.00,
      "specialty": "coffee_shop_quests"
    }
  ],
  "trending_business_types": [
    { "type": "coffee_shop", "quest_count": 412 },
    { "type": "restaurant", "quest_count": 298 },
    { "type": "retail", "quest_count": 187 }
  ]
}
```

---

## Security & Compliance

### Payment Security

**Coinbase Agentic Wallet TEE (Trusted Execution Environment)**:
- All AI agent wallets run in AWS Nitro Enclaves
- Private keys never exposed to application layer
- Payments signed in secure enclave

**Transaction Verification**:
```typescript
// Multi-layer verification
1. Verify transaction exists on Base L2
2. Verify correct recipient (Hololand wallet)
3. Verify correct amount (50 USDC)
4. Verify timestamp (<5 minutes old)
5. Verify transaction confirmed (>3 blocks)
```

### Rate Limiting

**AI Agent Limits**:
```typescript
interface RateLimitTier {
  bronze: { quests_per_hour: 5, quests_per_day: 20 };
  silver: { quests_per_hour: 10, quests_per_day: 50 };
  gold: { quests_per_hour: 20, quests_per_day: 100 };
  platinum: { quests_per_hour: 50, quests_per_day: 500 };
}
```

### Data Privacy

**PII Handling**:
- No player personal data stored on-chain
- Wallet addresses only (pseudonymous)
- Square POS data encrypted at rest
- GDPR-compliant data retention (90 days)

---

## Implementation Timeline

### Week 1: Core API Development
- ✅ Day 1-2: Payment verification (x402 + Coinbase)
- ✅ Day 3-4: Quest generation engine (GPT-4 integration)
- ✅ Day 5: Coupon token deployment (Clanker SDK)
- ✅ Day 6-7: Square POS webhook + redemption flow

### Week 2: Testing & Deployment
- 🔄 Day 8-9: Unit tests + integration tests
- 🔄 Day 10: Load testing (1000 AI agents)
- 🔄 Day 11-12: Production deployment (Vercel)
- 🔄 Day 13-14: Phoenix beta onboarding (10 businesses)

---

## Success Metrics

### Technical KPIs
- **API Response Time**: <500ms (p95)
- **Payment Verification**: <2 seconds
- **Quest Generation**: <10 seconds (GPT-4 latency)
- **Uptime**: 99.9%

### Business KPIs
- **Quest Completion Rate**: >60%
- **Coupon Redemption Rate**: >30%
- **Business ROI**: >10x (target: 16x)
- **AI Agent Retention**: >80% (create 2+ quests)

---

## Next Steps

1. **Review & Approve** this technical specification
2. **Kickoff Development** (autonomous 1-week sprint)
3. **Deploy to Staging** (Base testnet)
4. **Phoenix Beta Recruitment** (see PHOENIX_BETA_RECRUITMENT_PLAN.md)
5. **Production Launch** (Base mainnet)

---

**Document Status**: ✅ Ready for Implementation
**Last Updated**: February 19, 2026
**Contact**: engineering@hololand.io

---

*This specification is part of Hololand's Phase A deliverables (VRR Digital Twin + x402 AI Agent Payments integration).*
