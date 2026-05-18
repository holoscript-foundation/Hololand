# HoloShell Source Map

This map groups HoloShell source contracts by user-facing capability. It exists
so agents and product surfaces do not have to rediscover the shape of
`apps/holoshell/source/` by raw file listing.

## Operating Shell

| Capability | Source |
| --- | --- |
| Shell behavior and permissions | `apps/holoshell/source/holoshell-home.hsplus` |
| Shell world graph | `apps/holoshell/source/holoshell-shell-world.holo` |
| Render slice | `apps/holoshell/source/holoshell-shell-render.hs` |
| User shell projection | `apps/holoshell/source/holoshell-user-shell-projection.hsplus` |
| Founder host | `apps/holoshell/source/holoshell-founder-host.hsplus` |
| Native wrapper | `apps/holoshell/source/holoshell-native-wrapper.hsplus` |
| Startup integration | `apps/holoshell/source/holoshell-startup-integration.hsplus` |
| Service supervisor | `apps/holoshell/source/holoshell-service-supervisor.hsplus` |

## World Build And Readiness

| Capability | Source |
| --- | --- |
| World-build cockpit room | `apps/holoshell/source/holoshell-world-build-cockpit.holo` |
| World-build cockpit policy | `apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus` |
| World-build cockpit pipeline | `apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs` |
| Readiness evidence | `apps/holoshell/source/holoshell-readiness-evidence.hsplus` |
| Build custody | `apps/holoshell/source/holoshell-build-custody.hsplus` |
| Source validation | `apps/holoshell/source/holoshell-source-validation.hsplus` |
| Visual witness | `apps/holoshell/source/holoshell-visual-witness.hsplus` |
| Receipt control | `apps/holoshell/source/holoshell-receipt-control.hsplus` |

## Hardware, Apps, And Network

| Capability | Source |
| --- | --- |
| Hardware control | `apps/holoshell/source/holoshell-hardware-control.hsplus` |
| Hardware reality bridge | `apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus` |
| Control daemon service | `apps/holoshell/source/holoshell-control-daemon-service.hsplus` |
| OS UI capture | `apps/holoshell/source/holoshell-os-ui-capture.hsplus` |
| Legacy app absorption | `apps/holoshell/source/holoshell-legacy-app-absorption.hsplus` |
| Legacy window inventory | `apps/holoshell/source/holoshell-legacy-window-inventory.hsplus` |
| Run custody actions | `apps/holoshell/source/holoshell-run-custody-actions.hsplus` |
| Process health | `apps/holoshell/source/holoshell-process-health-room.hsplus` |
| Network reality | `apps/holoshell/source/holoshell-network-reality.hsplus` |
| Network freshness watch | `apps/holoshell/source/holoshell-network-freshness-watch.hsplus` |
| Network change sentinel | `apps/holoshell/source/holoshell-network-change-sentinel.hsplus` |
| Network sentinel service | `apps/holoshell/source/holoshell-network-sentinel-service.hsplus` |
| Package custody | `apps/holoshell/source/holoshell-package-custody.hsplus` |

## Brittney And Agents

| Capability | Source |
| --- | --- |
| Brittney presence | `apps/holoshell/source/holoshell-brittney-presence.hsplus` |
| Brittney avatar | `apps/holoshell/source/holoshell-brittney-avatar.hsplus` |
| Brittney runtime bridge | `apps/holoshell/source/holoshell-brittney-runtime-bridge.hsplus` |
| Brittney context packet | `apps/holoshell/source/holoshell-brittney-context-packet.hsplus` |
| Brittney custody operator | `apps/holoshell/source/holoshell-brittney-custody-operator.hsplus` |
| Brittney environment coupling | `apps/holoshell/source/holoshell-brittney-environment-coupling.hsplus` |
| Brittney ambient tone | `apps/holoshell/source/holoshell-brittney-ambient-tone.hsplus` |
| Agent dispatch | `apps/holoshell/source/holoshell-agent-dispatch.hsplus` |
| Agent presence lanes | `apps/holoshell/source/holoshell-agent-presence-lanes.hsplus` |
| Grok build workflow | `apps/holoshell/source/holoshell-grok-build-workflow.hsplus` |
| Grok heartbeat | `apps/holoshell/source/holoshell-grok-heartbeat.hsplus` |

## HoloScript And Trust

| Capability | Source |
| --- | --- |
| HoloScript surface bridge | `apps/holoshell/source/holoshell-holoscript-bridge.hsplus` |
| HoloScript GOLD/codebase bridge | `apps/holoshell/source/holoshell-holoscript-gold-codebase-bridge.hsplus` |
| Wild HoloScript intake | `apps/holoshell/source/holoshell-wild-holoscript-intake.hsplus` |
| MCP custody contract | `apps/holoshell/source/holoshell-mcp-custody-contract.hsplus` |
| MCP upstream handoff | `apps/holoshell/source/holoshell-mcp-custody-upstream-handoff.hsplus` |
| Trusted autonomy | `apps/holoshell/source/holoshell-trusted-autonomy.hsplus` |
| Founder intent policy | `apps/holoshell/source/holoshell-founder-intent-policy.hsplus` |
| Founder command pipeline | `apps/holoshell/source/holoshell-founder-command-pipeline.hs` |
| Founder boot loop | `apps/holoshell/source/holoshell-founder-boot-loop.hsplus` |
| Founder-to-user strategy | `apps/holoshell/source/holoshell-founder-to-user-strategy.hsplus` |
| Account/task custody | `apps/holoshell/source/holoshell-account-task-custody.hsplus` |
| Operating turn | `apps/holoshell/source/holoshell-operating-turn.hsplus` |
| Operator brief | `apps/holoshell/source/holoshell-operator-brief.hsplus` |

## Product And Environment

| Capability | Source |
| --- | --- |
| Phase 1 workflows | `apps/holoshell/source/holoshell-phase1-workflows.hsplus` |
| Developmental environment | `apps/holoshell/source/holoshell-developmental-environment.hsplus` |
| Skin presets | `apps/holoshell/source/holoshell-skin-presets.hsplus` |
| Natural phenomena bridge | `apps/holoshell/source/holoshell-natural-phenomena-bridge.hsplus` |
| Asset shard workflow | `apps/holoshell/source/holoshell-asset-shard-workflow.hsplus` |

## Maintenance Rule

When adding a new HoloShell source contract, update this map or replace it with
a generated map that emits the same capability grouping. The source-validation
guard proves files parse; this map proves agents and users can find the right
surface without spelunking.
