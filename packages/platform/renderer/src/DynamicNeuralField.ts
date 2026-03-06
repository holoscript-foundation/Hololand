/**
 * DynamicNeuralField
 *
 * Implements the Amari neural field equation for continuous attractor dynamics
 * on a discretized 2D surface. This provides the mathematical core for spatial
 * attention, working memory, and decision-making in VR world state cognition.
 *
 * AMARI EQUATION (discretized):
 *   tau * du(x,t)/dt = -u(x,t) + h + S(x,t) + sum_x'{ w(x-x') * f(u(x',t)) * dx' }
 *
 * Implemented as forward Euler integration:
 *   u(t+dt) = u(t) + (dt/tau) * [-u(t) + h + S(x,t) + conv(w, f(u))]
 *
 * KEY BEHAVIORS:
 *   1. Self-sustaining peaks: Once activation exceeds threshold, local excitation
 *      maintains a "bump" even after input is removed (working memory).
 *   2. Winner-take-all: Global/surround inhibition causes competition between
 *      bumps. Strongest input wins, weaker inputs are suppressed.
 *   3. Detection: Subthreshold activation can integrate input over time and
 *      produce a detection decision when threshold is crossed.
 *   4. Tracking: Peaks follow moving inputs, providing smooth spatial tracking.
 *
 * PERFORMANCE BUDGET:
 *   64x64 field, convolution via direct computation:
 *     Kernel precompute: ~1ms (once)
 *     Per timestep: ~0.3-0.8ms (CPU, convolution-dominated)
 *     Memory: ~64KB for field + kernel
 *   Runs at 5-10Hz OFF the render loop.
 *
 * @module DynamicNeuralField
 */

import { logger } from './logger';
import type {
  DynamicNeuralFieldConfig,
  DNFFieldState,
  DNFFieldStatistics,
  DNFPeak,
  DNFKernelConfig,
  DNFActivationConfig,
} from './DynamicNeuralFieldTypes';
import {
  DEFAULT_DNF_CONFIG,
  createEmptyDNFFieldState,
  createEmptyDNFStatistics,
} from './DynamicNeuralFieldTypes';

// =============================================================================
// DYNAMIC NEURAL FIELD
// =============================================================================

export class DynamicNeuralField {
  private readonly config: DynamicNeuralFieldConfig;
  private state: DNFFieldState;

  // Precomputed kernel (convolution weights)
  private kernelWeights: Float32Array;
  private kernelWidth: number;
  private kernelHeight: number;

  // Performance tracking
  private lastStepTimeMs: number = 0;
  private lastConvolutionTimeMs: number = 0;
  private stepTimesHistory: number[] = [];
  private readonly MAX_HISTORY = 30;

  // Peak tracking
  private previousPeaks: DNFPeak[] = [];
  private peakStabilityCount: Map<string, number> = new Map();
  private readonly PEAK_STABILITY_THRESHOLD = 3; // timesteps to consider stable

  // Snapshot counter
  private snapshotCounter: number = 0;

  constructor(config?: Partial<DynamicNeuralFieldConfig>) {
    this.config = { ...DEFAULT_DNF_CONFIG, ...config };

    // Initialize field state
    this.state = createEmptyDNFFieldState(
      this.config.width,
      this.config.height,
      this.config.restingLevel,
    );

    // Precompute kernel
    this.kernelWidth = 0;
    this.kernelHeight = 0;
    this.kernelWeights = new Float32Array(0);
    this.precomputeKernel();

    logger.info('[DynamicNeuralField] Initialized', {
      label: this.config.label,
      size: `${this.config.width}x${this.config.height}`,
      tau: this.config.tau,
      restingLevel: this.config.restingLevel,
      kernelType: this.config.kernel.type,
    });
  }

  // ===========================================================================
  // PUBLIC API: SIMULATION
  // ===========================================================================

  /**
   * Advance the field by one timestep using forward Euler integration.
   *
   * Implements:
   *   u(t+dt) = u(t) + (dt/tau) * [-u(t) + h + S(x,t) + conv(w, f(u))]
   *
   * @param externalInput - Optional external input S(x,t). If provided, replaces current input.
   */
  step(externalInput?: Float32Array): void {
    const startTime = performance.now();

    const { width, height, tau, restingLevel, dt, noiseAmplitude } = this.config;
    const size = width * height;
    const { activation, output, input } = this.state;

    // Apply external input if provided
    if (externalInput) {
      const copyLen = Math.min(externalInput.length, size);
      input.set(externalInput.subarray(0, copyLen));
    }

    // Step 1: Compute firing rate f(u) for current activation
    this.computeActivationFunction(activation, output);

    // Step 2: Compute convolution: interaction = conv(kernel, output)
    const convStart = performance.now();
    const interaction = this.convolve(output);
    this.lastConvolutionTimeMs = performance.now() - convStart;

    // Step 3: Euler integration of Amari equation
    const dtOverTau = dt / tau;
    for (let i = 0; i < size; i++) {
      // du/dt = -u + h + S + interaction
      const rhs = -activation[i] + restingLevel + input[i] + interaction[i];

      // Add noise if configured
      let noise = 0;
      if (noiseAmplitude > 0) {
        // Box-Muller transform for Gaussian noise
        noise = noiseAmplitude * gaussianRandom();
      }

      activation[i] = activation[i] + dtOverTau * rhs + noise;
    }

    // Update state metadata
    this.state.simulationTime += dt;
    this.state.timestepCount++;

    // Track performance
    this.lastStepTimeMs = performance.now() - startTime;
    this.stepTimesHistory.push(this.lastStepTimeMs);
    if (this.stepTimesHistory.length > this.MAX_HISTORY) {
      this.stepTimesHistory.shift();
    }
  }

  /**
   * Run multiple timesteps in sequence.
   *
   * @param steps - Number of timesteps to simulate
   * @param externalInput - Optional input applied on the first step
   */
  stepMultiple(steps: number, externalInput?: Float32Array): void {
    for (let i = 0; i < steps; i++) {
      this.step(i === 0 ? externalInput : undefined);
    }
  }

  /**
   * Reset the field to resting state.
   */
  reset(): void {
    this.state = createEmptyDNFFieldState(
      this.config.width,
      this.config.height,
      this.config.restingLevel,
    );
    this.previousPeaks = [];
    this.peakStabilityCount.clear();
    this.stepTimesHistory = [];

    logger.debug('[DynamicNeuralField] Reset', { label: this.config.label });
  }

  // ===========================================================================
  // PUBLIC API: INPUT
  // ===========================================================================

  /**
   * Set external input for the entire field.
   *
   * @param input - Float32Array of size width * height
   */
  setInput(input: Float32Array): void {
    const size = this.config.width * this.config.height;
    const copyLen = Math.min(input.length, size);
    this.state.input.set(input.subarray(0, copyLen));
  }

  /**
   * Add a Gaussian input stimulus at a specific field position.
   *
   * @param centerX - Center X position in field coordinates
   * @param centerY - Center Y position in field coordinates
   * @param amplitude - Peak amplitude of the Gaussian
   * @param sigma - Width (standard deviation) of the Gaussian
   */
  addGaussianInput(
    centerX: number,
    centerY: number,
    amplitude: number,
    sigma: number,
  ): void {
    const { width, height } = this.config;
    const { input } = this.state;
    const twoSigmaSq = 2 * sigma * sigma;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;
        const value = amplitude * Math.exp(-distSq / twoSigmaSq);
        input[y * width + x] += value;
      }
    }
  }

  /**
   * Clear all external input.
   */
  clearInput(): void {
    this.state.input.fill(0);
  }

  // ===========================================================================
  // PUBLIC API: STATE ACCESS
  // ===========================================================================

  /**
   * Get the current field state (read-only reference).
   */
  getState(): Readonly<DNFFieldState> {
    return this.state;
  }

  /**
   * Get the activation array (read-only copy).
   */
  getActivation(): Float32Array {
    return new Float32Array(this.state.activation);
  }

  /**
   * Get the output (firing rate) array (read-only copy).
   */
  getOutput(): Float32Array {
    // Recompute output for current activation
    this.computeActivationFunction(this.state.activation, this.state.output);
    return new Float32Array(this.state.output);
  }

  /**
   * Get activation at a specific field position.
   */
  getActivationAt(x: number, y: number): number {
    const { width, height } = this.config;
    if (x < 0 || x >= width || y < 0 || y >= height) return this.config.restingLevel;
    return this.state.activation[y * width + x];
  }

  /**
   * Get field dimensions.
   */
  getWidth(): number {
    return this.config.width;
  }

  getHeight(): number {
    return this.config.height;
  }

  /**
   * Get the field configuration.
   */
  getConfig(): Readonly<DynamicNeuralFieldConfig> {
    return this.config;
  }

  /**
   * Get the simulation time.
   */
  getSimulationTime(): number {
    return this.state.simulationTime;
  }

  /**
   * Get the timestep count.
   */
  getTimestepCount(): number {
    return this.state.timestepCount;
  }

  // ===========================================================================
  // PUBLIC API: ANALYSIS
  // ===========================================================================

  /**
   * Compute comprehensive field statistics.
   */
  computeStatistics(): DNFFieldStatistics {
    const { activation, output, input, width, height } = this.state;
    const size = width * height;

    if (size === 0) return createEmptyDNFStatistics();

    // Recompute output for accuracy
    this.computeActivationFunction(activation, output);

    // Basic statistics
    let sum = 0;
    let sumSq = 0;
    let max = -Infinity;
    let min = Infinity;
    let outputSum = 0;
    let activeCount = 0;
    let inputSum = 0;

    for (let i = 0; i < size; i++) {
      const u = activation[i];
      sum += u;
      sumSq += u * u;
      if (u > max) max = u;
      if (u < min) min = u;
      outputSum += output[i];
      if (output[i] > 0.5) activeCount++;
      inputSum += Math.abs(input[i]);
    }

    const mean = sum / size;
    const variance = sumSq / size - mean * mean;
    const std = Math.sqrt(Math.max(0, variance));

    // Detect peaks
    const peaks = this.detectPeaks();

    return {
      meanActivation: mean,
      maxActivation: max,
      minActivation: min,
      stdActivation: std,
      meanOutput: outputSum / size,
      activePositionCount: activeCount,
      activeFraction: activeCount / size,
      peaks,
      totalInputStrength: inputSum,
    };
  }

  /**
   * Detect peaks (bumps) in the activation field.
   *
   * Uses local maximum detection with a flood-fill to find connected
   * supra-threshold regions and their properties.
   */
  detectPeaks(): DNFPeak[] {
    const { activation, width, height } = this.state;
    const { threshold } = this.config.activation;
    const size = width * height;
    const visited = new Uint8Array(size);
    const peaks: DNFPeak[] = [];

    // Recompute output
    this.computeActivationFunction(activation, this.state.output);

    // Find connected supra-threshold regions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx] || this.state.output[idx] < 0.5) continue;

        // Flood fill to find connected region
        const region: number[] = [];
        const stack: number[] = [idx];
        let maxVal = -Infinity;
        let maxIdx = idx;

        while (stack.length > 0) {
          const current = stack.pop()!;
          if (visited[current]) continue;
          visited[current] = 1;

          if (this.state.output[current] < 0.5) continue;

          region.push(current);
          if (activation[current] > maxVal) {
            maxVal = activation[current];
            maxIdx = current;
          }

          // 4-connected neighbors
          const cx = current % width;
          const cy = Math.floor(current / width);
          if (cx > 0) stack.push(current - 1);
          if (cx < width - 1) stack.push(current + 1);
          if (cy > 0) stack.push(current - width);
          if (cy < height - 1) stack.push(current + width);
        }

        if (region.length === 0) continue;

        // Compute peak properties
        const peakX = maxIdx % width;
        const peakY = Math.floor(maxIdx / width);

        // Mass: sum of above-threshold activation
        let mass = 0;
        let sumDist2 = 0;
        for (const ri of region) {
          mass += activation[ri] - threshold;
          const rx = ri % width;
          const ry = Math.floor(ri / width);
          const dx = rx - peakX;
          const dy = ry - peakY;
          sumDist2 += dx * dx + dy * dy;
        }

        const peakWidth = region.length > 1
          ? Math.sqrt(sumDist2 / region.length)
          : 1;

        // Check stability
        const peakKey = `${Math.round(peakX / 3)},${Math.round(peakY / 3)}`;
        const prevCount = this.peakStabilityCount.get(peakKey) ?? 0;
        this.peakStabilityCount.set(peakKey, prevCount + 1);

        peaks.push({
          position: [peakX, peakY],
          normalizedPosition: [peakX / (width - 1), peakY / (height - 1)],
          amplitude: maxVal,
          width: peakWidth,
          mass,
          isStable: (prevCount + 1) >= this.PEAK_STABILITY_THRESHOLD,
        });
      }
    }

    // Clean up stability tracking for peaks that disappeared
    const currentPeakKeys = new Set(
      peaks.map(p => `${Math.round(p.position[0] / 3)},${Math.round(p.position[1] / 3)}`),
    );
    for (const key of this.peakStabilityCount.keys()) {
      if (!currentPeakKeys.has(key)) {
        this.peakStabilityCount.delete(key);
      }
    }

    this.previousPeaks = peaks;
    return peaks;
  }

  // ===========================================================================
  // PUBLIC API: PERFORMANCE
  // ===========================================================================

  /**
   * Get the last step execution time in ms.
   */
  getLastStepTimeMs(): number {
    return this.lastStepTimeMs;
  }

  /**
   * Get the last convolution execution time in ms.
   */
  getLastConvolutionTimeMs(): number {
    return this.lastConvolutionTimeMs;
  }

  /**
   * Get average step time over recent history.
   */
  getAverageStepTimeMs(): number {
    if (this.stepTimesHistory.length === 0) return 0;
    return this.stepTimesHistory.reduce((a, b) => a + b, 0) / this.stepTimesHistory.length;
  }

  /**
   * Get peak step time over recent history.
   */
  getPeakStepTimeMs(): number {
    if (this.stepTimesHistory.length === 0) return 0;
    return Math.max(...this.stepTimesHistory);
  }

  /**
   * Get the next snapshot ID (auto-incrementing).
   */
  getNextSnapshotId(): number {
    return ++this.snapshotCounter;
  }

  // ===========================================================================
  // PUBLIC API: KERNEL ACCESS
  // ===========================================================================

  /**
   * Get the precomputed kernel weights.
   */
  getKernelWeights(): Float32Array {
    return new Float32Array(this.kernelWeights);
  }

  /**
   * Get kernel dimensions.
   */
  getKernelSize(): [number, number] {
    return [this.kernelWidth, this.kernelHeight];
  }

  // ===========================================================================
  // INTERNAL: ACTIVATION FUNCTION
  // ===========================================================================

  /**
   * Compute f(u) for all field positions.
   */
  private computeActivationFunction(
    activation: Float32Array,
    output: Float32Array,
  ): void {
    const { type, beta, threshold } = this.config.activation;
    const size = activation.length;

    switch (type) {
      case 'sigmoid':
        for (let i = 0; i < size; i++) {
          output[i] = 1.0 / (1.0 + Math.exp(-beta * (activation[i] - threshold)));
        }
        break;

      case 'heaviside':
        for (let i = 0; i < size; i++) {
          output[i] = activation[i] > threshold ? 1.0 : 0.0;
        }
        break;

      case 'piecewise-linear':
        for (let i = 0; i < size; i++) {
          output[i] = Math.max(0, Math.min(1, (activation[i] - threshold) * beta));
        }
        break;
    }
  }

  // ===========================================================================
  // INTERNAL: CONVOLUTION
  // ===========================================================================

  /**
   * Compute spatial convolution of output field with interaction kernel.
   *
   * For a 2D field: result(x,y) = sum_{dx,dy} kernel(dx,dy) * field(x+dx, y+dy)
   *
   * Boundary handling: zero-padding (default) or periodic wrapping.
   */
  private convolve(field: Float32Array): Float32Array {
    const { width, height, periodicBoundary } = this.config;
    const size = width * height;
    const result = new Float32Array(size);

    const kHalfW = Math.floor(this.kernelWidth / 2);
    const kHalfH = Math.floor(this.kernelHeight / 2);

    for (let fy = 0; fy < height; fy++) {
      for (let fx = 0; fx < width; fx++) {
        let sum = 0;

        for (let ky = 0; ky < this.kernelHeight; ky++) {
          for (let kx = 0; kx < this.kernelWidth; kx++) {
            let sx = fx + (kx - kHalfW);
            let sy = fy + (ky - kHalfH);

            if (periodicBoundary) {
              sx = ((sx % width) + width) % width;
              sy = ((sy % height) + height) % height;
            } else {
              if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
            }

            sum += this.kernelWeights[ky * this.kernelWidth + kx] * field[sy * width + sx];
          }
        }

        // Add global inhibition scaled by mean field activity
        result[fy * width + fx] = sum;
      }
    }

    // Apply global inhibition: subtract mean activity * globalInh weight
    if (this.config.kernel.globalInhibition !== 0) {
      let fieldMean = 0;
      for (let i = 0; i < size; i++) {
        fieldMean += field[i];
      }
      fieldMean /= size;

      const globalInh = this.config.kernel.globalInhibition * fieldMean;
      for (let i = 0; i < size; i++) {
        result[i] += globalInh;
      }
    }

    return result;
  }

  // ===========================================================================
  // INTERNAL: KERNEL PRECOMPUTATION
  // ===========================================================================

  /**
   * Precompute the interaction kernel weights.
   *
   * The kernel is a 2D array of weights centered at (0,0).
   * Size is determined by the kernel parameters (truncated at ~3 sigma).
   */
  private precomputeKernel(): void {
    const k = this.config.kernel;

    if (k.type === 'custom') {
      if (k.customWeights && k.customSize) {
        this.kernelWidth = k.customSize[0];
        this.kernelHeight = k.customSize[1];
        this.kernelWeights = new Float32Array(k.customWeights);
      } else {
        logger.error('[DynamicNeuralField] Custom kernel requires customWeights and customSize');
        this.kernelWidth = 1;
        this.kernelHeight = 1;
        this.kernelWeights = new Float32Array([1]);
      }
      return;
    }

    // Determine kernel size based on the largest sigma (truncate at 3 sigma)
    const maxSigma = Math.max(k.excSigma, k.inhSigma);
    const radius = Math.ceil(maxSigma * 3);
    this.kernelWidth = radius * 2 + 1;
    this.kernelHeight = this.config.dimensionality === '1d' ? 1 : radius * 2 + 1;

    this.kernelWeights = new Float32Array(this.kernelWidth * this.kernelHeight);

    const centerX = radius;
    const centerY = this.config.dimensionality === '1d' ? 0 : radius;

    for (let ky = 0; ky < this.kernelHeight; ky++) {
      for (let kx = 0; kx < this.kernelWidth; kx++) {
        const dx = kx - centerX;
        const dy = ky - centerY;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        let w: number;

        switch (k.type) {
          case 'mexican-hat': {
            // Difference of Gaussians:
            // w(d) = A_exc * exp(-d^2/(2*sigma_exc^2)) - A_inh * exp(-d^2/(2*sigma_inh^2))
            const exc = k.excAmp * Math.exp(-distSq / (2 * k.excSigma * k.excSigma));
            const inh = k.inhAmp * Math.exp(-distSq / (2 * k.inhSigma * k.inhSigma));
            w = exc - inh;
            break;
          }

          case 'gaussian': {
            // Single Gaussian: w(d) = A_exc * exp(-d^2/(2*sigma^2))
            w = k.excAmp * Math.exp(-distSq / (2 * k.excSigma * k.excSigma));
            break;
          }

          case 'oscillatory': {
            // Damped oscillatory: w(d) = A_exc * exp(-d/sigma) * cos(2*pi*d/wavelength)
            w = k.excAmp * Math.exp(-dist / k.excSigma) *
              Math.cos(2 * Math.PI * dist / k.wavelength);
            break;
          }

          default:
            w = 0;
        }

        this.kernelWeights[ky * this.kernelWidth + kx] = w;
      }
    }

    logger.debug('[DynamicNeuralField] Kernel precomputed', {
      label: this.config.label,
      type: k.type,
      size: `${this.kernelWidth}x${this.kernelHeight}`,
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a Gaussian random number using Box-Muller transform.
 * Returns a value from N(0,1).
 */
function gaussianRandom(): number {
  let u1 = Math.random();
  let u2 = Math.random();
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a DynamicNeuralField with optional configuration.
 */
export function createDynamicNeuralField(
  config?: Partial<DynamicNeuralFieldConfig>,
): DynamicNeuralField {
  return new DynamicNeuralField(config);
}
