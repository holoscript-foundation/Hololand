/**
 * Geospatial AR Demo
 *
 * Cross-platform demo showcasing:
 * - ARKit Location Anchors (iOS)
 * - ARCore Geospatial API + VPS (Android)
 * - WebXR geolocation fallback (browser)
 *
 * Features:
 * - Create persistent anchors at GPS locations
 * - Query nearby anchors
 * - Real-time position tracking
 * - Platform capability detection
 */

import GeospatialBridge, {
  type NativeGeospatialAnchor,
  type GeospatialCapabilities,
  initializeGeospatialAR,
  haversineDistance,
} from '../../src/native/GeospatialBridge';

// =============================================================================
// DEMO STATE
// =============================================================================

interface DemoState {
  initialized: boolean;
  sessionActive: boolean;
  capabilities: GeospatialCapabilities | null;
  currentPosition: { latitude: number; longitude: number; altitude: number } | null;
  anchors: Map<string, NativeGeospatialAnchor>;
  positionWatchId: number | null;
}

const state: DemoState = {
  initialized: false,
  sessionActive: false,
  capabilities: null,
  currentPosition: null,
  anchors: new Map(),
  positionWatchId: null,
};

// =============================================================================
// UI ELEMENTS
// =============================================================================

const elements = {
  statusText: document.getElementById('status-text')!,
  status: document.getElementById('status')!,
  platform: document.getElementById('platform')!,
  geospatialSupport: document.getElementById('geospatial-support')!,
  vpsSupport: document.getElementById('vps-support')!,
  accuracy: document.getElementById('accuracy')!,
  latitude: document.getElementById('latitude')!,
  longitude: document.getElementById('longitude')!,
  altitude: document.getElementById('altitude')!,
  sessionState: document.getElementById('session-state')!,
  anchorCount: document.getElementById('anchor-count')!,
  anchorList: document.getElementById('anchor-list')!,
  initBtn: document.getElementById('init-btn') as HTMLButtonElement,
  createAnchorBtn: document.getElementById('create-anchor-btn') as HTMLButtonElement,
  fetchNearbyBtn: document.getElementById('fetch-nearby-btn') as HTMLButtonElement,
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function initialize() {
  try {
    updateStatus('Checking platform capabilities...', 'warning');

    // Check capabilities
    const capabilities = await GeospatialBridge.getCapabilities();
    state.capabilities = capabilities;

    // Update UI
    elements.platform.textContent = capabilities.platform.toUpperCase();
    elements.geospatialSupport.textContent = capabilities.supported ? '✅ Yes' : '❌ No';
    elements.vpsSupport.textContent = capabilities.vpsAvailable ? '✅ Yes' : '❌ No';

    if (capabilities.horizontalAccuracy) {
      elements.accuracy.textContent = `±${capabilities.horizontalAccuracy.toFixed(1)}m`;
    } else {
      elements.accuracy.textContent = 'Unknown';
    }

    elements.sessionState.textContent = capabilities.sessionState;

    if (!capabilities.supported) {
      updateStatus('Geospatial AR not supported on this device', 'error');
      return;
    }

    updateStatus('Ready to start AR session', 'success');
    elements.initBtn.textContent = 'Start AR Session';
    elements.initBtn.disabled = false;

  } catch (error) {
    console.error('Initialization failed:', error);
    updateStatus(`Initialization failed: ${(error as Error).message}`, 'error');
  }
}

async function startARSession() {
  try {
    elements.initBtn.disabled = true;
    elements.initBtn.textContent = 'Starting...';
    updateStatus('Starting AR session...', 'warning');

    // Initialize AR
    const capabilities = await initializeGeospatialAR();
    if (!capabilities) {
      throw new Error('Failed to initialize AR session');
    }

    state.initialized = true;
    state.sessionActive = true;
    state.capabilities = capabilities;

    // Update session state
    elements.sessionState.textContent = capabilities.sessionState;

    // Start position tracking
    await startPositionTracking();

    updateStatus('AR session active - tracking position', 'success');
    elements.initBtn.textContent = '✅ Session Active';
    elements.createAnchorBtn.disabled = false;
    elements.fetchNearbyBtn.disabled = false;

    // Poll for capability updates
    startCapabilityPolling();

  } catch (error) {
    console.error('Failed to start AR session:', error);
    updateStatus(`AR session failed: ${(error as Error).message}`, 'error');
    elements.initBtn.disabled = false;
    elements.initBtn.textContent = 'Retry AR Session';
  }
}

// =============================================================================
// POSITION TRACKING
// =============================================================================

async function startPositionTracking() {
  // Use browser geolocation for position updates
  // (Native platforms use AR session tracking internally)

  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation not available');
  }

  // Get initial position
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });

  updatePosition(position);

  // Watch position
  state.positionWatchId = navigator.geolocation.watchPosition(
    (pos) => updatePosition(pos),
    (error) => console.error('Position error:', error),
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
    }
  );
}

function updatePosition(position: GeolocationPosition) {
  state.currentPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    altitude: position.coords.altitude ?? 0,
  };

  // Update UI
  elements.latitude.textContent = state.currentPosition.latitude.toFixed(6);
  elements.longitude.textContent = state.currentPosition.longitude.toFixed(6);
  elements.altitude.textContent = `${state.currentPosition.altitude.toFixed(1)}m`;

  // Update anchor distances
  renderAnchorList();
}

function startCapabilityPolling() {
  setInterval(async () => {
    try {
      const capabilities = await GeospatialBridge.getCapabilities();
      state.capabilities = capabilities;

      // Update session state
      elements.sessionState.textContent = capabilities.sessionState;

      // Update accuracy
      if (capabilities.horizontalAccuracy) {
        elements.accuracy.textContent = `±${capabilities.horizontalAccuracy.toFixed(1)}m`;
      }

      // Update VPS if it became available
      if (capabilities.vpsAvailable && !state.capabilities?.vpsAvailable) {
        elements.vpsSupport.textContent = '✅ Yes';
        updateStatus('VPS activated - improved accuracy', 'success');
      }
    } catch (error) {
      console.error('Capability poll failed:', error);
    }
  }, 2000); // Poll every 2 seconds
}

// =============================================================================
// ANCHOR MANAGEMENT
// =============================================================================

async function createAnchor() {
  if (!state.currentPosition) {
    alert('Current position not available');
    return;
  }

  const label = prompt('Enter anchor name:', `Anchor ${state.anchors.size + 1}`);
  if (!label) return;

  try {
    elements.createAnchorBtn.disabled = true;
    elements.createAnchorBtn.textContent = 'Creating...';
    updateStatus('Creating geospatial anchor...', 'warning');

    const anchor = await GeospatialBridge.createGeospatialAnchor({
      coordinate: state.currentPosition,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      label,
    });

    // Store anchor (in real app, save to backend)
    state.anchors.set(anchor.anchorId, anchor);

    updateStatus(`Anchor "${label}" created at current location`, 'success');
    renderAnchorList();

  } catch (error) {
    console.error('Failed to create anchor:', error);
    alert(`Failed to create anchor: ${(error as Error).message}`);
    updateStatus('Failed to create anchor', 'error');
  } finally {
    elements.createAnchorBtn.disabled = false;
    elements.createAnchorBtn.textContent = '📍 Create Anchor Here';
  }
}

async function fetchNearbyAnchors() {
  if (!state.currentPosition) {
    alert('Current position not available');
    return;
  }

  try {
    elements.fetchNearbyBtn.disabled = true;
    elements.fetchNearbyBtn.textContent = 'Searching...';
    updateStatus('Fetching nearby anchors...', 'warning');

    // In real app: fetch from backend API
    // For demo: show locally created anchors
    const count = state.anchors.size;

    updateStatus(`Found ${count} anchor${count !== 1 ? 's' : ''}`, 'success');
    renderAnchorList();

  } catch (error) {
    console.error('Failed to fetch anchors:', error);
    alert(`Failed to fetch anchors: ${(error as Error).message}`);
  } finally {
    elements.fetchNearbyBtn.disabled = false;
    elements.fetchNearbyBtn.textContent = '🔍 Find Nearby Anchors';
  }
}

// =============================================================================
// UI RENDERING
// =============================================================================

function renderAnchorList() {
  elements.anchorCount.textContent = state.anchors.size.toString();

  if (state.anchors.size === 0) {
    elements.anchorList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📍</div>
        <div>No anchors nearby</div>
        <div style="font-size: 12px; margin-top: 8px;">Create your first anchor above</div>
      </div>
    `;
    return;
  }

  // Sort anchors by distance
  const sortedAnchors = Array.from(state.anchors.values()).sort((a, b) => {
    if (!state.currentPosition) return 0;
    const distA = haversineDistance(state.currentPosition, a.coordinate);
    const distB = haversineDistance(state.currentPosition, b.coordinate);
    return distA - distB;
  });

  elements.anchorList.innerHTML = sortedAnchors.map((anchor) => {
    const distance = state.currentPosition
      ? haversineDistance(state.currentPosition, anchor.coordinate)
      : null;

    const distanceText = distance !== null
      ? distance < 1000
        ? `${distance.toFixed(0)}m`
        : `${(distance / 1000).toFixed(1)}km`
      : '-';

    const platformClass = `platform-${anchor.platform}`;

    return `
      <div class="anchor-item">
        <div class="anchor-info">
          <div class="anchor-label">
            📍 Anchor ${anchor.anchorId.split('_')[1] || state.anchors.size}
            <span class="platform-badge ${platformClass}">${anchor.platform}</span>
          </div>
          <div class="anchor-coords">
            ${anchor.coordinate.latitude.toFixed(5)}, ${anchor.coordinate.longitude.toFixed(5)}
          </div>
          <div class="anchor-coords">
            Accuracy: ±${anchor.horizontalAccuracy.toFixed(1)}m
          </div>
        </div>
        <div class="anchor-distance">${distanceText}</div>
      </div>
    `;
  }).join('');
}

function updateStatus(message: string, type: 'success' | 'error' | 'warning') {
  elements.statusText.textContent = message;
  elements.status.className = `status status-${type}`;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

elements.initBtn.addEventListener('click', startARSession);
elements.createAnchorBtn.addEventListener('click', createAnchor);
elements.fetchNearbyBtn.addEventListener('click', fetchNearbyAnchors);

// =============================================================================
// START DEMO
// =============================================================================

initialize();
