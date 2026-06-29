# HoloLand Twin Universe Vocabulary Sweep - 2026-06-29

## Scope

Follow-up from HoloLand commit `aa4d20b` (`refactor(ecosystem): rebrand twin
universe layer`). This pass audited non-active docs, research, archive, and
example references for Twin Earth wording and moved current prose to Twin
Universe vocabulary where it was not a compatibility identifier or historical
quote.

## Files Updated

- `docs/archive/HOLOLAND_HUB_AND_AR.md`
- `docs/audits/HOLOLAND_LEGACY_CLEANUP_PASS_2026-05-12.md`
- `docs/audits/HOLOLAND_REBOOT_RETIREMENT_PLAN_2026-06-29.md`
- `docs/audits/HOLOLAND_SUBSTRATE_DRIFT_POSTMORTEM_2026-05-12.md`
- `docs/protocols/agent-neural-map-loss-protocol.md`
- `docs/research/2026-05-12_d043-hololand-frontier-npc-lens.md`
- `docs/research/2026-05-13_hololand-tools-scope.md`
- `docs/research/README.md`

## Intentional Legacy References

The sweep preserves `Twin Earth`, `twin_earth`, `twin-earth`, and
`hololand_twin_earth_*` only when they are one of:

- a historical May 2026 task, incident, or research title,
- a compatibility/wire identifier in manifests, schemas, tools, or receipts,
- a legacy file path such as `research/2026-05-13_twin-earth-substrate-contract.md`,
- an archived concept whose original wording should remain visible.

Current HoloLand product copy should use Twin Universe. New source artifacts,
examples, room tasks, and receipts should avoid Twin Earth unless they are
explicitly documenting compatibility.

## Path Correction

The live example path is now:

```text
examples/twin-universe/first_playable_slice.holo
```

The previous `examples/twin-earth/first_playable_slice.holo` reference was
updated in `docs/protocols/agent-neural-map-loss-protocol.md`.

## Verification

Local checks run on 2026-06-29:

- `rg -n --glob 'docs/**' --glob 'examples/**' --glob '!docs/specs/*.schema.json' --glob '!docs/specs/*.json' "Twin Earth|TwinEarth|twin earth|twin_earth|twin-earth" .`
- `rg -n "examples/twin-earth|twin-earth/" docs examples`
- `git diff --check -- <changed-docs>`

Result: whitespace check passed. Remaining vocabulary hits are limited to the
legacy contexts named above plus the already-migrated compatibility note in
`docs/specs/HOLOLAND_SOVEREIGN_TOOLS.md`. The stale example-path check only
reports this receipt's explanation and command text, not a live protocol or
research dependency.
