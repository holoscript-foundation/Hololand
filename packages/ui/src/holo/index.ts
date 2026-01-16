/**
 * @hololand/ui - Holo Primitives
 * 
 * 3D data display components for HoloScript integration.
 * 
 * @packageDocumentation
 */

// Primitive data types and formatters
export {
  // Types
  type HoloStyle,
  type DataSource,
  type HoloTextData,
  type HoloMetricData,
  type HoloListItemData,
  type HoloListData,
  type HoloStatusData,
  type HoloProgressData,
  type HoloChartData,
  type HoloInputData,
  type HoloButtonData,
  type HoloPrimitiveData,
  type DataCellDefinition,
  // Constants
  FONT_SIZES,
  FONT_SIZES_PX,
  STATUS_COLORS,
  STATUS_LABELS,
  TREND_COLORS,
  TREND_ICONS,
  LIST_STATUS_COLORS,
  // Functions
  formatMetricValue,
  parseDataCells,
  HoloPrimitives,
} from './HoloPrimitives';

// 3D Panel Renderer
export {
  HoloPanel3D,
  createHoloPanel3D,
  type HoloPanel3DConfig,
  type PanelInstance,
} from './HoloPanel3D';
