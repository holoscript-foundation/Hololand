# Copilot -- Hololand

> **NORTH STAR**: `NORTH_STAR.md` (this repo) + `~/.ai-ecosystem/NORTH_STAR.md` for ecosystem decision trees.
> **GOLD VAULT**: `D:/GOLD/` when mounted -- graduated knowledge overrides knowledge store.
> **STATUS**: HoloLand is the platform/product surface that fully utilizes HoloScript. Build canonical gaps in HoloScript first, then consume them here.

## Role
HoloLand platform/product experience. Brittney agent system. HoloScript-powered worlds, agents, creator flows, and runtime validation.

## Rules
- Do NOT add TypeScript-only product behavior as canonical implementation.
- Build HoloLand gaps in HoloScript first, then consume those capabilities here.
- Brittney agent system is product-critical; document its HoloScript boundary when changing it.
- Don't break existing deployments.
- Read `docs/AGENT_HOLOSCRIPT_TOOLING.md` before editing behavior.
- Follow `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`: feature-domain TypeScript changes need matching `.holo`, `.hs`, or `.hsplus`, unless the change is explicitly bridge-only.
- Prefer HoloScript MCP/Absorb workflows for generation, validation, compilation, graph search, and impact analysis.
- Stage explicitly: `git add <file>`, never `git add -A`

## Agent Tooling Checklist

- Use HoloScript as source of reality; HoloLand is the platform experience shell.
- Validate generated `.holo`, `.hs`, and `.hsplus` before claiming they work.
- Keep TypeScript changes scoped to runtime bridges, platform APIs, tests, tools, and critical fixes.
- Leave unrelated dirty worktree changes untouched.
