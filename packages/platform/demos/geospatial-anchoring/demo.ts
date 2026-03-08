/**
 * Geospatial Anchoring Demo
 *
 * Demonstrates:
 * 1. Creating persistent AR anchors at GPS locations
 * 2. Querying nearby anchors
 * 3. Visualizing anchor positions
 * 4. Multi-user anchor sharing
 */

import {
  GeospatialAnchorSystem,
  type WGS84Coordinate,
  type GeospatialAnchor,
} from '../../spatial/GeospatialAnchorSystem';

// =============================================================================
// DEMO STATE
// =============================================================================

class GeospatialDemo {
  private system: GeospatialAnchorSystem;
  private currentPosition: WGS84Coordinate | null = null;
  private watchId: number | null = null;
  private anchors: Map<string, GeospatialAnchor> = new Map();

  // UI Elements
  private statusText: HTMLElement;
  private platformEl: HTMLElement;
  private geospatialSupportEl: HTMLElement;
  private accuracyEl: HTMLElement;
  private latitudeEl: HTMLElement;
  private longitudeEl: HTMLElement;
  private altitudeEl: HTMLElement;
  private anchorListEl: HTMLElement;
  private arContentEl: HTMLElement;
  private createAnchorBtn: HTMLButtonElement;
  private fetchNearbyBtn: HTMLButtonElement;

  constructor() {
    this.system = new GeospatialAnchorSystem();

    // Get UI elements
    this.statusText = document.getElementById('status-text')!;
    this.platformEl = document.getElementById('platform')!;
    this.geospatialSupportEl = document.getElementById('geospatial-support')!;
    this.accuracyEl = document.getElementById('accuracy')!;
    this.latitudeEl = document.getElementById('latitude')!;
    this.longitudeEl = document.getElementById('longitude')!;
    this.altitudeEl = document.getElementById('altitude')!;
    this.anchorListEl = document.getElementById('anchor-list')!;
    this.arContentEl = document.getElementById('ar-content')!;
    this.createAnchorBtn = document.getElementById('create-anchor') as HTMLButtonElement;
    this.fetchNearbyBtn = document.getElementById('fetch-nearby') as HTMLButtonElement;

    // Bind event handlers
    this.createAnchorBtn.addEventListener('click', () => this.createAnchor());
    this.fetchNearbyBtn.addEventListener('click', () => this.fetchNearby());
  }

  /**
   * Initialize demo
   */
  async init() {
    try {
      this.updateStatus('Detecting AR capabilities...');

      // Initialize geospatial system
      const capabilities = await this.system.init();

      // Update UI with capabilities
      this.platformEl.textContent = capabilities.platform.toUpperCase();
      this.geospatialSupportEl.textContent = capabilities.supportsGeospatial ? 'Yes' : 'No';

      if (capabilities.horizontalAccuracy) {
        this.accuracyEl.textContent = `±${capabilities.horizontalAccuracy}m`;
      } else {
        this.accuracyEl.textContent = 'Unknown';
      }

      // Request geolocation permission
      this.updateStatus('Requesting location permission...');
      await this.startLocationTracking();

      // Load existing anchors
      this.updateStatus('Loading local anchors...');
      await this.loadLocalAnchors();

      this.updateStatus('Ready');
      this.createAnchorBtn.disabled = false;
      this.fetchNearbyBtn.disabled = false;

    } catch (error) {
      console.error('Initialization error:', error);
      this.updateStatus(`Error: ${(error as Error).message}`);
    }
  }

  /**
   * Start tracking user location
   */
  private async startLocationTracking() {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    // Get initial position
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

    this.updatePosition(position);

    // Set as origin for coordinate system
    const origin: WGS84Coordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude || 0,
    };
    this.system.getConverter().setOrigin(origin);

    // Watch position
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.updatePosition(pos),
      (error) => console.error('Location error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
      }
    );
  }

  /**
   * Update current position
   */
  private updatePosition(position: GeolocationPosition) {
    this.currentPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude || 0,
    };

    // Update UI
    this.latitudeEl.textContent = this.currentPosition.latitude.toFixed(6);
    this.longitudeEl.textContent = this.currentPosition.longitude.toFixed(6);
    this.altitudeEl.textContent = `${this.currentPosition.altitude.toFixed(1)}m`;

    // Update anchor distances
    this.updateAnchorDistances();
  }

  /**
   * Load local anchors from IndexedDB
   */
  private async loadLocalAnchors() {
    if (!this.currentPosition) return;

    const anchors = await this.system.queryNearby({
      center: this.currentPosition,
      radiusMeters: 1000, // 1km radius
      limit: 20,
    });

    this.anchors.clear();
    for (const anchor of anchors) {
      this.anchors.set(anchor.id, anchor);
    }

    this.renderAnchorList();
    this.renderARContent();
  }

  /**
   * Create new anchor at current location
   */
  private async createAnchor() {
    if (!this.currentPosition) {
      alert('Location not available');
      return;
    }

    const label = prompt('Enter anchor label:', `Anchor ${this.anchors.size + 1}`);
    if (!label) return;

    try {
      this.updateStatus('Creating anchor...');

      // Create anchor at current position
      const anchor = await this.system.createAnchor(
        this.currentPosition,
        { x: 0, y: 0, z: 0, w: 1 }, // Identity rotation
        {
          label,
          createdBy: 'demo-user',
          contentId: '🏛️', // Virtual statue emoji as content
        }
      );

      this.anchors.set(anchor.id, anchor);
      this.renderAnchorList();
      this.renderARContent();

      this.updateStatus(`Anchor "${label}" created`);

      // Optionally publish to server
      // await this.system.publishAnchor(anchor.id, 'demo-token');

    } catch (error) {
      console.error('Failed to create anchor:', error);
      alert(`Failed to create anchor: ${(error as Error).message}`);
      this.updateStatus('Ready');
    }
  }

  /**
   * Fetch nearby anchors
   */
  private async fetchNearby() {
    if (!this.currentPosition) {
      alert('Location not available');
      return;
    }

    try {
      this.updateStatus('Fetching nearby anchors...');

      // In a real app, this would fetch from server
      // For demo, we'll just reload local anchors
      await this.loadLocalAnchors();

      this.updateStatus(`Found ${this.anchors.size} anchors`);

    } catch (error) {
      console.error('Failed to fetch anchors:', error);
      alert(`Failed to fetch anchors: ${(error as Error).message}`);
      this.updateStatus('Ready');
    }
  }

  /**
   * Render anchor list UI
   */
  private renderAnchorList() {
    this.anchorListEl.innerHTML = '';

    if (this.anchors.size === 0) {
      this.anchorListEl.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 20px;">No anchors nearby</div>';
      return;
    }

    // Sort by distance
    const sortedAnchors = Array.from(this.anchors.values()).sort((a, b) => {
      if (!this.currentPosition) return 0;
      const distA = this.system.getConverter().haversineDistance(this.currentPosition, a.coordinates);
      const distB = this.system.getConverter().haversineDistance(this.currentPosition, b.coordinates);
      return distA - distB;
    });

    for (const anchor of sortedAnchors) {
      const item = document.createElement('div');
      item.className = 'anchor-item';

      const info = document.createElement('div');
      info.className = 'anchor-info';

      const label = document.createElement('div');
      label.className = 'anchor-label';
      label.textContent = `${anchor.metadata.contentId || '📍'} ${anchor.metadata.label || 'Unnamed'}`;

      const coords = document.createElement('div');
      coords.className = 'anchor-coords';
      coords.textContent = `${anchor.coordinates.latitude.toFixed(5)}, ${anchor.coordinates.longitude.toFixed(5)}`;

      info.appendChild(label);
      info.appendChild(coords);

      const distance = document.createElement('div');
      distance.className = 'anchor-distance';
      if (this.currentPosition) {
        const dist = this.system.getConverter().haversineDistance(this.currentPosition, anchor.coordinates);
        distance.textContent = dist < 1000 ? `${dist.toFixed(0)}m` : `${(dist / 1000).toFixed(1)}km`;
      }

      item.appendChild(info);
      item.appendChild(distance);

      this.anchorListEl.appendChild(item);
    }
  }

  /**
   * Render AR content (virtual objects at anchor positions)
   */
  private renderARContent() {
    this.arContentEl.innerHTML = '';

    if (!this.currentPosition || this.anchors.size === 0) {
      return;
    }

    // For demo, show closest anchor's content
    const sortedAnchors = Array.from(this.anchors.values()).sort((a, b) => {
      if (!this.currentPosition) return 0;
      const distA = this.system.getConverter().haversineDistance(this.currentPosition, a.coordinates);
      const distB = this.system.getConverter().haversineDistance(this.currentPosition, b.coordinates);
      return distA - distB;
    });

    const closestAnchor = sortedAnchors[0];
    if (!closestAnchor) return;

    const distance = this.system.getConverter().haversineDistance(this.currentPosition, closestAnchor.coordinates);

    // Only show if within 100m
    if (distance < 100) {
      const obj = document.createElement('div');
      obj.className = 'virtual-object';
      obj.textContent = closestAnchor.metadata.contentId || '📍';
      obj.title = `${closestAnchor.metadata.label} (${distance.toFixed(0)}m away)`;

      this.arContentEl.appendChild(obj);
    }
  }

  /**
   * Update anchor distance displays
   */
  private updateAnchorDistances() {
    // Re-render anchor list to update distances
    this.renderAnchorList();
    this.renderARContent();
  }

  /**
   * Update status message
   */
  private updateStatus(message: string) {
    this.statusText.textContent = message;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

// =============================================================================
// INITIALIZE DEMO
// =============================================================================

const demo = new GeospatialDemo();
demo.init();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  demo.destroy();
});
