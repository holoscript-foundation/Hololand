/**
 * GeospatialBridge - Android ARCore Implementation
 *
 * Bridges ARCore Geospatial API to Capacitor JavaScript.
 * Provides persistent AR content tied to real-world GPS coordinates with VPS fusion.
 *
 * ARCORE GEOSPATIAL API:
 * - Available: ARCore 1.30+ (Android 7.0+)
 * - Accuracy: ~1-5m with VPS, ~3-10m GPS-only
 * - Requirements: GPS + camera + internet (for VPS)
 * - Best for: Outdoor AR with VPS coverage
 *
 * VPS (Visual Positioning Service):
 * - Cloud-based visual localization
 * - Matches camera feed to Google's 3D point cloud
 * - Provides <1m accuracy in covered areas
 *
 * COORDINATE SYSTEM:
 * - Input: WGS84 (latitude, longitude, altitude)
 * - Output: ARCore world coordinates (right-handed Y-up)
 *
 * @see https://developers.google.com/ar/develop/geospatial
 */

package io.hololand.mobile

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.google.ar.core.Anchor
import com.google.ar.core.Config
import com.google.ar.core.Earth
import com.google.ar.core.GeospatialMode
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.UnavailableException

@CapacitorPlugin(
    name = "GeospatialBridge",
    permissions = [
        Permission(
            strings = [Manifest.permission.ACCESS_FINE_LOCATION],
            alias = "location"
        ),
        Permission(
            strings = [Manifest.permission.CAMERA],
            alias = "camera"
        )
    ]
)
class GeospatialBridge : Plugin() {

    // =========================================================================
    // PROPERTIES
    // =========================================================================

    private var arSession: Session? = null
    private var geoAnchors: MutableMap<String, Anchor> = mutableMapOf()
    private var anchorIdCounter = 0

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    @PluginMethod
    fun initialize(call: PluginCall) {
        try {
            // Check ARCore availability
            val availability = Session.checkAvailability(context)
            if (availability != Session.Availability.SUPPORTED_INSTALLED) {
                call.resolve(createCapabilities(
                    supported = false,
                    sessionState = "not-available",
                    vpsAvailability = "unavailable-device-incompatible"
                ))
                return
            }

            call.resolve(createCapabilities(
                supported = true,
                sessionState = "not-tracking",
                vpsAvailability = "unknown"
            ))

        } catch (e: Exception) {
            call.reject("ARCore initialization failed: ${e.message}")
        }
    }

    // =========================================================================
    // SESSION MANAGEMENT
    // =========================================================================

    @PluginMethod
    fun startARSession(call: PluginCall) {
        try {
            // Check camera permission
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
                call.reject("Camera permission not granted")
                return
            }

            // Check location permission
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
                call.reject("Location permission not granted")
                return
            }

            // Create AR session
            if (arSession == null) {
                arSession = Session(context)
            }

            // Configure for geospatial mode
            val config = arSession!!.config
            config.geospatialMode = GeospatialMode.ENABLED
            arSession!!.configure(config)

            // Resume session
            arSession!!.resume()

            call.resolve(JSObject().put("success", true))

        } catch (e: UnavailableException) {
            call.reject("Failed to start AR session: ${e.message}")
        } catch (e: Exception) {
            call.reject("AR session error: ${e.message}")
        }
    }

    @PluginMethod
    fun stopARSession(call: PluginCall) {
        arSession?.pause()
        geoAnchors.clear()
        call.resolve(JSObject().put("success", true))
    }

    // =========================================================================
    // ANCHOR MANAGEMENT
    // =========================================================================

    @PluginMethod
    fun createGeospatialAnchor(call: PluginCall) {
        val session = arSession
        if (session == null) {
            call.reject("AR session not active")
            return
        }

        // Parse coordinate
        val coordObj = call.getObject("coordinate")
        val latitude = coordObj?.getDouble("latitude")
        val longitude = coordObj?.getDouble("longitude")
        val altitude = coordObj?.getDouble("altitude")

        if (latitude == null || longitude == null || altitude == null) {
            call.reject("Invalid coordinate")
            return
        }

        // Parse rotation (optional)
        val rotObj = call.getObject("rotation")
        val qx = rotObj?.getDouble("x")?.toFloat() ?: 0f
        val qy = rotObj?.getDouble("y")?.toFloat() ?: 0f
        val qz = rotObj?.getDouble("z")?.toFloat() ?: 0f
        val qw = rotObj?.getDouble("w")?.toFloat() ?: 1f

        try {
            // Create ARCore Geospatial anchor
            val earth = session.earth
            if (earth?.trackingState != TrackingState.TRACKING) {
                call.reject("Earth tracking not ready. State: ${earth?.trackingState}")
                return
            }

            // Create anchor at GPS location
            val anchor = earth.createAnchor(
                latitude,
                longitude,
                altitude,
                qx, qy, qz, qw
            )

            // Generate anchor ID
            val anchorId = "arcore_${anchorIdCounter++}_${System.currentTimeMillis()}"
            geoAnchors[anchorId] = anchor

            // Get Earth accuracy
            val horizontalAccuracy = earth.cameraGeospatialPose?.horizontalAccuracy?.toDouble() ?: 5.0
            val verticalAccuracy = earth.cameraGeospatialPose?.verticalAccuracy?.toDouble() ?: 3.0

            // Return anchor info
            val result = JSObject()
            result.put("anchorId", anchorId)
            result.put("coordinate", JSObject()
                .put("latitude", latitude)
                .put("longitude", longitude)
                .put("altitude", altitude))
            result.put("rotation", JSObject()
                .put("x", qx.toDouble())
                .put("y", qy.toDouble())
                .put("z", qz.toDouble())
                .put("w", qw.toDouble()))
            result.put("horizontalAccuracy", horizontalAccuracy)
            result.put("verticalAccuracy", verticalAccuracy)
            result.put("platform", "arcore")
            result.put("timestamp", System.currentTimeMillis())

            call.resolve(result)

        } catch (e: Exception) {
            call.reject("Failed to create anchor: ${e.message}")
        }
    }

    @PluginMethod
    fun resolveGeospatialAnchor(call: PluginCall) {
        val anchorId = call.getString("anchorId")
        if (anchorId == null) {
            call.reject("Missing anchorId")
            return
        }

        val anchor = geoAnchors[anchorId]
        if (anchor == null) {
            call.reject("Anchor not found: $anchorId")
            return
        }

        // Check anchor tracking state
        if (anchor.trackingState != TrackingState.TRACKING) {
            call.reject("Anchor not tracking yet. State: ${anchor.trackingState}")
            return
        }

        // Extract pose
        val pose = anchor.pose
        val rotation = pose.rotationQuaternion

        // Get current Earth accuracy
        val earth = arSession?.earth
        val horizontalAccuracy = earth?.cameraGeospatialPose?.horizontalAccuracy?.toDouble() ?: 5.0
        val verticalAccuracy = earth?.cameraGeospatialPose?.verticalAccuracy?.toDouble() ?: 3.0

        // Return anchor with current pose
        val result = JSObject()
        result.put("anchorId", anchorId)
        result.put("coordinate", JSObject()
            .put("latitude", 0.0)  // ARCore doesn't expose anchor GPS coords after creation
            .put("longitude", 0.0)
            .put("altitude", 0.0))
        result.put("rotation", JSObject()
            .put("x", rotation[0].toDouble())
            .put("y", rotation[1].toDouble())
            .put("z", rotation[2].toDouble())
            .put("w", rotation[3].toDouble()))
        result.put("horizontalAccuracy", horizontalAccuracy)
        result.put("verticalAccuracy", verticalAccuracy)
        result.put("platform", "arcore")
        result.put("timestamp", System.currentTimeMillis())

        call.resolve(result)
    }

    @PluginMethod
    fun removeGeospatialAnchor(call: PluginCall) {
        val anchorId = call.getString("anchorId")
        if (anchorId == null) {
            call.reject("Missing anchorId")
            return
        }

        val anchor = geoAnchors.remove(anchorId)
        if (anchor == null) {
            call.reject("Anchor not found: $anchorId")
            return
        }

        anchor.detach()
        call.resolve(JSObject().put("success", true))
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    @PluginMethod
    fun getCapabilities(call: PluginCall) {
        try {
            val session = arSession
            val earth = session?.earth

            val supported = Session.checkAvailability(context) == Session.Availability.SUPPORTED_INSTALLED

            var sessionState = "not-tracking"
            var vpsAvailability = "unknown"
            var horizontalAccuracy: Double? = null
            var verticalAccuracy: Double? = null

            if (earth != null) {
                // Map Earth tracking state to session state
                sessionState = when (earth.trackingState) {
                    TrackingState.TRACKING -> "normal"
                    TrackingState.PAUSED -> "limited"
                    TrackingState.STOPPED -> "not-tracking"
                }

                // Check VPS availability
                vpsAvailability = when (earth.earthState) {
                    Earth.EarthState.ENABLED -> "available"
                    Earth.EarthState.ERROR_INTERNAL -> "unavailable-insufficient-visual-data"
                    Earth.EarthState.ERROR_NOT_AUTHORIZED -> "unavailable-device-incompatible"
                    Earth.EarthState.ERROR_RESOURCE_EXHAUSTED -> "unavailable-insufficient-visual-data"
                }

                // Get accuracy if tracking
                if (earth.trackingState == TrackingState.TRACKING) {
                    horizontalAccuracy = earth.cameraGeospatialPose?.horizontalAccuracy?.toDouble()
                    verticalAccuracy = earth.cameraGeospatialPose?.verticalAccuracy?.toDouble()
                }
            }

            call.resolve(createCapabilities(
                supported = supported,
                vpsAvailable = earth?.earthState == Earth.EarthState.ENABLED,
                vpsAvailability = vpsAvailability,
                horizontalAccuracy = horizontalAccuracy,
                verticalAccuracy = verticalAccuracy,
                sessionState = sessionState
            ))

        } catch (e: Exception) {
            call.reject("Failed to get capabilities: ${e.message}")
        }
    }

    // =========================================================================
    // PERMISSIONS
    // =========================================================================

    @PluginMethod
    fun requestLocationPermission(call: PluginCall) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED) {
            call.resolve(JSObject().put("granted", true))
            return
        }

        // Request permission via Capacitor permission system
        requestPermissionForAlias("location", call, "locationPermissionCallback")
    }

    @PluginMethod
    fun checkLocationPermission(call: PluginCall) {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().put("granted", granted))
    }

    // Permission callback
    private fun locationPermissionCallback(call: PluginCall) {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().put("granted", granted))
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private fun createCapabilities(
        supported: Boolean,
        vpsAvailable: Boolean = false,
        vpsAvailability: String = "unknown",
        horizontalAccuracy: Double? = null,
        verticalAccuracy: Double? = null,
        sessionState: String = "not-tracking"
    ): JSObject {
        val result = JSObject()
        result.put("supported", supported)
        result.put("vpsAvailable", vpsAvailable)
        result.put("vpsAvailability", vpsAvailability)
        result.put("horizontalAccuracy", horizontalAccuracy)
        result.put("verticalAccuracy", verticalAccuracy)
        result.put("sessionState", sessionState)
        result.put("platform", "arcore")
        return result
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    override fun handleOnPause() {
        super.handleOnPause()
        arSession?.pause()
    }

    override fun handleOnResume() {
        super.handleOnResume()
        try {
            arSession?.resume()
        } catch (e: Exception) {
            // Ignore resume errors
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        arSession?.close()
        arSession = null
        geoAnchors.clear()
    }
}
