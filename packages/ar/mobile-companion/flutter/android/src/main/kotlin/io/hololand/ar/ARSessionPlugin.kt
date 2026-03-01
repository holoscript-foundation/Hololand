/// HoloLand AR Session Plugin - Android (ARCore)
///
/// Native Kotlin implementation for ARCore integration.
/// Handles AR session lifecycle, depth-based mesh scanning, and spatial anchors.
///
/// Platform channels:
///   - io.hololand.ar/session        (MethodChannel)
///   - io.hololand.ar/session_events (EventChannel)
///   - io.hololand.ar/mesh           (MethodChannel)
///   - io.hololand.ar/mesh_events    (EventChannel)
///   - io.hololand.ar/anchors        (MethodChannel)
///   - io.hololand.ar/anchor_events  (EventChannel)

package io.hololand.ar

import android.app.Activity
import android.content.Context
import androidx.annotation.NonNull
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import java.util.UUID

// =============================================================================
// PLUGIN REGISTRATION
// =============================================================================

class HoloLandARPlugin : FlutterPlugin, ActivityAware {

    private var activity: Activity? = null

    // Method channels
    private lateinit var sessionChannel: MethodChannel
    private lateinit var meshChannel: MethodChannel
    private lateinit var anchorsChannel: MethodChannel

    // Event channels
    private lateinit var sessionEventChannel: EventChannel
    private lateinit var meshEventChannel: EventChannel
    private lateinit var anchorEventChannel: EventChannel

    // Handlers
    private var sessionHandler: ARSessionHandler? = null
    private var meshHandler: MeshScanHandler? = null
    private var anchorHandler: AnchorHandler? = null

    override fun onAttachedToEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        val messenger = binding.binaryMessenger

        // Session channels
        sessionChannel = MethodChannel(messenger, "io.hololand.ar/session")
        sessionEventChannel = EventChannel(messenger, "io.hololand.ar/session_events")

        // Mesh channels
        meshChannel = MethodChannel(messenger, "io.hololand.ar/mesh")
        meshEventChannel = EventChannel(messenger, "io.hololand.ar/mesh_events")

        // Anchor channels
        anchorsChannel = MethodChannel(messenger, "io.hololand.ar/anchors")
        anchorEventChannel = EventChannel(messenger, "io.hololand.ar/anchor_events")
    }

    override fun onDetachedFromEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        sessionChannel.setMethodCallHandler(null)
        meshChannel.setMethodCallHandler(null)
        anchorsChannel.setMethodCallHandler(null)
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activity = binding.activity
        setupHandlers()
    }

    override fun onDetachedFromActivity() {
        sessionHandler?.destroy()
        activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
        setupHandlers()
    }

    override fun onDetachedFromActivityForConfigChanges() {
        // Keep handlers alive during config changes
    }

    private fun setupHandlers() {
        val act = activity ?: return

        sessionHandler = ARSessionHandler(act)
        meshHandler = MeshScanHandler()
        anchorHandler = AnchorHandler()

        sessionChannel.setMethodCallHandler(sessionHandler)
        meshChannel.setMethodCallHandler(meshHandler)
        anchorsChannel.setMethodCallHandler(anchorHandler)

        sessionEventChannel.setStreamHandler(sessionHandler)
        meshEventChannel.setStreamHandler(meshHandler)
        anchorEventChannel.setStreamHandler(anchorHandler)
    }
}

// =============================================================================
// AR SESSION HANDLER
// =============================================================================

class ARSessionHandler(
    private val activity: Activity
) : MethodCallHandler, EventChannel.StreamHandler {

    private var arSession: Session? = null
    private var eventSink: EventChannel.EventSink? = null
    private var isRunning = false

    override fun onMethodCall(@NonNull call: MethodCall, @NonNull result: Result) {
        when (call.method) {
            "initSession" -> initSession(call.arguments as? Map<String, Any> ?: emptyMap(), result)
            "pauseSession" -> pauseSession(result)
            "resumeSession" -> resumeSession(result)
            "destroySession" -> destroySession(result)
            "checkARSupport" -> checkARSupport(result)
            "getSessionStatus" -> getSessionStatus(result)
            else -> result.notImplemented()
        }
    }

    private fun initSession(config: Map<String, Any>, result: Result) {
        try {
            val session = Session(activity)
            val arConfig = Config(session)

            // Plane detection
            val horizontalPlanes = config["horizontalPlaneDetection"] as? Boolean ?: true
            val verticalPlanes = config["verticalPlaneDetection"] as? Boolean ?: true
            if (horizontalPlanes && verticalPlanes) {
                arConfig.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
            } else if (horizontalPlanes) {
                arConfig.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
            } else if (verticalPlanes) {
                arConfig.planeFindingMode = Config.PlaneFindingMode.VERTICAL
            } else {
                arConfig.planeFindingMode = Config.PlaneFindingMode.DISABLED
            }

            // Depth mode
            val depthMode = config["depthMode"] as? String ?: "automatic"
            if (depthMode != "disabled") {
                if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                    arConfig.depthMode = Config.DepthMode.AUTOMATIC
                }
            }

            // Light estimation
            val lightEstimation = config["lightEstimation"] as? String ?: "ambientIntensity"
            arConfig.lightEstimationMode = when (lightEstimation) {
                "disabled" -> Config.LightEstimationMode.DISABLED
                "environmentalHDR" -> Config.LightEstimationMode.ENVIRONMENTAL_HDR
                else -> Config.LightEstimationMode.AMBIENT_INTENSITY
            }

            // Cloud anchors
            val cloudAnchors = config["cloudAnchorsEnabled"] as? Boolean ?: false
            if (cloudAnchors) {
                arConfig.cloudAnchorMode = Config.CloudAnchorMode.ENABLED
            }

            // Geospatial
            val geospatial = config["geospatialEnabled"] as? Boolean ?: false
            if (geospatial) {
                arConfig.geospatialMode = Config.GeospatialMode.ENABLED
            }

            // Auto focus
            val autoFocus = config["autoFocus"] as? Boolean ?: true
            arConfig.focusMode = if (autoFocus) {
                Config.FocusMode.AUTO
            } else {
                Config.FocusMode.FIXED
            }

            session.configure(arConfig)
            session.resume()

            this.arSession = session
            this.isRunning = true

            // Start frame update loop
            startFrameUpdates()

            val sessionId = UUID.randomUUID().toString()
            result.success(mapOf("sessionId" to sessionId))

        } catch (e: UnavailableArcoreNotInstalledException) {
            result.error("AR_NOT_SUPPORTED", "ARCore is not installed", null)
        } catch (e: UnavailableDeviceNotCompatibleException) {
            result.error("AR_NOT_SUPPORTED", "Device does not support ARCore", null)
        } catch (e: Exception) {
            result.error("SESSION_FAILED", e.message, null)
        }
    }

    private fun pauseSession(result: Result) {
        arSession?.pause()
        isRunning = false
        result.success(null)
    }

    private fun resumeSession(result: Result) {
        try {
            arSession?.resume()
            isRunning = true
            startFrameUpdates()
            result.success(null)
        } catch (e: Exception) {
            result.error("SESSION_FAILED", e.message, null)
        }
    }

    private fun destroySession(result: Result) {
        isRunning = false
        arSession?.close()
        arSession = null
        result.success(null)
    }

    fun destroy() {
        isRunning = false
        arSession?.close()
        arSession = null
    }

    private fun checkARSupport(result: Result) {
        val availability = ArCoreApk.getInstance()
            .checkAvailability(activity)

        val isSupported = availability.isSupported

        // Check depth support
        var hasDepth = false
        try {
            val tempSession = Session(activity)
            hasDepth = tempSession.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
            tempSession.close()
        } catch (_: Exception) {
            // Depth check failed
        }

        val modes = mutableListOf("worldTracking", "imageTracking")
        // Note: ARCore does not have separate face tracking config like ARKit;
        // it is done via augmented faces within a session.

        result.success(mapOf(
            "isSupported" to isSupported,
            "hasLiDAR" to false,  // Android devices do not have LiDAR
            "hasDepthSensor" to hasDepth,
            "supportedTrackingModes" to modes
        ))
    }

    private fun getSessionStatus(result: Result) {
        val session = arSession
        if (session == null || !isRunning) {
            result.success(mapOf(
                "isActive" to false,
                "trackingState" to "notAvailable",
                "frameRate" to 0,
                "sessionDuration" to 0
            ))
            return
        }

        try {
            val frame = session.update()
            val camera = frame.camera

            val trackingState = when (camera.trackingState) {
                TrackingState.TRACKING -> "normal"
                TrackingState.PAUSED -> "limited"
                TrackingState.STOPPED -> "notAvailable"
                else -> "notAvailable"
            }

            result.success(mapOf(
                "isActive" to true,
                "trackingState" to trackingState,
                "frameRate" to 30,
                "sessionDuration" to frame.timestamp
            ))
        } catch (e: Exception) {
            result.error("SESSION_FAILED", e.message, null)
        }
    }

    private fun startFrameUpdates() {
        // In a real implementation, this would run on a background thread
        // and use session.update() to get frames at the AR refresh rate.
        // For the architecture stub, we document the pattern.
        //
        // Thread("ARFrameUpdate") {
        //     while (isRunning) {
        //         try {
        //             val frame = arSession?.update() ?: continue
        //             val camera = frame.camera
        //             if (camera.trackingState != TrackingState.TRACKING) continue
        //
        //             val pose = camera.displayOrientedPose
        //             val frameData = buildFrameEvent(frame, camera, pose)
        //             activity.runOnUiThread { eventSink?.success(frameData) }
        //         } catch (e: Exception) {
        //             // Handle frame update error
        //         }
        //     }
        // }.start()
    }

    // MARK: EventChannel.StreamHandler

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }
}

// =============================================================================
// MESH SCAN HANDLER (Stub)
// =============================================================================

class MeshScanHandler : MethodCallHandler, EventChannel.StreamHandler {

    private var eventSink: EventChannel.EventSink? = null

    override fun onMethodCall(@NonNull call: MethodCall, @NonNull result: Result) {
        when (call.method) {
            "startMeshScanning" -> {
                // TODO: Implement depth-based mesh reconstruction
                // Uses Frame.acquireRawDepthImage() for depth maps
                // Reconstruct mesh using TSDF (Truncated Signed Distance Function)
                result.success(mapOf("scanId" to UUID.randomUUID().toString()))
            }
            "stopMeshScanning" -> {
                // TODO: Return mesh scan result
                result.success(emptyMap<String, Any>())
            }
            "exportMesh" -> {
                // TODO: Export mesh to file
                result.success(mapOf("filePath" to "", "size" to 0))
            }
            "setMeshResolution" -> result.success(null)
            "clearMeshData" -> result.success(null)
            "getMeshStats" -> {
                result.success(mapOf(
                    "vertexCount" to 0,
                    "triangleCount" to 0,
                    "chunkCount" to 0,
                    "scannedArea" to 0.0,
                    "memoryUsage" to 0
                ))
            }
            else -> result.notImplemented()
        }
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }
}

// =============================================================================
// ANCHOR HANDLER (Stub)
// =============================================================================

class AnchorHandler : MethodCallHandler, EventChannel.StreamHandler {

    private var eventSink: EventChannel.EventSink? = null

    override fun onMethodCall(@NonNull call: MethodCall, @NonNull result: Result) {
        when (call.method) {
            "createAnchor" -> {
                // TODO: Create Anchor from Pose
                result.success(emptyMap<String, Any>())
            }
            "removeAnchor" -> result.success(null)
            "getAnchors" -> result.success(emptyList<Map<String, Any>>())
            "hostCloudAnchor" -> {
                // TODO: Host cloud anchor via session.hostCloudAnchorAsync()
                result.success(mapOf("cloudAnchorId" to ""))
            }
            "resolveCloudAnchor" -> {
                // TODO: Resolve cloud anchor via session.resolveCloudAnchorAsync()
                result.success(emptyMap<String, Any>())
            }
            "createGeospatialAnchor" -> {
                // TODO: Create Earth anchor via session.earth
                result.success(emptyMap<String, Any>())
            }
            else -> result.notImplemented()
        }
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }
}
