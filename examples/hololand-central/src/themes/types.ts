export interface ThemeColors {
  primary: number;
  secondary: number;
  accent1: number;
  accent2: number;
  floor: number;
  background: number;
  emissive: number;
}

export interface ThemeLighting {
  ambientIntensity: number;
  mainLightIntensity: number;
  mainLightColor?: number;
  pointLights: Array<{
    position: [number, number, number];
    intensity: number;
    color: number;
    distance: number;
  }>;
}

export interface ThemeFog {
  color: number;
  near: number;
  far: number;
}

export interface ThemeBuilding {
  type: 'box' | 'cylinder' | 'sphere' | 'custom';
  position: [number, number, number];
  size: [number, number, number];
  color: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  rotation?: [number, number, number];
}

export interface ThemeDecoration {
  type: 'particle' | 'model' | 'text' | 'custom';
  position: [number, number, number];
  color?: number;
  size?: number;
  text?: string;
  count?: number;
}

export interface Theme {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  colors: ThemeColors;
  lighting: ThemeLighting;
  fog: ThemeFog;
  buildings: ThemeBuilding[];
  decorations: ThemeDecoration[];
  floorTexture?: string;
  skybox?: string;
}

export type ThemeName = 'cyberpunk' | 'wild-west' | 'cityscape' | 'snowy-town' | 'holiday';
