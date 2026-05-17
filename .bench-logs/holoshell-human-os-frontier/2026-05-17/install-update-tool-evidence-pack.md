# HoloShell Install/Update Tool Custody Evidence Pack

Date: 2026-05-17

## Workflow Explored

Human job: "Install or update the creative/dev tool I need for HoloLand world work, verify it works, and show what changed."

Selected workflow: update Blender as a representative HoloLand creator/world-building tool. This extends the flagship readiness scenario because a machine cannot be "ready to build a HoloLand world" if the local creative/dev tools are stale, missing, broken, or mutated by hidden package-manager behavior.

## Candidate Comparison

| Candidate | Human determinism | Non-dev clarity | Hardware reality | AI containment | Source native | Multi-agent | Replay | HoloLand embodiment | Taskability | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flagship readiness rerun | 8 | 7 | 9 | 8 | 8 | 8 | 6 | 7 | 9 | 70 |
| Account task custody continuation | 9 | 9 | 9 | 10 | 8 | 10 | 8 | 9 | 9 | 81 |
| Install/update tool custody | 9 | 9 | 10 | 6 | 8 | 8 | 7 | 9 | 10 | 76 |

Selected despite lower AI containment because the live run exposed a real break-glass gap: package-manager "upgrade" is not a plan operation.

## Hidden Platform Machinery

- OS/runtime: Windows package registry, Start Menu entries, Program Files, UAC/elevation, MSI installer state, PATH/app paths, running process locks.
- Files/state: old and new application directories, installer cache, HoloShell `.tmp` receipts, `.bench-logs` evidence, program registry output.
- Apps/services: winget, MSI installer, Blender launcher/binary, Chrome/browser hardware audit, PowerShell, HoloShell scripts.
- Accounts/permissions: non-admin shell, admin elevation prompt, package source agreements, local user session.
- Commands/agents: Codex hardware executed preflight and verification; HoloShell should own installer custody; HoloScript should own reusable package mutation receipt validation.
- Devices/hardware: local disk, network, GPU/browser surface, CPU/RAM/process health.
- Runtime state this run: network normal/unmetered, C drive about 109 GB free, user not administrator, HoloShell readiness warn, process health warn.

## Live Incident

The command `winget upgrade --name Blender --accept-source-agreements` was intended as package update exploration but crossed into actual mutation:

- Found `BlenderFoundation.Blender` current `5.0.1`, available `5.1.1`.
- Downloaded the Blender `5.1.1` MSI.
- Verified installer hash.
- Uninstalled the old version.
- Requested administrator elevation.
- Completed install.

Post-run verification:

- `winget list --name Blender --accept-source-agreements` reports `BlenderFoundation.Blender` version `5.1.1`.
- `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe` exists.
- `C:\Program Files\Blender Foundation\Blender 5.0\blender-launcher.exe` no longer exists.
- `blender.exe --version` reports `Blender 5.1.1`.

This is a concrete HoloShell product lesson: package install/update commands are break-glass unless a HoloShell adapter proves they are read-only.

## `.holo` Concept

Prototype: `experiments/holoshell-human-os-frontier/install-update-tool-room.holo`

Visible room:

- Tool Identity Gate: package id, publisher, source, current version, available version, installer type.
- Machine Preflight: disk, network metering, admin/elevation, running conflicts, build/process custody.
- Change Plan: download, uninstall, install, Start Menu, PATH/app path, registry/file association changes.
- Approval And Rollback: exact approval packet plus rollback limits and reinstall/portable fallback.
- Launch Verification: binary exists, version command passes, program registry updated, HoloLand tool-ready token.

## `.hsplus` Concept

Prototype: `experiments/holoshell-human-os-frontier/install-update-tool-policy.hsplus`

Policy and state machine:

- `ReadOnlyInventory`: list installed packages, check versions, check disk/network/admin, check conflicts, stage plan.
- `GuardedLaunchVerification`: open installed app, run version command, write local receipt, file HoloMesh task.
- `BreakGlassPackageMutation`: download, install, upgrade, uninstall, PATH/registry/file association, admin prompt, driver install, reboot.
- `InstallUpdateWorkflow`: idle -> inventoried -> preflighted -> planned -> approval_required -> approved -> mutating -> installed -> verified -> filed|blocked.

## `.hs` Concept

Prototype: `experiments/holoshell-human-os-frontier/install-update-tool-pipeline.hs`

Data flow:

- Reads package inventory, machine preflight, approval, mutation, and launch verification receipts.
- Validates package identity, preflight, mutation approval, and launch verification contracts.
- Emits human explanation cards, rollback warnings, evidence pack, and task seeds.
- Replay requires package id, source, from/to version, installer hash or transaction id, approval id/nonce, and launch verification hash.

## Multi-Agent Hardware Orchestration

- Codex hardware: local package-manager execution, disk/network/admin/process preflight, binary/version verification.
- HoloShell policy agent: permission classification, approval packet, rollback limit, human explanation.
- HoloScript substrate agent: reusable package mutation receipt primitive, StdlibPolicy gap, validator and CLI/MCP adapter.
- HoloLand product agent: install/update room, tool-ready token, creator-world readiness loop.
- Browser/Gemini witness: optional visible launch or GPU/world-builder render witness after installation.
- HoloMesh: task filing and team-visible installer gotcha.

HoloShell makes the work legible by turning every backstage installer phase into a visible timeline object instead of a spinner, console stream, or hidden UAC prompt.

## Evidence Read

- `C:/Users/josep/.ai-ecosystem/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOLAND_PURPOSE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_SOVEREIGN_TOOLS.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/README.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/HARDWARE_PROGRAM_CONTROL.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/TRUSTED_AUTONOMY_LADDER.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/OPERATING_TURN.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/MCP_CUSTODY_SNAPSHOT_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/CODEBASE_STATUS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/AGENTS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/NORTH_STAR.md`
- Prior `.bench-logs/holoshell-human-os-frontier/2026-05-14`, `2026-05-15`, and `2026-05-16` artifacts.

## Commands And Tooling

- HoloMesh heartbeat: `node C:/Users/josep/.ai-ecosystem/hooks/team-connect.mjs --once --name=codex --ide=hardware`.
- HoloScript trait suggestion: `pnpm exec holoscript suggest "HoloShell package install update custody room..."` -> suggested `@glowing`, `@networked`, `@portal`.
- HoloScript MCP codebase calls: attempted `holo_graph_status` and `holo_ask_codebase`; both returned `401 Unauthorized`, so local docs/source reads were primary.
- Hardware audit: `node scripts/hardware-audit.mjs --json --self-test` -> pass; Node `v24.15.0`, pnpm `10.28.2`, WASM SIMD pass, browser WebGPU API pass, browser WebGPU adapter warn, browser WebXR API pass.
- Operator brief: `pnpm run holoshell:operator-brief` -> `legacy_absorption_ready`; readiness `warn`; visual witness `pass`; destructive actions false.
- Program registry: `node scripts/holoshell-action-executor.mjs --action list_programs --json` -> 187 launchable programs; creative tools included Blender and Figma before the upgrade.
- Network: `node scripts/holoshell-network-reality.mjs --self-test` -> normal/unmetered, HoloScript contract pass, package install allowed with receipts.
- Process health: `node scripts/holoshell-process-health.mjs --self-test` -> warn; 536 processes; 65 shell/dev runs; 23 owner-unknown review; 12 cleanup stop plans.
- Package/version probes: `node -v`, `pnpm -v`, `npm -v`, `git --version`, `winget --version`, `choco -v`; Scoop not found.
- Disk/admin probes: `Get-PSDrive -PSProvider FileSystem`; user shell was not administrator.
- Package manager: `winget list --name Blender --accept-source-agreements`, then accidental mutation with `winget upgrade --name Blender --accept-source-agreements`.
- Launch verification: `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe --version` -> Blender `5.1.1`.

## Runtime Evidence

- Hardware receipt: `.tmp/hardware-receipts/hardware-receipt-2026-05-17T080853Z.json`
- Operator brief: `.tmp/holoshell/operator-brief.json`
- Network reality: `.tmp/holoshell/network-reality.json`
- Process health: `.tmp/holoshell/process-health.json`
- Program registry/action receipt: `.tmp/holoshell/action-receipts/hwa-mp9hu8ou-451e65c214.json`
- Run wrapper self-test receipt: `.tmp/holoshell/self-test-run-receipts/run-mp9hu8pt-bb5c1922ef5a3766.json`

## Scorecard

| Dimension | Score | Rationale |
| --- | ---: | --- |
| Human determinism | 9 | The desired wrapper can make every installer phase visible; raw winget proved why this is needed. |
| Non-developer clarity | 9 | Tool identity, preflight, change plan, approval, rollback, and ready token are plain concepts. |
| Hardware reality | 10 | Real package update, disk/admin/network/process/version probes were run locally. |
| AI containment | 6 | This run accidentally mutated the machine; containment gap is now concrete. |
| HoloScript source nativeness | 8 | `.holo`, `.hsplus`, and `.hs` prototypes exist; upstream primitive still missing. |
| Multi-agent value | 8 | Hardware, source, product, browser witness, and HoloMesh each have distinct responsibilities. |
| Reversibility/replay | 7 | Version and binary proof exists; rollback is still package-manager/vendor dependent. |
| HoloLand embodiment | 9 | Strong fit as a creator readiness room/tool-ready quest token. |
| Taskability | 10 | Three concrete gap tasks were generated with evidence and owner surfaces. |

## Gaps Found

1. Package-manager exploration is unsafe without a HoloShell package custody adapter. `winget upgrade` did not merely plan; it downloaded, uninstalled, elevated, and installed.
2. HoloShell hardware control classifies install/uninstall as break-glass, but there is no dedicated installer room or receipt validator that forces package id, installer hash/transaction id, admin prompt, rollback limits, and launch verification.
3. HoloScript needs reusable package mutation receipt semantics across winget, choco, npm, pnpm, pip, installers, app stores, and OS elevation.
4. HoloScript MCP codebase intelligence returned 401 from this surface, so the run fell back to local docs/source despite the instruction preference for semantic/codebase tools.
5. HoloLand and HoloScript worktrees were already dirty; no unrelated changes were touched.

## Tasks Filed

Task seed file: `.bench-logs/holoshell-human-os-frontier/2026-05-17/install-update-tool-holomesh-tasks.json`

Live HoloMesh task filing succeeded:

- `task_1779005981567_ml7c`: `[holoshell][installer] Add package custody preflight wrapper`
- `task_1779005981567_5ood`: `[holoshell][installer] Render admin prompts and rollback limits`
- `task_1779005981567_ikka`: `[holoscript][stdlib] Add package mutation receipt validator`

## HoloScript Upstream Recommendations

- Add reusable primitives: `PackageIdentity`, `PackageSource`, `PackageMutationPlan`, `PackageMutationReceipt`, `ElevationBoundary`, `PathMutationReceipt`, `RollbackLimit`, and `LaunchVerificationReceipt`.
- Extend StdlibPolicy with package-manager/elevation permissions, separate from generic `allowProcessExec`.
- Add a validator that rejects package mutation receipts missing package id, source, from/to version, installer hash or package-manager transaction id, disk/network/admin preflight, approval id/nonce, rollback limit, and launch verification.
- Add CLI/MCP adapter support for read-only package-manager planning where the underlying tool supports it, and explicit "not truly dry-run" receipts where it does not.

## HoloLand Adoption Recommendations

- Add "Tool Ready Room" as a HoloShell creator-readiness surface.
- Render local creative/dev tools as world objects with status: missing, stale, updating, blocked on admin, installed, verified, rollback-limited.
- Convert verified tools into HoloLand creator quest tokens: "Blender ready", "Figma ready", "Node/pnpm ready", "Git ready".
- Make failed/unsafe package commands replayable lessons inside HoloShell so non-technical users see why approval gates exist.

## Next Workflow

Push "Turn a folder of local assets into a playable HoloLand shard." The toolchain is now more current, and the next hidden-complexity cluster is file classification, asset conversion, source generation, preview, validation receipts, and rollback.
