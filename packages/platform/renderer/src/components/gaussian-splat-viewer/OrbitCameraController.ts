/**
 * OrbitCameraController
 *
 * Mouse/touch orbit camera for the Gaussian splatting viewer.
 * Supports orbit rotation, zoom, and pan with inertia/damping.
 *
 * Controls:
 *   - Left mouse drag:   Orbit rotation (theta/phi)
 *   - Scroll wheel:      Zoom (distance from target)
 *   - Middle mouse drag: Pan (translate target)
 *   - Touch 1-finger:    Orbit rotation
 *   - Touch pinch:       Zoom
 *   - Touch 2-finger:    Pan
 *
 * @module gaussian-splat-viewer/OrbitCameraController
 */

import type { CameraState, CameraControllerConfig } from './types';
import { DEFAULT_CAMERA_CONTROLLER_CONFIG } from './types';

export class OrbitCameraController {
  private config: CameraControllerConfig;

  // Spherical coordinates (relative to target)
  private theta: number = 0;       // Azimuthal angle (horizontal)
  private phi: number = Math.PI / 4; // Polar angle (vertical)
  private distance: number = 3;     // Distance from target

  // Target position
  private target: [number, number, number] = [0, 0, 0];

  // Inertia state
  private velocityTheta: number = 0;
  private velocityPhi: number = 0;
  private velocityDistance: number = 0;
  private velocityPanX: number = 0;
  private velocityPanY: number = 0;

  // Input tracking
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private canvas: HTMLCanvasElement | null = null;

  // Bound event handlers (for cleanup)
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnContextMenu: (e: Event) => void;

  constructor(config?: Partial<CameraControllerConfig>) {
    this.config = { ...DEFAULT_CAMERA_CONTROLLER_CONFIG, ...config };

    // Bind handlers
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnContextMenu = (e: Event) => e.preventDefault();
  }

  /**
   * Attach event listeners to a canvas element.
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('mousedown', this.boundOnMouseDown);
    canvas.addEventListener('mousemove', this.boundOnMouseMove);
    canvas.addEventListener('mouseup', this.boundOnMouseUp);
    canvas.addEventListener('mouseleave', this.boundOnMouseUp);
    canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.boundOnContextMenu);
  }

  /**
   * Detach event listeners.
   */
  detach(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundOnMouseDown);
      this.canvas.removeEventListener('mousemove', this.boundOnMouseMove);
      this.canvas.removeEventListener('mouseup', this.boundOnMouseUp);
      this.canvas.removeEventListener('mouseleave', this.boundOnMouseUp);
      this.canvas.removeEventListener('wheel', this.boundOnWheel);
      this.canvas.removeEventListener('contextmenu', this.boundOnContextMenu);
      this.canvas = null;
    }
  }

  /**
   * Initialize orbit from a camera state.
   */
  setFromCamera(camera: CameraState): void {
    this.target = [...camera.target];

    const dx = camera.position[0] - camera.target[0];
    const dy = camera.position[1] - camera.target[1];
    const dz = camera.position[2] - camera.target[2];

    this.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.theta = Math.atan2(dx, dz);
    this.phi = Math.acos(Math.max(-1, Math.min(1, dy / this.distance)));

    // Clamp
    this.distance = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, this.distance));
  }

  /**
   * Update camera state from the current orbit parameters.
   * Call this once per frame.
   */
  update(camera: CameraState): CameraState {
    // Apply damping
    if (this.config.enableDamping && !this.isDragging && !this.isPanning) {
      this.velocityTheta *= this.config.dampingFactor;
      this.velocityPhi *= this.config.dampingFactor;
      this.velocityDistance *= this.config.dampingFactor;
      this.velocityPanX *= this.config.dampingFactor;
      this.velocityPanY *= this.config.dampingFactor;

      this.theta += this.velocityTheta;
      this.phi += this.velocityPhi;
      this.distance += this.velocityDistance;

      // Apply pan velocity in camera-local space
      if (Math.abs(this.velocityPanX) > 0.0001 || Math.abs(this.velocityPanY) > 0.0001) {
        this.applyPan(this.velocityPanX, this.velocityPanY);
      }
    }

    // Clamp phi to avoid gimbal lock
    this.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.phi));

    // Clamp distance
    this.distance = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, this.distance));

    // Compute position from spherical coordinates
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const position: [number, number, number] = [
      this.target[0] + this.distance * sinPhi * sinTheta,
      this.target[1] + this.distance * cosPhi,
      this.target[2] + this.distance * sinPhi * cosTheta,
    ];

    return {
      ...camera,
      position,
      target: [...this.target],
    };
  }

  /**
   * Reset camera to fit a bounding box.
   */
  fitToBounds(
    boundsMin: [number, number, number],
    boundsMax: [number, number, number],
  ): void {
    this.target = [
      (boundsMin[0] + boundsMax[0]) / 2,
      (boundsMin[1] + boundsMax[1]) / 2,
      (boundsMin[2] + boundsMax[2]) / 2,
    ];

    const dx = boundsMax[0] - boundsMin[0];
    const dy = boundsMax[1] - boundsMin[1];
    const dz = boundsMax[2] - boundsMin[2];
    const diag = Math.sqrt(dx * dx + dy * dy + dz * dz);

    this.distance = Math.max(diag * 1.5, this.config.minDistance);
    this.theta = Math.PI / 4;
    this.phi = Math.PI / 3;

    // Clear velocities
    this.velocityTheta = 0;
    this.velocityPhi = 0;
    this.velocityDistance = 0;
    this.velocityPanX = 0;
    this.velocityPanY = 0;
  }

  /**
   * Set orbit position and target directly.
   */
  setPosition(position: [number, number, number], target: [number, number, number]): void {
    this.target = [...target];

    const dx = position[0] - target[0];
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];

    this.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.theta = Math.atan2(dx, dz);
    this.phi = Math.acos(Math.max(-1, Math.min(1, dy / this.distance)));
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 && this.config.enableRotation) {
      // Left click: orbit
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 1 && this.config.enablePan) {
      // Middle click: pan
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      e.preventDefault();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (this.isDragging) {
      const speedScale = this.config.rotationSpeed * 0.005;
      this.velocityTheta = -deltaX * speedScale;
      this.velocityPhi = deltaY * speedScale;
      this.theta += this.velocityTheta;
      this.phi += this.velocityPhi;
    }

    if (this.isPanning) {
      const panScale = this.config.panSpeed * this.distance * 0.002;
      this.velocityPanX = -deltaX * panScale;
      this.velocityPanY = deltaY * panScale;
      this.applyPan(this.velocityPanX, this.velocityPanY);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    if (!this.config.enableZoom) return;
    e.preventDefault();

    const zoomDelta = e.deltaY * 0.001 * this.config.zoomSpeed * this.distance;
    this.velocityDistance = zoomDelta;
    this.distance += zoomDelta;
  }

  private applyPan(dx: number, dy: number): void {
    // Pan in camera-local X and Y directions
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    // Camera right vector
    const rightX = cosTheta;
    const rightZ = -sinTheta;

    // Camera up vector (approximate, in world Y)
    const upX = -cosPhi * sinTheta;
    const upY = sinPhi;
    const upZ = -cosPhi * cosTheta;

    this.target[0] += rightX * dx + upX * dy;
    this.target[1] += upY * dy;
    this.target[2] += rightZ * dx + upZ * dy;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  setConfig(config: Partial<CameraControllerConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): Readonly<CameraControllerConfig> {
    return this.config;
  }

  /**
   * Dispose the controller (detach events).
   */
  dispose(): void {
    this.detach();
  }
}

export function createOrbitCameraController(
  config?: Partial<CameraControllerConfig>,
): OrbitCameraController {
  return new OrbitCameraController(config);
}
