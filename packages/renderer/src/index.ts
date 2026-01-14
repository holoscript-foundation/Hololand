/**
 * @hololand/renderer
 *
 * Rendering engine for Hololand worlds
 * Supports both 3D (Three.js/WebXR) and 2D (Canvas) rendering
 */

// 3D Renderer (Three.js + WebXR)
export { HololandRenderer } from './HololandRenderer';

// 2D Renderer (Canvas)
export { Hololand2DRenderer } from './Hololand2DRenderer';
export type { Renderer2DConfig } from './Hololand2DRenderer';

// Logger
export { setHololandRendererLogger, type HololandRendererLogger } from './logger';

// Types
export type { RendererConfig, MaterialConfig, LightingConfig } from './types';

export const HOLOLAND_RENDERER_VERSION = '1.0.0-alpha.1';

import { HololandRenderer } from './HololandRenderer';
import { Hololand2DRenderer } from './Hololand2DRenderer';
export default {
  HololandRenderer,
  Hololand2DRenderer,
  HOLOLAND_RENDERER_VERSION,
};
