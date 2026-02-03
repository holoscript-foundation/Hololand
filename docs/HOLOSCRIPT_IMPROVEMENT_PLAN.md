# HoloScript Evolution Roadmap: Zero-Config Compositions

Developed in collaboration with **Brittney (HoloScript Expert AI)**.

## Goal
To lower the barrier for creators by bridging the gap between declarative `.holo` scenes and the high-performance `.hsplus` systems, using automatic dependency injection and modular compositions.

---

## Phase 1: The Composition API
Introduce the `composition` keyword in `.holo` files to allow grouping behavior and systems at the top level.

### Proposed Syntax
```holo
// world.holo
composition "MyGlobalSystems" {
  // Define systems that should be auto-provisioned
  system Networking { type: "zero-config", syncRate: 30 }
  system Physics { mode: "high-fidelity", gravity: -9.81 }
  system AI { mesh: "local-ollama", density: "standard" }
}
```

---

## Phase 2: Zero-Config Dependency Injection
The Hololand engine will automatically detect these `system` blocks and perform the following actions:
1.  **Auto-Import**: Provision `@hololand/networking` and `@hololand/physics` WITHOUT requiring manual imports in `.hsplus`.
2.  **Shared Memory Initialization**: Automatically setup the `__HOLOLAND_CENTRAL__` state bridge for these systems.
3.  **Trait Mapping**: Enable high-level traits like `physicsSync` to work immediately on any entity within the composition.

---

## Phase 3: JSON-Based State Management
Separate dynamic data from static logic to enable easier iteration and runtime overrides.

### Configuration Structure
```json
// config.json
{
  "worlds": {
    "Oasis": {
      "gravity": -4.5,
      "maxPlayers": 16,
      "ambientColor": "#7a28ff"
    }
  }
}
```

### HoloScript Integration
```holo
composition "DynamicWorld" {
  core_config file_path { 
    default: "./config.json", 
    overrides: true 
  }
}
```

---

## Next Steps
1.  [ ] Prototype the `composition` parser in `HoloScriptPlusParser.ts`.
2.  [ ] Update the `NetworkingSystem` to support `zero-config` initialization.
3.  [ ] Launch an "Experimental Features" flag in Hololand Central for the Hybrid Trait system.

> [!NOTE]
> Brittney highlights that this "Zero-Config" approach reduces boilerplate by up to 60% for typical multiplayer VR scenes.
