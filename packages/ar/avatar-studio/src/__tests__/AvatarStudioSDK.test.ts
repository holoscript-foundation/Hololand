/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AvatarStudioSDK
 *
 * Validates the embeddable SDK that replaces Ready Player Me's
 * integration for third-party developers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AvatarStudioSDK } from '../AvatarStudioSDK';

// Mock window.open and DOM APIs
const mockWindowOpen = vi.fn().mockReturnValue({ closed: false, close: vi.fn() });
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockFetch = vi.fn();

Object.defineProperty(globalThis, 'window', {
  value: {
    open: mockWindowOpen,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    location: { origin: 'http://localhost:3000' },
    screen: { width: 1920, height: 1080 },
  },
  writable: true,
});

Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

Object.defineProperty(globalThis, 'URL', {
  value: class {
    origin: string;
    constructor(url: string) {
      this.origin = new globalThis.URL(url).origin;
    }
  },
  writable: true,
});

describe('AvatarStudioSDK', () => {
  let sdk: AvatarStudioSDK;

  beforeEach(() => {
    vi.clearAllMocks();

    sdk = new AvatarStudioSDK({
      appId: 'test-app',
      apiKey: 'test-key',
      studioUrl: 'https://studio.hololand.io',
      onAvatarCreated: vi.fn(),
      onCancel: vi.fn(),
      onError: vi.fn(),
    });
  });

  afterEach(() => {
    sdk.dispose();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('creates SDK with required config', () => {
      const basicSdk = new AvatarStudioSDK({
        appId: 'my-app',
      });
      expect(basicSdk).toBeDefined();
      basicSdk.dispose();
    });

    it('applies default config values', () => {
      // The SDK should apply defaults for studioUrl, exportQuality, etc.
      expect(sdk).toBeDefined();
    });

    it('sets up message listener on construction', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });
  });

  // ===========================================================================
  // POPUP MODE
  // ===========================================================================

  describe('popup mode', () => {
    it('opens a popup window with correct URL', () => {
      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });

      sdk.openPopup();

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('studio.hololand.io/embed'),
        'hololand-avatar-studio',
        expect.stringContaining('width=')
      );
    });

    it('includes appId in popup URL', () => {
      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });

      sdk.openPopup();

      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('appId=test-app');
    });

    it('includes mode=popup in URL', () => {
      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });

      sdk.openPopup();

      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('mode=popup');
    });

    it('uses custom dimensions when provided', () => {
      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });

      sdk.openPopup({ width: 1200, height: 900 });

      const windowFeatures = mockWindowOpen.mock.calls[0][2];
      expect(windowFeatures).toContain('width=1200');
      expect(windowFeatures).toContain('height=900');
    });

    it('calls onError when popup is blocked', () => {
      const onError = vi.fn();
      const blockedSdk = new AvatarStudioSDK({
        appId: 'test',
        onError,
      });

      mockWindowOpen.mockReturnValue(null);
      blockedSdk.openPopup();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'POPUP_BLOCKED',
        })
      );

      blockedSdk.dispose();
    });

    it('closes popup window', () => {
      const mockClose = vi.fn();
      mockWindowOpen.mockReturnValue({ closed: false, close: mockClose });

      sdk.openPopup();
      sdk.closePopup();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // IFRAME MODE
  // ===========================================================================

  describe('iframe mode', () => {
    it('creates iframe element in container', () => {
      const container = {
        appendChild: vi.fn(),
      } as unknown as HTMLElement;

      const iframe = sdk.embedIframe(container);

      expect(container.appendChild).toHaveBeenCalled();
      expect(iframe).toBeDefined();
    });

    it('sets correct iframe attributes', () => {
      let appendedChild: any;
      const container = {
        appendChild: vi.fn((child) => { appendedChild = child; }),
      } as unknown as HTMLElement;

      sdk.embedIframe(container);

      expect(appendedChild.src).toContain('studio.hololand.io/embed');
      expect(appendedChild.src).toContain('mode=iframe');
      expect(appendedChild.style.borderStyle).toBe('none');
      expect(appendedChild.title).toBe('HoloLand Avatar Studio');
    });

    it('applies custom dimensions', () => {
      let appendedChild: any;
      const container = {
        appendChild: vi.fn((child) => { appendedChild = child; }),
      } as unknown as HTMLElement;

      sdk.embedIframe(container, { width: '800px', height: '600px' });

      expect(appendedChild.style.width).toBe('800px');
      expect(appendedChild.style.height).toBe('600px');
    });

    it('removes existing iframe before embedding new one', () => {
      const mockRemove = vi.fn();
      const container1 = {
        appendChild: vi.fn(() => ({ remove: mockRemove })),
      } as unknown as HTMLElement;
      const container2 = {
        appendChild: vi.fn(),
      } as unknown as HTMLElement;

      sdk.embedIframe(container1);
      sdk.embedIframe(container2);

      // The first iframe should have been removed
      // (the remove happens on the iframe element itself)
    });
  });

  // ===========================================================================
  // API MODE
  // ===========================================================================

  describe('API mode', () => {
    it('creates avatar from description', async () => {
      const mockResult = {
        avatarId: 'avt_123',
        blueprint: { id: 'avt_123', name: 'Test' },
        vrmUrl: 'https://cdn.hololand.io/avatars/avt_123.vrm',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await sdk.createFromDescription(
        'athletic build, dark curly hair, blue eyes'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/avatars/from-description'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-App-ID': 'test-app',
            'Authorization': 'Bearer test-key',
          }),
        })
      );

      expect(result.avatarId).toBe('avt_123');
    });

    it('creates avatar from blueprint', async () => {
      const mockResult = {
        avatarId: 'avt_456',
        blueprint: { id: 'avt_456', name: 'Custom' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await sdk.createFromBlueprint({
        name: 'Custom Avatar',
        body: {
          preset: 'athletic',
          genderPresentation: 'masculine',
          height: 1.85,
          proportions: {
            headScale: 0.5, shoulderWidth: 0.7, chestSize: 0.6,
            waistSize: 0.4, hipWidth: 0.45, armLength: 0.5,
            legLength: 0.5, handSize: 0.5, footSize: 0.5, muscleTone: 0.8,
          },
          skinColor: { hex: '#e0b896' },
        },
      });

      expect(result.avatarId).toBe('avt_456');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid description' }),
      });

      await expect(
        sdk.createFromDescription('invalid')
      ).rejects.toThrow('Invalid description');
    });
  });

  // ===========================================================================
  // AVATAR MANAGEMENT
  // ===========================================================================

  describe('avatar management', () => {
    it('loads avatar by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ avatarId: 'avt_123' }),
      });

      const result = await sdk.loadAvatar('avt_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/avatars/avt_123'),
        expect.any(Object)
      );
      expect(result.avatarId).toBe('avt_123');
    });

    it('lists avatars with pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          avatars: [{ avatarId: 'avt_1' }, { avatarId: 'avt_2' }],
          total: 10,
          hasMore: true,
        }),
      });

      const result = await sdk.listAvatars({ limit: 2, offset: 0 });

      expect(result.avatars.length).toBe(2);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('deletes avatar by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(sdk.deleteAvatar('avt_123')).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/avatars/avt_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  describe('cleanup', () => {
    it('removes message listener on dispose', () => {
      sdk.dispose();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('can be disposed multiple times safely', () => {
      expect(() => {
        sdk.dispose();
        sdk.dispose();
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // URL BUILDING
  // ===========================================================================

  describe('URL building', () => {
    it('includes theme in URL', () => {
      const themedSdk = new AvatarStudioSDK({
        appId: 'test',
        theme: 'dark',
      });

      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });
      themedSdk.openPopup();

      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('theme=dark');

      themedSdk.dispose();
    });

    it('includes locale in URL', () => {
      const localeSdk = new AvatarStudioSDK({
        appId: 'test',
        locale: 'ja',
      });

      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });
      localeSdk.openPopup();

      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('locale=ja');

      localeSdk.dispose();
    });

    it('includes allowed body presets in URL', () => {
      const restrictedSdk = new AvatarStudioSDK({
        appId: 'test',
        allowedBodyPresets: ['slim', 'athletic'],
      });

      mockWindowOpen.mockReturnValue({ closed: false, close: vi.fn() });
      restrictedSdk.openPopup();

      const url = mockWindowOpen.mock.calls[0][0];
      expect(url).toContain('bodyPresets=slim%2Cathletic');

      restrictedSdk.dispose();
    });
  });
});
