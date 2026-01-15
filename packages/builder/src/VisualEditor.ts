/**
 * Visual Editor for Hololand
 *
 * A visual, node-based editor for building VR/AR worlds without writing code.
 * Features drag-and-drop scene building, visual scripting, and real-time preview.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface SceneNode {
  id: string;
  name: string;
  type: SceneNodeType;
  transform: Transform;
  parent: string | null;
  children: string[];
  components: ComponentInstance[];
  visible: boolean;
  locked: boolean;
  metadata: Record<string, unknown>;
}

export type SceneNodeType =
  | 'empty'
  | 'mesh'
  | 'light'
  | 'camera'
  | 'audio'
  | 'trigger'
  | 'spawn'
  | 'group'
  | 'prefab';

export interface ComponentInstance {
  id: string;
  componentType: string;
  properties: Record<string, unknown>;
  enabled: boolean;
}

export interface AssetReference {
  id: string;
  type: AssetType;
  path: string;
  name: string;
  thumbnail?: string;
  metadata: Record<string, unknown>;
}

export type AssetType =
  | 'model'
  | 'texture'
  | 'material'
  | 'audio'
  | 'script'
  | 'prefab'
  | 'animation';

// Visual Scripting Types
export interface VisualScriptNode {
  id: string;
  type: VisualNodeType;
  position: { x: number; y: number };
  inputs: NodePort[];
  outputs: NodePort[];
  properties: Record<string, unknown>;
}

export type VisualNodeType =
  | 'event'
  | 'action'
  | 'condition'
  | 'variable'
  | 'math'
  | 'logic'
  | 'flow'
  | 'custom';

export interface NodePort {
  id: string;
  name: string;
  type: PortType;
  connected: string[];
  value?: unknown;
}

export type PortType =
  | 'flow'
  | 'boolean'
  | 'number'
  | 'string'
  | 'vector3'
  | 'object'
  | 'any';

export interface VisualScriptConnection {
  id: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
}

export interface VisualScript {
  id: string;
  name: string;
  nodes: Map<string, VisualScriptNode>;
  connections: VisualScriptConnection[];
  variables: ScriptVariable[];
}

export interface ScriptVariable {
  id: string;
  name: string;
  type: PortType;
  defaultValue: unknown;
  exposed: boolean;
}

// Editor State
export interface EditorState {
  scene: Scene;
  selectedNodes: string[];
  clipboard: SceneNode[];
  history: HistoryEntry[];
  historyIndex: number;
  viewport: ViewportState;
  grid: GridSettings;
  snap: SnapSettings;
  mode: EditorMode;
  tool: EditorTool;
}

export interface Scene {
  id: string;
  name: string;
  nodes: Map<string, SceneNode>;
  rootNodes: string[];
  scripts: Map<string, VisualScript>;
  assets: Map<string, AssetReference>;
  settings: SceneSettings;
}

export interface SceneSettings {
  skybox?: string;
  ambientLight: { color: string; intensity: number };
  fog?: { color: string; near: number; far: number };
  physics: { gravity: Vector3; enabled: boolean };
}

export interface ViewportState {
  camera: {
    position: Vector3;
    target: Vector3;
    fov: number;
    near: number;
    far: number;
  };
  renderMode: 'shaded' | 'wireframe' | 'unlit';
  showGizmos: boolean;
  showGrid: boolean;
  showBounds: boolean;
}

export interface GridSettings {
  size: number;
  divisions: number;
  visible: boolean;
}

export interface SnapSettings {
  position: { enabled: boolean; value: number };
  rotation: { enabled: boolean; value: number };
  scale: { enabled: boolean; value: number };
}

export type EditorMode = 'edit' | 'play' | 'pause';
export type EditorTool = 'select' | 'move' | 'rotate' | 'scale' | 'paint' | 'sculpt';

export interface HistoryEntry {
  type: string;
  timestamp: number;
  data: unknown;
  undo: () => void;
  redo: () => void;
}

export interface EditorEvent {
  type: EditorEventType;
  data: unknown;
}

export type EditorEventType =
  | 'node:created'
  | 'node:deleted'
  | 'node:updated'
  | 'node:selected'
  | 'node:deselected'
  | 'script:created'
  | 'script:updated'
  | 'asset:imported'
  | 'scene:saved'
  | 'scene:loaded'
  | 'mode:changed'
  | 'tool:changed'
  | 'history:undo'
  | 'history:redo';

export type EditorEventListener = (event: EditorEvent) => void;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultTransform(): Transform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function cloneTransform(t: Transform): Transform {
  return {
    position: { ...t.position },
    rotation: { ...t.rotation },
    scale: { ...t.scale },
  };
}

function cloneNode(node: SceneNode): SceneNode {
  return {
    ...node,
    id: generateId(),
    transform: cloneTransform(node.transform),
    children: [...node.children],
    components: node.components.map(c => ({ ...c, id: generateId() })),
    metadata: { ...node.metadata },
  };
}

// =============================================================================
// SCENE MANAGER
// =============================================================================

/**
 * Manages the scene graph and provides operations for scene manipulation
 */
export class SceneManager {
  private scene: Scene;
  private listeners: Set<EditorEventListener> = new Set();

  constructor(name: string = 'Untitled Scene') {
    this.scene = this.createEmptyScene(name);
  }

  private createEmptyScene(name: string): Scene {
    return {
      id: generateId(),
      name,
      nodes: new Map(),
      rootNodes: [],
      scripts: new Map(),
      assets: new Map(),
      settings: {
        ambientLight: { color: '#404040', intensity: 0.5 },
        physics: { gravity: { x: 0, y: -9.81, z: 0 }, enabled: true },
      },
    };
  }

  getScene(): Scene {
    return this.scene;
  }

  // Node Operations
  createNode(type: SceneNodeType, name?: string, parent?: string): SceneNode {
    const node: SceneNode = {
      id: generateId(),
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      transform: createDefaultTransform(),
      parent: parent || null,
      children: [],
      components: [],
      visible: true,
      locked: false,
      metadata: {},
    };

    this.scene.nodes.set(node.id, node);

    if (parent) {
      const parentNode = this.scene.nodes.get(parent);
      if (parentNode) {
        parentNode.children.push(node.id);
      }
    } else {
      this.scene.rootNodes.push(node.id);
    }

    this.emit({ type: 'node:created', data: node });
    return node;
  }

  deleteNode(id: string): boolean {
    const node = this.scene.nodes.get(id);
    if (!node) return false;

    // Delete children recursively
    for (const childId of [...node.children]) {
      this.deleteNode(childId);
    }

    // Remove from parent
    if (node.parent) {
      const parent = this.scene.nodes.get(node.parent);
      if (parent) {
        parent.children = parent.children.filter(c => c !== id);
      }
    } else {
      this.scene.rootNodes = this.scene.rootNodes.filter(r => r !== id);
    }

    this.scene.nodes.delete(id);
    this.emit({ type: 'node:deleted', data: { id } });
    return true;
  }

  getNode(id: string): SceneNode | undefined {
    return this.scene.nodes.get(id);
  }

  updateNode(id: string, updates: Partial<SceneNode>): boolean {
    const node = this.scene.nodes.get(id);
    if (!node) return false;

    Object.assign(node, updates);
    this.emit({ type: 'node:updated', data: { id, updates } });
    return true;
  }

  setNodeTransform(id: string, transform: Partial<Transform>): boolean {
    const node = this.scene.nodes.get(id);
    if (!node) return false;

    if (transform.position) Object.assign(node.transform.position, transform.position);
    if (transform.rotation) Object.assign(node.transform.rotation, transform.rotation);
    if (transform.scale) Object.assign(node.transform.scale, transform.scale);

    this.emit({ type: 'node:updated', data: { id, transform } });
    return true;
  }

  reparentNode(id: string, newParentId: string | null): boolean {
    const node = this.scene.nodes.get(id);
    if (!node) return false;

    // Remove from old parent
    if (node.parent) {
      const oldParent = this.scene.nodes.get(node.parent);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(c => c !== id);
      }
    } else {
      this.scene.rootNodes = this.scene.rootNodes.filter(r => r !== id);
    }

    // Add to new parent
    if (newParentId) {
      const newParent = this.scene.nodes.get(newParentId);
      if (newParent) {
        newParent.children.push(id);
        node.parent = newParentId;
      } else {
        return false;
      }
    } else {
      this.scene.rootNodes.push(id);
      node.parent = null;
    }

    this.emit({ type: 'node:updated', data: { id, parent: newParentId } });
    return true;
  }

  duplicateNode(id: string): SceneNode | null {
    const node = this.scene.nodes.get(id);
    if (!node) return null;

    const clone = cloneNode(node);
    clone.name = `${node.name} (Copy)`;

    this.scene.nodes.set(clone.id, clone);

    if (node.parent) {
      const parent = this.scene.nodes.get(node.parent);
      if (parent) {
        parent.children.push(clone.id);
      }
    } else {
      this.scene.rootNodes.push(clone.id);
    }

    this.emit({ type: 'node:created', data: clone });
    return clone;
  }

  // Component Operations
  addComponent(nodeId: string, componentType: string, properties: Record<string, unknown> = {}): ComponentInstance | null {
    const node = this.scene.nodes.get(nodeId);
    if (!node) return null;

    const component: ComponentInstance = {
      id: generateId(),
      componentType,
      properties,
      enabled: true,
    };

    node.components.push(component);
    this.emit({ type: 'node:updated', data: { id: nodeId, componentAdded: component } });
    return component;
  }

  removeComponent(nodeId: string, componentId: string): boolean {
    const node = this.scene.nodes.get(nodeId);
    if (!node) return false;

    const idx = node.components.findIndex(c => c.id === componentId);
    if (idx === -1) return false;

    node.components.splice(idx, 1);
    this.emit({ type: 'node:updated', data: { id: nodeId, componentRemoved: componentId } });
    return true;
  }

  // Query Operations
  findNodesByType(type: SceneNodeType): SceneNode[] {
    return Array.from(this.scene.nodes.values()).filter(n => n.type === type);
  }

  findNodesByName(name: string, exact: boolean = false): SceneNode[] {
    const lowerName = name.toLowerCase();
    return Array.from(this.scene.nodes.values()).filter(n =>
      exact ? n.name === name : n.name.toLowerCase().includes(lowerName)
    );
  }

  getDescendants(id: string): SceneNode[] {
    const node = this.scene.nodes.get(id);
    if (!node) return [];

    const descendants: SceneNode[] = [];
    const stack = [...node.children];

    while (stack.length > 0) {
      const childId = stack.pop()!;
      const child = this.scene.nodes.get(childId);
      if (child) {
        descendants.push(child);
        stack.push(...child.children);
      }
    }

    return descendants;
  }

  // Events
  on(listener: EditorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EditorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Editor event listener error:', e);
      }
    }
  }

  // Serialization
  serialize(): string {
    const data = {
      id: this.scene.id,
      name: this.scene.name,
      nodes: Array.from(this.scene.nodes.entries()),
      rootNodes: this.scene.rootNodes,
      scripts: Array.from(this.scene.scripts.entries()).map(([id, script]) => ({
        id,
        name: script.name,
        nodes: Array.from(script.nodes.entries()),
        connections: script.connections,
        variables: script.variables,
      })),
      assets: Array.from(this.scene.assets.entries()),
      settings: this.scene.settings,
    };
    return JSON.stringify(data, null, 2);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.scene = {
      id: data.id,
      name: data.name,
      nodes: new Map(data.nodes),
      rootNodes: data.rootNodes,
      scripts: new Map(data.scripts?.map((s: { id: string; name: string; nodes: [string, VisualScriptNode][]; connections: VisualScriptConnection[]; variables: ScriptVariable[] }) => [
        s.id,
        { id: s.id, name: s.name, nodes: new Map(s.nodes), connections: s.connections, variables: s.variables },
      ]) || []),
      assets: new Map(data.assets || []),
      settings: data.settings,
    };
    this.emit({ type: 'scene:loaded', data: { id: this.scene.id } });
  }
}

// =============================================================================
// VISUAL SCRIPT EDITOR
// =============================================================================

/**
 * Visual scripting system for node-based programming
 */
export class VisualScriptEditor {
  private scripts: Map<string, VisualScript> = new Map();
  private activeScriptId: string | null = null;
  private nodeTemplates: Map<string, NodeTemplate> = new Map();

  constructor() {
    this.registerBuiltinNodes();
  }

  private registerBuiltinNodes(): void {
    // Event nodes
    this.registerNodeTemplate({
      type: 'event',
      name: 'On Start',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'event',
      name: 'On Update',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'Delta Time', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'event',
      name: 'On Collision Enter',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'Other', type: 'object' }],
    });

    this.registerNodeTemplate({
      type: 'event',
      name: 'On Trigger Enter',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'Other', type: 'object' }],
    });

    this.registerNodeTemplate({
      type: 'event',
      name: 'On Interact',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'User', type: 'object' }],
    });

    this.registerNodeTemplate({
      type: 'event',
      name: 'On Voice Command',
      category: 'Events',
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'Command', type: 'string' }],
    });

    // Action nodes
    this.registerNodeTemplate({
      type: 'action',
      name: 'Set Position',
      category: 'Transform',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Target', type: 'object' }, { name: 'Position', type: 'vector3' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Move Towards',
      category: 'Transform',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Target', type: 'object' }, { name: 'Position', type: 'vector3' }, { name: 'Speed', type: 'number' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Rotate',
      category: 'Transform',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Target', type: 'object' }, { name: 'Euler', type: 'vector3' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Play Sound',
      category: 'Audio',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Sound', type: 'string' }, { name: 'Volume', type: 'number' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Spawn Object',
      category: 'Objects',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Prefab', type: 'string' }, { name: 'Position', type: 'vector3' }],
      outputs: [{ name: 'Flow', type: 'flow' }, { name: 'Spawned', type: 'object' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Destroy Object',
      category: 'Objects',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Target', type: 'object' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Show Notification',
      category: 'UI',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Message', type: 'string' }, { name: 'Duration', type: 'number' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'action',
      name: 'Teleport User',
      category: 'User',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Position', type: 'vector3' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
    });

    // Condition nodes
    this.registerNodeTemplate({
      type: 'condition',
      name: 'Branch',
      category: 'Flow',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Condition', type: 'boolean' }],
      outputs: [{ name: 'True', type: 'flow' }, { name: 'False', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'condition',
      name: 'Compare',
      category: 'Logic',
      inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
      outputs: [{ name: 'Equal', type: 'boolean' }, { name: 'Less', type: 'boolean' }, { name: 'Greater', type: 'boolean' }],
      properties: { operator: '==' },
    });

    // Math nodes
    this.registerNodeTemplate({
      type: 'math',
      name: 'Add',
      category: 'Math',
      inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
      outputs: [{ name: 'Result', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Subtract',
      category: 'Math',
      inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
      outputs: [{ name: 'Result', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Multiply',
      category: 'Math',
      inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
      outputs: [{ name: 'Result', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Divide',
      category: 'Math',
      inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
      outputs: [{ name: 'Result', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Random Range',
      category: 'Math',
      inputs: [{ name: 'Min', type: 'number' }, { name: 'Max', type: 'number' }],
      outputs: [{ name: 'Result', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Distance',
      category: 'Math',
      inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'vector3' }],
      outputs: [{ name: 'Distance', type: 'number' }],
    });

    this.registerNodeTemplate({
      type: 'math',
      name: 'Vector3',
      category: 'Math',
      inputs: [{ name: 'X', type: 'number' }, { name: 'Y', type: 'number' }, { name: 'Z', type: 'number' }],
      outputs: [{ name: 'Vector', type: 'vector3' }],
    });

    // Flow control
    this.registerNodeTemplate({
      type: 'flow',
      name: 'Sequence',
      category: 'Flow',
      inputs: [{ name: 'Flow', type: 'flow' }],
      outputs: [{ name: 'Then 0', type: 'flow' }, { name: 'Then 1', type: 'flow' }, { name: 'Then 2', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'flow',
      name: 'For Loop',
      category: 'Flow',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Count', type: 'number' }],
      outputs: [{ name: 'Loop Body', type: 'flow' }, { name: 'Index', type: 'number' }, { name: 'Completed', type: 'flow' }],
    });

    this.registerNodeTemplate({
      type: 'flow',
      name: 'Delay',
      category: 'Flow',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Duration', type: 'number' }],
      outputs: [{ name: 'Then', type: 'flow' }],
    });

    // Variable nodes
    this.registerNodeTemplate({
      type: 'variable',
      name: 'Get Variable',
      category: 'Variables',
      inputs: [],
      outputs: [{ name: 'Value', type: 'any' }],
      properties: { variableName: '' },
    });

    this.registerNodeTemplate({
      type: 'variable',
      name: 'Set Variable',
      category: 'Variables',
      inputs: [{ name: 'Flow', type: 'flow' }, { name: 'Value', type: 'any' }],
      outputs: [{ name: 'Flow', type: 'flow' }],
      properties: { variableName: '' },
    });
  }

  registerNodeTemplate(template: NodeTemplate): void {
    this.nodeTemplates.set(template.name, template);
  }

  getNodeTemplates(): NodeTemplate[] {
    return Array.from(this.nodeTemplates.values());
  }

  getTemplatesByCategory(): Map<string, NodeTemplate[]> {
    const categories = new Map<string, NodeTemplate[]>();
    for (const template of this.nodeTemplates.values()) {
      const list = categories.get(template.category) || [];
      list.push(template);
      categories.set(template.category, list);
    }
    return categories;
  }

  createScript(name: string): VisualScript {
    const script: VisualScript = {
      id: generateId(),
      name,
      nodes: new Map(),
      connections: [],
      variables: [],
    };
    this.scripts.set(script.id, script);
    return script;
  }

  getScript(id: string): VisualScript | undefined {
    return this.scripts.get(id);
  }

  setActiveScript(id: string | null): void {
    this.activeScriptId = id;
  }

  getActiveScript(): VisualScript | null {
    return this.activeScriptId ? this.scripts.get(this.activeScriptId) || null : null;
  }

  createNode(scriptId: string, templateName: string, position: { x: number; y: number }): VisualScriptNode | null {
    const script = this.scripts.get(scriptId);
    const template = this.nodeTemplates.get(templateName);
    if (!script || !template) return null;

    const node: VisualScriptNode = {
      id: generateId(),
      type: template.type,
      position,
      inputs: (template.inputs || []).map(p => ({
        id: generateId(),
        name: p.name,
        type: p.type,
        connected: [],
      })),
      outputs: (template.outputs || []).map(p => ({
        id: generateId(),
        name: p.name,
        type: p.type,
        connected: [],
      })),
      properties: { _template: templateName, ...template.properties },
    };

    script.nodes.set(node.id, node);
    return node;
  }

  deleteNode(scriptId: string, nodeId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    // Remove all connections to/from this node
    script.connections = script.connections.filter(c =>
      c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
    );

    return script.nodes.delete(nodeId);
  }

  connect(scriptId: string, from: { nodeId: string; portId: string }, to: { nodeId: string; portId: string }): VisualScriptConnection | null {
    const script = this.scripts.get(scriptId);
    if (!script) return null;

    const fromNode = script.nodes.get(from.nodeId);
    const toNode = script.nodes.get(to.nodeId);
    if (!fromNode || !toNode) return null;

    const fromPort = fromNode.outputs.find(p => p.id === from.portId);
    const toPort = toNode.inputs.find(p => p.id === to.portId);
    if (!fromPort || !toPort) return null;

    // Type check (flow connects to flow, or any matches, or same type)
    if (fromPort.type !== toPort.type &&
        fromPort.type !== 'any' &&
        toPort.type !== 'any' &&
        !(fromPort.type === 'flow' && toPort.type === 'flow')) {
      return null;
    }

    const connection: VisualScriptConnection = {
      id: generateId(),
      from,
      to,
    };

    fromPort.connected.push(connection.id);
    toPort.connected.push(connection.id);
    script.connections.push(connection);

    return connection;
  }

  disconnect(scriptId: string, connectionId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    const connIdx = script.connections.findIndex(c => c.id === connectionId);
    if (connIdx === -1) return false;

    const connection = script.connections[connIdx];

    // Remove from ports
    const fromNode = script.nodes.get(connection.from.nodeId);
    const toNode = script.nodes.get(connection.to.nodeId);

    if (fromNode) {
      const port = fromNode.outputs.find(p => p.id === connection.from.portId);
      if (port) {
        port.connected = port.connected.filter(c => c !== connectionId);
      }
    }

    if (toNode) {
      const port = toNode.inputs.find(p => p.id === connection.to.portId);
      if (port) {
        port.connected = port.connected.filter(c => c !== connectionId);
      }
    }

    script.connections.splice(connIdx, 1);
    return true;
  }

  addVariable(scriptId: string, name: string, type: PortType, defaultValue: unknown = null): ScriptVariable | null {
    const script = this.scripts.get(scriptId);
    if (!script) return null;

    const variable: ScriptVariable = {
      id: generateId(),
      name,
      type,
      defaultValue,
      exposed: false,
    };

    script.variables.push(variable);
    return variable;
  }

  removeVariable(scriptId: string, variableId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    const idx = script.variables.findIndex(v => v.id === variableId);
    if (idx === -1) return false;

    script.variables.splice(idx, 1);
    return true;
  }

  // Compile script to executable code
  compile(scriptId: string): CompiledScript | null {
    const script = this.scripts.get(scriptId);
    if (!script) return null;

    // Find entry points (event nodes with no input flow)
    const entryPoints: string[] = [];
    for (const [nodeId, node] of script.nodes) {
      if (node.type === 'event') {
        entryPoints.push(nodeId);
      }
    }

    return {
      id: script.id,
      name: script.name,
      entryPoints,
      nodes: new Map(script.nodes),
      connections: [...script.connections],
      variables: script.variables.map(v => ({ ...v })),
    };
  }
}

export interface NodeTemplate {
  type: VisualNodeType;
  name: string;
  category: string;
  inputs?: { name: string; type: PortType }[];
  outputs?: { name: string; type: PortType }[];
  properties?: Record<string, unknown>;
}

export interface CompiledScript {
  id: string;
  name: string;
  entryPoints: string[];
  nodes: Map<string, VisualScriptNode>;
  connections: VisualScriptConnection[];
  variables: ScriptVariable[];
}

// =============================================================================
// ASSET MANAGER
// =============================================================================

/**
 * Manages project assets like models, textures, and sounds
 */
export class AssetManager {
  private assets: Map<string, AssetReference> = new Map();
  private loaders: Map<AssetType, AssetLoader> = new Map();

  registerLoader(type: AssetType, loader: AssetLoader): void {
    this.loaders.set(type, loader);
  }

  async importAsset(file: File | string, type?: AssetType): Promise<AssetReference | null> {
    const fileName = typeof file === 'string' ? file : file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Determine asset type from extension if not provided
    const assetType = type || this.getTypeFromExtension(ext);
    if (!assetType) return null;

    const asset: AssetReference = {
      id: generateId(),
      type: assetType,
      path: typeof file === 'string' ? file : URL.createObjectURL(file),
      name: fileName.replace(/\.[^.]+$/, ''),
      metadata: {
        extension: ext,
        importedAt: Date.now(),
      },
    };

    // Generate thumbnail if possible
    const loader = this.loaders.get(assetType);
    if (loader?.generateThumbnail) {
      asset.thumbnail = await loader.generateThumbnail(asset.path);
    }

    this.assets.set(asset.id, asset);
    return asset;
  }

  private getTypeFromExtension(ext: string): AssetType | null {
    const typeMap: Record<string, AssetType> = {
      // Models
      gltf: 'model', glb: 'model', obj: 'model', fbx: 'model',
      // Textures
      png: 'texture', jpg: 'texture', jpeg: 'texture', webp: 'texture',
      // Audio
      mp3: 'audio', wav: 'audio', ogg: 'audio',
      // Scripts
      ts: 'script', js: 'script',
    };
    return typeMap[ext] || null;
  }

  getAsset(id: string): AssetReference | undefined {
    return this.assets.get(id);
  }

  getAssetsByType(type: AssetType): AssetReference[] {
    return Array.from(this.assets.values()).filter(a => a.type === type);
  }

  searchAssets(query: string): AssetReference[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.assets.values()).filter(a =>
      a.name.toLowerCase().includes(lowerQuery)
    );
  }

  deleteAsset(id: string): boolean {
    return this.assets.delete(id);
  }

  getAllAssets(): AssetReference[] {
    return Array.from(this.assets.values());
  }
}

export interface AssetLoader {
  load(path: string): Promise<unknown>;
  generateThumbnail?(path: string): Promise<string>;
}

// =============================================================================
// HISTORY MANAGER
// =============================================================================

/**
 * Undo/redo history management
 */
export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxEntries: number;
  private listeners: Set<EditorEventListener> = new Set();

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  push(entry: Omit<HistoryEntry, 'timestamp'>): void {
    // Remove any entries after current index
    this.entries = this.entries.slice(0, this.currentIndex + 1);

    // Add new entry
    this.entries.push({
      ...entry,
      timestamp: Date.now(),
    });

    // Trim if exceeds max
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): boolean {
    if (this.currentIndex < 0) return false;

    const entry = this.entries[this.currentIndex];
    entry.undo();
    this.currentIndex--;

    this.emit({ type: 'history:undo', data: entry });
    return true;
  }

  redo(): boolean {
    if (this.currentIndex >= this.entries.length - 1) return false;

    this.currentIndex++;
    const entry = this.entries[this.currentIndex];
    entry.redo();

    this.emit({ type: 'history:redo', data: entry });
    return true;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
  }

  on(listener: EditorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EditorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// =============================================================================
// VISUAL EDITOR
// =============================================================================

/**
 * Main Visual Editor class that coordinates all editor components
 */
export class VisualEditor {
  readonly scene: SceneManager;
  readonly scripts: VisualScriptEditor;
  readonly assets: AssetManager;
  readonly history: HistoryManager;

  private state: EditorState;
  private listeners: Set<EditorEventListener> = new Set();

  constructor(sceneName?: string) {
    this.scene = new SceneManager(sceneName);
    this.scripts = new VisualScriptEditor();
    this.assets = new AssetManager();
    this.history = new HistoryManager();

    this.state = this.createInitialState();
    this.setupEventListeners();
  }

  private createInitialState(): EditorState {
    return {
      scene: this.scene.getScene(),
      selectedNodes: [],
      clipboard: [],
      history: [],
      historyIndex: -1,
      viewport: {
        camera: {
          position: { x: 5, y: 5, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          fov: 60,
          near: 0.1,
          far: 1000,
        },
        renderMode: 'shaded',
        showGizmos: true,
        showGrid: true,
        showBounds: false,
      },
      grid: { size: 10, divisions: 10, visible: true },
      snap: {
        position: { enabled: false, value: 0.5 },
        rotation: { enabled: false, value: 15 },
        scale: { enabled: false, value: 0.1 },
      },
      mode: 'edit',
      tool: 'select',
    };
  }

  private setupEventListeners(): void {
    this.scene.on(event => this.emit(event));
    this.history.on(event => this.emit(event));
  }

  // Selection
  select(nodeIds: string[]): void {
    const validIds = nodeIds.filter(id => this.scene.getNode(id));
    const previousSelection = [...this.state.selectedNodes];

    this.state.selectedNodes = validIds;

    this.history.push({
      type: 'selection',
      data: { previous: previousSelection, current: validIds },
      undo: () => { this.state.selectedNodes = previousSelection; },
      redo: () => { this.state.selectedNodes = validIds; },
    });

    for (const id of validIds) {
      this.emit({ type: 'node:selected', data: { id } });
    }
  }

  addToSelection(nodeId: string): void {
    if (!this.state.selectedNodes.includes(nodeId) && this.scene.getNode(nodeId)) {
      this.state.selectedNodes.push(nodeId);
      this.emit({ type: 'node:selected', data: { id: nodeId } });
    }
  }

  removeFromSelection(nodeId: string): void {
    const idx = this.state.selectedNodes.indexOf(nodeId);
    if (idx !== -1) {
      this.state.selectedNodes.splice(idx, 1);
      this.emit({ type: 'node:deselected', data: { id: nodeId } });
    }
  }

  clearSelection(): void {
    const previous = [...this.state.selectedNodes];
    for (const id of previous) {
      this.emit({ type: 'node:deselected', data: { id } });
    }
    this.state.selectedNodes = [];
  }

  getSelection(): string[] {
    return [...this.state.selectedNodes];
  }

  // Clipboard
  copy(): void {
    this.state.clipboard = this.state.selectedNodes
      .map(id => this.scene.getNode(id))
      .filter((n): n is SceneNode => n !== undefined)
      .map(n => cloneNode(n));
  }

  cut(): void {
    this.copy();
    for (const id of this.state.selectedNodes) {
      this.scene.deleteNode(id);
    }
    this.state.selectedNodes = [];
  }

  paste(): void {
    const pastedIds: string[] = [];
    for (const node of this.state.clipboard) {
      const pasted = cloneNode(node);
      pasted.transform.position.x += 1;
      pasted.transform.position.z += 1;

      const scene = this.scene.getScene();
      scene.nodes.set(pasted.id, pasted);
      scene.rootNodes.push(pasted.id);

      pastedIds.push(pasted.id);
      this.emit({ type: 'node:created', data: pasted });
    }

    this.state.selectedNodes = pastedIds;
    for (const id of pastedIds) {
      this.emit({ type: 'node:selected', data: { id } });
    }
  }

  // Tools
  setTool(tool: EditorTool): void {
    this.state.tool = tool;
    this.emit({ type: 'tool:changed', data: { tool } });
  }

  getTool(): EditorTool {
    return this.state.tool;
  }

  // Mode
  setMode(mode: EditorMode): void {
    this.state.mode = mode;
    this.emit({ type: 'mode:changed', data: { mode } });
  }

  getMode(): EditorMode {
    return this.state.mode;
  }

  play(): void {
    this.setMode('play');
  }

  pause(): void {
    this.setMode('pause');
  }

  stop(): void {
    this.setMode('edit');
  }

  // Viewport
  setViewport(updates: Partial<ViewportState>): void {
    Object.assign(this.state.viewport, updates);
  }

  getViewport(): ViewportState {
    return { ...this.state.viewport };
  }

  focusOnSelection(): void {
    if (this.state.selectedNodes.length === 0) return;

    // Calculate center of selected nodes
    let center = { x: 0, y: 0, z: 0 };
    let count = 0;

    for (const id of this.state.selectedNodes) {
      const node = this.scene.getNode(id);
      if (node) {
        center.x += node.transform.position.x;
        center.y += node.transform.position.y;
        center.z += node.transform.position.z;
        count++;
      }
    }

    if (count > 0) {
      center.x /= count;
      center.y /= count;
      center.z /= count;

      this.state.viewport.camera.target = center;
    }
  }

  // Snapping
  setSnap(type: 'position' | 'rotation' | 'scale', enabled: boolean, value?: number): void {
    this.state.snap[type].enabled = enabled;
    if (value !== undefined) {
      this.state.snap[type].value = value;
    }
  }

  getSnap(): SnapSettings {
    return { ...this.state.snap };
  }

  applySnap(value: number, type: 'position' | 'rotation' | 'scale'): number {
    const snap = this.state.snap[type];
    if (!snap.enabled) return value;
    return Math.round(value / snap.value) * snap.value;
  }

  // Grid
  setGrid(settings: Partial<GridSettings>): void {
    Object.assign(this.state.grid, settings);
  }

  getGrid(): GridSettings {
    return { ...this.state.grid };
  }

  // Save/Load
  async save(filename?: string): Promise<string> {
    const data = {
      version: '1.0',
      scene: this.scene.serialize(),
      scripts: Array.from(this.scripts['scripts'].entries()).map(([id, script]) => ({
        id,
        ...script,
        nodes: Array.from(script.nodes.entries()),
      })),
      assets: this.assets.getAllAssets(),
      viewport: this.state.viewport,
      settings: {
        grid: this.state.grid,
        snap: this.state.snap,
      },
    };

    const json = JSON.stringify(data, null, 2);

    if (filename && typeof window !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.holo') ? filename : `${filename}.holo`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this.emit({ type: 'scene:saved', data: { filename } });
    return json;
  }

  async load(json: string): Promise<void> {
    const data = JSON.parse(json);

    if (data.version !== '1.0') {
      console.warn('Loading scene from different version:', data.version);
    }

    this.scene.deserialize(data.scene);

    // Load scripts
    if (data.scripts) {
      for (const scriptData of data.scripts) {
        const script = this.scripts.createScript(scriptData.name);
        script.nodes = new Map(scriptData.nodes);
        script.connections = scriptData.connections;
        script.variables = scriptData.variables;
      }
    }

    // Load viewport and settings
    if (data.viewport) {
      this.state.viewport = data.viewport;
    }
    if (data.settings) {
      if (data.settings.grid) this.state.grid = data.settings.grid;
      if (data.settings.snap) this.state.snap = data.settings.snap;
    }

    this.emit({ type: 'scene:loaded', data: {} });
  }

  // Events
  on(listener: EditorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EditorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Editor event error:', e);
      }
    }
  }

  // State access
  getState(): Readonly<EditorState> {
    return this.state;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

let defaultEditor: VisualEditor | null = null;

/**
 * Get or create the default visual editor instance
 */
export function getVisualEditor(): VisualEditor {
  if (!defaultEditor) {
    defaultEditor = new VisualEditor();
  }
  return defaultEditor;
}

/**
 * Create a new visual editor instance
 */
export function createVisualEditor(sceneName?: string): VisualEditor {
  return new VisualEditor(sceneName);
}
