/**
 * @hololand/ui
 * 2D UI components for desktop and mobile Hololand applications
 *
 * @packageDocumentation
 */

// Export types
export * from './types';

// Export UICanvas
export { UICanvas } from './UICanvas';

// Export all components
export {
  UIComponent,
  Button,
  TextInput,
  Panel,
  Text,
} from './components';

export type {
  UIEvent,
  UIEventHandler,
  ButtonConfig,
  TextInputConfig,
  PanelConfig,
  TextConfig,
} from './components';

// Version
export const UI_VERSION = '1.0.0-alpha.1';
