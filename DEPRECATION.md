# Deprecation Notice

This document lists deprecated features, files, and APIs in the Hololand ecosystem.

**Last Updated:** January 21, 2026

---

## File Extensions

| Deprecated | Replacement | Status | Notes |
|------------|-------------|--------|-------|
| `.holo` | `.hsplus` | ⚠️ Legacy (supported) | Use `.hsplus` for all new projects. `.holo` remains for tutorials only. |

---

## Packages & Paths

| Deprecated Reference | Correct Path | Notes |
|---------------------|--------------|-------|
| `packages/holoscript` | `@holoscript/core` (external) | HoloScript is now in a separate MIT-licensed repo |
| `packages/holoscript-core` | `@holoscript/core` (external) | Same as above |
| `packages/compiler` | `@holoscript/core` | Compiler is bundled in holoscript core |

---

## Models & AI

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `mistralai/Mistral-7B-Instruct-v0.1` | `mistralai/Mistral-7B-Instruct-v0.3` | Newer version with improvements |
| `gpt-4-turbo` | `gpt-4o` | Faster and cheaper |
| `claude-3-opus-20240229` | `claude-3-5-sonnet-20241022` | Better performance/cost ratio |
| OpenAI fine-tuned models | Local Ollama models | See `brittney-service/CLEANUP_REMOVE_OPENAI_MODELS.md` |

### Removed OpenAI Model IDs

The following OpenAI fine-tuned model IDs have been deprecated in favor of local inference:

```
ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4
ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CztIyJkK
```

**Reason:** Cost reduction and privacy - all inference now runs locally via Ollama.

---

## APIs

| Deprecated | Replacement | Version Removed |
|------------|-------------|-----------------|
| `HololandAgentBridge.perception` | Coming soon | - |
| Direct OpenAI API calls | `@hololand/brittney-toolkit` | v1.0.0 |

---

## Configuration

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `OPENAI_API_KEY` for Brittney | `OLLAMA_URL` | Brittney now runs locally |
| `TOGETHER_API_KEY` for inference | `OLLAMA_URL` | Local inference preferred |

---

## Files Marked for Removal

The following files are scheduled for removal in future versions:

| File | Status | Reason |
|------|--------|--------|
| `demo.holo` | Removed | Replaced by `demo.hsplus` |
| `*.holo` example files | Migrated | All converted to `.hsplus` |
| `packages/brittney-service/src/cloud-provider.ts` | Under review | May be removed if local-only |

---

## Migration Guide

### From `.holo` to `.hsplus`

1. Rename file from `example.holo` to `example.hsplus`
2. Add necessary imports at the top
3. Update any references in your codebase

### From OpenAI to Local Inference

1. Install Ollama: `winget install Ollama.Ollama`
2. Pull Brittney model: `ollama pull brittney:latest`
3. Update environment: Remove `OPENAI_API_KEY`, add `OLLAMA_URL=http://localhost:11434`
4. No code changes required - `@hololand/brittney-toolkit` handles routing

---

## Questions?

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to report issues with deprecated features.
