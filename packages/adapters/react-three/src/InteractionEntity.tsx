import React, { useCallback, useEffect, useState } from 'react';
import { useInteraction, RayGrab } from '@react-three/xr';

export interface InteractionEntityProps {
  children: React.ReactNode;
  gesture?: any;
  haptic?: any;
  grabbable?: boolean;
  hoverable?: boolean;
  onAction?: (action: string) => void;
}

// Lightweight gesture registry until HandTrackingService is built
type GestureCallback = (hand: string) => void;
const gestureListeners = new Map<string, Set<GestureCallback>>();

function onGesture(name: string, cb: GestureCallback): () => void {
  if (!gestureListeners.has(name)) gestureListeners.set(name, new Set());
  gestureListeners.get(name)!.add(cb);
  return () => {
    gestureListeners.get(name)?.delete(cb);
  };
}

/**
 * InteractionEntity
 *
 * Bridges HoloScript @grabbable, @hoverable, and @on_gesture traits
 * to XR interaction handlers with haptic feedback.
 */
export const InteractionEntity: React.FC<InteractionEntityProps> = ({
  children,
  gesture,
  haptic,
  grabbable,
  hoverable,
  onAction,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Listen for specific hand gestures if defined in trait
  useEffect(() => {
    if (!gesture || !onAction) return;

    const cleanups: (() => void)[] = [];
    const gestureEntries = Object.entries(gesture);
    for (const [key, action] of gestureEntries) {
      if (key.startsWith('on_gesture_')) {
        const gestureName = key.replace('on_gesture_', '');
        const cleanup = onGesture(gestureName, (hand: string) => {
          if (isHovered) {
            console.log(`InteractionEntity: Detected ${gestureName} on ${hand} hand`);
            onAction(action as string);
          }
        });
        cleanups.push(cleanup);
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [gesture, onAction, isHovered]);

  // Handle XR selection event
  const handleSelect = useCallback(
    (event: any) => {
      if (haptic && event.inputSource.gamepad?.hapticActuators) {
        const actuator = event.inputSource.gamepad.hapticActuators[0];
        if (actuator) {
          actuator.pulse(haptic.intensity || 0.5, haptic.duration || 100);
        }
      }

      if (gesture && gesture.on_grab) {
        console.log('InteractionEntity: Executing on_grab', gesture.on_grab);
        if (onAction) onAction(gesture.on_grab);
      }
    },
    [haptic, gesture, onAction]
  );

  useInteraction(null as any, 'onSelect', handleSelect);

  const content = (
    <group
      onPointerOver={() => hoverable && setIsHovered(true)}
      onPointerOut={() => hoverable && setIsHovered(false)}
    >
      {children}
      {isHovered && hoverable && (
        <mesh scale={[1.1, 1.1, 1.1]}>
          <boxGeometry />
          <meshStandardMaterial color="white" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );

  if (grabbable) {
    return <RayGrab>{content}</RayGrab>;
  }

  return content;
};
