/**
 * DynamicNeuralFieldTypes
 *
 * Type definitions for the Dynamic Neural Field (DNF) system based on
 * Amari's neural field theory (Amari, 1977).
 *
 * MATHEMATICAL FOUNDATION:
 * The Amari neural field equation describes the spatiotemporal dynamics
 * of activation u(x, t) across a continuous neural surface:
 *
 *   tau * du(x,t)/dt = -u(x,t) + h + S(x,t) + integral{ w(x - x') * f(u(x',t)) dx' }
 *
 * Where:
 *   u(x,t)   = activation at position x, time t
 *   tau       = time constant (membrane decay)
 *   h         = resting level (negative = subthreshold default)
 *   S(x,t)   = external input stimulus
 *   w(x-x')  = lateral interaction kernel (e.g., Mexican hat)
 *   f(u)      = firing rate function (sigmoid or Heaviside)
 *
 * KERNEL TYPES:
 *   Mexican Hat (Difference of Gaussians):
 *     w(d) = A_exc * exp(-d^2 / (2*sigma_exc^2)) - A_inh * exp(-d^2 / (2*sigma_inh^2))
 *   Local excitation, surround inhibition produces:
 *     - Self-sustaining peaks (working memory)
 *     - Selection / winner-take-all
 *     - Detection decisions
 *
 * DISCRETIZATION:
 *   The continuous field is discretized onto a 2D grid of size (width x height).
 *   The integral becomes a discrete convolution.
 *   Time stepping uses forward Euler: u(t+dt) = u(t) + dt/tau * rhs
 *
 * PERFORMANCE:
 *   64x64 field: ~0.5ms per timestep (CPU)
 *   128x128 field: ~2ms per timestep (CPU)
 *   Runs OFF the 90Hz render loop at 1-10Hz like SNN perception.
 *
 * REFERENCES:
 *   - Amari, S. (1977). Dynamics of pattern formation in lateral-inhibition
 *     type neural fields. Biological Cybernetics, 27(2), 77-87.
 *   - Lava-DNF: https://github.com/lava-nc/lava-dnf
 *   - Schoner, G. (2008). Dynamic Field Theory. In: Dynamic Systems Approaches
 *     to Cognition.
 *
 * @module DynamicNeuralFieldTypes
 */

import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// KERNEL TYPES
// =============================================================================

/**
 * Kernel function type for lateral interaction in the neural field.
 *
 * Determines the spatial connectivity pattern:
 * - 'mexican-hat': Difference of Gaussians (DoG), local excitation + surround inhibition
 * - 'gaussian': Single Gaussian, purely excitatory local coupling
 * - 'oscillatory': Damped oscillatory kernel for pattern formation
 * - 'custom': User-provided kernel weights
 */
export type DNFKernelType = 'mexican-hat' | 'gaussian' | 'oscillatory' | 'custom';

/**
 * Configuration for the lateral interaction kernel w(x - x').
 *
 * For 'mexican-hat' (Difference of Gaussians):
 *   w(d) = excAmp * exp(-d^2 / (2 * excSigma^2)) - inhAmp * exp(-d^2 / (2 * inhSigma^2))
 *
 * For 'gaussian':
 *   w(d) = excAmp * exp(-d^2 / (2 * excSigma^2))
 *
 * For 'oscillatory':
 *   w(d) = excAmp * exp(-d / excSigma) * cos(2*pi*d / wavelength)
 *
 * Where d = |x - x'| is the Euclidean distance between field positions.
 */
export interface DNFKernelConfig {
  /** Kernel type */
  type: DNFKernelType;
  /** Excitatory amplitude (A_exc) */
  excAmp: number;
  /** Excitatory width / sigma (sigma_exc) */
  excSigma: number;
  /** Inhibitory amplitude (A_inh), used for 'mexican-hat' */
  inhAmp: number;
  /** Inhibitory width / sigma (sigma_inh), used for 'mexican-hat'. Should be > excSigma. */
  inhSigma: number;
  /** Global inhibition constant (added uniformly across field) */
  globalInhibition: number;
  /** Oscillatory wavelength, used for 'oscillatory' kernel type */
  wavelength: number;
  /** Custom kernel weights (width x height Float32Array), used for 'custom' type */
  customWeights?: Float32Array;
  /** Custom kernel dimensions [width, height], required for 'custom' type */
  customSize?: [number, number];
}

// =============================================================================
// ACTIVATION (FIRING RATE) FUNCTION TYPES
// =============================================================================

/**
 * Firing rate function type f(u).
 *
 * Maps activation u to output firing rate:
 * - 'sigmoid': f(u) = 1 / (1 + exp(-beta * (u - threshold)))
 * - 'heaviside': f(u) = u > threshold ? 1 : 0
 * - 'piecewise-linear': f(u) = clamp((u - threshold) * beta, 0, 1)
 */
export type DNFActivationFunctionType = 'sigmoid' | 'heaviside' | 'piecewise-linear';

/**
 * Configuration for the firing rate function.
 */
export interface DNFActivationConfig {
  /** Activation function type */
  type: DNFActivationFunctionType;
  /** Steepness parameter (beta). Higher = sharper transition. */
  beta: number;
  /** Firing threshold. Activation below this produces ~0 output. */
  threshold: number;
}

// =============================================================================
// FIELD CONFIGURATION
// =============================================================================

/**
 * Dimensionality of the neural field.
 * - '1d': Linear field (e.g., for angular/directional attention)
 * - '2d': Planar field (e.g., for spatial X-Z ground plane attention)
 */
export type DNFDimensionality = '1d' | '2d';

/**
 * Configuration for a DynamicNeuralField instance.
 */
export interface DynamicNeuralFieldConfig {
  /** Field width (number of discrete positions along X axis) */
  width: number;
  /** Field height (number of discrete positions along Y axis, 1 for 1D fields) */
  height: number;
  /** Field dimensionality */
  dimensionality: DNFDimensionality;
  /** Time constant tau (ms). Controls decay rate. Larger = slower dynamics. */
  tau: number;
  /** Resting level h. Typically negative (subthreshold). Determines excitability. */
  restingLevel: number;
  /** Integration timestep dt (ms). Smaller = more accurate but slower. */
  dt: number;
  /** Lateral interaction kernel configuration */
  kernel: DNFKernelConfig;
  /** Firing rate function configuration */
  activation: DNFActivationConfig;
  /** Whether to apply periodic (toroidal) boundary conditions */
  periodicBoundary: boolean;
  /** Optional noise amplitude (Gaussian noise added each timestep) */
  noiseAmplitude: number;
  /** Optional label for debugging */
  label: string;
}

// =============================================================================
// FIELD STATE
// =============================================================================

/**
 * Current state of a Dynamic Neural Field.
 */
export interface DNFFieldState {
  /** Activation values u(x, t) as a flat Float32Array [width * height] */
  activation: Float32Array;
  /** Output / firing rate values f(u(x, t)) as a flat Float32Array */
  output: Float32Array;
  /** External input S(x, t) currently applied */
  input: Float32Array;
  /** Field width */
  width: number;
  /** Field height */
  height: number;
  /** Current simulation time in ms */
  simulationTime: number;
  /** Total timesteps simulated */
  timestepCount: number;
}

/**
 * A detected peak (bump) in the neural field activation.
 *
 * Peaks represent stable attractor states - locations where the field
 * has self-sustaining above-threshold activation.
 */
export interface DNFPeak {
  /** Peak center position in field coordinates [col, row] */
  position: [number, number];
  /** Peak center in normalized coordinates [0..1, 0..1] */
  normalizedPosition: [number, number];
  /** Peak amplitude (maximum activation value) */
  amplitude: number;
  /** Peak width (standard deviation of activation around peak) */
  width: number;
  /** Total activation mass (sum of above-threshold activation in peak region) */
  mass: number;
  /** Whether this peak is stable (persisted for multiple timesteps) */
  isStable: boolean;
}

/**
 * Field statistics for monitoring and visualization.
 */
export interface DNFFieldStatistics {
  /** Mean activation across the field */
  meanActivation: number;
  /** Maximum activation value */
  maxActivation: number;
  /** Minimum activation value */
  minActivation: number;
  /** Standard deviation of activation */
  stdActivation: number;
  /** Mean output (firing rate) */
  meanOutput: number;
  /** Number of supra-threshold positions (output > 0.5) */
  activePositionCount: number;
  /** Fraction of field that is active */
  activeFraction: number;
  /** Detected peaks */
  peaks: DNFPeak[];
  /** Total input strength (sum of external input) */
  totalInputStrength: number;
}

// =============================================================================
// SPATIAL ATTENTION TYPES
// =============================================================================

/**
 * Mapping from VR world space to neural field coordinates.
 * Defines how 3D world positions map onto the 2D DNF.
 */
export interface DNFWorldMapping {
  /** World-space origin of the mapped region (bottom-left corner) */
  worldOrigin: Vec3;
  /** World-space extent of the mapped region (width, depth, height) */
  worldExtent: Vec3;
  /** Which world axes map to field X and Y. Default: X->fieldX, Z->fieldY */
  axisMapping: {
    fieldX: 'x' | 'y' | 'z';
    fieldY: 'x' | 'y' | 'z';
  };
}

/**
 * Configuration for the SpatialAttentionField wrapper.
 */
export interface SpatialAttentionFieldConfig {
  /** Underlying DNF configuration */
  fieldConfig: DynamicNeuralFieldConfig;
  /** World-space to field coordinate mapping */
  worldMapping: DNFWorldMapping;
  /** How much SNN attention scores are amplified when injected as DNF input */
  snnInputGain: number;
  /** Gaussian sigma for spatially spreading SNN object inputs on the field */
  snnInputSigma: number;
  /** Decay rate for object inputs that are no longer present (0..1, per step) */
  inputDecayRate: number;
  /** Minimum attention score from SNN to inject into DNF (filter noise) */
  snnAttentionThreshold: number;
  /** Maximum number of SNN objects to project onto the field */
  maxProjectedObjects: number;
}

// =============================================================================
// VISUALIZATION DATA
// =============================================================================

/**
 * Visualization snapshot for the NeuralActivityDashboard.
 *
 * Provides all data needed to render:
 * - 2D heatmap of field activation
 * - Peak markers
 * - Input overlay
 * - Statistics panel
 */
export interface DNFVisualizationSnapshot {
  /** Unique snapshot ID */
  snapshotId: number;
  /** Timestamp of this snapshot */
  timestamp: number;
  /** Field label */
  label: string;
  /** Field dimensions */
  width: number;
  height: number;
  /** Activation heatmap values (clamped to [-1, 1] for display) */
  activationHeatmap: Float32Array;
  /** Output (firing rate) values [0, 1] */
  outputHeatmap: Float32Array;
  /** Input stimulus values (for overlay) */
  inputOverlay: Float32Array;
  /** Detected peaks with world-space positions */
  peaks: Array<DNFPeak & {
    /** Peak position in world space (if world mapping available) */
    worldPosition?: Vec3;
  }>;
  /** Field statistics */
  statistics: DNFFieldStatistics;
  /** Performance metrics */
  performance: {
    /** Time for last DNF step in ms */
    stepTimeMs: number;
    /** Time for kernel convolution in ms */
    convolutionTimeMs: number;
    /** Current simulation frequency in Hz */
    currentHz: number;
    /** Total timesteps completed */
    totalTimesteps: number;
  };
}

/**
 * Integration metrics for the SNN-to-DNF bridge.
 */
export interface DNFIntegrationMetrics {
  /** Whether the DNF system is active */
  isActive: boolean;
  /** Whether the SNN perception bridge is connected */
  snnConnected: boolean;
  /** Number of SNN objects currently projected onto the field */
  projectedObjectCount: number;
  /** Current DNF simulation frequency in Hz */
  dnfHz: number;
  /** Current SNN inference frequency in Hz */
  snnHz: number;
  /** Average DNF step time in ms */
  avgStepTimeMs: number;
  /** Peak DNF step time in ms */
  peakStepTimeMs: number;
  /** Total DNF timesteps completed */
  totalTimesteps: number;
  /** Number of stable peaks detected */
  stablePeakCount: number;
  /** Global saliency level (mean output) */
  globalSaliency: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default kernel: Mexican hat with moderate local excitation and broad inhibition.
 * Produces 1-3 stable peaks for typical VR scene inputs.
 */
export const DEFAULT_DNF_KERNEL: DNFKernelConfig = {
  type: 'mexican-hat',
  excAmp: 12.0,
  excSigma: 3.0,
  inhAmp: 6.0,
  inhSigma: 8.0,
  globalInhibition: -0.85,
  wavelength: 10.0,
};

/**
 * Default activation function: sigmoid with moderate steepness.
 */
export const DEFAULT_DNF_ACTIVATION: DNFActivationConfig = {
  type: 'sigmoid',
  beta: 4.0,
  threshold: 0.0,
};

/**
 * Default DynamicNeuralField configuration.
 * 64x64 field optimized for VR spatial attention at 5-10Hz.
 */
export const DEFAULT_DNF_CONFIG: DynamicNeuralFieldConfig = {
  width: 64,
  height: 64,
  dimensionality: '2d',
  tau: 20.0,
  restingLevel: -5.0,
  dt: 1.0,
  kernel: DEFAULT_DNF_KERNEL,
  activation: DEFAULT_DNF_ACTIVATION,
  periodicBoundary: false,
  noiseAmplitude: 0.01,
  label: 'default-dnf',
};

/**
 * Default world mapping: 20m x 20m ground plane centered at origin.
 */
export const DEFAULT_WORLD_MAPPING: DNFWorldMapping = {
  worldOrigin: { x: -10, y: 0, z: -10 },
  worldExtent: { x: 20, y: 0, z: 20 },
  axisMapping: {
    fieldX: 'x',
    fieldY: 'z',
  },
};

/**
 * Default SpatialAttentionField configuration.
 */
export const DEFAULT_SPATIAL_ATTENTION_CONFIG: SpatialAttentionFieldConfig = {
  fieldConfig: DEFAULT_DNF_CONFIG,
  worldMapping: DEFAULT_WORLD_MAPPING,
  snnInputGain: 8.0,
  snnInputSigma: 2.5,
  inputDecayRate: 0.3,
  snnAttentionThreshold: 0.15,
  maxProjectedObjects: 64,
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty DNFFieldState for a given field size.
 */
export function createEmptyDNFFieldState(
  width: number,
  height: number,
  restingLevel: number = -5.0,
): DNFFieldState {
  const size = width * height;
  const activation = new Float32Array(size);
  activation.fill(restingLevel);

  return {
    activation,
    output: new Float32Array(size),
    input: new Float32Array(size),
    width,
    height,
    simulationTime: 0,
    timestepCount: 0,
  };
}

/**
 * Create empty DNF field statistics.
 */
export function createEmptyDNFStatistics(): DNFFieldStatistics {
  return {
    meanActivation: 0,
    maxActivation: 0,
    minActivation: 0,
    stdActivation: 0,
    meanOutput: 0,
    activePositionCount: 0,
    activeFraction: 0,
    peaks: [],
    totalInputStrength: 0,
  };
}

/**
 * Create an empty visualization snapshot.
 */
export function createEmptyVisualizationSnapshot(): DNFVisualizationSnapshot {
  return {
    snapshotId: 0,
    timestamp: 0,
    label: '',
    width: 0,
    height: 0,
    activationHeatmap: new Float32Array(0),
    outputHeatmap: new Float32Array(0),
    inputOverlay: new Float32Array(0),
    peaks: [],
    statistics: createEmptyDNFStatistics(),
    performance: {
      stepTimeMs: 0,
      convolutionTimeMs: 0,
      currentHz: 0,
      totalTimesteps: 0,
    },
  };
}
