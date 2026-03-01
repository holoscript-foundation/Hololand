/// HoloLand AR Frame Types
///
/// Dart type definitions for AR camera frame data.
library;

import 'ar_session.dart';

// =============================================================================
// AR FRAME DATA
// =============================================================================

/// Data from a single AR camera frame.
class ARFrameData {
  final int frameId;
  final int timestamp;
  final Pose6DoF cameraPose;
  final CameraIntrinsics cameraIntrinsics;
  final TrackingState trackingState;
  final TrackingLimitedReason? limitedReason;
  final LightEstimate? lightEstimate;
  final bool hasDepth;
  final int imageWidth;
  final int imageHeight;

  ARFrameData({
    required this.frameId,
    required this.timestamp,
    required this.cameraPose,
    required this.cameraIntrinsics,
    required this.trackingState,
    this.limitedReason,
    this.lightEstimate,
    required this.hasDepth,
    required this.imageWidth,
    required this.imageHeight,
  });

  factory ARFrameData.fromMap(Map map) {
    return ARFrameData(
      frameId: map['frameId'] as int,
      timestamp: map['timestamp'] as int,
      cameraPose: Pose6DoF.fromMap(map['cameraPose'] as Map),
      cameraIntrinsics:
          CameraIntrinsics.fromMap(map['cameraIntrinsics'] as Map),
      trackingState: TrackingState.fromString(map['trackingState'] as String),
      limitedReason: map['limitedReason'] != null
          ? TrackingLimitedReason.values.firstWhere(
              (e) => e.name == map['limitedReason'],
              orElse: () => TrackingLimitedReason.initializing,
            )
          : null,
      lightEstimate: map['lightEstimate'] != null
          ? LightEstimate.fromMap(map['lightEstimate'] as Map)
          : null,
      hasDepth: map['hasDepth'] as bool,
      imageWidth: (map['imageResolution'] as Map)['width'] as int,
      imageHeight: (map['imageResolution'] as Map)['height'] as int,
    );
  }
}

// =============================================================================
// CAMERA INTRINSICS
// =============================================================================

/// Camera intrinsic parameters for 3D projection.
class CameraIntrinsics {
  final double fx;
  final double fy;
  final double cx;
  final double cy;

  const CameraIntrinsics({
    required this.fx,
    required this.fy,
    required this.cx,
    required this.cy,
  });

  factory CameraIntrinsics.fromMap(Map map) {
    return CameraIntrinsics(
      fx: (map['fx'] as num).toDouble(),
      fy: (map['fy'] as num).toDouble(),
      cx: (map['cx'] as num).toDouble(),
      cy: (map['cy'] as num).toDouble(),
    );
  }
}

// =============================================================================
// LIGHT ESTIMATE
// =============================================================================

/// Ambient light estimation from the AR camera.
class LightEstimate {
  final double ambientIntensity;
  final double ambientColorTemperature;
  final List<double>? primaryLightDirection;
  final double? primaryLightIntensity;
  final List<double>? sphericalHarmonics;

  LightEstimate({
    required this.ambientIntensity,
    required this.ambientColorTemperature,
    this.primaryLightDirection,
    this.primaryLightIntensity,
    this.sphericalHarmonics,
  });

  factory LightEstimate.fromMap(Map map) {
    return LightEstimate(
      ambientIntensity: (map['ambientIntensity'] as num).toDouble(),
      ambientColorTemperature:
          (map['ambientColorTemperature'] as num).toDouble(),
      primaryLightDirection:
          (map['primaryLightDirection'] as List?)?.cast<double>(),
      primaryLightIntensity:
          (map['primaryLightIntensity'] as num?)?.toDouble(),
      sphericalHarmonics:
          (map['sphericalHarmonics'] as List?)?.cast<double>(),
    );
  }
}
