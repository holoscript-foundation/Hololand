# 05 - Desktop App

A complete desktop application example using `@hololand/ui` Phase 2 components.

## Features Demonstrated

- **Theme System**: Dark/light mode toggle with `themeContext`
- **Layout Components**: `Panel`, `FlexContainer` for structured layouts
- **Interactive Components**: `Button`, `Toggle`, `Slider`, `TextInput`
- **Data Display**: `List` for activity feed, `Text` for labels
- **Navigation**: `TabView` for switching between Dashboard and Settings

## Running the Example

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Screenshot

```
+------------------------------------------------------------------+
| Hololand Desktop App                           [Dark Mode Toggle] |
+------------------------------------------------------------------+
|              |                                                    |
| Navigation   |  [Dashboard] [Settings]                           |
|              |  +------------------------------------------------+
| [Dashboard]  |  | Total Users  | Active Sessions | Revenue      ||
| [Projects]   |  | 12,345       | 1,234           | $45,678      ||
| [Settings]   |  +------------------------------------------------+
| [Help]       |                                                    |
|              |  Recent Activity                                   |
|              |  +------------------------------------------------+
|              |  | New user registered           2 minutes ago   ||
|              |  | Project "VR World" created    15 minutes ago  ||
|              |  | Payment received              1 hour ago      ||
|              |  +------------------------------------------------+
+------------------------------------------------------------------+
```

## Components Used

| Component | Purpose |
|-----------|---------|
| `UICanvas` | Root canvas manager |
| `Panel` | Container for sections |
| `Text` | Labels and headings |
| `Button` | Navigation and actions |
| `Toggle` | Theme switch, notifications |
| `Slider` | Volume control |
| `TextInput` | Username field |
| `List` | Activity feed |
| `TabView` | Dashboard/Settings tabs |
| `FlexContainer` | Stats row layout |

## Theme Integration

```typescript
import { themeContext, darkTheme, lightTheme } from '@hololand/ui';

// Switch themes
themeToggle.onChange = (isDark) => {
  const theme = isDark ? darkTheme : lightTheme;
  uiCanvas.backgroundColor = theme.colors.background;
};
```
