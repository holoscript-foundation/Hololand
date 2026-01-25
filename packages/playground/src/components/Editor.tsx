/**
 * Monaco Editor Component for HoloScript
 */

import React, { useRef, useCallback } from 'react';
import MonacoEditor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

// HoloScript language tokens
const HOLOSCRIPT_TOKENS = {
  keywords: [
    'composition', 'environment', 'state', 'template', 'object', 'spatial_group',
    'logic', 'on', 'when', 'if', 'else', 'for', 'while', 'function', 'action',
    'using', 'as', 'true', 'false', 'null', 'position', 'rotation', 'scale',
    'color', 'material', 'visible', 'emit', 'connect', 'execute'
  ],
  traits: [
    '@grabbable', '@throwable', '@holdable', '@clickable', '@hoverable', '@draggable',
    '@collidable', '@physics', '@rigid', '@kinematic', '@trigger', '@gravity',
    '@glowing', '@emissive', '@transparent', '@reflective', '@animated', '@billboard',
    '@networked', '@synced', '@persistent', '@owned', '@host_only',
    '@stackable', '@attachable', '@equippable', '@consumable', '@destructible',
    '@anchor', '@tracked', '@world_locked', '@hand_tracked', '@eye_tracked',
    '@spatial_audio', '@ambient', '@voice_activated',
    '@state', '@reactive', '@observable', '@computed'
  ],
  types: [
    'orb', 'cube', 'sphere', 'plane', 'cylinder', 'capsule', 'torus', 'cone',
    'box', 'mesh', 'light', 'camera', 'audio', 'particle', 'text', 'ui'
  ]
};

export function Editor({ value, onChange, language = 'holoscript' }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Register HoloScript language
    monaco.languages.register({ id: 'holoscript' });
    
    // Define tokenizer
    monaco.languages.setMonarchTokensProvider('holoscript', {
      keywords: HOLOSCRIPT_TOKENS.keywords,
      traits: HOLOSCRIPT_TOKENS.traits,
      types: HOLOSCRIPT_TOKENS.types,
      
      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // Traits (@ prefix)
          [/@\w+/, 'keyword.trait'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          
          // Keywords
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@types': 'type',
              '@default': 'identifier'
            }
          }],
          
          // Brackets
          [/[{}()\[\]]/, '@brackets'],
          
          // Operators
          [/[=:,;.]/, 'delimiter'],
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ]
      }
    });
    
    // Define theme
    monaco.editor.defineTheme('holoscript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00d4ff', fontStyle: 'bold' },
        { token: 'keyword.trait', foreground: 'ffd700' },
        { token: 'type', foreground: 'a855f7' },
        { token: 'string', foreground: 'ff6b9d' },
        { token: 'number', foreground: '00ff88' },
        { token: 'comment', foreground: '6a6a7a', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'e0e0e0' },
      ],
      colors: {
        'editor.background': '#0f0f1a',
        'editor.foreground': '#e0e0e0',
        'editorLineNumber.foreground': '#4a4a5a',
        'editorCursor.foreground': '#00d4ff',
        'editor.selectionBackground': '#00d4ff33',
        'editor.lineHighlightBackground': '#1a1a2e',
      }
    });
    
    monaco.editor.setTheme('holoscript-dark');
    
    // Auto-completions
    monaco.languages.registerCompletionItemProvider('holoscript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const suggestions = [
          // Keywords
          ...HOLOSCRIPT_TOKENS.keywords.map(kw => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range
          })),
          // Traits
          ...HOLOSCRIPT_TOKENS.traits.map(trait => ({
            label: trait,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: trait,
            range,
            documentation: `VR trait: ${trait}`
          })),
          // Snippets
          {
            label: 'composition',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'composition "${1:Name}" {\n  environment {\n    skybox: "${2:nebula}"\n    ambient_light: ${3:0.4}\n  }\n  \n  ${0}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: 'Create a new .holo composition'
          },
          {
            label: 'object',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'object "${1:name}" {\n  position: [${2:0}, ${3:1}, ${4:0}]\n  ${0}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: 'Create a new 3D object'
          }
        ];
        
        return { suggestions };
      }
    });
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    if (value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 16 },
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
      }}
    />
  );
}
