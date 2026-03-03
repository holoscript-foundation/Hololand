import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.hololand.app',
  appName: 'HoloLand',
  webDir: '../../playground',

  server: {
    // Live reload during development - point to local dev server
    // Uncomment and set the URL when running `pnpm playground` for dev
    // url: 'http://localhost:5173',
    cleartext: true,
    allowNavigation: ['*.hololand.io', 'central.hololand.io'],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#030712',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
      splashFullScreen: true,
    },

    StatusBar: {
      style: 'DARK' as const,
      backgroundColor: '#030712',
      overlaysWebView: false,
    },

    Keyboard: {
      resize: 'body' as const,
      resizeOnFullScreen: true,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Camera: {
      // Default camera preferences
    },

    Haptics: {
      // Uses system defaults
    },

    Browser: {
      // Uses system defaults for in-app browser
    },
  },

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#030712',
    preferredContentMode: 'mobile',
  },

  // Android-specific configuration
  android: {
    backgroundColor: '#030712',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    useLegacyBridge: false,
  },
};

export default config;
