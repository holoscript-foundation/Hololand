/// HoloLand IoT Entity Binding Types
///
/// Dart type definitions for IoT device discovery, binding, and control.
/// Mirrors the TypeScript types in src/iot/types.ts.
library;

// =============================================================================
// IOT PROTOCOL
// =============================================================================

/// Supported IoT communication protocols.
enum IoTProtocol {
  ble,
  bleMesh,
  wifi,
  wifiDirect,
  zigbee,
  zwave,
  thread,
  matter,
  mqtt,
  coap,
  http,
  websocket,
  uwb,
  nfc,
  custom;

  String get value => name;
}

// =============================================================================
// IOT DEVICE
// =============================================================================

/// Device category classification.
enum IoTDeviceCategory {
  light,
  switchDevice,
  sensor,
  thermostat,
  lock,
  camera,
  speaker,
  display,
  appliance,
  robot,
  tracker,
  controller,
  gateway,
  wearable,
  industrial,
  custom;

  String get value => name;
}

/// Device connection state.
enum IoTConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error;
}

/// An IoT device discovered or known to the system.
class IoTDevice {
  final String deviceId;
  final String name;
  final String? manufacturer;
  final String? model;
  final IoTDeviceCategory category;
  final List<IoTProtocol> protocols;
  final IoTConnectionState connectionState;
  final double? signalStrength;
  final double? batteryLevel;
  final List<IoTCapability> capabilities;
  final bool isReachable;
  final int lastSeen;

  IoTDevice({
    required this.deviceId,
    required this.name,
    this.manufacturer,
    this.model,
    required this.category,
    required this.protocols,
    required this.connectionState,
    this.signalStrength,
    this.batteryLevel,
    required this.capabilities,
    required this.isReachable,
    required this.lastSeen,
  });

  factory IoTDevice.fromMap(Map map) {
    return IoTDevice(
      deviceId: map['deviceId'] as String,
      name: map['name'] as String,
      manufacturer: map['manufacturer'] as String?,
      model: map['model'] as String?,
      category: IoTDeviceCategory.values.firstWhere(
        (e) => e.name == map['category'],
        orElse: () => IoTDeviceCategory.custom,
      ),
      protocols: (map['protocols'] as List)
          .map((p) => IoTProtocol.values.firstWhere(
                (e) => e.name == p,
                orElse: () => IoTProtocol.custom,
              ))
          .toList(),
      connectionState: IoTConnectionState.values.firstWhere(
        (e) => e.name == map['connectionState'],
        orElse: () => IoTConnectionState.disconnected,
      ),
      signalStrength: (map['signalStrength'] as num?)?.toDouble(),
      batteryLevel: (map['batteryLevel'] as num?)?.toDouble(),
      capabilities: (map['capabilities'] as List? ?? [])
          .map((c) => IoTCapability.fromMap(c as Map))
          .toList(),
      isReachable: map['isReachable'] as bool? ?? false,
      lastSeen: map['lastSeen'] as int? ?? 0,
    );
  }
}

// =============================================================================
// IOT CAPABILITY
// =============================================================================

/// Capability affordance type (W3C WoT).
enum IoTCapabilityType {
  property,
  action,
  event;
}

/// Access permission level.
enum IoTAccessLevel {
  public_,
  read,
  write,
  admin;
}

/// An IoT device capability.
class IoTCapability {
  final String id;
  final String name;
  final IoTCapabilityType type;
  final String? description;
  final String dataType;
  final String? unit;
  final double? minimum;
  final double? maximum;
  final IoTAccessLevel accessLevel;
  final bool isAvailable;

  IoTCapability({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    required this.dataType,
    this.unit,
    this.minimum,
    this.maximum,
    required this.accessLevel,
    required this.isAvailable,
  });

  factory IoTCapability.fromMap(Map map) {
    return IoTCapability(
      id: map['id'] as String,
      name: map['name'] as String,
      type: IoTCapabilityType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => IoTCapabilityType.property,
      ),
      description: map['description'] as String?,
      dataType: map['dataType'] as String? ?? 'string',
      unit: map['unit'] as String?,
      minimum: (map['minimum'] as num?)?.toDouble(),
      maximum: (map['maximum'] as num?)?.toDouble(),
      accessLevel: IoTAccessLevel.values.firstWhere(
        (e) => e.name == map['accessLevel'],
        orElse: () => IoTAccessLevel.read,
      ),
      isAvailable: map['isAvailable'] as bool? ?? true,
    );
  }
}

// =============================================================================
// IOT DEVICE STATE
// =============================================================================

/// Current state of a device's properties.
class IoTDeviceState {
  final String deviceId;
  final Map<String, dynamic> properties;
  final int lastUpdated;
  final double connectionQuality;

  IoTDeviceState({
    required this.deviceId,
    required this.properties,
    required this.lastUpdated,
    required this.connectionQuality,
  });

  factory IoTDeviceState.fromMap(Map map) {
    return IoTDeviceState(
      deviceId: map['deviceId'] as String,
      properties: Map<String, dynamic>.from(map['properties'] as Map),
      lastUpdated: map['lastUpdated'] as int,
      connectionQuality: (map['connectionQuality'] as num).toDouble(),
    );
  }
}

// =============================================================================
// IOT COMMANDS
// =============================================================================

/// Command to send to an IoT device.
class IoTCommand {
  final String deviceId;
  final String capabilityId;
  final String type;
  final dynamic payload;
  final String requestId;
  final int timeout;

  IoTCommand({
    required this.deviceId,
    required this.capabilityId,
    required this.type,
    required this.payload,
    required this.requestId,
    this.timeout = 5000,
  });

  Map<String, dynamic> toMap() => {
        'deviceId': deviceId,
        'capabilityId': capabilityId,
        'type': type,
        'payload': payload,
        'requestId': requestId,
        'timeout': timeout,
      };
}

/// Response from an IoT command.
class IoTCommandResponse {
  final String requestId;
  final bool success;
  final dynamic data;
  final String? errorCode;
  final String? errorMessage;
  final int latencyMs;

  IoTCommandResponse({
    required this.requestId,
    required this.success,
    this.data,
    this.errorCode,
    this.errorMessage,
    required this.latencyMs,
  });

  factory IoTCommandResponse.fromMap(Map map) {
    return IoTCommandResponse(
      requestId: map['requestId'] as String,
      success: map['success'] as bool,
      data: map['data'],
      errorCode: (map['error'] as Map?)?['code'] as String?,
      errorMessage: (map['error'] as Map?)?['message'] as String?,
      latencyMs: map['latencyMs'] as int? ?? 0,
    );
  }
}

// =============================================================================
// IOT DISCOVERY
// =============================================================================

/// Configuration for IoT device discovery.
class IoTDiscoveryConfig {
  final List<IoTProtocol> protocols;
  final int scanDuration;
  final List<IoTDeviceCategory>? categoryFilter;
  final double? minSignalStrength;
  final bool autoConnect;

  const IoTDiscoveryConfig({
    this.protocols = const [IoTProtocol.ble, IoTProtocol.matter, IoTProtocol.wifi],
    this.scanDuration = 10000,
    this.categoryFilter,
    this.minSignalStrength,
    this.autoConnect = false,
  });

  Map<String, dynamic> toMap() => {
        'protocols': protocols.map((p) => p.value).toList(),
        'scanDuration': scanDuration,
        if (categoryFilter != null)
          'categoryFilter': categoryFilter!.map((c) => c.value).toList(),
        if (minSignalStrength != null)
          'minSignalStrength': minSignalStrength,
        'autoConnect': autoConnect,
      };
}

/// Result of an IoT discovery scan.
class IoTDiscoveryResult {
  final List<IoTDevice> devices;
  final int scanDuration;
  final List<IoTProtocol> protocols;

  IoTDiscoveryResult({
    required this.devices,
    required this.scanDuration,
    required this.protocols,
  });

  factory IoTDiscoveryResult.fromMap(Map map) {
    return IoTDiscoveryResult(
      devices: (map['devices'] as List)
          .map((d) => IoTDevice.fromMap(d as Map))
          .toList(),
      scanDuration: map['scanDuration'] as int,
      protocols: (map['protocols'] as List)
          .map((p) => IoTProtocol.values.firstWhere(
                (e) => e.name == p,
                orElse: () => IoTProtocol.custom,
              ))
          .toList(),
    );
  }
}

// =============================================================================
// IOT EVENTS
// =============================================================================

/// Events from IoT system to Flutter UI.
class IoTDeviceEvent {
  final String type;
  final String? deviceId;
  final String? bindingId;
  final dynamic data;

  IoTDeviceEvent({
    required this.type,
    this.deviceId,
    this.bindingId,
    this.data,
  });

  factory IoTDeviceEvent.fromMap(Map map) {
    return IoTDeviceEvent(
      type: map['type'] as String,
      deviceId: map['deviceId'] as String?,
      bindingId: map['bindingId'] as String?,
      data: map['data'],
    );
  }
}
