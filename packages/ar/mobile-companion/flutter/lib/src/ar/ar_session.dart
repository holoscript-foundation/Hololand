/// HoloLand AR Session Types
///
/// Dart type definitions for AR session management.
/// These mirror the TypeScript types in src/types.ts.
library;

// =============================================================================
// TRACKING
// =============================================================================

/// AR tracking mode.
enum TrackingMode {
  worldTracking,
  geoTracking,
  imageTracking,
  faceTracking;

  String get value => name;
}

/// Current AR tracking quality.
enum TrackingState {
  notAvailable,
  limited,
  normal;

  static TrackingState fromString(String value) {
    return TrackingState.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TrackingState.notAvailable,
    );
  }
}

/// Reason for limited tracking.
enum TrackingLimitedReason {
  initializing,
  excessiveMotion,
  insufficientFeatures,
  relocalizing;
}

/// Event when tracking state changes.
class TrackingStateEvent {
  final TrackingState state;
  final String? reason;

  TrackingStateEvent({required this.state, this.reason});
}

// =============================================================================
// MESH RESOLUTION
// =============================================================================

/// Mesh scanning resolution levels.
enum MeshResolution {
  low,
  medium,
  high,
  ultra;

  String get value => name;
}

// =============================================================================
// DEPTH MODE
// =============================================================================

/// Depth sensing mode.
enum DepthMode {
  disabled,
  automatic,
  lidar,
  stereo,
  monocular;

  String get value => name;
}

// =============================================================================
// LIGHT ESTIMATION
// =============================================================================

/// Light estimation mode.
enum LightEstimation {
  disabled,
  ambientIntensity,
  environmentalHDR;

  String get value => name;
}

// =============================================================================
// AR SESSION CONFIG
// =============================================================================

/// Configuration for creating an AR session.
class ARSessionConfig {
  final TrackingMode trackingMode;
  final bool meshEnabled;
  final MeshResolution meshResolution;
  final bool horizontalPlaneDetection;
  final bool verticalPlaneDetection;
  final bool environmentTexturing;
  final bool sceneReconstruction;
  final DepthMode depthMode;
  final bool cloudAnchorsEnabled;
  final bool geospatialEnabled;
  final int targetFrameRate;
  final bool autoFocus;
  final LightEstimation lightEstimation;

  const ARSessionConfig({
    this.trackingMode = TrackingMode.worldTracking,
    this.meshEnabled = true,
    this.meshResolution = MeshResolution.medium,
    this.horizontalPlaneDetection = true,
    this.verticalPlaneDetection = true,
    this.environmentTexturing = true,
    this.sceneReconstruction = false,
    this.depthMode = DepthMode.automatic,
    this.cloudAnchorsEnabled = false,
    this.geospatialEnabled = false,
    this.targetFrameRate = 60,
    this.autoFocus = true,
    this.lightEstimation = LightEstimation.ambientIntensity,
  });

  Map<String, dynamic> toMap() => {
        'trackingMode': trackingMode.value,
        'meshEnabled': meshEnabled,
        'meshResolution': meshResolution.value,
        'horizontalPlaneDetection': horizontalPlaneDetection,
        'verticalPlaneDetection': verticalPlaneDetection,
        'environmentTexturing': environmentTexturing,
        'sceneReconstruction': sceneReconstruction,
        'depthMode': depthMode.value,
        'cloudAnchorsEnabled': cloudAnchorsEnabled,
        'geospatialEnabled': geospatialEnabled,
        'targetFrameRate': targetFrameRate,
        'autoFocus': autoFocus,
        'lightEstimation': lightEstimation.value,
      };
}

// =============================================================================
// DEVICE CAPABILITIES
// =============================================================================

/// Device AR capability report.
class ARDeviceCapabilities {
  final bool isSupported;
  final bool hasLiDAR;
  final bool hasDepthSensor;
  final List<String> supportedTrackingModes;

  ARDeviceCapabilities({
    required this.isSupported,
    required this.hasLiDAR,
    required this.hasDepthSensor,
    required this.supportedTrackingModes,
  });

  factory ARDeviceCapabilities.fromMap(Map map) {
    return ARDeviceCapabilities(
      isSupported: map['isSupported'] as bool,
      hasLiDAR: map['hasLiDAR'] as bool,
      hasDepthSensor: map['hasDepthSensor'] as bool,
      supportedTrackingModes:
          (map['supportedTrackingModes'] as List).cast<String>(),
    );
  }
}

// =============================================================================
// POSE 6DOF
// =============================================================================

/// A 6 Degrees-of-Freedom pose (position + orientation).
class Pose6DoF {
  final double px, py, pz;
  final double rx, ry, rz, rw;
  final List<double>? transform;

  const Pose6DoF({
    required this.px,
    required this.py,
    required this.pz,
    required this.rx,
    required this.ry,
    required this.rz,
    required this.rw,
    this.transform,
  });

  factory Pose6DoF.fromMap(Map map) {
    final pos = map['position'] as Map;
    final rot = map['rotation'] as Map;
    return Pose6DoF(
      px: (pos['x'] as num).toDouble(),
      py: (pos['y'] as num).toDouble(),
      pz: (pos['z'] as num).toDouble(),
      rx: (rot['x'] as num).toDouble(),
      ry: (rot['y'] as num).toDouble(),
      rz: (rot['z'] as num).toDouble(),
      rw: (rot['w'] as num).toDouble(),
      transform: (map['transform'] as List?)?.cast<double>(),
    );
  }

  Map<String, dynamic> toMap() => {
        'position': {'x': px, 'y': py, 'z': pz},
        'rotation': {'x': rx, 'y': ry, 'z': rz, 'w': rw},
        if (transform != null) 'transform': transform,
      };

  /// Identity pose (origin, no rotation).
  static const identity = Pose6DoF(
    px: 0, py: 0, pz: 0,
    rx: 0, ry: 0, rz: 0, rw: 1,
  );
}

// =============================================================================
// SPATIAL ANCHOR
// =============================================================================

/// Type of spatial anchor.
enum SpatialAnchorType {
  local,
  cloud,
  geospatial;
}

/// Tracking state of an anchor.
enum AnchorTrackingState {
  tracking,
  paused,
  stopped;
}

/// A spatial anchor in the AR world.
class SpatialAnchor {
  final String id;
  final String? cloudId;
  final SpatialAnchorType type;
  final Pose6DoF pose;
  final AnchorTrackingState trackingState;
  final int createdAt;
  final int updatedAt;
  final String? name;
  final Map<String, dynamic>? metadata;

  SpatialAnchor({
    required this.id,
    this.cloudId,
    required this.type,
    required this.pose,
    required this.trackingState,
    required this.createdAt,
    required this.updatedAt,
    this.name,
    this.metadata,
  });

  factory SpatialAnchor.fromMap(Map map) {
    return SpatialAnchor(
      id: map['id'] as String,
      cloudId: map['cloudId'] as String?,
      type: SpatialAnchorType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => SpatialAnchorType.local,
      ),
      pose: Pose6DoF.fromMap(map['pose'] as Map),
      trackingState: AnchorTrackingState.values.firstWhere(
        (e) => e.name == map['trackingState'],
        orElse: () => AnchorTrackingState.tracking,
      ),
      createdAt: map['createdAt'] as int,
      updatedAt: map['updatedAt'] as int,
      name: map['name'] as String?,
      metadata: map['metadata'] as Map<String, dynamic>?,
    );
  }
}

/// Anchor lifecycle event.
class AnchorEvent {
  final String type;
  final String anchorId;
  final SpatialAnchor? anchor;
  final String? error;

  AnchorEvent({
    required this.type,
    required this.anchorId,
    this.anchor,
    this.error,
  });

  factory AnchorEvent.fromMap(Map map) {
    return AnchorEvent(
      type: map['type'] as String,
      anchorId: map['anchorId'] as String? ?? map['id'] as String? ?? '',
      anchor: map['anchor'] != null
          ? SpatialAnchor.fromMap(map['anchor'] as Map)
          : null,
      error: map['error'] as String?,
    );
  }
}
