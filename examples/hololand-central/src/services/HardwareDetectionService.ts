/**
 * Hardware Detection Service
 * 
 * Detects available VR hardware capabilities using WebXR Device API.
 * Provides capability profiles for Quest 2, Quest 3, Quest Pro, PCVR, and Vision Pro.
 */

import {
  HardwareCapabilities,
  DeviceType,
  HandTrackingCapability,
  EyeTrackingCapability,
  BodyTrackingCapability,
  PassthroughCapability,
  SpatialAnchorCapability,
  HapticsCapability,
  VoiceCapability,
  DepthSensorCapability,
} from '../types/hardware';

export class HardwareDetectionService {
  private xrSession: XRSession | null = null;
  private detectedDevice: DeviceType = 'unknown';

  /**
   * Initialize the service and detect device capabilities
   */
  async initialize(session?: XRSession): Promise<void> {
    if (session) {
      this.xrSession = session;
        this.detectedDevice = await this.identifyDevice();
    }
  }

  /**
   * Main entry point: Detect all hardware capabilities
   */
  async detectCapabilities(): Promise<HardwareCapabilities> {
    // If we don't have an XR session, create a temporary one for detection
    if (!this.xrSession && 'xr' in navigator && navigator.xr) {
      try {
        this.xrSession = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: [
            'hand-tracking',
            'eye-tracking',
            'body-tracking',
            'local-floor',
            'bounded-floor',
            'anchors',
          ],
        });
        this.detectedDevice = await this.identifyDevice();
      } catch (err) {
        console.warn('Could not create XR session for hardware detection:', err);
      }
    }

    return {
      handTracking: await this.detectHandTracking(),
      eyeTracking: await this.detectEyeTracking(),
      faceTracking: await this.detectFaceTracking(),
      bodyTracking: await this.detectBodyTracking(),
      passthrough: await this.detectPassthrough(),
      spatialAnchors: await this.detectSpatialAnchors(),
      haptics: await this.detectHaptics(),
      voice: await this.detectVoice(),
      depth: await this.detectDepthSensor(),
      deviceType: this.detectedDevice,
    };
  }

  /**
   * Identify the specific VR device
   */
  private async identifyDevice(): Promise<DeviceType> {
    // Check user agent for Quest indicators
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('quest 3')) return 'quest-3';
    if (ua.includes('quest pro')) return 'quest-pro';
    if (ua.includes('quest 2') || ua.includes('quest')) return 'quest-2';
    if (ua.includes('vision pro') || ua.includes('visionos')) return 'vision-pro';
    
    // Check for PCVR indicators
    if (ua.includes('steamvr') || ua.includes('vive') || ua.includes('index')) {
      return 'pcvr';
    }

    return 'unknown';
  }

  /**
   * Detect hand tracking capabilities
   */
  private async detectHandTracking(): Promise<HandTrackingCapability> {
    if (!this.xrSession) {
      return {
        available: false,
        quality: 'basic',
        joints: 0,
        gestures: [],
      };
    }

    // Check if hand tracking is supported
    // @ts-ignore - WebXR Hand Tracking is not fully typed yet
    const inputSources = this.xrSession.inputSources;
    const hasHandTracking = Array.from(inputSources).some((source: any) => source.hand);

    if (!hasHandTracking) {
      return {
        available: false,
        quality: 'basic',
        joints: 0,
        gestures: [],
      };
    }

    // Determine quality based on device
    const quality = this.getHandTrackingQuality();

    return {
      available: true,
      quality,
      joints: 25, // WebXR standard
      gestures: ['pinch', 'grab', 'point', 'fist', 'open', 'thumbs_up'],
    };
  }

  /**
   * Get hand tracking quality based on device
   */
  private getHandTrackingQuality(): 'basic' | 'good' | 'excellent' {
    switch (this.detectedDevice) {
      case 'quest-3':
      case 'quest-pro':
      case 'vision-pro':
        return 'excellent';
      case 'quest-2':
        return 'basic';
      case 'pcvr':
        return 'good';
      default:
        return 'basic';
    }
  }

  /**
   * Detect eye tracking capabilities
   */
  private async detectEyeTracking(): Promise<EyeTrackingCapability | null> {
    // Eye tracking is available on Quest 3, Quest Pro, and Vision Pro
    if (!['quest-3', 'quest-pro', 'vision-pro'].includes(this.detectedDevice)) {
      return null;
    }

    // Check for WebXR Gaze Input
    // @ts-ignore - Gaze input not fully typed
    const hasGazeInput = this.xrSession?.inputSources.some((source: any) => 
      source.targetRayMode === 'gaze'
    );

    if (!hasGazeInput) return null;

    return {
      available: true,
      gazePoint: true,
      pupilDilation: this.detectedDevice === 'quest-pro' || this.detectedDevice === 'vision-pro',
      blinkDetection: this.detectedDevice === 'vision-pro',
    };
  }

  /**
   * Detect face tracking capabilities
   */
  private async detectFaceTracking(): Promise<null> {
    // Face tracking requires specialized APIs beyond WebXR
    // Will be implemented in a future phase
    return null;
  }

  /**
   * Detect body tracking capabilities
   */
  private async detectBodyTracking(): Promise<BodyTrackingCapability | null> {
    // Quest 3 has AI-based body tracking
    if (this.detectedDevice === 'quest-3') {
      // @ts-ignore - Meta-specific API
      if (typeof OVRPlugin !== 'undefined' && (OVRPlugin as any).bodyTrackingSupported) {
        return {
          available: true,
          method: 'ai-estimated',
          joints: 22,
          confidence: 0.85,
          requiresConsent: true,
        };
      }
    }

    // PCVR with Vive trackers
    if (this.detectedDevice === 'pcvr' && this.detectViveTrackers()) {
      return {
        available: true,
        method: 'tracker-based',
        joints: 22,
        confidence: 0.98,
        requiresConsent: true,
      };
    }

    return null;
  }

  /**
   * Detect Vive trackers (PCVR)
   */
  private detectViveTrackers(): boolean {
    // Check for Vive tracker input sources
    if (!this.xrSession) return false;
    
    const inputSources = Array.from(this.xrSession.inputSources);
    return inputSources.some((source: any) => 
      source.profiles?.includes('vive-tracker')
    );
  }

  /**
   * Detect passthrough capabilities
   */
  private async detectPassthrough(): Promise<PassthroughCapability | null> {
    // Passthrough is available on Quest 2+ and Vision Pro
    const supportsPassthrough = ['quest-2', 'quest-3', 'quest-pro', 'vision-pro'].includes(
      this.detectedDevice
    );

    if (!supportsPassthrough) return null;

    return {
      available: true,
      colorPassthrough: ['quest-3', 'quest-pro', 'vision-pro'].includes(this.detectedDevice),
      depthEstimation: ['quest-3', 'vision-pro'].includes(this.detectedDevice),
    };
  }

  /**
   * Detect spatial anchor capabilities
   */
  private async detectSpatialAnchors(): Promise<SpatialAnchorCapability | null> {
    if (!this.xrSession) return null;

    // Check for anchors feature
    // @ts-ignore - Anchors may not be fully typed
    const hasAnchors = this.xrSession.requestAnimationFrame || 'createAnchor' in XRFrame.prototype;

    if (!hasAnchors) return null;

    return {
      available: true,
      persistent: ['quest-3', 'quest-pro', 'vision-pro'].includes(this.detectedDevice),
      maxAnchors: 100,
    };
  }

  /**
   * Detect haptics capabilities
   */
  private async detectHaptics(): Promise<HapticsCapability> {
    if (!this.xrSession) {
      return {
        available: false,
        controllers: false,
        handTracking: false,
      };
    }

    // Check for gamepad vibration
    const inputSources = Array.from(this.xrSession.inputSources);
    const hasHaptics = inputSources.some((source: any) => 
      source.gamepad?.hapticActuators?.length > 0
    );

    return {
      available: hasHaptics,
      controllers: hasHaptics,
      handTracking: false, // Not yet supported
    };
  }

  /**
   * Detect voice capabilities
   */
  private async detectVoice(): Promise<VoiceCapability> {
    // Check for Web Speech API
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

    return {
      available: hasSpeechRecognition,
      wakeWord: this.detectedDevice.startsWith('quest'),
      continuousListening: hasSpeechRecognition,
    };
  }

  /**
   * Detect depth sensor capabilities
   */
  private async detectDepthSensor(): Promise<DepthSensorCapability | null> {
    if (this.detectedDevice === 'vision-pro') {
      return {
        available: true,
        type: 'lidar',
        range: 5, // meters
      };
    }

    if (this.detectedDevice === 'quest-3') {
      return {
        available: true,
        type: 'tof', // Time-of-Flight
        range: 4,
      };
    }

    return null;
  }

  /**
   * Get a singleton instance
   */
  private static instance: HardwareDetectionService | null = null;

  static getInstance(): HardwareDetectionService {
    if (!HardwareDetectionService.instance) {
      HardwareDetectionService.instance = new HardwareDetectionService();
    }
    return HardwareDetectionService.instance;
  }
}

// Export singleton
export const getHardwareDetectionService = () => HardwareDetectionService.getInstance();
