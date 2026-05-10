import type {
  ComfortLevel,
  ComfortSettings,
  SceneLoadOptions,
  TeleportConfig,
  Teleportable,
  TeleportDestination,
  TeleportOptions,
  TransitionConfig,
  TransitionOptions,
} from './types';

export const EASING_FUNCTIONS = {
  linear: (t: number) => t,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
};

function wait(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isNaN(value) ? 0 : value));
}

export class ComfortManager {
  private settings: Required<ComfortSettings>;
  private vignetteEnabled = false;
  private cageFovEnabled = false;

  constructor(settings: ComfortSettings = {}) {
    this.settings = {
      vignetteIntensity: settings.vignetteIntensity ?? 0.5,
      fovReduction: settings.fovReduction ?? 0.25,
      snapTurnAngle: settings.snapTurnAngle ?? 45,
      tunnelVision: settings.tunnelVision ?? true,
    };
  }

  enableVignette(intensity = this.settings.vignetteIntensity): void {
    this.vignetteEnabled = true;
    this.settings.vignetteIntensity = clamp01(intensity);
  }

  disableVignette(): void {
    this.vignetteEnabled = false;
  }

  applyCageFOV(enabled: boolean): void {
    this.cageFovEnabled = enabled;
  }

  applySettings(settings: ComfortSettings): void {
    this.settings = { ...this.settings, ...settings };
  }

  getState(): Required<ComfortSettings> & { vignetteEnabled: boolean; cageFovEnabled: boolean } {
    return {
      ...this.settings,
      vignetteEnabled: this.vignetteEnabled,
      cageFovEnabled: this.cageFovEnabled,
    };
  }
}

export class TeleportSystem {
  private config: Required<TeleportConfig>;
  private readonly comfortManager: ComfortManager;

  constructor(config: TeleportConfig = {}) {
    this.config = {
      fadeColor: config.fadeColor ?? '#000000',
      fadeDuration: config.fadeDuration ?? 0.5,
      comfort: config.comfort ?? 'medium',
      snapTurn: config.snapTurn ?? true,
      snapAngle: config.snapAngle ?? 45,
      vignette: config.vignette ?? true,
    };
    this.comfortManager = new ComfortManager({ snapTurnAngle: this.config.snapAngle });
  }

  async teleport(player: Teleportable, destination: TeleportDestination, options: TeleportOptions = {}): Promise<void> {
    const durationSeconds = options.fadeDuration ?? this.config.fadeDuration;
    if ((options.vignette ?? this.config.vignette) && this.config.comfort !== 'none') {
      this.comfortManager.enableVignette(this.comfortIntensity(this.config.comfort));
    }

    await wait((durationSeconds * 1000) / 2);
    player.previousPosition = { ...player.position };
    player.position = { ...destination.position };
    player.rotation = destination.rotation ?? player.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
    await wait((durationSeconds * 1000) / 2);

    this.comfortManager.disableVignette();
    options.onComplete?.();
  }

  snapTurn(player: Teleportable, direction: 'left' | 'right'): void {
    if (!this.config.snapTurn) {
      return;
    }

    const angle = ((direction === 'left' ? -this.config.snapAngle : this.config.snapAngle) * Math.PI) / 180;
    const half = angle / 2;
    player.rotation = {
      x: 0,
      y: Math.sin(half),
      z: 0,
      w: Math.cos(half),
    };
  }

  setComfortLevel(level: ComfortLevel): void {
    this.config = { ...this.config, comfort: level };
  }

  getComfortManager(): ComfortManager {
    return this.comfortManager;
  }

  private comfortIntensity(level: ComfortLevel): number {
    return { none: 0, low: 0.25, medium: 0.5, high: 0.75 }[level];
  }
}

export class SceneLoader {
  private readonly loadedScenes = new Set<string>();

  async loadScene(sceneId: string, options: SceneLoadOptions = {}): Promise<{ sceneId: string; loaded: true }> {
    if (options.unloadCurrent) {
      this.loadedScenes.clear();
    }

    for (const progress of [0.2, 0.5, 0.8, 1]) {
      options.onProgress?.(progress);
      await wait(options.preloadAssets ? 25 : 10);
    }

    this.loadedScenes.add(sceneId);
    return { sceneId, loaded: true };
  }

  async preloadScene(sceneId: string): Promise<void> {
    await this.loadScene(sceneId, { preloadAssets: true });
  }

  unloadScene(sceneId: string): boolean {
    return this.loadedScenes.delete(sceneId);
  }

  isLoaded(sceneId: string): boolean {
    return this.loadedScenes.has(sceneId);
  }
}

export class TransitionManager {
  private readonly sceneLoader = new SceneLoader();

  constructor(private readonly config: TransitionConfig = {}) {}

  async transitionToScene(sceneId: string, options: TransitionOptions = {}): Promise<void> {
    const duration = Math.max(0, options.duration ?? 1);
    const loadingScreen = options.loadingScreen ?? this.config.loadingScreen ?? false;
    const started = Date.now();

    options.onProgress?.(0);
    await wait((duration * 1000) / 2);

    await this.sceneLoader.loadScene(sceneId, {
      preloadAssets: loadingScreen,
      onProgress: options.onProgress,
    });

    const minLoadingTime = this.config.minLoadingTime ?? 0;
    const elapsed = Date.now() - started;
    if (elapsed < minLoadingTime) {
      await wait(minLoadingTime - elapsed);
    }

    await wait((duration * 1000) / 2);
    options.onProgress?.(1);
    options.onComplete?.();
  }
}
