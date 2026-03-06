import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/platform/renderer/vitest.config.ts',
  'packages/platform/core/vitest.config.ts',
  'packages/platform/backend/vitest.config.ts',
  'packages/platform/network/vitest.config.ts',
  'packages/platform/agents/vitest.config.ts',
  'packages/shared/ui/vitest.config.ts',
  'packages/adapters/three/vitest.config.ts',
  'packages/adapters/unity/vitest.config.ts',
  'packages/creation-tools/vitest.config.ts',
  'packages/base-token-viz/vitest.config.ts',
  'packages/ar/model-viewer/vitest.config.ts',
]);
