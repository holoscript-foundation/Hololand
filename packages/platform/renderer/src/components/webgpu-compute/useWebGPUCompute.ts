/**
 * useWebGPUCompute
 *
 * React hook for managing WebGPU compute shader pipelines and simulation state.
 * Provides unified state management for all compute shader controls, including
 * pipeline dispatch, fluid simulation, particle systems, cloth simulation,
 * GPU performance monitoring, and WGSL shader editing.
 *
 * Integrates with the existing GPUContext from @hololand/renderer.
 *
 * @module webgpu-compute/useWebGPUCompute
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ComputeShaderPanelState,
  ComputeShaderPanelActions,
  ComputePipelineState,
  WorkgroupSize,
  DispatchSize,
  PipelineStatus,
  FluidSimulationState,
  FluidSimulationActions,
  FluidSimulationParams,
  VelocityFieldDisplay,
  ParticleSystemState,
  ParticleSystemActions,
  ParticleSystemParams,
  ForceField,
  GradientStop,
  ClothSimulationState,
  ClothSimulationActions,
  ClothSimulationParams,
  PinPoint,
  GPUPerformanceOverlayState,
  GPUPerformanceOverlayActions,
  GPUPerformanceSample,
  GPUPerfPanel,
  ShaderEditorState,
  ShaderEditorActions,
  ShaderCompilationError,
} from './types';
import {
  DEFAULT_FLUID_PARAMS,
  DEFAULT_PARTICLE_PARAMS,
  DEFAULT_CLOTH_PARAMS,
  WGSL_TEMPLATES,
} from './types';

// =============================================================================
// COMPUTE SHADER PANEL HOOK
// =============================================================================

/**
 * Configuration for the compute shader panel hook
 */
export interface UseComputeShaderPanelConfig {
  /** Initial pipelines */
  initialPipelines?: ComputePipelineState[];
  /** Auto-dispatch enabled */
  autoDispatch?: boolean;
  /** Auto-dispatch interval (ms) */
  autoDispatchIntervalMs?: number;
  /** Dispatch handler */
  onDispatch?: (pipelineName: string) => void;
}

/**
 * Hook for managing compute shader pipeline state
 */
export function useComputeShaderPanel(
  config: UseComputeShaderPanelConfig = {}
): { state: ComputeShaderPanelState; actions: ComputeShaderPanelActions } {
  const {
    initialPipelines = [],
    autoDispatch: initialAutoDispatch = false,
    autoDispatchIntervalMs: initialInterval = 16,
    onDispatch,
  } = config;

  const [pipelines, setPipelines] = useState<ComputePipelineState[]>(initialPipelines);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(
    initialPipelines.length > 0 ? initialPipelines[0].name : null
  );
  const [autoDispatch, setAutoDispatch] = useState(initialAutoDispatch);
  const [autoDispatchIntervalMs, setAutoDispatchIntervalMs] = useState(initialInterval);
  const autoDispatchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-dispatch logic
  useEffect(() => {
    if (autoDispatch) {
      autoDispatchRef.current = setInterval(() => {
        pipelines
          .filter((p) => p.status === 'ready')
          .forEach((p) => onDispatch?.(p.name));
      }, autoDispatchIntervalMs);
    }
    return () => {
      if (autoDispatchRef.current) {
        clearInterval(autoDispatchRef.current);
        autoDispatchRef.current = null;
      }
    };
  }, [autoDispatch, autoDispatchIntervalMs, pipelines, onDispatch]);

  const statusSummary = pipelines.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<PipelineStatus, number>
  );

  const dispatchPipeline = useCallback(
    (name: string) => {
      setPipelines((prev) =>
        prev.map((p) =>
          p.name === name
            ? { ...p, status: 'dispatching' as PipelineStatus, lastDispatchedAt: Date.now() }
            : p
        )
      );
      onDispatch?.(name);
    },
    [onDispatch]
  );

  const dispatchAll = useCallback(() => {
    pipelines.filter((p) => p.status === 'ready').forEach((p) => dispatchPipeline(p.name));
  }, [pipelines, dispatchPipeline]);

  const setWorkgroupSize = useCallback((name: string, size: WorkgroupSize) => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.name === name
          ? {
              ...p,
              workgroupSize: size,
              totalInvocations: size.x * size.y * size.z * p.dispatchSize.x * p.dispatchSize.y * p.dispatchSize.z,
            }
          : p
      )
    );
  }, []);

  const setDispatchSize = useCallback((name: string, size: DispatchSize) => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.name === name
          ? {
              ...p,
              dispatchSize: size,
              totalInvocations: p.workgroupSize.x * p.workgroupSize.y * p.workgroupSize.z * size.x * size.y * size.z,
            }
          : p
      )
    );
  }, []);

  const toggleAutoDispatch = useCallback(() => {
    setAutoDispatch((prev) => !prev);
  }, []);

  const resetPipeline = useCallback((name: string) => {
    setPipelines((prev) =>
      prev.map((p) =>
        p.name === name
          ? { ...p, status: 'idle' as PipelineStatus, lastDispatchTimeMs: 0, errorMessage: null }
          : p
      )
    );
  }, []);

  return {
    state: {
      pipelines,
      selectedPipeline,
      autoDispatch,
      autoDispatchIntervalMs,
      statusSummary,
    },
    actions: {
      selectPipeline: setSelectedPipeline,
      dispatchPipeline,
      dispatchAll,
      setWorkgroupSize,
      setDispatchSize,
      toggleAutoDispatch,
      setAutoDispatchInterval: setAutoDispatchIntervalMs,
      resetPipeline,
    },
  };
}

// =============================================================================
// FLUID SIMULATION HOOK
// =============================================================================

/**
 * Configuration for the fluid simulation hook
 */
export interface UseFluidSimulationConfig {
  /** Initial parameters */
  initialParams?: Partial<FluidSimulationParams>;
  /** Step callback (called each simulation step) */
  onStep?: (step: number, params: FluidSimulationParams) => void;
  /** Simulation tick interval (ms) */
  tickIntervalMs?: number;
}

/**
 * Hook for managing fluid simulation state
 */
export function useFluidSimulation(
  config: UseFluidSimulationConfig = {}
): { state: FluidSimulationState; actions: FluidSimulationActions } {
  const { initialParams = {}, onStep, tickIntervalMs = 16 } = config;

  const [params, setParamsState] = useState<FluidSimulationParams>({
    ...DEFAULT_FLUID_PARAMS,
    ...initialParams,
  });
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [velocityFieldDisplay, setVelocityFieldDisplay] = useState<VelocityFieldDisplay>('color-magnitude');
  const [maxVelocity, setMaxVelocity] = useState(0);
  const [avgPressure, setAvgPressure] = useState(0);
  const [kineticEnergy, setKineticEnergy] = useState(0);
  const [stepsPerSecond, setStepsPerSecond] = useState(0);
  const [gpuBufferUsage, setGpuBufferUsage] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepCountRef = useRef(0);
  const lastStepCountTime = useRef(Date.now());

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setStep((s) => {
          const nextStep = s + 1;
          onStep?.(nextStep, params);
          return nextStep;
        });
        setElapsedTime((t) => t + params.timestep);

        stepCountRef.current++;
        const now = Date.now();
        const elapsed = now - lastStepCountTime.current;
        if (elapsed > 1000) {
          setStepsPerSecond(stepCountRef.current / (elapsed / 1000));
          stepCountRef.current = 0;
          lastStepCountTime.current = now;
        }

        // Estimate GPU buffer usage: 2 velocity fields + density + pressure
        const cellCount = params.gridResolution ** (params.dimensions === 3 ? 3 : 2);
        const bytesPerCell = params.dimensions === 3 ? 20 : 16; // vec2/3 velocity + density + pressure
        setGpuBufferUsage(cellCount * bytesPerCell * 2); // Double buffered
      }, tickIntervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, params, tickIntervalMs, onStep]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setStep(0);
    setElapsedTime(0);
    setMaxVelocity(0);
    setAvgPressure(0);
    setKineticEnergy(0);
    setStepsPerSecond(0);
  }, []);

  const stepForward = useCallback(() => {
    setStep((s) => {
      const nextStep = s + 1;
      onStep?.(nextStep, params);
      return nextStep;
    });
    setElapsedTime((t) => t + params.timestep);
  }, [params, onStep]);

  const setParams = useCallback((updates: Partial<FluidSimulationParams>) => {
    setParamsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const addImpulse = useCallback((_x: number, _y: number, _force: number) => {
    // Hook into GPU compute dispatch - actual force application handled by shader
  }, []);

  const addDensitySource = useCallback((_x: number, _y: number, _amount: number) => {
    // Hook into GPU compute dispatch - actual density source handled by shader
  }, []);

  return {
    state: {
      params,
      running,
      step,
      elapsedTime,
      velocityFieldDisplay,
      maxVelocity,
      avgPressure,
      kineticEnergy,
      stepsPerSecond,
      gpuBufferUsage,
    },
    actions: {
      start,
      pause,
      reset,
      stepForward,
      setParams,
      setVelocityFieldDisplay,
      addImpulse,
      addDensitySource,
    },
  };
}

// =============================================================================
// PARTICLE SYSTEM HOOK
// =============================================================================

/**
 * Configuration for the particle system hook
 */
export interface UseParticleSystemConfig {
  /** Initial parameters */
  initialParams?: Partial<ParticleSystemParams>;
  /** Update callback (called each tick) */
  onUpdate?: (params: ParticleSystemParams) => void;
  /** Tick interval (ms) */
  tickIntervalMs?: number;
}

/**
 * Hook for managing particle system state
 */
export function useParticleSystem(
  config: UseParticleSystemConfig = {}
): { state: ParticleSystemState; actions: ParticleSystemActions } {
  const { initialParams = {}, onUpdate, tickIntervalMs = 16 } = config;

  const [params, setParamsState] = useState<ParticleSystemParams>({
    ...DEFAULT_PARTICLE_PARAMS,
    ...initialParams,
  });
  const [emitting, setEmitting] = useState(false);
  const [totalSpawned, setTotalSpawned] = useState(0);
  const [computeTimeMs, setComputeTimeMs] = useState(0);
  const [gpuMemoryUsage, setGpuMemoryUsage] = useState(0);
  const [fpsImpact, setFpsImpact] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (emitting) {
      intervalRef.current = setInterval(() => {
        const particlesThisTick = Math.floor(params.emissionRate * (tickIntervalMs / 1000));
        setTotalSpawned((prev) => prev + particlesThisTick);
        setParamsState((prev) => ({
          ...prev,
          activeParticles: Math.min(
            prev.activeParticles + particlesThisTick,
            prev.maxParticles
          ),
        }));

        // Estimate GPU memory: 48 bytes per particle (pos + vel + lifetime + age + size + color)
        setGpuMemoryUsage(params.maxParticles * 48);
        // Estimate compute time based on particle count
        setComputeTimeMs(params.activeParticles / 500_000);
        setFpsImpact(params.activeParticles > 500_000 ? 2 : params.activeParticles > 100_000 ? 1 : 0);

        onUpdate?.(params);
      }, tickIntervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [emitting, params, tickIntervalMs, onUpdate]);

  const startEmitting = useCallback(() => setEmitting(true), []);
  const stopEmitting = useCallback(() => setEmitting(false), []);

  const killAll = useCallback(() => {
    setEmitting(false);
    setParamsState((prev) => ({ ...prev, activeParticles: 0 }));
    setTotalSpawned(0);
  }, []);

  const burst = useCallback((count: number) => {
    setParamsState((prev) => ({
      ...prev,
      activeParticles: Math.min(prev.activeParticles + count, prev.maxParticles),
    }));
    setTotalSpawned((prev) => prev + count);
  }, []);

  const setParams = useCallback((updates: Partial<ParticleSystemParams>) => {
    setParamsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setEmitterPosition = useCallback((pos: [number, number, number]) => {
    setParamsState((prev) => ({ ...prev, emitterPosition: pos }));
  }, []);

  const addForceField = useCallback((field: ForceField) => {
    setParamsState((prev) => ({
      ...prev,
      forceFields: [...prev.forceFields, field],
    }));
  }, []);

  const removeForceField = useCallback((index: number) => {
    setParamsState((prev) => ({
      ...prev,
      forceFields: prev.forceFields.filter((_, i) => i !== index),
    }));
  }, []);

  const updateForceField = useCallback((index: number, field: Partial<ForceField>) => {
    setParamsState((prev) => ({
      ...prev,
      forceFields: prev.forceFields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }));
  }, []);

  const setColorGradient = useCallback((stops: GradientStop[]) => {
    setParamsState((prev) => ({ ...prev, colorGradient: stops }));
  }, []);

  const addGradientStop = useCallback((stop: GradientStop) => {
    setParamsState((prev) => ({
      ...prev,
      colorGradient: [...prev.colorGradient, stop].sort((a, b) => a.position - b.position),
    }));
  }, []);

  const removeGradientStop = useCallback((index: number) => {
    setParamsState((prev) => ({
      ...prev,
      colorGradient: prev.colorGradient.filter((_, i) => i !== index),
    }));
  }, []);

  return {
    state: {
      params,
      emitting,
      totalSpawned,
      computeTimeMs,
      gpuMemoryUsage,
      fpsImpact,
    },
    actions: {
      startEmitting,
      stopEmitting,
      killAll,
      burst,
      setParams,
      setEmitterPosition,
      addForceField,
      removeForceField,
      updateForceField,
      setColorGradient,
      addGradientStop,
      removeGradientStop,
    },
  };
}

// =============================================================================
// CLOTH SIMULATION HOOK
// =============================================================================

/**
 * Configuration for the cloth simulation hook
 */
export interface UseClothSimulationConfig {
  /** Initial parameters */
  initialParams?: Partial<ClothSimulationParams>;
  /** Step callback */
  onStep?: (step: number, params: ClothSimulationParams) => void;
  /** Tick interval (ms) */
  tickIntervalMs?: number;
}

/**
 * Hook for managing cloth simulation state
 */
export function useClothSimulation(
  config: UseClothSimulationConfig = {}
): { state: ClothSimulationState; actions: ClothSimulationActions } {
  const { initialParams = {}, onStep, tickIntervalMs = 16 } = config;

  const [params, setParamsState] = useState<ClothSimulationParams>({
    ...DEFAULT_CLOTH_PARAMS,
    ...initialParams,
  });
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [computeTimeMs, setComputeTimeMs] = useState(0);
  const [constraintSolveMs, setConstraintSolveMs] = useState(0);
  const [maxConstraintError, setMaxConstraintError] = useState(0);
  const [gpuBufferUsage, setGpuBufferUsage] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setStep((s) => {
          const nextStep = s + 1;
          onStep?.(nextStep, params);
          return nextStep;
        });

        // Estimate constraint solve time
        setConstraintSolveMs(
          (params.constraintCount * params.constraintIterations) / 1_000_000
        );
        setComputeTimeMs(
          (params.vertexCount * 0.001) + (params.constraintCount * params.constraintIterations * 0.001)
        );
        // Vertex buffer: 48 bytes per vertex (pos + prevPos + vel + mass + pinned)
        // Constraint buffer: 16 bytes per constraint (2 indices + restLen + stiffness)
        setGpuBufferUsage(params.vertexCount * 48 + params.constraintCount * 16);
        // Convergence error decays with iterations
        setMaxConstraintError(1.0 / (params.constraintIterations * 10));
      }, tickIntervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, params, tickIntervalMs, onStep]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setStep(0);
    setComputeTimeMs(0);
    setConstraintSolveMs(0);
    setMaxConstraintError(0);
  }, []);

  const stepForward = useCallback(() => {
    setStep((s) => {
      const nextStep = s + 1;
      onStep?.(nextStep, params);
      return nextStep;
    });
  }, [params, onStep]);

  const setParams = useCallback((updates: Partial<ClothSimulationParams>) => {
    setParamsState((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.gridWidth || updates.gridHeight) {
        const w = updates.gridWidth ?? prev.gridWidth;
        const h = updates.gridHeight ?? prev.gridHeight;
        updated.vertexCount = w * h;
        // Constraints: structural (2*(w-1)*h + 2*w*(h-1)) + shear + bend
        updated.constraintCount = 2 * ((w - 1) * h + w * (h - 1));
      }
      return updated;
    });
  }, []);

  const addPin = useCallback((pin: PinPoint) => {
    setParamsState((prev) => ({
      ...prev,
      pinPoints: [...prev.pinPoints, pin],
    }));
  }, []);

  const removePin = useCallback((index: number) => {
    setParamsState((prev) => ({
      ...prev,
      pinPoints: prev.pinPoints.filter((_, i) => i !== index),
    }));
  }, []);

  const togglePin = useCallback((index: number) => {
    setParamsState((prev) => ({
      ...prev,
      pinPoints: prev.pinPoints.map((p, i) =>
        i === index ? { ...p, enabled: !p.enabled } : p
      ),
    }));
  }, []);

  const releaseAllPins = useCallback(() => {
    setParamsState((prev) => ({
      ...prev,
      pinPoints: prev.pinPoints.map((p) => ({ ...p, enabled: false })),
    }));
  }, []);

  const setWindForce = useCallback((force: [number, number, number]) => {
    setParamsState((prev) => ({ ...prev, windForce: force }));
  }, []);

  const setGravity = useCallback((gravity: [number, number, number]) => {
    setParamsState((prev) => ({ ...prev, gravity }));
  }, []);

  return {
    state: {
      params,
      running,
      step,
      computeTimeMs,
      constraintSolveMs,
      maxConstraintError,
      gpuBufferUsage,
    },
    actions: {
      start,
      pause,
      reset,
      stepForward,
      setParams,
      addPin,
      removePin,
      togglePin,
      releaseAllPins,
      setWindForce,
      setGravity,
    },
  };
}

// =============================================================================
// GPU PERFORMANCE OVERLAY HOOK
// =============================================================================

/**
 * Configuration for the GPU performance overlay hook
 */
export interface UseGPUPerformanceConfig {
  /** Sample interval (ms) */
  sampleIntervalMs?: number;
  /** Max history length */
  maxHistory?: number;
  /** External sample provider */
  onSampleRequest?: () => GPUPerformanceSample | null;
  /** Initially visible */
  visible?: boolean;
}

/**
 * Hook for managing GPU performance overlay state
 */
export function useGPUPerformance(
  config: UseGPUPerformanceConfig = {}
): { state: GPUPerformanceOverlayState; actions: GPUPerformanceOverlayActions } {
  const {
    sampleIntervalMs = 100,
    maxHistory = 300,
    onSampleRequest,
    visible: initialVisible = true,
  } = config;

  const emptySample: GPUPerformanceSample = {
    timestamp: Date.now(),
    dispatchTimeMs: 0,
    memoryBandwidth: 0,
    occupancy: 0,
    totalBufferMemory: 0,
    activePipelines: 0,
    dispatchesPerFrame: 0,
  };

  const [samples, setSamples] = useState<GPUPerformanceSample[]>([]);
  const [current, setCurrent] = useState<GPUPerformanceSample>(emptySample);
  const [visible, setVisible] = useState(initialVisible);
  const [activePanel, setActivePanel] = useState<GPUPerfPanel>('dispatch');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      intervalRef.current = setInterval(() => {
        const sample = onSampleRequest?.() ?? {
          ...emptySample,
          timestamp: Date.now(),
        };

        setCurrent(sample);
        setSamples((prev) => {
          const next = [...prev, sample];
          return next.length > maxHistory ? next.slice(-maxHistory) : next;
        });
      }, sampleIntervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, sampleIntervalMs, maxHistory, onSampleRequest]);

  const avg = (fn: (s: GPUPerformanceSample) => number) => {
    if (samples.length === 0) return 0;
    return samples.reduce((sum, s) => sum + fn(s), 0) / samples.length;
  };

  const peak = (fn: (s: GPUPerformanceSample) => number) => {
    if (samples.length === 0) return 0;
    return Math.max(...samples.map(fn));
  };

  return {
    state: {
      samples,
      current,
      avgDispatchTimeMs: avg((s) => s.dispatchTimeMs),
      peakDispatchTimeMs: peak((s) => s.dispatchTimeMs),
      avgMemoryBandwidth: avg((s) => s.memoryBandwidth),
      avgOccupancy: avg((s) => s.occupancy),
      totalBufferMemory: current.totalBufferMemory,
      buffers: [],
      adapterInfo: null,
      visible,
      activePanel,
    },
    actions: {
      toggleVisibility: () => setVisible((v) => !v),
      setActivePanel,
      clearHistory: () => setSamples([]),
      takeSnapshot: () => {
        const sample = onSampleRequest?.() ?? {
          ...emptySample,
          timestamp: Date.now(),
        };
        setCurrent(sample);
        setSamples((prev) => [...prev, sample]);
      },
    },
  };
}

// =============================================================================
// SHADER EDITOR HOOK
// =============================================================================

/**
 * Configuration for the shader editor hook
 */
export interface UseShaderEditorConfig {
  /** Initial source code */
  initialSource?: string;
  /** Target pipeline name */
  pipelineName?: string;
  /** Compile callback */
  onCompile?: (source: string) => ShaderCompilationError[];
  /** Source change callback */
  onSourceChange?: (source: string) => void;
  /** Initial font size */
  fontSize?: number;
}

/**
 * Hook for managing WGSL shader editor state
 */
export function useShaderEditor(
  config: UseShaderEditorConfig = {}
): { state: ShaderEditorState; actions: ShaderEditorActions } {
  const {
    initialSource = WGSL_TEMPLATES['basic-compute'],
    pipelineName = null,
    onCompile,
    onSourceChange,
    fontSize: initialFontSize = 13,
  } = config;

  const [source, setSourceState] = useState(initialSource);
  const [compilationStatus, setCompilationStatus] = useState<ShaderEditorState['compilationStatus']>('idle');
  const [errors, setErrors] = useState<ShaderCompilationError[]>([]);
  const [dirty, setDirty] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<number | null>(null);
  const [compilationTimeMs, setCompilationTimeMs] = useState(0);
  const [activePipeline, setActivePipeline] = useState<string | null>(pipelineName);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(initialFontSize);

  const lineCount = source.split('\n').length;

  const setSource = useCallback(
    (newSource: string) => {
      setSourceState(newSource);
      setDirty(true);
      onSourceChange?.(newSource);
    },
    [onSourceChange]
  );

  const compile = useCallback(() => {
    setCompilationStatus('compiling');
    const startTime = performance.now();

    // Use provided compile handler or simulate compilation
    const compilationErrors = onCompile?.(source) ?? [];
    const elapsed = performance.now() - startTime;

    setCompilationTimeMs(elapsed);
    setErrors(compilationErrors);

    if (compilationErrors.some((e) => e.severity === 'error')) {
      setCompilationStatus('error');
    } else {
      setCompilationStatus('success');
      setDirty(false);
      setLastCompiledAt(Date.now());
    }
  }, [source, onCompile]);

  const compileAndDispatch = useCallback(() => {
    compile();
  }, [compile]);

  const loadTemplate = useCallback(
    (name: string) => {
      const template = WGSL_TEMPLATES[name];
      if (template) {
        setSource(template);
        setCompilationStatus('idle');
        setErrors([]);
      }
    },
    [setSource]
  );

  const formatSource = useCallback(() => {
    // Basic WGSL formatting: normalize indentation
    const lines = source.split('\n');
    let indent = 0;
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('}')) {
        indent = Math.max(0, indent - 1);
      }
      const result = '  '.repeat(indent) + trimmed;
      if (trimmed.endsWith('{')) {
        indent++;
      }
      return result;
    });
    setSource(formatted.join('\n'));
  }, [source, setSource]);

  return {
    state: {
      source,
      compilationStatus,
      errors,
      dirty,
      lastCompiledAt,
      compilationTimeMs,
      activePipeline,
      lineCount,
      cursorPosition,
      showLineNumbers,
      fontSize,
    },
    actions: {
      setSource,
      compile,
      compileAndDispatch,
      loadTemplate,
      setActivePipeline,
      setCursorPosition: (line: number, column: number) =>
        setCursorPosition({ line, column }),
      toggleLineNumbers: () => setShowLineNumbers((v) => !v),
      setFontSize,
      formatSource,
    },
  };
}
