/// HoloLand Mesh Scanning Types
///
/// Dart type definitions for the spatial mesh scanning pipeline.
/// Mirrors the TypeScript types in src/mesh/types.ts.
library;

import '../ar/ar_session.dart';

// =============================================================================
// MESH SCAN CONFIG
// =============================================================================

/// Configuration for a mesh scan session.
class MeshScanConfig {
  final MeshResolution resolution;
  final String worldId;
  final bool realTimeProcessing;
  final bool adaptiveResolution;
  final double thermalThrottleTemp;

  const MeshScanConfig({
    this.resolution = MeshResolution.medium,
    required this.worldId,
    this.realTimeProcessing = true,
    this.adaptiveResolution = true,
    this.thermalThrottleTemp = 40.0,
  });

  Map<String, dynamic> toMap() => {
        'resolution': resolution.value,
        'worldId': worldId,
        'realTimeProcessing': realTimeProcessing,
        'adaptiveResolution': adaptiveResolution,
        'thermalThrottleTemp': thermalThrottleTemp,
      };
}

// =============================================================================
// MESH EXPORT
// =============================================================================

/// Supported mesh export formats.
enum MeshExportFormat {
  glb,
  gltf,
  obj,
  ply,
  usdz,
  fbx,
  holoscript;

  String get value => name;
}

/// Options for exporting mesh data.
class MeshExportOptions {
  final MeshExportFormat format;
  final int? lodLevel;
  final bool includeTexture;
  final bool includeClassification;
  final String coordinateSystem;
  final double scaleFactor;

  const MeshExportOptions({
    this.format = MeshExportFormat.glb,
    this.lodLevel,
    this.includeTexture = true,
    this.includeClassification = true,
    this.coordinateSystem = 'y-up-right-handed',
    this.scaleFactor = 1.0,
  });

  Map<String, dynamic> toMap() => {
        'format': format.value,
        if (lodLevel != null) 'lodLevel': lodLevel,
        'includeTexture': includeTexture,
        'includeClassification': includeClassification,
        'coordinateSystem': coordinateSystem,
        'scaleFactor': scaleFactor,
      };
}

// =============================================================================
// MESH CLASSIFICATION
// =============================================================================

/// Classification labels for mesh surfaces.
enum MeshClassification {
  none(0),
  floor(1),
  wall(2),
  ceiling(3),
  table(4),
  seat(5),
  door(6),
  window(7),
  stairs(8),
  ramp(9),
  furniture(10),
  fixture(11),
  object(12),
  custom(255);

  final int value;
  const MeshClassification(this.value);
}

// =============================================================================
// MESH SCAN EVENTS
// =============================================================================

/// Event when a mesh chunk is updated during scanning.
class MeshUpdateEvent {
  final String chunkId;
  final int vertexCount;
  final int triangleCount;
  final Map<int, int>? classifications;

  MeshUpdateEvent({
    required this.chunkId,
    required this.vertexCount,
    required this.triangleCount,
    this.classifications,
  });

  factory MeshUpdateEvent.fromMap(Map map) {
    return MeshUpdateEvent(
      chunkId: map['chunkId'] as String,
      vertexCount: map['vertexCount'] as int,
      triangleCount: map['triangleCount'] as int,
      classifications: (map['classifications'] as Map?)
          ?.map((k, v) => MapEntry(int.parse(k.toString()), v as int)),
    );
  }
}

/// Progress event during mesh scanning.
class MeshScanProgressEvent {
  final String phase;
  final double progress;
  final int totalVertices;
  final int totalTriangles;
  final double scannedArea;
  final int chunkCount;
  final double fps;
  final double? deviceTemp;
  final int? estimatedTimeRemaining;

  MeshScanProgressEvent({
    required this.phase,
    required this.progress,
    required this.totalVertices,
    required this.totalTriangles,
    required this.scannedArea,
    required this.chunkCount,
    required this.fps,
    this.deviceTemp,
    this.estimatedTimeRemaining,
  });

  factory MeshScanProgressEvent.fromMap(Map map) {
    return MeshScanProgressEvent(
      phase: map['phase'] as String,
      progress: (map['progress'] as num).toDouble(),
      totalVertices: map['totalVertices'] as int,
      totalTriangles: map['totalTriangles'] as int,
      scannedArea: (map['scannedArea'] as num).toDouble(),
      chunkCount: map['chunkCount'] as int,
      fps: (map['fps'] as num).toDouble(),
      deviceTemp: (map['deviceTemp'] as num?)?.toDouble(),
      estimatedTimeRemaining: map['estimatedTimeRemaining'] as int?,
    );
  }
}

// =============================================================================
// MESH SCAN RESULT
// =============================================================================

/// Complete result of a mesh scanning session.
class MeshScanResult {
  final String worldId;
  final String sessionId;
  final int totalVertices;
  final int totalTriangles;
  final double scannedArea;
  final int scanDuration;
  final int chunkCount;

  MeshScanResult({
    required this.worldId,
    required this.sessionId,
    required this.totalVertices,
    required this.totalTriangles,
    required this.scannedArea,
    required this.scanDuration,
    required this.chunkCount,
  });

  factory MeshScanResult.fromMap(Map map) {
    return MeshScanResult(
      worldId: map['worldId'] as String,
      sessionId: map['sessionId'] as String,
      totalVertices: map['totalVertices'] as int,
      totalTriangles: map['totalTriangles'] as int,
      scannedArea: (map['scannedArea'] as num).toDouble(),
      scanDuration: map['scanDuration'] as int,
      chunkCount: map['chunkCount'] as int,
    );
  }
}
