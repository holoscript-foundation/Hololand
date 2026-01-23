/**
 * HoloScript Graph Understanding Tools
 *
 * These tools help AI agents understand .holo files as visual graphs
 * instead of just code. Agents can:
 * - Parse .holo into graph structure (nodes, edges, flow)
 * - Visualize the flow of events/actions
 * - Understand connections between objects
 * - Generate graph-first before code
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// TYPES FOR GRAPH REPRESENTATION
// =============================================================================

export interface HoloNode {
  id: string;
  name: string;
  type: 'template' | 'object' | 'orb' | 'building' | 'npc' | 'collectible' | 'group' | 'environment';
  position?: [number, number, number];
  properties: Record<string, unknown>;
  state?: Record<string, unknown>;
  actions?: string[];
  traits?: string[];
}

export interface HoloEdge {
  id: string;
  from: string;
  to: string;
  type: 'uses' | 'triggers' | 'contains' | 'references' | 'flow';
  event?: string;
  action?: string;
  label?: string;
}

export interface HoloFlow {
  trigger: string;
  event: string;
  actions: Array<{
    target: string;
    action: string;
    args?: unknown[];
  }>;
}

export interface HoloGraph {
  name: string;
  nodes: HoloNode[];
  edges: HoloEdge[];
  flows: HoloFlow[];
  groups: Array<{
    id: string;
    name: string;
    children: string[];
  }>;
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const holoGraphTools: Tool[] = [
  {
    name: 'holo_parse_to_graph',
    description: `Parse a .holo file and return its graph representation. This helps you understand the visual structure:
- **Nodes**: All objects, templates, orbs, NPCs, etc.
- **Edges**: Connections between nodes (uses, triggers, contains)
- **Flows**: Event-to-action chains (what happens when X occurs)
- **Groups**: Spatial groupings of nodes

Use this to "see" the architecture before modifying code.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to parse into a graph',
        },
        filePath: {
          type: 'string',
          description: 'Or provide a file path to read and parse',
        },
      },
    },
  },

  {
    name: 'holo_visualize_flow',
    description: `Visualize the event/action flow in a .holo file as ASCII diagram. Returns something like:
\`\`\`
[User] ──wave──→ [Goblin_A] ──throw_rock()──→ [Rock] ──hit──→ [User]
                     ↓
               [Goblin_B] ──throw_rock()──→ [Rock]
\`\`\`
This helps you understand the control flow and data flow in the scene.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to visualize',
        },
        focus: {
          type: 'string',
          description: 'Focus on a specific node or event (optional)',
        },
      },
      required: ['code'],
    },
  },

  {
    name: 'holo_get_node_connections',
    description: `Get all connections for a specific node in a .holo file. Returns:
- What this node **receives** (incoming events/triggers)
- What this node **sends** (outgoing actions/events)
- What **contains** this node (parent groups)
- What this node **contains** (children)
- What **template** this node uses`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to analyze',
        },
        nodeName: {
          type: 'string',
          description: 'Name of the node to inspect (e.g., "Goblin_A", "Player")',
        },
      },
      required: ['code', 'nodeName'],
    },
  },

  {
    name: 'holo_design_graph',
    description: `Given a natural language description, design the graph structure BEFORE writing code. Returns:
- Suggested nodes and their types
- Connections between nodes
- Event flows
- Recommended spatial groupings

Use this to plan your .holo file as a visual architecture first.`,
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'What you want to create (e.g., "A shop with NPCs that sell items")',
        },
        constraints: {
          type: 'object',
          description: 'Optional constraints (maxNodes, requiredTypes, etc.)',
        },
      },
      required: ['description'],
    },
  },

  {
    name: 'holo_diff_graphs',
    description: `Compare two .holo files as graphs and show what changed:
- Added/removed nodes
- Changed connections
- Modified flows
- New/removed groups

Helps understand the impact of changes.`,
    inputSchema: {
      type: 'object',
      properties: {
        before: {
          type: 'string',
          description: 'Original HoloScript code',
        },
        after: {
          type: 'string',
          description: 'Modified HoloScript code',
        },
      },
      required: ['before', 'after'],
    },
  },

  {
    name: 'holo_suggest_connections',
    description: `Given existing nodes in a .holo file, suggest potential connections and flows you might want to add. For example:
- "Player and Enemy exist but have no interaction - add combat flow?"
- "Collectibles exist but no collection event - add on_interact?"`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Current HoloScript code to analyze',
        },
        intent: {
          type: 'string',
          description: 'What kind of behavior you want (optional)',
        },
      },
      required: ['code'],
    },
  },
];

// =============================================================================
// PARSER - Extract graph from .holo code
// =============================================================================

/**
 * Simple regex-based parser to extract graph structure from .holo code
 * This is a lightweight parser for agent understanding, not full compilation
 */
export function parseHoloToGraph(code: string): HoloGraph {
  const graph: HoloGraph = {
    name: '',
    nodes: [],
    edges: [],
    flows: [],
    groups: [],
  };

  // Extract composition/world name
  const compositionMatch = code.match(/composition\s+"([^"]+)"/);
  const worldMatch = code.match(/world\s+(\w+)/);
  graph.name = compositionMatch?.[1] || worldMatch?.[1] || 'Unnamed';

  // Extract templates
  const templateRegex = /template\s+"(\w+)"\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;
  while ((match = templateRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];

    const node: HoloNode = {
      id: `template_${name}`,
      name,
      type: 'template',
      properties: {},
      state: extractState(body),
      actions: extractActions(body),
    };
    graph.nodes.push(node);
  }

  // Extract objects
  const objectRegex = /object\s+"(\w+)"(?:\s+using\s+"(\w+)")?\s*\{([^}]+)\}/g;
  while ((match = objectRegex.exec(code)) !== null) {
    const name = match[1];
    const template = match[2];
    const body = match[3];

    const node: HoloNode = {
      id: `object_${name}`,
      name,
      type: 'object',
      position: extractPosition(body),
      properties: extractProperties(body),
      traits: extractTraits(body),
    };
    graph.nodes.push(node);

    // Add "uses" edge if template specified
    if (template) {
      graph.edges.push({
        id: `edge_${name}_uses_${template}`,
        from: `object_${name}`,
        to: `template_${template}`,
        type: 'uses',
        label: 'uses',
      });
    }
  }

  // Extract orbs
  const orbRegex = /orb\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = orbRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];

    const node: HoloNode = {
      id: `orb_${name}`,
      name,
      type: determineOrbType(body),
      position: extractPosition(body),
      properties: extractProperties(body),
      traits: extractTraits(body),
    };
    graph.nodes.push(node);
  }

  // Extract buildings
  const buildingRegex = /building\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = buildingRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];

    graph.nodes.push({
      id: `building_${name}`,
      name,
      type: 'building',
      position: extractPosition(body),
      properties: extractProperties(body),
    });
  }

  // Extract spatial groups
  const groupRegex = /spatial_group\s+"(\w+)"\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  while ((match = groupRegex.exec(code)) !== null) {
    const groupName = match[1];
    const groupBody = match[2];

    // Find all objects in this group
    const childObjects: string[] = [];
    const childObjRegex = /object\s+"(\w+)"/g;
    let childMatch;
    while ((childMatch = childObjRegex.exec(groupBody)) !== null) {
      childObjects.push(`object_${childMatch[1]}`);
    }

    graph.groups.push({
      id: `group_${groupName}`,
      name: groupName,
      children: childObjects,
    });

    // Add contains edges
    for (const childId of childObjects) {
      graph.edges.push({
        id: `edge_${groupName}_contains_${childId}`,
        from: `group_${groupName}`,
        to: childId,
        type: 'contains',
      });
    }
  }

  // Extract flows from logic blocks
  const logicRegex = /logic\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  while ((match = logicRegex.exec(code)) !== null) {
    const logicBody = match[1];
    extractFlows(logicBody, graph);
  }

  return graph;
}

// Helper functions for parsing
function extractState(body: string): Record<string, unknown> {
  const stateMatch = body.match(/state\s*\{([^}]+)\}/);
  if (!stateMatch) return {};

  const state: Record<string, unknown> = {};
  const propRegex = /(\w+):\s*([^,\n}]+)/g;
  let match;
  while ((match = propRegex.exec(stateMatch[1])) !== null) {
    state[match[1]] = parseValue(match[2].trim());
  }
  return state;
}

function extractActions(body: string): string[] {
  const actions: string[] = [];
  const actionRegex = /action\s+(\w+)/g;
  let match;
  while ((match = actionRegex.exec(body)) !== null) {
    actions.push(match[1]);
  }
  return actions;
}

function extractPosition(body: string): [number, number, number] | undefined {
  const posMatch = body.match(/position:\s*\[([^\]]+)\]/);
  if (!posMatch) return undefined;
  const parts = posMatch[1].split(',').map((p) => parseFloat(p.trim()));
  return parts.length >= 3 ? [parts[0], parts[1], parts[2]] : undefined;
}

function extractProperties(body: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const propRegex = /(\w+):\s*([^,\n}]+)/g;
  let match;
  while ((match = propRegex.exec(body)) !== null) {
    const key = match[1];
    if (!['position', 'state', 'action', 'on_interact', 'traits'].includes(key)) {
      props[key] = parseValue(match[2].trim());
    }
  }
  return props;
}

function extractTraits(body: string): string[] {
  const traitsMatch = body.match(/traits:\s*\[([^\]]+)\]/);
  if (!traitsMatch) return [];
  return traitsMatch[1]
    .split(',')
    .map((t) => t.trim().replace(/["']/g, ''))
    .filter(Boolean);
}

function determineOrbType(body: string): HoloNode['type'] {
  if (body.includes('talkable') || body.includes('NPC')) return 'npc';
  if (body.includes('collectible')) return 'collectible';
  return 'orb';
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"') || value.startsWith("'")) return value.slice(1, -1);
  if (value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  const num = parseFloat(value);
  return isNaN(num) ? value : num;
}

function extractFlows(logicBody: string, graph: HoloGraph): void {
  // Extract on_* event handlers
  const eventRegex = /on_(\w+)(?:\("([^"]+)"\))?\s*\{([^}]+)\}/g;
  let match;
  while ((match = eventRegex.exec(logicBody)) !== null) {
    const eventType = match[1];
    const eventTarget = match[2] || 'any';
    const eventBody = match[3];

    const flow: HoloFlow = {
      trigger: eventTarget,
      event: `on_${eventType}`,
      actions: [],
    };

    // Extract action calls
    const actionCallRegex = /(\w+)\.(\w+)\(([^)]*)\)/g;
    let actionMatch;
    while ((actionMatch = actionCallRegex.exec(eventBody)) !== null) {
      flow.actions.push({
        target: actionMatch[1],
        action: actionMatch[2],
        args: actionMatch[3] ? actionMatch[3].split(',').map((a) => a.trim()) : [],
      });

      // Add trigger edge
      graph.edges.push({
        id: `flow_${eventType}_${actionMatch[1]}_${actionMatch[2]}`,
        from: eventTarget === 'any' ? 'event' : `object_${eventTarget}`,
        to: `object_${actionMatch[1]}`,
        type: 'triggers',
        event: `on_${eventType}`,
        action: actionMatch[2],
      });
    }

    graph.flows.push(flow);
  }

  // Extract every() periodic events
  const everyRegex = /every\((\d+)\)\s*\{([^}]+)\}/g;
  while ((match = everyRegex.exec(logicBody)) !== null) {
    const interval = match[1];
    const body = match[2];

    const flow: HoloFlow = {
      trigger: 'timer',
      event: `every_${interval}ms`,
      actions: [],
    };

    const actionCallRegex = /(\w+)\.(\w+)\(([^)]*)\)/g;
    let actionMatch;
    while ((actionMatch = actionCallRegex.exec(body)) !== null) {
      flow.actions.push({
        target: actionMatch[1],
        action: actionMatch[2],
      });
    }

    graph.flows.push(flow);
  }
}

// =============================================================================
// VISUALIZATION - ASCII diagrams of flow
// =============================================================================

export function visualizeFlow(graph: HoloGraph, focus?: string): string {
  const lines: string[] = [];

  lines.push(`=== ${graph.name} Flow Diagram ===\n`);

  // Show nodes by type
  const nodesByType = new Map<string, HoloNode[]>();
  for (const node of graph.nodes) {
    const type = node.type;
    if (!nodesByType.has(type)) nodesByType.set(type, []);
    nodesByType.get(type)!.push(node);
  }

  lines.push('NODES:');
  for (const [type, nodes] of nodesByType) {
    lines.push(`  ${type.toUpperCase()}:`);
    for (const node of nodes) {
      const pos = node.position ? ` @ [${node.position.join(', ')}]` : '';
      const traits = node.traits?.length ? ` [${node.traits.join(', ')}]` : '';
      lines.push(`    [${node.name}]${pos}${traits}`);
    }
  }

  lines.push('\nFLOWS:');
  for (const flow of graph.flows) {
    if (focus && !flow.trigger.includes(focus) && !flow.actions.some((a) => a.target.includes(focus))) {
      continue;
    }

    lines.push(`  ${flow.event}:`);
    const actionsStr = flow.actions.map((a) => `${a.target}.${a.action}()`).join(' → ');
    lines.push(`    [${flow.trigger}] ─── ${flow.event} ───→ ${actionsStr}`);
  }

  if (graph.groups.length > 0) {
    lines.push('\nGROUPS:');
    for (const group of graph.groups) {
      lines.push(`  ${group.name}:`);
      lines.push(`    └─ ${group.children.map((c) => c.replace(/^(object|orb)_/, '')).join(', ')}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// NODE CONNECTIONS
// =============================================================================

export function getNodeConnections(
  graph: HoloGraph,
  nodeName: string
): {
  receives: Array<{ from: string; event: string }>;
  sends: Array<{ to: string; action: string }>;
  parent?: string;
  children: string[];
  uses?: string;
} {
  const nodeId =
    graph.nodes.find((n) => n.name === nodeName)?.id ||
    `object_${nodeName}` ||
    `orb_${nodeName}`;

  const result = {
    receives: [] as Array<{ from: string; event: string }>,
    sends: [] as Array<{ to: string; action: string }>,
    parent: undefined as string | undefined,
    children: [] as string[],
    uses: undefined as string | undefined,
  };

  for (const edge of graph.edges) {
    if (edge.to === nodeId) {
      if (edge.type === 'triggers') {
        result.receives.push({ from: edge.from, event: edge.event || 'unknown' });
      } else if (edge.type === 'uses') {
        // This node uses a template - find which one
      } else if (edge.type === 'contains') {
        result.parent = edge.from;
      }
    }

    if (edge.from === nodeId) {
      if (edge.type === 'triggers') {
        result.sends.push({ to: edge.to, action: edge.action || 'unknown' });
      } else if (edge.type === 'uses') {
        result.uses = edge.to.replace('template_', '');
      } else if (edge.type === 'contains') {
        result.children.push(edge.to);
      }
    }
  }

  return result;
}

// =============================================================================
// GRAPH DESIGN from description
// =============================================================================

export function designGraphFromDescription(description: string): {
  suggestedNodes: Array<{ name: string; type: string; purpose: string }>;
  suggestedEdges: Array<{ from: string; to: string; type: string; why: string }>;
  suggestedFlows: Array<{ trigger: string; actions: string[]; why: string }>;
  holoStructure: string;
} {
  const desc = description.toLowerCase();
  const nodes: Array<{ name: string; type: string; purpose: string }> = [];
  const edges: Array<{ from: string; to: string; type: string; why: string }> = [];
  const flows: Array<{ trigger: string; actions: string[]; why: string }> = [];

  // Detect common patterns
  if (desc.includes('shop') || desc.includes('store') || desc.includes('merchant')) {
    nodes.push({ name: 'ShopKeeper', type: 'npc', purpose: 'Sells items to player' });
    nodes.push({ name: 'ShopUI', type: 'ui', purpose: 'Shows inventory for sale' });
    flows.push({
      trigger: 'on_interact(ShopKeeper)',
      actions: ['ShopUI.show()', 'ShopKeeper.greet()'],
      why: 'Player interacts with shop keeper to open shop',
    });
  }

  if (desc.includes('enemy') || desc.includes('combat') || desc.includes('fight')) {
    nodes.push({ name: 'Enemy', type: 'template', purpose: 'Hostile entity with health/attack' });
    nodes.push({ name: 'Player', type: 'object', purpose: 'User-controlled character' });
    edges.push({
      from: 'Enemy',
      to: 'Player',
      type: 'targets',
      why: 'Enemy attacks player',
    });
    flows.push({
      trigger: 'every(2000)',
      actions: ['Enemy.attack(Player)'],
      why: 'Periodic enemy attacks',
    });
  }

  if (desc.includes('collect') || desc.includes('pickup') || desc.includes('item')) {
    nodes.push({ name: 'Collectible', type: 'template', purpose: 'Item that can be picked up' });
    flows.push({
      trigger: 'on_interact',
      actions: ['this.collect()', 'Player.addToInventory(this)'],
      why: 'Player picks up item',
    });
  }

  if (desc.includes('door') || desc.includes('portal') || desc.includes('teleport')) {
    nodes.push({ name: 'Portal', type: 'orb', purpose: 'Teleports to another location' });
    flows.push({
      trigger: 'on_enter(Portal)',
      actions: ['Player.teleportTo(Portal.destination)'],
      why: 'Player enters portal and teleports',
    });
  }

  if (desc.includes('npc') || desc.includes('character') || desc.includes('talk')) {
    nodes.push({ name: 'NPC', type: 'npc', purpose: 'Non-player character for dialogue' });
    flows.push({
      trigger: 'on_interact(NPC)',
      actions: ['DialogueUI.show(NPC.dialogue)'],
      why: 'Player talks to NPC',
    });
  }

  // Generate suggested .holo structure
  const holoStructure = generateHoloStructure(nodes, edges, flows);

  return {
    suggestedNodes: nodes,
    suggestedEdges: edges,
    suggestedFlows: flows,
    holoStructure,
  };
}

function generateHoloStructure(
  nodes: Array<{ name: string; type: string; purpose: string }>,
  _edges: Array<{ from: string; to: string; type: string; why: string }>,
  flows: Array<{ trigger: string; actions: string[]; why: string }>
): string {
  const lines: string[] = [];
  lines.push('composition "Generated" {');
  lines.push('');

  // Templates
  const templates = nodes.filter((n) => n.type === 'template');
  for (const t of templates) {
    lines.push(`  // ${t.purpose}`);
    lines.push(`  template "${t.name}" {`);
    lines.push('    state { }');
    lines.push('    action example() { }');
    lines.push('  }');
    lines.push('');
  }

  // Objects
  lines.push('  spatial_group "Main" {');
  const objects = nodes.filter((n) => n.type !== 'template' && n.type !== 'ui');
  for (const o of objects) {
    lines.push(`    // ${o.purpose}`);
    if (templates.find((t) => t.name === o.type || o.type === 'object')) {
      lines.push(`    object "${o.name}" using "${o.type}" {`);
    } else {
      lines.push(`    orb ${o.name} {`);
    }
    lines.push('      position: [0, 0, 0]');
    lines.push('    }');
  }
  lines.push('  }');
  lines.push('');

  // Logic
  if (flows.length > 0) {
    lines.push('  logic {');
    for (const f of flows) {
      lines.push(`    // ${f.why}`);
      lines.push(`    ${f.trigger} {`);
      for (const a of f.actions) {
        lines.push(`      ${a}`);
      }
      lines.push('    }');
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

// =============================================================================
// TOOL HANDLERS
// =============================================================================

export async function handleHoloGraphTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'holo_parse_to_graph': {
        const code = args.code as string;
        if (!code) {
          return {
            content: [{ type: 'text', text: 'Error: code is required' }],
            isError: true,
          };
        }

        const graph = parseHoloToGraph(code);
        return {
          content: [
            {
              type: 'text',
              text: `## Graph Structure for "${graph.name}"\n\n### Nodes (${graph.nodes.length})\n${JSON.stringify(graph.nodes, null, 2)}\n\n### Edges (${graph.edges.length})\n${JSON.stringify(graph.edges, null, 2)}\n\n### Flows (${graph.flows.length})\n${JSON.stringify(graph.flows, null, 2)}\n\n### Groups (${graph.groups.length})\n${JSON.stringify(graph.groups, null, 2)}`,
            },
          ],
        };
      }

      case 'holo_visualize_flow': {
        const code = args.code as string;
        const focus = args.focus as string | undefined;

        const graph = parseHoloToGraph(code);
        const visualization = visualizeFlow(graph, focus);

        return {
          content: [
            {
              type: 'text',
              text: `\`\`\`\n${visualization}\n\`\`\``,
            },
          ],
        };
      }

      case 'holo_get_node_connections': {
        const code = args.code as string;
        const nodeName = args.nodeName as string;

        const graph = parseHoloToGraph(code);
        const connections = getNodeConnections(graph, nodeName);

        return {
          content: [
            {
              type: 'text',
              text: `## Connections for "${nodeName}"\n\n**Receives events from:**\n${connections.receives.length > 0 ? connections.receives.map((r) => `- ${r.from} (${r.event})`).join('\n') : '- None'}\n\n**Sends actions to:**\n${connections.sends.length > 0 ? connections.sends.map((s) => `- ${s.to} (${s.action})`).join('\n') : '- None'}\n\n**Parent group:** ${connections.parent || 'None'}\n\n**Uses template:** ${connections.uses || 'None'}\n\n**Contains:** ${connections.children.length > 0 ? connections.children.join(', ') : 'None'}`,
            },
          ],
        };
      }

      case 'holo_design_graph': {
        const description = args.description as string;
        const design = designGraphFromDescription(description);

        return {
          content: [
            {
              type: 'text',
              text: `## Graph Design for: "${description}"\n\n### Suggested Nodes\n${design.suggestedNodes.map((n) => `- **${n.name}** (${n.type}): ${n.purpose}`).join('\n')}\n\n### Suggested Connections\n${design.suggestedEdges.map((e) => `- ${e.from} → ${e.to} (${e.type}): ${e.why}`).join('\n') || '- None'}\n\n### Suggested Flows\n${design.suggestedFlows.map((f) => `- **${f.trigger}**\n  Actions: ${f.actions.join(' → ')}\n  Why: ${f.why}`).join('\n')}\n\n### Suggested .holo Structure\n\`\`\`holo\n${design.holoStructure}\n\`\`\``,
            },
          ],
        };
      }

      case 'holo_diff_graphs': {
        const before = args.before as string;
        const after = args.after as string;

        const graphBefore = parseHoloToGraph(before);
        const graphAfter = parseHoloToGraph(after);

        const beforeNodeIds = new Set(graphBefore.nodes.map((n) => n.id));
        const afterNodeIds = new Set(graphAfter.nodes.map((n) => n.id));

        const addedNodes = graphAfter.nodes.filter((n) => !beforeNodeIds.has(n.id));
        const removedNodes = graphBefore.nodes.filter((n) => !afterNodeIds.has(n.id));

        const beforeEdgeIds = new Set(graphBefore.edges.map((e) => e.id));
        const afterEdgeIds = new Set(graphAfter.edges.map((e) => e.id));

        const addedEdges = graphAfter.edges.filter((e) => !beforeEdgeIds.has(e.id));
        const removedEdges = graphBefore.edges.filter((e) => !afterEdgeIds.has(e.id));

        return {
          content: [
            {
              type: 'text',
              text: `## Graph Diff\n\n### Added Nodes (${addedNodes.length})\n${addedNodes.map((n) => `+ [${n.name}] (${n.type})`).join('\n') || 'None'}\n\n### Removed Nodes (${removedNodes.length})\n${removedNodes.map((n) => `- [${n.name}] (${n.type})`).join('\n') || 'None'}\n\n### Added Connections (${addedEdges.length})\n${addedEdges.map((e) => `+ ${e.from} → ${e.to} (${e.type})`).join('\n') || 'None'}\n\n### Removed Connections (${removedEdges.length})\n${removedEdges.map((e) => `- ${e.from} → ${e.to} (${e.type})`).join('\n') || 'None'}\n\n### Flow Changes\nBefore: ${graphBefore.flows.length} flows\nAfter: ${graphAfter.flows.length} flows`,
            },
          ],
        };
      }

      case 'holo_suggest_connections': {
        const code = args.code as string;
        const intent = args.intent as string | undefined;

        const graph = parseHoloToGraph(code);
        const suggestions: string[] = [];

        // Find nodes without any connections
        const connectedNodeIds = new Set([
          ...graph.edges.map((e) => e.from),
          ...graph.edges.map((e) => e.to),
        ]);

        for (const node of graph.nodes) {
          if (!connectedNodeIds.has(node.id) && node.type !== 'template') {
            suggestions.push(`⚠️ **${node.name}** has no connections - add interaction?`);
          }
        }

        // Look for common missing patterns
        const hasPlayer = graph.nodes.some((n) => n.name.toLowerCase().includes('player'));
        const hasEnemy = graph.nodes.some((n) => n.name.toLowerCase().includes('enemy'));
        const hasCollectible = graph.nodes.some((n) => n.traits?.includes('collectible'));

        if (hasPlayer && hasEnemy) {
          const hasCombatFlow = graph.flows.some(
            (f) => f.event.includes('attack') || f.actions.some((a) => a.action.includes('attack'))
          );
          if (!hasCombatFlow) {
            suggestions.push('💡 Player and Enemy exist but no combat flow - add attack interactions?');
          }
        }

        if (hasCollectible) {
          const hasCollectFlow = graph.flows.some((f) => f.event.includes('interact') || f.event.includes('collect'));
          if (!hasCollectFlow) {
            suggestions.push('💡 Collectibles exist but no collection logic - add on_interact handlers?');
          }
        }

        if (intent) {
          suggestions.push(`\n📝 Based on your intent "${intent}":`);
          suggestions.push('Consider adding flows that connect existing nodes to achieve this goal.');
        }

        return {
          content: [
            {
              type: 'text',
              text: `## Connection Suggestions\n\n${suggestions.join('\n\n') || '✅ Graph looks well-connected!'}\n\n### Current Stats\n- Nodes: ${graph.nodes.length}\n- Connections: ${graph.edges.length}\n- Flows: ${graph.flows.length}`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}
