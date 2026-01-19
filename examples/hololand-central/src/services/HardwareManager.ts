/**
 * Hardware Manager
 * 
 * Coordinates all hardware services (hand tracking, body tracking, eye tracking, etc.)
 * Provides a unified interface for hardware initialization and updates.
 */

import { HardwareCapabilities } from '../types/hardware';
import { getHardwareDetectionService } from './HardwareDetectionService';
import { getHandTrackingService } from './HandTrackingService';
import { getBodyTrackingManager } from './BodyTrackingManager';
import { getEyeTrackingService } from './EyeTrackingService';

export class HardwareManager {
  private capabilities: HardwareCapabilities | null = null;
  private initialized: boolean = false;
  
  private hardwareDetection = getHardwareDetectionService();
  private handTracking = getHandTrackingService();
  private bodyTracking = getBodyTrackingManager();
  private eyeTracking = getEyeTrackingService();

  /**
   * Initialize all hardware services
   */
  async initialize(session: XRSession): Promise<HardwareCapabilities> {
    // Initialize hardware detection
    await this.hardwareDetection.initialize(session);
    this.capabilities = await this.hardwareDetection.detectCapabilities();

    console.log('🎮 Hardware Capabilities Detected:', {
      device: this.capabilities.deviceType,
      handTracking: this.capabilities.handTracking.available,
      eyeTracking: this.capabilities.eyeTracking?.available,
      bodyTracking: this.capabilities.bodyTracking?.available,
    });

    // Initialize hand tracking if available
    if (this.capabilities.handTracking.available) {
      const handTrackingReady = await this.handTracking.initialize(session);
      console.log('👋 Hand Tracking:', handTrackingReady ? 'Ready' : 'Not Available');
    }

    // Initialize body tracking if available (requires consent)
    if (this.capabilities.bodyTracking?.available) {
      await this.bodyTracking.initialize(session);
      console.log('🤸 Body Tracking: Available (consent required)');
    }

    // Initialize eye tracking if available
    if (this.capabilities.eyeTracking?.available) {
      const eyeTrackingReady = await this.eyeTracking.initialize(session);
      console.log('👁️ Eye Tracking:', eyeTrackingReady ? 'Ready' : 'Not Available');
    }

    this.initialized = true;
    return this.capabilities;
  }

  /**
   * Update all hardware services (call every frame)
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    if (!this.initialized || !this.capabilities) return;

    // Update hand tracking
    if (this.capabilities.handTracking.available) {
      this.handTracking.update(frame, referenceSpace);
    }

    // Update body tracking
    if (this.capabilities.bodyTracking?.available && this.bodyTracking.hasConsent()) {
      this.bodyTracking.update(frame, referenceSpace);
    }

    // Update eye tracking
    if (this.capabilities.eyeTracking?.available) {
      this.eyeTracking.update(frame, referenceSpace);
    }
  }

  /**
   * Get detected capabilities
   */
  getCapabilities(): HardwareCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get hand tracking service
   */
  getHandTracking() {
    return this.handTracking;
  }

  /**
   * Get body tracking manager
   */
  getBodyTracking() {
    return this.bodyTracking;
  }

  /**
   * Get eye tracking service
   */
  getEyeTracking() {
    return this.eyeTracking;
  }

  /**
   * Request body tracking consent
   */
  async requestBodyTrackingConsent(): Promise<boolean> {
    if (!this.capabilities?.bodyTracking?.available) {
      console.warn('Body tracking not available on this device');
      return false;
    }

    const consent = await this.bodyTracking.requestConsent();
    
    if (consent) {
      await this.bodyTracking.startTracking();
      console.log('✅ Body tracking enabled');
    } else {
      console.log('❌ Body tracking consent denied');
    }

    return consent;
  }

  /**
   * Cleanup all services
   */
  dispose(): void {
    this.handTracking.dispose();
    this.bodyTracking.dispose();
    this.eyeTracking.dispose();
    this.initialized = false;
    this.capabilities = null;
  }

  /**
   * Singleton instance
   */
  private static instance: HardwareManager | null = null;

  static getInstance(): HardwareManager {
    if (!HardwareManager.instance) {
      HardwareManager.instance = new HardwareManager();
    }
    return HardwareManager.instance;
  }
}

// Export singleton
export const getHardwareManager = () => HardwareManager.getInstance();
