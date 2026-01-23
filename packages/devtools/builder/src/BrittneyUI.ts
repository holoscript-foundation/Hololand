/**
 * Brittney UI Integration
 * 
 * Connects BrittneyIntegration to the WorldBuilder VisualEditor UI.
 * Provides context menu actions, keyboard shortcuts, and panel rendering.
 * 
 * @module BrittneyUI
 */

import type { SceneManager, SceneNode, Scene, EditorEventListener } from './VisualEditor';
import {
  configureBrittney,
  generateFromPrompt,
  explainNode,
  analyzeScene,
  getBrittneyContextMenuActions,
  onBrittneyEvent,
  applyGeneratedHoloScript,
  type BrittneyConfig,
  type GenerationResult,
  type ExplanationResult,
  type OptimizationResult,
  type ContextMenuAction,
} from './BrittneyIntegration';
import { importFromHoloScript } from './HoloScriptIO';

// =============================================================================
// KNOWLEDGE PIPELINE INTEGRATION
// =============================================================================

export interface KnowledgeSearchResult {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  score: number;
}

export interface KnowledgeStats {
  totalEntries: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  trainingQueueSize: number;
  vramAvailable: boolean;
}

/**
 * Fetch knowledge search results from Brittney service
 */
export async function searchKnowledge(
  query: string,
  options: { limit?: number; categories?: string[]; endpoint?: string } = {}
): Promise<KnowledgeSearchResult[]> {
  const { limit = 5, categories, endpoint = 'http://localhost:11435' } = options;

  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (categories?.length) {
      params.set('categories', categories.join(','));
    }

    const response = await fetch(`${endpoint}/knowledge/search?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Get RAG context for a prompt
 */
export async function getRAGContext(
  query: string,
  options: { limit?: number; endpoint?: string } = {}
): Promise<string> {
  const { limit = 3, endpoint = 'http://localhost:11435' } = options;

  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${endpoint}/knowledge/rag?${params}`);
    if (!response.ok) return '';

    const data = await response.json();
    return data.context || '';
  } catch {
    return '';
  }
}

/**
 * Get knowledge stats
 */
export async function getKnowledgeStats(endpoint = 'http://localhost:11435'): Promise<KnowledgeStats | null> {
  try {
    const response = await fetch(`${endpoint}/knowledge/stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Contribute knowledge (requires auth)
 */
export async function contributeKnowledge(
  entry: { category: string; content: string; keywords: string[] },
  options: { authKey?: string; endpoint?: string } = {}
): Promise<{ accepted: boolean; entryId?: string; reason?: string }> {
  const { authKey, endpoint = 'http://localhost:11435' } = options;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authKey) {
      headers['Authorization'] = `Bearer ${authKey}`;
    }

    const response = await fetch(`${endpoint}/knowledge/contribute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    });

    return await response.json();
  } catch (error) {
    return { accepted: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface BrittneyUIConfig extends BrittneyConfig {
  /** Enable keyboard shortcuts */
  enableShortcuts?: boolean;
  /** Show AI generation progress */
  showProgress?: boolean;
  /** Auto-apply generated content */
  autoApply?: boolean;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
  /** Knowledge pipeline endpoint */
  knowledgeEndpoint?: string;
  /** Auth key for knowledge contributions */
  authKey?: string;
}

export interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  targetNode: SceneNode | null;
  actions: ContextMenuAction[];
}

export interface AIPanel {
  type: 'generate' | 'explain' | 'optimize' | 'none';
  visible: boolean;
  loading: boolean;
  result: GenerationResult | ExplanationResult | OptimizationResult | null;
  error: string | null;
}

export interface PromptDialogState {
  visible: boolean;
  title: string;
  placeholder: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

export type BrittneyUIEventType = 
  | 'contextMenu:show'
  | 'contextMenu:hide'
  | 'panel:show'
  | 'panel:hide'
  | 'panel:update'
  | 'prompt:show'
  | 'prompt:hide'
  | 'generation:start'
  | 'generation:complete'
  | 'generation:error'
  | 'shortcut:triggered';

export interface BrittneyUIEvent {
  type: BrittneyUIEventType;
  data: unknown;
}

export type BrittneyUIEventListener = (event: BrittneyUIEvent) => void;

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_UI_CONFIG: Required<BrittneyUIConfig> = {
  apiEndpoint: 'http://localhost:3001/api/brittney',
  apiKey: '',
  model: 'brittney-v3',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 30000,
  enableShortcuts: true,
  showProgress: true,
  autoApply: false,
  maxSuggestions: 5,
  knowledgeEndpoint: 'http://localhost:11435',
  authKey: '',
};

// =============================================================================
// BRITTNEY UI CONTROLLER
// =============================================================================

/**
 * Main controller for Brittney UI integration with WorldBuilder
 */
export class BrittneyUIController {
  private config: Required<BrittneyUIConfig>;
  private sceneManager: SceneManager | null = null;
  private listeners: Set<BrittneyUIEventListener> = new Set();
  private unsubscribeEditor: (() => void) | null = null;
  
  // UI State
  private contextMenuState: ContextMenuState = {
    visible: false,
    position: { x: 0, y: 0 },
    targetNode: null,
    actions: [],
  };
  
  private panelState: AIPanel = {
    type: 'none',
    visible: false,
    loading: false,
    result: null,
    error: null,
  };
  
  private promptDialogState: PromptDialogState = {
    visible: false,
    title: '',
    placeholder: '',
    defaultValue: '',
    resolve: null,
  };

  constructor(config?: BrittneyUIConfig) {
    this.config = { ...DEFAULT_UI_CONFIG, ...config };
    configureBrittney(this.config);
    this.setupBrittneyEvents();
  }

  /**
   * Connect to a SceneManager instance
   */
  connect(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager;
    
    // Subscribe to editor events
    this.unsubscribeEditor = sceneManager.on(this.handleEditorEvent.bind(this));
    
    // Setup keyboard shortcuts if enabled
    if (this.config.enableShortcuts && typeof window !== 'undefined') {
      this.setupKeyboardShortcuts();
    }
  }

  /**
   * Disconnect from SceneManager
   */
  disconnect(): void {
    if (this.unsubscribeEditor) {
      this.unsubscribeEditor();
      this.unsubscribeEditor = null;
    }
    this.sceneManager = null;
    this.removeKeyboardShortcuts();
  }

  /**
   * Subscribe to UI events
   */
  on(listener: BrittneyUIEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: BrittneyUIEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('BrittneyUI event listener error:', e);
      }
    }
  }

  // ===========================================================================
  // CONTEXT MENU
  // ===========================================================================

  /**
   * Show context menu at position
   */
  showContextMenu(x: number, y: number, targetNode?: SceneNode): void {
    const actions = getBrittneyContextMenuActions();
    
    this.contextMenuState = {
      visible: true,
      position: { x, y },
      targetNode: targetNode || null,
      actions: targetNode ? actions : actions.filter(a => 
        a.id === 'brittney-optimize' || a.id === 'brittney-generate-scene'
      ),
    };
    
    this.emit({
      type: 'contextMenu:show',
      data: { ...this.contextMenuState },
    });
  }

  /**
   * Hide context menu
   */
  hideContextMenu(): void {
    this.contextMenuState.visible = false;
    this.emit({ type: 'contextMenu:hide', data: null });
  }

  /**
   * Execute a context menu action
   */
  async executeAction(actionId: string): Promise<void> {
    const action = this.contextMenuState.actions.find(a => a.id === actionId);
    if (!action || !this.sceneManager) return;
    
    this.hideContextMenu();
    
    const scene = this.sceneManager.getScene();
    const node = this.contextMenuState.targetNode;
    
    if (node) {
      await action.handler(node, scene);
    }
  }

  /**
   * Get current context menu state
   */
  getContextMenuState(): ContextMenuState {
    return { ...this.contextMenuState };
  }

  // ===========================================================================
  // AI PANEL
  // ===========================================================================

  /**
   * Show AI generation panel
   */
  async showGeneratePanel(prompt?: string): Promise<void> {
    if (!this.sceneManager) return;
    
    const inputPrompt = prompt || await this.showPromptDialog(
      'Generate with AI',
      'Describe what you want to create...',
    );
    
    if (!inputPrompt) return;
    
    this.panelState = {
      type: 'generate',
      visible: true,
      loading: true,
      result: null,
      error: null,
    };
    this.emit({ type: 'panel:show', data: { ...this.panelState } });
    this.emit({ type: 'generation:start', data: { prompt: inputPrompt } });
    
    try {
      const scene = this.sceneManager.getScene();
      const result = await generateFromPrompt({
        prompt: inputPrompt,
        sceneContext: this.getSceneContext(),
        type: 'scene',
      });
      
      this.panelState = {
        ...this.panelState,
        loading: false,
        result,
        error: result.success ? null : result.error || 'Generation failed',
      };
      
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
      this.emit({ type: 'generation:complete', data: result });
      
      // Auto-apply if enabled
      if (this.config.autoApply && result.success && result.holoScript) {
        this.applyGeneratedContent(result.holoScript);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.panelState = {
        ...this.panelState,
        loading: false,
        error: errorMsg,
      };
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
      this.emit({ type: 'generation:error', data: { error: errorMsg } });
    }
  }

  /**
   * Show explanation panel for a node
   */
  async showExplainPanel(node?: SceneNode): Promise<void> {
    if (!this.sceneManager) return;
    
    const targetNode = node || this.getSelectedNode();
    if (!targetNode) {
      console.warn('No node selected to explain');
      return;
    }
    
    this.panelState = {
      type: 'explain',
      visible: true,
      loading: true,
      result: null,
      error: null,
    };
    this.emit({ type: 'panel:show', data: { ...this.panelState } });
    
    try {
      const scene = this.sceneManager.getScene();
      const result = await explainNode(targetNode, scene);
      
      this.panelState = {
        ...this.panelState,
        loading: false,
        result,
        error: result.success ? null : result.error || 'Explanation failed',
      };
      
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.panelState = {
        ...this.panelState,
        loading: false,
        error: errorMsg,
      };
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
    }
  }

  /**
   * Show optimization panel
   */
  async showOptimizePanel(): Promise<void> {
    if (!this.sceneManager) return;
    
    this.panelState = {
      type: 'optimize',
      visible: true,
      loading: true,
      result: null,
      error: null,
    };
    this.emit({ type: 'panel:show', data: { ...this.panelState } });
    
    try {
      const scene = this.sceneManager.getScene();
      const result = await analyzeScene(scene);
      
      // Limit suggestions
      if (result.suggestions.length > this.config.maxSuggestions) {
        result.suggestions = result.suggestions.slice(0, this.config.maxSuggestions);
      }
      
      this.panelState = {
        ...this.panelState,
        loading: false,
        result,
        error: result.success ? null : result.error || 'Analysis failed',
      };
      
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.panelState = {
        ...this.panelState,
        loading: false,
        error: errorMsg,
      };
      this.emit({ type: 'panel:update', data: { ...this.panelState } });
    }
  }

  /**
   * Hide AI panel
   */
  hidePanel(): void {
    this.panelState = {
      type: 'none',
      visible: false,
      loading: false,
      result: null,
      error: null,
    };
    this.emit({ type: 'panel:hide', data: null });
  }

  /**
   * Get current panel state
   */
  getPanelState(): AIPanel {
    return { ...this.panelState };
  }

  /**
   * Apply generated HoloScript content
   */
  applyGeneratedContent(holoScript: string): void {
    if (!this.sceneManager) return;
    
    const result = importFromHoloScript(holoScript, { merge: true });
    
    if (result.success && result.scene) {
      // Merge nodes into current scene
      for (const [id, node] of result.scene.nodes) {
        this.sceneManager.getScene().nodes.set(id, node);
        if (!node.parent) {
          this.sceneManager.getScene().rootNodes.push(id);
        }
      }
    }
  }

  // ===========================================================================
  // PROMPT DIALOG
  // ===========================================================================

  /**
   * Show a prompt dialog and return user input
   */
  showPromptDialog(title: string, placeholder: string, defaultValue?: string): Promise<string | null> {
    return new Promise(resolve => {
      this.promptDialogState = {
        visible: true,
        title,
        placeholder,
        defaultValue: defaultValue || '',
        resolve,
      };
      this.emit({ type: 'prompt:show', data: { ...this.promptDialogState } });
    });
  }

  /**
   * Submit prompt dialog value
   */
  submitPrompt(value: string): void {
    if (this.promptDialogState.resolve) {
      this.promptDialogState.resolve(value);
    }
    this.closePromptDialog();
  }

  /**
   * Cancel prompt dialog
   */
  cancelPrompt(): void {
    if (this.promptDialogState.resolve) {
      this.promptDialogState.resolve(null);
    }
    this.closePromptDialog();
  }

  private closePromptDialog(): void {
    this.promptDialogState = {
      visible: false,
      title: '',
      placeholder: '',
      defaultValue: '',
      resolve: null,
    };
    this.emit({ type: 'prompt:hide', data: null });
  }

  /**
   * Get current prompt dialog state
   */
  getPromptDialogState(): Omit<PromptDialogState, 'resolve'> {
    const { resolve, ...rest } = this.promptDialogState;
    return rest;
  }

  // ===========================================================================
  // KEYBOARD SHORTCUTS
  // ===========================================================================

  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl+Shift+G - Generate
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        this.emit({ type: 'shortcut:triggered', data: { shortcut: 'generate' } });
        this.showGeneratePanel();
      }
      
      // Ctrl+Shift+E - Explain
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.emit({ type: 'shortcut:triggered', data: { shortcut: 'explain' } });
        this.showExplainPanel();
      }
      
      // Ctrl+Shift+O - Optimize
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        this.emit({ type: 'shortcut:triggered', data: { shortcut: 'optimize' } });
        this.showOptimizePanel();
      }
      
      // Escape - Close panels/menus
      if (e.key === 'Escape') {
        if (this.contextMenuState.visible) {
          this.hideContextMenu();
        } else if (this.panelState.visible) {
          this.hidePanel();
        } else if (this.promptDialogState.visible) {
          this.cancelPrompt();
        }
      }
    };
    
    window.addEventListener('keydown', this.keyboardHandler);
  }

  private removeKeyboardShortcuts(): void {
    if (this.keyboardHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private setupBrittneyEvents(): void {
    // Forward Brittney events to UI events
    onBrittneyEvent('brittney:generation-complete', (data) => {
      this.emit({ type: 'generation:complete', data });
    });
    
    onBrittneyEvent('brittney:generation-error', (data) => {
      this.emit({ type: 'generation:error', data });
    });
    
    onBrittneyEvent('brittney:prompt-requested', (data: unknown) => {
      const { message, defaultValue, callback } = data as {
        message: string;
        defaultValue?: string;
        callback: (value: string | null) => void;
      };
      
      this.showPromptDialog('Input Required', message, defaultValue)
        .then(callback);
    });
  }

  private handleEditorEvent: EditorEventListener = (event) => {
    // Handle node selection for context-aware actions
    if (event.type === 'node:selected') {
      // Could update UI state here
    }
  };

  private getSelectedNode(): SceneNode | null {
    if (!this.sceneManager) return null;
    const scene = this.sceneManager.getScene();
    // Find first selected node (would need selection state from editor)
    for (const [, node] of scene.nodes) {
      if (node.metadata?.selected) {
        return node;
      }
    }
    return null;
  }

  private getSceneContext(): string {
    if (!this.sceneManager) return '';
    // Would use exportToHoloScript here
    return '';
  }
}

// =============================================================================
// REACT-STYLE RENDER HELPERS
// =============================================================================

/**
 * Generate context menu HTML
 */
export function renderContextMenuHTML(state: ContextMenuState): string {
  if (!state.visible) return '';
  
  const items = state.actions.map(action => `
    <div class="brittney-context-item" data-action="${action.id}">
      <span class="icon">${action.icon || ''}</span>
      <span class="label">${action.label}</span>
      ${action.shortcut ? `<span class="shortcut">${action.shortcut}</span>` : ''}
    </div>
  `).join('');
  
  return `
    <div class="brittney-context-menu" style="left: ${state.position.x}px; top: ${state.position.y}px;">
      <div class="brittney-context-header">
        <span class="icon">✨</span> Brittney AI
      </div>
      ${items}
    </div>
  `;
}

/**
 * Generate AI panel HTML
 */
export function renderAIPanelHTML(state: AIPanel): string {
  if (!state.visible) return '';
  
  let content = '';
  
  if (state.loading) {
    content = `
      <div class="brittney-loading">
        <div class="spinner"></div>
        <span>Thinking...</span>
      </div>
    `;
  } else if (state.error) {
    content = `
      <div class="brittney-error">
        <span class="icon">❌</span>
        <span>${state.error}</span>
      </div>
    `;
  } else if (state.result) {
    switch (state.type) {
      case 'generate':
        const genResult = state.result as GenerationResult;
        content = `
          <div class="brittney-generate-result">
            ${genResult.explanation ? `<p class="explanation">${genResult.explanation}</p>` : ''}
            ${genResult.holoScript ? `<pre class="code">${escapeHtml(genResult.holoScript)}</pre>` : ''}
            <div class="actions">
              <button class="apply-btn">Apply to Scene</button>
              <button class="copy-btn">Copy Code</button>
            </div>
          </div>
        `;
        break;
        
      case 'explain':
        const expResult = state.result as ExplanationResult;
        content = `
          <div class="brittney-explain-result">
            <p class="explanation">${expResult.explanation}</p>
            ${expResult.suggestions?.length ? `
              <div class="suggestions">
                <h4>Suggestions:</h4>
                <ul>
                  ${expResult.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `;
        break;
        
      case 'optimize':
        const optResult = state.result as OptimizationResult;
        content = `
          <div class="brittney-optimize-result">
            <div class="health-score">
              <span class="label">Scene Health:</span>
              <span class="score">${optResult.healthScore || 0}%</span>
            </div>
            <div class="suggestions">
              ${optResult.suggestions.map(s => `
                <div class="suggestion ${s.severity}">
                  <span class="type">${s.type}</span>
                  <span class="title">${s.title}</span>
                  <p class="description">${s.description}</p>
                  ${s.autoFix ? '<button class="autofix-btn">Auto Fix</button>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
    }
  }
  
  const titles = {
    generate: '✨ Generate with AI',
    explain: '💡 Explanation',
    optimize: '⚡ Optimization',
    none: '',
  };
  
  return `
    <div class="brittney-panel ${state.type}">
      <div class="brittney-panel-header">
        <span>${titles[state.type]}</span>
        <button class="close-btn">×</button>
      </div>
      <div class="brittney-panel-content">
        ${content}
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// CSS STYLES
// =============================================================================

export const BRITTNEY_UI_STYLES = `
.brittney-context-menu {
  position: absolute;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  z-index: 9999;
  overflow: hidden;
}

.brittney-context-header {
  padding: 8px 12px;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.brittney-context-item {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #cdd6f4;
  transition: background 0.15s;
}

.brittney-context-item:hover {
  background: #313244;
}

.brittney-context-item .icon {
  width: 20px;
  text-align: center;
}

.brittney-context-item .label {
  flex: 1;
}

.brittney-context-item .shortcut {
  font-size: 0.8em;
  color: #6c7086;
}

.brittney-panel {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 400px;
  max-height: 80vh;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 9998;
  overflow: hidden;
}

.brittney-panel-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: white;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brittney-panel-header .close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.8;
}

.brittney-panel-header .close-btn:hover {
  opacity: 1;
}

.brittney-panel-content {
  padding: 16px;
  color: #cdd6f4;
  max-height: calc(80vh - 50px);
  overflow-y: auto;
}

.brittney-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
}

.brittney-loading .spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #313244;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.brittney-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f38ba833;
  border-radius: 8px;
  color: #f38ba8;
}

.brittney-generate-result .code {
  background: #11111b;
  padding: 12px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
  overflow-x: auto;
  margin: 12px 0;
}

.brittney-generate-result .actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.brittney-generate-result button,
.suggestion .autofix-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}

.brittney-generate-result .apply-btn {
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: white;
}

.brittney-generate-result .copy-btn {
  background: #313244;
  color: #cdd6f4;
}

.health-score {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 18px;
}

.health-score .score {
  font-weight: 700;
  color: #a6e3a1;
}

.suggestion {
  padding: 12px;
  margin: 8px 0;
  border-radius: 8px;
  border-left: 4px solid;
}

.suggestion.info {
  background: #89b4fa22;
  border-color: #89b4fa;
}

.suggestion.warning {
  background: #fab38722;
  border-color: #fab387;
}

.suggestion.critical {
  background: #f38ba822;
  border-color: #f38ba8;
}

.suggestion .type {
  font-size: 0.8em;
  text-transform: uppercase;
  opacity: 0.7;
}

.suggestion .title {
  font-weight: 600;
  display: block;
  margin: 4px 0;
}

.suggestion .description {
  font-size: 0.9em;
  opacity: 0.9;
  margin: 4px 0;
}

.suggestion .autofix-btn {
  background: #a6e3a1;
  color: #1e1e2e;
  margin-top: 8px;
}
`;

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create and initialize a BrittneyUI controller
 */
export function createBrittneyUI(
  sceneManager: SceneManager,
  config?: BrittneyUIConfig
): BrittneyUIController {
  const controller = new BrittneyUIController(config);
  controller.connect(sceneManager);
  return controller;
}
