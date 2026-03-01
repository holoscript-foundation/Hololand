/// HoloLand AR Session Plugin - iOS (ARKit)
///
/// Native Swift implementation for ARKit integration.
/// Handles AR session lifecycle, LiDAR mesh scanning, and spatial anchors.
///
/// Platform channels:
///   - io.hololand.ar/session        (MethodChannel)
///   - io.hololand.ar/session_events (EventChannel)
///   - io.hololand.ar/mesh           (MethodChannel)
///   - io.hololand.ar/mesh_events    (EventChannel)
///   - io.hololand.ar/anchors        (MethodChannel)
///   - io.hololand.ar/anchor_events  (EventChannel)

import Flutter
import UIKit
import ARKit
import RealityKit

// MARK: - Plugin Registration

public class HoloLandARPlugin: NSObject, FlutterPlugin {

    // MARK: Channel Handlers
    private var sessionHandler: ARSessionHandler?
    private var meshHandler: MeshScanHandler?
    private var anchorHandler: AnchorHandler?

    public static func register(with registrar: FlutterPluginRegistrar) {
        let instance = HoloLandARPlugin()

        // Session channels
        let sessionChannel = FlutterMethodChannel(
            name: "io.hololand.ar/session",
            binaryMessenger: registrar.messenger()
        )
        let sessionEventChannel = FlutterEventChannel(
            name: "io.hololand.ar/session_events",
            binaryMessenger: registrar.messenger()
        )

        // Mesh channels
        let meshChannel = FlutterMethodChannel(
            name: "io.hololand.ar/mesh",
            binaryMessenger: registrar.messenger()
        )
        let meshEventChannel = FlutterEventChannel(
            name: "io.hololand.ar/mesh_events",
            binaryMessenger: registrar.messenger()
        )

        // Anchor channels
        let anchorChannel = FlutterMethodChannel(
            name: "io.hololand.ar/anchors",
            binaryMessenger: registrar.messenger()
        )
        let anchorEventChannel = FlutterEventChannel(
            name: "io.hololand.ar/anchor_events",
            binaryMessenger: registrar.messenger()
        )

        // Create handlers
        instance.sessionHandler = ARSessionHandler()
        instance.meshHandler = MeshScanHandler()
        instance.anchorHandler = AnchorHandler()

        // Register method call handlers
        sessionChannel.setMethodCallHandler(instance.sessionHandler!.handle)
        meshChannel.setMethodCallHandler(instance.meshHandler!.handle)
        anchorChannel.setMethodCallHandler(instance.anchorHandler!.handle)

        // Register event stream handlers
        sessionEventChannel.setStreamHandler(instance.sessionHandler!)
        meshEventChannel.setStreamHandler(instance.meshHandler!)
        anchorEventChannel.setStreamHandler(instance.anchorHandler!)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        result(FlutterMethodNotImplemented)
    }
}

// MARK: - AR Session Handler

class ARSessionHandler: NSObject, FlutterStreamHandler, ARSessionDelegate {

    private var arSession: ARSession?
    private var eventSink: FlutterEventSink?
    private var configuration: ARWorldTrackingConfiguration?

    // MARK: Method Channel

    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "initSession":
            initSession(call.arguments as? [String: Any] ?? [:], result: result)
        case "pauseSession":
            pauseSession(result: result)
        case "resumeSession":
            resumeSession(result: result)
        case "destroySession":
            destroySession(result: result)
        case "checkARSupport":
            checkARSupport(result: result)
        case "getSessionStatus":
            getSessionStatus(result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func initSession(_ config: [String: Any], result: @escaping FlutterResult) {
        let session = ARSession()
        session.delegate = self

        let worldConfig = ARWorldTrackingConfiguration()

        // Configure plane detection
        if config["horizontalPlaneDetection"] as? Bool ?? true {
            worldConfig.planeDetection.insert(.horizontal)
        }
        if config["verticalPlaneDetection"] as? Bool ?? true {
            worldConfig.planeDetection.insert(.vertical)
        }

        // Configure environment texturing
        if config["environmentTexturing"] as? Bool ?? true {
            worldConfig.environmentTexturing = .automatic
        }

        // Configure scene reconstruction (requires LiDAR)
        if config["sceneReconstruction"] as? Bool ?? false {
            if ARWorldTrackingConfiguration.supportsSceneReconstruction(.meshWithClassification) {
                worldConfig.sceneReconstruction = .meshWithClassification
            } else if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
                worldConfig.sceneReconstruction = .mesh
            }
        }

        // Configure frame semantics for depth
        let depthMode = config["depthMode"] as? String ?? "automatic"
        if depthMode != "disabled" {
            if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
                worldConfig.frameSemantics.insert(.sceneDepth)
            }
            if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
                worldConfig.frameSemantics.insert(.smoothedSceneDepth)
            }
        }

        // Auto focus
        worldConfig.isAutoFocusEnabled = config["autoFocus"] as? Bool ?? true

        // Light estimation
        let lightEstimation = config["lightEstimation"] as? String ?? "ambientIntensity"
        worldConfig.isLightEstimationEnabled = lightEstimation != "disabled"

        self.arSession = session
        self.configuration = worldConfig

        session.run(worldConfig)

        let sessionId = UUID().uuidString
        result(["sessionId": sessionId])
    }

    private func pauseSession(result: @escaping FlutterResult) {
        arSession?.pause()
        result(nil)
    }

    private func resumeSession(result: @escaping FlutterResult) {
        guard let session = arSession, let config = configuration else {
            result(FlutterError(code: "NO_SESSION", message: "No active session", details: nil))
            return
        }
        session.run(config)
        result(nil)
    }

    private func destroySession(result: @escaping FlutterResult) {
        arSession?.pause()
        arSession = nil
        configuration = nil
        result(nil)
    }

    private func checkARSupport(result: @escaping FlutterResult) {
        let isSupported = ARWorldTrackingConfiguration.isSupported
        let hasLiDAR = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
        let hasDepth = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)

        var modes: [String] = []
        if ARWorldTrackingConfiguration.isSupported { modes.append("worldTracking") }
        if ARFaceTrackingConfiguration.isSupported { modes.append("faceTracking") }
        if #available(iOS 14.0, *) {
            if ARGeoTrackingConfiguration.isSupported { modes.append("geoTracking") }
        }
        modes.append("imageTracking")

        result([
            "isSupported": isSupported,
            "hasLiDAR": hasLiDAR,
            "hasDepthSensor": hasDepth,
            "supportedTrackingModes": modes,
        ])
    }

    private func getSessionStatus(result: @escaping FlutterResult) {
        guard let session = arSession, let frame = session.currentFrame else {
            result(["isActive": false, "trackingState": "notAvailable", "frameRate": 0, "sessionDuration": 0])
            return
        }

        let trackingState: String
        switch frame.camera.trackingState {
        case .normal:
            trackingState = "normal"
        case .limited:
            trackingState = "limited"
        case .notAvailable:
            trackingState = "notAvailable"
        @unknown default:
            trackingState = "notAvailable"
        }

        result([
            "isActive": true,
            "trackingState": trackingState,
            "frameRate": 60,
            "sessionDuration": frame.timestamp,
        ])
    }

    // MARK: ARSessionDelegate

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        guard let sink = eventSink else { return }

        let camera = frame.camera
        let transform = camera.transform

        let trackingState: String
        var limitedReason: String?

        switch camera.trackingState {
        case .normal:
            trackingState = "normal"
        case .limited(let reason):
            trackingState = "limited"
            switch reason {
            case .initializing:
                limitedReason = "initializing"
            case .excessiveMotion:
                limitedReason = "excessiveMotion"
            case .insufficientFeatures:
                limitedReason = "insufficientFeatures"
            case .relocalizing:
                limitedReason = "relocalizing"
            @unknown default:
                limitedReason = "unknown"
            }
        case .notAvailable:
            trackingState = "notAvailable"
        @unknown default:
            trackingState = "notAvailable"
        }

        let intrinsics = camera.intrinsics

        var frameData: [String: Any] = [
            "type": "frameUpdate",
            "frame": [
                "frameId": Int(frame.timestamp * 1000),
                "timestamp": Int(frame.timestamp * 1000),
                "cameraPose": [
                    "position": [
                        "x": transform.columns.3.x,
                        "y": transform.columns.3.y,
                        "z": transform.columns.3.z,
                    ],
                    "rotation": simd_quaternion(transform).asDict(),
                    "transform": transform.asArray(),
                ],
                "cameraIntrinsics": [
                    "fx": intrinsics[0][0],
                    "fy": intrinsics[1][1],
                    "cx": intrinsics[2][0],
                    "cy": intrinsics[2][1],
                ],
                "trackingState": trackingState,
                "hasDepth": frame.sceneDepth != nil,
                "imageResolution": [
                    "width": Int(camera.imageResolution.width),
                    "height": Int(camera.imageResolution.height),
                ],
            ] as [String : Any],
        ]

        if let lr = limitedReason {
            (frameData["frame"] as? NSMutableDictionary)?["limitedReason"] = lr
        }

        sink(frameData)
    }

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        // Forward mesh anchors to mesh handler
        for anchor in anchors {
            if anchor is ARMeshAnchor {
                // Mesh anchor handling delegated to MeshScanHandler
            }
        }
    }

    // MARK: FlutterStreamHandler

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}

// MARK: - Mesh Scan Handler (Stub)

class MeshScanHandler: NSObject, FlutterStreamHandler {

    private var eventSink: FlutterEventSink?

    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "startMeshScanning":
            // TODO: Implement LiDAR mesh scanning with ARMeshAnchor
            result(["scanId": UUID().uuidString])
        case "stopMeshScanning":
            // TODO: Return mesh scan result
            result([:])
        case "exportMesh":
            // TODO: Export mesh to file
            result(["filePath": "", "size": 0])
        case "setMeshResolution":
            result(nil)
        case "clearMeshData":
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}

// MARK: - Anchor Handler (Stub)

class AnchorHandler: NSObject, FlutterStreamHandler {

    private var eventSink: FlutterEventSink?

    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "createAnchor":
            // TODO: Create ARAnchor from pose
            result([:])
        case "removeAnchor":
            result(nil)
        case "getAnchors":
            result([])
        case "hostCloudAnchor":
            // TODO: Implement cloud anchor hosting
            result(["cloudAnchorId": ""])
        case "resolveCloudAnchor":
            // TODO: Implement cloud anchor resolution
            result([:])
        case "createGeospatialAnchor":
            // TODO: Implement ARGeoAnchor
            result([:])
        case "saveWorldMap":
            // TODO: Implement ARWorldMap serialization
            result(["filePath": ""])
        case "loadWorldMap":
            // TODO: Implement ARWorldMap deserialization
            result(["success": false])
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        eventSink = events
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        eventSink = nil
        return nil
    }
}

// MARK: - simd Helpers

extension simd_quatf {
    func asDict() -> [String: Float] {
        return ["x": self.imag.x, "y": self.imag.y, "z": self.imag.z, "w": self.real]
    }
}

extension simd_float4x4 {
    func asArray() -> [Float] {
        return [
            columns.0.x, columns.0.y, columns.0.z, columns.0.w,
            columns.1.x, columns.1.y, columns.1.z, columns.1.w,
            columns.2.x, columns.2.y, columns.2.z, columns.2.w,
            columns.3.x, columns.3.y, columns.3.z, columns.3.w,
        ]
    }
}
