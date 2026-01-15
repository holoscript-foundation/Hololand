/**
 * @hololand/ar-renderer
 * 
 * WebXR and Three.js AR rendering with VRM avatar support.
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                             Architecture                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                     ARSceneManager                               │   │
 * │  │  - Three.js scene setup                                          │   │
 * │  │  - WebXR session management (AR/VR)                              │   │
 * │  │  - Lighting & shadows                                            │   │
 * │  │  - Animation loop                                                │   │
 * │  └───────────────────────────┬─────────────────────────────────────┘   │
 * │                              │                                         │
 * │                              ▼                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                   VRMAvatarManager                               │   │
 * │  │  - VRM model loading                                             │   │
 * │  │  - Expression blending                                           │   │
 * │  │  - Look-at tracking                                              │   │
 * │  │  - Pose application                                              │   │
 * │  └───────────────────────────┬─────────────────────────────────────┘   │
 * │                              │                                         │
 * │                              ▼                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                   IKSolver & Retargeter                          │   │
 * │  │  - FABRIK algorithm                                              │   │
 * │  │  - Detection → Avatar mapping                                    │   │
 * │  │  - Bone constraints                                              │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * 
 * ```typescript
 * import { ARSceneManager, VRMAvatarManager, PoseRetargeter } from '@hololand/ar-renderer';
 * 
 * // Setup scene
 * const scene = new ARSceneManager({ antialias: true, alpha: true });
 * scene.initialize(document.body);
 * 
 * // Start AR session
 * await scene.startARSession();
 * 
 * // Load avatar
 * const avatars = new VRMAvatarManager(scene.getScene()!);
 * await avatars.initialize();
 * const state = await avatars.loadAvatar('player', { vrmUrl: 'avatar.vrm' });
 * 
 * // Apply pose from detection
 * const retargeter = new PoseRetargeter();
 * retargeter.retarget(detectedKeypoints, avatars.getModel('player')!);
 * 
 * // Animation loop
 * scene.onFrame((time, frame) => {
 *   avatars.update();
 * });
 * scene.start();
 * ```
 */

// Types
export * from './types';

// Scene Management
export { ARSceneManager } from './ARSceneManager';

// Avatar Management
export { VRMAvatarManager } from './VRMAvatarManager';

// IK & Retargeting
export { IKSolver, PoseRetargeter } from './IKSolver';
