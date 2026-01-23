# @hololand/builder

**Drag-and-drop VR world creation - no coding required.**

Like Minecraft creative mode, but for professional VR experiences.

## What It Does

- **No-Code World Builder**: Drag-and-drop interface for creating VR worlds
- **Template Library**: Pre-built environments and objects
- **Asset Browser**: Search and import 3D models, textures, and sounds
- **Real-time Preview**: See changes instantly in VR
- **Collaboration**: Multi-user building sessions

## Installation

```bash
pnpm add @hololand/builder
```

## Usage

```typescript
import { WorldBuilder, TemplateLibrary } from '@hololand/builder';

// Initialize builder
const builder = new WorldBuilder({
  canvas: document.getElementById('builder-canvas'),
  enableVR: true,
});

// Load template
const template = await TemplateLibrary.load('coffee-shop');
builder.loadTemplate(template);

// Add object programmatically
builder.addObject({
  type: 'furniture',
  model: 'chair',
  position: { x: 2, y: 0, z: 3 },
});

// Export world
const worldData = builder.export();
```

## Templates

Built-in templates include:

- **Environments**: Coffee shop, office, outdoor park, gallery
- **Objects**: Furniture, decorations, interactive items
- **Layouts**: Grid, circular, custom

## API Reference

### WorldBuilder

Main builder interface.

- `loadTemplate(template)` - Load a world template
- `addObject(config)` - Add object to scene
- `removeObject(id)` - Remove object
- `export()` - Export world data
- `enterVR()` - Enter VR building mode

### TemplateLibrary

Template management.

- `list()` - List available templates
- `load(name)` - Load template by name
- `create(config)` - Create custom template

## Package Boundaries

> **Important**: This package is distinct from `@holoscript/creator-tools`.

| Package | Purpose | License | Use Case |
|---------|---------|---------|----------|
| `@hololand/builder` | **Full Application** - Complete world builder | Elastic-2.0 | Standalone drag-and-drop VR world creation |
| `@holoscript/creator-tools` | **Embeddable Components** - React UI components | MIT | Embed trait editors in your own app |

### When to use @hololand/builder
- You need a **complete, ready-to-use** world building application
- Non-technical users need to create VR worlds without coding
- You want template-based world creation with asset management

### When to use @holoscript/creator-tools
- You're building **your own application** and need HoloScript editing components
- You want to embed a TraitEditor or PreviewDashboard in your React app
- You're creating a custom HoloScript development environment

## License

Elastic-2.0 © Hololand Team
