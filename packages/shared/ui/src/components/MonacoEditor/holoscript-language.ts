/**
 * HoloScript Language Definition for Monaco Editor
 *
 * Extracted from the playground IDE and packaged as a reusable module.
 * Provides Monarch tokenizer and theme definition for the HoloScript language.
 */
import type * as monaco from 'monaco-editor';

// ─── Language Definition ────────────────────────────────────────────────────

export const HOLOSCRIPT_KEYWORDS = [
  'composition', 'template', 'object', 'using', 'environment', 'spatial_group',
  'logic', 'action', 'state', 'children', 'animation', 'networked', 'physics',
  'import', 'as', 'if', 'else', 'for', 'in', 'while', 'return', 'true', 'false',
  'null', 'this', 'parent', 'other', 'player', 'min', 'max', 'on_start',
] as const;

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

export const HOLOSCRIPT_EVENTS = [
  'onPoint', 'onGrab', 'onRelease', 'onHoverEnter', 'onHoverExit',
  'onTriggerEnter', 'onTriggerExit', 'onSwing', 'onClick', 'onGesture',
] as const;

export const HOLOSCRIPT_GEOMETRIES = [
  'cube', 'sphere', 'cylinder', 'cone', 'torus', 'capsule', 'plane',
  'text', 'model', 'humanoid',
] as const;

export const HOLOSCRIPT_PROPERTIES = [
  'position', 'rotation', 'scale', 'color', 'geometry', 'opacity',
  'visible', 'type', 'text', 'model', 'skeleton', 'mass', 'restitution',
  'friction', 'intensity', 'distance', 'duration', 'loop', 'easing',
  'from', 'to', 'property', 'skybox', 'ambient_light', 'grid', 'theme',
  'sync_rate', 'highlight_color',
] as const;

/**
 * Monarch tokenizer definition for HoloScript.
 * Compatible with `monaco.languages.setMonarchTokensProvider`.
 */
export const holoscriptMonarchLanguage: monaco.languages.IMonarchLanguage = {
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
      [/@[a-zA-Z_]\w*/, { cases: { '$0': 'keyword.trait' } }],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@stringSingle'],

      // Numbers
      [/\d+(\.\d+)?/, 'number'],
      [/-\d+(\.\d+)?/, 'number'],

      // Event handlers
      [/on[A-Z]\w*/, 'keyword.event'],

      // Identifiers & keywords
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],

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
  },
};

// ─── Theme Definitions ──────────────────────────────────────────────────────

/**
 * Dark theme for HoloScript (VS Code Dark+ inspired).
 * Used by the Web Studio and Desktop IDE.
 */
export const holoscriptDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
    { token: 'keyword.trait', foreground: 'dcdcaa', fontStyle: 'italic' },
    { token: 'keyword.event', foreground: 'c586c0' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'identifier', foreground: '9cdcfe' },
    { token: 'operator', foreground: 'd4d4d4' },
    { token: 'delimiter', foreground: 'd4d4d4' },
    { token: 'string.escape', foreground: 'd7ba7d' },
    { token: 'string.invalid', foreground: 'f44747' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'editorLineNumber.foreground': '#5a5a5a',
    'editorCursor.foreground': '#00d4ff',
    'editor.selectionBackground': '#264f7844',
    'editor.lineHighlightBackground': '#2a2d2e',
    'editorBracketMatch.background': '#0064001a',
    'editorBracketMatch.border': '#888888',
  },
};

/**
 * Light theme for HoloScript (for documentation/marketing contexts).
 */
export const holoscriptLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
    { token: 'keyword.trait', foreground: '795e26', fontStyle: 'italic' },
    { token: 'keyword.event', foreground: 'af00db' },
    { token: 'string', foreground: 'a31515' },
    { token: 'number', foreground: '098658' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'identifier', foreground: '001080' },
    { token: 'operator', foreground: '000000' },
    { token: 'delimiter', foreground: '000000' },
    { token: 'string.escape', foreground: 'ee0000' },
    { token: 'string.invalid', foreground: 'cd3131' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#000000',
    'editorLineNumber.foreground': '#237893',
    'editorCursor.foreground': '#000000',
    'editor.selectionBackground': '#add6ff',
    'editor.lineHighlightBackground': '#f3f3f3',
  },
};
