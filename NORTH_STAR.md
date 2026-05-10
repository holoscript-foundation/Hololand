# North Star -- HoloLand

**Role**: HoloLand is the platform/product surface that fully utilizes HoloScript. HoloScript is the source layer for canonical behavior.
**Upstream oracle**: `~/.ai-ecosystem/NORTH_STAR.md`
**Vault**: `D:/GOLD/` when mounted

## This project's rules

1. **Build gaps in HoloScript first.** HoloLand consumes HoloScript packages, schemas, traits, compilers, validation receipts, and runtime primitives.
2. **HoloLand proves the platform experience.** Product loops, worlds, creator flows, and agent embodiment belong here as consuming experiences, not as TypeScript-only source of truth.
3. **TypeScript is infrastructure.** Runtime bridges, hardware integration, tests, tools, and deployment glue may be TypeScript; player/world behavior needs `.holo`, `.hs`, or `.hsplus` source.
4. **Brittney is product-critical.** Agent orchestration logic may still be developed here when it is part of HoloLand's lived platform experience, but document the HoloScript boundary.
5. **Don't break existing deployments.** Someone might still be running this.
6. **Use HoloScript tools first.** Before changing behavior, read `docs/AGENT_HOLOSCRIPT_TOOLING.md` and `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`.

## What to check before asking the user

1. "Should I implement this in TypeScript only?" -- No. Define the product behavior in HoloScript first, then let HoloLand consume it.
2. Architecture question? Read `~/.ai-ecosystem/NORTH_STAR.md`
3. Agent/tooling question? Read `docs/AGENT_HOLOSCRIPT_TOOLING.md`
