/// HoloLand AR Native Bridge
///
/// Provides the Dart interface for communicating with native ARKit (iOS)
/// and ARCore (Android) through Flutter Platform Channels.
///
/// Four dedicated channels isolate AR concerns:
///   - io.hololand.ar/session   : AR session lifecycle
///   - io.hololand.ar/mesh      : Spatial mesh scanning
///   - io.hololand.ar/anchors   : Spatial anchor management
///   - io.hololand.ar/iot       : IoT device discovery and binding
library;

import 'dart:async';
import 'package:flutter/services.dart';
import 'ar_session.dart';
import 'ar_frame.dart';
import '../mesh/mesh_types.dart';
import '../iot/iot_binding.dart';

// =============================================================================
// PLATFORM CHANNEL CONSTANTS
// =============================================================================

/// Channel for AR session lifecycle management.
const String kSessionChannel = 'io.hololand.ar/session';

/// EventChannel for AR session events (tracking state, frames, errors).
const String kSessionEventsChannel = 'io.hololand.ar/session_events';

/// Channel for mesh scanning control.
const String kMeshChannel = 'io.hololand.ar/mesh';

/// EventChannel for mesh scanning events (updates, progress).
const String kMeshEventsChannel = 'io.hololand.ar/mesh_events';

/// Channel for spatial anchor management.
const String kAnchorsChannel = 'io.hololand.ar/anchors';

/// EventChannel for anchor events (detected, lost, cloud).
const String kAnchorEventsChannel = 'io.hololand.ar/anchor_events';

/// Channel for IoT device management.
const String kIoTChannel = 'io.hololand.ar/iot';

/// EventChannel for IoT device events (discovered, state changes).
const String kIoTEventsChannel = 'io.hololand.ar/iot_events';

// =============================================================================
// NATIVE AR BRIDGE
// =============================================================================

/// Abstract interface for the native AR bridge.
///
/// Implemented by [NativeARBridgeImpl] which uses Flutter Platform Channels
/// to communicate with native ARKit/ARCore code.
abstract class NativeARBridge {
  // ─── Session ─────────────────────────────────────────────────────────

  /// Initialize an AR session with the given configuration.
  Future<String> initSession(ARSessionConfig config);

  /// Pause the current AR session.
  Future<void> pauseSession();

  /// Resume a paused AR session.
  Future<void> resumeSession();

  /// Destroy the AR session and release all resources.
  Future<void> destroySession();

  /// Check device AR capabilities.
  Future<ARDeviceCapabilities> checkARSupport();

  /// Stream of AR frame updates from the native session.
  Stream<ARFrameData> get frameStream;

  /// Stream of tracking state changes.
  Stream<TrackingStateEvent> get trackingStateStream;

  // ─── Mesh Scanning ───────────────────────────────────────────────────

  /// Start spatial mesh scanning.
  Future<String> startMeshScanning(MeshScanConfig config);

  /// Stop mesh scanning and retrieve results.
  Future<MeshScanResult> stopMeshScanning();

  /// Export captured mesh data to a file.
  Future<String> exportMesh(MeshExportOptions options);

  /// Set mesh resolution during an active scan.
  Future<void> setMeshResolution(MeshResolution resolution);

  /// Clear all captured mesh data.
  Future<void> clearMeshData();

  /// Stream of mesh update events during scanning.
  Stream<MeshUpdateEvent> get meshUpdateStream;

  /// Stream of mesh scan progress events.
  Stream<MeshScanProgressEvent> get meshProgressStream;

  // ─── Spatial Anchors ─────────────────────────────────────────────────

  /// Create a spatial anchor at the given 6DoF pose.
  Future<SpatialAnchor> createAnchor(Pose6DoF pose, {String? name});

  /// Remove a spatial anchor by ID.
  Future<void> removeAnchor(String anchorId);

  /// Get all current spatial anchors.
  Future<List<SpatialAnchor>> getAnchors();

  /// Host a local anchor to the cloud for cross-device sharing.
  Future<String> hostCloudAnchor(String localAnchorId, {int ttlDays = 1});

  /// Resolve a cloud anchor by its cloud ID.
  Future<SpatialAnchor> resolveCloudAnchor(String cloudAnchorId);

  /// Create a geospatial anchor (outdoor AR).
  Future<SpatialAnchor> createGeospatialAnchor({
    required double latitude,
    required double longitude,
    required double altitude,
    required double heading,
  });

  /// Stream of anchor update events.
  Stream<AnchorEvent> get anchorEventStream;

  // ─── IoT Devices ─────────────────────────────────────────────────────

  /// Start scanning for IoT devices.
  Future<String> startIoTDiscovery(IoTDiscoveryConfig config);

  /// Stop IoT device discovery.
  Future<IoTDiscoveryResult> stopIoTDiscovery();

  /// Connect to a specific IoT device.
  Future<bool> connectDevice(String deviceId);

  /// Disconnect from an IoT device.
  Future<void> disconnectDevice(String deviceId);

  /// Read current state of an IoT device.
  Future<IoTDeviceState> getDeviceState(String deviceId);

  /// Send a command to an IoT device.
  Future<IoTCommandResponse> sendDeviceCommand(IoTCommand command);

  /// Stream of IoT device discovery and state events.
  Stream<IoTDeviceEvent> get iotEventStream;
}

// =============================================================================
// NATIVE BRIDGE IMPLEMENTATION
// =============================================================================

/// Concrete implementation of [NativeARBridge] using Flutter Platform Channels.
class NativeARBridgeImpl implements NativeARBridge {
  NativeARBridgeImpl() {
    _setupEventChannels();
  }

  // Method channels
  final MethodChannel _sessionChannel = const MethodChannel(kSessionChannel);
  final MethodChannel _meshChannel = const MethodChannel(kMeshChannel);
  final MethodChannel _anchorsChannel = const MethodChannel(kAnchorsChannel);
  final MethodChannel _iotChannel = const MethodChannel(kIoTChannel);

  // Event channels
  final EventChannel _sessionEventsChannel =
      const EventChannel(kSessionEventsChannel);
  final EventChannel _meshEventsChannel =
      const EventChannel(kMeshEventsChannel);
  final EventChannel _anchorEventsChannel =
      const EventChannel(kAnchorEventsChannel);
  final EventChannel _iotEventsChannel =
      const EventChannel(kIoTEventsChannel);

  // Stream controllers (broadcast for multiple listeners)
  final StreamController<ARFrameData> _frameController =
      StreamController<ARFrameData>.broadcast();
  final StreamController<TrackingStateEvent> _trackingController =
      StreamController<TrackingStateEvent>.broadcast();
  final StreamController<MeshUpdateEvent> _meshUpdateController =
      StreamController<MeshUpdateEvent>.broadcast();
  final StreamController<MeshScanProgressEvent> _meshProgressController =
      StreamController<MeshScanProgressEvent>.broadcast();
  final StreamController<AnchorEvent> _anchorEventController =
      StreamController<AnchorEvent>.broadcast();
  final StreamController<IoTDeviceEvent> _iotEventController =
      StreamController<IoTDeviceEvent>.broadcast();

  void _setupEventChannels() {
    // Session events
    _sessionEventsChannel.receiveBroadcastStream().listen((event) {
      final map = event as Map<String, dynamic>;
      final type = map['type'] as String;

      switch (type) {
        case 'frameUpdate':
          _frameController.add(ARFrameData.fromMap(map['frame']));
          break;
        case 'trackingStateChanged':
          _trackingController.add(TrackingStateEvent(
            state: TrackingState.fromString(map['state']),
            reason: map['reason'] as String?,
          ));
          break;
      }
    });

    // Mesh events
    _meshEventsChannel.receiveBroadcastStream().listen((event) {
      final map = event as Map<String, dynamic>;
      final type = map['type'] as String;

      switch (type) {
        case 'meshUpdated':
          _meshUpdateController.add(MeshUpdateEvent.fromMap(map));
          break;
        case 'scanProgress':
          _meshProgressController
              .add(MeshScanProgressEvent.fromMap(map['progress']));
          break;
      }
    });

    // Anchor events
    _anchorEventsChannel.receiveBroadcastStream().listen((event) {
      final map = event as Map<String, dynamic>;
      _anchorEventController.add(AnchorEvent.fromMap(map));
    });

    // IoT events
    _iotEventsChannel.receiveBroadcastStream().listen((event) {
      final map = event as Map<String, dynamic>;
      _iotEventController.add(IoTDeviceEvent.fromMap(map));
    });
  }

  // ─── Session ─────────────────────────────────────────────────────────

  @override
  Future<String> initSession(ARSessionConfig config) async {
    final result = await _sessionChannel.invokeMethod<Map>(
      'initSession',
      config.toMap(),
    );
    return result!['sessionId'] as String;
  }

  @override
  Future<void> pauseSession() async {
    await _sessionChannel.invokeMethod('pauseSession');
  }

  @override
  Future<void> resumeSession() async {
    await _sessionChannel.invokeMethod('resumeSession');
  }

  @override
  Future<void> destroySession() async {
    await _sessionChannel.invokeMethod('destroySession');
  }

  @override
  Future<ARDeviceCapabilities> checkARSupport() async {
    final result =
        await _sessionChannel.invokeMethod<Map>('checkARSupport');
    return ARDeviceCapabilities.fromMap(result!);
  }

  @override
  Stream<ARFrameData> get frameStream => _frameController.stream;

  @override
  Stream<TrackingStateEvent> get trackingStateStream =>
      _trackingController.stream;

  // ─── Mesh Scanning ───────────────────────────────────────────────────

  @override
  Future<String> startMeshScanning(MeshScanConfig config) async {
    final result = await _meshChannel.invokeMethod<Map>(
      'startMeshScanning',
      config.toMap(),
    );
    return result!['scanId'] as String;
  }

  @override
  Future<MeshScanResult> stopMeshScanning() async {
    final result =
        await _meshChannel.invokeMethod<Map>('stopMeshScanning');
    return MeshScanResult.fromMap(result!);
  }

  @override
  Future<String> exportMesh(MeshExportOptions options) async {
    final result = await _meshChannel.invokeMethod<Map>(
      'exportMesh',
      options.toMap(),
    );
    return result!['filePath'] as String;
  }

  @override
  Future<void> setMeshResolution(MeshResolution resolution) async {
    await _meshChannel.invokeMethod(
      'setMeshResolution',
      {'resolution': resolution.name},
    );
  }

  @override
  Future<void> clearMeshData() async {
    await _meshChannel.invokeMethod('clearMeshData');
  }

  @override
  Stream<MeshUpdateEvent> get meshUpdateStream =>
      _meshUpdateController.stream;

  @override
  Stream<MeshScanProgressEvent> get meshProgressStream =>
      _meshProgressController.stream;

  // ─── Spatial Anchors ─────────────────────────────────────────────────

  @override
  Future<SpatialAnchor> createAnchor(Pose6DoF pose, {String? name}) async {
    final result = await _anchorsChannel.invokeMethod<Map>(
      'createAnchor',
      {'pose': pose.toMap(), 'name': name},
    );
    return SpatialAnchor.fromMap(result!);
  }

  @override
  Future<void> removeAnchor(String anchorId) async {
    await _anchorsChannel.invokeMethod('removeAnchor', {'id': anchorId});
  }

  @override
  Future<List<SpatialAnchor>> getAnchors() async {
    final result =
        await _anchorsChannel.invokeMethod<List>('getAnchors');
    return result!
        .map((e) => SpatialAnchor.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<String> hostCloudAnchor(String localAnchorId,
      {int ttlDays = 1}) async {
    final result = await _anchorsChannel.invokeMethod<Map>(
      'hostCloudAnchor',
      {'localAnchorId': localAnchorId, 'ttlDays': ttlDays},
    );
    return result!['cloudAnchorId'] as String;
  }

  @override
  Future<SpatialAnchor> resolveCloudAnchor(String cloudAnchorId) async {
    final result = await _anchorsChannel.invokeMethod<Map>(
      'resolveCloudAnchor',
      {'cloudAnchorId': cloudAnchorId},
    );
    return SpatialAnchor.fromMap(result!);
  }

  @override
  Future<SpatialAnchor> createGeospatialAnchor({
    required double latitude,
    required double longitude,
    required double altitude,
    required double heading,
  }) async {
    final result = await _anchorsChannel.invokeMethod<Map>(
      'createGeospatialAnchor',
      {
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'heading': heading,
      },
    );
    return SpatialAnchor.fromMap(result!);
  }

  @override
  Stream<AnchorEvent> get anchorEventStream =>
      _anchorEventController.stream;

  // ─── IoT Devices ─────────────────────────────────────────────────────

  @override
  Future<String> startIoTDiscovery(IoTDiscoveryConfig config) async {
    final result = await _iotChannel.invokeMethod<Map>(
      'startDiscovery',
      config.toMap(),
    );
    return result!['scanId'] as String;
  }

  @override
  Future<IoTDiscoveryResult> stopIoTDiscovery() async {
    final result =
        await _iotChannel.invokeMethod<Map>('stopDiscovery');
    return IoTDiscoveryResult.fromMap(result!);
  }

  @override
  Future<bool> connectDevice(String deviceId) async {
    final result = await _iotChannel.invokeMethod<Map>(
      'connectDevice',
      {'deviceId': deviceId},
    );
    return result!['success'] as bool;
  }

  @override
  Future<void> disconnectDevice(String deviceId) async {
    await _iotChannel.invokeMethod(
      'disconnectDevice',
      {'deviceId': deviceId},
    );
  }

  @override
  Future<IoTDeviceState> getDeviceState(String deviceId) async {
    final result = await _iotChannel.invokeMethod<Map>(
      'getDeviceState',
      {'deviceId': deviceId},
    );
    return IoTDeviceState.fromMap(result!);
  }

  @override
  Future<IoTCommandResponse> sendDeviceCommand(IoTCommand command) async {
    final result = await _iotChannel.invokeMethod<Map>(
      'sendCommand',
      command.toMap(),
    );
    return IoTCommandResponse.fromMap(result!);
  }

  @override
  Stream<IoTDeviceEvent> get iotEventStream => _iotEventController.stream;

  // ─── Lifecycle ───────────────────────────────────────────────────────

  /// Dispose all stream controllers and release resources.
  void dispose() {
    _frameController.close();
    _trackingController.close();
    _meshUpdateController.close();
    _meshProgressController.close();
    _anchorEventController.close();
    _iotEventController.close();
  }
}
