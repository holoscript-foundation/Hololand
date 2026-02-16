export { TemplateLibrary } from './TemplateLibrary';
export { setHololandBuilderLogger, type HololandBuilderLogger } from './logger';
export type { Template, TemplateCategory } from './types';

// Visual Editor
export {
  VisualEditor,
  SceneManager,
  VisualScriptEditor,
  AssetManager,
  HistoryManager,
  getVisualEditor,
  createVisualEditor,
} from './VisualEditor';

// HoloScript I/O - Import/Export functionality
export {
  exportToHoloScript,
  importFromHoloScript,
  sceneToHoloScript,
  holoScriptToScene,
  initHoloScriptParser,
} from './HoloScriptIO';

export type {
  HoloScriptExportOptions,
  HoloScriptImportOptions,
  HoloScriptParseResult,
  HoloScriptError,
} from './HoloScriptIO';

export type {
  // Scene types
  Vector3,
  Quaternion,
  Transform,
  SceneNode,
  SceneNodeType,
  ComponentInstance,
  Scene,
  SceneSettings,
  // Visual scripting types
  VisualScriptNode,
  VisualNodeType,
  NodePort,
  PortType,
  VisualScriptConnection,
  VisualScript,
  ScriptVariable,
  NodeTemplate,
  CompiledScript,
  // Asset types
  AssetReference,
  AssetType,
  AssetLoader,
  // Editor types
  EditorState,
  ViewportState,
  GridSettings,
  SnapSettings,
  EditorMode,
  EditorTool,
  HistoryEntry,
  EditorEvent,
  EditorEventType,
  EditorEventListener,
} from './VisualEditor';

// Brittney AI Integration
export {
  configureBrittney,
  getBrittneyConfig,
  generateFromPrompt,
  explainNode,
  analyzeScene,
  getBrittneyContextMenuActions,
  onBrittneyEvent,
  quickGenerateScene,
  quickAddObject,
  applyGeneratedHoloScript,
} from './BrittneyIntegration';

export type {
  BrittneyConfig,
  GenerationRequest,
  GenerationResult,
  ExplanationResult,
  OptimizationResult,
  OptimizationSuggestion,
  ContextMenuAction,
} from './BrittneyIntegration';

// Brittney UI Integration
export {
  BrittneyUIController,
  createBrittneyUI,
  renderContextMenuHTML,
  renderAIPanelHTML,
  BRITTNEY_UI_STYLES,
} from './BrittneyUI';

export type {
  BrittneyUIConfig,
  ContextMenuState,
  AIPanel,
  PromptDialogState,
  BrittneyUIEventType,
  BrittneyUIEvent,
  BrittneyUIEventListener,
} from './BrittneyUI';

// Multi-Object Editor
export {
  MultiObjectEditor,
  getAvailableTraits,
  getTraitsByCategory,
  getTrait,
  validateTraitCombination,
} from './MultiObjectEditor';

export type {
  VRTrait,
  TraitCategory,
  BatchResult,
  PropertyEdit,
  SelectionGroup,
  AnimationSyncConfig,
  PhysicsConstraint,
  ConstraintType,
  AlignAxis,
  AlignMode,
  DistributeMode,
} from './MultiObjectEditor';

// Performance Tools
export {
  PerformanceProfiler,
  createProfiler,
  analyzeSceneComplexity,
  estimateRenderStats,
  estimateMemoryStats,
  generateRecommendations,
  getBudgetPreset,
} from './PerformanceTools';

export type {
  FrameStats,
  RenderStats,
  MemoryStats,
  SceneComplexity,
  OptimizationRecommendation,
  OptimizationType,
  PerformanceSnapshot,
  PerformanceBudget,
  ProfileConfig,
  ProfileRecording,
} from './PerformanceTools';

export const HOLOLAND_BUILDER_VERSION = '1.1.0';
