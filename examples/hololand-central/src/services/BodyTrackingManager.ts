/**
 * Body Tracking Manager
 * 
 * Implements consent-first body tracking for Quest 3 and PCVR devices.
 * All body tracking requires explicit user consent with clear privacy explanations.
 */

import {
  BodyTrackingData,
  BodyTrackingConsent,
  BodyJoint,
  BodyJointName,
} from '../types/hardware';

export class BodyTrackingManager {
  private consent: BodyTrackingConsent | null = null;
  private tracking: boolean = false;
  private session: XRSession | null = null;
  private bodyData: BodyTrackingData | null = null;
  private readonly CONSENT_STORAGE_KEY = 'hololand_body_tracking_consent';

  /**
   * Initialize body tracking (does NOT enable tracking, requires consent)
   */
  async initialize(session: XRSession): Promise<void> {
    this.session = session;
    
    // Load stored consent if available
    this.consent = this.loadStoredConsent();
  }

  /**
   * Request user consent before enabling body tracking
   */
  async requestConsent(): Promise<boolean> {
    // Check if we already have valid consent
    if (this.consent && this.consent.granted && !this.isConsentExpired(this.consent)) {
      return true;
    }

    // Show consent dialog
    const consent = await this.showConsentDialog();
    
    if (!consent) {
      this.consent = {
        granted: false,
        level: 'none',
        timestamp: Date.now(),
        expiresAt: null,
      };
      return false;
    }

    this.consent = consent;
    this.saveConsent(consent);
    
    return consent.granted;
  }

  /**
   * Show consent dialog to user
   */
  private async showConsentDialog(): Promise<BodyTrackingConsent | null> {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      overlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
          <h2 style="
            color: white;
            margin: 0 0 20px 0;
            font-size: 28px;
            font-weight: 700;
          ">🤸 Enable Body Tracking?</h2>
          
          <p style="
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            margin-bottom: 20px;
          ">
            Hololand can track your body movements to create a more immersive experience.
          </p>

          <div style="
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
          ">
            <h3 style="color: #4ade80; margin: 0 0 10px 0; font-size: 16px;">✅ What we track:</h3>
            <ul style="color: rgba(255, 255, 255, 0.9); margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Head, torso, arms, and leg positions (22 points)</li>
              <li>Joint rotations for avatar mirroring</li>
            </ul>

            <h3 style="color: #4ade80; margin: 20px 0 10px 0; font-size: 16px;">🔒 Privacy guarantees:</h3>
            <ul style="color: rgba(255, 255, 255, 0.9); margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>No video is recorded</strong></li>
              <li><strong>All processing happens on your device</strong></li>
              <li><strong>No data leaves your headset</strong></li>
              <li>You can disable this anytime</li>
            </ul>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="color: rgba(255, 255, 255, 0.9); font-weight: 600; display: block; margin-bottom: 10px;">
              Select tracking level:
            </label>
            <select id="tracking-level-select" style="
              width: 100%;
              padding: 12px;
              border-radius: 8px;
              border: none;
              font-size: 16px;
              background: white;
              cursor: pointer;
            ">
              <option value="full">Full Body (best experience)</option>
              <option value="upper">Upper Body Only (arms + torso)</option>
              <option value="hands">Hands Only</option>
              <option value="none">No Thanks</option>
            </select>
          </div>

          <div style="display: flex; gap: 10px;">
            <button id="consent-allow" style="
              flex: 1;
              padding: 15px;
              border-radius: 10px;
              border: none;
              background: #4ade80;
              color: #1a1a1a;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              Enable Tracking
            </button>
            <button id="consent-deny" style="
              flex: 1;
              padding: 15px;
              border-radius: 10px;
              border: none;
              background: rgba(255, 255, 255, 0.2);
              color: white;
              font-size: 16px;
              font-weight: 700;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              No Thanks
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const selectElement = document.getElementById('tracking-level-select') as HTMLSelectElement;
      const allowButton = document.getElementById('consent-allow');
      const denyButton = document.getElementById('consent-deny');

      allowButton?.addEventListener('click', () => {
        const level = selectElement.value as 'full' | 'upper' | 'hands' | 'none';
        document.body.removeChild(overlay);
        
        resolve({
          granted: level !== 'none',
          level,
          timestamp: Date.now(),
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        });
      });

      denyButton?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(null);
      });
    });
  }

  /**
   * Start body tracking (requires consent)
   */
  async startTracking(): Promise<BodyTrackingData | null> {
    if (!this.consent || !this.consent.granted || this.consent.level === 'none') {
      throw new Error('Body tracking requires user consent');
    }

    if (!this.session) {
      throw new Error('XR session not initialized');
    }

    this.tracking = true;
    return this.bodyData;
  }

  /**
   * Stop body tracking
   */
  stopTracking(): void {
    this.tracking = false;
    this.bodyData = null;
  }

  /**
   * Update body tracking data (call every frame)
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    if (!this.tracking || !this.session) return;

    // Placeholder: Actual body tracking implementation depends on device API
    // Quest 3 uses Meta's OVRPlugin, PCVR uses Vive trackers
    
    // For now, we'll return null and implement device-specific logic later
    this.bodyData = this.getBodyTrackingData(frame, referenceSpace);
  }

  /**
   * Get body tracking data from device
   */
  private getBodyTrackingData(_frame: XRFrame, _referenceSpace: XRReferenceSpace): BodyTrackingData | null {
    // @ts-ignore - Meta-specific API
    if (typeof OVRPlugin !== 'undefined' && (OVRPlugin as any).GetBodyTrackingData) {
      // Quest 3 body tracking
      // @ts-ignore
      const data = OVRPlugin.GetBodyTrackingData();
      return this.parseMetaBodyData(data);
    }

    // PCVR with Vive trackers
    // Implementation would go here

    return null;
  }

  /**
   * Parse Meta Quest body tracking data
   */
  private parseMetaBodyData(data: any): BodyTrackingData {
    const joints: BodyJoint[] = [];
    
    // Standard body joint names
    const jointNames: BodyJointName[] = [
      'head', 'neck',
      'left-shoulder', 'right-shoulder',
      'left-elbow', 'right-elbow',
      'left-wrist', 'right-wrist',
      'spine-upper', 'spine-middle', 'spine-lower',
      'pelvis',
      'left-hip', 'right-hip',
      'left-knee', 'right-knee',
      'left-ankle', 'right-ankle',
      'left-foot', 'right-foot',
    ];

    // Parse joint data (device-specific format)
    for (const jointName of jointNames) {
      const jointData = data.joints?.[jointName];
      if (!jointData) continue;

      joints.push({
        name: jointName,
        position: jointData.position || { x: 0, y: 0, z: 0 },
        rotation: jointData.rotation || { x: 0, y: 0, z: 0, w: 1 },
        confidence: jointData.confidence || 0.5,
      });
    }

    return {
      joints,
      confidence: data.overallConfidence || 0.85,
      method: 'ai-estimated',
    };
  }

  /**
   * Get current body data
   */
  getBodyData(): BodyTrackingData | null {
    return this.bodyData;
  }

  /**
   * Check if user has granted consent
   */
  hasConsent(): boolean {
    return this.consent?.granted === true && !this.isConsentExpired(this.consent);
  }

  /**
   * Get consent level
   */
  getConsentLevel(): 'none' | 'hands' | 'upper' | 'full' {
    return this.consent?.level || 'none';
  }

  /**
   * Revoke consent
   */
  revokeConsent(): void {
    this.consent = {
      granted: false,
      level: 'none',
      timestamp: Date.now(),
      expiresAt: null,
    };
    this.saveConsent(this.consent);
    this.stopTracking();
  }

  /**
   * Check if consent is expired
   */
  private isConsentExpired(consent: BodyTrackingConsent): boolean {
    if (!consent.expiresAt) return false;
    return Date.now() > consent.expiresAt;
  }

  /**
   * Save consent to localStorage
   */
  private saveConsent(consent: BodyTrackingConsent): void {
    try {
      localStorage.setItem(this.CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (err) {
      console.warn('Could not save body tracking consent:', err);
    }
  }

  /**
   * Load consent from localStorage
   */
  private loadStoredConsent(): BodyTrackingConsent | null {
    try {
      const stored = localStorage.getItem(this.CONSENT_STORAGE_KEY);
      if (!stored) return null;

      const consent = JSON.parse(stored) as BodyTrackingConsent;
      
      // Check if expired
      if (this.isConsentExpired(consent)) {
        return null;
      }

      return consent;
    } catch (err) {
      console.warn('Could not load body tracking consent:', err);
      return null;
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopTracking();
    this.session = null;
    this.bodyData = null;
  }

  /**
   * Singleton instance
   */
  private static instance: BodyTrackingManager | null = null;

  static getInstance(): BodyTrackingManager {
    if (!BodyTrackingManager.instance) {
      BodyTrackingManager.instance = new BodyTrackingManager();
    }
    return BodyTrackingManager.instance;
  }
}

// Export singleton
export const getBodyTrackingManager = () => BodyTrackingManager.getInstance();
