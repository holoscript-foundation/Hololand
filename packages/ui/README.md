# @hololand/ui

2D UI components for building desktop and mobile Hololand applications.

## 🎯 Overview

`@hololand/ui` provides a complete set of 2D user interface components that work seamlessly with Hololand's 3D VR worlds. Build hybrid applications with 2D interfaces controlling 3D environments, or create pure 2D desktop/mobile apps that can upgrade to VR.

## ✨ Features

- **📱 Responsive Design** - Mobile-first, works on any screen size
- **🎨 Themeable** - Dark/light themes, custom styling
- **♿ Accessible** - ARIA labels, keyboard navigation
- **⚡ Performance** - Optimized rendering with Canvas or DOM
- **🎭 Animations** - Smooth transitions and effects
- **🖱️ Input Handling** - Mouse, touch, and keyboard support
- **📐 Flexible Layouts** - Flexbox and grid systems
- **🔗 VR Integration** - Seamlessly connect to 3D worlds

## 📦 Installation

```bash
npm install @hololand/ui three
```

## 🚀 Quick Start

### Basic Button

```typescript
import { UICanvas, Button } from '@hololand/ui';

const canvas = document.getElementById('ui-canvas');
const uiCanvas = new UICanvas(canvas, {
  width: window.innerWidth,
  height: window.innerHeight,
});

const button = new Button({
  position: { x: 100, y: 50 },
  size: { width: 200, height: 60 },
  text: 'Click Me!',
  onClick: () => console.log('Button clicked!'),
});

uiCanvas.add(button);
uiCanvas.render();
```

### Form with Multiple Components

```typescript
import { UICanvas, Panel, TextInput, Button, Text } from '@hololand/ui';

const uiCanvas = new UICanvas(canvas);

// Container panel
const loginPanel = new Panel({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  background: '#1a1a2e',
  borderRadius: 10,
});

// Title
const title = new Text({
  position: { x: 150, y: 130 },
  text: 'Login',
  fontSize: 24,
  color: '#ffffff',
});

// Username input
const usernameInput = new TextInput({
  position: { x: 120, y: 180 },
  size: { width: 260, height: 40 },
  placeholder: 'Username',
});

// Password input
const passwordInput = new TextInput({
  position: { x: 120, y: 240 },
  size: { width: 260, height: 40 },
  placeholder: 'Password',
  type: 'password',
});

// Login button
const loginButton = new Button({
  position: { x: 120, y: 300 },
  size: { width: 260, height: 50 },
  text: 'Login',
  onClick: () => {
    const username = usernameInput.getValue();
    const password = passwordInput.getValue();
    handleLogin(username, password);
  },
});

uiCanvas.add(loginPanel);
uiCanvas.add(title);
uiCanvas.add(usernameInput);
uiCanvas.add(passwordInput);
uiCanvas.add(loginButton);
```

### Hybrid Mode (2D UI + 3D World)

```typescript
import { UICanvas, Button } from '@hololand/ui';
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';

// Create 3D world
const world = new HololandWorld({ enablePhysics: true });
const renderer = new HololandRenderer(document.getElementById('3d-canvas'), world, {
  renderMode: 'hybrid',
  enableVR: true,
});

// Create 2D UI overlay
const uiCanvas = new UICanvas(document.getElementById('ui-canvas'), {
  transparent: true, // Overlay on top of 3D
});

// UI controls for 3D world
const spawnButton = new Button({
  position: { x: 20, y: 20 },
  size: { width: 150, height: 50 },
  text: '🔴 Spawn Ball',
  onClick: () => {
    world.addObject({
      type: 'sphere',
      position: { x: 0, y: 5, z: 0 },
      metadata: { radius: 1, color: 0xff0000 },
      physics: { enabled: true, mass: 1 },
    });
  },
});

uiCanvas.add(spawnButton);

// Render loop
function animate() {
  renderer.render();
  uiCanvas.render();
  requestAnimationFrame(animate);
}
animate();
```

## 📚 Core Components

### Button

Interactive button component with click handling.

```typescript
const button = new Button({
  position: { x: 100, y: 100 },
  size: { width: 200, height: 60 },
  text: 'Click Me',
  fontSize: 16,
  color: '#ffffff',
  background: '#4CAF50',
  hoverBackground: '#45a049',
  activeBackground: '#3d8b40',
  borderRadius: 5,
  onClick: () => console.log('Clicked!'),
  onHover: () => console.log('Hovered!'),
});
```

**States**: Default, Hover, Active, Disabled

### TextInput

Single-line text input field.

```typescript
const input = new TextInput({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 40 },
  placeholder: 'Enter text...',
  type: 'text', // 'text', 'password', 'email', 'number'
  maxLength: 50,
  onChange: (value) => console.log('Value:', value),
  onSubmit: (value) => console.log('Submitted:', value),
});

// Get/set value
const value = input.getValue();
input.setValue('New text');

// Focus/blur
input.focus();
input.blur();
```

### Panel

Container for grouping UI elements.

```typescript
const panel = new Panel({
  position: { x: 50, y: 50 },
  size: { width: 400, height: 300 },
  background: '#ffffff',
  borderColor: '#cccccc',
  borderWidth: 1,
  borderRadius: 8,
  shadow: true,
});

// Add children
panel.addChild(button);
panel.addChild(input);
```

### Text

Rendered text with styling.

```typescript
const text = new Text({
  position: { x: 100, y: 100 },
  text: 'Hello Hololand!',
  fontSize: 18,
  fontFamily: 'Arial, sans-serif',
  color: '#333333',
  align: 'left', // 'left', 'center', 'right'
  bold: false,
  italic: false,
});
```

### Image

Display 2D images.

```typescript
const image = new Image({
  position: { x: 100, y: 100 },
  size: { width: 200, height: 150 },
  src: '/path/to/image.png',
  fit: 'cover', // 'cover', 'contain', 'fill', 'none'
  onLoad: () => console.log('Image loaded'),
  onError: (err) => console.error('Load error:', err),
});
```

### List

Scrollable list of items.

```typescript
const list = new List({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  items: ['Item 1', 'Item 2', 'Item 3'],
  itemHeight: 50,
  onItemClick: (item, index) => console.log('Clicked:', item),
});

// Update items
list.setItems(['New 1', 'New 2']);
list.addItem('New 3');
list.removeItem(1);
```

### Modal

Popup dialog overlay.

```typescript
const modal = new Modal({
  title: 'Confirm Action',
  content: 'Are you sure you want to proceed?',
  buttons: [
    {
      text: 'Cancel',
      style: 'secondary',
      onClick: () => modal.close(),
    },
    {
      text: 'Confirm',
      style: 'primary',
      onClick: () => {
        handleConfirm();
        modal.close();
      },
    },
  ],
  onClose: () => console.log('Modal closed'),
});

modal.open();
```

### Slider

Value slider control.

```typescript
const slider = new Slider({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 20 },
  min: 0,
  max: 100,
  value: 50,
  step: 1,
  showValue: true,
  onChange: (value) => console.log('Value:', value),
});

// Get/set value
const value = slider.getValue();
slider.setValue(75);
```

### Toggle

On/off switch.

```typescript
const toggle = new Toggle({
  position: { x: 100, y: 100 },
  size: { width: 60, height: 30 },
  value: false,
  onColor: '#4CAF50',
  offColor: '#cccccc',
  onChange: (value) => console.log('Toggled:', value),
});
```

### Dropdown

Selection dropdown menu.

```typescript
const dropdown = new Dropdown({
  position: { x: 100, y: 100 },
  size: { width: 200, height: 40 },
  options: [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ],
  selectedValue: '1',
  onChange: (option) => console.log('Selected:', option),
});
```

## 📐 Layout Components

### FlexContainer

Flexbox layout system.

```typescript
const flexContainer = new FlexContainer({
  position: { x: 0, y: 0 },
  size: { width: 400, height: 300 },
  direction: 'row', // 'row', 'column'
  justify: 'space-between', // 'start', 'center', 'end', 'space-between', 'space-around'
  align: 'center', // 'start', 'center', 'end', 'stretch'
  gap: 10,
});

flexContainer.addChild(button1);
flexContainer.addChild(button2);
flexContainer.addChild(button3);
```

### GridContainer

Grid layout system.

```typescript
const gridContainer = new GridContainer({
  position: { x: 0, y: 0 },
  size: { width: 600, height: 400 },
  columns: 3,
  rows: 2,
  gap: 15,
});

gridContainer.addChild(item1, { col: 0, row: 0 });
gridContainer.addChild(item2, { col: 1, row: 0, colSpan: 2 });
```

### ScrollView

Scrollable content area.

```typescript
const scrollView = new ScrollView({
  position: { x: 100, y: 100 },
  size: { width: 300, height: 400 },
  contentSize: { width: 300, height: 800 },
  scrollDirection: 'vertical', // 'vertical', 'horizontal', 'both'
  showScrollbar: true,
});

scrollView.addChild(content);
```

## 🎨 Theming

### Built-in Themes

```typescript
import { UICanvas, Theme } from '@hololand/ui';

// Dark theme (default)
uiCanvas.setTheme(Theme.Dark);

// Light theme
uiCanvas.setTheme(Theme.Light);

// High contrast
uiCanvas.setTheme(Theme.HighContrast);
```

### Custom Theme

```typescript
const customTheme = {
  colors: {
    primary: '#4CAF50',
    secondary: '#2196F3',
    background: '#1a1a2e',
    surface: '#2c2c3e',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#444444',
    error: '#f44336',
    success: '#4CAF50',
    warning: '#ff9800',
  },
  fonts: {
    default: 'Arial, sans-serif',
    heading: 'Georgia, serif',
    monospace: 'Courier New, monospace',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 8px rgba(0,0,0,0.2)',
    lg: '0 8px 16px rgba(0,0,0,0.3)',
  },
};

uiCanvas.setTheme(customTheme);
```

## 📱 Responsive Design

### Breakpoints

```typescript
const uiCanvas = new UICanvas(canvas, {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
  },
});

// Responsive sizes
const button = new Button({
  position: { x: 20, y: 20 },
  size: {
    mobile: { width: 150, height: 50 },
    tablet: { width: 200, height: 60 },
    desktop: { width: 250, height: 70 },
  },
  text: 'Responsive Button',
});
```

### Media Queries

```typescript
uiCanvas.on('breakpoint', (breakpoint) => {
  if (breakpoint === 'mobile') {
    // Adjust layout for mobile
    sidebar.hide();
    mainPanel.setSize({ width: window.innerWidth, height: window.innerHeight });
  } else {
    sidebar.show();
    mainPanel.setSize({ width: window.innerWidth - 300, height: window.innerHeight });
  }
});
```

## ⚡ Performance

### Virtual Rendering

Only render visible components:

```typescript
const uiCanvas = new UICanvas(canvas, {
  virtualRendering: true, // Only render components in viewport
  cullingMargin: 100,     // Extra pixels to render outside viewport
});
```

### Batched Updates

```typescript
// Batch multiple updates
uiCanvas.batch(() => {
  button1.setText('Updated 1');
  button2.setText('Updated 2');
  button3.setText('Updated 3');
}); // Single render pass
```

### Event Throttling

```typescript
const slider = new Slider({
  onChange: throttle((value) => {
    // Throttled to 60 FPS
    updateWorld(value);
  }, 16),
});
```

## ♿ Accessibility

### Keyboard Navigation

```typescript
// Auto-enabled for interactive components
const button = new Button({
  accessible: true,        // Enable accessibility
  ariaLabel: 'Submit form',
  tabIndex: 0,             // Tab order
});

// Manual focus management
button.on('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    button.click();
  }
});
```

### Screen Reader Support

```typescript
const image = new Image({
  src: 'logo.png',
  alt: 'Hololand logo', // Screen reader description
});

const button = new Button({
  text: 'Submit',
  ariaLabel: 'Submit registration form',
  ariaDescribedBy: 'form-help-text',
});
```

## 🔗 Integration with Hololand Packages

### With @hololand/world

```typescript
import { HololandWorld } from '@hololand/world';
import { UICanvas, Button, Text } from '@hololand/ui';

const world = new HololandWorld({ enablePhysics: true });
const uiCanvas = new UICanvas(canvas);

// Display world stats
const statsText = new Text({
  position: { x: 20, y: 20 },
  text: 'Objects: 0',
});

world.on('object:added', () => {
  const count = world.getObjects().length;
  statsText.setText(`Objects: ${count}`);
});

uiCanvas.add(statsText);
```

### With @hololand/renderer

```typescript
import { HololandRenderer } from '@hololand/renderer';
import { UICanvas, Slider, Toggle } from '@hololand/ui';

const renderer = new HololandRenderer(canvas3d, world, {
  renderMode: 'hybrid',
});

// UI controls for renderer
const shadowToggle = new Toggle({
  position: { x: 20, y: 20 },
  value: true,
  label: 'Shadows',
  onChange: (enabled) => {
    renderer.setShadowsEnabled(enabled);
  },
});

const fovSlider = new Slider({
  position: { x: 20, y: 70 },
  min: 30,
  max: 120,
  value: 75,
  label: 'Field of View',
  onChange: (value) => {
    renderer.setFOV(value);
  },
});
```

### With @hololand/commerce

```typescript
import { Shop } from '@hololand/commerce';
import { UICanvas, Panel, Button, Text } from '@hololand/ui';

const shop = new Shop({ id: 'my-shop', name: 'VR Store' });
const uiCanvas = new UICanvas(canvas);

// Product catalog UI
const createProductCard = (product) => {
  const card = new Panel({
    size: { width: 200, height: 250 },
    background: '#ffffff',
  });

  const productName = new Text({
    position: { x: 10, y: 10 },
    text: product.name,
    fontSize: 16,
  });

  const price = new Text({
    position: { x: 10, y: 40 },
    text: `$${product.price}`,
    fontSize: 14,
    color: '#4CAF50',
  });

  const buyButton = new Button({
    position: { x: 10, y: 200 },
    size: { width: 180, height: 40 },
    text: 'Buy Now',
    onClick: () => {
      const result = shop.purchase('user-123', product.id, 1);
      if (result.success) {
        alert('Purchase successful!');
      }
    },
  });

  card.addChild(productName);
  card.addChild(price);
  card.addChild(buyButton);

  return card;
};
```

## 🎯 API Reference

### UICanvas

Main canvas for rendering 2D UI.

**Constructor**:
```typescript
new UICanvas(element: HTMLCanvasElement, config?: UICanvasConfig)
```

**Methods**:
- `add(component: UIComponent): void` - Add component
- `remove(component: UIComponent): void` - Remove component
- `clear(): void` - Remove all components
- `render(): void` - Render all components
- `setTheme(theme: Theme): void` - Change theme
- `resize(width: number, height: number): void` - Resize canvas
- `batch(fn: () => void): void` - Batch updates
- `on(event: string, handler: Function): void` - Event listener

### UIComponent (Base Class)

All components extend this base class.

**Properties**:
- `position: { x: number, y: number }` - Position
- `size: { width: number, height: number }` - Size
- `visible: boolean` - Visibility
- `enabled: boolean` - Interaction enabled
- `zIndex: number` - Rendering order

**Methods**:
- `show(): void` - Make visible
- `hide(): void` - Make hidden
- `enable(): void` - Enable interaction
- `disable(): void` - Disable interaction
- `on(event: string, handler: Function): void` - Event listener
- `emit(event: string, data?: any): void` - Emit event

## 📖 Examples

See the [examples directory](../../examples/) for complete working examples:

- **05-desktop-app** - Standard desktop application
- **06-mobile-app** - Mobile-optimized interface
- **07-hybrid-world** - 2D UI + 3D VR world
- **08-progressive-vr** - Upgrades from 2D to VR

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

## 🔗 Links

- [Documentation](https://github.com/brianonbased-dev/Hololand)
- [Examples](../../examples/)
- [Main README](../../README.md)
- [Roadmap](../../ROADMAP.md)

---

**Built with ❤️ by the Hololand community**
