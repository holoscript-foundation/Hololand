/**
 * HoloScript Bootstrap
 *
 * This is the minimal TypeScript bootstrap that loads the HoloScript-first
 * application. It handles:
 * - Loading the app.hsplus composition
 * - Setting up the React Three Fiber canvas
 * - Bridging HoloScript systems to React context
 * - Managing the rendering lifecycle
 *
 * This file is the ~5% TypeScript in our HoloScript-first architecture.
 */

import React, { Suspense, useEffect, useState, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  HoloScriptPlusParser,
  HoloScriptPlusRuntimeImpl,
  HoloScriptLoader,
} from '@holoscript/core';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HoloScriptComposition {
  config: Record<string, any>;
  state: Record<string, any>;
  systems: Record<string, any>;
  pages: Record<string, any>;
  worlds: Record<string, any>;
  templates: Record<string, any>;
  overlays: Record<string, any>;
}

interface AppState {
  currentView: string;
  currentWorld: string | null;
  theme: string;
  user: {
    isFirstVisit: boolean;
    tutorialComplete: boolean;
    discoveredEggs: string[];
  };
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const HoloScriptContext = createContext<{
  composition: HoloScriptComposition | null;
  state: AppState;
  emit: (event: string, data?: any) => void;
  navigate: (path: string) => void;
} | null>(null);

export const useHoloScript = () => {
  const ctx = useContext(HoloScriptContext);
  if (!ctx) throw new Error('useHoloScript must be used within HoloScriptProvider');
  return ctx;
};

// ═══════════════════════════════════════════════════════════════════════════
// HOLOSCRIPT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

function HoloScriptProvider({ children }: { children: React.ReactNode }) {
  const [composition, setComposition] = useState<HoloScriptComposition | null>(null);
  const [state, setState] = useState<AppState>({
    currentView: 'landing',
    currentWorld: null,
    theme: 'cyberpunk',
    user: {
      isFirstVisit: true,
      tutorialComplete: false,
      discoveredEggs: [],
    },
    isLoading: true,
    error: null,
  });

  const routerNavigate = useNavigate();
  const location = useLocation();

  // Load the main composition
  useEffect(() => {
    async function loadComposition() {
      try {
        const loader = new HoloScriptLoader();
        const parser = new HoloScriptPlusParser();

        // Load app.hsplus
        const source = await fetch('/holoscript/app.hsplus').then(r => r.text());
        const ast = parser.parse(source);

        if (!ast.success) {
          throw new Error('Failed to parse app.hsplus: ' + ast.errors?.[0]?.message);
        }

        // Create runtime
        const runtime = new HoloScriptPlusRuntimeImpl();
        const compiled = runtime.compile(ast.program);

        setComposition(compiled as HoloScriptComposition);
        setState(prev => ({ ...prev, isLoading: false }));

        console.log('HoloScript composition loaded successfully');
      } catch (error) {
        console.error('Failed to load HoloScript composition:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    loadComposition();
  }, []);

  // Sync route changes to state
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setState(prev => ({ ...prev, currentView: 'landing' }));
    } else if (path === '/oasis') {
      setState(prev => ({ ...prev, currentView: 'oasis' }));
    } else if (path === '/central') {
      setState(prev => ({ ...prev, currentView: 'central' }));
    } else if (path.startsWith('/world/')) {
      const worldId = path.split('/')[2];
      setState(prev => ({ ...prev, currentView: 'world', currentWorld: worldId }));
    }
  }, [location]);

  // Event emitter
  const emit = (event: string, data?: any) => {
    console.log('[HoloScript Event]', event, data);
    window.dispatchEvent(new CustomEvent(`holoscript:${event}`, { detail: data }));
  };

  // Navigation
  const navigate = (path: string) => {
    if (path === 'back') {
      window.history.back();
    } else {
      routerNavigate(path);
    }
  };

  return (
    <HoloScriptContext.Provider value={{ composition, state, emit, navigate }}>
      {children}
    </HoloScriptContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1>HOLOLAND</h1>
        <p>Loading the metaverse...</p>
        <div className="loading-bar">
          <div className="loading-progress" />
        </div>
      </div>
      <style>{`
        .loading-screen {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .loading-content {
          text-align: center;
          color: white;
        }
        .loading-content h1 {
          font-size: 48px;
          font-weight: 300;
          letter-spacing: 8px;
          margin-bottom: 16px;
          background: linear-gradient(90deg, #667eea, #f093fb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .loading-content p {
          opacity: 0.7;
          margin-bottom: 24px;
        }
        .loading-bar {
          width: 200px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto;
        }
        .loading-progress {
          width: 30%;
          height: 100%;
          background: linear-gradient(90deg, #667eea, #f093fb);
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="error-screen">
      <h1>Something went wrong</h1>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Reload</button>
      <style>{`
        .error-screen {
          position: fixed;
          inset: 0;
          background: #1a0a0a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .error-screen h1 {
          color: #ff6b6b;
          margin-bottom: 16px;
        }
        .error-screen p {
          opacity: 0.7;
          margin-bottom: 24px;
          max-width: 500px;
        }
        .error-screen button {
          padding: 12px 24px;
          background: #667eea;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLOSCRIPT PAGE RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function HoloScriptPage({ pageId }: { pageId: string }) {
  const { composition, state } = useHoloScript();

  if (!composition) return null;

  const page = composition.pages[pageId];
  if (!page) {
    console.warn(`Page not found: ${pageId}`);
    return null;
  }

  // The page's scene content will be rendered by the HoloScript runtime
  // For now, we'll render a placeholder that the runtime will hydrate
  return (
    <group name={`page-${pageId}`}>
      {/* HoloScript runtime will populate this */}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOLOSCRIPT OVERLAY RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function HoloScriptOverlays() {
  const { composition, state } = useHoloScript();

  if (!composition) return null;

  // Render visible overlays
  return (
    <div className="holoscript-overlays">
      {Object.entries(composition.overlays || {}).map(([id, overlay]: [string, any]) => {
        // Check visibility condition
        const isVisible = typeof overlay.visible === 'function'
          ? overlay.visible(state)
          : overlay.visible;

        if (!isVisible) return null;

        return (
          <div
            key={id}
            className={`overlay overlay-${overlay.position || 'center'}`}
            style={{ zIndex: overlay.zIndex || 100 }}
          >
            {/* Overlay content rendered by HoloScript runtime */}
            <div id={`overlay-${id}`} />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// XR STORE
// ═══════════════════════════════════════════════════════════════════════════

const xrStore = createXRStore();

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function HoloScriptApp() {
  const { composition, state, emit } = useHoloScript();

  // Show loading screen while composition loads
  if (state.isLoading) {
    return <LoadingScreen />;
  }

  // Show error screen if composition failed to load
  if (state.error) {
    return <ErrorScreen error={state.error} />;
  }

  return (
    <div className="holoscript-app">
      {/* 3D Canvas */}
      <Canvas
        className="holoscript-canvas"
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            {/* Environment lighting will be set by ThemeSystem */}
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />

            {/* Render current page */}
            <HoloScriptPage pageId={state.currentView} />
          </Suspense>
        </XR>
      </Canvas>

      {/* UI Overlays */}
      <HoloScriptOverlays />

      {/* Global styles */}
      <style>{`
        .holoscript-app {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0a0a1a;
        }
        .holoscript-canvas {
          width: 100%;
          height: 100%;
        }
        .holoscript-overlays {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }
        .holoscript-overlays > * {
          pointer-events: auto;
        }
        .overlay {
          position: absolute;
        }
        .overlay-center {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .overlay-top {
          top: 0;
          left: 0;
          right: 0;
        }
        .overlay-bottom {
          bottom: 0;
          left: 0;
          right: 0;
        }
        .overlay-top-right {
          top: 20px;
          right: 20px;
        }
        .overlay-top-left {
          top: 20px;
          left: 20px;
        }
        .overlay-bottom-left {
          bottom: 20px;
          left: 20px;
        }
        .overlay-bottom-right {
          bottom: 20px;
          right: 20px;
        }
        .overlay-bottom-center {
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
        }
        .overlay-right {
          top: 0;
          right: 0;
          bottom: 0;
          width: 400px;
        }
        .overlay-fullscreen {
          inset: 0;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT WITH ROUTER
// ═══════════════════════════════════════════════════════════════════════════

function Root() {
  return (
    <BrowserRouter>
      <HoloScriptProvider>
        <Routes>
          <Route path="*" element={<HoloScriptApp />} />
        </Routes>
      </HoloScriptProvider>
    </BrowserRouter>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MOUNT
// ═══════════════════════════════════════════════════════════════════════════

export function mountHoloScriptApp(rootElement: HTMLElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}

// Auto-mount if root element exists
if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    mountHoloScriptApp(root);
  }
}
