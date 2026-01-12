/**
 * @hololand/renderer
 *
 * Three.js renderer for Hololand worlds
 * Complete 3D rendering with VR support
 */

export { HololandRenderer } from './HololandRenderer';
export { setHololandRendererLogger, type HololandRendererLogger } from './logger';
export type { RendererConfig, MaterialConfig, LightingConfig } from './types';

export const HOLOLAND_RENDERER_VERSION = '1.0.0-alpha.1';

import { HololandRenderer } from './HololandRenderer';
export default {
  HololandRenderer,
  HOLOLAND_RENDERER_VERSION,
};
