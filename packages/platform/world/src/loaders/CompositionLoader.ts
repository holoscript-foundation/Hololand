/**
 * CompositionLoader - The Bridge from .holo to Runtime
 * 
 * Converts any HoloScript composition into a live HololandWorld.
 * This is the core of making HoloScript actually executable.
 */

import { parseHolo, parseHoloScriptPlus } from '@holoscript/core';
import type {
  HoloComposition,
  HoloEnvironment,
  HoloTemplate,
  HoloObjectDecl,
  HoloSpatialGroup,
  HoloLogic,
} from '@holoscript/core';
import { HololandWorld } from '../HololandWorld';
import type { SpatialObjectConfig } from '../SpatialObject';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR PROPERTY EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

// Generic property type that matches all HoloXxxProperty interfaces
interface GenericProperty {
  key: string;
  value: unknown; // Use unknown to handle all property value types
}

function getProp<T = unknown>(props: unknown[] | undefined, key: string): T | undefined {
  if (!props) return undefined;
  const found = (props as GenericProperty[]).find(p => p.key === key);
  return found ? found.value as T : undefined;
}

function getPropsAsRecord(props: unknown[] | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!props) return result;
  for (const p of props as GenericProperty[]) {
    result[p.key] = p.value;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LoadedComposition {
  world: HololandWorld;
  state: Record<string, unknown>;
  logic: CompositionLogic;
  templates: Map<string, TemplateDefinition>;
  environment: EnvironmentConfig;
}

export interface TemplateDefinition {
  name: string;
  traits: string[];
  state: Record<string, unknown>;
  actions: Map<string, ActionDefinition>;
  children: HoloObjectDecl[];
}

export interface ActionDefinition {
  name: string;
  params: string[];
  body: unknown;
}

export interface EnvironmentConfig {
  theme?: string;
  skybox?: string;
  ambientLight?: number;
  grid?: boolean;
  fog?: { color: string; near: number; far: number };
}

export interface CompositionLogic {
  actions: Map<string, ActionDefinition>;
  eventHandlers: Map<string, ActionDefinition>;
  frameHandlers: ActionDefinition[];
  keyboardHandlers: Map<string, ActionDefinition>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITION LOADER
// ═══════════════════════════════════════════════════════════════════════════

export class CompositionLoader {
  private world: HololandWorld;
  private templates: Map<string, TemplateDefinition> = new Map();
  private state: Record<string, unknown> = {};
  private logic: CompositionLogic = {
    actions: new Map(),
    eventHandlers: new Map(),
    frameHandlers: [],
    keyboardHandlers: new Map()
  };
  private environment: EnvironmentConfig = {};
  
  constructor(worldName: string = 'HoloScript World') {
    this.world = new HololandWorld({ name: worldName });
  }
  
  /**
   * Load a HoloScript source file (.holo or .hsplus)
   */
  load(source: string, fileType: 'holo' | 'hsplus' | 'hs' = 'holo'): LoadedComposition {
    if (fileType === 'holo') {
      const result = parseHolo(source);
      if (!result.success || !result.ast) {
        throw new CompositionError('Parse failed', result.errors || []);
      }
      this.processHoloComposition(result.ast);
    } else {
      const result = parseHoloScriptPlus(source);
      if (!result.success) {
        throw new CompositionError('Parse failed', result.errors || []);
      }
      this.processHsPlusAST(result.ast);
    }
    
    return {
      world: this.world,
      state: this.state,
      logic: this.logic,
      templates: this.templates,
      environment: this.environment
    };
  }
  
  /**
   * Process a .holo composition
   */
  private processHoloComposition(composition: HoloComposition): void {
    // Set world name
    if (composition.name) {
      this.world = new HololandWorld({ name: composition.name });
    }
    
    // Process environment
    if (composition.environment) {
      this.processEnvironment(composition.environment);
    }
    
    // Process state - extract from properties array
    if (composition.state) {
      this.state = getPropsAsRecord(composition.state.properties);
    }
    
    // Process templates
    for (const template of composition.templates || []) {
      this.processTemplate(template);
    }
    
    // Process spatial groups and objects
    for (const group of composition.spatialGroups || []) {
      this.processSpatialGroup(group);
    }
    
    for (const obj of composition.objects || []) {
      this.processObject(obj);
    }
    
    // Process logic
    if (composition.logic) {
      this.processLogic(composition.logic);
    }
  }
  
  /**
   * Process environment block - extract from properties array
   */
  private processEnvironment(env: HoloEnvironment): void {
    this.environment = {
      theme: getProp<string>(env.properties, 'theme'),
      skybox: getProp<string>(env.properties, 'skybox'),
      ambientLight: getProp<number>(env.properties, 'ambient_light'),
      grid: getProp<boolean>(env.properties, 'grid'),
      fog: getProp<{ color: string; near: number; far: number }>(env.properties, 'fog')
    };
  }
  
  /**
   * Process template definition - extract from properties
   */
  private processTemplate(template: HoloTemplate): void {
    // Extract traits from properties (traits might be stored as a property)
    const traitsFromProps = getProp<string[]>(template.properties, 'traits') || [];
    
    const def: TemplateDefinition = {
      name: template.name,
      traits: traitsFromProps,
      state: template.state ? getPropsAsRecord(template.state.properties) : {},
      actions: new Map(),
      children: [] // Templates in .holo don't have direct children in the spec
    };
    
    for (const action of template.actions || []) {
      def.actions.set(action.name, {
        name: action.name,
        params: action.parameters?.map(p => p.name) || [],
        body: action.body
      });
    }
    
    this.templates.set(template.name, def);
  }
  
  /**
   * Process spatial group - extract position from properties
   */
  private processSpatialGroup(
    group: HoloSpatialGroup, 
    parentOffset?: { x: number; y: number; z: number }
  ): void {
    const positionValue = getProp(group.properties, 'position');
    const groupPos = this.parsePosition(positionValue);
    const offset = parentOffset 
      ? { x: groupPos.x + parentOffset.x, y: groupPos.y + parentOffset.y, z: groupPos.z + parentOffset.z }
      : groupPos;
    
    for (const obj of group.objects || []) {
      this.processObject(obj, offset);
    }
    
    for (const subGroup of group.groups || []) {
      this.processSpatialGroup(subGroup, offset);
    }
  }
  
  /**
   * Process object declaration - extract from properties
   */
  private processObject(
    obj: HoloObjectDecl,
    offset?: { x: number; y: number; z: number }
  ): void {
    // Extract values from properties array
    const positionValue = getProp(obj.properties, 'position');
    let position = this.parsePosition(positionValue);
    if (offset) {
      position.x += offset.x;
      position.y += offset.y;
      position.z += offset.z;
    }
    
    // Apply template if using one
    let template: TemplateDefinition | undefined;
    const templateName = obj.template; // "using" clause is stored as template
    if (templateName) {
      template = this.templates.get(templateName);
    }
    
    // Get all properties
    const allProps = getPropsAsRecord(obj.properties);
    const geometry = getProp<string>(obj.properties, 'geometry') || 'box';
    const size = getProp(obj.properties, 'size');
    const scale = getProp(obj.properties, 'scale');
    const color = getProp<string>(obj.properties, 'color');
    const material = getProp<string>(obj.properties, 'material');
    const traits = getProp<string[]>(obj.properties, 'traits') || [];
    
    const config: SpatialObjectConfig = {
      id: obj.name,
      type: geometry,
      position,
      scale: this.parseScale(size || scale),
      metadata: {
        ...template?.state,
        ...allProps,
        traits: [...traits, ...(template?.traits || [])],
        color: color,
        material: material
      }
    };
    
    this.world.addObject(config);
    
    // Process nested objects
    for (const child of obj.children || []) {
      this.processObject(child, position);
    }
  }
  
  /**
   * Process logic block - uses proper HoloLogic types
   */
  private processLogic(logic: HoloLogic): void {
    // Process actions from logic block
    for (const action of logic.actions || []) {
      this.logic.actions.set(action.name, {
        name: action.name,
        params: action.parameters?.map(p => p.name) || [],
        body: action.body
      });
    }
    
    // Process event handlers
    for (const handler of logic.handlers || []) {
      if (handler.event === 'frame') {
        this.logic.frameHandlers.push({
          name: 'on_frame',
          params: [],
          body: handler.body
        });
      } else if (handler.event === 'keydown') {
        this.logic.keyboardHandlers.set('on_keydown', {
          name: 'on_keydown',
          params: ['event'],
          body: handler.body
        });
      } else {
        this.logic.eventHandlers.set(handler.event, {
          name: handler.event,
          params: handler.parameters?.map(p => p.name) || ['event'],
          body: handler.body
        });
      }
    }
  }
  
  /**
   * Process .hsplus AST (traditional Object-centric format)
   */
  private processHsPlusAST(ast: any): void {
    const directives = ast.body || ast.root?.directives || [];
    
    for (const d of directives) {
      if (d.type === 'orb' || d.type === 'object') {
        this.processHsPlusObject(d);
      } else if (d.type === 'function') {
        this.logic.actions.set(d.name, {
          name: d.name,
          params: d.params || [],
          body: d.body
        });
      }
    }
  }
  
  /**
   * Process hsplus object/orb directive
   */
  private processHsPlusObject(d: any): void {
    const config: SpatialObjectConfig = {
      id: d.name,
      type: d.type === 'orb' ? 'sphere' : (d.props?.geometry || 'box'),
      position: this.parsePosition(d.props?.position),
      scale: this.parseScale(d.props?.scale),
      metadata: {
        ...d.props,
        traits: d.traits || []
      }
    };
    
    this.world.addObject(config);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private parsePosition(pos: unknown): { x: number; y: number; z: number } {
    if (!pos) return { x: 0, y: 0, z: 0 };
    if (Array.isArray(pos)) {
      return { 
        x: Number(pos[0]) || 0, 
        y: Number(pos[1]) || 0, 
        z: Number(pos[2]) || 0 
      };
    }
    if (typeof pos === 'object') {
      const p = pos as any;
      return { 
        x: Number(p.x) || 0, 
        y: Number(p.y) || 0, 
        z: Number(p.z) || 0 
      };
    }
    return { x: 0, y: 0, z: 0 };
  }
  
  private parseScale(scale: unknown): { x: number; y: number; z: number } {
    if (!scale) return { x: 1, y: 1, z: 1 };
    if (typeof scale === 'number') {
      return { x: scale, y: scale, z: scale };
    }
    if (Array.isArray(scale)) {
      if (scale.length === 2) {
        return { x: Number(scale[0]) || 1, y: Number(scale[1]) || 1, z: 1 };
      }
      return { 
        x: Number(scale[0]) || 1, 
        y: Number(scale[1]) || 1, 
        z: Number(scale[2]) || 1 
      };
    }
    if (typeof scale === 'object') {
      const s = scale as any;
      return { 
        x: Number(s.x) || 1, 
        y: Number(s.y) || 1, 
        z: Number(s.z) || 1 
      };
    }
    return { x: 1, y: 1, z: 1 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class CompositionError extends Error {
  constructor(message: string, public errors: unknown[]) {
    super(`${message}: ${JSON.stringify(errors)}`);
    this.name = 'CompositionError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export function loadComposition(source: string, fileType: 'holo' | 'hsplus' | 'hs' = 'holo'): LoadedComposition {
  const loader = new CompositionLoader();
  return loader.load(source, fileType);
}

export function loadHolo(source: string): LoadedComposition {
  return loadComposition(source, 'holo');
}

export function loadHsPlus(source: string): LoadedComposition {
  return loadComposition(source, 'hsplus');
}
