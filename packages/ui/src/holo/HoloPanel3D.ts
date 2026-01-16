/**
 * HoloPanel3D - Three.js CSS3DObject renderer for HoloPrimitives
 * 
 * Renders React/HTML content in 3D space using CSS3DRenderer.
 * This is the bridge between data cells and the Three.js scene.
 * 
 * Architecture:
 *   DataCellDefinition → HoloPanel3D → CSS3DObject → Three.js Scene
 * 
 * @packageDocumentation
 */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import {
  type DataCellDefinition,
  type HoloStyle,
  formatMetricValue,
  STATUS_COLORS,
  STATUS_LABELS,
  TREND_COLORS,
  TREND_ICONS,
  LIST_STATUS_COLORS,
  FONT_SIZES_PX,
} from './HoloPrimitives';

// ============================================================================
// TYPES
// ============================================================================

export interface HoloPanel3DConfig {
  scene: THREE.Scene;
  camera: THREE.Camera;
  domElement: HTMLElement;
}

export interface PanelInstance {
  id: string;
  object: CSS3DObject;
  element: HTMLDivElement;
  definition: DataCellDefinition;
  refreshInterval?: ReturnType<typeof setInterval>;
}

// ============================================================================
// HOLO PANEL 3D RENDERER
// ============================================================================

export class HoloPanel3D {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private css3DRenderer: CSS3DRenderer;
  private panels: Map<string, PanelInstance> = new Map();
  private panelIdCounter = 0;

  constructor(config: HoloPanel3DConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    
    // Create CSS3D renderer
    this.css3DRenderer = new CSS3DRenderer();
    this.css3DRenderer.setSize(
      config.domElement.clientWidth,
      config.domElement.clientHeight
    );
    this.css3DRenderer.domElement.style.position = 'absolute';
    this.css3DRenderer.domElement.style.top = '0';
    this.css3DRenderer.domElement.style.left = '0';
    this.css3DRenderer.domElement.style.pointerEvents = 'none';
    config.domElement.appendChild(this.css3DRenderer.domElement);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Create a 3D panel from a data cell definition
   */
  createPanel(definition: DataCellDefinition): string {
    const id = definition.id || `panel_${++this.panelIdCounter}`;
    
    // Create HTML element
    const element = this.createPanelElement(definition);
    
    // Create CSS3DObject
    const object = new CSS3DObject(element);
    
    // Set position
    if (definition.position) {
      object.position.set(...definition.position);
    }
    if (definition.position_offset) {
      object.position.add(new THREE.Vector3(...definition.position_offset));
    }
    
    // Set rotation
    if (definition.rotation) {
      object.rotation.set(
        THREE.MathUtils.degToRad(definition.rotation[0]),
        THREE.MathUtils.degToRad(definition.rotation[1]),
        THREE.MathUtils.degToRad(definition.rotation[2])
      );
    }
    
    // Set scale
    const scale = (definition.scale || 1) * 0.01; // Convert to world units
    object.scale.set(scale, scale, scale);
    
    // Add to scene
    this.scene.add(object);
    
    // Store panel instance
    const instance: PanelInstance = { id, object, element, definition };
    
    // Set up data fetching if data_source specified
    if (definition.data_source) {
      this.startDataFetching(instance);
    }
    
    this.panels.set(id, instance);
    return id;
  }

  /**
   * Create multiple panels from HoloScript data cells
   */
  createPanels(definitions: DataCellDefinition[]): string[] {
    return definitions.map(def => this.createPanel(def));
  }

  /**
   * Update panel data
   */
  updatePanel(id: string, data: unknown): void {
    const panel = this.panels.get(id);
    if (!panel) return;
    
    // Re-render the element with new data
    this.updatePanelElement(panel.element, panel.definition, data);
  }

  /**
   * Remove a panel
   */
  removePanel(id: string): void {
    const panel = this.panels.get(id);
    if (!panel) return;
    
    // Clear refresh interval
    if (panel.refreshInterval) {
      clearInterval(panel.refreshInterval);
    }
    
    // Remove from scene
    this.scene.remove(panel.object);
    
    // Remove from map
    this.panels.delete(id);
  }

  /**
   * Render the CSS3D layer (call in animation loop)
   */
  render(): void {
    this.css3DRenderer.render(this.scene, this.camera);
  }

  /**
   * Handle resize
   */
  setSize(width: number, height: number): void {
    this.css3DRenderer.setSize(width, height);
  }

  /**
   * Clean up all panels
   */
  dispose(): void {
    for (const [id] of this.panels) {
      this.removePanel(id);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private createPanelElement(definition: DataCellDefinition): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'holo-panel-3d';
    element.style.cssText = `
      padding: 16px;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid ${definition.props?.style?.color || '#00ffff'}44;
      border-radius: 8px;
      font-family: monospace;
      pointer-events: auto;
      backdrop-filter: blur(10px);
      min-width: 150px;
    `;
    
    // Render initial content
    this.updatePanelElement(element, definition, null);
    
    return element;
  }

  private updatePanelElement(
    element: HTMLDivElement,
    definition: DataCellDefinition,
    data: unknown
  ): void {
    const props = definition.props || {};
    const style = (props.style as HoloStyle) || {};
    const color = style.color || '#00ffff';
    
    switch (definition.type) {
      case 'text':
        element.innerHTML = this.renderText(String(data || props.text || ''), style);
        break;
        
      case 'metric':
        element.innerHTML = this.renderMetric(data, props, style);
        break;
        
      case 'status':
        element.innerHTML = this.renderStatus(data, props, style);
        break;
        
      case 'progress':
        element.innerHTML = this.renderProgress(data, props, style);
        break;
        
      case 'list':
        element.innerHTML = this.renderList(data, props, style);
        break;
        
      case 'chart':
        element.innerHTML = this.renderChart(data, props, style);
        break;
        
      default:
        element.innerHTML = this.renderText('Loading...', { color: '#888' });
    }
  }

  // ============================================================================
  // RENDERERS (Return HTML strings)
  // ============================================================================

  private renderText(text: string, style: HoloStyle): string {
    const color = style.color || '#00ffff';
    const fontSize = FONT_SIZES_PX[style.fontSize || 'md'];
    const glow = style.glow || 0;
    
    return `
      <div style="
        color: ${color};
        font-size: ${fontSize}px;
        font-weight: ${style.fontWeight || 'normal'};
        opacity: ${style.opacity ?? 1};
        text-shadow: ${glow ? `0 0 ${glow * 10}px ${color}` : 'none'};
      ">${text}</div>
    `;
  }

  private renderMetric(data: unknown, props: Record<string, unknown>, style: HoloStyle): string {
    const metricData = data as { value?: number; trend?: string } | number;
    const value = typeof metricData === 'number' ? metricData : metricData?.value ?? 0;
    const trend = typeof metricData === 'object' ? metricData?.trend as 'up' | 'down' | 'neutral' : undefined;
    const color = style.color || '#00ffff';
    const format = props.format as string || 'number';
    const formatted = formatMetricValue(value, format as any);
    
    return `
      <div style="text-align: center;">
        <div style="
          font-size: 32px;
          font-weight: bold;
          color: ${color};
          text-shadow: 0 0 ${(style.glow || 0.5) * 20}px ${color};
        ">
          ${formatted}${props.unit ? `<span style="font-size: 16px; opacity: 0.7;"> ${props.unit}</span>` : ''}
          ${trend ? `<span style="margin-left: 8px; color: ${TREND_COLORS[trend]}; font-size: 16px;">${TREND_ICONS[trend]}</span>` : ''}
        </div>
        <div style="font-size: 14px; color: #888; margin-top: 4px;">
          ${props.label || ''}
        </div>
      </div>
    `;
  }

  private renderStatus(data: unknown, props: Record<string, unknown>, style: HoloStyle): string {
    const statusData = data as { status?: string; label?: string } | string;
    const status = (typeof statusData === 'string' ? statusData : statusData?.status || 'idle') as keyof typeof STATUS_COLORS;
    const label = typeof statusData === 'object' ? statusData?.label : undefined;
    const statusColor = STATUS_COLORS[status] || '#888';
    
    return `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${statusColor};
          box-shadow: 0 0 12px ${statusColor};
          ${status !== 'offline' ? 'animation: pulse 2s infinite;' : ''}
        "></span>
        <span style="color: ${style.color || statusColor};">
          ${label || props.label || STATUS_LABELS[status] || status}
        </span>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    `;
  }

  private renderProgress(data: unknown, props: Record<string, unknown>, style: HoloStyle): string {
    const progressData = data as { value?: number; max?: number } | number;
    const value = typeof progressData === 'number' ? progressData : progressData?.value ?? 0;
    const max = (typeof progressData === 'object' ? progressData?.max : undefined) || (props.max as number) || 100;
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const color = style.color || '#00ffff';
    const type = props.type || 'bar';
    
    if (type === 'ring') {
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percent / 100) * circumference;
      
      return `
        <div style="text-align: center;">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#333" stroke-width="8" />
            <circle
              cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="8"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 50 50)"
              style="filter: drop-shadow(0 0 8px ${color});"
            />
            <text x="50" y="55" text-anchor="middle" fill="${color}" font-size="18" font-family="monospace">
              ${Math.round(percent)}%
            </text>
          </svg>
          ${props.label ? `<div style="color: #888; font-size: 14px;">${props.label}</div>` : ''}
        </div>
      `;
    }
    
    return `
      <div>
        ${props.label ? `<div style="color: #888; font-size: 12px; margin-bottom: 4px;">${props.label}</div>` : ''}
        <div style="
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
        ">
          <div style="
            width: ${percent}%;
            height: 100%;
            background: linear-gradient(90deg, ${color}88, ${color});
            box-shadow: 0 0 10px ${color};
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="text-align: right; color: ${color}; font-size: 12px; margin-top: 4px;">
          ${Math.round(percent)}%
        </div>
      </div>
    `;
  }

  private renderList(data: unknown, props: Record<string, unknown>, style: HoloStyle): string {
    const items = Array.isArray(data) ? data : [];
    const maxVisible = (props.maxVisible as number) || 5;
    const color = style.color || '#00ffff';
    
    return `
      <div style="max-height: ${maxVisible * 48}px; overflow: auto;">
        ${items.slice(0, maxVisible * 2).map(item => {
          const statusColor = item.status ? LIST_STATUS_COLORS[item.status as keyof typeof LIST_STATUS_COLORS] : null;
          return `
            <div style="
              padding: 8px;
              border-bottom: 1px solid ${color}22;
            ">
              <div style="display: flex; align-items: center; gap: 8px;">
                ${statusColor ? `<span style="
                  width: 8px; height: 8px; border-radius: 50%;
                  background-color: ${statusColor};
                  box-shadow: 0 0 8px ${statusColor};
                "></span>` : ''}
                <span style="color: ${color};">
                  ${item.title || item.name || item.primary || String(item)}
                </span>
              </div>
              ${item.secondary || item.description ? `
                <div style="font-size: 12px; color: #666; margin-left: 16px;">
                  ${item.secondary || item.description}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderChart(data: unknown, props: Record<string, unknown>, style: HoloStyle): string {
    const chartData = Array.isArray(data) ? data : [];
    if (!chartData.length) return '<div style="color: #888;">No data</div>';
    
    const color = style.color || '#00ffff';
    const height = (props.height as number) || 60;
    const type = props.chartType || props.type || 'sparkline';
    const max = Math.max(...chartData);
    const min = Math.min(...chartData);
    const range = max - min || 1;
    
    if (type === 'bars') {
      return `
        <div style="display: flex; align-items: flex-end; gap: 2px; height: ${height}px;">
          ${chartData.map(v => `
            <div style="
              flex: 1;
              height: ${((v - min) / range) * 100}%;
              min-height: 2px;
              background: linear-gradient(to top, ${color}44, ${color});
              border-radius: 2px 2px 0 0;
              box-shadow: 0 0 4px ${color}44;
            "></div>
          `).join('')}
        </div>
      `;
    }
    
    // Sparkline/area
    const width = 200;
    const points = chartData.map((v, i) => ({
      x: (i / (chartData.length - 1)) * width,
      y: height - ((v - min) / range) * (height - 10) - 5,
    }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
    const lastPoint = points[points.length - 1];
    
    return `
      <svg width="${width}" height="${height}" style="overflow: visible;">
        ${type === 'area' ? `<path d="${areaD}" fill="${color}22" />` : ''}
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"
          style="filter: drop-shadow(0 0 4px ${color});" />
        <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="4" fill="${color}"
          style="filter: drop-shadow(0 0 6px ${color});" />
      </svg>
    `;
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  private startDataFetching(panel: PanelInstance): void {
    const fetchData = async () => {
      if (!panel.definition.data_source) return;
      
      try {
        const res = await fetch(panel.definition.data_source);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.updatePanelElement(panel.element, panel.definition, data);
      } catch (error) {
        console.error(`Failed to fetch data for panel ${panel.id}:`, error);
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Set up refresh interval
    if (panel.definition.refresh) {
      panel.refreshInterval = setInterval(fetchData, panel.definition.refresh * 1000);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createHoloPanel3D(config: HoloPanel3DConfig): HoloPanel3D {
  return new HoloPanel3D(config);
}

export default HoloPanel3D;
