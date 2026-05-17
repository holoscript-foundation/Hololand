/**
 * HoloScript Data Cell Primitives for Hololand
 *
 * Minimal data display components designed for 3D space rendering.
 * These are the "view" layer - pure data display with no complex logic.
 *
 * Architecture:
 *   HoloScript (position/layout) → Primitives (data display) → Three.js (3D render)
 *
 * @packageDocumentation
 */

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface HoloStyle {
  color?: string;
  glow?: number;
  opacity?: number;
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fontWeight?: 'normal' | 'medium' | 'bold';
}

export interface DataSource {
  url: string;
  refreshInterval?: number;
  transform?: (data: unknown) => unknown;
}

// Font size mappings (in world units for 3D, or px for 2D)
export const FONT_SIZES = {
  xs: 0.08,
  sm: 0.1,
  md: 0.12,
  lg: 0.16,
  xl: 0.2,
  '2xl': 0.28,
};

export const FONT_SIZES_PX = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

// ============================================================================
// PRIMITIVE DATA STRUCTURES (Framework-agnostic)
// ============================================================================

export interface HoloTextData {
  type: 'text';
  text: string;
  style?: HoloStyle;
  animate?: 'none' | 'fade' | 'typewriter' | 'pulse';
}

export interface HoloMetricData {
  type: 'metric';
  value: number | string;
  label: string;
  unit?: string;
  format?: 'number' | 'percent' | 'currency' | 'duration' | 'bytes';
  trend?: 'up' | 'down' | 'neutral';
  style?: HoloStyle;
}

export interface HoloListItemData {
  id: string;
  primary: string;
  secondary?: string;
  status?: 'active' | 'idle' | 'error' | 'success' | 'warning';
  icon?: string;
}

export interface HoloListData {
  type: 'list';
  items: HoloListItemData[];
  maxVisible?: number;
  style?: HoloStyle;
}

export interface HoloStatusData {
  type: 'status';
  status: 'online' | 'offline' | 'busy' | 'error' | 'idle' | 'thinking';
  label?: string;
  showPulse?: boolean;
  style?: HoloStyle;
}

export interface HoloProgressData {
  type: 'progress';
  value: number;
  max?: number;
  progressType?: 'bar' | 'ring' | 'arc';
  label?: string;
  showValue?: boolean;
  style?: HoloStyle;
}

export interface HoloChartData {
  type: 'chart';
  data: number[];
  chartType?: 'sparkline' | 'bars' | 'area';
  height?: number;
  style?: HoloStyle;
}

export interface HoloInputData {
  type: 'input';
  value: string;
  placeholder?: string;
  inputType?: 'text' | 'password' | 'number' | 'email' | 'textarea';
  label?: string;
  style?: HoloStyle;
}

export interface HoloButtonData {
  type: 'button';
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: HoloStyle;
}

export type HoloPrimitiveData =
  | HoloTextData
  | HoloMetricData
  | HoloListData
  | HoloStatusData
  | HoloProgressData
  | HoloChartData
  | HoloInputData
  | HoloButtonData;

// ============================================================================
// DATA CELL DEFINITION (from HoloScript)
// ============================================================================

export interface DataCellDefinition {
  id?: string;
  type: HoloPrimitiveData['type'];
  position?: [number, number, number];
  position_offset?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  data_source?: string;
  refresh?: number; // seconds
  props?: Record<string, unknown>;
}

// ============================================================================
// FORMATTERS (Pure functions)
// ============================================================================

export function formatMetricValue(
  value: number | string,
  format: HoloMetricData['format'] = 'number'
): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'duration':
      return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
    case 'bytes':
      return value < 1024
        ? `${value}B`
        : value < 1048576
          ? `${(value / 1024).toFixed(1)}KB`
          : `${(value / 1048576).toFixed(1)}MB`;
    default:
      return value.toLocaleString();
  }
}

export const STATUS_COLORS: Record<HoloStatusData['status'], string> = {
  online: '#00ff00',
  offline: '#666666',
  busy: '#ffaa00',
  error: '#ff4444',
  idle: '#00aaff',
  thinking: '#aa00ff',
};

export const STATUS_LABELS: Record<HoloStatusData['status'], string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  error: 'Error',
  idle: 'Idle',
  thinking: 'Thinking',
};

export const TREND_COLORS = { up: '#00ff00', down: '#ff4444', neutral: '#888888' };
export const TREND_ICONS = { up: '▲', down: '▼', neutral: '●' };

export const LIST_STATUS_COLORS: Record<NonNullable<HoloListItemData['status']>, string> = {
  active: '#00ff00',
  idle: '#888888',
  error: '#ff4444',
  success: '#00ff00',
  warning: '#ffaa00',
};

// ============================================================================
// HOLOSCRIPT PARSER
// ============================================================================

export function parseDataCells(holoScript: string): DataCellDefinition[] {
  const cells: DataCellDefinition[] = [];

  // Match data_cell blocks
  const dataCellRegex = /data_cell\s*{([^}]+)}/g;
  let match;

  while ((match = dataCellRegex.exec(holoScript)) !== null) {
    const block = match[1];
    const cell: DataCellDefinition = {
      type: 'text', // default
    };

    // Parse type
    const typeMatch = block.match(/type:\s*"([^"]+)"/);
    if (typeMatch) {
      cell.type = typeMatch[1] as DataCellDefinition['type'];
    }

    // Parse data_source
    const sourceMatch = block.match(/data_source:\s*"([^"]+)"/);
    if (sourceMatch) {
      cell.data_source = sourceMatch[1];
    }

    // Parse refresh (convert "5s" to seconds)
    const refreshMatch = block.match(/refresh:\s*(\d+)s/);
    if (refreshMatch) {
      cell.refresh = parseInt(refreshMatch[1], 10);
    }

    // Parse position
    const posMatch = block.match(/position:\s*\[([^\]]+)\]/);
    if (posMatch) {
      const coords = posMatch[1].split(',').map((s) => parseFloat(s.trim()));
      if (coords.length === 3) {
        cell.position = coords as [number, number, number];
      }
    }

    // Parse position_offset
    const offsetMatch = block.match(/position_offset:\s*\[([^\]]+)\]/);
    if (offsetMatch) {
      const coords = offsetMatch[1].split(',').map((s) => parseFloat(s.trim()));
      if (coords.length === 3) {
        cell.position_offset = coords as [number, number, number];
      }
    }

    // Parse props (simplified)
    const propsMatch = block.match(/props:\s*{([^}]+)}/);
    if (propsMatch) {
      const propsBlock = propsMatch[1];
      cell.props = {};

      // Parse common props
      const labelMatch = propsBlock.match(/label:\s*"([^"]+)"/);
      if (labelMatch) cell.props.label = labelMatch[1];

      const formatMatch = propsBlock.match(/format:\s*"([^"]+)"/);
      if (formatMatch) cell.props.format = formatMatch[1];

      const subTypeMatch = propsBlock.match(/type:\s*"([^"]+)"/);
      if (subTypeMatch) cell.props.type = subTypeMatch[1];

      // Parse style
      const styleMatch = propsBlock.match(/style:\s*{([^}]+)}/);
      if (styleMatch) {
        const styleBlock = styleMatch[1];
        const style: HoloStyle = {};

        const colorMatch = styleBlock.match(/color:\s*"([^"]+)"/);
        if (colorMatch) style.color = colorMatch[1];

        const glowMatch = styleBlock.match(/glow:\s*([\d.]+)/);
        if (glowMatch) style.glow = parseFloat(glowMatch[1]);

        cell.props.style = style;
      }
    }

    cells.push(cell);
  }

  return cells;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const HoloPrimitives = {
  FONT_SIZES,
  FONT_SIZES_PX,
  STATUS_COLORS,
  STATUS_LABELS,
  TREND_COLORS,
  TREND_ICONS,
  LIST_STATUS_COLORS,
  formatMetricValue,
  parseDataCells,
};

export default HoloPrimitives;
