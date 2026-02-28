# 📚 Hololand API Reference

> **Complete API documentation for all 40+ packages**

Navigate to package-specific documentation, code examples, and TypeScript definitions.

---

## 🚀 Quick Navigation

<table>
<tr>
<td width="33%">

### 🎨 Core Packages
- [World](#world)
- [React Three](#react-three)
- [HoloScript Parser](#parser)

</td>
<td width="33%">

### 🤖 AI & Tools
- [Brittney Service](#brittney)
- [MCP Server](#mcp)
- [Inference](#inference)
- [IoT Digital Twins](#iot)

</td>
<td width="33%">

### 🌐 Platform Support
- [AR Foundation](#ar)
- [React Native](#react-native)
- [Unity Bridge](#unity)
- [Unreal Bridge](#unreal)

</td>
</tr>
</table>

---

## 📦 Package Categories

### Core Runtime Packages

| Package | Description | Documentation |
|---------|-------------|---------------|
| **@hololand/world** | World state management and composition | [README](../packages/world/README.md) |
| **@hololand/react-three** | React Three Fiber integration | [README](../packages/react-three/README.md) |
| **@hololand/physics** | Physics simulation (Rapier) | [README](../packages/physics/README.md) |
| **@hololand/networking** | Multiplayer networking | [README](../packages/networking/README.md) |

### AI & Assistant Packages

| Package | Description | Documentation |
|---------|-------------|---------------|
| **@hololand/brittney-service** | Brittney AI assistant service | [README](../packages/brittney-service/README.md) |
| **@hololand/mcp-server** | Model Context Protocol server | [README](../packages/mcp-server/README.md) |
| **@hololand/inference** | AI inference client | [README](../packages/shared/inference/README.md) |
| **@hololand/iot-digital-twins** | IoT → VR generator | [README](../packages/brittney/iot-digital-twins/README.md) |

### Platform Integrations

| Package | Description | Documentation |
|---------|-------------|---------------|
| **@hololand/ar-foundation** | AR features for mobile | [README](../packages/ar-foundation/README.md) |
| **@hololand/react-native** | React Native integration | [README](../packages/react-native/README.md) |
| **@hololand/unity-bridge** | Unity export/import | [README](../packages/unity-bridge/README.md) |
| **@hololand/unreal-bridge** | Unreal Engine integration | [README](../packages/unreal-bridge/README.md) |

**[→ See All 40+ Packages](../ECOSYSTEM_STATUS.md)**

---

## 🎨 Core Packages

### @hololand/world {#world}

World state management, composition parsing, and object lifecycle.

#### Key Classes

```typescript
class World {
  // Create a new world from HoloScript
  static fromHoloScript(source: string): World;

  // Add objects to the world
  addObject(object: HoloObject): void;
  removeObject(id: string): void;

  // Query objects
  getObject(id: string): HoloObject | undefined;
  getAllObjects(): HoloObject[];
  getObjectsByTrait(trait: string): HoloObject[];

  // Update loop
  update(deltaTime: number): void;

  // State management
  getState(): WorldState;
  setState(state: Partial<WorldState>): void;

  // Events
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
}
```

#### Key Interfaces

```typescript
interface HoloObject {
  id: string;
  name: string;
  geometry: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  material: Material;
  traits: string[];
  state: Record<string, any>;
  children: HoloObject[];
}

interface WorldState {
  objects: Map<string, HoloObject>;
  bindings: Map<string, any>;
  time: number;
  deltaTime: number;
}

interface Material {
  color?: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  map?: string;
  transparent?: boolean;
  opacity?: number;
}
```

#### Usage Examples

```typescript
import { World } from '@hololand/world';

// Create world from HoloScript
const world = World.fromHoloScript(`
  composition "My Scene" {
    object "Cube" {
      geometry: "box"
      position: [0, 1, 0]
    }
  }
`);

// Get all objects
const objects = world.getAllObjects();

// Get objects with specific trait
const interactiveObjects = world.getObjectsByTrait('@interactive');

// Update world
function gameLoop(deltaTime: number) {
  world.update(deltaTime);
}

// Listen to events
world.on('object:created', (obj) => {
  console.log('New object:', obj.name);
});
```

**[→ Full World API](../packages/world/README.md)**

---

### @hololand/react-three {#react-three}

React Three Fiber integration for rendering Hololand scenes.

#### Key Components

```typescript
// Main scene component
function HololandScene({
  source: string,              // HoloScript source code
  onLoad?: () => void,         // Called when scene loads
  onError?: (e) => void,       // Called on error
  camera?: CameraConfig,       // Camera configuration
  physics?: PhysicsConfig,     // Physics settings
}) { ... }

// Individual object component
function HoloObject({
  data: HoloObjectData,        // Object definition
  interactive?: boolean,       // Enable interactions
  onClick?: (e) => void,       // Click handler
  onHover?: (e) => void,       // Hover handler
}) { ... }

// Camera controls
function CameraControls({
  target?: Vector3,            // Look at target
  zoom?: number,               // Zoom level
  minDistance?: number,        // Min zoom distance
  maxDistance?: number,        // Max zoom distance
  enablePan?: boolean,         // Enable panning
  enableRotate?: boolean,      // Enable rotation
}) { ... }
```

#### Usage Examples

```typescript
import { Canvas } from '@react-three/fiber';
import { HololandScene, CameraControls } from '@hololand/react-three';
import sceneSource from './scene.holo?raw';

function App() {
  return (
    <Canvas>
      <HololandScene
        source={sceneSource}
        onLoad={() => console.log('Scene loaded!')}
        physics={{ enabled: true, gravity: [0, -9.81, 0] }}
      />
      <CameraControls
        target={[0, 1, 0]}
        zoom={5}
        enablePan={true}
      />
    </Canvas>
  );
}
```

**[→ Full React-Three API](../packages/react-three/README.md)**

---

## 🤖 AI & Assistant Packages

### @hololand/brittney-service {#brittney}

Brittney AI assistant for natural language scene creation and assistance.

#### Key Classes

```typescript
class BrittneyService {
  // Initialize service
  constructor(config: BrittneyConfig);

  // Natural language to HoloScript
  async generateScene(prompt: string): Promise<GenerateResult>;

  // Optimize existing scene
  async optimizeScene(scene: string, target: string): Promise<OptimizeResult>;

  // Analyze scene for issues
  async analyzeScene(scene: string): Promise<AnalysisResult>;

  // Chat interface
  async chat(message: string, context?: string[]): Promise<ChatResponse>;
}
```

#### Configuration

```typescript
interface BrittneyConfig {
  // AI provider settings
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;

  // Service settings
  endpoint?: string;
  timeout?: number;
  maxRetries?: number;

  // Feature flags
  enableCodeGeneration?: boolean;
  enableSceneAnalysis?: boolean;
  enableOptimization?: boolean;
}
```

#### Usage Examples

```typescript
import { BrittneyService } from '@hololand/brittney-service';

const brittney = new BrittneyService({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4',
});

// Generate scene from natural language
const result = await brittney.generateScene(
  'Create a cozy living room with a fireplace and couch'
);
console.log(result.holoScript);

// Analyze scene for performance issues
const analysis = await brittney.analyzeScene(myScene);
console.log('Issues:', analysis.issues);
console.log('Suggestions:', analysis.suggestions);

// Optimize for specific platform
const optimized = await brittney.optimizeScene(myScene, 'quest');
console.log('Optimized scene:', optimized.holoScript);
```

**[→ Full Brittney API](BRITTNEY_SYSTEM_REFERENCE.md)**

---

### @hololand/mcp-server {#mcp}

Model Context Protocol server exposing Hololand capabilities to AI agents.

#### Available Tools

```typescript
// IoT Tools
'brittney_iot_generate_holoscript'    // Generate VR from IoT devices
'brittney_iot_mqtt_connect'           // Connect to MQTT broker
'brittney_iot_mqtt_disconnect'        // Disconnect from MQTT
'brittney_iot_mqtt_status'            // Get connection status
'brittney_iot_mqtt_publish'           // Publish state update
'brittney_iot_list_device_types'      // List supported devices

// Scene Tools
'brittney_scene_create'               // Create new scene
'brittney_scene_analyze'              // Analyze scene
'brittney_scene_optimize'             // Optimize scene
'brittney_scene_validate'             // Validate syntax

// Asset Tools
'brittney_asset_search'               // Search 3D assets
'brittney_asset_import'               // Import asset
'brittney_asset_optimize'             // Optimize asset
```

#### Usage Examples

```bash
# Start MCP server
cd packages/mcp-server
node dist/index.js

# Server listens on stdio for MCP protocol
# Use with Claude Desktop or Code
```

**In Claude Desktop:**

```
You: Create a VR dashboard from my Home Assistant devices

Claude: I'll use the brittney_iot_generate_holoscript tool to generate
a VR scene from your IoT devices.

[Calls tool with device data]

Generated a VR dashboard with 24 devices in 2ms!
```

**[→ Full MCP Server API](../packages/mcp-server/README.md)**

---

### @hololand/inference {#inference}

AI inference client supporting multiple providers (OpenAI, Anthropic, Local).

#### Key Classes

```typescript
class InferenceClient {
  // Initialize client
  constructor(config: InferenceConfig);

  // Chat completion
  async chat(messages: ChatMessage[]): Promise<ChatResponse>;

  // Embeddings
  async embed(text: string): Promise<number[]>;

  // Status check
  async getStatus(): Promise<InferenceStatus>;

  // Provider management
  setProvider(provider: ProviderType): void;
  getAvailableProviders(): ProviderType[];
}
```

#### Configuration

```typescript
interface InferenceConfig {
  // Providers
  providers: {
    openai?: { apiKey: string; model?: string };
    anthropic?: { apiKey: string; model?: string };
    local?: { endpoint: string; model?: string };
  };

  // Behavior
  defaultProvider: ProviderType;
  fallbackToCloud: boolean;
  preferLocalWhenAvailable: boolean;
  maxRetries: number;
  timeoutMs: number;
}
```

#### Usage Examples

```typescript
import { InferenceClient } from '@hololand/inference';

const client = new InferenceClient({
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4',
    },
  },
  defaultProvider: 'anthropic',
  fallbackToCloud: true,
});

// Chat completion
const response = await client.chat([
  { role: 'user', content: 'Create a VR art gallery' },
]);
console.log(response.content);

// Get embeddings
const embedding = await client.embed('VR scene with trees');
console.log('Embedding vector:', embedding);
```

**[→ Full Inference API](../packages/shared/inference/README.md)**

---

### @hololand/iot-digital-twins {#iot}

Transform IoT devices into VR digital twins.

#### Key Classes

```typescript
class ClawdbotGenerator {
  constructor(config?: GeneratorConfig);

  // Generate from Home Assistant devices
  async generateFromHomeAssistant(
    devices: HomeAssistantDevice[],
    title?: string
  ): Promise<GenerationResult>;

  // Generate from generic IoT devices
  async generateFromDevices(
    devices: GenericDevice[],
    title?: string
  ): Promise<GenerationResult>;

  // Add custom device mapping
  addDeviceMapping(type: string, mapping: DeviceMapping): void;
}

class MQTTBridge {
  constructor(config: MQTTConfig);

  // Connection
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  getStatus(): MQTTStatus;

  // Messaging
  async publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): void;
  unsubscribe(topic: string): void;
}
```

#### Configuration

```typescript
interface GeneratorConfig {
  layoutStrategy: 'grid' | 'circular' | 'room';
  version: '3.4' | '4.0';
  enableBindings: boolean;
  spacing?: number;
  centerHeight?: number;
}

interface MQTTConfig {
  broker: string;
  port?: number;
  username?: string;
  password?: string;
  clientId?: string;
  keepalive?: number;
}
```

#### Usage Examples

```typescript
import {
  ClawdbotGenerator,
  createMQTTBridge,
} from '@hololand/iot-digital-twins';

// Generate VR from IoT devices
const generator = new ClawdbotGenerator({
  layoutStrategy: 'room',
  version: '3.4',
  enableBindings: true,
});

const result = await generator.generateFromHomeAssistant(devices, 'My Home');
console.log(result.holoScript);
console.log('Generated in:', result.generationTime, 'ms');

// Connect to MQTT
const bridge = createMQTTBridge({
  broker: 'mqtt://homeassistant.local:1883',
  username: 'hololand',
  password: process.env.MQTT_PASSWORD,
});

await bridge.connect();
bridge.subscribe('homeassistant/+/+/state', (topic, message) => {
  console.log('Device updated:', topic, message);
});
```

**[→ Full IoT Digital Twins API](../packages/brittney/iot-digital-twins/README.md)**

---

## 🌐 Platform Support Packages

### @hololand/ar-foundation {#ar}

AR features for iOS and Android using ARKit and ARCore.

#### Key Features

- Image tracking
- Plane detection
- Face tracking
- Environment lighting
- Occlusion
- People segmentation

**[→ AR Foundation API](../packages/ar-foundation/README.md)**

---

### @hololand/react-native {#react-native}

React Native integration for mobile VR/AR apps.

#### Key Components

- `ARView` - AR scene renderer
- `VRView` - VR scene renderer
- `HololandProvider` - Context provider
- `useHololand` - React hook

**[→ React Native API](../packages/react-native/README.md)**

---

### @hololand/unity-bridge {#unity}

Unity import/export and runtime integration.

#### Features

- HoloScript → Unity C# conversion
- Unity scene → HoloScript export
- Runtime HoloScript parser for Unity
- Asset pipeline integration

**[→ Unity Bridge API](../packages/unity-bridge/README.md)**

---

### @hololand/unreal-bridge {#unreal}

Unreal Engine integration.

#### Features

- HoloScript → Unreal C++ conversion
- Blueprint generation
- Material translation
- Animation import

**[→ Unreal Bridge API](../packages/unreal-bridge/README.md)**

---

## 📚 Additional Resources

### Language References

- [HoloScript Language Spec](HOLOSCRIPT_LANGUAGE_SPEC.md)
- [HoloScript+ Extended](HSPLUS_LANGUAGE_SPEC.md)
- [File Types Guide](HOLOSCRIPT_FILE_TYPES.md)

### Guides

- [Getting Started](GETTING_STARTED.md)
- [Developer Portal](DEVELOPER_PORTAL.md)
- [Examples Gallery](EXAMPLES_GALLERY.md)
- [Deployment Guides](DEPLOYMENT_CHECKLIST.md)

### Architecture

- [Architecture Decisions](ARCHITECTURE_DECISIONS.md)
- [MCP Best Practices](MCP_BEST_PRACTICES.md)
- [uAA2 API Contract](UAA2_API_CONTRACT.md)

---

## 🔍 Search API Docs

### By Feature

| Feature | Packages |
|---------|----------|
| **Scene Creation** | world, react-three, brittney-service |
| **Physics** | physics, world |
| **Networking** | networking, world |
| **AI Assistant** | brittney-service, mcp-server, inference |
| **IoT Integration** | iot-digital-twins |
| **AR/VR** | ar-foundation, react-native |
| **Game Engines** | unity-bridge, unreal-bridge |

### By Platform

| Platform | Packages |
|----------|----------|
| **Browser** | world, react-three |
| **Mobile** | react-native, ar-foundation |
| **Desktop** | world, physics |
| **Quest** | react-three, ar-foundation |
| **Vision Pro** | ar-foundation |
| **Unity** | unity-bridge |
| **Unreal** | unreal-bridge |

---

## 💻 TypeScript Support

All packages include full TypeScript definitions!

```typescript
// Auto-complete works everywhere
import { World, HoloObject } from '@hololand/world';

const world = new World();  // ✅ Type checking
const obj: HoloObject = {   // ✅ IntelliSense
  id: '1',
  name: 'Cube',
  // ... TypeScript guides you
};
```

### Generate Type Definitions

```bash
# Generate .d.ts files for your project
pnpm build

# Types are in dist/ folders
ls packages/*/dist/*.d.ts
```

---

## 📖 Contributing to Docs

Found an error or want to improve the documentation?

1. **Edit the docs** - All markdown files in `docs/`
2. **Submit PR** - We review quickly
3. **Get merged!** 🎉

**What we need:**
- Code examples
- Tutorial improvements
- API clarifications
- Typo fixes

**[→ Contributing Guide](../CONTRIBUTING.md)**

---

## 🆘 Need Help?

### Can't find what you're looking for?

- 📖 [Full Documentation Index](INDEX.md)
- 💬 Discord (coming soon)
- 🐛 [GitHub Issues](https://github.com/hololand/hololand/issues)
- 📧 support@hololand.dev

### Request API Documentation

Missing documentation for a package?

1. Open a [GitHub Issue](https://github.com/hololand/hololand/issues/new)
2. Tag it with `documentation`
3. We'll prioritize it!

---

## 📄 License

API documentation is MIT licensed, same as Hololand.

---

**📚 Complete, typed, and ready to use!**

---

**Built with ❤️ for the Hololand community**

*Comprehensive API reference for all 40+ packages*
