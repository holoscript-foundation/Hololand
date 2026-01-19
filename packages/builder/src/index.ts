export { TemplateLibrary } from './TemplateLibrary';
export { setHololandBuilderLogger, type HololandBuilderLogger } from './logger';
export type { Template, TemplateCategory } from './types';

// HoloScript Integration
export {
  HoloScriptExporter,
  exportToHoloScript,
  exportVisualScriptToHoloScript,
  type ExportOptions,
  type ExportResult,
} from './HoloScriptExporter';

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

export const HOLOLAND_BUILDER_VERSION = '1.0.0-alpha.1';
