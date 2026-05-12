# Tiered Chat Gameplan

Plan for the multi-tier Brittney chat surface in HoloLand: free local model,
HoloScript Cloud cost-tracked tier, BYOK orchestration, and Infinity-Assistant
enhanced model.

> **Status:** plan, partial wiring. The chat widget, model registry, and
> inference layer all ship today. The API-key store, tier routing, and the
> in-app settings UI are NOT shipped — that's the gap this plan closes.
> The original draft cited `@hololand/brittney-service`; that package is
> **deprecated** in favour of `@hololand/inference` (see [`BRITTNEY_CONTEXT.md`](../BRITTNEY_CONTEXT.md)).
> Treat any old `brittney-service`-routed instructions as migration debt.

## What ships today

| Surface | Source-of-truth file |
|---|---|
| Chat widget | [`packages/brittney/toolkit/src/chat/`](../../packages/brittney/toolkit/src/chat/) |
| Bundled local model + chat layout | [`packages/brittney/toolkit/src/`](../../packages/brittney/toolkit/src/) (`inference/`, `layout/`, `bin/`) |
| Inference client (unified provider layer) | [`packages/shared/inference/src/client.ts`](../../packages/shared/inference/src/client.ts) |
| Provider integrations | [`packages/shared/inference/src/providers/`](../../packages/shared/inference/src/providers/), [`packages/shared/inference/src/integrations/`](../../packages/shared/inference/src/integrations/) |
| Cost tracker | [`packages/shared/inference/src/cost-tracker.ts`](../../packages/shared/inference/src/cost-tracker.ts) |
| Inference public exports | [`packages/shared/inference/src/index.ts`](../../packages/shared/inference/src/index.ts) |
| NL → HoloScript translator | [`packages/brittney/ai-bridge/src/`](../../packages/brittney/ai-bridge/src/) |
| Premium MCP tool surface (Brittney tools the LLM can call) | [`packages/brittney/mcp-server/src/`](../../packages/brittney/mcp-server/src/) |
| Model registry + downloader | [`packages/brittney/models/src/registry.ts`](../../packages/brittney/models/src/registry.ts), [`packages/brittney/models/bin/download.mjs`](../../packages/brittney/models/bin/download.mjs) |

The deprecated path that the original draft routed through:
[`packages/brittney/service/package.json`](../../packages/brittney/service/package.json)
(`"deprecated": "This service (port 11435) is deprecated. Use @hololand/inference
with Ollama (port 11434) instead."`). Do not target `@hololand/brittney-service`
in new work.

## Tiers

| Tier | What the user gets | Where it routes |
|---|---|---|
| Free (local) | Bundled local model, all manual studio tools, marketplace publishing (revenue share). | `@hololand/brittney-toolkit`'s bundled model surface. |
| Cloud tokens (pay-per-token) | Cloud Brittney via HoloScript Cloud (vision-capable model, priority queue). | Cloud provider through `@hololand/inference`. |
| Pro subscription | Vision model, priority processing, reduced marketplace commission. | `@hololand/inference` with Pro entitlement. |
| BYOK | User's LLM (OpenAI / Anthropic / Google / etc.) + Brittney tools injected. | User-provided key through `@hololand/inference` provider; Brittney MCP tools attached on the request. |
| Infinity Assistant | Larger Brittney model accessed through an Infinity-Assistant API key. | IA provider through `@hololand/inference`. |

## Gap

| Gap | Where it lands |
|---|---|
| Encrypted local API-key store (per provider) | New `packages/shared/inference/src/api-key-store.ts` (or in toolkit if it ends up chat-only). |
| Provider auto-selection in inference router (no key → local; key → routed) | Update `packages/shared/inference/src/client.ts` (verify current router shape before editing). |
| Brittney-tool injection on BYOK requests | Wire `packages/brittney/mcp-server` exports into the inference call when a user-provided LLM is selected. |
| ChatWidget mode detection (basic / pro) | Update [`packages/brittney/toolkit/src/chat/`](../../packages/brittney/toolkit/src/chat/) — verify the current ChatWidget shape before changing the public surface. |
| In-app settings UI for keys | Lives in the consuming app (`examples/hololand-central/` or future `apps/hololand-app/`); the original draft assumed `apps/hololand-app/` exists — verify before scheduling. |

## API-key store contract (target)

```ts
interface APIKeyStore {
  setKey(provider: string, key: string): Promise<void>;
  getKey(provider: string): Promise<string | null>;
  removeKey(provider: string): Promise<void>;
  hasKey(provider: string): Promise<boolean>;
  getPreferredProvider(): Promise<string | null>;
  setPreferredProvider(provider: string): Promise<void>;
}
```

Constraints:

- **Keys never leave the device.** Encrypted at rest with a device-specific key.
- **Validate on save** — issue a small completion request to the provider; surface failure synchronously.
- **No logging** — provider keys must never appear in logs or telemetry.

## Routing contract (target)

```ts
async function routeChat(message, context) {
  const provider = await apiKeyStore.getPreferredProvider();

  if (!provider) {
    return localBrittney.generate(message, context);  // free tier
  }

  const key = await apiKeyStore.getKey(provider);

  if (provider === 'infinity-assistant') {
    return callInfinityAssistant(key, message, context);
  }

  return callUserLLM(provider, key, message, {
    tools: brittneyMCPTools,  // inject Brittney's MCP tool surface
    context,
  });
}
```

The actual implementation must mirror the live shape of
[`packages/shared/inference/src/client.ts`](../../packages/shared/inference/src/client.ts);
do not assume a hand-written router replaces what already exists.

## ChatWidget mode (target)

- `mode: 'basic' | 'pro' | 'auto'`. `auto` checks `apiKeyStore.hasKey(any)`.
- Header reflects active tier ("Brittney" / "Brittney Pro").
- Upgrade prompt rendered when basic capability is exceeded.

## Phases

1. **API-key store + validation** (no UI surface change).
2. **Inference router** consumes the key store + injects Brittney tools on BYOK.
3. **ChatWidget mode detection** + tier-aware header / upgrade prompt.
4. **Settings UI** in the consuming app (Central or future hololand-app).

Phase 3 + 4 can run in parallel after phase 2.

## Security

- AES-256-GCM with device-specific key for at-rest encryption.
- Test request before persisting (catches typos / wrong scopes).
- No keys in logs / metrics / sessions / telemetry.
- Clear-on-logout option.

## Testing

- Unit: encryption round-trip, router with-key vs without-key, tool injection
  when BYOK is active.
- Integration: basic flow (local), Pro flow (cloud), BYOK flow with each
  supported provider.
- E2E: add key, validate, route, remove key.

## Success criteria

- A user with no key can chat through bundled local Brittney.
- A user with a provider key gets that LLM + Brittney tool surface.
- Keys never leave the device.
- Mode toggle in ChatWidget reflects actual capability.

## Claims dropped

- **All `@hololand/brittney-service` routing** — package is deprecated; route
  through `@hololand/inference` instead.
- **`apps/hololand-app/src/pages/settings/api-keys.tsx`** — neither the
  `apps/hololand-app/` directory nor the cited path was verified on disk in
  this refresh. Settings UI placement is open.
- **`packages/brittney-toolkit/src/chat/ChatWidget.ts` exact path** — the live
  path is [`packages/brittney/toolkit/src/chat/`](../../packages/brittney/toolkit/src/chat/);
  the inner ChatWidget file shape may differ from the original draft. Verify
  before editing.

## See also

- [`BRITTNEY_CONTEXT.md`](../BRITTNEY_CONTEXT.md) — Brittney sub-package layout
  + the `@hololand/brittney-service` deprecation note.
- [`BRITTNEY_MODELS_DEPLOYMENT.md`](../BRITTNEY_MODELS_DEPLOYMENT.md) — model
  deployment paths.
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](../HOLOSCRIPT_SOURCE_CONTRACT.md) — chat
  product behaviour belongs in HoloScript when it describes runtime semantics;
  TS is acceptable for the bridge / settings layer.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](../audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  — Brittney sub-packages classified Keep.
