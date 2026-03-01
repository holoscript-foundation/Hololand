# Tiered Chat Window - Implementation Game Plan

## Overview

Implement a tiered chat system for Hololand AI orchestrations.

**Free (email sign-up)**: Brittney AI + all manual tools + marketplace (revenue share) — everything works, sign up to try
**Cloud Tokens**: Pay-per-token Brittney usage via HoloScript Cloud — primary revenue driver
**Pro Subscription**: Vision model + priority processing + reduced marketplace commission
**BYOK**: User's own LLM key → Their LLM + Brittney tools for AI orchestrations in Hololand
**Infinity Assistant**: API key from Infinity Assistant → Bigger Brittney model

Users can:
- Sign up free (email) to use Brittney and all manual studio tools
- Pay per token for cloud Brittney usage (scene generation, code assistance, etc.)
- Publish and sell on the marketplace for free (HoloScript takes a revenue share commission)
- Subscribe to Pro for the vision model, priority processing, and reduced marketplace commission
- Bring their own LLM API key for building AI orchestrations in their Hololand setups (BYOK)
- Get an API key from Infinity Assistant (pay IA for access to bigger Brittney model)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOLOLAND PLATFORM                         │
│                                                              │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐            │
│  │  Basic    │    │ Pro (BYOK)│    │ Pro (IA)  │            │
│  │  No Key   │    │ User's LLM│    │ IA Key    │            │
│  │  Free     │    │ + Brittney│    │ Better    │            │
│  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘            │
│        │                │                │                   │
│        └────────────────┼────────────────┘                   │
│                         ▼                                    │
│             ┌───────────────────────┐                        │
│             │   ChatWidget.ts       │                        │
│             │   (mode: basic|pro)   │                        │
│             └───────────┬───────────┘                        │
│                         │                                    │
│                         ▼                                    │
│             ┌───────────────────────┐                        │
│             │   API Key Store       │  ← Stored locally      │
│             │   (encrypted)         │                        │
│             └───────────┬───────────┘                        │
└─────────────────────────┼───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Local       │  │ User's LLM      │  │ Infinity        │
│ Brittney    │  │ (OpenAI, etc)   │  │ Assistant API   │
│             │  │                 │  │                 │
│ - Free      │  │ + Brittney      │  │ - Better        │
│ - Limited   │  │   Tools         │  │   Brittney      │
└─────────────┘  └─────────────────┘  └─────────────────┘
```

**Key Points**:
- Infinity Assistant is ALSO a 2D builder (FREE onramp)
- Infinity Assistant API provides a better/enhanced Brittney model
- Users choose: free local, their own LLM, or Infinity Assistant API

---

## Current State (Audit Summary)

### Already Implemented

| Component | Location | Status |
|-----------|----------|--------|
| brittney-service | `packages/brittney-service/` | Local Brittney model |
| Model Router | `brittney-service/src/model-router.ts` | Multi-provider support |
| ChatWidget UI | `brittney-toolkit/src/chat/ChatWidget.ts` | Device-responsive |
| Brittney MCP Tools | `brittney-mcp/` | HoloScript generation |
| ai-bridge | `packages/ai-bridge/` | Natural language → HoloScript |

### Not Yet Implemented

| Component | Priority | Complexity |
|-----------|----------|------------|
| Local API Key Storage | HIGH | Medium |
| Chat Mode Switching | HIGH | Low |
| LLM Routing with Brittney Tools | HIGH | Medium |
| Settings UI for Keys | MEDIUM | Low |

---

## Implementation Tasks

### Phase 1: Local API Key Storage

**1.1 API Key Store Service**

Location: `packages/brittney-service/src/services/api-key-store.ts`

```typescript
interface APIKeyStore {
  // Store user's LLM keys locally (encrypted)
  // Providers: openai, anthropic, google, infinity-assistant
  setKey(provider: string, key: string): Promise<void>;
  getKey(provider: string): Promise<string | null>;
  removeKey(provider: string): Promise<void>;
  hasKey(provider: string): Promise<boolean>;
  getPreferredProvider(): Promise<string | null>;
  setPreferredProvider(provider: string): Promise<void>;
}
```

**1.2 Encryption**

- Encrypt keys at rest using device-specific key
- Keys never leave user's device
- Keys never sent to Hololand servers

**1.3 Key Validation**

- Test API call on save (small completion request)
- Show validation status in UI

### Phase 2: Chat Routing

**2.1 Update Model Router**

Location: `packages/brittney-service/src/model-router.ts`

```typescript
async function routeChat(message: string, context: ChatContext) {
  const provider = await apiKeyStore.getPreferredProvider();

  if (!provider) {
    // Basic tier: Local Brittney only
    return brittney.generate(message, context);
  }

  const key = await apiKeyStore.getKey(provider);

  if (provider === 'infinity-assistant') {
    // Pro tier (IA): Better Brittney via Infinity Assistant API
    return callInfinityAssistant(key, message, context);
  } else {
    // Pro tier (BYOK): User's LLM + Brittney tools
    return callUserLLM(provider, key, message, {
      tools: brittneyMCPTools,  // Inject Brittney capabilities
      context
    });
  }
}
```

**2.2 Brittney Tool Injection**

When using user's LLM, inject these tools:

- `brittney_generate_holoscript` - Generate HoloScript from description
- `brittney_validate_holoscript` - Check syntax
- `brittney_explain_scene` - Explain existing HoloScript
- `brittney_optimize_code` - Suggest improvements

### Phase 3: Frontend Chat Mode

**3.1 ChatWidget Mode Detection**

```typescript
// packages/brittney-toolkit/src/chat/ChatWidget.ts
interface ChatWidgetConfig {
  mode: 'basic' | 'pro' | 'auto';
  // auto = detect from API key presence
}

async function detectMode(): Promise<'basic' | 'pro'> {
  const hasKey = await apiKeyStore.hasKey(anyProvider);
  return hasKey ? 'pro' : 'basic';
}
```

**3.2 UI Differentiation**

| Feature | Basic | Pro (HoloScript Cloud) | Pro (BYOK Orchestration) | Pro (IA) |
|---------|-------|------------------------|--------------------------|----------|
| Header | "Brittney" | "Brittney Pro" | "Brittney Pro" | "Brittney Pro" |
| LLM Used | Local Brittney | HoloScript vision model | User's LLM + Brittney | Better Brittney |
| Use Case | Basic HoloScript | Character/avatar creation | AI orchestrations | Full planning |
| Context | Limited | Vision model context | User's LLM limit | Enhanced |
| Cost | Free | Pro subscription | User pays their LLM | User pays IA |

**3.3 Upgrade Prompt**

- Show when basic user needs more capability
- "Add your API key for full planning mode"
- Link to settings

### Phase 4: Settings UI

**4.1 API Key Settings Page**

Location: `apps/hololand-app/src/pages/settings/api-keys.tsx`

- Input fields for each provider (OpenAI, Anthropic, Google, Infinity Assistant)
- "Get key from Infinity Assistant" link for users who want enhanced Brittney
- Validation status indicator (green checkmark / red X)
- "Test Connection" button
- Current mode display (Basic / Pro)
- Provider selector (which key to use by default)
- Clear explanation: "Your keys stay on your device"

---

## File Changes Summary

### New Files

```
packages/brittney-service/src/services/api-key-store.ts
apps/hololand-app/src/pages/settings/api-keys.tsx
```

### Modified Files

```
packages/brittney-service/src/model-router.ts   # Add BYOK orchestration routing
packages/brittney-toolkit/src/chat/ChatWidget.ts  # Mode detection
```

---

## Security Considerations

1. **Keys Stay Local**: User's API keys never sent to Hololand servers
2. **Encrypted Storage**: AES-256-GCM with device-specific key
3. **Key Validation**: Test before storing (catches typos)
4. **No Logging**: Never log API keys
5. **Clear on Logout**: Option to clear keys when logging out

---

## Testing Plan

1. **Unit Tests**
   - API key encryption/decryption
   - Routing logic (no key vs has key)
   - Brittney tool injection

2. **Integration Tests**
   - Basic chat flow (Brittney only)
   - Pro chat flow (User's LLM + Brittney tools)
   - Mode switching in ChatWidget

3. **E2E Tests**
   - Add API key flow
   - Remove API key flow
   - Chat with different providers

---

## Implementation Order

| Phase | Focus | Dependencies |
|-------|-------|--------------|
| 1 | API Key Store | None |
| 2 | Chat Routing | Phase 1 |
| 3 | ChatWidget Mode | Phase 2 |
| 4 | Settings UI | Phase 1 |

Phases 3 and 4 can run in parallel after Phase 2.

---

## Success Metrics

- Basic users can generate HoloScript via local Brittney
- BYOK orchestration users get their LLM + Brittney tools for Hololand setups
- Keys are stored locally (encrypted, never sent to server)
- Upgrade path is clear: "Add your API key"
- Chat UI reflects current mode
