/**
 * Handoff UI Components
 *
 * Barrel export for cross-reality handoff UI components.
 *
 * @module handoff-ui
 */

export { HandoffInitiator } from './HandoffInitiator';
export type { HandoffInitiatorProps } from './HandoffInitiator';

export { DeviceCard } from './DeviceCard';
export type { DeviceCardProps } from './DeviceCard';

export { PreviewPane } from './PreviewPane';
export type { PreviewPaneProps } from './PreviewPane';

export type {
  DiscoveredDevice,
  TransferState,
  PayloadPreview,
} from './types';

export {
  FORM_FACTOR_ICONS,
  getFormFactorIcon,
  getFormFactorLabel,
} from './types';
