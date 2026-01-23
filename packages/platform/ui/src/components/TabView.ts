/**
 * @hololand/ui - TabView Component
 * Tabbed interface for switching between content panels
 */

import { UIComponent } from './UIComponent';
import type { UIComponentConfig, Vector2 } from '../types';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  content?: UIComponent;
}

export interface TabViewConfig extends UIComponentConfig {
  tabs?: Tab[];
  activeTabId?: string;
  tabPosition?: 'top' | 'bottom' | 'left' | 'right';
  tabHeight?: number;
  tabWidth?: number;
  tabGap?: number;
  backgroundColor?: string;
  tabBackgroundColor?: string;
  activeTabColor?: string;
  hoverTabColor?: string;
  textColor?: string;
  activeTextColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  indicatorColor?: string;
  indicatorHeight?: number;
  onTabChange?: (tabId: string, tab: Tab) => void;
}

/**
 * Tabbed container for switching between content panels
 */
export class TabView extends UIComponent {
  private _tabs: Tab[];
  private _activeTabId: string | null;
  private _tabPosition: 'top' | 'bottom' | 'left' | 'right';
  private _tabHeight: number;
  private _tabWidth: number;
  private _tabGap: number;
  private _backgroundColor: string;
  private _tabBackgroundColor: string;
  private _activeTabColor: string;
  private _hoverTabColor: string;
  private _textColor: string;
  private _activeTextColor: string;
  private _borderRadius: number;
  private _borderColor: string;
  private _borderWidth: number;
  private _fontSize: number;
  private _indicatorColor: string;
  private _indicatorHeight: number;
  private _hoveredTabId: string | null = null;
  private _onTabChange?: (tabId: string, tab: Tab) => void;

  constructor(config: TabViewConfig) {
    super(config);

    this._tabs = config.tabs || [];
    this._activeTabId = config.activeTabId || (this._tabs.length > 0 ? this._tabs[0].id : null);
    this._tabPosition = config.tabPosition || 'top';
    this._tabHeight = config.tabHeight ?? 40;
    this._tabWidth = config.tabWidth ?? 0; // 0 = auto-size
    this._tabGap = config.tabGap ?? 4;
    this._backgroundColor = config.backgroundColor || '#ffffff';
    this._tabBackgroundColor = config.tabBackgroundColor || 'transparent';
    this._activeTabColor = config.activeTabColor || '#ffffff';
    this._hoverTabColor = config.hoverTabColor || '#f5f5f5';
    this._textColor = config.textColor || '#666666';
    this._activeTextColor = config.activeTextColor || '#333333';
    this._borderRadius = config.borderRadius ?? 4;
    this._borderColor = config.borderColor || '#e0e0e0';
    this._borderWidth = config.borderWidth ?? 1;
    this._fontSize = config.fontSize ?? 14;
    this._indicatorColor = config.indicatorColor || '#3498db';
    this._indicatorHeight = config.indicatorHeight ?? 3;
    this._onTabChange = config.onTabChange;

    // Set default size if not provided
    if (!config.size) {
      this._size = { width: 400, height: 300 };
    }
  }

  // Getters/setters
  get tabs(): Tab[] { return [...this._tabs]; }
  set tabs(value: Tab[]) {
    this._tabs = value;
    if (!this._tabs.find(t => t.id === this._activeTabId)) {
      this._activeTabId = this._tabs.length > 0 ? this._tabs[0].id : null;
    }
    this.markDirty();
  }

  get activeTabId(): string | null { return this._activeTabId; }
  set activeTabId(id: string | null) {
    if (id !== this._activeTabId) {
      const tab = this._tabs.find(t => t.id === id);
      if (tab && !tab.disabled) {
        this._activeTabId = id;
        this.markDirty();
        this._onTabChange?.(id!, tab);
        this.emit('tabchange', { position: { x: 0, y: 0 } });
      }
    }
  }

  get activeTab(): Tab | null {
    return this._tabs.find(t => t.id === this._activeTabId) || null;
  }

  /**
   * Add tab
   */
  addTab(tab: Tab): void {
    this._tabs.push(tab);
    if (!this._activeTabId) {
      this._activeTabId = tab.id;
    }
    this.markDirty();
  }

  /**
   * Remove tab
   */
  removeTab(id: string): void {
    const index = this._tabs.findIndex(t => t.id === id);
    if (index >= 0) {
      this._tabs.splice(index, 1);
      if (this._activeTabId === id) {
        this._activeTabId = this._tabs.length > 0 ? this._tabs[0].id : null;
      }
      this.markDirty();
    }
  }

  /**
   * Get tab bar area
   */
  private getTabBarRect(): { x: number; y: number; width: number; height: number } {
    const { x, y, width, height } = this.getBounds();
    const isHorizontal = this._tabPosition === 'top' || this._tabPosition === 'bottom';

    if (isHorizontal) {
      return {
        x,
        y: this._tabPosition === 'top' ? y : y + height - this._tabHeight,
        width,
        height: this._tabHeight
      };
    } else {
      const tabBarWidth = this._tabWidth || 100;
      return {
        x: this._tabPosition === 'left' ? x : x + width - tabBarWidth,
        y,
        width: tabBarWidth,
        height
      };
    }
  }

  /**
   * Get content area
   */
  private getContentRect(): { x: number; y: number; width: number; height: number } {
    const { x, y, width, height } = this.getBounds();
    const isHorizontal = this._tabPosition === 'top' || this._tabPosition === 'bottom';

    if (isHorizontal) {
      const contentY = this._tabPosition === 'top' ? y + this._tabHeight : y;
      return {
        x,
        y: contentY,
        width,
        height: height - this._tabHeight
      };
    } else {
      const tabBarWidth = this._tabWidth || 100;
      const contentX = this._tabPosition === 'left' ? x + tabBarWidth : x;
      return {
        x: contentX,
        y,
        width: width - tabBarWidth,
        height
      };
    }
  }

  /**
   * Get tab dimensions
   */
  private getTabRects(): Map<string, { x: number; y: number; width: number; height: number }> {
    const tabBar = this.getTabBarRect();
    const rects = new Map<string, { x: number; y: number; width: number; height: number }>();
    const isHorizontal = this._tabPosition === 'top' || this._tabPosition === 'bottom';

    if (isHorizontal) {
      const tabWidth = this._tabWidth || Math.min((tabBar.width - this._tabGap * (this._tabs.length - 1)) / this._tabs.length, 120);
      let currentX = tabBar.x;

      for (const tab of this._tabs) {
        rects.set(tab.id, {
          x: currentX,
          y: tabBar.y,
          width: tabWidth,
          height: this._tabHeight
        });
        currentX += tabWidth + this._tabGap;
      }
    } else {
      let currentY = tabBar.y;

      for (const tab of this._tabs) {
        rects.set(tab.id, {
          x: tabBar.x,
          y: currentY,
          width: tabBar.width,
          height: this._tabHeight
        });
        currentY += this._tabHeight + this._tabGap;
      }
    }

    return rects;
  }

  /**
   * Render tab view to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this._visible) return;

    const { x, y, width, height } = this.getBounds();
    const tabBar = this.getTabBarRect();
    const contentRect = this.getContentRect();
    const tabRects = this.getTabRects();
    const isHorizontal = this._tabPosition === 'top' || this._tabPosition === 'bottom';

    // Draw background
    ctx.fillStyle = this._backgroundColor;
    if (this._borderRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

    // Draw border
    if (this._borderWidth > 0) {
      ctx.strokeStyle = this._borderColor;
      ctx.lineWidth = this._borderWidth;
      if (this._borderRadius > 0) {
        this.drawRoundedRect(ctx, x, y, width, height, this._borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    }

    // Draw tabs
    for (const tab of this._tabs) {
      const rect = tabRects.get(tab.id)!;
      const isActive = tab.id === this._activeTabId;
      const isHovered = tab.id === this._hoveredTabId;

      // Tab background
      if (isActive) {
        ctx.fillStyle = this._activeTabColor;
      } else if (isHovered && !tab.disabled) {
        ctx.fillStyle = this._hoverTabColor;
      } else {
        ctx.fillStyle = this._tabBackgroundColor;
      }

      if (this._tabBackgroundColor !== 'transparent' || isActive || isHovered) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      // Tab text
      ctx.fillStyle = tab.disabled ? '#bdc3c7' : (isActive ? this._activeTextColor : this._textColor);
      ctx.font = `${isActive ? '600' : '400'} ${this._fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width - 16);

      // Active indicator
      if (isActive) {
        ctx.fillStyle = this._indicatorColor;
        if (isHorizontal) {
          const indicatorY = this._tabPosition === 'top'
            ? rect.y + rect.height - this._indicatorHeight
            : rect.y;
          ctx.fillRect(rect.x, indicatorY, rect.width, this._indicatorHeight);
        } else {
          const indicatorX = this._tabPosition === 'left'
            ? rect.x + rect.width - this._indicatorHeight
            : rect.x;
          ctx.fillRect(indicatorX, rect.y, this._indicatorHeight, rect.height);
        }
      }
    }

    // Draw tab bar border
    ctx.strokeStyle = this._borderColor;
    ctx.lineWidth = 1;
    if (isHorizontal) {
      const borderY = this._tabPosition === 'top' ? tabBar.y + tabBar.height : tabBar.y;
      ctx.beginPath();
      ctx.moveTo(tabBar.x, borderY);
      ctx.lineTo(tabBar.x + tabBar.width, borderY);
      ctx.stroke();
    } else {
      const borderX = this._tabPosition === 'left' ? tabBar.x + tabBar.width : tabBar.x;
      ctx.beginPath();
      ctx.moveTo(borderX, tabBar.y);
      ctx.lineTo(borderX, tabBar.y + tabBar.height);
      ctx.stroke();
    }

    // Render active tab content
    const activeTab = this.activeTab;
    if (activeTab?.content) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(contentRect.x, contentRect.y, contentRect.width, contentRect.height);
      ctx.clip();

      // Position content
      activeTab.content.x = contentRect.x;
      activeTab.content.y = contentRect.y;
      activeTab.content.render(ctx);

      ctx.restore();
    }

    // Render children (for custom content)
    this._children.forEach(child => {
      if (child.visible) {
        child.render(ctx);
      }
    });

    this._dirty = false;
  }

  /**
   * Draw rounded rectangle path
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Get tab at point
   */
  private getTabAtPoint(point: Vector2): Tab | null {
    const tabRects = this.getTabRects();

    for (const tab of this._tabs) {
      const rect = tabRects.get(tab.id)!;
      if (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
      ) {
        return tab;
      }
    }

    return null;
  }

  // Override pointer handlers
  handlePointerDown(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    const tab = this.getTabAtPoint(point);
    if (tab && !tab.disabled) {
      this.activeTabId = tab.id;
      return true;
    }

    // Check active content
    const activeTab = this.activeTab;
    if (activeTab?.content) {
      if (activeTab.content.handlePointerDown(point)) {
        return true;
      }
    }

    // Check children
    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerDown(point)) {
        return true;
      }
    }

    return this.containsPoint(point);
  }

  handlePointerMove(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    const tab = this.getTabAtPoint(point);
    const newHoveredId = tab?.id || null;

    if (newHoveredId !== this._hoveredTabId) {
      this._hoveredTabId = newHoveredId;
      this.markDirty();
    }

    // Check active content
    const activeTab = this.activeTab;
    if (activeTab?.content) {
      activeTab.content.handlePointerMove(point);
    }

    // Check children
    for (const child of this._children) {
      child.handlePointerMove(point);
    }

    return this.containsPoint(point);
  }

  handlePointerUp(point: Vector2): boolean {
    if (!this._visible || !this._enabled) return false;

    // Check active content
    const activeTab = this.activeTab;
    if (activeTab?.content) {
      if (activeTab.content.handlePointerUp(point)) {
        return true;
      }
    }

    // Check children
    for (let i = this._children.length - 1; i >= 0; i--) {
      if (this._children[i].handlePointerUp(point)) {
        return true;
      }
    }

    return this.containsPoint(point);
  }
}
