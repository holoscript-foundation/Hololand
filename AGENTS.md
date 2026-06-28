# AGENTS.md -- HoloLand

This file is the Codex/open-agent entrypoint for the HoloLand repository.

## Read First

1. `NORTH_STAR.md`
2. `docs/AGENT_HOLOSCRIPT_TOOLING.md`
3. `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
4. `docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md` when product direction matters

## Operating Posture

HoloLand is the platform/product surface that fully utilizes HoloScript. HoloScript is the upstream source of truth for language, traits, compilers, validation, runtime primitives, and world semantics.

Do not add product behavior here as a TypeScript-only canonical implementation. New world/gameplay/VR capability should be defined in HoloScript first, then consumed by HoloLand as the lived platform experience.

## Agent Rule

Before editing HoloLand code, use the HoloScript workflow in `docs/AGENT_HOLOSCRIPT_TOOLING.md`:

- classify the task
- search/read the local code
- use HoloScript MCP/Absorb tooling when available
- validate `.holo`, `.hs`, and `.hsplus` with HoloScript tools
- keep TypeScript feature work bridge-only unless accompanied by HoloScript source

## Git Hygiene

- The repo may be dirty. Do not revert changes you did not make.
- Stage explicit files only. Never use `git add -A`.
- This repo is under `github.com/holoscript-foundation`; `git push` must use
  the HoloKey Classic Token credential path, not an arbitrary active `gh`
  account token. If API access reports admin but push returns 403, treat it as
  a Git credential mismatch. See
  `C:/Users/josep/.ai-ecosystem/docs/handbooks/github-org-token-auth.md`.
- Preserve existing deployments unless the user explicitly asks for a migration/removal.
