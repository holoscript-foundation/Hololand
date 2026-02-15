import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRInput } from './useVR';

interface GodModeConfig {
  flySpeed: number;
  turnSpeed: number;
  verticalSpeed: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: GodModeConfig = {
  flySpeed: 10,
  turnSpeed: 2,
  verticalSpeed: 5,
  enabled: true,
};

/**
 * Hook for god mode movement in VR
 * - Left thumbstick: Move forward/back, strafe left/right
 * - Right thumbstick: Turn left/right, move up/down
 * - Both grips: Speed boost
 */
export function useGodMode(config: Partial<GodModeConfig> = {}) {
  const { flySpeed, turnSpeed, verticalSpeed, enabled } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const { camera } = useThree();
  const vrInput = useVRInput();
  const velocityRef = useRef(new THREE.Vector3());
  const positionRef = useRef(new THREE.Vector3(0, 2, 0));

  // Initialize position
  useEffect(() => {
    positionRef.current.copy(camera.position);
  }, [camera]);

  // Update movement each frame
  useFrame((_, delta) => {
    if (!enabled) return;

    const velocity = velocityRef.current;
    const position = positionRef.current;

    // Speed boost when both grips held
    const speedMultiplier = vrInput.left.grip && vrInput.right.grip ? 3 : 1;

    // Left thumbstick: forward/back/strafe
    const moveX = vrInput.left.thumbstick.x * flySpeed * speedMultiplier * delta;
    const moveZ = -vrInput.left.thumbstick.y * flySpeed * speedMultiplier * delta;

    // Right thumbstick: turn and vertical
    const turnY = -vrInput.right.thumbstick.x * turnSpeed * delta;
    const moveY = vrInput.right.thumbstick.y * verticalSpeed * speedMultiplier * delta;

    // Get camera forward and right vectors (ignoring pitch)
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    // Apply camera rotation to movement vectors
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    // Calculate movement
    velocity.set(0, 0, 0);
    velocity.add(forward.multiplyScalar(moveZ));
    velocity.add(right.multiplyScalar(moveX));
    velocity.y = moveY;

    // Apply movement
    position.add(velocity);

    // Clamp height (don't go below ground)
    position.y = Math.max(0.5, position.y);

    // Apply rotation
    camera.rotation.y += turnY;

    // Update camera position
    camera.position.copy(position);
  });

  // Teleport to position
  const teleportTo = useCallback(
    (target: THREE.Vector3) => {
      positionRef.current.copy(target);
      positionRef.current.y = Math.max(0.5, target.y);
      camera.position.copy(positionRef.current);
    },
    [camera]
  );

  // Reset to spawn
  const resetPosition = useCallback(() => {
    positionRef.current.set(0, 2, 10);
    camera.position.copy(positionRef.current);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  // Get current position
  const getPosition = useCallback(() => {
    return positionRef.current.clone();
  }, []);

  return {
    teleportTo,
    resetPosition,
    getPosition,
    position: positionRef.current,
  };
}

/**
 * Hook for desktop god mode (keyboard + mouse)
 */
export function useDesktopGodMode(config: Partial<GodModeConfig> = {}) {
  const { flySpeed, turnSpeed, verticalSpeed, enabled } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const { camera, gl } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const positionRef = useRef(new THREE.Vector3(0, 2, 10));
  const isLockedRef = useRef(false);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer lock for mouse look
  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = () => {
      if (!isLockedRef.current) {
        canvas.requestPointerLock();
      }
    };

    const handleLockChange = () => {
      isLockedRef.current = document.pointerLockElement === canvas;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLockedRef.current) return;

      camera.rotation.y -= e.movementX * 0.002;
      camera.rotation.x -= e.movementY * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    canvas.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, gl]);

  // Movement update
  useFrame((_, delta) => {
    if (!enabled) return;

    const keys = keysRef.current;
    const position = positionRef.current;
    const speed = keys.has('ShiftLeft') ? flySpeed * 3 : flySpeed;

    // Get movement direction
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    // WASD movement
    if (keys.has('KeyW')) position.add(forward.clone().multiplyScalar(speed * delta));
    if (keys.has('KeyS')) position.add(forward.clone().multiplyScalar(-speed * delta));
    if (keys.has('KeyA')) position.add(right.clone().multiplyScalar(-speed * delta));
    if (keys.has('KeyD')) position.add(right.clone().multiplyScalar(speed * delta));

    // Vertical movement
    if (keys.has('Space')) position.y += verticalSpeed * delta;
    if (keys.has('ControlLeft')) position.y -= verticalSpeed * delta;

    // Clamp height
    position.y = Math.max(0.5, position.y);

    camera.position.copy(position);
  });

  const teleportTo = useCallback(
    (target: THREE.Vector3) => {
      positionRef.current.copy(target);
      positionRef.current.y = Math.max(0.5, target.y);
      camera.position.copy(positionRef.current);
    },
    [camera]
  );

  return {
    teleportTo,
    position: positionRef.current,
    isLocked: isLockedRef.current,
  };
}
