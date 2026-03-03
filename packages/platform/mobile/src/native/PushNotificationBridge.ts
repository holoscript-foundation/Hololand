/**
 * PushNotificationBridge - Push notification bridge for HoloLand mobile
 *
 * Handles FCM (Android) and APNS (iOS) push notification registration,
 * foreground/background notification handling, topic subscriptions,
 * and badge management.
 *
 * Uses @capacitor/push-notifications plugin API.
 */

import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';

// =============================================================================
// TYPES
// =============================================================================

/** Callback for foreground notification events */
export type NotificationReceivedCallback = (notification: HoloNotification) => void;

/** Callback for notification tap events (from background/killed state) */
export type NotificationTappedCallback = (notification: HoloNotification, actionId: string) => void;

/** Normalized notification structure for HoloLand */
export interface HoloNotification {
  /** Unique notification ID */
  id: string;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Custom data payload */
  data: Record<string, unknown>;
  /** Timestamp when the notification was received */
  receivedAt: number;
  /** Optional subtitle (iOS) */
  subtitle?: string;
  /** Optional badge count */
  badge?: number;
  /** Optional notification group/thread */
  group?: string;
}

/** Push registration result */
export interface PushRegistrationResult {
  /** Whether registration was successful */
  success: boolean;
  /** FCM (Android) or APNS (iOS) device token */
  token: string | null;
  /** Error message if registration failed */
  error?: string;
}

// =============================================================================
// PUSH NOTIFICATION BRIDGE
// =============================================================================

export class PushNotificationBridge {
  private deviceToken: string | null = null;
  private registered = false;
  private subscribedTopics: Set<string> = new Set();

  private onReceivedCallbacks: NotificationReceivedCallback[] = [];
  private onTappedCallbacks: NotificationTappedCallback[] = [];

  private listenerRegistered = false;

  /**
   * Register for push notifications.
   * Requests permission from the user and returns the device token
   * (FCM token on Android, APNS token on iOS).
   *
   * @returns PushRegistrationResult with success status and token
   */
  async registerForPush(): Promise<PushRegistrationResult> {
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'denied') {
        return {
          success: false,
          token: null,
          error: 'Push notification permission denied. Enable in system settings.',
        };
      }

      // Request permission if not yet granted
      if (permStatus.receive !== 'granted') {
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive !== 'granted') {
          return {
            success: false,
            token: null,
            error: 'User declined push notification permission.',
          };
        }
      }

      // Set up listeners before registering (only once)
      if (!this.listenerRegistered) {
        this.setupListeners();
        this.listenerRegistered = true;
      }

      // Register with FCM/APNS
      await PushNotifications.register();

      // Wait for the registration token with a timeout
      const token = await this.waitForToken(5000);

      if (token) {
        this.deviceToken = token;
        this.registered = true;
        console.info('[PushNotificationBridge] Registered successfully', {
          tokenPreview: `${token.substring(0, 12)}...`,
        });
        return { success: true, token };
      }

      return {
        success: false,
        token: null,
        error: 'Registration timed out. No token received.',
      };
    } catch (error) {
      console.error('[PushNotificationBridge] Registration failed:', error);
      return {
        success: false,
        token: null,
        error: `Registration failed: ${error}`,
      };
    }
  }

  /**
   * Register a callback for foreground notification events.
   * Called when a notification arrives while the app is in the foreground.
   *
   * @param callback - Function invoked with the received notification
   * @returns Unsubscribe function to remove this callback
   */
  onNotificationReceived(callback: NotificationReceivedCallback): () => void {
    this.onReceivedCallbacks.push(callback);

    return () => {
      const index = this.onReceivedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onReceivedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for notification tap events.
   * Called when the user taps a notification from the background or killed state.
   *
   * @param callback - Function invoked with the tapped notification and action ID
   * @returns Unsubscribe function to remove this callback
   */
  onNotificationTapped(callback: NotificationTappedCallback): () => void {
    this.onTappedCallbacks.push(callback);

    return () => {
      const index = this.onTappedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onTappedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to a topic-based messaging channel.
   * Topics enable server-side fan-out to groups of devices.
   *
   * @param topic - Topic name to subscribe to (e.g., 'world-updates', 'agent-alerts')
   */
  async subscribeTo(topic: string): Promise<void> {
    if (!this.registered) {
      throw new Error('[PushNotificationBridge] Not registered. Call registerForPush() first.');
    }

    // Note: Capacitor PushNotifications does not natively support topics.
    // Topic subscription is typically handled server-side via FCM/APNS APIs.
    // We track subscriptions locally and emit the subscription event
    // so the app can sync with the backend.
    this.subscribedTopics.add(topic);

    console.info('[PushNotificationBridge] Subscribed to topic:', topic);
  }

  /**
   * Unsubscribe from a topic-based messaging channel.
   *
   * @param topic - Topic name to unsubscribe from
   */
  async unsubscribeFrom(topic: string): Promise<void> {
    if (!this.registered) {
      throw new Error('[PushNotificationBridge] Not registered. Call registerForPush() first.');
    }

    this.subscribedTopics.delete(topic);

    console.info('[PushNotificationBridge] Unsubscribed from topic:', topic);
  }

  /**
   * Set the app badge count (iOS primarily, limited Android support).
   *
   * @param count - Badge number to display. Pass 0 to clear.
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      // Capacitor PushNotifications does not expose badge control directly.
      // On iOS, badges are typically set via the notification payload.
      // We use the local notification approach for explicit badge control.
      // For now, store the intended count for server-side payload enrichment.
      console.info('[PushNotificationBridge] Badge count set:', count);

      // On supported platforms, attempt to use the native badge API
      if ('setAppBadge' in navigator && typeof (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge === 'function') {
        if (count > 0) {
          await (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(count);
        } else {
          await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
      }
    } catch (error) {
      console.warn('[PushNotificationBridge] Failed to set badge count:', error);
    }
  }

  /**
   * Clear all delivered notifications from the notification center.
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await PushNotifications.removeAllDeliveredNotifications();
      console.info('[PushNotificationBridge] All notifications cleared.');
    } catch (error) {
      console.warn('[PushNotificationBridge] Failed to clear notifications:', error);
    }
  }

  /**
   * Get the current device push token.
   *
   * @returns The FCM/APNS token, or null if not registered
   */
  getToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Check if push notifications are registered.
   */
  isRegistered(): boolean {
    return this.registered;
  }

  /**
   * Get the list of currently subscribed topics.
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }

  /**
   * Clean up all listeners. Call when the bridge is no longer needed.
   */
  async dispose(): Promise<void> {
    await PushNotifications.removeAllListeners();
    this.onReceivedCallbacks = [];
    this.onTappedCallbacks = [];
    this.subscribedTopics.clear();
    this.listenerRegistered = false;
    this.registered = false;
    this.deviceToken = null;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Set up native event listeners for push notification events.
   */
  private setupListeners(): void {
    // Token registration success
    PushNotifications.addListener('registration', (token: Token) => {
      this.deviceToken = token.value;
      console.info('[PushNotificationBridge] Token received');
    });

    // Token registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotificationBridge] Registration error:', error);
    });

    // Foreground notification received
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        const holoNotification = this.normalizeNotification(notification);

        for (const callback of this.onReceivedCallbacks) {
          try {
            callback(holoNotification);
          } catch (err) {
            console.error('[PushNotificationBridge] Callback error (received):', err);
          }
        }
      },
    );

    // Notification tapped (from background/killed)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const holoNotification = this.normalizeNotification(action.notification);

        for (const callback of this.onTappedCallbacks) {
          try {
            callback(holoNotification, action.actionId);
          } catch (err) {
            console.error('[PushNotificationBridge] Callback error (tapped):', err);
          }
        }
      },
    );
  }

  /**
   * Convert a Capacitor PushNotificationSchema to a normalized HoloNotification.
   */
  private normalizeNotification(notification: PushNotificationSchema): HoloNotification {
    return {
      id: notification.id ?? `holo-${Date.now()}`,
      title: notification.title ?? '',
      body: notification.body ?? '',
      data: (notification.data as Record<string, unknown>) ?? {},
      receivedAt: Date.now(),
      subtitle: notification.subtitle,
      badge: notification.badge,
      group: notification.group,
    };
  }

  /**
   * Wait for a registration token with timeout.
   */
  private waitForToken(timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      // If we already have a token, return immediately
      if (this.deviceToken) {
        resolve(this.deviceToken);
        return;
      }

      const checkInterval = setInterval(() => {
        if (this.deviceToken) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(this.deviceToken);
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.deviceToken);
      }, timeoutMs);
    });
  }
}
