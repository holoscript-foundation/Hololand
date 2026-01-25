/**
 * HoloScript Playground Types
 */

export interface HoloObject {
  name?: string;
  id?: string;
  type?: string;
  geometry?: string;
  position?: [number, number, number] | number[];
  rotation?: [number, number, number] | number[];
  scale?: [number, number, number] | number[];
  color?: string;
  material?: string | object;
  traits?: string[];
  glow?: boolean;
  visible?: boolean;
  children?: HoloObject[];
  [key: string]: any;
}

export interface HoloEnvironment {
  skybox?: string;
  ambient_light?: number;
  fog?: {
    color?: string;
    density?: number;
  };
  grid?: boolean;
  postProcessing?: {
    bloom?: { enabled?: boolean; intensity?: number };
    [key: string]: any;
  };
}

export interface HoloSpatialGroup {
  name: string;
  position?: [number, number, number];
  objects: HoloObject[];
}

export interface HoloAST {
  type?: string;
  name?: string;
  objects: HoloObject[];
  environment: HoloEnvironment;
  spatial_groups?: HoloSpatialGroup[];
  composition?: {
    name?: string;
    objects?: HoloObject[];
    environment?: HoloEnvironment;
  };
  state?: Record<string, any>;
  templates?: Record<string, any>;
  logic?: any[];
}

export interface CompileError {
  line: number;
  column: number;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface CompileResult {
  ast?: HoloAST;
  errors: CompileError[];
  warnings?: CompileError[];
}
