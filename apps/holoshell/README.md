# HoloShell

HoloShell is the HoloLand surface for people who do not want to manage the
computer through files, windows, commands, IDEs, or settings panels.

It turns the local machine into a HoloScript-operated environment:

- HoloScript defines capability, permission, receipt, and runtime semantics.
- HoloLand renders the non-developer operating surface.
- HoloMesh coordinates agents and team state.
- Legacy apps become wrapped capability objects.
- Local hardware proof decides what is actually available.

## Why This Lives In HoloLand

Studio is for creator direction. HoloShell is for everyone else.

HoloShell belongs in HoloLand because it is a lived product surface: a desktop,
mobile, VR, and AR way to operate the world and the local computer without
thinking like a developer.

Reusable primitives should move upstream to HoloScript. Product experience stays
here.

## Source Of Truth

The initial source artifact is:

```text
source/holoshell-home.hsplus
```

Do not add hand-authored TypeScript behavior before the HoloScript source
contract is named. Future desktop bridge code should be generated, upstreamed,
or explicitly marked as bridge-only migration debt.

## First Slice

Slice 0 is the Local Capability Room:

- Calm system pulse.
- Hardware proof.
- Capability map.
- Legacy app gallery.
- Agent operator lane.
- Trust and receipt timeline.
- Break-glass approval lane.

The user gives an outcome. HoloShell shows which agent is acting, which
capability is being used, what risk exists, and what receipt proves the result.

## Current Artifacts

```text
source/holoshell-home.hsplus
schemas/capability-inventory.schema.json
samples/capability-inventory.sample.json
docs/LEGACY_ABSORPTION_ARCHETYPES.md
prototype/local-capability-room.html
```

## Local Checks

From the HoloScript repo:

```powershell
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-home.hsplus
```

From the HoloLand repo:

```powershell
node scripts\holoshell-capability-inventory.mjs --no-hardware-audit --redact-private --self-test
node scripts\holoshell-capability-inventory.mjs --self-test
```

The script writes local discovery output to `.tmp/holoshell/`, which is ignored.
Do not commit unredacted local inventories.

## Visual Projection

Open the static projection when a quick non-developer surface check is useful:

```text
apps/holoshell/prototype/local-capability-room.html
```

The prototype is a visual projection of `source/holoshell-home.hsplus`, not the
canonical behavior layer.

## Related Spec

See:

```text
docs/specs/HOLOSHELL_HARDWARE_NATIVE_SURFACE.md
```
