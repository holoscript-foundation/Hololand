/**
 * @hololand/ui - Components
 * Export all UI components
 */

// Base component
export { UIComponent } from './UIComponent';
export type { UIEvent, UIEventHandler } from './UIComponent';

// Core components
export { Button } from './Button';
export type { ButtonConfig } from './Button';

export { TextInput } from './TextInput';
export type { TextInputConfig } from './TextInput';

export { Panel } from './Panel';
export type { PanelConfig } from './Panel';

export { Text } from './Text';
export type { TextConfig } from './Text';

// Phase 2 components
export { Image } from './Image';
export type { ImageConfig } from './Image';

export { Slider } from './Slider';
export type { SliderConfig } from './Slider';

export { Toggle } from './Toggle';
export type { ToggleConfig } from './Toggle';

export { Dropdown } from './Dropdown';
export type { DropdownConfig, DropdownOption } from './Dropdown';

export { Modal } from './Modal';
export type { ModalConfig } from './Modal';

export { List } from './List';
export type { ListConfig, ListItem } from './List';

// Layout components
export { FlexContainer } from './FlexContainer';
export type { FlexContainerConfig } from './FlexContainer';

export { GridContainer } from './GridContainer';
export type { GridContainerConfig } from './GridContainer';

export { ScrollView } from './ScrollView';
export type { ScrollViewConfig } from './ScrollView';

export { TabView } from './TabView';
export type { TabViewConfig, Tab } from './TabView';

// HUD components
export { HudComponent, StatusHud } from './HudComponent';

// Economy dashboard components (Layer 6: Transparency)
export {
  EconomyComponent,
  FaucetSinkGauge,
  GiniChart,
  VelocityMeter,
  BondingCurveChart,
  PIDStatusDisplay,
  ECONOMY_COLORS,
} from './economy';

export type {
  RenderingContext,
  WebXRGeometryData,
  EconomyComponentConfig,
  TimeSeriesPoint,
  FaucetSinkData,
  FaucetSinkGaugeConfig,
  GiniChartConfig,
  VelocityMeterConfig,
  BondingCurveType,
  BondingCurveChartConfig,
  PIDLoopData,
  PIDStatusDisplayConfig,
  A11yAnnouncement,
  A11yDescription,
} from './economy';
