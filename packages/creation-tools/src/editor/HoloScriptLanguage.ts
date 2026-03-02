/**
 * HoloScript Language Definition for Monaco Editor
 *
 * Provides complete syntax highlighting, auto-completion, and validation
 * for the HoloScript spatial programming language (.holo, .hsplus files).
 */

export interface MonacoLanguageDefinition {
  id: string;
  extensions: string[];
  aliases: string[];
  keywords: string[];
  traits: string[];
  events: string[];
  geometries: string[];
  properties: string[];
  tokenizer: Record<string, any[]>;
}

export interface MonacoThemeDefinition {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; fontStyle?: string; background?: string }>;
  colors: Record<string, string>;
}

/** All HoloScript keywords */
export const HOLOSCRIPT_KEYWORDS = [
  'composition', 'template', 'object', 'using', 'environment', 'spatial_group',
  'logic', 'action', 'state', 'children', 'animation', 'networked', 'physics',
  'import', 'as', 'if', 'else', 'for', 'in', 'while', 'return', 'true', 'false',
  'null', 'this', 'parent', 'other', 'player', 'min', 'max', 'on_start',
  'zone', 'region', 'spawn', 'trigger', 'material', 'shader', 'light',
  'camera', 'audio', 'particle', 'constraint', 'joint',
] as const;

/** All HoloScript traits (decorators) */
export const HOLOSCRIPT_TRAITS = [
  '@grabbable', '@throwable', '@holdable', '@clickable', '@hoverable', '@draggable',
  '@pointable', '@scalable', '@collidable', '@physics', '@rigid', '@kinematic',
  '@trigger', '@gravity', '@glowing', '@emissive', '@transparent', '@reflective',
  '@animated', '@billboard', '@networked', '@synced', '@persistent', '@owned',
  '@host_only', '@stackable', '@attachable', '@equippable', '@consumable',
  '@destructible', '@anchor', '@tracked', '@world_locked', '@hand_tracked',
  '@eye_tracked', '@spatial_audio', '@ambient', '@voice_activated',
  '@state', '@reactive', '@observable', '@computed',
] as const;

/** All HoloScript event handlers */
export const HOLOSCRIPT_EVENTS = [
  'onPoint', 'onGrab', 'onRelease', 'onHoverEnter', 'onHoverExit',
  'onTriggerEnter', 'onTriggerExit', 'onSwing', 'onClick', 'onGesture',
  'onCollisionEnter', 'onCollisionExit', 'onSpawn', 'onDestroy',
  'onActivate', 'onDeactivate', 'onUpdate', 'onStart',
] as const;

/** All HoloScript geometry types */
export const HOLOSCRIPT_GEOMETRIES = [
  'cube', 'sphere', 'cylinder', 'cone', 'torus', 'capsule', 'plane',
  'text', 'model', 'humanoid', 'box', 'ring', 'dodecahedron',
  'icosahedron', 'octahedron', 'tetrahedron',
] as const;

/** All HoloScript object properties */
export const HOLOSCRIPT_PROPERTIES = [
  'position', 'rotation', 'scale', 'color', 'geometry', 'opacity',
  'visible', 'type', 'text', 'model', 'skeleton', 'mass', 'restitution',
  'friction', 'intensity', 'distance', 'duration', 'loop', 'easing',
  'from', 'to', 'property', 'skybox', 'ambient_light', 'grid', 'theme',
  'sync_rate', 'highlight_color', 'emissive', 'roughness', 'metalness',
  'wireframe', 'castShadow', 'receiveShadow', 'fog', 'gravity',
] as const;

/**
 * Create the Monaco language definition for HoloScript
 */
export function createHoloScriptLanguageDefinition(): MonacoLanguageDefinition {
  return {
    id: 'holoscript',
    extensions: ['.holo', '.hs', '.hsplus'],
    aliases: ['HoloScript', 'holoscript', 'holo'],

    keywords: [...HOLOSCRIPT_KEYWORDS],
    traits: [...HOLOSCRIPT_TRAITS],
    events: [...HOLOSCRIPT_EVENTS],
    geometries: [...HOLOSCRIPT_GEOMETRIES],
    properties: [...HOLOSCRIPT_PROPERTIES],

    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Traits (@keyword)
        [/@[a-zA-Z_]\w*/, 'keyword.trait'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@stringSingle'],

        // Template literals
        [/`/, 'string', '@templateLiteral'],

        // Numbers (hex, float, int)
        [/0x[0-9a-fA-F]+/, 'number.hex'],
        [/#[0-9a-fA-F]{3,8}/, 'number.hex'],
        [/\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
        [/-\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],

        // Event handlers
        [/on[A-Z]\w*/, 'keyword.event'],

        // Identifiers & keywords
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@geometries': 'type.geometry',
            '@properties': 'variable.property',
            '@default': 'identifier',
          },
        }],

        // Brackets
        [/[{}()\[\]]/, '@brackets'],

        // Operators
        [/[+\-*/%=<>!&|^~?]/, 'operator'],
        [/[;,.:]+/, 'delimiter'],

        // Whitespace
        [/\s+/, 'white'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],

      string: [
        [/[^"\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],

      stringSingle: [
        [/[^'\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop'],
      ],

      templateLiteral: [
        [/\$\{/, 'delimiter.bracket', '@templateExpression'],
        [/[^`$\\]+/, 'string'],
        [/\\./, 'string.escape'],
        [/`/, 'string', '@pop'],
      ],

      templateExpression: [
        [/\}/, 'delimiter.bracket', '@pop'],
        { include: 'root' },
      ],
    },
  };
}

/**
 * Create the HoloScript dark theme for Monaco Editor
 */
export function createHoloScriptDarkTheme(): MonacoThemeDefinition {
  return {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'keyword.trait', foreground: 'dcdcaa', fontStyle: 'italic' },
      { token: 'keyword.event', foreground: 'c586c0' },
      { token: 'type.geometry', foreground: '4ec9b0' },
      { token: 'variable.property', foreground: '9cdcfe' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'string.escape', foreground: 'd7ba7d' },
      { token: 'string.invalid', foreground: 'f44747' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'number.hex', foreground: 'b5cea8' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'd4d4d4' },
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'delimiter', foreground: 'd4d4d4' },
      { token: 'delimiter.bracket', foreground: 'ffd700' },
    ],
    colors: {
      'editor.background': '#1a1a2e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#5a5a5a',
      'editorCursor.foreground': '#00d4ff',
      'editor.selectionBackground': '#264f7844',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#00d4ff44',
      'editorIndentGuide.background': '#2a2d2e',
      'editorIndentGuide.activeBackground': '#3c3c3c',
    },
  };
}

/**
 * Create the HoloScript light theme for Monaco Editor
 */
export function createHoloScriptLightTheme(): MonacoThemeDefinition {
  return {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
      { token: 'keyword.trait', foreground: '795E26', fontStyle: 'italic' },
      { token: 'keyword.event', foreground: 'AF00DB' },
      { token: 'type.geometry', foreground: '267f99' },
      { token: 'variable.property', foreground: '001080' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editorCursor.foreground': '#0066cc',
    },
  };
}

/**
 * Generate auto-completion items for the HoloScript language
 */
export function createHoloScriptCompletionProvider() {
  return {
    triggerCharacters: ['.', '@', '"', ' '],

    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const textBefore = lineContent.substring(0, position.column - 1);

      const suggestions: any[] = [];

      // Trait completions (after @)
      if (textBefore.endsWith('@') || textBefore.match(/@\w*$/)) {
        for (const trait of HOLOSCRIPT_TRAITS) {
          suggestions.push({
            label: trait,
            kind: 15, // CompletionItemKind.Snippet
            insertText: trait.substring(1), // Remove @ since it's already typed
            detail: 'HoloScript Trait',
            documentation: `Trait decorator: ${trait}`,
            range,
          });
        }
        return { suggestions };
      }

      // Property completions (after property name or inside object block)
      if (textBefore.match(/^\s*$/) || textBefore.match(/:\s*$/)) {
        // Inside a block, suggest properties
        for (const prop of HOLOSCRIPT_PROPERTIES) {
          suggestions.push({
            label: prop,
            kind: 9, // CompletionItemKind.Property
            insertText: `${prop}: `,
            detail: 'HoloScript Property',
            range,
          });
        }
      }

      // Keyword completions
      for (const kw of HOLOSCRIPT_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: 13, // CompletionItemKind.Keyword
          insertText: kw,
          detail: 'HoloScript Keyword',
          range,
        });
      }

      // Geometry completions
      for (const geo of HOLOSCRIPT_GEOMETRIES) {
        suggestions.push({
          label: geo,
          kind: 11, // CompletionItemKind.Value
          insertText: `"${geo}"`,
          detail: 'Geometry Type',
          range,
        });
      }

      // Event handler completions
      for (const evt of HOLOSCRIPT_EVENTS) {
        suggestions.push({
          label: evt,
          kind: 1, // CompletionItemKind.Method
          insertText: `${evt}: {\n  \$0\n}`,
          insertTextRules: 4, // CompletionItemInsertTextRule.InsertAsSnippet
          detail: 'Event Handler',
          range,
        });
      }

      // Snippet completions
      suggestions.push(
        {
          label: 'composition',
          kind: 14, // CompletionItemKind.Snippet
          insertText: [
            'composition "${1:MyScene}" {',
            '  environment {',
            '    skybox: "${2:default}"',
            '    ambient_light: ${3:0.5}',
            '    grid: ${4:true}',
            '  }',
            '',
            '  $0',
            '}',
          ].join('\n'),
          insertTextRules: 4,
          detail: 'New Composition (Scene)',
          documentation: 'Create a new HoloScript scene composition',
          range,
        },
        {
          label: 'object',
          kind: 14,
          insertText: [
            'object "${1:MyObject}" {',
            '  geometry: "${2:cube}"',
            '  color: "${3:#00d4ff}"',
            '  position: [${4:0}, ${5:1}, ${6:-3}]',
            '  scale: [${7:1}, ${8:1}, ${9:1}]',
            '  $0',
            '}',
          ].join('\n'),
          insertTextRules: 4,
          detail: 'New Object',
          documentation: 'Create a new 3D object',
          range,
        },
        {
          label: 'template',
          kind: 14,
          insertText: [
            'template "${1:MyTemplate}" {',
            '  ${2:@grabbable}',
            '  geometry: "${3:cube}"',
            '  color: "${4:#ff6644}"',
            '',
            '  state {',
            '    ${5:health: 100}',
            '  }',
            '',
            '  $0',
            '}',
          ].join('\n'),
          insertTextRules: 4,
          detail: 'New Template',
          documentation: 'Create a reusable object template',
          range,
        },
        {
          label: 'animation',
          kind: 14,
          insertText: [
            'animation ${1:myAnim} {',
            '  property: "${2:position.y}"',
            '  from: ${3:0}',
            '  to: ${4:2}',
            '  duration: ${5:1000}',
            '  loop: ${6:infinite}',
            '  easing: "${7:easeInOut}"',
            '}',
          ].join('\n'),
          insertTextRules: 4,
          detail: 'New Animation',
          documentation: 'Create an animation block',
          range,
        },
      );

      return { suggestions };
    },
  };
}

/**
 * Create hover provider for HoloScript language
 */
export function createHoloScriptHoverProvider() {
  const docs: Record<string, string> = {
    'composition': 'Defines a complete 3D scene or world. The root container for all objects, templates, and environment settings.',
    'template': 'Defines a reusable object blueprint with traits, properties, state, and event handlers.',
    'object': 'Creates a 3D object instance in the scene. Can optionally use a template with `using`.',
    'environment': 'Configures the scene environment: skybox, lighting, grid, and atmospheric effects.',
    'state': 'Defines mutable state variables for an object or template.',
    'animation': 'Defines a property animation with from/to values, duration, and easing.',
    'action': 'Defines a callable function/method on an object or template.',
    'physics': 'Configures physics properties: type (dynamic/kinematic/static), mass, restitution, friction.',
    '@grabbable': 'Makes the object grabbable in VR/AR with hand controllers.',
    '@collidable': 'Enables collision detection for the object.',
    '@glowing': 'Adds an emissive glow effect to the object.',
    '@networked': 'Synchronizes the object state across all connected clients.',
    '@spatial_audio': 'Enables 3D positional audio for the object.',
    'position': 'The 3D position of the object as [x, y, z] coordinates.',
    'rotation': 'The rotation of the object in degrees as [x, y, z].',
    'scale': 'The scale of the object as [x, y, z] multipliers.',
    'geometry': 'The primitive geometry type: cube, sphere, cylinder, cone, torus, plane, text, model.',
  };

  return {
    provideHover(model: any, position: any) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const lineContent = model.getLineContent(position.lineNumber);
      const charBefore = lineContent.charAt(word.startColumn - 2);
      const fullWord = charBefore === '@' ? `@${word.word}` : word.word;

      const doc = docs[fullWord];
      if (doc) {
        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: charBefore === '@' ? word.startColumn - 1 : word.startColumn,
            endColumn: word.endColumn,
          },
          contents: [
            { value: `**${fullWord}** - HoloScript` },
            { value: doc },
          ],
        };
      }

      return null;
    },
  };
}
