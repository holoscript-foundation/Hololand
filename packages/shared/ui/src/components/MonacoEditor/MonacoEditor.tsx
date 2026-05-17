import {
  forwardRef,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
  type CSSProperties,
} from 'react';
import type * as monacoTypes from 'monaco-editor';
import { useTheme } from '../../hooks/useTheme';
import {
  type EditorContext,
  type HoloEditorConfig,
  getEditorConfig,
  mergeEditorConfig,
} from './editor-configs';
import {
  holoscriptMonarchLanguage,
  holoscriptDarkTheme,
  holoscriptLightTheme,
  HOLOSCRIPT_KEYWORDS,
  HOLOSCRIPT_TRAITS,
  HOLOSCRIPT_GEOMETRIES,
} from './holoscript-language';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MonacoEditorRef {
  /** The underlying Monaco editor instance */
  getEditor(): monacoTypes.editor.IStandaloneCodeEditor | null;
  /** Get the current editor value */
  getValue(): string;
  /** Set the editor value */
  setValue(value: string): void;
  /** Focus the editor */
  focus(): void;
  /** Set diagnostic markers on the model */
  setMarkers(markers: monacoTypes.editor.IMarkerData[]): void;
}

export interface MonacoEditorProps {
  /** Editor context preset: 'web-studio' or 'desktop-ide' */
  context?: EditorContext;
  /** Initial editor content */
  defaultValue?: string;
  /** Controlled value (editor becomes controlled) */
  value?: string;
  /** Language ID. Defaults to 'holoscript'. */
  language?: string;
  /** Callback when content changes (debounced per config) */
  onChange?: (value: string) => void;
  /** Callback when editor is mounted and ready */
  onMount?: (editor: monacoTypes.editor.IStandaloneCodeEditor, monaco: typeof monacoTypes) => void;
  /** Partial config overrides on top of the context preset */
  configOverrides?: Partial<HoloEditorConfig>;
  /** Custom keyboard actions to register */
  actions?: Array<{
    id: string;
    label: string;
    keybindings?: number[];
    run: (editor: monacoTypes.editor.IStandaloneCodeEditor) => void;
  }>;
  /** Container style */
  style?: CSSProperties;
  /** Container className */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
}

/** Track whether we have registered the language globally */
let holoScriptRegistered = false;

/**
 * Register HoloScript language and themes with Monaco.
 * Safe to call multiple times; only registers once.
 */
function registerHoloScript(monacoInstance: typeof monacoTypes) {
  if (holoScriptRegistered) return;

  monacoInstance.languages.register({
    id: 'holoscript',
    extensions: ['.holo', '.hs', '.hsplus'],
    aliases: ['HoloScript', 'holoscript', 'holo'],
  });

  monacoInstance.languages.setMonarchTokensProvider(
    'holoscript',
    holoscriptMonarchLanguage as monacoTypes.languages.IMonarchLanguage
  );

  monacoInstance.editor.defineTheme('holoscript-dark', holoscriptDarkTheme);
  monacoInstance.editor.defineTheme('holoscript-light', holoscriptLightTheme);

  // Register basic completion provider
  monacoInstance.languages.registerCompletionItemProvider('holoscript', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monacoTypes.languages.CompletionItem[] = [];

      // Keywords
      for (const kw of HOLOSCRIPT_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: monacoInstance.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        });
      }

      // Traits
      for (const trait of HOLOSCRIPT_TRAITS) {
        suggestions.push({
          label: trait,
          kind: monacoInstance.languages.CompletionItemKind.Property,
          insertText: trait,
          range,
        });
      }

      // Geometries
      for (const geo of HOLOSCRIPT_GEOMETRIES) {
        suggestions.push({
          label: geo,
          kind: monacoInstance.languages.CompletionItemKind.Value,
          insertText: `"${geo}"`,
          range,
        });
      }

      return { suggestions };
    },
  });

  holoScriptRegistered = true;
}

/**
 * React wrapper for Monaco Editor with HoloScript language support
 * and dual-configuration for Web Studio vs Desktop IDE.
 *
 * Monaco must be loaded externally (via CDN or bundled). This component
 * expects `window.monaco` or accepts it via the `onMount` callback.
 *
 * @example
 * ```tsx
 * // Web Studio (browser)
 * <MonacoEditor
 *   context="web-studio"
 *   defaultValue={holoCode}
 *   onChange={handleCodeChange}
 * />
 *
 * // Desktop IDE (Electron/Tauri)
 * <MonacoEditor
 *   context="desktop-ide"
 *   value={code}
 *   onChange={setCode}
 *   actions={[
 *     { id: 'run', label: 'Run', keybindings: [KeyMod.CtrlCmd | KeyCode.Enter], run: handleRun },
 *   ]}
 * />
 * ```
 */
export const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(
  (
    {
      context = 'web-studio',
      defaultValue = '',
      value,
      language = 'holoscript',
      onChange,
      onMount,
      configOverrides,
      actions,
      style,
      className,
      readOnly = false,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monacoTypes.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monacoTypes | null>(null);
    const onChangeRef = useRef(onChange);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { themeName } = useTheme();

    // Keep onChange ref current
    onChangeRef.current = onChange;

    // Resolve config
    const config = configOverrides
      ? mergeEditorConfig(context, configOverrides)
      : getEditorConfig(context);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editorRef.current,
        getValue: () => editorRef.current?.getValue() ?? '',
        setValue: (val: string) => editorRef.current?.setValue(val),
        focus: () => editorRef.current?.focus(),
        setMarkers: (markers: monacoTypes.editor.IMarkerData[]) => {
          const model = editorRef.current?.getModel();
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelMarkers(model, 'holoscript', markers);
          }
        },
      }),
      []
    );

    // Initialize editor
    const initEditor = useCallback(() => {
      // Monaco must be available globally or via import
      const monacoInstance = (window as unknown as { monaco?: typeof monacoTypes }).monaco;
      if (!monacoInstance || !containerRef.current) return;

      monacoRef.current = monacoInstance;

      // Register HoloScript language (idempotent)
      if (language === 'holoscript') {
        registerHoloScript(monacoInstance);
      }

      // Select theme based on app theme
      const editorTheme =
        language === 'holoscript'
          ? themeName === 'dark'
            ? 'holoscript-dark'
            : 'holoscript-light'
          : themeName === 'dark'
            ? 'vs-dark'
            : 'vs';

      // Create editor
      const editor = monacoInstance.editor.create(containerRef.current, {
        ...config.editorOptions,
        value: value ?? defaultValue,
        language,
        theme: editorTheme,
        readOnly,
      });

      editorRef.current = editor;

      // Register custom actions
      if (actions) {
        for (const action of actions) {
          editor.addAction({
            id: action.id,
            label: action.label,
            keybindings: action.keybindings,
            run: () => action.run(editor),
          });
        }
      }

      // Wire up onChange with debouncing
      editor.onDidChangeModelContent(() => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onChangeRef.current?.(editor.getValue());
        }, config.liveParseDebounceMs);
      });

      // Notify consumer
      onMount?.(editor, monacoInstance);
    }, [language, themeName, config, defaultValue, readOnly, actions, onMount, value]);

    // Mount/unmount
    useEffect(() => {
      initEditor();

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        editorRef.current?.dispose();
        editorRef.current = null;
      };
    }, []);

    // Sync controlled value
    useEffect(() => {
      if (value !== undefined && editorRef.current) {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== value) {
          editorRef.current.setValue(value);
        }
      }
    }, [value]);

    // Sync theme changes
    useEffect(() => {
      if (monacoRef.current) {
        const editorTheme =
          language === 'holoscript'
            ? themeName === 'dark'
              ? 'holoscript-dark'
              : 'holoscript-light'
            : themeName === 'dark'
              ? 'vs-dark'
              : 'vs';
        monacoRef.current.editor.setTheme(editorTheme);
      }
    }, [themeName, language]);

    const containerStyle: CSSProperties = {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      ...style,
    };

    return <div ref={containerRef} className={className} style={containerStyle} />;
  }
);

MonacoEditor.displayName = 'MonacoEditor';
