/**
 * @hololand/ui
 * 2D UI components for desktop and mobile Hololand applications
 * + 3D HoloPrimitives for HoloScript data cells
 *
 * @packageDocumentation
 */

// Export types
export * from './types';

// Export Holo Primitives (3D data cells)
export * from './holo';

// Export UICanvas
export { UICanvas } from './UICanvas';

// Export all components
export {
  // Base component
  UIComponent,
  // Core components
  Button,
  TextInput,
  Panel,
  Text,
  // Phase 2 components
  Image,
  Slider,
  Toggle,
  Dropdown,
  Modal,
  List,
  // Layout components
  FlexContainer,
  GridContainer,
  ScrollView,
  TabView,
} from './components';

export type {
  UIEvent,
  UIEventHandler,
  ButtonConfig,
  TextInputConfig,
  PanelConfig,
  TextConfig,
  // Phase 2 types
  ImageConfig,
  SliderConfig,
  ToggleConfig,
  DropdownConfig,
  DropdownOption,
  ModalConfig,
  ListConfig,
  ListItem,
  // Layout types
  FlexContainerConfig,
  GridContainerConfig,
  ScrollViewConfig,
  TabViewConfig,
  Tab,
} from './components';

// Version
export const UI_VERSION = '1.0.0-alpha.2';

// Export theme system
export {
  ThemeContext,
  themeContext,
  lightTheme,
  darkTheme,
  highContrastTheme,
} from './theme';

export type {
  Theme,
  ThemeColors,
  ThemeSpacing,
  ThemeTypography,
  ThemeBorders,
  ThemeShadows,
  ThemeTransitions,
} from './theme';
