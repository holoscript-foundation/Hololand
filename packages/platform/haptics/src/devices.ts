import type {
  FingerHapticOptions,
  FingerHapticPattern,
  HapticDevice,
  HapticHand,
  HapticPattern,
  HapticPatternStep,
  PlayPatternOptions,
  VibrateOptions,
} from './types';

type GamepadHapticActuatorLike = {
  pulse?: (value: number, duration: number) => Promise<boolean>;
  playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>;
  reset?: () => Promise<unknown>;
};

type GamepadLike = Gamepad & {
  hapticActuators?: GamepadHapticActuatorLike[];
  vibrationActuator?: GamepadHapticActuatorLike;
};

type XRInputSourceLike = {
  handedness?: string;
  gamepad?: GamepadLike;
};

type XRSessionLike = {
  inputSources?: Iterable<XRInputSourceLike>;
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function wait(duration: number): Promise<void> {
  if (duration <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function handMatches(requested: HapticHand, handedness?: string): boolean {
  return requested === 'both' || handedness === requested || !handedness;
}

function getIntensityForStep(step: HapticPatternStep): number {
  switch (step.type) {
    case 'wait':
      return 0;
    case 'ramp':
      return clamp01(step.to ?? step.from ?? 0);
    case 'sine':
    case 'square':
    case 'triangle':
      return clamp01(step.amplitude ?? 0);
    case 'pulse':
    default:
      return clamp01(step.intensity ?? 0);
  }
}

function normalizeSpeed(speed: number | undefined): number {
  if (!speed || Number.isNaN(speed)) {
    return 1;
  }
  return Math.max(0.1, Math.min(4, speed));
}

async function pulseActuator(actuator: GamepadHapticActuatorLike, intensity: number, duration: number): Promise<void> {
  if (duration === Infinity) {
    duration = 60_000;
  }

  if (actuator.pulse) {
    await actuator.pulse(clamp01(intensity), duration);
    return;
  }

  if (actuator.playEffect) {
    await actuator.playEffect('dual-rumble', {
      duration,
      strongMagnitude: clamp01(intensity),
      weakMagnitude: clamp01(intensity),
    });
  }
}

async function stopActuator(actuator: GamepadHapticActuatorLike): Promise<void> {
  if (actuator.reset) {
    await actuator.reset();
    return;
  }

  await pulseActuator(actuator, 0, 1);
}

function actuatorsForGamepad(gamepad: GamepadLike): GamepadHapticActuatorLike[] {
  const actuators = [...(gamepad.hapticActuators ?? [])];
  if (gamepad.vibrationActuator) {
    actuators.push(gamepad.vibrationActuator);
  }
  return actuators;
}

export abstract class HapticDeviceAdapter implements HapticDevice {
  abstract readonly id: string;
  abstract readonly name: string;

  abstract isSupported(): boolean | Promise<boolean>;

  abstract vibrate(hand: HapticHand, intensity: number, duration: number): Promise<void>;

  async stop(_hand?: HapticHand): Promise<void> {
    return Promise.resolve();
  }
}

export class WebXRControllerAdapter extends HapticDeviceAdapter {
  readonly id = 'webxr-controller';
  readonly name = 'WebXR Controller Haptics';

  constructor(private readonly session?: XRSessionLike) {
    super();
  }

  isSupported(): boolean {
    if (this.session?.inputSources) {
      return [...this.session.inputSources].some((source) => actuatorsForGamepad(source.gamepad as GamepadLike).length > 0);
    }

    return typeof navigator !== 'undefined' && 'xr' in navigator;
  }

  async vibrate(hand: HapticHand, intensity: number, duration: number): Promise<void> {
    const sources = [...(this.session?.inputSources ?? [])].filter((source) => handMatches(hand, source.handedness));
    const actuators = sources.flatMap((source) => (source.gamepad ? actuatorsForGamepad(source.gamepad) : []));

    await Promise.all(actuators.map((actuator) => pulseActuator(actuator, intensity, duration)));
  }

  async stop(hand?: HapticHand): Promise<void> {
    const sources = [...(this.session?.inputSources ?? [])].filter((source) => handMatches(hand ?? 'both', source.handedness));
    const actuators = sources.flatMap((source) => (source.gamepad ? actuatorsForGamepad(source.gamepad) : []));

    await Promise.all(actuators.map(stopActuator));
  }
}

export class GamepadAdapter extends HapticDeviceAdapter {
  readonly id = 'gamepad';
  readonly name = 'Gamepad Haptics';

  isSupported(): boolean {
    return this.getGamepads().some((gamepad) => actuatorsForGamepad(gamepad).length > 0);
  }

  async vibrate(hand: HapticHand, intensity: number, duration: number): Promise<void> {
    const targets = this.getGamepadsForHand(hand);
    const actuators = targets.flatMap(actuatorsForGamepad);

    await Promise.all(actuators.map((actuator) => pulseActuator(actuator, intensity, duration)));
  }

  async stop(hand?: HapticHand): Promise<void> {
    const actuators = this.getGamepadsForHand(hand ?? 'both').flatMap(actuatorsForGamepad);

    await Promise.all(actuators.map(stopActuator));
  }

  private getGamepads(): GamepadLike[] {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return [];
    }

    return navigator.getGamepads().filter((gamepad): gamepad is GamepadLike => Boolean(gamepad));
  }

  private getGamepadsForHand(hand: HapticHand): GamepadLike[] {
    const gamepads = this.getGamepads();
    if (hand === 'both') {
      return gamepads;
    }

    const targetIndex = hand === 'left' ? 0 : 1;
    return gamepads[targetIndex] ? [gamepads[targetIndex]] : gamepads;
  }
}

export class HapticManager {
  private readonly devices = new Map<string, HapticDeviceAdapter>();
  private playbackToken = 0;

  constructor(devices: HapticDeviceAdapter[] = [new GamepadAdapter()]) {
    devices.forEach((device) => this.registerDevice(device));
  }

  registerDevice(device: HapticDeviceAdapter): this {
    this.devices.set(device.id, device);
    return this;
  }

  unregisterDevice(deviceId: string): this {
    this.devices.delete(deviceId);
    return this;
  }

  getDevices(): HapticDeviceAdapter[] {
    return [...this.devices.values()];
  }

  isSupported(): boolean {
    return this.getDevices().some((device) => Boolean(device.isSupported()));
  }

  async vibrate(options: VibrateOptions): Promise<void> {
    await this.dispatchVibration(options.hand, options.intensity, options.duration);
  }

  async playPattern(pattern: HapticPattern, options: PlayPatternOptions = {}): Promise<void> {
    const hand = options.hand ?? 'both';
    const speed = normalizeSpeed(options.speed);
    const repeat = options.loop ? Infinity : (pattern.repeat ?? 1);
    const token = ++this.playbackToken;

    let iteration = 0;
    while (token === this.playbackToken && iteration < repeat) {
      for (const patternStep of pattern.steps) {
        if (token !== this.playbackToken) {
          return;
        }

        const duration = patternStep.duration === Infinity ? 60_000 : Math.round(patternStep.duration / speed);
        const intensity = getIntensityForStep(patternStep);
        await this.dispatchVibration(hand, intensity, duration);
        await wait(duration);
      }

      iteration += 1;
    }
  }

  async playFingerPattern(pattern: FingerHapticPattern, options: FingerHapticOptions = {}): Promise<void> {
    const hand = options.hand ?? 'right';
    const steps: HapticPatternStep[] = pattern.steps.map((fingerStep) => {
      const intensities = Object.values(fingerStep.fingers).map(getIntensityForStep);
      return {
        type: 'pulse',
        intensity: intensities.length > 0 ? Math.max(...intensities) : 0,
        duration: fingerStep.duration,
      };
    });

    await this.playPattern({ steps, repeat: pattern.repeat }, { ...options, hand });
  }

  async stop(hand?: HapticHand): Promise<void> {
    this.playbackToken += 1;
    await Promise.all(this.getDevices().map((device) => device.stop(hand)));
  }

  private async dispatchVibration(hand: HapticHand, intensity: number, duration: number): Promise<void> {
    const supportedDevices = await Promise.all(
      this.getDevices().map(async (device) => ({
        device,
        supported: await device.isSupported(),
      }))
    );

    await Promise.all(
      supportedDevices
        .filter(({ supported }) => supported)
        .map(({ device }) => device.vibrate(hand, clamp01(intensity), Math.max(0, Math.round(duration))))
    );
  }
}

export function createHapticManager(devices?: HapticDeviceAdapter[]): HapticManager {
  return new HapticManager(devices);
}
