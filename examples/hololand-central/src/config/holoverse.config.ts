/**
 * Hololand Production Configuration
 * 
 * Connects Hololand VR to the Holoverse Private Server
 */

export interface HoloverseConfig {
  // API endpoints
  apiUrl: string;
  realtimeUrl: string;
  brittneyUrl: string;

  // Authentication
  authToken?: string;

  // Features
  features: {
    voiceEnabled: boolean;
    gestureEnabled: boolean;
    multiplayerEnabled: boolean;
    brittneyEnabled: boolean;
    holoscriptLiveCompile: boolean;
  };

  // World defaults
  defaults: {
    worldId: string;
    spawnPosition: [number, number, number];
  };
}

// Production config - connects to hololand.examples.io
export const productionConfig: HoloverseConfig = {
  apiUrl: 'https://hololand.examples.io/api',
  realtimeUrl: 'wss://hololand.examples.io/realtime',
  brittneyUrl: 'https://hololand.examples.io/api/brittney',

  features: {
    voiceEnabled: true,
    gestureEnabled: true,
    multiplayerEnabled: true,
    brittneyEnabled: true,
    holoscriptLiveCompile: true,
  },

  defaults: {
    worldId: 'hololand-central',
    spawnPosition: [0, 1, 0],
  },
};

// Development config - connects to localhost
export const developmentConfig: HoloverseConfig = {
  apiUrl: 'http://localhost:3001/api',
  realtimeUrl: 'ws://localhost:8080',
  brittneyUrl: 'http://localhost:11435',

  features: {
    voiceEnabled: true,
    gestureEnabled: true,
    multiplayerEnabled: true,
    brittneyEnabled: true,
    holoscriptLiveCompile: true,
  },

  defaults: {
    worldId: 'hololand-central',
    spawnPosition: [0, 1, 0],
  },
};

// Get config based on environment
export function getHoloverseConfig(): HoloverseConfig {
  const env = typeof window !== 'undefined' 
    ? (window as any).__HOLOVERSE_ENV__ 
    : process.env.NODE_ENV;

  if (env === 'production') {
    return productionConfig;
  }

  // Check for custom override
  if (typeof window !== 'undefined' && (window as any).__HOLOVERSE_CONFIG__) {
    return (window as any).__HOLOVERSE_CONFIG__;
  }

  return developmentConfig;
}

// Initialize connection
export async function initializeHoloverse(config?: Partial<HoloverseConfig>): Promise<{
  socket: any;
  brittney: any;
}> {
  const finalConfig = { ...getHoloverseConfig(), ...config };

  // Import socket.io client
  const { io } = await import('socket.io-client');
  
  // Connect to realtime server
  const socket = io(finalConfig.realtimeUrl, {
    auth: {
      token: finalConfig.authToken,
    },
    transports: ['websocket'],
  });

  // Setup Brittney VR bridge
  const { createBrittneyVRBridge } = await import('../services/BrittneyVRBridge');
  const runtime = (window as any).__HOLOSCRIPT_RUNTIME__;
  
  const brittney = runtime 
    ? createBrittneyVRBridge(runtime, {
        meshUrl: finalConfig.apiUrl.replace('/api', '').replace('https', 'http'),
        voiceEnabled: finalConfig.features.voiceEnabled,
        gestureEnabled: finalConfig.features.gestureEnabled,
      })
    : null;

  // Auto-join default world
  socket.on('connect', () => {
    console.log('[Holoverse] Connected to realtime server');
    socket.emit('world:join', { worldId: finalConfig.defaults.worldId });
  });

  return { socket, brittney };
}

export default getHoloverseConfig;
