/**
 * HoloScript Scene Editor
 *
 * Full-featured code editor for HoloScript scenes with:
 * - Monaco Editor integration with HoloScript syntax highlighting
 * - Real-time parsing and error diagnostics
 * - Auto-completion for HoloScript language constructs
 * - Live preview synchronization
 * - Undo/redo history
 * - Multi-tab file editing
 */

import {
  createHoloScriptLanguageDefinition,
  createHoloScriptDarkTheme,
  createHoloScriptLightTheme,
  createHoloScriptCompletionProvider,
  createHoloScriptHoverProvider,
} from './HoloScriptLanguage';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface SceneEditorConfig {
  /** DOM element to mount the editor into */
  container: HTMLElement;
  /** Initial HoloScript source code */
  initialCode?: string;
  /** Theme: 'holoscript-dark' | 'holoscript-light' */
  theme?: 'holoscript-dark' | 'holoscript-light';
  /** Enable real-time preview sync */
  livePreview?: boolean;
  /** Debounce delay for live preview (ms) */
  previewDebounceMs?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Font size in pixels */
  fontSize?: number;
  /** Enable minimap */
  minimap?: boolean;
  /** Callback when code changes */
  onChange?: (code: string) => void;
  /** Callback when scene should be re-rendered */
  onPreviewUpdate?: (code: string, parseResult: ParseResult) => void;
  /** Callback when a parse error occurs */
  onParseError?: (errors: ParseDiagnostic[]) => void;
  /** Callback when cursor position changes */
  onCursorChange?: (position: CursorPosition) => void;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
  selectedText: string;
  objectAtCursor: string | null;
}

export interface ParseDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ParseResult {
  success: boolean;
  ast: SceneNode | null;
  diagnostics: ParseDiagnostic[];
  objectCount: number;
  templateCount: number;
}

export interface SceneNode {
  type: 'composition' | 'object' | 'template' | 'environment' | 'animation' | 'state' | 'action' | 'property';
  name: string;
  properties: Record<string, any>;
  children: SceneNode[];
  line: number;
  column: number;
}

export interface EditorTab {
  id: string;
  name: string;
  code: string;
  isDirty: boolean;
  language: string;
}

// --------------------------------------------------------------------------
// Parser (lightweight client-side HoloScript parser)
// --------------------------------------------------------------------------

/**
 * Lightweight HoloScript parser for real-time editor feedback.
 * This is NOT the full compiler - just enough to extract structure
 * and report errors for the editor experience.
 */
export function parseHoloScript(source: string): ParseResult {
  const diagnostics: ParseDiagnostic[] = [];
  let objectCount = 0;
  let templateCount = 0;

  const lines = source.split('\n');
  const braceStack: Array<{ type: string; line: number }> = [];
  let rootNode: SceneNode | null = null;
  const nodeStack: SceneNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Count opening and closing braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Detect composition
    const compMatch = trimmed.match(/^composition\s+"([^"]+)"\s*\{/);
    if (compMatch) {
      rootNode = {
        type: 'composition',
        name: compMatch[1],
        properties: {},
        children: [],
        line: lineNum,
        column: 1,
      };
      nodeStack.push(rootNode);
      braceStack.push({ type: 'composition', line: lineNum });
      continue;
    }

    // Detect object
    const objMatch = trimmed.match(/^object\s+"([^"]+)"(?:\s+using\s+"([^"]+)")?\s*\{/);
    if (objMatch) {
      objectCount++;
      const node: SceneNode = {
        type: 'object',
        name: objMatch[1],
        properties: objMatch[2] ? { template: objMatch[2] } : {},
        children: [],
        line: lineNum,
        column: trimmed.indexOf('object') + 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'object', line: lineNum });
      continue;
    }

    // Detect template
    const tplMatch = trimmed.match(/^template\s+"([^"]+)"\s*\{/);
    if (tplMatch) {
      templateCount++;
      const node: SceneNode = {
        type: 'template',
        name: tplMatch[1],
        properties: {},
        children: [],
        line: lineNum,
        column: trimmed.indexOf('template') + 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'template', line: lineNum });
      continue;
    }

    // Detect environment
    const envMatch = trimmed.match(/^environment\s*\{/);
    if (envMatch) {
      const node: SceneNode = {
        type: 'environment',
        name: 'environment',
        properties: {},
        children: [],
        line: lineNum,
        column: 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'environment', line: lineNum });
      continue;
    }

    // Detect state block
    const stateMatch = trimmed.match(/^state\s*\{/);
    if (stateMatch) {
      const node: SceneNode = {
        type: 'state',
        name: 'state',
        properties: {},
        children: [],
        line: lineNum,
        column: trimmed.indexOf('state') + 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'state', line: lineNum });
      continue;
    }

    // Detect animation block
    const animMatch = trimmed.match(/^animation\s+(\w+)\s*\{/);
    if (animMatch) {
      const node: SceneNode = {
        type: 'animation',
        name: animMatch[1],
        properties: {},
        children: [],
        line: lineNum,
        column: trimmed.indexOf('animation') + 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'animation', line: lineNum });
      continue;
    }

    // Detect action block
    const actionMatch = trimmed.match(/^action\s+(\w+)\s*\([^)]*\)\s*\{/);
    if (actionMatch) {
      const node: SceneNode = {
        type: 'action',
        name: actionMatch[1],
        properties: {},
        children: [],
        line: lineNum,
        column: trimmed.indexOf('action') + 1,
      };
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].children.push(node);
      }
      nodeStack.push(node);
      braceStack.push({ type: 'action', line: lineNum });
      continue;
    }

    // Detect property assignments (key: value)
    const propMatch = trimmed.match(/^(\w+)\s*:\s*(.+?)$/);
    if (propMatch && nodeStack.length > 0) {
      const currentNode = nodeStack[nodeStack.length - 1];
      const key = propMatch[1];
      const rawValue = propMatch[2].replace(/,?\s*$/, '');

      // Parse value
      let value: any = rawValue;
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else if (rawValue === 'null') value = null;
      else if (rawValue.match(/^-?\d+(\.\d+)?$/)) value = parseFloat(rawValue);
      else if (rawValue.startsWith('"') && rawValue.endsWith('"')) value = rawValue.slice(1, -1);
      else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        try {
          value = JSON.parse(rawValue);
        } catch {
          value = rawValue;
        }
      }

      currentNode.properties[key] = value;
      continue;
    }

    // Handle closing braces
    for (let j = 0; j < closeBraces; j++) {
      if (braceStack.length > 0) {
        braceStack.pop();
        if (nodeStack.length > 1) {
          nodeStack.pop();
        }
      }
    }

    // Handle additional opening braces that weren't part of a recognized construct
    for (let j = 0; j < openBraces; j++) {
      if (!compMatch && !objMatch && !tplMatch && !envMatch && !stateMatch && !animMatch && !actionMatch) {
        braceStack.push({ type: 'unknown', line: lineNum });
      }
    }
  }

  // Check for unclosed braces
  if (braceStack.length > 0) {
    for (const unclosed of braceStack) {
      diagnostics.push({
        severity: 'error',
        message: `Unclosed ${unclosed.type} block opened on line ${unclosed.line}`,
        startLine: unclosed.line,
        startColumn: 1,
        endLine: unclosed.line,
        endColumn: 1,
      });
    }
  }

  // Validate composition exists
  if (!rootNode && source.trim().length > 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'No composition block found. HoloScript scenes should start with a composition declaration.',
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
    });
  }

  return {
    success: diagnostics.filter(d => d.severity === 'error').length === 0,
    ast: rootNode,
    diagnostics,
    objectCount,
    templateCount,
  };
}

// --------------------------------------------------------------------------
// Scene Editor Class
// --------------------------------------------------------------------------

/**
 * HoloScript Scene Editor
 *
 * Wraps Monaco Editor with full HoloScript language support.
 * Provides real-time parsing, syntax highlighting, auto-completion,
 * and live preview synchronization.
 */
export class SceneEditor {
  private config: Required<SceneEditorConfig>;
  private editor: any = null;
  private monaco: any = null;
  private tabs: Map<string, EditorTab> = new Map();
  private activeTabId: string = 'main';
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private lastParseResult: ParseResult | null = null;
  private isInitialized = false;
  private disposables: Array<{ dispose(): void }> = [];

  constructor(config: SceneEditorConfig) {
    this.config = {
      container: config.container,
      initialCode: config.initialCode ?? DEFAULT_SCENE_CODE,
      theme: config.theme ?? 'holoscript-dark',
      livePreview: config.livePreview ?? true,
      previewDebounceMs: config.previewDebounceMs ?? 300,
      readOnly: config.readOnly ?? false,
      fontSize: config.fontSize ?? 14,
      minimap: config.minimap ?? true,
      onChange: config.onChange ?? (() => {}),
      onPreviewUpdate: config.onPreviewUpdate ?? (() => {}),
      onParseError: config.onParseError ?? (() => {}),
      onCursorChange: config.onCursorChange ?? (() => {}),
    };

    // Create initial tab
    this.tabs.set('main', {
      id: 'main',
      name: 'scene.holo',
      code: this.config.initialCode,
      isDirty: false,
      language: 'holoscript',
    });
  }

  /**
   * Initialize the editor with Monaco. Call this after the Monaco loader is available.
   */
  async initialize(monacoInstance?: any): Promise<void> {
    if (this.isInitialized) return;

    const monaco = monacoInstance ?? (window as any).monaco;
    if (!monaco) {
      throw new Error('Monaco Editor not found. Load Monaco from CDN or npm before initializing SceneEditor.');
    }
    this.monaco = monaco;

    // Register HoloScript language
    const langDef = createHoloScriptLanguageDefinition();
    monaco.languages.register({
      id: langDef.id,
      extensions: langDef.extensions,
      aliases: langDef.aliases,
    });
    monaco.languages.setMonarchTokensProvider(langDef.id, langDef);

    // Register themes
    const darkTheme = createHoloScriptDarkTheme();
    const lightTheme = createHoloScriptLightTheme();
    monaco.editor.defineTheme('holoscript-dark', darkTheme);
    monaco.editor.defineTheme('holoscript-light', lightTheme);

    // Register completion provider
    const completionDisposable = monaco.languages.registerCompletionItemProvider(
      'holoscript',
      createHoloScriptCompletionProvider()
    );
    this.disposables.push(completionDisposable);

    // Register hover provider
    const hoverDisposable = monaco.languages.registerHoverProvider(
      'holoscript',
      createHoloScriptHoverProvider()
    );
    this.disposables.push(hoverDisposable);

    // Create the editor
    const initialTab = this.tabs.get(this.activeTabId)!;
    this.editor = monaco.editor.create(this.config.container, {
      value: initialTab.code,
      language: 'holoscript',
      theme: this.config.theme,
      fontSize: this.config.fontSize,
      readOnly: this.config.readOnly,
      minimap: { enabled: this.config.minimap },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      formatOnPaste: true,
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      suggest: { showSnippets: true, showKeywords: true },
      quickSuggestions: { strings: true, comments: false, other: true },
      folding: true,
      foldingStrategy: 'indentation',
      renderLineHighlight: 'all',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      contextmenu: true,
      lineNumbers: 'on',
      glyphMargin: true,
      renderWhitespace: 'selection',
    });

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      const code = this.editor.getValue();
      const tab = this.tabs.get(this.activeTabId);
      if (tab) {
        tab.code = code;
        tab.isDirty = true;
      }
      this.config.onChange(code);

      if (this.config.livePreview) {
        this.schedulePreviewUpdate();
      }
    });

    // Listen for cursor position changes
    this.editor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      const selection = this.editor.getSelection();
      const selectedText = selection ? this.editor.getModel()?.getValueInRange(selection) ?? '' : '';

      // Find the object at the cursor position
      const objectAtCursor = this.findObjectAtLine(position.lineNumber);

      this.config.onCursorChange({
        lineNumber: position.lineNumber,
        column: position.column,
        selectedText,
        objectAtCursor,
      });
    });

    // Run initial parse
    this.parseAndUpdate();

    this.isInitialized = true;
  }

  /**
   * Get the current source code
   */
  getCode(): string {
    if (this.editor) {
      return this.editor.getValue();
    }
    return this.tabs.get(this.activeTabId)?.code ?? '';
  }

  /**
   * Set the editor source code
   */
  setCode(code: string): void {
    if (this.editor) {
      this.editor.setValue(code);
    }
    const tab = this.tabs.get(this.activeTabId);
    if (tab) {
      tab.code = code;
    }
  }

  /**
   * Get the last parse result
   */
  getParseResult(): ParseResult | null {
    return this.lastParseResult;
  }

  /**
   * Add a new editor tab
   */
  addTab(id: string, name: string, code: string, language = 'holoscript'): void {
    this.tabs.set(id, { id, name, code, isDirty: false, language });
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Save current tab state
    const currentTab = this.tabs.get(this.activeTabId);
    if (currentTab && this.editor) {
      currentTab.code = this.editor.getValue();
    }

    // Switch
    this.activeTabId = tabId;
    if (this.editor) {
      const model = this.monaco.editor.createModel(tab.code, tab.language);
      this.editor.setModel(model);
    }
  }

  /**
   * Get all tabs
   */
  getTabs(): EditorTab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Format the current code
   */
  async format(): Promise<void> {
    if (!this.editor) return;
    await this.editor.getAction('editor.action.formatDocument')?.run();
  }

  /**
   * Insert text at the current cursor position
   */
  insertAtCursor(text: string): void {
    if (!this.editor) return;
    const position = this.editor.getPosition();
    if (!position) return;
    this.editor.executeEdits('insert', [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      text,
    }]);
  }

  /**
   * Insert a HoloScript object snippet at the cursor
   */
  insertObject(name: string, geometry: string, position: [number, number, number], color: string): void {
    const snippet = [
      '',
      `  object "${name}" {`,
      `    geometry: "${geometry}"`,
      `    color: "${color}"`,
      `    position: [${position.join(', ')}]`,
      `    scale: [1, 1, 1]`,
      `  }`,
      '',
    ].join('\n');
    this.insertAtCursor(snippet);
  }

  /**
   * Get the parsed scene graph (AST)
   */
  parse(): ParseResult {
    const code = this.getCode();
    return parseHoloScript(code);
  }

  /**
   * Highlight a specific object in the editor (scroll to it)
   */
  highlightObject(objectName: string): void {
    if (!this.editor) return;
    const code = this.getCode();
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${objectName}"`)) {
        this.editor.revealLineInCenter(i + 1);
        this.editor.setPosition({ lineNumber: i + 1, column: 1 });
        break;
      }
    }
  }

  /**
   * Add diagnostic markers to the editor
   */
  setDiagnostics(diagnostics: ParseDiagnostic[]): void {
    if (!this.editor || !this.monaco) return;

    const model = this.editor.getModel();
    if (!model) return;

    const markers = diagnostics.map(d => ({
      severity: d.severity === 'error'
        ? this.monaco.MarkerSeverity.Error
        : d.severity === 'warning'
        ? this.monaco.MarkerSeverity.Warning
        : this.monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.startLine,
      startColumn: d.startColumn,
      endLineNumber: d.endLine,
      endColumn: d.endColumn || model.getLineMaxColumn(d.endLine),
    }));

    this.monaco.editor.setModelMarkers(model, 'holoscript', markers);
  }

  /**
   * Dispose the editor and clean up resources
   */
  dispose(): void {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    if (this.editor) {
      this.editor.dispose();
    }
    this.isInitialized = false;
  }

  // --- Private methods ---

  private schedulePreviewUpdate(): void {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => {
      this.parseAndUpdate();
    }, this.config.previewDebounceMs);
  }

  private parseAndUpdate(): void {
    const code = this.getCode();
    const result = parseHoloScript(code);
    this.lastParseResult = result;

    // Update diagnostics in editor
    this.setDiagnostics(result.diagnostics);

    // Notify callbacks
    if (result.diagnostics.some(d => d.severity === 'error')) {
      this.config.onParseError(result.diagnostics);
    }

    this.config.onPreviewUpdate(code, result);
  }

  private findObjectAtLine(lineNumber: number): string | null {
    const code = this.getCode();
    const lines = code.split('\n');

    // Search backwards from the cursor line to find the nearest object/template declaration
    for (let i = lineNumber - 1; i >= 0; i--) {
      const line = lines[i].trim();
      const match = line.match(/^(?:object|template)\s+"([^"]+)"/);
      if (match) return match[1];

      // If we hit a composition or another closing brace at the same level, stop
      if (line.startsWith('composition')) return null;
    }

    return null;
  }
}

// --------------------------------------------------------------------------
// Default scene code
// --------------------------------------------------------------------------

const DEFAULT_SCENE_CODE = `composition "My Scene" {
  environment {
    skybox: "default"
    ambient_light: 0.5
    grid: true
  }

  object "Floor" {
    geometry: "plane"
    color: "#333333"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [20, 20, 1]
  }

  object "Cube" {
    geometry: "cube"
    color: "#00d4ff"
    position: [0, 0.5, -3]
    scale: [1, 1, 1]
  }
}
`;
