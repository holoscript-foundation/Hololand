/**
 * Test setup — jsdom mocks for the HTML <model> element
 *
 * Since jsdom does not implement the <model> element, we need to mock
 * HTMLModelElement and its API for testing. This file provides comprehensive
 * mocks that simulate the native element's behavior.
 *
 * @module model-viewer/__tests__/setup
 */

import { vi } from 'vitest';

// ─── Mock HTMLModelElement ──────────────────────────────────────────────────

/**
 * Create a mock HTMLModelElement with all API methods stubbed.
 * Returns a div element augmented with the model element API.
 */
export function createMockModelElement(options?: {
  readyResolves?: boolean;
  animations?: Array<{ name: string; duration: number }>;
  entityNames?: string[];
  duration?: number;
}): any {
  const {
    readyResolves = true,
    animations = [],
    entityNames = [],
    duration = 10,
  } = options || {};

  let readyResolve: () => void;
  let readyReject: (err: Error) => void;
  const readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  // If readyResolves is true, resolve immediately in microtask
  if (readyResolves) {
    queueMicrotask(() => readyResolve());
  }

  const entityTransforms: Record<string, any> = {};
  for (const name of entityNames) {
    entityTransforms[name] = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  const camera = { pitch: 0, yaw: 0, distance: 5 };

  const mockElement: any = {
    // Source attributes
    src: '',
    alt: '',
    interactive: false,
    autoplay: false,

    // Ready state
    ready: readyPromise,
    complete: readyResolves,

    // Playback
    play: vi.fn(() => {
      mockElement.paused = false;
      mockElement.dispatchEvent(new Event('play'));
    }),
    pause: vi.fn(() => {
      mockElement.paused = true;
      mockElement.dispatchEvent(new Event('pause'));
    }),
    paused: true,
    currentTime: 0,
    duration,
    loop: false,

    // Animations
    animations,
    currentAnimation: animations.length > 0 ? animations[0].name : '',

    // Entity graph
    entityNames,
    getEntityTransform: vi.fn((name: string) => {
      return entityTransforms[name] || null;
    }),
    setEntityTransform: vi.fn((name: string, transform: any) => {
      if (!entityTransforms[name]) {
        throw new Error(`Entity '${name}' not found`);
      }
      entityTransforms[name] = { ...entityTransforms[name], ...transform };
      mockElement.dispatchEvent(
        new CustomEvent('entitychange', {
          detail: { entityName: name, transform: entityTransforms[name] },
        }),
      );
    }),
    getEntityBoundingBox: vi.fn((name: string) => {
      if (!entityTransforms[name]) return null;
      return {
        min: { x: -1, y: -1, z: -1 },
        max: { x: 1, y: 1, z: 1 },
      };
    }),

    // Camera
    getCamera: vi.fn(() => ({ ...camera })),
    setCamera: vi.fn((newCamera: any) => {
      Object.assign(camera, newCamera);
    }),

    // Event handling (use real DOM-like event system)
    _listeners: new Map<string, Set<Function>>(),
    addEventListener: vi.fn(function (this: any, type: string, listener: Function) {
      if (!this._listeners.has(type)) {
        this._listeners.set(type, new Set());
      }
      this._listeners.get(type)!.add(listener);
    }),
    removeEventListener: vi.fn(function (this: any, type: string, listener: Function) {
      this._listeners.get(type)?.delete(listener);
    }),
    dispatchEvent: vi.fn(function (this: any, event: Event) {
      const listeners = this._listeners.get(event.type);
      if (listeners) {
        for (const listener of listeners) {
          listener(event);
        }
      }
      return true;
    }),

    // Internal helpers for tests
    _resolveReady: () => readyResolve(),
    _rejectReady: (err: Error) => readyReject(err),
    _triggerTimeUpdate: (time: number) => {
      mockElement.currentTime = time;
      mockElement.dispatchEvent(new Event('timeupdate'));
    },
    _triggerEnded: () => {
      mockElement.paused = true;
      mockElement.dispatchEvent(new Event('ended'));
    },
    _triggerError: (message: string) => {
      const errorEvent = new ErrorEvent('error', { message });
      mockElement.dispatchEvent(errorEvent);
    },
  };

  return mockElement;
}

/**
 * Install the HTMLModelElement mock on the global window/document.
 * Call this in beforeEach() for tests that need createElement('model')
 * to return a mock element.
 */
export function installModelElementMock(
  mockElement?: any,
): { mockElement: any; cleanup: () => void } {
  const mock = mockElement || createMockModelElement();

  // Store original createElement
  const originalCreateElement = document.createElement.bind(document);

  // Override createElement to return our mock for 'model'
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'model') {
      return mock;
    }
    return originalCreateElement(tagName);
  });

  // Add HTMLModelElement to window (feature detection check)
  (window as any).HTMLModelElement = function HTMLModelElement() {};

  const cleanup = () => {
    spy.mockRestore();
    delete (window as any).HTMLModelElement;
  };

  return { mockElement: mock, cleanup };
}
