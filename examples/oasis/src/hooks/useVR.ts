import { useState, useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type VRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';
export type VRControllerHand = 'left' | 'right';

interface VRController {
  hand: VRControllerHand;
  grip: THREE.Group;
  targetRay: THREE.Group;
  gamepad?: Gamepad;
  isSelecting: boolean;
  isSqueezing: boolean;
}

interface VRState {
  isSupported: boolean;
  isPresenting: boolean;
  session: XRSession | null;
  controllers: VRController[];
  headset: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  };
}

/**
 * Hook for WebXR VR session management
 */
export function useVR() {
  const { gl } = useThree();
  const [state, setState] = useState<VRState>({
    isSupported: false,
    isPresenting: false,
    session: null,
    controllers: [],
    headset: {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
    },
  });

  const controllersRef = useRef<VRController[]>([]);

  // Check VR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if ('xr' in navigator) {
        try {
          const supported = await navigator.xr!.isSessionSupported('immersive-vr');
          setState((s) => ({ ...s, isSupported: supported }));
        } catch {
          setState((s) => ({ ...s, isSupported: false }));
        }
      }
    };
    checkSupport();
  }, []);

  // Enter VR
  const enterVR = useCallback(async () => {
    if (!state.isSupported || state.isPresenting) return;

    try {
      const session = await navigator.xr!.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
      });

      // Configure WebGL for XR
      await gl.xr.setSession(session);
      gl.xr.enabled = true;

      // Setup controllers
      const controllers: VRController[] = [];
      for (let i = 0; i < 2; i++) {
        const controller = gl.xr.getController(i);
        const grip = gl.xr.getControllerGrip(i);

        const vrController: VRController = {
          hand: i === 0 ? 'left' : 'right',
          grip: grip as THREE.Group,
          targetRay: controller as THREE.Group,
          isSelecting: false,
          isSqueezing: false,
        };

        // Selection events (trigger)
        controller.addEventListener('selectstart', () => {
          vrController.isSelecting = true;
        });
        controller.addEventListener('selectend', () => {
          vrController.isSelecting = false;
        });

        // Squeeze events (grip)
        controller.addEventListener('squeezestart', () => {
          vrController.isSqueezing = true;
        });
        controller.addEventListener('squeezeend', () => {
          vrController.isSqueezing = false;
        });

        controllers.push(vrController);
      }

      controllersRef.current = controllers;

      // Session end handler
      session.addEventListener('end', () => {
        setState((s) => ({
          ...s,
          isPresenting: false,
          session: null,
          controllers: [],
        }));
        gl.xr.enabled = false;
      });

      setState((s) => ({
        ...s,
        isPresenting: true,
        session,
        controllers,
      }));
    } catch (error) {
      console.error('[VR] Failed to enter VR:', error);
    }
  }, [gl, state.isSupported, state.isPresenting]);

  // Exit VR
  const exitVR = useCallback(async () => {
    if (state.session) {
      await state.session.end();
    }
  }, [state.session]);

  // Get controller by hand
  const getController = useCallback(
    (hand: VRControllerHand): VRController | undefined => {
      return controllersRef.current.find((c) => c.hand === hand);
    },
    []
  );

  // Get pointing direction from controller
  const getPointingDirection = useCallback(
    (hand: VRControllerHand): THREE.Vector3 | null => {
      const controller = getController(hand);
      if (!controller) return null;

      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(controller.targetRay.quaternion);
      return direction;
    },
    [getController]
  );

  // Get world position controller is pointing at
  const getPointedPosition = useCallback(
    (hand: VRControllerHand, distance: number = 5): THREE.Vector3 | null => {
      const controller = getController(hand);
      if (!controller) return null;

      const direction = getPointingDirection(hand);
      if (!direction) return null;

      const position = controller.targetRay.position.clone();
      position.add(direction.multiplyScalar(distance));
      return position;
    },
    [getController, getPointingDirection]
  );

  return {
    ...state,
    enterVR,
    exitVR,
    getController,
    getPointingDirection,
    getPointedPosition,
  };
}

/**
 * Hook for VR controller input state
 */
export function useVRInput() {
  const [leftTrigger, setLeftTrigger] = useState(false);
  const [rightTrigger, setRightTrigger] = useState(false);
  const [leftGrip, setLeftGrip] = useState(false);
  const [rightGrip, setRightGrip] = useState(false);
  const [leftThumbstick, setLeftThumbstick] = useState({ x: 0, y: 0 });
  const [rightThumbstick, setRightThumbstick] = useState({ x: 0, y: 0 });

  // Poll gamepad state
  useEffect(() => {
    let animationFrame: number;

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();

      // XR gamepads are typically at indices 0 and 1
      gamepads.forEach((gamepad, index) => {
        if (!gamepad || !gamepad.id.includes('xr')) return;

        const isLeft = index === 0;
        const trigger = gamepad.buttons[0]?.pressed ?? false;
        const grip = gamepad.buttons[1]?.pressed ?? false;
        const thumbstick = {
          x: gamepad.axes[2] ?? 0,
          y: gamepad.axes[3] ?? 0,
        };

        if (isLeft) {
          setLeftTrigger(trigger);
          setLeftGrip(grip);
          setLeftThumbstick(thumbstick);
        } else {
          setRightTrigger(trigger);
          setRightGrip(grip);
          setRightThumbstick(thumbstick);
        }
      });

      animationFrame = requestAnimationFrame(pollGamepads);
    };

    pollGamepads();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return {
    left: {
      trigger: leftTrigger,
      grip: leftGrip,
      thumbstick: leftThumbstick,
    },
    right: {
      trigger: rightTrigger,
      grip: rightGrip,
      thumbstick: rightThumbstick,
    },
  };
}
