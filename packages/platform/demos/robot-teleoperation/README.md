# VR Robot Teleoperation Demonstration

Complete demonstration of robot teleoperation in VR using Meta Quest 3 to control a simulated UR5e robotic arm in NVIDIA Isaac Sim.

## Overview

This demo showcases the HoloLand platform's comprehensive teleoperation capabilities:

1. **HoloScript Composition** (`ur5e-teleoperation.holo`) - VR environment with robot visualization, safety boundaries, and UI
2. **VR Controller Input Mapping** (`controller-input-mapping.ts`) - Maps Quest 3 controller inputs to robot joint control with haptic feedback
3. **Real-time Camera Feed** - Robot's perspective overlaid in VR
4. **Safety Constraints** - Workspace boundaries with graduated haptic feedback and collision avoidance
5. **React Telemetry Dashboard** (`RobotTelemetryMonitor.tsx`) - Real-time monitoring of joint angles, forces, and latency

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Meta Quest 3                              │
│                                                                 │
│  ┌──────────────────┐       ┌──────────────────┐              │
│  │ VR Controllers    │──────>│ Hand Tracking    │              │
│  │ (Input Mapping)   │       │ (90Hz)           │              │
│  └──────────────────┘       └──────────────────┘              │
│           │                          │                          │
│           v                          v                          │
│  ┌────────────────────────────────────────────┐                │
│  │      TeleoperationHub Service              │                │
│  │                                            │                │
│  │  ┌───────────┐  ┌──────────────────┐     │                │
│  │  │ IK Solver │  │ Safety Boundary   │     │                │
│  │  │ (6-DOF)   │  │ System (Haptics)  │     │                │
│  │  └───────────┘  └──────────────────┘     │                │
│  │                                            │                │
│  │  ┌───────────┐  ┌──────────────────┐     │                │
│  │  │ Camera    │  │ Telemetry Display │     │                │
│  │  │ Overlay   │  │ (HUD Panel)       │     │                │
│  │  └───────────┘  └──────────────────┘     │                │
│  │                                            │                │
│  │  ┌─────────────────────────────────┐     │                │
│  │  │ GR00TN16PolicyClient (Optional)  │     │                │
│  │  │ (256-dim → 37-DOF, 30Hz)        │     │                │
│  │  └─────────────────────────────────┘     │                │
│  └────────────────────────────────────────────┘                │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │ WebSocket Binary Protocol (60Hz)
            v
┌─────────────────────────────────────────────────────────────────┐
│                    NVIDIA Isaac Sim                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 UR5e Robot Simulation                     │  │
│  │                                                           │  │
│  │  Joint Commands (60Hz) ─> Actuator Control              │  │
│  │  Robot State (60Hz) ───> Telemetry Feedback             │  │
│  │  Camera Feed (30Hz) ───> H.264 Video Stream              │  │
│  │  Force Sensors ────────> Contact Force Telemetry        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Simulated Work Environment                   │  │
│  │  - Workbench with manipulation objects                   │  │
│  │  - Physics simulation (contact forces, friction)         │  │
│  │  - Perception sensors (depth cameras, LIDAR)             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            v (Optional)
┌─────────────────────────────────────────────────────────────────┐
│               GR00T N1.6 Inference Server                       │
│                                                                 │
│  Observation (30Hz) ──> Policy Network ──> Action Chunk (K=16) │
│  (756-dim vector)        (256-dim output)   (37-DOF targets)   │
└─────────────────────────────────────────────────────────────────┘
```

## System Requirements

### VR Hardware
- **Meta Quest 3** (required for hand tracking and controllers)
- **PC VR setup** with Link Cable or Air Link
- **6GB+ VRAM** for real-time rendering

### Software
- **HoloLand Platform** (latest version)
- **NVIDIA Isaac Sim** 2023.1.1+ ([Download](https://developer.nvidia.com/isaac-sim))
- **Node.js** 18+ (for React dashboard)
- **Python** 3.10+ (for Isaac Sim integration)

### Network
- **Low latency connection** between Quest 3 and Isaac Sim server (<50ms recommended)
- **WebSocket support** (ports 9090, 8765)

## Installation

### 1. Clone and Install Dependencies

```bash
cd packages/platform/demos/robot-teleoperation
npm install
```

### 2. Setup Isaac Sim

#### Install Isaac Sim
Follow the [NVIDIA Isaac Sim installation guide](https://docs.omniverse.nvidia.com/app_isaacsim/app_isaacsim/install_basic.html).

#### Configure UR5e Robot

```bash
# Navigate to Isaac Sim installation
cd ~/.local/share/ov/pkg/isaac_sim-2023.1.1

# Run the UR5e setup script
./python.sh omni/isaac/examples/ur5e_teleoperation_setup.py
```

#### Start Isaac Sim WebSocket Server

```bash
./python.sh scripts/websocket_robot_server.py \
  --robot ur5e \
  --port 9090 \
  --camera_resolution 640x480 \
  --camera_fps 30
```

This will:
- Load the UR5e robot model
- Start a WebSocket server on port 9090
- Enable camera streaming
- Configure contact force sensors

### 3. (Optional) Setup GR00T N1.6 Policy Server

If you want to use NVIDIA's humanoid robot policies:

```bash
# Install GR00T inference server
pip install groot-inference-server

# Download pretrained policies
python -m groot.download_policies --model ur5e_manipulation

# Start inference server
python -m groot.serve \
  --model ur5e_manipulation \
  --port 8765 \
  --device cuda:0 \
  --batch_size 1
```

### 4. Build and Run HoloLand Demo

```bash
# From the demo directory
npm run build

# Start the HoloLand server
npm run dev

# Open in browser (for desktop testing)
# Or launch on Quest 3 via WebXR
```

## Usage

### Desktop Testing (No VR)

For development and testing without VR hardware:

```bash
npm run dev:desktop
```

Navigate to `http://localhost:3000` and use:
- **WASD** - Move camera
- **Mouse** - Look around
- **E** - Emergency stop
- **R** - Resume
- **C** - Calibrate
- **1** - Direct IK mode
- **2** - GR00T manipulation mode
- **3** - GR00T navigation mode
- **T** - Toggle telemetry
- **V** - Toggle camera feed
- **B** - Toggle safety boundaries

### VR Mode (Quest 3)

1. **Connect Quest 3** via Link Cable or Air Link
2. **Launch HoloLand** from the Quest browser or native app
3. **Enter VR mode** when prompted

#### Controller Mapping

**Left Controller:**
- **Thumbstick** - Fine position adjustment (left hand IK target)
- **Trigger** - Grip control (0-1)
- **Grip Button** - Secondary grip / tool selection
- **X Button** - Emergency stop toggle
- **Y Button** - Calibration trigger
- **Haptics** - Safety boundary feedback

**Right Controller:**
- **Thumbstick** - Fine position adjustment (right hand IK target)
- **Trigger** - Grip control (0-1)
- **Grip Button** - Secondary grip / tool selection
- **A Button** - Mode switching (Direct IK ↔ GR00T)
- **B Button** - Toggle camera overlay
- **Haptics** - Contact force feedback + boundary warnings

#### Calibration Workflow

1. **Position hands** at neutral pose (arms relaxed at sides)
2. **Press Y button** (left controller) to start calibration
3. **Wait for prompt** "Move hands to neutral position"
4. **Make thumbs-up gesture** with both hands
5. **Wait for confirmation** "Calibration complete"
6. Begin teleoperation

### Operating Modes

#### 1. Direct IK Mode (Default)

Pure inverse kinematics control. Your hand positions map directly to robot end-effector positions.

- **Pros**: Intuitive, low latency, full control
- **Cons**: No obstacle avoidance, requires constant input

#### 2. GR00T Manipulation Mode

AI-assisted manipulation using NVIDIA's humanoid robot policies.

- **Pros**: Natural motions, obstacle avoidance, task completion
- **Cons**: Higher latency (~50ms inference), requires policy server

#### 3. GR00T Navigation Mode

Policy controls robot base/torso; you control arms.

- **Pros**: Coordinated whole-body control
- **Cons**: Complex setup, requires humanoid robot model

## Safety Features

### Workspace Boundaries

The demo enforces a **safe workspace** defined in the HoloScript composition:

- **Workspace Box**: 0.8m × 0.8m × 0.6m centered at (0, 0.9, 0.5)
- **Soft Margin**: 5cm from boundary (graduated haptic feedback)
- **Hard Margin**: 1cm from boundary (motion blocked)

When approaching boundaries:
1. **Green zone** (> 5cm from edge): No warnings
2. **Yellow zone** (1-5cm from edge): Haptic pulses increase
3. **Red zone** (< 1cm from edge): Motion blocked, max haptics

### Exclusion Zones

Additional safety zones prevent collision with obstacles:

- **Exclusion Sphere**: 15cm radius at (-0.3, 0.6, 0.3)
- **Soft Margin**: 8cm (warning haptics)
- **Hard Margin**: 3cm (motion blocked)
- **Violation**: Emergency stop

### Force Limits

Contact forces are monitored and limited:

- **Max Contact Force**: 100N
- **Warning Threshold**: 50N (visual + haptic alert)
- **Critical Threshold**: 80N (motion slowed)
- **Emergency Threshold**: 100N (immediate stop)

### Emergency Stop

Triggered by:
- **X button** (left controller)
- **Pinch gesture** (right hand)
- **Boundary violation**
- **Force limit exceeded**
- **Communication timeout** (>5s)

Resume by:
- **X button** again (left controller)
- **Pinch gesture** again (right hand)
- After clearing violation cause

## Performance Metrics

### Real-Time Budget (11.1ms at 90Hz)

| Component | Target | Typical |
|-----------|--------|---------|
| IK Solve (bimanual) | <1ms | ~0.3ms |
| Safety Check | <0.5ms | ~0.1ms |
| Joint Command Send | <0.1ms | ~0.05ms |
| Camera Overlay Update | <0.5ms | ~0.02ms |
| Telemetry Display | <1ms | ~0.5ms (rate limited to 10Hz) |
| **Total Teleoperation** | <3ms | ~1ms |

### Network Latency

| Path | Target | Typical |
|------|--------|---------|
| Quest → PC → Isaac Sim (Command) | <20ms | ~12ms |
| Isaac Sim → PC → Quest (State) | <30ms | ~15ms |
| Isaac Sim → Quest (Camera) | <50ms | ~30ms (H.264) |
| **Round-Trip (Command → Feedback)** | <50ms | ~25-30ms |

### GR00T Policy Inference

| Metric | Target | Typical |
|--------|--------|---------|
| Observation Assembly | <10ms | ~5ms |
| Network Send | <5ms | ~2ms |
| Policy Inference (GPU) | <50ms | ~30ms |
| Action Decode + Blend | <10ms | ~3ms |
| **Total (Observation → Action)** | <100ms | ~40-50ms |

## Troubleshooting

### Quest 3 Connection Issues

**Symptom**: "Failed to connect to robot" error

**Solutions**:
1. Check Isaac Sim WebSocket server is running (`ws://localhost:9090/robot/ur5e`)
2. Verify network connectivity: `ping <isaac-sim-host>`
3. Check firewall rules (allow port 9090)
4. Restart Isaac Sim server
5. Check browser console for WebSocket errors

### High Latency Warnings

**Symptom**: Latency >100ms, yellow/red indicators

**Solutions**:
1. Use wired Link Cable instead of Air Link
2. Reduce camera resolution (640×480 → 320×240)
3. Disable GR00T policy (use Direct IK mode)
4. Close other network-intensive applications
5. Check Isaac Sim performance (reduce scene complexity)

### IK Solving Failures

**Symptom**: Robot doesn't follow hand movements

**Solutions**:
1. Recalibrate (Y button)
2. Check joint limits (robot may be at mechanical limits)
3. Reduce movement speed (use fine adjustment mode)
4. Verify robot model matches configuration (UR5e vs humanoid)
5. Check console for IK convergence errors

### Haptic Feedback Not Working

**Symptom**: No vibration when approaching boundaries

**Solutions**:
1. Enable haptics in settings (`enableHaptics: true`)
2. Check Quest 3 system settings (haptics enabled)
3. Verify controller battery level (>20%)
4. Restart controllers (turn off/on)
5. Check browser WebXR haptic actuator support

### Camera Feed Frozen/Laggy

**Symptom**: Robot camera not updating or delayed

**Solutions**:
1. Check Isaac Sim camera stream (should be 30 FPS)
2. Reduce camera resolution
3. Switch to MJPEG encoding (lower quality, lower latency)
4. Increase network bandwidth
5. Check GPU usage (may be bottlenecked)

### GR00T Policy Server Errors

**Symptom**: "GR00T policy server not available" error

**Solutions**:
1. Start GR00T inference server (`python -m groot.serve`)
2. Check server logs for errors
3. Verify CUDA/GPU availability
4. Download missing policy models
5. Fall back to Direct IK mode

## File Structure

```
robot-teleoperation/
├── README.md                        # This file
├── ur5e-teleoperation.holo          # Main HoloScript composition
├── controller-input-mapping.ts      # VR controller input system
├── RobotTelemetryMonitor.tsx        # React telemetry dashboard
├── package.json                     # Node dependencies
├── assets/                          # 3D models and textures
│   ├── robots/
│   │   └── ur5e/
│   │       ├── ur5e.gltf           # UR5e robot model
│   │       └── gripper.gltf        # End-effector gripper
│   └── textures/
│       └── wood_normal.jpg          # Workbench texture
├── scripts/                         # Python Isaac Sim integration
│   ├── websocket_robot_server.py    # Isaac Sim WebSocket server
│   └── ur5e_teleoperation_setup.py  # UR5e scene setup
└── docs/                            # Additional documentation
    ├── ARCHITECTURE.md              # Detailed architecture
    ├── API_REFERENCE.md             # API documentation
    └── TUNING_GUIDE.md              # Performance tuning
```

## Configuration

### HoloScript Composition Config

Edit `ur5e-teleoperation.holo` to customize:

```holo
service "TeleoperationHub" {
  config: {
    // IK solver settings
    ikSolver: {
      maxIterations: 50,              // Increase for better convergence
      convergenceThreshold: 0.001,    // Lower = more accurate
      dampingFactor: 0.1,             // Higher = more stable
    },

    // WebSocket connection
    policyStream: {
      robotUrl: "ws://localhost:9090/robot/ur5e",
      commandRateHz: 60,              // Command frequency
      reconnectIntervalMs: 2000,
    },

    // Safety boundaries
    safety: {
      maxContactForce: 100,           // Newtons
      maxJointVelocity: 3.0,          // rad/s
      hapticFrequency: 200,           // Hz
    },

    // GR00T policy
    enableGR00TPolicy: true,          // Enable/disable AI assistance
    grootPolicy: {
      observationRateHz: 30,
      actionChunking: {
        chunkSize: 16,                // Future action steps
        executeHorizon: 8,            // Re-plan threshold
      },
    },
  }
}
```

### Controller Input Mapping Config

Edit `controller-input-mapping.ts`:

```typescript
const config: ControllerInputConfig = {
  positionSensitivity: 0.01,      // Meters per thumbstick unit
  rotationSensitivity: 2.0,       // Degrees per thumbstick unit
  triggerDeadzone: 0.05,
  thumbstickDeadzone: 0.1,
  enableHaptics: true,
  maxHapticIntensity: 1.0,
  boundaryHapticFrequency: 10,    // Hz
  forceHapticScale: 0.01,         // 1N = 1% intensity
};
```

## Advanced Features

### Custom Robot Models

To use a different robot (e.g., Franka Panda, ABB IRB):

1. Replace `ur5e.gltf` with your robot model
2. Update joint names and limits in `ikSolver` config
3. Modify Isaac Sim scene setup script
4. Adjust workspace boundaries for robot reach

### Multi-Robot Teleoperation

Control multiple robots simultaneously:

1. Create multiple `TeleoperationHub` services
2. Assign hand tracking to different robots
3. Configure independent safety boundaries
4. Use spatial multiplexing (different workspace zones)

### Custom Force Feedback Patterns

Implement haptic feedback for specific tasks:

```typescript
controllerManager.onGrasp((object) => {
  // Pulse when grasping object
  controllerManager.triggerHapticPattern('right', 'force');
});

controllerManager.onRelease((object) => {
  // Light pulse when releasing
  controllerManager.triggerHapticPattern('right', 'boundary');
});
```

### Recording and Playback

Record teleoperation sessions for training:

```holo
service "SessionRecorder" {
  type: "teleoperation_recorder"
  config: {
    recordJoints: true,
    recordForces: true,
    recordCameraFeed: true,
    outputPath: "./recordings/session_{timestamp}.bag"
  }
}
```

## References

### Research Papers

- **VRSplat** (I3D 2025): Foveated Gaussian splatting in VR
- **StopThePop** (SIGGRAPH 2024): Hierarchical per-pixel sorting for Gaussians
- **GR00T** (NVIDIA 2024): Generalist humanoid robot policies
- **Teleoperation via IK** (ICRA 2023): Real-time IK for robot control

### External Documentation

- [NVIDIA Isaac Sim Docs](https://docs.omniverse.nvidia.com/app_isaacsim/)
- [Universal Robots UR5e Specs](https://www.universal-robots.com/products/ur5-robot/)
- [Meta Quest 3 Developer Guide](https://developer.oculus.com/documentation/native/android/mobile-intro/)
- [WebXR Device API](https://www.w3.org/TR/webxr/)
- [HoloLand Platform Docs](https://docs.hololand.io)

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- **GitHub Issues**: [HoloLand/Hololand/issues](https://github.com/HoloLand/Hololand/issues)
- **Discord**: [HoloLand Community](https://discord.gg/hololand)
- **Email**: support@hololand.io

---

**Built with HoloLand Platform** • **Powered by NVIDIA Isaac Sim** • **Designed for Meta Quest 3**
