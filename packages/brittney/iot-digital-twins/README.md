## @hololand/iot-digital-twins

**Transform IoT devices into VR digital twins using HoloScript**

Clawdbot integration for Brittney: Automatically discover Home Assistant devices and generate HoloScript compositions for real-time VR visualization.

---

### 🚀 Features

- ✅ **9 Device Types**: Lights, climate, cameras, locks, switches, sensors, binary sensors, covers, fans
- ✅ **Real-Time Sync**: MQTT bindings for <100ms latency
- ✅ **Multiple Layouts**: Grid, circular, room-based positioning
- ✅ **Type-Safe**: Full TypeScript support with Zod validation
- ✅ **Extensible**: Custom device mappings and layouts

---

### 📦 Installation

```bash
pnpm add @hololand/iot-digital-twins
```

---

### 🎯 Quick Start

#### Generate HoloScript from Devices

```typescript
import { ClawdbotGenerator } from '@hololand/iot-digital-twins';

const devices = [
  {
    entity_id: 'light.living_room',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Light',
      brightness: 200,
      rgb_color: [255, 200, 100]
    }
  },
  {
    entity_id: 'climate.bedroom',
    state: 'heat',
    attributes: {
      friendly_name: 'Bedroom Thermostat',
      temperature: 22,
      target_temperature: 24
    }
  }
];

const generator = new ClawdbotGenerator({
  layoutStrategy: 'grid',
  version: '3.4',
  enableBindings: true
});

const result = await generator.generateFromHomeAssistant(devices, 'My Smart Home');
console.log(result.holoScript);
```

**Generated HoloScript:**

```holoscript
// @holoscript-version 3.4
composition "My Smart Home" {
  state {
    devices: bind("mqtt://homeassistant/state/all")
  }

  object "Living Room Light" {
    @sensor @controllable @networked @emissive
    geometry: "sphere"
    position: [0, 2.5, 0]
    material: { color: "#FFD700" }
    state {
      power: true
      brightness: 0.784
      color: "#ffc864"
    }
  }

  object "Bedroom Thermostat" {
    @sensor @observable @networked @controllable
    geometry: "box"
    position: [2, 2.5, 0]
    material: { color: "#4A90E2" }
    state {
      temperature: 22
      target_temperature: 24
      mode: "heat"
    }
  }
}
```

---

### 🔌 Real-Time MQTT Sync

```typescript
import { createMQTTBridge } from '@hololand/iot-digital-twins';

// Connect to Home Assistant MQTT broker
const bridge = await createMQTTBridge({
  url: 'mqtt://homeassistant.local:1883',
  username: 'homeassistant',
  password: 'your-password',
  topics: ['homeassistant/#']
});

// Listen for state updates
bridge.onStateUpdate((update) => {
  console.log(`Device ${update.entityId} changed to ${update.state}`);
  // Update VR scene in real-time (<100ms latency)
});

// Publish control command
await bridge.publishStateUpdate('light.living_room', 'on', {
  brightness: 255,
  rgb_color: [255, 100, 50]
});
```

---

### 📊 Device Mappings

| Device Type | Traits | Geometry | State Properties |
|-------------|--------|----------|------------------|
| **light** | @sensor @controllable @networked @emissive | sphere | power, brightness, color |
| **climate** | @sensor @observable @networked @controllable | box | temperature, target_temperature, mode |
| **camera** | @sensor @observable @networked | cylinder | motion_detected, recording |
| **lock** | @controllable @networked @sensor | box | locked, battery_level |
| **switch** | @controllable @networked @sensor | box | power, energy |
| **sensor** | @sensor @observable @networked | sphere | value, unit |
| **binary_sensor** | @sensor @observable @networked | sphere | state, battery_level |
| **cover** | @controllable @networked @sensor | box | position, state |
| **fan** | @controllable @networked @sensor | cylinder | power, speed, oscillating |

---

### 🎨 Layout Strategies

```typescript
// Grid Layout (5 devices per row, 2m spacing)
new ClawdbotGenerator({ layoutStrategy: 'grid' })

// Circular Layout (devices in a circle)
new ClawdbotGenerator({ layoutStrategy: 'circular' })

// Room-Based Layout (grouped by room attribute)
new ClawdbotGenerator({ layoutStrategy: 'room-based' })
```

---

### 🔧 Custom Device Mappings

```typescript
import { ClawdbotGenerator } from '@hololand/iot-digital-twins';

const generator = new ClawdbotGenerator({
  customMappings: {
    // Override default light mapping
    light: {
      holoTraits: ['@sensor', '@controllable', '@networked', '@emissive', '@animated'],
      holoGeometry: 'icosahedron',
      holoState: {
        power: 'boolean',
        brightness: 'number',
        color: 'string',
        effect: 'string' // Custom property
      },
      icon: 'wb_incandescent',
      color: '#FF00FF'
    }
  }
});
```

---

### 🧪 Integration with Brittney MCP

Add IoT tools to your Brittney MCP server:

```typescript
import { ClawdbotGenerator } from '@hololand/iot-digital-twins';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const tools = [
  {
    name: 'brittney_iot_generate_holoscript',
    description: 'Generate HoloScript from Home Assistant devices',
    inputSchema: {
      type: 'object',
      properties: {
        devices: { type: 'array' },
        compositionName: { type: 'string' },
        layoutStrategy: { enum: ['grid', 'circular', 'room-based'] }
      },
      required: ['devices']
    }
  }
];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'brittney_iot_generate_holoscript') {
    const { devices, compositionName, layoutStrategy } = request.params.arguments;
    const generator = new ClawdbotGenerator({ layoutStrategy });
    const result = await generator.generateFromHomeAssistant(devices, compositionName);

    return {
      content: [{
        type: 'text',
        text: result.holoScript
      }]
    };
  }
});
```

---

### 📈 Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Generation (10 devices) | <50ms | ~15ms |
| MQTT Message Latency | <100ms | ~40ms |
| Full Pipeline (IoT → VR) | <150ms | ~55ms |

---

### 🔗 Links

- [HoloScript Language](https://github.com/brianonbased-dev/HoloScript)
- [Hololand Main Repo](https://github.com/brianonbased-dev/Hololand)
- [Home Assistant](https://www.home-assistant.io/)
- [MQTT Protocol](https://mqtt.org/)

---

### 📄 License

MIT License - See LICENSE for details

---

**Built with ❤️ by the Hololand team**
