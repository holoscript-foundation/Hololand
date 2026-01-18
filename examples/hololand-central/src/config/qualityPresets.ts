/**
 * Quality Presets Configuration
 * 
 * Defines rendering quality levels for different device capabilities
 */

export interface QualityPreset {
  name: string;
  shadows: 'off' | 'soft' | 'pcf';
  antialiasing: 'off' | 'fxaa' | 'msaa2' | 'msaa4';
  lodMultiplier: number;
  particleMultiplier: number;
  textureQuality: 'low' | 'medium' | 'high';
  maxLights: number;
  postProcessing: boolean;
  targetFPS: number;
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  low: {
    name: 'Low',
    shadows: 'off',
    antialiasing: 'off',
    lodMultiplier: 0.5,
    particleMultiplier: 0.25,
    textureQuality: 'low',
    maxLights: 2,
    postProcessing: false,
    targetFPS: 30,
  },
  medium: {
    name: 'Medium',
    shadows: 'soft',
    antialiasing: 'fxaa',
    lodMultiplier: 1.0,
    particleMultiplier: 0.5,
    textureQuality: 'medium',
    maxLights: 4,
    postProcessing: false,
    targetFPS: 45,
  },
  high: {
    name: 'High',
    shadows: 'pcf',
    antialiasing: 'msaa2',
    lodMultiplier: 1.0,
    particleMultiplier: 1.0,
    textureQuality: 'high',
    maxLights: 8,
    postProcessing: true,
    targetFPS: 60,
  },
  ultra: {
    name: 'Ultra',
    shadows: 'pcf',
    antialiasing: 'msaa4',
    lodMultiplier: 2.0,
    particleMultiplier: 1.0,
    textureQuality: 'high',
    maxLights: 16,
    postProcessing: true,
    targetFPS: 120,
  },
};

/**
 * Device capability detection
 */
export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  gpuTier: 'low' | 'medium' | 'high';
  maxTextureSize: number;
  supportsWebGL2: boolean;
  recommendedPreset: keyof typeof QUALITY_PRESETS;
}

export function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  let gpuTier: 'low' | 'medium' | 'high' = 'medium';
  let maxTextureSize = 4096;
  let isLowEnd = false;
  
  if (gl) {
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    // Try to get GPU info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      
      // Low-end detection
      if (
        renderer.includes('intel') ||
        renderer.includes('mali-4') ||
        renderer.includes('adreno 3') ||
        renderer.includes('powervr') ||
        maxTextureSize < 4096
      ) {
        gpuTier = 'low';
        isLowEnd = true;
      }
      
      // High-end detection
      if (
        renderer.includes('nvidia') ||
        renderer.includes('radeon') ||
        renderer.includes('apple m') ||
        renderer.includes('adreno 6') ||
        renderer.includes('adreno 7')
      ) {
        gpuTier = 'high';
      }
    }
  }
  
  // Memory check
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) {
    isLowEnd = true;
    gpuTier = 'low';
  }
  
  // Recommend preset
  let recommendedPreset: keyof typeof QUALITY_PRESETS = 'medium';
  
  if (isLowEnd || (isMobile && gpuTier !== 'high')) {
    recommendedPreset = 'low';
  } else if (gpuTier === 'high' && !isMobile) {
    recommendedPreset = 'high';
  }
  
  return {
    isMobile,
    isLowEnd,
    gpuTier,
    maxTextureSize,
    supportsWebGL2: !!canvas.getContext('webgl2'),
    recommendedPreset,
  };
}
