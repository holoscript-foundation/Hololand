/**
 * Playground Type Definitions
 */

export interface PlaygroundState {
  code: string;
  errors: PlaygroundError[];
  isRunning: boolean;
  selectedObject?: string;
}

export interface PlaygroundError {
  id: string;
  type: 'syntax' | 'runtime' | 'warning';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface CodeCompilationResult {
  success: boolean;
  errors: PlaygroundError[];
  compiled?: any;
  duration: number;
}

export interface EditorState {
  code: string;
  language: 'holoscript';
  isSaved: boolean;
  lastSaved?: Date;
}

export interface PreviewState {
  isLoading: boolean;
  error?: PlaygroundError;
  fps: number;
  renderTime: number;
  objectCount: number;
  selectedObject?: {
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    traits: string[];
    properties: Record<string, unknown>;
    material?: {
      color: string;
      metalness: number;
      roughness: number;
      opacity: number;
    };
    physics?: {
      mass: number;
      friction: number;
      restitution: number;
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface InspectorData {
  selectedId?: string;
  properties: Record<string, any>;
  traits: string[];
}

export interface HoloScriptValidationResult {
  valid: boolean;
  errors: PlaygroundError[];
  warnings: PlaygroundError[];
  ast?: any;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsed: number;
}
