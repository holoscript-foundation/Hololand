/**
 * Brittney IDE Tools
 * 
 * Tools designed specifically for IDE/editor integration to help
 * coding agents (Copilot, Cursor, Claude) work more effectively
 * with HoloScript projects.
 * 
 * These tools provide:
 * - Project-wide context scanning
 * - LSP-style diagnostics with quick fixes
 * - Context-aware code completions
 * - Refactoring operations
 * - Inline documentation lookup
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectFile {
  path: string;
  type: 'holo' | 'hsplus' | 'hs' | 'glb' | 'gltf' | 'other';
  objects?: string[];
  templates?: string[];
  traits?: string[];
  errors?: number;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  code?: string;
  quickFixes?: QuickFix[];
}

export interface QuickFix {
  title: string;
  edit: {
    range: { start: { line: number; column: number }; end: { line: number; column: number } };
    newText: string;
  };
}

export interface CompletionItem {
  label: string;
  kind: 'trait' | 'property' | 'object' | 'template' | 'function' | 'keyword' | 'snippet';
  detail?: string;
  documentation?: string;
  insertText?: string;
  insertTextFormat?: 'plaintext' | 'snippet';
}

// =============================================================================
// TRAIT DOCUMENTATION
// =============================================================================

const traitDocs: Record<string, { description: string; params?: Record<string, string>; example: string }> = {
  grabbable: {
    description: 'Makes object grabbable by VR controllers or hand tracking. Essential for interactive objects.',
    params: {
      snap_to_hand: 'If true, object snaps to hand position when grabbed (default: false)',
      two_handed: 'Requires both hands to grab (default: false)',
      grab_distance: 'Maximum distance from which object can be grabbed (default: 1.0)',
    },
    example: `orb sword {
  @grabbable(snap_to_hand: true)
  position: [0, 1, 0]
}`,
  },
  throwable: {
    description: 'Allows grabbed object to be thrown with physics. Requires @grabbable.',
    params: {
      velocity_multiplier: 'Multiplier for throw velocity (default: 1.0)',
      bounce: 'If true, object bounces on collision (default: false)',
      max_velocity: 'Maximum throw speed (default: 50)',
    },
    example: `orb ball {
  @grabbable
  @throwable(velocity_multiplier: 1.5, bounce: true)
}`,
  },
  collidable: {
    description: 'Enables collision detection. Objects will physically interact.',
    params: {
      layer: 'Collision layer for filtering (e.g., "player", "enemy", "terrain")',
      trigger: 'If true, triggers events but no physical collision (default: false)',
    },
    example: `orb wall {
  @collidable(layer: "solid")
  scale: [10, 3, 0.5]
}`,
  },
  physics: {
    description: 'Adds physics simulation (gravity, momentum, collisions).',
    params: {
      mass: 'Object mass in kg (default: 1.0)',
      friction: 'Surface friction 0-1 (default: 0.5)',
      restitution: 'Bounciness 0-1 (default: 0.3)',
    },
    example: `orb crate {
  @physics(mass: 10, friction: 0.8)
  @collidable
}`,
  },
  networked: {
    description: 'Synchronizes object state across network for multiplayer.',
    params: {
      sync_rate: 'Updates per second (e.g., "20hz")',
      interpolation: 'Smooth movement between updates (default: true)',
      owner: 'Player who controls this object',
    },
    example: `orb player {
  @networked(sync_rate: "30hz")
  position: synced
}`,
  },
  glowing: {
    description: 'Makes object emit light/glow effect.',
    params: {
      intensity: 'Glow intensity 0-1 (default: 0.5)',
      color: 'Glow color as hex string',
      pulse: 'If true, glow pulses (default: false)',
    },
    example: `orb crystal {
  @glowing(intensity: 0.8, color: "#00ffff", pulse: true)
}`,
  },
  clickable: {
    description: 'Object responds to click/point interaction.',
    params: {
      on_click: 'Handler function to call',
      highlight: 'Highlight on hover (default: true)',
    },
    example: `orb button {
  @clickable(on_click: handleClick)
  text: "Press Me"
}`,
  },
  hoverable: {
    description: 'Object responds to gaze/pointer hover.',
    params: {
      on_enter: 'Handler when hover starts',
      on_exit: 'Handler when hover ends',
      delay: 'Seconds before hover triggers (default: 0)',
    },
    example: `orb tooltip_trigger {
  @hoverable(on_enter: showTooltip, on_exit: hideTooltip)
}`,
  },
  billboard: {
    description: 'Object always faces the camera/user.',
    params: {
      axis: 'Constraint axis: "all", "y", "x" (default: "all")',
    },
    example: `orb label {
  @billboard(axis: "y")
  text: "Always Visible"
}`,
  },
  spatial_audio: {
    description: 'Audio emanates from object position with 3D spatialization.',
    params: {
      src: 'Audio file path',
      loop: 'Loop audio (default: false)',
      volume: 'Volume 0-1 (default: 1.0)',
      distance: 'Max distance audio is heard (default: 10)',
    },
    example: `orb radio {
  @spatial_audio(src: "music.mp3", loop: true, distance: 5)
}`,
  },
  equippable: {
    description: 'Object can be equipped to a slot (hand, head, body, etc.).',
    params: {
      slot: 'Equipment slot: "hand", "head", "body", "back"',
      on_equip: 'Handler when equipped',
      on_unequip: 'Handler when removed',
    },
    example: `orb helmet {
  @equippable(slot: "head")
  @grabbable
  model: "helmet.glb"
}`,
  },
  destructible: {
    description: 'Object can be destroyed/broken.',
    params: {
      health: 'Damage before destruction (default: 100)',
      on_destroy: 'Handler when destroyed',
      fragments: 'Number of debris pieces (default: 0)',
    },
    example: `orb crate {
  @destructible(health: 50, fragments: 5)
  @collidable
}`,
  },
  animated: {
    description: 'Plays embedded animations from model file.',
    params: {
      clip: 'Animation clip name',
      loop: 'Loop animation (default: true)',
      speed: 'Playback speed multiplier (default: 1.0)',
    },
    example: `orb character {
  @animated(clip: "idle", loop: true)
  model: "character.glb"
}`,
  },
};

// All 49 traits organized by category
const allTraits: Record<string, string[]> = {
  interaction: ['grabbable', 'throwable', 'holdable', 'clickable', 'hoverable', 'draggable', 'selectable', 'focusable'],
  physics: ['collidable', 'physics', 'rigid', 'kinematic', 'trigger', 'gravity', 'buoyant'],
  visual: ['glowing', 'emissive', 'transparent', 'reflective', 'animated', 'billboard', 'sprite', 'instanced'],
  networking: ['networked', 'synced', 'persistent', 'owned', 'host_only', 'local_only'],
  behavior: ['stackable', 'attachable', 'equippable', 'consumable', 'destructible', 'respawnable'],
  spatial: ['anchor', 'tracked', 'world_locked', 'hand_tracked', 'eye_tracked', 'head_tracked'],
  audio: ['spatial_audio', 'ambient', 'voice_activated', 'music_reactive'],
  state: ['state', 'reactive', 'observable', 'computed', 'persistent_state'],
};

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const brittneyIDETools: Tool[] = [
  // =========================================================================
  // PROJECT SCANNING
  // =========================================================================
  {
    name: 'brittney_scan_project',
    description: `Scan workspace for all HoloScript files and return project context. Returns:
- All .holo, .hsplus, .hs files with their objects/templates
- All 3D assets (.glb, .gltf)
- Error counts per file
- Project structure overview

Use this first when working on a HoloScript project to understand the codebase.`,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Workspace root path (defaults to current directory)',
        },
        includeAssets: {
          type: 'boolean',
          description: 'Include 3D asset files (default: true)',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum directory depth to scan (default: 5)',
        },
      },
    },
  },

  // =========================================================================
  // DIAGNOSTICS
  // =========================================================================
  {
    name: 'brittney_diagnostics',
    description: `Get LSP-style diagnostics for a HoloScript file with quick fixes. Returns:
- Syntax errors with line/column
- Unknown trait warnings
- Missing property hints
- Quick fix suggestions for each issue

Use after editing to validate code and get actionable fixes.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to diagnose',
        },
        filePath: {
          type: 'string',
          description: 'File path for context (helps with relative imports)',
        },
        severity: {
          type: 'string',
          enum: ['error', 'warning', 'info', 'all'],
          description: 'Filter by severity (default: all)',
        },
      },
      required: ['code'],
    },
  },

  // =========================================================================
  // AUTOCOMPLETE
  // =========================================================================
  {
    name: 'brittney_autocomplete',
    description: `Get context-aware code completions at a cursor position. Returns:
- Trait suggestions after @
- Property suggestions inside objects
- Template names for "using"
- Object references in logic blocks
- Function/action names

Provide the code and cursor position for accurate suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Full HoloScript code',
        },
        line: {
          type: 'number',
          description: 'Cursor line (1-based)',
        },
        column: {
          type: 'number',
          description: 'Cursor column (1-based)',
        },
        triggerCharacter: {
          type: 'string',
          description: 'Character that triggered completion (e.g., "@", ".", ":")',
        },
      },
      required: ['code', 'line', 'column'],
    },
  },

  // =========================================================================
  // REFACTORING
  // =========================================================================
  {
    name: 'brittney_refactor',
    description: `Perform refactoring operations on HoloScript code. Operations:
- **rename**: Rename object/template/function across codebase
- **extract_template**: Extract object definition into a reusable template
- **inline_template**: Inline a template into objects using it
- **organize_imports**: Sort and clean up imports
- **group_objects**: Move objects into a spatial_group

Returns the refactored code and what changed.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code to refactor',
        },
        operation: {
          type: 'string',
          enum: ['rename', 'extract_template', 'inline_template', 'organize_imports', 'group_objects'],
          description: 'Refactoring operation to perform',
        },
        target: {
          type: 'string',
          description: 'Target name (for rename: old name, for extract: object name)',
        },
        newName: {
          type: 'string',
          description: 'New name (for rename and extract operations)',
        },
        options: {
          type: 'object',
          description: 'Additional options for the operation',
        },
      },
      required: ['code', 'operation'],
    },
  },

  // =========================================================================
  // DOCUMENTATION
  // =========================================================================
  {
    name: 'brittney_docs',
    description: `Get inline documentation for HoloScript constructs. Query types:
- **trait**: Get full documentation for a @trait
- **property**: Get documentation for an object property
- **keyword**: Get syntax help for keywords (orb, template, composition, etc.)
- **example**: Get usage examples for a construct
- **all_traits**: List all 49 VR traits with brief descriptions

Perfect for inline help while coding.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to look up (trait name, property name, keyword)',
        },
        type: {
          type: 'string',
          enum: ['trait', 'property', 'keyword', 'example', 'all_traits'],
          description: 'Type of documentation to retrieve',
        },
        context: {
          type: 'string',
          description: 'Surrounding code for contextual help',
        },
      },
      required: ['query'],
    },
  },

  // =========================================================================
  // CODE ACTIONS
  // =========================================================================
  {
    name: 'brittney_code_action',
    description: `Get available code actions at a position (like VS Code lightbulb). Returns:
- Quick fixes for errors
- Refactoring suggestions
- Add missing traits
- Convert to template
- Add documentation comment

Position-aware actions for the current cursor location.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code',
        },
        line: {
          type: 'number',
          description: 'Line number (1-based)',
        },
        column: {
          type: 'number',
          description: 'Column number (1-based)',
        },
        diagnostics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              severity: { type: 'string' }
            }
          },
          description: 'Current diagnostics at this position (if known)',
        },
      },
      required: ['code', 'line'],
    },
  },

  // =========================================================================
  // HOVER INFORMATION
  // =========================================================================  
  {
    name: 'brittney_hover',
    description: `Get hover information at a position (like VS Code tooltip). Returns:
- Type information
- Trait documentation
- Object definition preview
- Link to full docs

Use for inline tooltips while coding.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'HoloScript code',
        },
        line: {
          type: 'number',
          description: 'Line number (1-based)',
        },
        column: {
          type: 'number',
          description: 'Column number (1-based)',
        },
      },
      required: ['code', 'line', 'column'],
    },
  },

  // =========================================================================
  // GO TO DEFINITION
  // =========================================================================
  {
    name: 'brittney_go_to_definition',
    description: `Find the definition of a symbol. Returns:
- File path and line/column of definition
- Preview of the definition code
- Type of symbol (object, template, function, etc.)

Works across files in the project.`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Current file code',
        },
        symbol: {
          type: 'string',
          description: 'Symbol name to find',
        },
        projectPath: {
          type: 'string',
          description: 'Project root for cross-file search',
        },
      },
      required: ['symbol'],
    },
  },

  // =========================================================================
  // FIND REFERENCES
  // =========================================================================
  {
    name: 'brittney_find_references',
    description: `Find all references to a symbol. Returns:
- All locations where symbol is used
- File paths, line numbers, and preview text
- Count of references

Useful before renaming or understanding usage.`,
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Symbol name to find references for',
        },
        projectPath: {
          type: 'string',
          description: 'Project root for cross-file search',
        },
        includeDeclaration: {
          type: 'boolean',
          description: 'Include the declaration itself (default: true)',
        },
      },
      required: ['symbol'],
    },
  },
];

// =============================================================================
// TOOL HANDLERS
// =============================================================================

export async function handleBrittneyIDETool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'brittney_scan_project': {
      const rootPath = (args.path as string) || process.cwd();
      const includeAssets = args.includeAssets !== false;
      const maxDepth = (args.maxDepth as number) || 5;
      
      const files: ProjectFile[] = [];
      
      function scanDir(dir: string, depth: number) {
        if (depth > maxDepth) return;
        
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              scanDir(fullPath, depth + 1);
            } else {
              const ext = path.extname(entry.name).toLowerCase();
              let type: ProjectFile['type'] = 'other';
              
              if (ext === '.holo') type = 'holo';
              else if (ext === '.hsplus') type = 'hsplus';
              else if (ext === '.hs') type = 'hs';
              else if (ext === '.glb') type = 'glb';
              else if (ext === '.gltf') type = 'gltf';
              else continue; // Skip non-relevant files
              
              if (!includeAssets && (type === 'glb' || type === 'gltf')) continue;
              
              const file: ProjectFile = {
                path: path.relative(rootPath, fullPath),
                type,
              };
              
              // Parse HoloScript files for metadata
              if (type === 'holo' || type === 'hsplus' || type === 'hs') {
                try {
                  const content = fs.readFileSync(fullPath, 'utf-8');
                  
                  // Regex Helper Factory
                  const extract = (pattern: RegExp) => [...content.matchAll(pattern)].map(m => m[1]);

                  file.objects = extract(/(?:orb|object)\s+["']?(\w+)/g);
                  file.templates = extract(/template\s+["'](\w+)/g);
                  file.traits = [...new Set(extract(/@(\w+)/g))];
                } catch {
                  file.errors = 1;
                }
              }
              
              files.push(file);
            }
          }
        } catch {
          // Skip inaccessible directories
        }
      }
      
      scanDir(rootPath, 0);
      
      const summary = {
        totalFiles: files.length,
        holoFiles: files.filter(f => f.type === 'holo').length,
        hsplusFiles: files.filter(f => f.type === 'hsplus').length,
        hsFiles: files.filter(f => f.type === 'hs').length,
        assets: files.filter(f => f.type === 'glb' || f.type === 'gltf').length,
        allObjects: [...new Set(files.flatMap(f => f.objects || []))],
        allTemplates: [...new Set(files.flatMap(f => f.templates || []))],
        allTraits: [...new Set(files.flatMap(f => f.traits || []))],
      };
      
      return JSON.stringify({ summary, files }, null, 2);
    }

    case 'brittney_diagnostics': {
      const code = args.code as string;
      const severity = args.severity as string || 'all';
      const diagnostics: Diagnostic[] = [];
      
      const lines = code.split('\n');
      
      lines.forEach((line, i) => {
        // Check for unknown traits
        const traitMatches = line.matchAll(/@(\w+)/g);
        for (const match of traitMatches) {
          const trait = match[1];
          const allTraitNames = Object.values(allTraits).flat();
          if (!allTraitNames.includes(trait)) {
            diagnostics.push({
              file: args.filePath as string || '<input>',
              line: i + 1,
              column: match.index! + 1,
              severity: 'warning',
              message: `Unknown trait: @${trait}`,
              code: 'unknown-trait',
              quickFixes: [
                {
                  title: `Replace with @grabbable`,
                  edit: {
                    range: { start: { line: i + 1, column: match.index! + 1 }, end: { line: i + 1, column: match.index! + 1 + trait.length + 1 } },
                    newText: '@grabbable',
                  },
                },
              ],
            });
          }
        }
        
        // Check for common syntax errors
        if (line.includes('orb') && !line.match(/orb\s+\w+\s*\{?/)) {
          diagnostics.push({
            file: args.filePath as string || '<input>',
            line: i + 1,
            column: line.indexOf('orb') + 1,
            severity: 'error',
            message: 'orb must be followed by a name',
            code: 'syntax-error',
          });
        }
      });
      
      const filtered = severity === 'all' 
        ? diagnostics 
        : diagnostics.filter(d => d.severity === severity);
      
      return JSON.stringify({
        count: filtered.length,
        diagnostics: filtered,
      }, null, 2);
    }

    case 'brittney_autocomplete': {
      const code = args.code as string;
      const line = args.line as number;
      const column = args.column as number;
      const trigger = args.triggerCharacter as string;
      
      const lines = code.split('\n');
      const currentLine = lines[line - 1] || '';
      const beforeCursor = currentLine.slice(0, column - 1);
      
      const completions: CompletionItem[] = [];
      
      // After @ - suggest traits
      if (trigger === '@' || beforeCursor.endsWith('@')) {
        for (const [category, traits] of Object.entries(allTraits)) {
          for (const trait of traits) {
            const docs = traitDocs[trait];
            completions.push({
              label: trait,
              kind: 'trait',
              detail: `(${category}) VR trait`,
              documentation: docs?.description || `The @${trait} trait`,
              insertText: docs?.params 
                ? `${trait}($1)` 
                : trait,
              insertTextFormat: docs?.params ? 'snippet' : 'plaintext',
            });
          }
        }
      }
      
      // Inside object - suggest properties
      else if (beforeCursor.match(/^\s+\w*$/)) {
        const properties = [
          { label: 'position', detail: '[x, y, z]' },
          { label: 'rotation', detail: '[rx, ry, rz]' },
          { label: 'scale', detail: 'number or [x, y, z]' },
          { label: 'color', detail: '"#hex" or [r, g, b]' },
          { label: 'model', detail: '"path.glb"' },
          { label: 'text', detail: '"label text"' },
        ];
        
        for (const prop of properties) {
          completions.push({
            label: prop.label,
            kind: 'property',
            detail: prop.detail,
            insertText: `${prop.label}: `,
          });
        }
      }
      
      // Suggest keywords
      else if (beforeCursor.match(/^\s*$/)) {
        const keywords = ['orb', 'template', 'composition', 'environment', 'spatial_group', 'logic', 'function', 'connect'];
        for (const kw of keywords) {
          completions.push({
            label: kw,
            kind: 'keyword',
            detail: 'HoloScript keyword',
          });
        }
      }
      
      return JSON.stringify({ completions }, null, 2);
    }

    case 'brittney_docs': {
      const query = (args.query as string).toLowerCase().replace('@', '');
      const type = args.type as string || 'trait';
      
      if (type === 'all_traits') {
        const result: Record<string, { traits: string[]; descriptions: Record<string, string> }> = {};
        for (const [category, traits] of Object.entries(allTraits)) {
          result[category] = {
            traits,
            descriptions: Object.fromEntries(
              traits.map(t => [t, traitDocs[t]?.description || `The @${t} trait`])
            ),
          };
        }
        return JSON.stringify(result, null, 2);
      }
      
      if (type === 'trait') {
        const docs = traitDocs[query];
        if (!docs) {
          // Check if it exists
          const exists = Object.values(allTraits).flat().includes(query);
          if (exists) {
            return JSON.stringify({
              trait: `@${query}`,
              description: `The @${query} VR trait. (Detailed documentation pending)`,
              example: `orb obj {\n  @${query}\n  position: [0, 0, 0]\n}`,
            }, null, 2);
          }
          return JSON.stringify({ error: `Unknown trait: @${query}` });
        }
        
        return JSON.stringify({
          trait: `@${query}`,
          ...docs,
        }, null, 2);
      }
      
      return JSON.stringify({ error: `Unknown query type: ${type}` });
    }

    case 'brittney_refactor': {
      const code = args.code as string;
      const operation = args.operation as string;
      const target = args.target as string;
      const newName = args.newName as string;
      
      let result = code;
      const changes: string[] = [];
      
      switch (operation) {
        case 'rename':
          if (!target || !newName) {
            return JSON.stringify({ error: 'rename requires target and newName' });
          }
          const regex = new RegExp(`\\b${target}\\b`, 'g');
          const count = (code.match(regex) || []).length;
          result = code.replace(regex, newName);
          changes.push(`Renamed "${target}" → "${newName}" (${count} occurrences)`);
          break;
          
        case 'extract_template':
          if (!target || !newName) {
            return JSON.stringify({ error: 'extract_template requires target (object name) and newName (template name)' });
          }
          // Find the object and extract to template
          const objMatch = code.match(new RegExp(`orb\\s+${target}\\s*\\{([^}]+)\\}`, 's'));
          if (objMatch) {
            const template = `template "${newName}" {\n${objMatch[1]}\n}\n\n`;
            const replacement = `object "${target}" using "${newName}" {\n  position: [0, 0, 0]\n}`;
            result = template + code.replace(objMatch[0], replacement);
            changes.push(`Extracted orb "${target}" into template "${newName}"`);
          }
          break;
          
        case 'organize_imports':
          // Sort and dedupe imports
          const imports = [...code.matchAll(/import\s+.+/g)].map(m => m[0]);
          const uniqueImports = [...new Set(imports)].sort();
          let cleanCode = code;
          imports.forEach(imp => { cleanCode = cleanCode.replace(imp + '\n', ''); });
          result = uniqueImports.join('\n') + (uniqueImports.length ? '\n\n' : '') + cleanCode.trim();
          changes.push(`Organized ${imports.length} imports`);
          break;
      }
      
      return JSON.stringify({ code: result, changes }, null, 2);
    }

    case 'brittney_hover': {
      const code = args.code as string;
      const line = args.line as number;
      const column = args.column as number;
      
      const lines = code.split('\n');
      const currentLine = lines[line - 1] || '';
      
      // Check if hovering over a trait
      const traitMatch = currentLine.match(/@(\w+)/);
      if (traitMatch && column >= currentLine.indexOf('@') && column <= currentLine.indexOf('@') + traitMatch[0].length) {
        const trait = traitMatch[1];
        const docs = traitDocs[trait];
        return JSON.stringify({
          content: docs 
            ? `**@${trait}**\n\n${docs.description}\n\n\`\`\`hsplus\n${docs.example}\n\`\`\``
            : `**@${trait}** - VR trait`,
          range: {
            start: { line, column: currentLine.indexOf('@') + 1 },
            end: { line, column: currentLine.indexOf('@') + traitMatch[0].length + 1 },
          },
        }, null, 2);
      }
      
      return JSON.stringify({ content: null });
    }

    case 'brittney_go_to_definition':
    case 'brittney_find_references':
    case 'brittney_code_action':
      // These would require full project indexing - return placeholder
      return JSON.stringify({
        note: 'Full implementation requires project indexing. Use brittney_scan_project first.',
        symbol: args.symbol,
      }, null, 2);

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
