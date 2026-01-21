
/**
 * Library Service
 * Manages fetching and loading of HoloScript library components.
 */

export interface LibraryComponent {
  id: string;
  name: string;
  category: string;
  path: string;
  exportName: string;
  description: string;
  tags: string[];
}

export interface LibraryManifest {
  name: string;
  version: string;
  components: LibraryComponent[];
}

export class LibraryService {
  private static manifestCache: LibraryManifest | null = null;
  // In a real app, this would point to a CDN or API.
  // We'll simulate fetching from the raw Github/Local content if possible,
  // or just hardcode the mock for this prototype phase if file access is restricted in browser.
  // For the 'Playground' running locally, we can import the JSON if we set it up right,
  // but fetching is cleaner.
  
  // MOCK DATA for Prototype (since we can't easily fetch ../../packages/library in Vite dev without config)
  private static MOCK_MANIFEST: LibraryManifest = {
    name: "Standard Library",
    version: "1.0.0",
    components: [
      {
        id: "Core.Cube",
        name: "Cube",
        category: "Core",
        path: "/src/Core/BasicShapes.hsplus",
        exportName: "Cube",
        description: "A simple 1x1x1 cube with physics.",
        tags: ["primitive", "shape", "physics"]
      },
      {
        id: "Core.Sphere",
        name: "Sphere",
        category: "Core",
        path: "/src/Core/BasicShapes.hsplus",
        exportName: "Sphere",
        description: "A simple sphere with physics.",
        tags: ["primitive", "shape", "physics"]
      },
      {
        id: "Interactive.TriggerZone",
        name: "Trigger Zone",
        category: "Interactive",
        path: "/src/Interactive/TriggerZone.hsplus",
        exportName: "TriggerZone",
        description: "Invisible zone that detects player entry/exit.",
        tags: ["logic", "zone", "trigger"]
      }
    ]
  };

  private static MOCK_CONTENT: Record<string, string> = {
    "Core.Cube": `
export prefab Cube {
  object cube_mesh {
    mesh: "cube"
    collider: "box"
    mass: 1.0
    trait Material {
      color: 0x888888
      roughness: 0.5
    }
  }
}`,
    "Core.Sphere": `
export prefab Sphere {
  object sphere_mesh {
    mesh: "sphere"
    collider: "sphere"
    mass: 1.0
    trait Material {
      color: 0x888888
      roughness: 0.2
    }
  }
}`,
    "Interactive.TriggerZone": `
export prefab TriggerZone {
  object zone {
    mesh: "box"
    trait Material {
      color: 0xffaa00
      opacity: 0.2
      transparent: true
    }
    collider: "trigger"
    isStatic: true
    @on_enter(other) {
      log("Trigger Enter: " + other.name)
    }
    @on_exit(other) {
      log("Trigger Exit: " + other.name)
    }
  }
}`
  };

  static async getManifest(): Promise<LibraryManifest> {
    // In production, fetch('/library/manifest.json')
    if (this.manifestCache) return this.manifestCache;
    this.manifestCache = this.MOCK_MANIFEST;
    return this.MOCK_MANIFEST;
  }

  static async getComponentCode(componentId: string): Promise<string> {
    // In production, fetch(component.path)
    return this.MOCK_CONTENT[componentId] || "// Component not found";
  }
}
