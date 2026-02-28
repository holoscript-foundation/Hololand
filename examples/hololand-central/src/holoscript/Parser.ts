/**
 * HoloScript Parser Integration
 *
 * Converts .holo files (like library-interactive.holo) into Three.js scene configurations
 * that can be rendered with React Three Fiber.
 *
 * Features:
 * - Parses HoloScript compositions using @holoscript/core
 * - Converts HoloScript objects to Three.js geometry
 * - Handles @state, @event, @reactive directives
 * - Integrates with QuestState and EventBus
 */

import { parseHolo, HoloComposition, HoloObjectDecl, HoloState } from '@holoscript/core';
import type { Vector3, Euler, Material } from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface SceneConfig {
  name: string;
  environment: EnvironmentConfig;
  state: StateConfig;
  objects: SceneObject[];
  lights: LightConfig[];
  camera: CameraConfig;
  metadata: {
    source: string;
    parsedAt: number;
  };
}

export interface EnvironmentConfig {
  background?: string | { type: 'gradient' | 'skybox'; value: any };
  fog?: { type: 'linear' | 'exponential'; color: string; density?: number; near?: number; far?: number };
  ambientLight?: { color: string; intensity: number };
}

export interface StateConfig {
  initialState: Record<string, any>;
  reactiveBindings: ReactiveBinding[];
  eventBindings: EventBinding[];
}

export interface ReactiveBinding {
  objectName: string;
  property: string;
  expression: string;
  dependencies: string[];
}

export interface EventBinding {
  objectName: string;
  eventType: string;
  handler: string;
  emitsEvent?: string;
}

export interface SceneObject {
  name: string;
  type: 'mesh' | 'portal' | 'npc' | 'group' | 'custom';
  geometry: GeometryConfig;
  material: MaterialConfig;
  transform: TransformConfig;
  traits: string[];
  interactive?: InteractiveConfig;
  reactive?: ReactiveBinding[];
  events?: EventBinding[];
  children?: SceneObject[];
}

export interface GeometryConfig {
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'torus' | 'cone' | 'custom';
  args: number[];
}

export interface MaterialConfig {
  type: 'standard' | 'basic' | 'phong' | 'physical';
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  metalness?: number;
  roughness?: number;
  [key: string]: any;
}

export interface TransformConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface InteractiveConfig {
  enabled: boolean;
  onClick?: string;
  onHover?: string;
  cursor?: string;
}

export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  color: string;
  intensity: number;
  position?: [number, number, number];
  target?: [number, number, number];
  castShadow?: boolean;
}

export interface CameraConfig {
  type: 'perspective' | 'orthographic';
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

// ============================================================================
// PARSER
// ============================================================================

export class HoloScriptParser {
  /**
   * Parse a .holo file and convert to Three.js scene configuration
   */
  static async parseFile(filePath: string): Promise<SceneConfig> {
    const response = await fetch(filePath);
    const source = await response.text();
    return this.parseSource(source);
  }

  /**
   * Parse HoloScript source code directly
   */
  static parseSource(source: string): SceneConfig {
    const composition = parseHolo(source);

    if (!composition || typeof composition !== 'object') {
      throw new Error('Invalid HoloScript composition');
    }

    return this.convertToScene(composition as HoloComposition, source);
  }

  /**
   * Convert HoloComposition to SceneConfig
   */
  private static convertToScene(composition: HoloComposition, source: string): SceneConfig {
    const environment = this.parseEnvironment(composition.environment);
    const state = this.parseState(composition.state, composition.objects);
    const objects = this.parseObjects(composition.objects || [], composition);
    const lights = this.parseLights(composition.lights || []);
    const camera = this.parseCamera(composition.camera);

    return {
      name: composition.name || 'Untitled Scene',
      environment,
      state,
      objects,
      lights,
      camera,
      metadata: {
        source,
        parsedAt: Date.now(),
      },
    };
  }

  /**
   * Parse environment configuration
   */
  private static parseEnvironment(env: any): EnvironmentConfig {
    if (!env || !env.properties) {
      return {
        background: '#1a1a2e',
        ambientLight: { color: '#ffffff', intensity: 0.5 },
      };
    }

    const config: EnvironmentConfig = {};

    for (const prop of env.properties) {
      if (prop.key === 'background') {
        config.background = prop.value;
      } else if (prop.key === 'fog') {
        config.fog = prop.value;
      } else if (prop.key === 'ambientLight') {
        config.ambientLight = prop.value;
      }
    }

    return config;
  }

  /**
   * Parse state configuration and reactive bindings
   */
  private static parseState(stateDecl: any, objects: any[]): StateConfig {
    const initialState: Record<string, any> = {};
    const reactiveBindings: ReactiveBinding[] = [];
    const eventBindings: EventBinding[] = [];

    // Parse state declaration
    if (stateDecl && stateDecl.properties) {
      for (const prop of stateDecl.properties) {
        initialState[prop.key] = prop.value;
      }
    }

    // Extract reactive bindings from objects
    for (const obj of objects || []) {
      if (obj.traits && obj.traits.includes('@reactive')) {
        // Find reactive properties
        for (const prop of obj.properties || []) {
          if (prop.computed || prop.reactive) {
            reactiveBindings.push({
              objectName: obj.name,
              property: prop.key,
              expression: prop.value || prop.expression,
              dependencies: this.extractDependencies(prop.value || prop.expression),
            });
          }
        }
      }

      // Extract event bindings
      if (obj.traits && obj.traits.includes('@event')) {
        for (const prop of obj.properties || []) {
          if (prop.key.startsWith('on')) {
            eventBindings.push({
              objectName: obj.name,
              eventType: prop.key,
              handler: prop.value,
              emitsEvent: prop.emitsEvent,
            });
          }
        }
      }
    }

    return {
      initialState,
      reactiveBindings,
      eventBindings,
    };
  }

  /**
   * Parse objects into scene objects
   */
  private static parseObjects(objects: any[], composition: HoloComposition): SceneObject[] {
    return objects.map(obj => this.parseObject(obj, composition));
  }

  /**
   * Parse a single object
   */
  private static parseObject(obj: any, composition: HoloComposition): SceneObject {
    const traits = obj.traits?.map((t: any) => typeof t === 'string' ? t : t.name) || [];
    const type = this.inferObjectType(obj, traits);
    const geometry = this.parseGeometry(obj);
    const material = this.parseMaterial(obj);
    const transform = this.parseTransform(obj);
    const interactive = this.parseInteractive(obj, traits);
    const reactive = this.parseReactiveProps(obj);
    const events = this.parseEventProps(obj);

    return {
      name: obj.name,
      type,
      geometry,
      material,
      transform,
      traits,
      interactive,
      reactive,
      events,
      children: obj.children ? this.parseObjects(obj.children, composition) : undefined,
    };
  }

  /**
   * Infer object type from traits and properties
   */
  private static inferObjectType(obj: any, traits: string[]): SceneObject['type'] {
    if (obj.type === 'portal' || traits.includes('@portal')) return 'portal';
    if (obj.type === 'npc' || traits.includes('@npc')) return 'npc';
    if (obj.type === 'group' || traits.includes('@group')) return 'group';
    if (obj.type === 'mesh' || traits.includes('@mesh')) return 'mesh';
    return 'custom';
  }

  /**
   * Parse geometry configuration
   */
  private static parseGeometry(obj: any): GeometryConfig {
    const geom = obj.properties?.find((p: any) => p.key === 'geometry');

    if (!geom) {
      // Default to box
      return { type: 'box', args: [1, 1, 1] };
    }

    const value = geom.value;
    if (typeof value === 'object' && value.type) {
      return {
        type: value.type,
        args: value.args || [],
      };
    }

    return { type: 'box', args: [1, 1, 1] };
  }

  /**
   * Parse material configuration
   */
  private static parseMaterial(obj: any): MaterialConfig {
    const materialProp = obj.properties?.find((p: any) => p.key === 'material');

    if (!materialProp) {
      return {
        type: 'standard',
        color: '#888888',
      };
    }

    const value = materialProp.value;
    if (typeof value === 'object') {
      return {
        type: value.type || 'standard',
        ...value,
      };
    }

    return {
      type: 'standard',
      color: value || '#888888',
    };
  }

  /**
   * Parse transform (position, rotation, scale)
   */
  private static parseTransform(obj: any): TransformConfig {
    const position = obj.properties?.find((p: any) => p.key === 'position')?.value || [0, 0, 0];
    const rotation = obj.properties?.find((p: any) => p.key === 'rotation')?.value || [0, 0, 0];
    const scale = obj.properties?.find((p: any) => p.key === 'scale')?.value || [1, 1, 1];

    return {
      position: Array.isArray(position) ? position : [0, 0, 0],
      rotation: Array.isArray(rotation) ? rotation : [0, 0, 0],
      scale: Array.isArray(scale) ? scale : [1, 1, 1],
    };
  }

  /**
   * Parse interactive configuration
   */
  private static parseInteractive(obj: any, traits: string[]): InteractiveConfig | undefined {
    if (!traits.includes('@interactive')) {
      return undefined;
    }

    const onClick = obj.properties?.find((p: any) => p.key === 'onClick')?.value;
    const onHover = obj.properties?.find((p: any) => p.key === 'onHover')?.value;
    const cursor = obj.properties?.find((p: any) => p.key === 'cursor')?.value;

    return {
      enabled: true,
      onClick,
      onHover,
      cursor: cursor || 'pointer',
    };
  }

  /**
   * Parse reactive properties
   */
  private static parseReactiveProps(obj: any): ReactiveBinding[] | undefined {
    const reactiveProps = obj.properties?.filter((p: any) => p.computed || p.reactive);

    if (!reactiveProps || reactiveProps.length === 0) {
      return undefined;
    }

    return reactiveProps.map((prop: any) => ({
      objectName: obj.name,
      property: prop.key,
      expression: prop.value || prop.expression,
      dependencies: this.extractDependencies(prop.value || prop.expression),
    }));
  }

  /**
   * Parse event properties
   */
  private static parseEventProps(obj: any): EventBinding[] | undefined {
    const eventProps = obj.properties?.filter((p: any) => p.key.startsWith('on'));

    if (!eventProps || eventProps.length === 0) {
      return undefined;
    }

    return eventProps.map((prop: any) => ({
      objectName: obj.name,
      eventType: prop.key,
      handler: prop.value,
      emitsEvent: prop.emitsEvent,
    }));
  }

  /**
   * Parse lights
   */
  private static parseLights(lights: any[]): LightConfig[] {
    return lights.map(light => ({
      type: light.type || 'ambient',
      color: light.properties?.find((p: any) => p.key === 'color')?.value || '#ffffff',
      intensity: light.properties?.find((p: any) => p.key === 'intensity')?.value || 1,
      position: light.properties?.find((p: any) => p.key === 'position')?.value,
      castShadow: light.properties?.find((p: any) => p.key === 'castShadow')?.value || false,
    }));
  }

  /**
   * Parse camera
   */
  private static parseCamera(camera: any): CameraConfig {
    if (!camera) {
      return {
        type: 'perspective',
        position: [0, 5, 50],
        target: [0, 0, 0],
        fov: 75,
      };
    }

    return {
      type: camera.type || 'perspective',
      position: camera.properties?.find((p: any) => p.key === 'position')?.value || [0, 5, 50],
      target: camera.properties?.find((p: any) => p.key === 'target')?.value || [0, 0, 0],
      fov: camera.properties?.find((p: any) => p.key === 'fov')?.value || 75,
    };
  }

  /**
   * Extract dependencies from a reactive expression
   */
  private static extractDependencies(expression: string): string[] {
    if (typeof expression !== 'string') {
      return [];
    }

    // Simple regex to find QuestProgress.* references
    const matches = expression.match(/QuestProgress\.\w+(\.\w+)*/g);
    return matches ? [...new Set(matches)] : [];
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick function to parse the library-interactive.holo file
 */
export async function parseLibraryInteractive(): Promise<SceneConfig> {
  return HoloScriptParser.parseFile('/src/zones/library-interactive.holo');
}

/**
 * Parse any .holo file from the zones directory
 */
export async function parseZone(zoneName: string): Promise<SceneConfig> {
  return HoloScriptParser.parseFile(`/src/zones/${zoneName}.holo`);
}
