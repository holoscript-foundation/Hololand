# @hololand/ar-mobile-companion

Mobile AR Companion for HoloLand - Flutter + ARKit/ARCore with spatial mesh scanning, IoT entity binding, and comprehensive UI components.

## Features

### 🎯 Mobile AR UI Components

**Production-ready React Native components for AR experiences:**

- **PlaneDetectionReticle** - Animated crosshair with plane detection feedback
- **AnchorPlacementControls** - Touch gestures for object placement (drag, pinch, rotate)
- **GeospatialPOIMarker** - Location-based POI markers with distance calculation
- **DistanceIndicator** - Real-time AR measurement tools (point-to-point, path, area, volume)
- **SurfaceConstraintVisualization** - Surface detection validation with constraint warnings
- **LightEstimationFeedback** - Environmental lighting analysis UI

### 🔧 Core Capabilities

1. **Spatial Mesh Scanning Pipeline** - Real-time environment mesh capture, processing, optimization, and cloud sync
2. **IoT Entity Binding** - Metadata schema for binding physical IoT devices to spatial anchors in AR space
3. **HoloScript AR Bridge** - Bidirectional communication between Flutter AR and the existing `@hololand/ar-*` package ecosystem

## Installation

```bash
npm install @hololand/ar-mobile-companion
# or
yarn add @hololand/ar-mobile-companion
```

### Peer Dependencies

```json
{
  "@hololand/ar-anchors": "^1.0.0",
  "@hololand/ar-detection": "^1.0.0",
  "@hololand/ar-tracking": "^1.0.0",
  "@hololand/ar-foundation": "^1.0.0",
  "react": "^18.0.0",
  "react-native": "^0.72.0"
}
```

## Quick Start

### Basic AR UI Setup

```tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  PlaneDetectionReticle,
  AnchorPlacementControls,
  LightEstimationFeedback,
} from '@hololand/ar-mobile-companion';
import type { ARPlane, SpatialAnchor, LightEstimate, Pose6DoF } from '@hololand/ar-mobile-companion';

export const ARExperience: React.FC = () => {
  const [detectedPlane, setDetectedPlane] = useState<ARPlane | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<SpatialAnchor | null>(null);
  const [lightEstimate, setLightEstimate] = useState<LightEstimate | null>(null);

  const handlePlacementConfirm = (plane: ARPlane) => {
    // Create anchor at plane position
    console.log('Placing anchor on plane:', plane.id);
    setPlacementMode(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* AR Camera View */}
      {/* ... */}

      {/* Plane Detection Reticle */}
      <PlaneDetectionReticle
        detectedPlane={detectedPlane}
        trackingState="normal"
        placementMode={placementMode}
        onPlacementConfirm={handlePlacementConfirm}
        onPlacementCancel={() => setPlacementMode(false)}
      />

      {/* Anchor Placement Controls */}
      {activeAnchor && (
        <AnchorPlacementControls
          anchor={activeAnchor}
          onPlacementConfirm={(anchor, transform) => {
            console.log('Anchor placed:', anchor.id, transform);
            setActiveAnchor(null);
          }}
          onPlacementCancel={() => setActiveAnchor(null)}
          hapticFeedback={true}
          enableHistory={true}
        />
      )}

      {/* Light Estimation Feedback */}
      <LightEstimationFeedback
        lightEstimate={lightEstimate}
        showIntensity={true}
        showTemperature={true}
        showHDR={true}
        compact={false}
      />
    </View>
  );
};
```

### Geospatial POI Markers

```tsx
import { GeospatialPOIMarker } from '@hololand/ar-mobile-companion';
import type { GeospatialPOI, Pose6DoF } from '@hololand/ar-mobile-companion';

const poi: GeospatialPOI = {
  id: 'landmark-1',
  name: 'Golden Gate Bridge',
  category: 'landmark',
  latitude: 37.8199,
  longitude: -122.4783,
  altitude: 67,
  icon: '🌉',
};

const userPose: Pose6DoF = {
  position: [37.8085, 50, -122.4098], // [lat, altitude, lon]
  orientation: [0, 0, 0, 1],
};

<GeospatialPOIMarker
  poi={poi}
  userPose={userPose}
  onPress={(poi) => console.log('POI tapped:', poi.name)}
  showDistance={true}
  showElevation={true}
  maxDistance={5000}
/>
```

### AR Distance Measurement

```tsx
import { DistanceIndicator } from '@hololand/ar-mobile-companion';
import type { Pose6DoF, MeasurementPoint, Measurement } from '@hololand/ar-mobile-companion';

const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
const [measurements, setMeasurements] = useState<Measurement[]>([]);

const cameraPose: Pose6DoF = {
  position: [0, 1.5, 0],
  orientation: [0, 0, 0, 1],
};

<DistanceIndicator
  cameraPose={cameraPose}
  measurementPoints={measurementPoints}
  mode="point"
  unit="meters"
  onPointAdded={(point) => setMeasurementPoints([...measurementPoints, point])}
  onMeasurementComplete={(measurement) => {
    setMeasurements([...measurements, measurement]);
    setMeasurementPoints([]);
  }}
  onMeasurementClear={() => setMeasurementPoints([])}
  showHistory={true}
  history={measurements}
/>
```

### Surface Constraint Validation

```tsx
import { SurfaceConstraintVisualization } from '@hololand/ar-mobile-companion';
import type { ARPlane, SurfaceConstraint } from '@hololand/ar-mobile-companion';

const customValidator = (plane: ARPlane): SurfaceConstraint[] => {
  const constraints: SurfaceConstraint[] = [];

  // Custom validation logic
  if (plane.classification === 'table' && plane.extent.width < 0.5) {
    constraints.push({
      type: 'size',
      severity: 'warning',
      message: 'Table surface is too small for object placement',
    });
  }

  return constraints;
};

<SurfaceConstraintVisualization
  plane={detectedPlane}
  minArea={0.25}
  minStability={0.6}
  showGrid={true}
  showClassification={true}
  showConstraints={true}
  customValidator={customValidator}
/>
```

## Component API Reference

### PlaneDetectionReticle

Visual feedback for AR plane detection with animated reticle.

**Props:**
- `detectedPlane: ARPlane | null` - Current detected plane
- `trackingState: TrackingState` - AR tracking state
- `placementMode: boolean` - Whether placement mode is active
- `onPlacementConfirm?: (plane: ARPlane) => void` - Callback when user confirms placement
- `onPlacementCancel?: () => void` - Callback when user cancels placement
- `size?: number` - Reticle size in dp (default: 120)
- `showTrackingQuality?: boolean` - Show tracking quality indicator (default: true)
- `colors?: { horizontal?: string; vertical?: string; unknown?: string }` - Custom color overrides

### AnchorPlacementControls

Touch gesture controls for AR anchor placement.

**Props:**
- `anchor: SpatialAnchor | null` - Current anchor being placed
- `initialTransform?: Partial<AnchorTransform>` - Initial transform
- `onTransformChange?: (transform: AnchorTransform) => void` - Real-time transform updates
- `onPlacementConfirm?: (anchor: SpatialAnchor, transform: AnchorTransform) => void` - Placement confirmed
- `onPlacementCancel?: () => void` - Placement cancelled
- `snapToGrid?: number | false` - Enable snap-to-grid in meters
- `minScale?: number` - Minimum scale factor (default: 0.1)
- `maxScale?: number` - Maximum scale factor (default: 10)
- `hapticFeedback?: boolean` - Enable haptic feedback (default: true)
- `enableHistory?: boolean` - Enable undo/redo (default: true)

**Gestures:**
- **Single-finger drag**: Translate in XZ plane
- **Two-finger pinch**: Scale object
- **Two-finger rotate**: Rotate around Y-axis

### GeospatialPOIMarker

Location-based POI markers with real-time distance calculation.

**Props:**
- `poi: GeospatialPOI` - Point of interest data
- `userPose: Pose6DoF` - User's current pose
- `onPress?: (poi: GeospatialPOI) => void` - Callback when marker tapped
- `showDistance?: boolean` - Show distance label (default: true)
- `showElevation?: boolean` - Show elevation indicator (default: true)
- `size?: number` - Marker size in dp (default: 48)
- `maxDistance?: number` - Distance threshold for visibility in meters (default: 1000)
- `minScale?: number` - Minimum marker scale when far away (default: 0.5)
- `maxScale?: number` - Maximum marker scale when close (default: 1.2)

**POI Categories:**
- `restaurant`, `landmark`, `store`, `transit`, `parking`, `hotel`, `attraction`, `custom`

### DistanceIndicator

Real-time AR measurement tools.

**Props:**
- `cameraPose: Pose6DoF` - Current AR camera pose
- `measurementPoints?: MeasurementPoint[]` - Active measurement points
- `onPointAdded?: (point: MeasurementPoint) => void` - Callback when new point added
- `onMeasurementComplete?: (measurement: Measurement) => void` - Callback when measurement saved
- `onMeasurementClear?: () => void` - Callback when measurement cleared
- `mode?: MeasurementMode` - Measurement mode (default: 'point')
- `unit?: DistanceUnit` - Distance unit (default: 'meters')
- `showHistory?: boolean` - Show measurement history (default: true)
- `history?: Measurement[]` - Measurement history

**Measurement Modes:**
- `point` - Point-to-point distance (2+ points)
- `path` - Path length (2+ points)
- `area` - Surface area (3+ points)
- `volume` - Bounding box volume (2+ points)

**Units:**
- `meters`, `feet`, `inches`

### SurfaceConstraintVisualization

Surface detection validation with constraint warnings.

**Props:**
- `plane: ARPlane | null` - Detected plane
- `analysis?: SurfaceAnalysis | null` - Surface analysis results
- `minArea?: number` - Minimum required surface area in m² (default: 0.25)
- `minStability?: number` - Minimum stability score 0-1 (default: 0.6)
- `showGrid?: boolean` - Show grid overlay (default: true)
- `showClassification?: boolean` - Show classification label (default: true)
- `showConstraints?: boolean` - Show constraint warnings (default: true)
- `customValidator?: (plane: ARPlane) => SurfaceConstraint[]` - Custom constraint validator

**Constraint Types:**
- `size`, `stability`, `occlusion`, `orientation`, `boundary`

**Constraint Severities:**
- `error`, `warning`, `info`

### LightEstimationFeedback

Environmental lighting analysis UI.

**Props:**
- `lightEstimate: LightEstimate | null` - Light estimation data from AR framework
- `showIntensity?: boolean` - Show intensity indicator (default: true)
- `showTemperature?: boolean` - Show color temperature (default: true)
- `showDirection?: boolean` - Show light direction (default: false)
- `showHDR?: boolean` - Show HDR capability (default: true)
- `compact?: boolean` - Compact mode with minimal UI (default: false)

**Light Conditions:**
- Very Bright (>1000 lux)
- Bright (400-1000 lux)
- Normal (200-400 lux)
- Dim (50-200 lux)
- Dark (<50 lux)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design including:
- Flutter + Native ARKit/ARCore architecture
- Spatial mesh scanning pipeline (6 stages)
- IoT entity binding schema
- Integration with `@hololand/ar-*` packages

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type {
  // AR Session
  ARSessionConfig,
  TrackingMode,
  TrackingState,

  // AR Frame
  ARFrameData,
  Pose6DoF,
  LightEstimate,

  // AR Plane
  ARPlane,
  PlaneAlignment,
  PlaneClassification,

  // Spatial Anchor
  SpatialAnchor,
  AnchorTrackingState,

  // Mesh Pipeline
  MeshCaptureFrame,
  MeshScanConfig,
  LODLevel,

  // IoT
  IoTEntityBinding,
  IoTDevice,
  IoTCapability,

  // UI Components
  PlaneDetectionReticleProps,
  AnchorPlacementControlsProps,
  GeospatialPOIMarkerProps,
  DistanceIndicatorProps,
  SurfaceConstraintVisualizationProps,
  LightEstimationFeedbackProps,
} from '@hololand/ar-mobile-companion';
```

## Testing

Comprehensive test suites included for all components:

```bash
npm test
# or
yarn test
```

**Test coverage:**
- Component rendering
- User interactions (tap, drag, pinch, rotate)
- Measurement calculations
- Unit conversions
- Accessibility
- State management

## Performance

**Targets:**
- AR Frame Rate: 60 FPS
- Component Render Time: <16ms
- Touch Response: <100ms
- Haptic Feedback: <50ms

**Optimizations:**
- Animated.Value with useNativeDriver for 60fps animations
- React.memo for expensive components
- useMemo/useCallback for derived values
- Platform-specific styling (iOS shadows vs Android elevation)

## Accessibility

All components include:
- VoiceOver/TalkBack support
- Semantic accessibility labels
- Accessibility roles and states
- Keyboard navigation support
- High contrast mode compatibility

## Platform Support

- **iOS**: iOS 14+ (ARKit 4+), iOS 16+ recommended (ARKit 7)
- **Android**: Android 8.0+ (ARCore 1.0+), Android 13+ recommended (ARCore 8)
- **React Native**: 0.72.0+

## License

Elastic-2.0

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## Related Packages

- `@hololand/ar-anchors` - Anchor types and coordinate transforms
- `@hololand/ar-detection` - Depth processing and pose detection
- `@hololand/ar-tracking` - Multi-target tracking
- `@hololand/ar-foundation` - AR runtime and HoloScript bridge
- `@hololand/ar-hooks` - React hooks for AR state management

## Authors

- brianonbased-dev

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
