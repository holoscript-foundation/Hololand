/**
 * Touch Input Hook
 * 
 * Provides unified touch input handling for 3D camera control
 */

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface TouchInputOptions {
  rotationSpeed?: number;
  zoomSpeed?: number;
  panSpeed?: number;
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
}

interface TouchState {
  active: boolean;
  pointers: Map<number, { x: number; y: number }>;
  lastDistance?: number;
  lastCenter?: { x: number; y: number };
}

export function useTouchInput(
  camera: THREE.Camera | null,
  domElement: HTMLElement | null,
  options: TouchInputOptions = {}
) {
  const {
    rotationSpeed = 0.005,
    zoomSpeed = 0.01,
    panSpeed = 0.01,
    enableRotate = true,
    enableZoom = true,
    enablePan = true,
  } = options;

  const stateRef = useRef<TouchState>({
    active: false,
    pointers: new Map(),
  });

  const spherical = useRef(new THREE.Spherical());
  const target = useRef(new THREE.Vector3(0, 0, 0));

  // Calculate pinch distance
  const getDistance = useCallback((pointers: Map<number, { x: number; y: number }>) => {
    if (pointers.size < 2) return 0;
    
    const points = Array.from(pointers.values());
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point
  const getCenter = useCallback((pointers: Map<number, { x: number; y: number }>) => {
    const points = Array.from(pointers.values());
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }, []);

  useEffect(() => {
    if (!domElement || !camera) return;

    const state = stateRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        state.pointers.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }

      if (state.pointers.size >= 2) {
        state.lastDistance = getDistance(state.pointers);
        state.lastCenter = getCenter(state.pointers);
      }

      state.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (!state.active) return;

      // Update pointer positions
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const prevPos = state.pointers.get(touch.identifier);
        
        if (prevPos) {
          const dx = touch.clientX - prevPos.x;
          const dy = touch.clientY - prevPos.y;

          // Single finger: rotate
          if (state.pointers.size === 1 && enableRotate) {
            spherical.current.theta -= dx * rotationSpeed;
            spherical.current.phi -= dy * rotationSpeed;
            spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));
            
            updateCameraPosition();
          }

          state.pointers.set(touch.identifier, {
            x: touch.clientX,
            y: touch.clientY,
          });
        }
      }

      // Two fingers: zoom and pan
      if (state.pointers.size >= 2) {
        const currentDistance = getDistance(state.pointers);
        const currentCenter = getCenter(state.pointers);

        // Pinch zoom
        if (enableZoom && state.lastDistance) {
          const delta = currentDistance - state.lastDistance;
          spherical.current.radius -= delta * zoomSpeed;
          spherical.current.radius = Math.max(2, Math.min(50, spherical.current.radius));
          updateCameraPosition();
        }

        // Two-finger pan
        if (enablePan && state.lastCenter) {
          const dx = currentCenter.x - state.lastCenter.x;
          const dy = currentCenter.y - state.lastCenter.y;
          
          const offset = new THREE.Vector3();
          offset.setFromSpherical(spherical.current);
          offset.normalize();
          
          const up = new THREE.Vector3(0, 1, 0);
          const right = new THREE.Vector3().crossVectors(up, offset).normalize();
          
          target.current.addScaledVector(right, -dx * panSpeed);
          target.current.y += dy * panSpeed;
          
          updateCameraPosition();
        }

        state.lastDistance = currentDistance;
        state.lastCenter = currentCenter;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        state.pointers.delete(e.changedTouches[i].identifier);
      }

      if (state.pointers.size < 2) {
        state.lastDistance = undefined;
        state.lastCenter = undefined;
      }

      if (state.pointers.size === 0) {
        state.active = false;
      }
    };

    const updateCameraPosition = () => {
      if (!camera) return;
      
      const offset = new THREE.Vector3();
      offset.setFromSpherical(spherical.current);
      
      camera.position.copy(target.current).add(offset);
      camera.lookAt(target.current);
    };

    // Initialize spherical from camera position
    if (camera) {
      const offset = new THREE.Vector3().subVectors(camera.position, target.current);
      spherical.current.setFromVector3(offset);
    }

    domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd);
    domElement.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [camera, domElement, rotationSpeed, zoomSpeed, panSpeed, enableRotate, enableZoom, enablePan, getDistance, getCenter]);

  // Return movement setter for joystick integration
  const setMovement = useCallback((x: number, y: number) => {
    if (!camera) return;
    
    // Convert joystick input to camera-relative movement
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    const moveSpeed = 0.1;
    target.current.addScaledVector(forward, -y * moveSpeed);
    target.current.addScaledVector(right, x * moveSpeed);
    
    // Update camera
    const offset = new THREE.Vector3();
    offset.setFromSpherical(spherical.current);
    camera.position.copy(target.current).add(offset);
    camera.lookAt(target.current);
  }, [camera]);

  return { setMovement };
}

export default useTouchInput;
