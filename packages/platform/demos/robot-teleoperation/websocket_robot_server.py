"""
WebSocket Robot Server for Isaac Sim Integration

Provides WebSocket interface for robot teleoperation from HoloLand VR.
Handles binary protocol communication with 60Hz joint commands and
real-time telemetry/camera streaming.

PROTOCOL:
    All messages use binary format with 9-byte header:
    [0]: Message type (uint8)
    [1-4]: Sequence number (uint32, little-endian)
    [5-8]: Timestamp (uint32, little-endian, milliseconds)
    [9+]: Payload (variable)

MESSAGE TYPES:
    0x01 JOINT_COMMAND - Joint angle targets (37 joints × 4 bytes = 148 bytes)
    0x02 STATE_TELEMETRY - Full robot state
    0x03 POLICY_ACTION - 256-dim action vector (1024 bytes)
    0x04 CAMERA_FRAME - H.264 NAL unit
    0x05 HEARTBEAT - Keepalive
    0x06 EMERGENCY_STOP - Immediate halt
    0x07 RESUME - Clear e-stop
    0x08 ERROR - Error notification
    0x09 CALIBRATE - Calibration request
    0x0A CALIBRATION_RESULT - Calibration response

Usage:
    python websocket_robot_server.py \
        --robot ur5e \
        --port 9090 \
        --camera_resolution 640x480 \
        --camera_fps 30
"""

import asyncio
import struct
import time
import json
import logging
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

import websockets
from websockets.server import WebSocketServerProtocol
import numpy as np

# Isaac Sim imports
from omni.isaac.kit import SimulationApp
simulation_app = SimulationApp({"headless": True})

from omni.isaac.core import World
from omni.isaac.core.robots import Robot
from omni.isaac.core.utils.stage import add_reference_to_stage
from omni.isaac.sensor import Camera
from omni.isaac.core.utils.rotations import quat_to_euler_angles
import omni.replicator.core as rep

# =============================================================================
# MESSAGE TYPES
# =============================================================================

class MessageType:
    JOINT_COMMAND = 0x01
    STATE_TELEMETRY = 0x02
    POLICY_ACTION = 0x03
    CAMERA_FRAME = 0x04
    HEARTBEAT = 0x05
    EMERGENCY_STOP = 0x06
    RESUME = 0x07
    ERROR = 0x08
    CALIBRATE = 0x09
    CALIBRATION_RESULT = 0x0A

HEADER_SIZE = 9

# =============================================================================
# ROBOT STATE
# =============================================================================

@dataclass
class RobotState:
    """Complete robot state for telemetry."""
    joint_positions: np.ndarray  # 6 joints for UR5e
    joint_velocities: np.ndarray
    joint_torques: np.ndarray
    joint_temperatures: np.ndarray
    end_effector_position: np.ndarray
    end_effector_orientation: np.ndarray
    contact_forces: Dict[str, np.ndarray]
    battery_level: float
    operating_mode: str
    emergency_stop: bool
    network_latency_ms: float
    timestamp: float

# =============================================================================
# ISAAC SIM ROBOT CONTROLLER
# =============================================================================

class IsaacSimRobotController:
    """Controls robot in Isaac Sim and provides telemetry."""

    def __init__(self, robot_type: str = "ur5e"):
        self.robot_type = robot_type
        self.world: Optional[World] = None
        self.robot: Optional[Robot] = None
        self.camera: Optional[Camera] = None

        # State
        self.emergency_stop = False
        self.battery_level = 100.0
        self.last_command_time = 0.0

        # Joint limits (UR5e)
        self.joint_limits = {
            "lower": np.array([-2*np.pi, -2*np.pi, -2*np.pi, -2*np.pi, -2*np.pi, -2*np.pi]),
            "upper": np.array([2*np.pi, 2*np.pi, 2*np.pi, 2*np.pi, 2*np.pi, 2*np.pi]),
            "max_velocity": np.array([3.15, 3.15, 3.15, 3.2, 3.2, 3.2]),  # rad/s
            "max_torque": np.array([150, 150, 150, 28, 28, 28]),  # N*m
        }

        self.setup_scene()

    def setup_scene(self):
        """Initialize Isaac Sim scene with robot."""
        logging.info(f"Setting up Isaac Sim scene with {self.robot_type} robot")

        # Create world
        self.world = World(stage_units_in_meters=1.0)

        # Load robot
        if self.robot_type == "ur5e":
            robot_usd = "/Isaac/Robots/UniversalRobots/ur5e/ur5e.usd"
            robot_path = "/World/UR5e"
            add_reference_to_stage(usd_path=robot_usd, prim_path=robot_path)

            # Create robot controller
            self.robot = self.world.scene.add(
                Robot(
                    prim_path=robot_path,
                    name="ur5e",
                    position=np.array([0.0, 0.0, 0.0]),
                )
            )

        # Add workbench
        workbench_path = "/World/Workbench"
        add_reference_to_stage(
            usd_path="/Isaac/Props/KLT_Bin/large_KLT.usd",
            prim_path=workbench_path,
        )

        # Add manipulation objects
        self._add_manipulation_objects()

        # Setup camera
        camera_path = "/World/Camera"
        self.camera = Camera(
            prim_path=camera_path,
            position=np.array([0.5, 0.5, 0.5]),
            frequency=30,
            resolution=(640, 480),
        )
        self.camera.initialize()

        # Reset world
        self.world.reset()

        logging.info("Isaac Sim scene setup complete")

    def _add_manipulation_objects(self):
        """Add cubes and objects to manipulate."""
        from omni.isaac.core.objects import DynamicCuboid

        # Red cube
        self.world.scene.add(
            DynamicCuboid(
                prim_path="/World/RedCube",
                name="red_cube",
                position=np.array([-0.2, 0.0, 0.5]),
                scale=np.array([0.05, 0.05, 0.05]),
                color=np.array([0.9, 0.2, 0.2]),
                mass=0.1,
            )
        )

        # Blue cube
        self.world.scene.add(
            DynamicCuboid(
                prim_path="/World/BlueCube",
                name="blue_cube",
                position=np.array([0.1, 0.0, 0.5]),
                scale=np.array([0.05, 0.05, 0.05]),
                color=np.array([0.2, 0.5, 0.9]),
                mass=0.1,
            )
        )

    async def step(self, dt: float):
        """Step simulation forward."""
        if not self.emergency_stop:
            self.world.step(render=True)

            # Simulate battery drain
            self.battery_level = max(0, self.battery_level - 0.0001 * dt)

    def apply_joint_command(self, joint_positions: np.ndarray):
        """Apply joint position command to robot."""
        if self.emergency_stop:
            return

        # Clamp to joint limits
        joint_positions = np.clip(
            joint_positions,
            self.joint_limits["lower"],
            self.joint_limits["upper"],
        )

        # Set joint positions
        self.robot.set_joint_positions(joint_positions)
        self.last_command_time = time.time()

    def get_state(self) -> RobotState:
        """Get current robot state for telemetry."""
        # Get joint states
        joint_positions = self.robot.get_joint_positions()
        joint_velocities = self.robot.get_joint_velocities()

        # Get end-effector pose
        ee_position, ee_orientation = self.robot.end_effector.get_world_pose()

        # Simulate contact forces (would come from force sensors in real robot)
        contact_forces = {
            "leftHand": np.array([0.0, 0.0, 0.0]),
            "rightHand": np.random.randn(3) * 2.0,  # Simulated noise
        }

        # Simulate joint torques and temperatures
        joint_torques = np.random.randn(6) * 5.0
        joint_temperatures = np.ones(6) * 35.0 + np.random.randn(6) * 2.0

        return RobotState(
            joint_positions=joint_positions,
            joint_velocities=joint_velocities,
            joint_torques=joint_torques,
            joint_temperatures=joint_temperatures,
            end_effector_position=ee_position,
            end_effector_orientation=ee_orientation,
            contact_forces=contact_forces,
            battery_level=self.battery_level,
            operating_mode="TELEOPERATION" if not self.emergency_stop else "EMERGENCY_STOP",
            emergency_stop=self.emergency_stop,
            network_latency_ms=0.0,  # Will be computed by client
            timestamp=time.time(),
        )

    def get_camera_frame(self) -> bytes:
        """Get H.264 encoded camera frame."""
        # Get RGB image from camera
        rgb = self.camera.get_rgba()[:, :, :3]

        # Encode to H.264 (simplified - would use actual encoder)
        # For demo, just return JPEG compressed
        import cv2
        _, encoded = cv2.imencode('.jpg', cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        return encoded.tobytes()

    def trigger_emergency_stop(self):
        """Trigger emergency stop."""
        self.emergency_stop = True
        self.robot.set_joint_velocities(np.zeros(6))
        logging.warning("Emergency stop triggered")

    def clear_emergency_stop(self):
        """Clear emergency stop."""
        self.emergency_stop = False
        logging.info("Emergency stop cleared")

# =============================================================================
# WEBSOCKET SERVER
# =============================================================================

class RobotTeleoperationServer:
    """WebSocket server for robot teleoperation."""

    def __init__(self, robot_controller: IsaacSimRobotController, port: int = 9090):
        self.robot_controller = robot_controller
        self.port = port
        self.clients = set()
        self.sequence = 0

        # Timing
        self.telemetry_rate_hz = 60
        self.camera_rate_hz = 30

    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle WebSocket client connection."""
        logging.info(f"Client connected from {websocket.remote_address}")
        self.clients.add(websocket)

        try:
            # Start telemetry and camera streaming tasks
            telemetry_task = asyncio.create_task(self.stream_telemetry(websocket))
            camera_task = asyncio.create_task(self.stream_camera(websocket))

            # Handle incoming messages
            async for message in websocket:
                await self.handle_message(websocket, message)

        except websockets.exceptions.ConnectionClosed:
            logging.info("Client disconnected")
        finally:
            self.clients.remove(websocket)
            telemetry_task.cancel()
            camera_task.cancel()

    async def handle_message(self, websocket: WebSocketServerProtocol, data: bytes):
        """Handle incoming binary message."""
        if len(data) < HEADER_SIZE:
            logging.warning("Received message too short")
            return

        # Decode header
        msg_type, sequence, timestamp = struct.unpack('<BII', data[:HEADER_SIZE])
        payload = data[HEADER_SIZE:]

        if msg_type == MessageType.JOINT_COMMAND:
            await self.handle_joint_command(payload)

        elif msg_type == MessageType.EMERGENCY_STOP:
            self.robot_controller.trigger_emergency_stop()
            await self.send_ack(websocket, MessageType.EMERGENCY_STOP)

        elif msg_type == MessageType.RESUME:
            self.robot_controller.clear_emergency_stop()
            await self.send_ack(websocket, MessageType.RESUME)

        elif msg_type == MessageType.HEARTBEAT:
            await self.send_heartbeat(websocket)

        else:
            logging.warning(f"Unknown message type: {msg_type}")

    async def handle_joint_command(self, payload: bytes):
        """Handle joint position command."""
        if len(payload) != 24:  # 6 joints × 4 bytes
            logging.warning(f"Invalid joint command payload size: {len(payload)}")
            return

        # Decode joint positions
        joint_positions = np.frombuffer(payload, dtype=np.float32)

        # Apply to robot
        self.robot_controller.apply_joint_command(joint_positions)

    async def stream_telemetry(self, websocket: WebSocketServerProtocol):
        """Stream robot state telemetry at configured rate."""
        interval = 1.0 / self.telemetry_rate_hz

        while True:
            try:
                state = self.robot_controller.get_state()
                message = self.encode_telemetry(state)
                await websocket.send(message)
                await asyncio.sleep(interval)
            except Exception as e:
                logging.error(f"Error streaming telemetry: {e}")
                break

    async def stream_camera(self, websocket: WebSocketServerProtocol):
        """Stream camera feed at configured rate."""
        interval = 1.0 / self.camera_rate_hz

        while True:
            try:
                frame = self.robot_controller.get_camera_frame()
                message = self.encode_camera_frame(frame)
                await websocket.send(message)
                await asyncio.sleep(interval)
            except Exception as e:
                logging.error(f"Error streaming camera: {e}")
                break

    def encode_telemetry(self, state: RobotState) -> bytes:
        """Encode robot state as binary telemetry message."""
        self.sequence += 1

        # Header
        header = struct.pack(
            '<BII',
            MessageType.STATE_TELEMETRY,
            self.sequence,
            int(time.time() * 1000) & 0xFFFFFFFF,
        )

        # Payload: all floats (little-endian)
        payload = b''

        # Joint states (6 joints × 4 fields = 24 floats)
        for i in range(6):
            payload += struct.pack('<f', state.joint_positions[i])
            payload += struct.pack('<f', state.joint_velocities[i])
            payload += struct.pack('<f', state.joint_torques[i])
            payload += struct.pack('<f', state.joint_temperatures[i])

        # End-effector pose (3 position + 4 orientation = 7 floats)
        for v in state.end_effector_position:
            payload += struct.pack('<f', v)
        for v in state.end_effector_orientation:
            payload += struct.pack('<f', v)

        # Contact forces (3 + 3 = 6 floats)
        for v in state.contact_forces["leftHand"]:
            payload += struct.pack('<f', v)
        for v in state.contact_forces["rightHand"]:
            payload += struct.pack('<f', v)

        # Battery, mode, e-stop
        payload += struct.pack('<f', state.battery_level)
        payload += struct.pack('<B', 1 if state.emergency_stop else 0)

        return header + payload

    def encode_camera_frame(self, frame: bytes) -> bytes:
        """Encode camera frame as binary message."""
        self.sequence += 1

        header = struct.pack(
            '<BII',
            MessageType.CAMERA_FRAME,
            self.sequence,
            int(time.time() * 1000) & 0xFFFFFFFF,
        )

        # Payload: frame length (4 bytes) + frame data
        payload = struct.pack('<I', len(frame)) + frame

        return header + payload

    async def send_ack(self, websocket: WebSocketServerProtocol, msg_type: int):
        """Send acknowledgment message."""
        self.sequence += 1
        header = struct.pack(
            '<BII',
            msg_type,
            self.sequence,
            int(time.time() * 1000) & 0xFFFFFFFF,
        )
        await websocket.send(header)

    async def send_heartbeat(self, websocket: WebSocketServerProtocol):
        """Send heartbeat response."""
        await self.send_ack(websocket, MessageType.HEARTBEAT)

    async def run(self):
        """Start WebSocket server."""
        logging.info(f"Starting WebSocket server on port {self.port}")

        # Start Isaac Sim simulation loop
        async def simulation_loop():
            while True:
                await self.robot_controller.step(1.0 / 60.0)
                await asyncio.sleep(1.0 / 60.0)

        sim_task = asyncio.create_task(simulation_loop())

        # Start WebSocket server
        async with websockets.serve(self.handle_client, "0.0.0.0", self.port):
            logging.info(f"Server listening on ws://0.0.0.0:{self.port}")
            await asyncio.Future()  # Run forever

# =============================================================================
# MAIN
# =============================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Isaac Sim Robot Teleoperation Server")
    parser.add_argument("--robot", default="ur5e", help="Robot type (default: ur5e)")
    parser.add_argument("--port", type=int, default=9090, help="WebSocket port (default: 9090)")
    parser.add_argument("--camera_resolution", default="640x480", help="Camera resolution")
    parser.add_argument("--camera_fps", type=int, default=30, help="Camera FPS")
    parser.add_argument("--telemetry_hz", type=int, default=60, help="Telemetry rate (Hz)")
    parser.add_argument("--log_level", default="INFO", help="Logging level")

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="[%(asctime)s] %(levelname)s: %(message)s",
    )

    # Create robot controller
    controller = IsaacSimRobotController(robot_type=args.robot)

    # Create WebSocket server
    server = RobotTeleoperationServer(
        robot_controller=controller,
        port=args.port,
    )
    server.telemetry_rate_hz = args.telemetry_hz
    server.camera_rate_hz = args.camera_fps

    # Run server
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    finally:
        simulation_app.close()

if __name__ == "__main__":
    main()
