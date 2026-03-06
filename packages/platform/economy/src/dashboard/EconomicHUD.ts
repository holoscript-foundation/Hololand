/**
 * @hololand/economy EconomicHUD
 *
 * In-world holographic economic dashboard. Provides real-time
 * economic metrics as HUD elements for VR display.
 */

export interface HUDElement {
  id: string;
  type: 'gauge' | 'chart' | 'text' | 'alert';
  label: string;
  value: number | string;
  unit: string;
  position: { x: number; y: number }; // Normalized 0-1 screen coords
  size: { width: number; height: number };
  color: string;
  visible: boolean;
}

export interface EconomicHUDConfig {
  maxElements: number;
  refreshRateHz: number;
  opacity: number;
  anchorPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const DEFAULT_CONFIG: EconomicHUDConfig = {
  maxElements: 20,
  refreshRateHz: 2,
  opacity: 0.85,
  anchorPosition: 'top-right',
};

/**
 * Holographic economic HUD for VR overlay.
 */
export class EconomicHUD {
  private config: EconomicHUDConfig;
  private elements: Map<string, HUDElement> = new Map();
  private visible: boolean = true;
  private lastRefresh: number = 0;

  constructor(config?: Partial<EconomicHUDConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add or update a HUD element.
   */
  setElement(element: HUDElement): boolean {
    if (this.elements.size >= this.config.maxElements && !this.elements.has(element.id)) {
      return false;
    }
    this.elements.set(element.id, { ...element });
    return true;
  }

  /**
   * Update a metric value on an existing element.
   */
  updateValue(elementId: string, value: number | string): void {
    const el = this.elements.get(elementId);
    if (el) el.value = value;
  }

  /**
   * Get all visible elements for rendering.
   */
  getVisibleElements(): HUDElement[] {
    if (!this.visible) return [];
    return Array.from(this.elements.values())
      .filter((e) => e.visible)
      .map((e) => ({ ...e }));
  }

  /**
   * Check if the HUD should refresh based on its configured rate.
   */
  shouldRefresh(now: number = Date.now()): boolean {
    const interval = 1000 / this.config.refreshRateHz;
    if (now - this.lastRefresh >= interval) {
      this.lastRefresh = now;
      return true;
    }
    return false;
  }

  /**
   * Toggle HUD visibility.
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  removeElement(id: string): void {
    this.elements.delete(id);
  }

  getElementCount(): number {
    return this.elements.size;
  }

  clear(): void {
    this.elements.clear();
  }
}
