/**
 * Mobile Components Module
 *
 * Touch-optimized components for mobile viewports and PWA install experience:
 *   - MobileNavigation: Bottom tab bar with swipe gesture support
 *   - MobileWorldViewer: Touch-optimized 3D viewer wrapper
 *   - InstallPrompt: Custom PWA install banner
 *
 * @module components/mobile
 */

export {
  MobileNavigation,
  type MobileNavigationProps,
  type TabId,
  type OverflowId,
  type TabBadges,
} from './MobileNavigation';

export {
  MobileWorldViewer,
  type MobileWorldViewerProps,
  type CameraState,
  type TapEvent,
} from './MobileWorldViewer';

export {
  InstallPrompt,
  type InstallPromptProps,
} from './InstallPrompt';
