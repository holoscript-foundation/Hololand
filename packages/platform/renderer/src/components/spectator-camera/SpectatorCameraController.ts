/**
 * SpectatorCameraController
 *
 * Multi-mode camera controller for the non-XR spectator camera system.
 * Supports three camera modes:
 *
 * 1. ORBIT MODE:
 *    Standard orbit camera around a target point.
 *    - Left-drag:   Rotate (azimuth/elevation)
 *    - Scroll:      Zoom (distance from target)
 *    - Middle-drag: Pan (translate target)
 *    - Optional auto-rotate at configurable speed
 *
 * 2. FLY MODE:
 *    Free-flight FPS-style camera navigation.
 *    - WASD:  Move forward/backward/strafe
 *    - Q/E:   Move down/up
 *    - Mouse:  Look direction (pitch/yaw)
 *    - Shift: Sprint speed boost
 *    - Pointer lock for immersive control
 *
 * 3. CINEMATIC MODE:
 *    Automated camera path following waypoints with spline interpolation.
 *    - Catmull-Rom spline for smooth position/target curves
 *    - Per-waypoint easing functions
 *    - Configurable playback speed, looping, and tension
 *
 * PERFORMANCE:
 * This controller is designed to run at 30-60Hz for spectator preview,
 * fully decoupled from the 90Hz VR render loop. All updates are
 * non-blocking and use requestAnimationFrame scheduling.
 *
 * @module spectator-camera/SpectatorCameraController
 */

import type {
  SpectatorCameraState,
  SpectatorCameraMode,
  SpectatorOrbitConfig,
  SpectatorFlyConfig,
  SpectatorCinematicConfig,
  CinematicWaypoint,
  CinematicPlaybackState,
} from './types';

import {
  DEFAULT_SPECTATOR_CAMERA_STATE,
  DEFAULT_ORBIT_CONFIG,
  DEFAULT_FLY_CONFIG,
  DEFAULT_CINEMATIC_CONFIG,
  DEFAULT_PLAYBACK_STATE,
  EASING_FUNCTIONS,
} from './types';

// =============================================================================
// UTILITY: VECTOR MATH
// =============================================================================

type Vec3 = [number, number, number];

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Catmull-Rom spline interpolation between four control points.
 * @param p0 Control point before segment start
 * @param p1 Segment start
 * @param p2 Segment end
 * @param p3 Control point after segment end
 * @param t  Interpolation parameter 0-1
 * @param tension Tension parameter (0.5 = standard Catmull-Rom)
 */
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number, tension: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const alpha = tension;

  const result: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const m0 = alpha * (p2[i] - p0[i]);
    const m1 = alpha * (p3[i] - p1[i]);
    result[i] =
      (2 * t3 - 3 * t2 + 1) * p1[i] +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * p2[i] +
      (t3 - t2) * m1;
  }
  return result;
}

// =============================================================================
// CONTROLLER CLASS
// =============================================================================

export class SpectatorCameraController {
  // Configuration
  private orbitConfig: SpectatorOrbitConfig;
  private flyConfig: SpectatorFlyConfig;
  private cinematicConfig: SpectatorCinematicConfig;

  // Camera state
  private camera: SpectatorCameraState;

  // Orbit state
  private orbitTheta: number = Math.PI / 4;
  private orbitPhi: number = Math.PI / 3;
  private orbitDistance: number = 8;
  private orbitTarget: Vec3 = [0, 0, 0];
  private orbitVelocityTheta: number = 0;
  private orbitVelocityPhi: number = 0;
  private orbitVelocityDistance: number = 0;
  private orbitVelocityPanX: number = 0;
  private orbitVelocityPanY: number = 0;

  // Fly state
  private flyYaw: number = 0;
  private flyPitch: number = 0;
  private flyVelocity: Vec3 = [0, 0, 0];
  private keysPressed: Set<string> = new Set();
  private isPointerLocked: boolean = false;

  // Cinematic state
  private playback: CinematicPlaybackState = { ...DEFAULT_PLAYBACK_STATE };
  private cinematicStartTime: number = 0;
  private cinematicPauseTime: number = 0;

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
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnContextMenu: (e: Event) => void;
  private boundOnPointerLockChange: () => void;

  // State change callback
  private onStateChange?: (state: SpectatorCameraState) => void;

  constructor(
    options?: {
      initialCamera?: Partial<SpectatorCameraState>;
      orbitConfig?: Partial<SpectatorOrbitConfig>;
      flyConfig?: Partial<SpectatorFlyConfig>;
      cinematicConfig?: Partial<SpectatorCinematicConfig>;
      onStateChange?: (state: SpectatorCameraState) => void;
    },
  ) {
    this.camera = { ...DEFAULT_SPECTATOR_CAMERA_STATE, ...options?.initialCamera };
    this.orbitConfig = { ...DEFAULT_ORBIT_CONFIG, ...options?.orbitConfig };
    this.flyConfig = { ...DEFAULT_FLY_CONFIG, ...options?.flyConfig };
    this.cinematicConfig = { ...DEFAULT_CINEMATIC_CONFIG, ...options?.cinematicConfig };
    this.onStateChange = options?.onStateChange;

    // Initialize orbit parameters from initial camera state
    this.syncOrbitFromCamera();
    this.syncFlyFromCamera();

    // Bind event handlers
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnContextMenu = (e: Event) => e.preventDefault();
    this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

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

    // Keyboard on document level for fly mode
    document.addEventListener('keydown', this.boundOnKeyDown);
    document.addEventListener('keyup', this.boundOnKeyUp);
    document.addEventListener('pointerlockchange', this.boundOnPointerLockChange);
  }

  /**
   * Detach all event listeners.
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
    document.removeEventListener('keydown', this.boundOnKeyDown);
    document.removeEventListener('keyup', this.boundOnKeyUp);
    document.removeEventListener('pointerlockchange', this.boundOnPointerLockChange);
    this.keysPressed.clear();
  }

  /**
   * Get the current camera state.
   */
  getCamera(): Readonly<SpectatorCameraState> {
    return this.camera;
  }

  /**
   * Get the current cinematic playback state.
   */
  getPlaybackState(): Readonly<CinematicPlaybackState> {
    return this.playback;
  }

  /**
   * Set the camera mode.
   */
  setMode(mode: SpectatorCameraMode): void {
    if (this.camera.mode === mode) return;

    // Exit old mode
    if (this.camera.mode === 'fly' && this.isPointerLocked) {
      document.exitPointerLock();
    }
    if (this.camera.mode === 'cinematic') {
      this.stopCinematic();
    }

    this.camera = { ...this.camera, mode };

    // Enter new mode
    if (mode === 'orbit') {
      this.syncOrbitFromCamera();
    } else if (mode === 'fly') {
      this.syncFlyFromCamera();
    } else if (mode === 'cinematic') {
      this.playback = {
        ...DEFAULT_PLAYBACK_STATE,
        totalWaypoints: this.cinematicConfig.waypoints.length,
        totalDuration: this.getTotalCinematicDuration(),
      };
    }

    this.emitStateChange();
  }

  /**
   * Set camera position and target directly.
   */
  setCamera(position: Vec3, target: Vec3): void {
    this.camera = { ...this.camera, position: [...position], target: [...target] };
    this.syncOrbitFromCamera();
    this.syncFlyFromCamera();
    this.emitStateChange();
  }

  /**
   * Set field of view.
   */
  setFovY(fovY: number): void {
    this.camera = { ...this.camera, fovY: Math.max(10, Math.min(120, fovY)) };
    this.emitStateChange();
  }

  /**
   * Set aspect ratio.
   */
  setAspect(aspect: number): void {
    this.camera = { ...this.camera, aspect };
  }

  /**
   * Reset camera to default position.
   */
  reset(): void {
    this.camera = { ...DEFAULT_SPECTATOR_CAMERA_STATE, mode: this.camera.mode };
    this.syncOrbitFromCamera();
    this.syncFlyFromCamera();
    this.orbitVelocityTheta = 0;
    this.orbitVelocityPhi = 0;
    this.orbitVelocityDistance = 0;
    this.orbitVelocityPanX = 0;
    this.orbitVelocityPanY = 0;
    this.flyVelocity = [0, 0, 0];
    this.emitStateChange();
  }

  /**
   * Update the camera state. Call once per frame.
   * @param deltaMs Time elapsed since last update in milliseconds
   * @returns Updated camera state
   */
  update(deltaMs: number): SpectatorCameraState {
    const deltaSec = deltaMs / 1000;

    switch (this.camera.mode) {
      case 'orbit':
        this.updateOrbit(deltaSec);
        break;
      case 'fly':
        this.updateFly(deltaSec);
        break;
      case 'cinematic':
        this.updateCinematic(deltaSec);
        break;
    }

    return this.camera;
  }

  /**
   * Set orbit auto-rotate speed.
   */
  setAutoRotateSpeed(speed: number): void {
    this.orbitConfig.autoRotateSpeed = speed;
  }

  /**
   * Fit the orbit camera to a bounding box.
   */
  fitToBounds(min: Vec3, max: Vec3): void {
    this.orbitTarget = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];

    const dx = max[0] - min[0];
    const dy = max[1] - min[1];
    const dz = max[2] - min[2];
    const diag = Math.sqrt(dx * dx + dy * dy + dz * dz);

    this.orbitDistance = Math.max(diag * 1.5, this.orbitConfig.minDistance);
    this.orbitTheta = Math.PI / 4;
    this.orbitPhi = Math.PI / 3;

    this.orbitVelocityTheta = 0;
    this.orbitVelocityPhi = 0;
    this.orbitVelocityDistance = 0;
    this.orbitVelocityPanX = 0;
    this.orbitVelocityPanY = 0;

    this.updateOrbitCamera();
    this.emitStateChange();
  }

  // ===========================================================================
  // CINEMATIC CONTROLS
  // ===========================================================================

  /**
   * Start or resume cinematic playback.
   */
  playCinematic(): void {
    if (this.camera.mode !== 'cinematic') {
      this.setMode('cinematic');
    }

    if (this.playback.isPaused) {
      // Resume from pause
      const pauseDuration = performance.now() - this.cinematicPauseTime;
      this.cinematicStartTime += pauseDuration;
      this.playback = { ...this.playback, isPlaying: true, isPaused: false };
    } else {
      // Start fresh
      this.cinematicStartTime = performance.now();
      this.playback = {
        ...this.playback,
        isPlaying: true,
        isPaused: false,
        progress: 0,
        currentWaypoint: 0,
        elapsedTime: 0,
        loopCount: 0,
        totalWaypoints: this.cinematicConfig.waypoints.length,
        totalDuration: this.getTotalCinematicDuration(),
      };
    }
  }

  /**
   * Pause cinematic playback.
   */
  pauseCinematic(): void {
    if (!this.playback.isPlaying) return;
    this.cinematicPauseTime = performance.now();
    this.playback = { ...this.playback, isPlaying: false, isPaused: true };
  }

  /**
   * Stop cinematic playback and reset to start.
   */
  stopCinematic(): void {
    this.playback = {
      ...DEFAULT_PLAYBACK_STATE,
      totalWaypoints: this.cinematicConfig.waypoints.length,
      totalDuration: this.getTotalCinematicDuration(),
    };
  }

  /**
   * Set cinematic playback speed.
   */
  setPlaybackSpeed(speed: number): void {
    this.cinematicConfig.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Add a waypoint to the cinematic path.
   */
  addWaypoint(waypoint: CinematicWaypoint): void {
    this.cinematicConfig.waypoints.push(waypoint);
    this.playback = {
      ...this.playback,
      totalWaypoints: this.cinematicConfig.waypoints.length,
      totalDuration: this.getTotalCinematicDuration(),
    };
  }

  /**
   * Remove a waypoint by index.
   */
  removeWaypoint(index: number): void {
    if (index >= 0 && index < this.cinematicConfig.waypoints.length) {
      this.cinematicConfig.waypoints.splice(index, 1);
      this.playback = {
        ...this.playback,
        totalWaypoints: this.cinematicConfig.waypoints.length,
        totalDuration: this.getTotalCinematicDuration(),
      };
    }
  }

  /**
   * Get cinematic waypoints.
   */
  getWaypoints(): ReadonlyArray<CinematicWaypoint> {
    return this.cinematicConfig.waypoints;
  }

  /**
   * Update orbit configuration.
   */
  setOrbitConfig(config: Partial<SpectatorOrbitConfig>): void {
    Object.assign(this.orbitConfig, config);
  }

  /**
   * Update fly configuration.
   */
  setFlyConfig(config: Partial<SpectatorFlyConfig>): void {
    Object.assign(this.flyConfig, config);
  }

  /**
   * Update cinematic configuration.
   */
  setCinematicConfig(config: Partial<SpectatorCinematicConfig>): void {
    if (config.waypoints !== undefined) {
      this.cinematicConfig.waypoints = config.waypoints;
    }
    if (config.loop !== undefined) this.cinematicConfig.loop = config.loop;
    if (config.playbackSpeed !== undefined) this.cinematicConfig.playbackSpeed = config.playbackSpeed;
    if (config.smoothPath !== undefined) this.cinematicConfig.smoothPath = config.smoothPath;
    if (config.splineTension !== undefined) this.cinematicConfig.splineTension = config.splineTension;

    this.playback = {
      ...this.playback,
      totalWaypoints: this.cinematicConfig.waypoints.length,
      totalDuration: this.getTotalCinematicDuration(),
    };
  }

  /**
   * Dispose the controller (detach events, cleanup).
   */
  dispose(): void {
    this.detach();
    this.stopCinematic();
  }

  // ===========================================================================
  // ORBIT MODE UPDATE
  // ===========================================================================

  private updateOrbit(deltaSec: number): void {
    // Auto-rotate
    if (this.orbitConfig.autoRotateSpeed > 0 && !this.isDragging && !this.isPanning) {
      this.orbitTheta += this.orbitConfig.autoRotateSpeed * deltaSec;
    }

    // Apply damping
    if (this.orbitConfig.enableDamping && !this.isDragging && !this.isPanning) {
      this.orbitVelocityTheta *= this.orbitConfig.dampingFactor;
      this.orbitVelocityPhi *= this.orbitConfig.dampingFactor;
      this.orbitVelocityDistance *= this.orbitConfig.dampingFactor;
      this.orbitVelocityPanX *= this.orbitConfig.dampingFactor;
      this.orbitVelocityPanY *= this.orbitConfig.dampingFactor;

      this.orbitTheta += this.orbitVelocityTheta;
      this.orbitPhi += this.orbitVelocityPhi;
      this.orbitDistance += this.orbitVelocityDistance;

      if (Math.abs(this.orbitVelocityPanX) > 0.0001 || Math.abs(this.orbitVelocityPanY) > 0.0001) {
        this.applyOrbitPan(this.orbitVelocityPanX, this.orbitVelocityPanY);
      }
    }

    this.updateOrbitCamera();
  }

  private updateOrbitCamera(): void {
    // Clamp phi to avoid gimbal lock
    this.orbitPhi = Math.max(0.01, Math.min(Math.PI - 0.01, this.orbitPhi));

    // Clamp distance
    this.orbitDistance = Math.max(
      this.orbitConfig.minDistance,
      Math.min(this.orbitConfig.maxDistance, this.orbitDistance),
    );

    // Compute position from spherical coordinates
    const sinPhi = Math.sin(this.orbitPhi);
    const cosPhi = Math.cos(this.orbitPhi);
    const sinTheta = Math.sin(this.orbitTheta);
    const cosTheta = Math.cos(this.orbitTheta);

    const position: Vec3 = [
      this.orbitTarget[0] + this.orbitDistance * sinPhi * sinTheta,
      this.orbitTarget[1] + this.orbitDistance * cosPhi,
      this.orbitTarget[2] + this.orbitDistance * sinPhi * cosTheta,
    ];

    this.camera = {
      ...this.camera,
      position,
      target: [...this.orbitTarget],
    };
  }

  private applyOrbitPan(dx: number, dy: number): void {
    const sinPhi = Math.sin(this.orbitPhi);
    const cosPhi = Math.cos(this.orbitPhi);
    const sinTheta = Math.sin(this.orbitTheta);
    const cosTheta = Math.cos(this.orbitTheta);

    // Camera right vector
    const rightX = cosTheta;
    const rightZ = -sinTheta;

    // Camera up vector (approximate)
    const upX = -cosPhi * sinTheta;
    const upY = sinPhi;
    const upZ = -cosPhi * cosTheta;

    this.orbitTarget[0] += rightX * dx + upX * dy;
    this.orbitTarget[1] += upY * dy;
    this.orbitTarget[2] += rightZ * dx + upZ * dy;
  }

  private syncOrbitFromCamera(): void {
    const dx = this.camera.position[0] - this.camera.target[0];
    const dy = this.camera.position[1] - this.camera.target[1];
    const dz = this.camera.position[2] - this.camera.target[2];

    this.orbitDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (this.orbitDistance < 1e-10) this.orbitDistance = 8;

    this.orbitTheta = Math.atan2(dx, dz);
    this.orbitPhi = Math.acos(Math.max(-1, Math.min(1, dy / this.orbitDistance)));
    this.orbitTarget = [...this.camera.target];
  }

  // ===========================================================================
  // FLY MODE UPDATE
  // ===========================================================================

  private updateFly(deltaSec: number): void {
    // Compute forward and right vectors from yaw/pitch
    const forward = this.getFlyForward();
    const right = vec3Normalize(vec3Cross(forward, [0, 1, 0]));
    const up: Vec3 = [0, 1, 0];

    // Determine movement from keys
    let moveDir: Vec3 = [0, 0, 0];

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) {
      moveDir = vec3Add(moveDir, forward);
    }
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) {
      moveDir = vec3Sub(moveDir, forward);
    }
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) {
      moveDir = vec3Sub(moveDir, right);
    }
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) {
      moveDir = vec3Add(moveDir, right);
    }
    if (this.flyConfig.enableVertical) {
      if (this.keysPressed.has('e') || this.keysPressed.has(' ')) {
        moveDir = vec3Add(moveDir, up);
      }
      if (this.keysPressed.has('q')) {
        moveDir = vec3Sub(moveDir, up);
      }
    }

    // Normalize move direction
    const moveDirLen = vec3Length(moveDir);
    if (moveDirLen > 0.001) {
      moveDir = vec3Normalize(moveDir);

      let speed = this.flyConfig.moveSpeed;
      if (this.keysPressed.has('shift')) {
        speed *= this.flyConfig.sprintMultiplier;
      }

      this.flyVelocity = vec3Scale(moveDir, speed);
    } else {
      // Apply damping when no keys pressed
      this.flyVelocity = vec3Scale(this.flyVelocity, this.flyConfig.moveDamping);
    }

    // Apply velocity
    const displacement = vec3Scale(this.flyVelocity, deltaSec);
    const newPosition = vec3Add(this.camera.position, displacement);

    // Compute target from position + forward
    const newTarget = vec3Add(newPosition, forward);

    this.camera = {
      ...this.camera,
      position: newPosition,
      target: newTarget,
    };
  }

  private getFlyForward(): Vec3 {
    const cosPitch = Math.cos(this.flyPitch);
    return [
      Math.sin(this.flyYaw) * cosPitch,
      Math.sin(this.flyPitch),
      Math.cos(this.flyYaw) * cosPitch,
    ];
  }

  private syncFlyFromCamera(): void {
    const dir = vec3Normalize(vec3Sub(this.camera.target, this.camera.position));
    this.flyYaw = Math.atan2(dir[0], dir[2]);
    this.flyPitch = Math.asin(Math.max(-1, Math.min(1, dir[1])));
  }

  // ===========================================================================
  // CINEMATIC MODE UPDATE
  // ===========================================================================

  private updateCinematic(_deltaSec: number): void {
    if (!this.playback.isPlaying) return;

    const waypoints = this.cinematicConfig.waypoints;
    if (waypoints.length < 2) {
      this.stopCinematic();
      return;
    }

    const elapsed = (performance.now() - this.cinematicStartTime) / 1000 *
      this.cinematicConfig.playbackSpeed;
    const totalDuration = this.getTotalCinematicDuration();

    let adjustedElapsed = elapsed;

    if (this.cinematicConfig.loop && totalDuration > 0) {
      const loopCount = Math.floor(elapsed / totalDuration);
      adjustedElapsed = elapsed - loopCount * totalDuration;
      this.playback = {
        ...this.playback,
        loopCount,
        elapsedTime: adjustedElapsed,
        progress: adjustedElapsed / totalDuration,
      };
    } else if (elapsed >= totalDuration) {
      // Reached end, stop
      this.applyCinematicWaypoint(waypoints[waypoints.length - 1]);
      this.playback = {
        ...this.playback,
        isPlaying: false,
        progress: 1,
        currentWaypoint: waypoints.length - 1,
        elapsedTime: totalDuration,
      };
      return;
    } else {
      this.playback = {
        ...this.playback,
        elapsedTime: adjustedElapsed,
        progress: totalDuration > 0 ? adjustedElapsed / totalDuration : 0,
      };
    }

    // Find which segment we are in
    let accum = 0;
    let segIndex = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const segDuration = waypoints[i].duration;
      if (accum + segDuration > adjustedElapsed) {
        segIndex = i - 1;
        break;
      }
      accum += segDuration;
      if (i === waypoints.length - 1) {
        segIndex = i - 1;
      }
    }

    const segDuration = waypoints[segIndex + 1].duration;
    const segLocalTime = adjustedElapsed - accum;
    const rawT = segDuration > 0 ? segLocalTime / segDuration : 0;

    // Apply easing
    const easingFn = EASING_FUNCTIONS[waypoints[segIndex + 1].easing] || EASING_FUNCTIONS['linear'];
    const t = easingFn(Math.max(0, Math.min(1, rawT)));

    // Interpolate position and target
    let position: Vec3;
    let target: Vec3;

    if (this.cinematicConfig.smoothPath && waypoints.length >= 3) {
      // Catmull-Rom spline interpolation
      const i0 = Math.max(0, segIndex - 1);
      const i1 = segIndex;
      const i2 = Math.min(waypoints.length - 1, segIndex + 1);
      const i3 = Math.min(waypoints.length - 1, segIndex + 2);

      position = catmullRom(
        waypoints[i0].position, waypoints[i1].position,
        waypoints[i2].position, waypoints[i3].position,
        t, this.cinematicConfig.splineTension,
      );
      target = catmullRom(
        waypoints[i0].target, waypoints[i1].target,
        waypoints[i2].target, waypoints[i3].target,
        t, this.cinematicConfig.splineTension,
      );
    } else {
      // Linear interpolation
      position = vec3Lerp(waypoints[segIndex].position, waypoints[segIndex + 1].position, t);
      target = vec3Lerp(waypoints[segIndex].target, waypoints[segIndex + 1].target, t);
    }

    // Interpolate FOV if specified
    const fov0 = waypoints[segIndex].fovY ?? this.camera.fovY;
    const fov1 = waypoints[segIndex + 1].fovY ?? this.camera.fovY;
    const fovY = fov0 + (fov1 - fov0) * t;

    this.camera = {
      ...this.camera,
      position,
      target,
      fovY,
    };

    this.playback = {
      ...this.playback,
      currentWaypoint: segIndex,
    };
  }

  private applyCinematicWaypoint(wp: CinematicWaypoint): void {
    this.camera = {
      ...this.camera,
      position: [...wp.position],
      target: [...wp.target],
      fovY: wp.fovY ?? this.camera.fovY,
    };
  }

  private getTotalCinematicDuration(): number {
    return this.cinematicConfig.waypoints.reduce(
      (sum, wp, i) => sum + (i === 0 ? 0 : wp.duration),
      0,
    );
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  private onMouseDown(e: MouseEvent): void {
    if (this.camera.mode === 'orbit') {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else if (e.button === 1) {
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        e.preventDefault();
      }
    } else if (this.camera.mode === 'fly') {
      // Request pointer lock for fly mode
      if (e.button === 0 && this.canvas && !this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.camera.mode === 'orbit') {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isDragging) {
        const speedScale = this.orbitConfig.rotationSpeed * 0.005;
        this.orbitVelocityTheta = -deltaX * speedScale;
        this.orbitVelocityPhi = deltaY * speedScale;
        this.orbitTheta += this.orbitVelocityTheta;
        this.orbitPhi += this.orbitVelocityPhi;
      }

      if (this.isPanning) {
        const panScale = this.orbitConfig.panSpeed * this.orbitDistance * 0.002;
        this.orbitVelocityPanX = -deltaX * panScale;
        this.orbitVelocityPanY = deltaY * panScale;
        this.applyOrbitPan(this.orbitVelocityPanX, this.orbitVelocityPanY);
      }
    } else if (this.camera.mode === 'fly' && this.isPointerLocked) {
      const deltaX = e.movementX || 0;
      const deltaY = e.movementY || 0;

      this.flyYaw -= deltaX * this.flyConfig.lookSensitivity;
      this.flyPitch -= deltaY * this.flyConfig.lookSensitivity;

      // Clamp pitch to avoid flipping
      this.flyPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.flyPitch));
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    if (this.camera.mode !== 'orbit') return;
    e.preventDefault();

    const zoomDelta = e.deltaY * 0.001 * this.orbitConfig.zoomSpeed * this.orbitDistance;
    this.orbitVelocityDistance = zoomDelta;
    this.orbitDistance += zoomDelta;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.camera.mode === 'fly') {
      this.keysPressed.add(e.key.toLowerCase());
    }
    if (this.camera.mode === 'fly' && e.key === 'Escape' && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.key.toLowerCase());
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private emitStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.camera });
    }
  }
}

/**
 * Factory function for creating a SpectatorCameraController.
 */
export function createSpectatorCameraController(
  options?: ConstructorParameters<typeof SpectatorCameraController>[0],
): SpectatorCameraController {
  return new SpectatorCameraController(options);
}
