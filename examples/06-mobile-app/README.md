# 06 - Mobile App

A touch-optimized mobile application example using `@hololand/ui` Phase 2 components.

## Features Demonstrated

- **Touch Optimization**: Large touch targets (44px+) following mobile guidelines
- **Responsive Layout**: Adapts to screen size with proper spacing
- **Mobile UX Patterns**: Bottom navigation, status bar, cards
- **Haptic Feedback**: Toggle for device vibration
- **Modal Dialogs**: Touch-friendly overlays

## Running the Example

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open in mobile browser or use Chrome DevTools mobile simulation.

## Screenshot

```
+---------------------------+
|         9:41              |  <- Status bar
+---------------------------+
| Good evening              |
| Alex Chen           [AC]  |  <- Header with profile
+---------------------------+
| [  VR  ] [  AR  ] [  +  ] |  <- Quick actions
|  Enter    AR      Create  |
+---------------------------+
| Recent Worlds             |
| +-------------------------+
| | My VR Home              |
| | Last visited 2h ago     |
| +-------------------------+
| | Team Workspace          |
| | Last visited yesterday  |
| +-------------------------+
+---------------------------+
| Quick Settings            |
| [x] Haptic Feedback       |
| Sound: [=======----]      |
+---------------------------+
| [H]  [E]  [C]  [P]        |  <- Bottom nav
| Home Explore Create Profile|
+---------------------------+
```

## Mobile Design Guidelines Followed

| Guideline | Implementation |
|-----------|----------------|
| Touch target size | Minimum 44x44px buttons |
| Thumb zone | Bottom navigation |
| Visual feedback | Hover/press states |
| Readability | High contrast, 14px+ text |
| Gestures | Tap, scroll support |

## Components Used

| Component | Purpose |
|-----------|---------|
| `UICanvas` | Root canvas with pixelRatio |
| `Panel` | Cards and sections |
| `Text` | Labels and headings |
| `Button` | Large touch actions |
| `Toggle` | Settings switches |
| `Slider` | Volume/sound control |
| `List` | Scrollable world list |
| `Modal` | Action confirmations |

## Touch Events

The `@hololand/ui` canvas automatically handles:
- `touchstart` / `touchend` for tap
- `touchmove` for drag/scroll
- Proper event prevention for iOS
