/**
 * DeviceLayout - Adaptive Layout System for Brittney Toolkit
 * 
 * Provides device-aware positioning and layout for the chat widget
 * across mobile, tablet, desktop, VR, and AR devices.
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'vr' | 'ar';

export type LayoutPosition = 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-right' 
  | 'top-left' 
  | 'center' 
  | 'fullscreen'
  | 'floating'
  | 'docked-left'
  | 'docked-right'
  | 'docked-bottom';

export interface LayoutConfig {
  /** Force a specific device type (auto-detected if not set) */
  device?: DeviceType;
  /** Preferred position for desktop */
  desktopPosition?: LayoutPosition;
  /** Preferred position for tablet */
  tabletPosition?: LayoutPosition;
  /** Preferred position for mobile */
  mobilePosition?: LayoutPosition;
  /** Preferred position for VR */
  vrPosition?: LayoutPosition;
  /** Preferred position for AR */
  arPosition?: LayoutPosition;
  /** Enable drag-to-reposition */
  draggable?: boolean;
  /** Remember position across sessions */
  rememberPosition?: boolean;
  /** Animate position changes */
  animateTransitions?: boolean;
  /** Safe area insets (for notched devices) */
  safeArea?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Custom breakpoints */
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export interface LayoutState {
  device: DeviceType;
  position: LayoutPosition;
  width: number;
  height: number;
  x: number;
  y: number;
  isFullscreen: boolean;
  isDragging: boolean;
  safeArea: Required<NonNullable<LayoutConfig['safeArea']>>;
}

export interface Dimensions {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
  minHeight: number;
}

/** Internal config with all values resolved */
interface NormalizedLayoutConfig {
  device: DeviceType;
  desktopPosition: LayoutPosition;
  tabletPosition: LayoutPosition;
  mobilePosition: LayoutPosition;
  vrPosition: LayoutPosition;
  arPosition: LayoutPosition;
  draggable: boolean;
  rememberPosition: boolean;
  animateTransitions: boolean;
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * DeviceLayout class for adaptive positioning
 */
export class DeviceLayout {
  private config: NormalizedLayoutConfig;
  private state: LayoutState;
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueryList: MediaQueryList | null = null;
  private storageKey = 'brittney-layout-position';
  private listeners: Set<(state: LayoutState) => void> = new Set();

  constructor(config: LayoutConfig = {}) {
    this.config = {
      device: config.device || this.detectDevice(),
      desktopPosition: config.desktopPosition || 'bottom-right',
      tabletPosition: config.tabletPosition || 'bottom-right',
      mobilePosition: config.mobilePosition || 'fullscreen',
      vrPosition: config.vrPosition || 'center',
      arPosition: config.arPosition || 'floating',
      draggable: config.draggable ?? true,
      rememberPosition: config.rememberPosition ?? true,
      animateTransitions: config.animateTransitions ?? true,
      safeArea: {
        top: config.safeArea?.top ?? 0,
        bottom: config.safeArea?.bottom ?? 0,
        left: config.safeArea?.left ?? 0,
        right: config.safeArea?.right ?? 0,
      },
      breakpoints: {
        mobile: config.breakpoints?.mobile ?? 768,
        tablet: config.breakpoints?.tablet ?? 1024,
        desktop: config.breakpoints?.desktop ?? 1440,
      },
    };

    this.state = this.initializeState();
    this.setupListeners();
  }

  /**
   * Detect the current device type
   */
  private detectDevice(): DeviceType {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for XR capabilities
    if ('xr' in navigator) {
      // Could check for immersive-vr or immersive-ar support
    }

    // VR headsets
    if (userAgent.includes('oculus') || userAgent.includes('quest') || userAgent.includes('vive') || userAgent.includes('pico')) {
      return 'vr';
    }

    // AR devices
    if (userAgent.includes('hololens') || userAgent.includes('magic leap') || userAgent.includes('nreal')) {
      return 'ar';
    }

    // Standard device detection
    if (width < this.config.breakpoints.mobile) return 'mobile';
    if (width < this.config.breakpoints.tablet) return 'tablet';
    return 'desktop';
  }

  /**
   * Initialize layout state
   */
  private initializeState(): LayoutState {
    const device = this.config.device;
    const position = this.getDefaultPosition(device);
    const dimensions = this.getDimensions(device);
    const coords = this.getInitialCoordinates(position, dimensions);

    // Try to restore saved position
    if (this.config.rememberPosition && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.device === device) {
            return {
              ...parsed,
              safeArea: this.config.safeArea,
            };
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    return {
      device,
      position,
      width: dimensions.width,
      height: dimensions.height,
      x: coords.x,
      y: coords.y,
      isFullscreen: position === 'fullscreen',
      isDragging: false,
      safeArea: this.config.safeArea,
    };
  }

  /**
   * Get default position for device type
   */
  private getDefaultPosition(device: DeviceType): LayoutPosition {
    switch (device) {
      case 'mobile': return this.config.mobilePosition;
      case 'tablet': return this.config.tabletPosition;
      case 'desktop': return this.config.desktopPosition;
      case 'vr': return this.config.vrPosition;
      case 'ar': return this.config.arPosition;
      default: return 'bottom-right';
    }
  }

  /**
   * Get dimensions for device type
   */
  getDimensions(device: DeviceType = this.state?.device || 'desktop'): Dimensions {
    const viewport = this.getViewport();

    switch (device) {
      case 'mobile':
        return {
          width: viewport.width,
          height: viewport.height,
          maxWidth: viewport.width,
          maxHeight: viewport.height,
          minWidth: 280,
          minHeight: 400,
        };

      case 'tablet':
        return {
          width: Math.min(400, viewport.width - 40),
          height: Math.min(600, viewport.height - 80),
          maxWidth: viewport.width - 40,
          maxHeight: viewport.height - 80,
          minWidth: 320,
          minHeight: 450,
        };

      case 'desktop':
        return {
          width: 380,
          height: 520,
          maxWidth: 600,
          maxHeight: viewport.height - 100,
          minWidth: 300,
          minHeight: 400,
        };

      case 'vr':
        return {
          width: 500,
          height: 600,
          maxWidth: 800,
          maxHeight: 800,
          minWidth: 400,
          minHeight: 500,
        };

      case 'ar':
        return {
          width: 350,
          height: 450,
          maxWidth: 500,
          maxHeight: 600,
          minWidth: 280,
          minHeight: 350,
        };

      default:
        return {
          width: 380,
          height: 520,
          maxWidth: 600,
          maxHeight: 800,
          minWidth: 300,
          minHeight: 400,
        };
    }
  }

  /**
   * Get viewport dimensions
   */
  private getViewport(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Get initial coordinates based on position
   */
  private getInitialCoordinates(position: LayoutPosition, dimensions: Dimensions): { x: number; y: number } {
    const viewport = this.getViewport();
    const top = this.config.safeArea.top ?? 0;
    const bottom = this.config.safeArea.bottom ?? 0;
    const left = this.config.safeArea.left ?? 0;
    const right = this.config.safeArea.right ?? 0;
    const padding = 20;

    switch (position) {
      case 'bottom-right':
        return {
          x: viewport.width - dimensions.width - padding - right,
          y: viewport.height - dimensions.height - padding - bottom,
        };

      case 'bottom-left':
        return {
          x: padding + left,
          y: viewport.height - dimensions.height - padding - bottom,
        };

      case 'top-right':
        return {
          x: viewport.width - dimensions.width - padding - right,
          y: padding + top,
        };

      case 'top-left':
        return {
          x: padding + left,
          y: padding + top,
        };

      case 'center':
        return {
          x: (viewport.width - dimensions.width) / 2,
          y: (viewport.height - dimensions.height) / 2,
        };

      case 'fullscreen':
        return { x: 0, y: 0 };

      case 'floating':
        // AR-style: slightly off-center to the right
        return {
          x: viewport.width * 0.6,
          y: viewport.height * 0.3,
        };

      case 'docked-left':
        return {
          x: left,
          y: top,
        };

      case 'docked-right':
        return {
          x: viewport.width - dimensions.width - right,
          y: top,
        };

      case 'docked-bottom':
        return {
          x: (viewport.width - dimensions.width) / 2,
          y: viewport.height - dimensions.height - bottom,
        };

      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(document.body);

    // Media query for dark mode / device changes
    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    // Orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });

    // Detect safe area (iOS notch, etc.)
    this.detectSafeArea();
  }

  /**
   * Detect safe area insets (for notched devices)
   */
  private detectSafeArea(): void {
    if (typeof document === 'undefined') return;

    const computedStyle = getComputedStyle(document.documentElement);
    
    const top = parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 
                parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10);
    const bottom = parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
                   parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10);
    const left = parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) ||
                 parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10);
    const right = parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) ||
                  parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10);

    this.state.safeArea = {
      top: Math.max(top, this.config.safeArea.top ?? 0),
      bottom: Math.max(bottom, this.config.safeArea.bottom ?? 0),
      left: Math.max(left, this.config.safeArea.left ?? 0),
      right: Math.max(right, this.config.safeArea.right ?? 0),
    };
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const newDevice = this.detectDevice();
    const deviceChanged = newDevice !== this.state.device;

    if (deviceChanged) {
      this.state.device = newDevice;
      this.state.position = this.getDefaultPosition(newDevice);
    }

    const dimensions = this.getDimensions(this.state.device);
    const coords = this.getInitialCoordinates(this.state.position, dimensions);

    this.state.width = dimensions.width;
    this.state.height = dimensions.height;
    this.state.x = coords.x;
    this.state.y = coords.y;
    this.state.isFullscreen = this.state.position === 'fullscreen';

    this.notifyListeners();
    this.savePosition();
  }

  /**
   * Set position
   */
  setPosition(position: LayoutPosition): void {
    this.state.position = position;
    const dimensions = this.getDimensions();
    const coords = this.getInitialCoordinates(position, dimensions);

    this.state.x = coords.x;
    this.state.y = coords.y;
    this.state.isFullscreen = position === 'fullscreen';

    this.notifyListeners();
    this.savePosition();
  }

  /**
   * Set custom coordinates (for dragging)
   */
  setCoordinates(x: number, y: number): void {
    const viewport = this.getViewport();
    const dimensions = this.getDimensions();

    // Clamp to viewport
    this.state.x = Math.max(0, Math.min(x, viewport.width - dimensions.minWidth));
    this.state.y = Math.max(0, Math.min(y, viewport.height - 50)); // Keep at least header visible

    this.state.position = 'floating'; // Custom position
    this.notifyListeners();
    this.savePosition();
  }

  /**
   * Start drag operation
   */
  startDrag(): void {
    if (!this.config.draggable) return;
    this.state.isDragging = true;
    this.notifyListeners();
  }

  /**
   * End drag operation
   */
  endDrag(): void {
    this.state.isDragging = false;
    this.notifyListeners();
    this.savePosition();
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen(): void {
    if (this.state.isFullscreen) {
      this.setPosition(this.getDefaultPosition(this.state.device));
    } else {
      this.setPosition('fullscreen');
    }
  }

  /**
   * Get current state
   */
  getState(): Readonly<LayoutState> {
    return { ...this.state };
  }

  /**
   * Get CSS styles for current state
   */
  getStyles(): Record<string, string> {
    const transition = this.config.animateTransitions && !this.state.isDragging
      ? 'all 0.3s ease-out'
      : 'none';

    if (this.state.isFullscreen) {
      return {
        position: 'fixed',
        top: `${this.state.safeArea.top}px`,
        left: `${this.state.safeArea.left}px`,
        right: `${this.state.safeArea.right}px`,
        bottom: `${this.state.safeArea.bottom}px`,
        width: 'auto',
        height: 'auto',
        transition,
      };
    }

    return {
      position: 'fixed',
      top: `${this.state.y}px`,
      left: `${this.state.x}px`,
      width: `${this.state.width}px`,
      height: `${this.state.height}px`,
      transition,
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: LayoutState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Save position to storage
   */
  private savePosition(): void {
    if (!this.config.rememberPosition || typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        device: this.state.device,
        position: this.state.position,
        x: this.state.x,
        y: this.state.y,
        width: this.state.width,
        height: this.state.height,
      }));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.listeners.clear();
  }
}

export default DeviceLayout;
