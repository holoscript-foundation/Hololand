/**
 * GeospatialBridge - iOS ARKit Implementation
 *
 * Bridges ARKit Location Anchors to Capacitor JavaScript.
 * Provides persistent AR content tied to real-world GPS coordinates.
 *
 * ARKIT LOCATION ANCHORS:
 * - Available: iOS 14+ (ARGeoTrackingConfiguration)
 * - Accuracy: ~5-10m horizontal, ~3-5m vertical
 * - Requirements: GPS + compass + ARKit tracking
 * - Best for: Outdoor AR experiences
 *
 * COORDINATE SYSTEM:
 * - Input: WGS84 (latitude, longitude, altitude)
 * - Output: ARKit world coordinates (right-handed Y-up)
 *
 * @see https://developer.apple.com/documentation/arkit/argeoanchor
 */

import Foundation
import Capacitor
import ARKit
import CoreLocation

@objc(GeospatialBridge)
public class GeospatialBridge: CAPPlugin {

    // =========================================================================
    // PROPERTIES
    // =========================================================================

    private var arSession: ARSession?
    private var arSessionDelegate: ARSessionDelegateImpl?
    private var locationManager: CLLocationManager?
    private var geoAnchors: [String: ARGeoAnchor] = [:]
    private var anchorIdCounter: Int = 0

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    @objc func initialize(_ call: CAPPluginCall) {
        // Check ARKit availability
        guard ARGeoTrackingConfiguration.isSupported else {
            call.resolve([
                "supported": false,
                "vpsAvailable": false,
                "vpsAvailability": "unavailable-device-incompatible",
                "horizontalAccuracy": NSNull(),
                "verticalAccuracy": NSNull(),
                "sessionState": "not-available",
                "platform": "arkit"
            ])
            return
        }

        // Create location manager
        if locationManager == nil {
            locationManager = CLLocationManager()
        }

        // Check location services
        let locationEnabled = CLLocationManager.locationServicesEnabled()

        call.resolve([
            "supported": true,
            "vpsAvailable": false, // ARKit doesn't have VPS (as of iOS 17)
            "vpsAvailability": "unavailable-device-incompatible",
            "horizontalAccuracy": NSNull(),
            "verticalAccuracy": NSNull(),
            "sessionState": locationEnabled ? "not-tracking" : "not-available",
            "platform": "arkit"
        ])
    }

    // =========================================================================
    // SESSION MANAGEMENT
    // =========================================================================

    @objc func startARSession(_ call: CAPPluginCall) {
        guard ARGeoTrackingConfiguration.isSupported else {
            call.reject("ARGeoTracking not supported on this device")
            return
        }

        // Check location permission
        let authStatus = CLLocationManager.authorizationStatus()
        guard authStatus == .authorizedWhenInUse || authStatus == .authorizedAlways else {
            call.reject("Location permission not granted")
            return
        }

        // Create AR session if needed
        if arSession == nil {
            arSession = ARSession()
            arSessionDelegate = ARSessionDelegateImpl()
            arSession?.delegate = arSessionDelegate
        }

        // Configure and run session
        let configuration = ARGeoTrackingConfiguration()
        configuration.planeDetection = [.horizontal]

        DispatchQueue.main.async {
            self.arSession?.run(configuration, options: [.resetTracking, .removeExistingAnchors])
            call.resolve(["success": true])
        }
    }

    @objc func stopARSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.arSession?.pause()
            self.geoAnchors.removeAll()
            call.resolve(["success": true])
        }
    }

    // =========================================================================
    // ANCHOR MANAGEMENT
    // =========================================================================

    @objc func createGeospatialAnchor(_ call: CAPPluginCall) {
        guard let arSession = arSession else {
            call.reject("AR session not active")
            return
        }

        // Parse coordinate
        guard let coordDict = call.getObject("coordinate"),
              let latitude = coordDict["latitude"] as? Double,
              let longitude = coordDict["longitude"] as? Double,
              let altitude = coordDict["altitude"] as? Double else {
            call.reject("Invalid coordinate")
            return
        }

        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)

        // Parse rotation (optional, defaults to identity)
        let rotDict = call.getObject("rotation")
        let qx = rotDict?["x"] as? Double ?? 0.0
        let qy = rotDict?["y"] as? Double ?? 0.0
        let qz = rotDict?["z"] as? Double ?? 0.0
        let qw = rotDict?["w"] as? Double ?? 1.0

        // Validate coordinate
        guard CLLocationCoordinate2DIsValid(coordinate) else {
            call.reject("Invalid GPS coordinate")
            return
        }

        // Create ARGeoAnchor
        let geoAnchor = ARGeoAnchor(coordinate: coordinate, altitude: altitude)

        // Generate anchor ID
        let anchorId = "arkit_\(anchorIdCounter)_\(Int(Date().timeIntervalSince1970 * 1000))"
        anchorIdCounter += 1

        // Store anchor
        geoAnchors[anchorId] = geoAnchor

        // Add to AR session
        DispatchQueue.main.async {
            arSession.add(anchor: geoAnchor)

            // Return anchor info
            call.resolve([
                "anchorId": anchorId,
                "coordinate": [
                    "latitude": latitude,
                    "longitude": longitude,
                    "altitude": altitude
                ],
                "rotation": [
                    "x": qx,
                    "y": qy,
                    "z": qz,
                    "w": qw
                ],
                "horizontalAccuracy": 10.0, // ARKit typical accuracy
                "verticalAccuracy": 5.0,
                "platform": "arkit",
                "timestamp": Int(Date().timeIntervalSince1970 * 1000)
            ])
        }
    }

    @objc func resolveGeospatialAnchor(_ call: CAPPluginCall) {
        guard let anchorId = call.getString("anchorId") else {
            call.reject("Missing anchorId")
            return
        }

        guard let geoAnchor = geoAnchors[anchorId] else {
            call.reject("Anchor not found: \(anchorId)")
            return
        }

        // Check if anchor is tracked
        guard let transform = geoAnchor.transform as? simd_float4x4 else {
            call.reject("Anchor not tracked yet")
            return
        }

        // Extract rotation from transform matrix
        let rotation = simd_quatf(transform)

        call.resolve([
            "anchorId": anchorId,
            "coordinate": [
                "latitude": geoAnchor.coordinate.latitude,
                "longitude": geoAnchor.coordinate.longitude,
                "altitude": geoAnchor.altitude ?? 0.0
            ],
            "rotation": [
                "x": Double(rotation.vector.x),
                "y": Double(rotation.vector.y),
                "z": Double(rotation.vector.z),
                "w": Double(rotation.vector.w)
            ],
            "horizontalAccuracy": 10.0,
            "verticalAccuracy": 5.0,
            "platform": "arkit",
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ])
    }

    @objc func removeGeospatialAnchor(_ call: CAPPluginCall) {
        guard let anchorId = call.getString("anchorId") else {
            call.reject("Missing anchorId")
            return
        }

        guard let geoAnchor = geoAnchors[anchorId] else {
            call.reject("Anchor not found: \(anchorId)")
            return
        }

        // Remove from session
        DispatchQueue.main.async {
            self.arSession?.remove(anchor: geoAnchor)
            self.geoAnchors.removeValue(forKey: anchorId)
            call.resolve(["success": true])
        }
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    @objc func getCapabilities(_ call: CAPPluginCall) {
        let supported = ARGeoTrackingConfiguration.isSupported
        let locationEnabled = CLLocationManager.locationServicesEnabled()

        var sessionState = "not-available"
        var horizontalAccuracy: Any = NSNull()
        var verticalAccuracy: Any = NSNull()

        if supported && locationEnabled {
            if arSession != nil {
                // Check tracking state
                if let frame = arSession?.currentFrame {
                    switch frame.camera.trackingState {
                    case .normal:
                        sessionState = "normal"
                    case .limited(.initializing):
                        sessionState = "limited"
                    case .limited(.insufficientFeatures):
                        sessionState = "insufficient-features"
                    case .limited(.relocalizing):
                        sessionState = "relocalizing"
                    case .notAvailable:
                        sessionState = "not-tracking"
                    default:
                        sessionState = "not-tracking"
                    }

                    // ARKit typical accuracy
                    horizontalAccuracy = 10.0
                    verticalAccuracy = 5.0
                } else {
                    sessionState = "not-tracking"
                }
            } else {
                sessionState = "not-tracking"
            }
        }

        call.resolve([
            "supported": supported,
            "vpsAvailable": false,
            "vpsAvailability": "unavailable-device-incompatible",
            "horizontalAccuracy": horizontalAccuracy,
            "verticalAccuracy": verticalAccuracy,
            "sessionState": sessionState,
            "platform": "arkit"
        ])
    }

    // =========================================================================
    // PERMISSIONS
    // =========================================================================

    @objc func requestLocationPermission(_ call: CAPPluginCall) {
        if locationManager == nil {
            locationManager = CLLocationManager()
        }

        let authStatus = CLLocationManager.authorizationStatus()

        switch authStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            call.resolve(["granted": true])

        case .notDetermined:
            // Request permission
            locationManager?.requestWhenInUseAuthorization()

            // Wait for permission response (simplified - real implementation needs delegate)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                let newStatus = CLLocationManager.authorizationStatus()
                let granted = newStatus == .authorizedWhenInUse || newStatus == .authorizedAlways
                call.resolve(["granted": granted])
            }

        case .denied, .restricted:
            call.resolve(["granted": false])

        @unknown default:
            call.resolve(["granted": false])
        }
    }

    @objc func checkLocationPermission(_ call: CAPPluginCall) {
        let authStatus = CLLocationManager.authorizationStatus()
        let granted = authStatus == .authorizedWhenInUse || authStatus == .authorizedAlways
        call.resolve(["granted": granted])
    }
}

// =============================================================================
// AR SESSION DELEGATE
// =============================================================================

class ARSessionDelegateImpl: NSObject, ARSessionDelegate {
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // Handle frame updates if needed
    }

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        // Handle anchors added
        for anchor in anchors {
            if let geoAnchor = anchor as? ARGeoAnchor {
                print("[GeospatialBridge] Geo anchor added: \(geoAnchor.coordinate)")
            }
        }
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        print("[GeospatialBridge] AR session failed: \(error.localizedDescription)")
    }
}
