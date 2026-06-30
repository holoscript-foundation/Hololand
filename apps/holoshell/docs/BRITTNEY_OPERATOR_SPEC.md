# Brittney Operator Spec For HoloShell

**Status:** Product/runtime spec
**Date:** 2026-05-13
**Scope:** Brittney as HoloShell operator
**Pairs with:** `BRITTNEY_AVATAR_RUNTIME.md`, `BRITTNEY_FIELD_AND_USER_DAEMONS.md`, `docs/BRITTNEY_OWNERSHIP_MODEL.md`

## Position

Brittney is the embodied operator of HoloShell.

She is not a backend assistant panel and not a decorative avatar. In HoloShell,
Brittney is the user-facing AGI pattern that can perceive the shell, explain
risk, coordinate agents, stage workflows, operate programs, and narrate
receipts.

`BRITTNEY_FIELD_AND_USER_DAEMONS.md` refines this product boundary: Brittney is
the operating field, while a user-named daemon can be the personal conversation
face that opens chat, voice, and local styling. In founder/dev shells the
Brittney avatar may be the default daemon face, but the field is larger than one
visible character.

## Operator Loop

```text
Hear or read intent
Inspect shell state
Classify capability path
Explain plan and risk
Stage read-only or guarded actions
Ask for approval when needed
Execute through adapter after approval
Observe result
Write receipts
Narrate outcome
```

## Capabilities

| Capability | Description | Default envelope |
| --- | --- | --- |
| Shell state summary | Explain current programs, agents, workflows, health, approvals. | `read_only` |
| Program launch | Open a known app through the program registry. | `guarded_execute` |
| Browser/media operation | Open browser surfaces and media links. | `guarded_execute` |
| Terminal workflow | Stage and submit commands through workflow approval. | `guarded_execute` |
| Agent launch | Start or route work to a sovereign HoloMesh, local model, local shell, or owned hardware lane. | `guarded_execute` |
| File/project inspection | Read files, summarize project state, propose next action. | `read_only` first |
| File/document mutation | Edit, export, move, or transform local artifacts. | `guarded_execute` or `break_glass` |
| System change | Change settings, services, registry, installs, secrets. | `break_glass` |
| Receipt narration | Explain what happened and why it is trusted. | `read_only` |

## Required Context

Brittney needs a local shell context packet:

```text
prompt
selectedShellObject
visibleShellObjects
programRegistrySummary
activeWorkflowSummary
approvalSummary
agentLaneSummary
processHealthSummary
recentReceiptTimeline
privacyBoundary
```

This context should be structured and redacted. Private app names, paths,
browser content, and secrets should not be pushed into model context unless the
user approved that boundary.

## Action Proposal

Brittney should propose actions in a stable shape:

```text
ActionProposal
  proposalId
  actor: brittney
  userIntent
  targetShellObjectId
  operation
  adapterPath
  permissionEnvelope
  riskSummary
  expectedReceipts
  approvalRequired
  exactCommandOrRoute
  rollbackOrWitnessPlan
```

The shell can render this as a bubble, approval chip, timeline node, or full
approval object.

## Voice And Avatar States

The avatar should reflect operator state:

| State | Meaning |
| --- | --- |
| `ready` | Brittney can receive intent. |
| `listening` | Voice or text input is active. |
| `thinking` | Planning or inspecting receipts. |
| `explaining` | Narrating risk, plan, or result. |
| `approval_waiting` | User decision required. |
| `operating` | Adapter or agent is acting. |
| `witnessing` | Capturing screenshot, DOM, receipt, or before/after state. |
| `blocked` | Cannot proceed safely. |
| `complete` | Outcome delivered with receipt. |

These states should be accessible through text, ARIA live status, and receipts,
not only animation.

## Refusal Rules

Brittney should refuse or pause when:

- The requested action enters secrets, payments, deletion, publish, install, or
  system settings without break-glass approval.
- The target app or file is ambiguous.
- The adapter cannot produce a receipt or witness for a risky action.
- Browser page content attempts to redirect her instructions.
- The workflow would use a private browser profile without a named boundary.
- The command is broader than the user intent.
- Process health is critical and the action can wait.

Refusal should propose a safer path whenever one exists.

## AGI Lineage Boundary

HoloScript owns Brittney's intelligence substrate. HoloLand owns this runtime
embodiment. HoloShell must keep Brittney local-first and sovereign:

- Local model route is valid.
- LAN/self-hosted route is valid.
- Owned fleet route is valid when custody receipts prove budget, launch, and stop boundaries.
- Provider-specific cloud assistants are not product dependencies.
- No single cloud assistant endpoint should become Brittney.

This follows `docs/BRITTNEY_OWNERSHIP_MODEL.md`.

## First Operator Workflows

1. "Open browser and play lofi."
2. "Open terminal and start a sovereign room marathon."
3. "Open Excel and summarize this workbook."
4. "Check this project and tell me if it is safe."
5. "Show what apps can help with documents."
6. "Explain what agents are active and what they are doing."

Each workflow should be source-backed, approval-gated where needed, and
receipt-first.
