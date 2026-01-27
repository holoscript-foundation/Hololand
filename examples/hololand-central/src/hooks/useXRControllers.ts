// @ts-nocheck
/**
 * XR Controllers Hook
 * 
 * Unified controller API for Quest, Vision Pro, and generic WebXR
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useXR, useController } from '@react-three/xr';
import * as THREE from 'three';

interface XRControllerState {
  connected: boolean;
  hand: 'left' | 'right';
  trigger: boolean;
  grip: boolean;
  thumbstick: { x: number; y: number };
  buttons: {
    a: boolean;
    b: boolean;
    menu: boolean;
  };
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

interface XRControllersResult {
  left: XRControllerState | null;
  right: XRControllerState | null;
  head: { position: THREE.Vector3; rotation: THREE.Quaternion } | null;
  isPresenting: boolean;
  headsetType: 'quest' | 'vision-pro' | 'generic' | 'none';
}

const defaultControllerState: XRControllerState = {
  connected: false,
  hand: 'right',
  trigger: false,
  grip: false,
  thumbstick: { x: 0, y: 0 },
  buttons: { a: false, b: false, menu: false },
  position: new THREE.Vector3(),
  rotation: new THREE.Quaternion(),
};

export function useXRControllers(): XRControllersResult {
  const { isPresenting, session } = useXR();
  const leftController = useController('left');
  const rightController = useController('right');
  
  const [headsetType, setHeadsetType] = useState<'quest' | 'vision-pro' | 'generic' | 'none'>('none');
  const [left, setLeft] = useState<XRControllerState | null>(null);
  const [right, setRight] = useState<XRControllerState | null>(null);
  const [head, setHead] = useState<{ position: THREE.Vector3; rotation: THREE.Quaternion } | null>(null);

  // Detect headset type
  useEffect(() => {
    if (!session) {
      setHeadsetType('none');
      return;
    }

    // Check for Quest
    const checkHeadset = async () => {
      try {
        const inputSources = session.inputSources;
        for (const source of inputSources) {
          const profile = source.profiles?.[0] || '';
          
          if (profile.includes('oculus') || profile.includes('meta')) {
            setHeadsetType('quest');
            return;
          }
          if (profile.includes('vision') || profile.includes('apple')) {
            setHeadsetType('vision-pro');
            return;
          }
        }
        setHeadsetType('generic');
      } catch {
        setHeadsetType('generic');
      }
    };

    checkHeadset();
  }, [session]);

  // Update controller states
  useEffect(() => {
    if (!isPresenting) {
      setLeft(null);
      setRight(null);
      setHead(null);
      return;
    }

    const updateStates = () => {
      if (leftController?.inputSource?.gamepad) {
        setLeft(parseGamepad(leftController, 'left', headsetType));
      }
      if (rightController?.inputSource?.gamepad) {
        setRight(parseGamepad(rightController, 'right', headsetType));
      }
      
      // Get head pose from camera group (XR reference space)
      // In @react-three/xr, the camera position/rotation represents head
      // This is a simplified approach - full impl would use XRFrame.getViewerPose
      setHead({
        position: new THREE.Vector3(0, 1.6, 0), // Placeholder - real impl gets from viewer pose
        rotation: new THREE.Quaternion(),
      });
    };

    const interval = setInterval(updateStates, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPresenting, leftController, rightController, headsetType]);

  return { left, right, head, isPresenting, headsetType };
}

function parseGamepad(
  controller: ReturnType<typeof useController>,
  hand: 'left' | 'right',
  headsetType: string
): XRControllerState {
  const gamepad = controller?.inputSource?.gamepad;
  if (!gamepad) return { ...defaultControllerState, hand };

  const buttons = gamepad.buttons;
  const axes = gamepad.axes;

  // Button mapping varies by headset
  let triggerIndex = 0;
  let gripIndex = 1;
  let thumbstickXIndex = 2;
  let thumbstickYIndex = 3;
  let aButtonIndex = 4;
  let bButtonIndex = 5;
  let menuButtonIndex = 6;

  // Vision Pro uses different mapping (hand tracking primarily)
  if (headsetType === 'vision-pro') {
    // Vision Pro: pinch = trigger, fist = grip
    triggerIndex = 0;
    gripIndex = 1;
  }

  return {
    connected: true,
    hand,
    trigger: buttons[triggerIndex]?.pressed || false,
    grip: buttons[gripIndex]?.pressed || false,
    thumbstick: {
      x: axes[thumbstickXIndex] || 0,
      y: axes[thumbstickYIndex] || 0,
    },
    buttons: {
      a: buttons[aButtonIndex]?.pressed || false,
      b: buttons[bButtonIndex]?.pressed || false,
      menu: buttons[menuButtonIndex]?.pressed || false,
    },
    position: controller?.controller?.position?.clone() || new THREE.Vector3(),
    rotation: controller?.controller?.quaternion?.clone() || new THREE.Quaternion(),
  };
}

/**
 * XR Locomotion Hook
 * 
 * Provides movement based on controller input
 */
export function useXRLocomotion(
  speed: number = 2,
  turnSpeed: number = 1.5
) {
  const { left, right, isPresenting } = useXRControllers();
  const playerRef = useRef(new THREE.Group());

  const update = useCallback((delta: number) => {
    if (!isPresenting) return;

    // Left thumbstick: move
    if (left?.thumbstick) {
      const forward = new THREE.Vector3(0, 0, -left.thumbstick.y * speed * delta);
      const strafe = new THREE.Vector3(left.thumbstick.x * speed * delta, 0, 0);
      
      forward.applyQuaternion(playerRef.current.quaternion);
      strafe.applyQuaternion(playerRef.current.quaternion);
      
      playerRef.current.position.add(forward);
      playerRef.current.position.add(strafe);
    }

    // Right thumbstick: turn
    if (right?.thumbstick) {
      playerRef.current.rotation.y -= right.thumbstick.x * turnSpeed * delta;
    }
  }, [isPresenting, left, right, speed, turnSpeed]);

  return { playerRef: playerRef.current, update };
}

export default useXRControllers;
