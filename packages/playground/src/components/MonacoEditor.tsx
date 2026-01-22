/**
 * Monaco Editor Component - HoloScript Code Editor
 */

import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';
import { HoloScriptService } from '@services/HoloScriptService';
import '@styles/editor.css';

const MonacoEditor: React.FC = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { editor, setCode, setSaved, setErrors, setSelectedObject, playground } = usePlaygroundStore();

  useEffect(() => {
    if (!containerRef.current) return;

    // Register HoloScript language
    if (!monaco.languages.getLanguages().some((lang) => lang.id === 'holoscript')) {
      monaco.languages.register({ id: 'holoscript' });
      monaco.languages.setMonarchTokensProvider('holoscript', HoloScriptService.getMonacoTokensProvider() as any);

      // Register completion provider
      monaco.languages.registerCompletionItemProvider('holoscript', {
        provideCompletionItems: (model, position) => {
          const suggestions = HoloScriptService.getCompletionSuggestions(model.getValue(), {
            line: position.lineNumber,
            column: position.column,
          });

          return {
            suggestions: suggestions.map((s) => ({
              label: s.label,
              kind: monaco.languages.CompletionItemKind[s.kind as keyof typeof monaco.languages.CompletionItemKind],
              insertText: s.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: s.label,
              preselect: s.label === 'world',
            })),
          };
        },
      });

      // Register hover provider for syntax help
      monaco.languages.registerHoverProvider('holoscript', {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          const hoverTexts: Record<string, string> = {
            world: 'Define a world container\nSyntax: `world name { ... }`',
            object: 'Create an object in the world\nSyntax: `object name { ... }`',
            trait: 'Define object behavior\nSyntax: `trait name { ... }`',
            position: 'Set object position [x, y, z]',
            rotation: 'Set object rotation [x, y, z]',
            scale: 'Set object scale [x, y, z]',
          };

          if (word && hoverTexts[word.word]) {
            return {
              contents: [{ value: hoverTexts[word.word] }],
            };
          }

          return null;
        },
      });
    }

    // Create editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: editor.code,
      language: 'holoscript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 13,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
    });

    // Handle content changes
    const disposable = editorRef.current.onDidChangeModelContent(() => {
      const code = editorRef.current?.getValue() || '';
      setCode(code);

      // Real-time validation
      const validation = HoloScriptService.validate(code);
      const errors = validation.errors.map((e) => ({
        ...e,
        severity: 1, // Error
      }));

      // Set markers in editor
      if (errors.length > 0) {
        monaco.editor.setModelMarkers(
          editorRef.current!.getModel()!,
          'holoscript',
          errors.map((e) => ({
            startLineNumber: e.line || 1,
            startColumn: e.column || 1,
            endLineNumber: e.line || 1,
            endColumn: 100,
            message: e.message,
            severity: e.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          }))
        );
      } else {
        monaco.editor.setModelMarkers(editorRef.current!.getModel()!, 'holoscript', []);
      }

      setErrors(validation.errors);
    });

    // Handle cursor position changes for Selection Sync
    const cursorDisposable = editorRef.current.onDidChangeCursorPosition((e) => {
        const line = e.position.lineNumber;
        const objectId = HoloScriptService.getObjectAtLine(editorRef.current?.getValue() || '', line);
        if (objectId) {
            setSelectedObject(objectId);
        }
    });

    // React to external selection changes (e.g. 3D Click)
    const _selectionDispose = { dispose: () => {} }; // Placeholder if needed, but we use useEffect for store changes
    editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      setSaved(true);
    });

    editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Compile and run
      const compilation = HoloScriptService.compile(editorRef.current?.getValue() || '');
      if (!compilation.success) {
        setErrors(compilation.errors);
      }
    });

    return () => {
      disposable.dispose();
      cursorDisposable.dispose();
      editorRef.current?.dispose();
    };
  }, [editor.code, setCode, setSaved, setErrors]);

  // Effect to handle selection changes from Store -> Editor (Scroll to)
  useEffect(() => {
    if (!editorRef.current || !playground.selectedObject) return;

    const line = HoloScriptService.getLineOfObject(editor.code, playground.selectedObject);
    if (line) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setSelection(new monaco.Range(line, 1, line, 100));
    }
  }, [playground.selectedObject, editor.code]);

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200">HoloScript Editor</h3>
          {!editor.isSaved && <div className="w-2 h-2 rounded-full bg-yellow-500"></div>}
        </div>
        <div className="text-xs text-gray-500">
          {editor.isSaved ? 'Saved' : 'Unsaved'} • Ctrl+S to save • Ctrl+Enter to compile
        </div>
      </div>

      {/* Editor Container */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
};

export default MonacoEditor;
