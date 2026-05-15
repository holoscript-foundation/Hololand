# Brittney Models & Deployment

How Brittney inference is wired in HoloLand. Verified against on-disk source
2026-05-11. For the broader Brittney role/ownership picture, see
[BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) and
[BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md).

## Two deployment paths

HoloLand has two live deployment paths and one deprecated one.

| Path | Package | Use case |
|---|---|---|
| **Bundled local model** | [`@hololand/brittney-toolkit`](../packages/brittney/toolkit) | Embed Brittney in HoloLand apps with no API key. Ships a chat widget, local + cloud inference modes, and a setup CLI (`brittney-setup`). |
| **Unified inference layer** | [`@hololand/inference`](../packages/shared/inference) | Server-side and downstream-package inference. Local (Ollama) + BYOK cloud providers under one client. |
| **(deprecated)** Standalone Express server | [`@hololand/brittney-service`](../packages/brittney/service) | Old port-11435 server. Marked `deprecated` in its `package.json`; do not use for new integrations. |

## Sovereignty Rule

Brittney is allowed to have managed cloud surfaces, but the architecture must
not make managed cloud the only viable access path. Local GGUF, local/LAN
Ollama, BYOK cloud providers, HoloScript CLI access, and HoloLand in-world
access are first-class deployment modes.

Use managed cloud for convenience, scale, or premium uptime. Use local and
self-hosted paths for privacy, offline use, user ownership, modding, world
stewards, NPCs, and AGI experiments that need receipts without platform lock-in.
Any new Brittney feature should state which of these modes it supports and why
the unsupported modes are not required yet.

The model-file lifecycle (registry, checksums, downloader CLI) is owned by
[`@hololand/brittney-models`](../packages/brittney/models) — see
[`packages/brittney/models/src/registry.ts`](../packages/brittney/models/src/registry.ts)
for the live list and
[`packages/brittney/models/bin/download.mjs`](../packages/brittney/models/bin/download.mjs)
for the CLI. Do not enumerate models here; the registry is the source of
truth.

## Bundled local model (toolkit)

`@hololand/brittney-toolkit` is the path for embedding Brittney in
applications that need an offline-capable assistant. Source:
[`packages/brittney/toolkit/src/inference/BrittneyEngine.ts`](../packages/brittney/toolkit/src/inference/BrittneyEngine.ts).

```typescript
import { BrittneyEngine } from '@hololand/brittney-toolkit';

const engine = new BrittneyEngine({ mode: 'local' });
await engine.initialize();
const result = await engine.generate({ prompt: 'Build a medieval castle' });
```

Modes are `local` (bundled GGUF via local inference) and a cloud mode that
delegates to [`CloudInference.ts`](../packages/brittney/toolkit/src/inference/CloudInference.ts).
Model selection comes from
[`modelConfig.ts`](../packages/brittney/toolkit/src/inference/modelConfig.ts);
the chat widget surface is
[`packages/brittney/toolkit/src/chat/ChatWidget.ts`](../packages/brittney/toolkit/src/chat/ChatWidget.ts).

The setup binary (`brittney-setup`) handles first-run provisioning.

## Unified inference layer

`@hololand/inference` is the server-side / downstream-package path. It
unifies local Ollama with BYOK cloud providers under one client. See
[`packages/shared/inference/src/client.ts`](../packages/shared/inference/src/client.ts)
and the providers under
[`packages/shared/inference/src/providers/`](../packages/shared/inference/src/providers/).
Provider names ship in the source tree, not pinned here — list with
`ls packages/shared/inference/src/providers/` rather than trusting a
hardcoded count.

`@hololand/brittney-service` (legacy) used to expose this surface as an
HTTP server on port 11435; that path is deprecated in favor of running
Ollama directly on port 11434 and consuming `@hololand/inference` from
each downstream package.

## Configuration

Cloud-provider keys (when used at all) are typed in
[`packages/brittney/service/src/config.ts`](../packages/brittney/service/src/config.ts)
and read from environment variables with a `~/.hololand/config.json`
fallback. The same shape is the reference contract for the inference layer's
BYOK mode. Examples:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

## Removed surfaces

- `apps/brittney-desktop` and `apps/brittney-mobile` are deleted in the
  current dirty worktree (see
  [audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
  § Dirty Worktree Decisions). Anything documented as "Tauri/Capacitor app
  shipping the bundled model" in older docs no longer corresponds to a
  shipping HoloLand surface; the bundled-model path is the toolkit, not a
  first-party desktop/mobile app.
- The OpenAI fine-tune model IDs that earlier versions of this doc listed
  (`ft:gpt-4o-mini-...:brittney:*`) are not visible in current source under
  `packages/brittney/`. Any model the runtime actually selects today comes
  from the registry above and the configured provider keys; OpenAI fine-tune
  IDs should not be carried as canonical without disk evidence.

## Build

```bash
pnpm --filter @hololand/brittney-toolkit build
pnpm --filter @hololand/inference build
pnpm --filter @hololand/brittney-models build
```

## See also

- [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md)
- [BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md)
- [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) —
  `packages/brittney/**` is in scope; gameplay/runtime behavior must have
  HoloScript source.
