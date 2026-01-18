# @hololand/builder

Visual building tools for the Hololand metaverse.

## Features

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

## License

Elastic-2.0 © Hololand Team
