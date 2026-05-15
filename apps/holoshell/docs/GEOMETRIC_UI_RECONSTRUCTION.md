# Geometric UI Reconstruction

**Status:** Research spec
**Date:** 2026-05-13
**Scope:** Reconstructing legacy UI as HoloShell geometry
**Pairs with:** `OS_UI_CAPTURE_BRIDGE.md`, `HOLOSCRIPT_INCLUSION_INVENTORY.md`

## Thesis

HoloShell should not merely float old rectangular windows inside a themed
desktop. It should reconstruct legacy UI with HoloScript objects and geometry.

The old UI becomes an engine and witness source. The shell renders a new object
layer made of shapes, labels, controls, particles, materials, and interaction
fields.

## Pipeline

```text
Capture window
Capture accessibility tree
Capture screenshot
Optional OCR
Normalize controls
Generate shell object graph
Map controls to geometry
Render in skin
Route interaction back to app
Write receipt
```

## Source Data

| Source | Use |
| --- | --- |
| Window enumeration | Bounds, title, process, handle. |
| Accessibility tree | Control role, label, value, invoke patterns. |
| Screenshot | Visual witness and OCR fallback. |
| OCR | Text when accessibility metadata is poor. |
| Program registry | App identity and launch path. |
| Action receipts | Proof of staged or executed operation. |

## Geometry Mapping

| Legacy UI item | HoloShell object |
| --- | --- |
| Window | `captured_surface` room or machine. |
| Button | Raised glyph or orb with invoke field. |
| Text input | Liquid/frosted input ribbon with focus state. |
| Menu | Radial command cluster or folded ribbon. |
| Toolbar | Docked tool constellation. |
| Table/grid | Spatial data field with row/column anchors. |
| Tab | Portal strip. |
| Dialog | Approval or decision object. |
| Scroll area | Layered depth plane or flowing band. |
| Status bar | Timeline or receipt underlay. |

## Density Target

The goal is not "one div per control." The goal is a dense semantic
reconstruction:

- 100 to 300 nodes for simple windows.
- 500 to 1500 nodes for document/browser/app surfaces.
- 1000+ geometric shards when reconstructing visual texture, table rows,
  backgrounds, selection fields, and effects.

High density must stay semantic. Shapes should be grouped by control, region,
intent, and adapter route so Brittney and other agents can reason over them.

## Interaction Mapping

Every reconstructed control needs:

```text
shellObjectId
sourceWindowId
sourceControlId
geometryBounds
semanticRole
label
confidence
actionRoute
permissionEnvelope
receiptRequired
fallbackRoute
```

If confidence is low, the shell can display the object but should not silently
act through it.

## Rendering Modes

| Mode | Purpose |
| --- | --- |
| `faithful_outline` | Preserve control positions for verification. |
| `semantic_reflow` | Group controls by meaning rather than old layout. |
| `liquid_absorption` | Turn old UI into flowing shell objects. |
| `fire_absorption` | Highlight active operations, risk, and mutation. |
| `aura_absorption` | Show agent attention, approvals, and intent. |
| `developer_trace` | Reveal control ids, adapter routes, confidence. |

## Receipts

Reconstruction receipts should include:

- Window id and process hash.
- Capture timestamp.
- Accessibility control count.
- OCR status.
- Geometry node count.
- Confidence distribution.
- Source screenshot path if captured.
- Generated `.holo` or `.hsplus` path.
- Actions that were staged or executed.

## Safety

Reconstruction is read-only by default. Acting through the reconstructed layer is
guarded or break-glass depending on the source control.

Danger zones:

- Delete buttons.
- Send or publish buttons.
- Payment forms.
- Password or token fields.
- Installer and uninstaller controls.
- System settings controls.

These should render as high-risk approval objects, not ordinary controls.

## Research Gaps

1. Stable cross-platform window/control schema.
2. Accessibility tree normalization across Windows, macOS, Android, and web.
3. OCR witness contract.
4. Confidence thresholds for action eligibility.
5. Geometry compilation path for thousands of shell nodes.
6. Headless receipt renderer parity with live shell renderer.
7. Interaction replay from HoloShell geometry back to legacy app.

## Next Build Order

1. Extend OS capture receipt with screenshot and OCR placeholders.
2. Generate one `.holo` graph per captured window.
3. Render one app as 1000+ grouped geometry nodes.
4. Add developer trace skin for confidence and action routes.
5. Route one safe button/focus action back to the app.
6. Record before/after witness receipts.

