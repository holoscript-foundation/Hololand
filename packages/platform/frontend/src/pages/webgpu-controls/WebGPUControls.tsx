/**
 * WebGPU Compute Shader Controls
 * Comprehensive control panel for WebGPU simulations
 */

import React, { useState, useEffect, useRef } from 'react';
import { FluidControls } from './FluidControls';
import { ParticleControls } from './ParticleControls';
import { ClothControls } from './ClothControls';
import { PerformanceMetricsDisplay } from './PerformanceMetrics';
import { ShaderHotReload } from './ShaderHotReload';
import { BenchmarkComparison } from './BenchmarkComparison';
import {
  DEFAULT_FLUID_PARAMS,
  DEFAULT_PARTICLE_PARAMS,
  DEFAULT_CLOTH_PARAMS,
  INITIAL_METRICS,
} from './defaults';
import type {
  WebGPUControlsState,
  FluidSimulationParams,
  ParticleSystemParams,
  ClothPhysicsParams,
  BenchmarkResult,
  ShaderConfig,
} from './types';

export const WebGPUControls: React.FC = () => {
  const [state, setState] = useState<WebGPUControlsState>({
    fluidParams: DEFAULT_FLUID_PARAMS,
    particleParams: DEFAULT_PARTICLE_PARAMS,
    clothParams: DEFAULT_CLOTH_PARAMS,
    metrics: INITIAL_METRICS,
    activeSimulation: null,
    simulationState: 'stopped',
    availableShaders: [],
    activeShader: null,
    hotReloadEnabled: false,
    benchmarkResults: [],
  });

  const [activeTab, setActiveTab] = useState<'controls' | 'shaders' | 'benchmarks'>('controls');
  const animationFrameRef = useRef<number>();

  // Initialize WebGPU and load shaders
  useEffect(() => {
    initializeWebGPU();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Performance monitoring loop
  useEffect(() => {
    if (state.simulationState === 'running') {
      const startTime = performance.now();
      let frameCount = 0;
      let lastFpsUpdate = startTime;

      const updateMetrics = () => {
        const now = performance.now();
        frameCount++;

        // Update FPS every second
        if (now - lastFpsUpdate >= 1000) {
          const fps = (frameCount * 1000) / (now - lastFpsUpdate);
          frameCount = 0;
          lastFpsUpdate = now;

          // Simulate metrics (in real implementation, these would come from actual GPU queries)
          setState(prev => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              fps,
              frameTimeMs: 1000 / fps,
              computeTimeMs: 3 + Math.random() * 5, // Simulated
              renderTimeMs: 2 + Math.random() * 3, // Simulated
              memoryUsageMB: 150 + Math.random() * 50, // Simulated
              gpuMemoryUsageMB: 200 + Math.random() * 100, // Simulated
            },
          }));
        }

        animationFrameRef.current = requestAnimationFrame(updateMetrics);
      };

      animationFrameRef.current = requestAnimationFrame(updateMetrics);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [state.simulationState]);

  const initializeWebGPU = async () => {
    // Check WebGPU support
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('No WebGPU adapter found');
        return;
      }

      const device = await adapter.requestDevice();

      // Load default shaders
      const defaultShaders: ShaderConfig[] = [
        {
          name: 'fluid-advection',
          code: FLUID_SHADER_TEMPLATE,
          entryPoint: 'main',
          workgroupSize: [8, 8, 1],
          bindGroupLayout: '{}',
          lastModified: Date.now(),
        },
        {
          name: 'particle-update',
          code: PARTICLE_SHADER_TEMPLATE,
          entryPoint: 'main',
          workgroupSize: [64, 1, 1],
          bindGroupLayout: '{}',
          lastModified: Date.now(),
        },
        {
          name: 'cloth-solver',
          code: CLOTH_SHADER_TEMPLATE,
          entryPoint: 'main',
          workgroupSize: [16, 16, 1],
          bindGroupLayout: '{}',
          lastModified: Date.now(),
        },
      ];

      setState(prev => ({
        ...prev,
        availableShaders: defaultShaders,
      }));
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
    }
  };

  const handleStartSimulation = (type: 'fluid' | 'particles' | 'cloth') => {
    setState(prev => ({
      ...prev,
      activeSimulation: type,
      simulationState: 'running',
    }));
  };

  const handleStopSimulation = () => {
    setState(prev => ({
      ...prev,
      simulationState: 'stopped',
    }));
  };

  const handlePauseSimulation = () => {
    setState(prev => ({
      ...prev,
      simulationState: 'paused',
    }));
  };

  const handleFluidParamsChange = (params: FluidSimulationParams) => {
    setState(prev => ({ ...prev, fluidParams: params }));
  };

  const handleParticleParamsChange = (params: ParticleSystemParams) => {
    setState(prev => ({ ...prev, particleParams: params }));
  };

  const handleClothParamsChange = (params: ClothPhysicsParams) => {
    setState(prev => ({ ...prev, clothParams: params }));
  };

  const handleShaderChange = (name: string, code: string) => {
    setState(prev => ({
      ...prev,
      availableShaders: prev.availableShaders.map(shader =>
        shader.name === name
          ? { ...shader, code, lastModified: Date.now() }
          : shader
      ),
    }));

    // Trigger recompile if hot reload is enabled
    if (state.hotReloadEnabled) {
      console.log(`Hot reloading shader: ${name}`);
    }
  };

  const handleAddBenchmark = (
    simulationType: 'fluid' | 'particles' | 'cloth',
    params: FluidSimulationParams | ParticleSystemParams | ClothPhysicsParams,
    notes: string
  ) => {
    const benchmark: BenchmarkResult = {
      id: `bench-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      simulationType,
      params,
      metrics: { ...state.metrics },
      duration: 5, // Default 5 second benchmark
      notes,
    };

    setState(prev => ({
      ...prev,
      benchmarkResults: [...prev.benchmarkResults, benchmark],
    }));
  };

  const handleExportBenchmarks = () => {
    const data = JSON.stringify(state.benchmarkResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webgpu-benchmarks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="webgpu-controls min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">WebGPU Compute Shader Controls</h1>
          <p className="text-gray-400">
            Real-time parameter tuning for fluid simulation, particle systems, and cloth physics
          </p>
        </div>

        {/* Simulation Controls */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => handleStartSimulation('fluid')}
                disabled={state.simulationState === 'running'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Fluid
              </button>
              <button
                onClick={() => handleStartSimulation('particles')}
                disabled={state.simulationState === 'running'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Particles
              </button>
              <button
                onClick={() => handleStartSimulation('cloth')}
                disabled={state.simulationState === 'running'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Cloth
              </button>
            </div>
            <div className="flex gap-2">
              {state.simulationState === 'running' && (
                <button
                  onClick={handlePauseSimulation}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium transition-colors"
                >
                  Pause
                </button>
              )}
              {state.simulationState === 'paused' && (
                <button
                  onClick={() => setState(prev => ({ ...prev, simulationState: 'running' }))}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium transition-colors"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleStopSimulation}
                disabled={state.simulationState === 'stopped'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Stop
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              state.simulationState === 'running' ? 'bg-green-500 animate-pulse' :
              state.simulationState === 'paused' ? 'bg-yellow-500' :
              'bg-gray-600'
            }`} />
            <span className="text-gray-400">
              Status: <span className="font-semibold text-white">{state.simulationState}</span>
              {state.activeSimulation && ` • Active: ${state.activeSimulation}`}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="mb-4 flex gap-2 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'controls'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Parameters
              </button>
              <button
                onClick={() => setActiveTab('shaders')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'shaders'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Shaders
              </button>
              <button
                onClick={() => setActiveTab('benchmarks')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'benchmarks'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Benchmarks
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              {activeTab === 'controls' && (
                <div className="space-y-6">
                  <FluidControls
                    params={state.fluidParams}
                    onParamsChange={handleFluidParamsChange}
                    disabled={state.simulationState === 'running' && state.activeSimulation !== 'fluid'}
                  />
                  <hr className="border-gray-800" />
                  <ParticleControls
                    params={state.particleParams}
                    onParamsChange={handleParticleParamsChange}
                    disabled={state.simulationState === 'running' && state.activeSimulation !== 'particles'}
                  />
                  <hr className="border-gray-800" />
                  <ClothControls
                    params={state.clothParams}
                    onParamsChange={handleClothParamsChange}
                    disabled={state.simulationState === 'running' && state.activeSimulation !== 'cloth'}
                  />
                </div>
              )}

              {activeTab === 'shaders' && (
                <ShaderHotReload
                  shaders={state.availableShaders}
                  activeShader={state.activeShader}
                  onShaderChange={handleShaderChange}
                  onShaderSelect={shader => setState(prev => ({ ...prev, activeShader: shader }))}
                  onHotReloadToggle={enabled => setState(prev => ({ ...prev, hotReloadEnabled: enabled }))}
                  hotReloadEnabled={state.hotReloadEnabled}
                  disabled={state.simulationState === 'running'}
                />
              )}

              {activeTab === 'benchmarks' && (
                <BenchmarkComparison
                  benchmarks={state.benchmarkResults}
                  onAddBenchmark={handleAddBenchmark}
                  onDeleteBenchmark={id => setState(prev => ({
                    ...prev,
                    benchmarkResults: prev.benchmarkResults.filter(b => b.id !== id),
                  }))}
                  onExport={handleExportBenchmarks}
                  currentSimulation={state.activeSimulation}
                  disabled={state.simulationState !== 'running'}
                />
              )}
            </div>
          </div>

          {/* Right Column: Performance Metrics */}
          <div>
            <PerformanceMetricsDisplay metrics={state.metrics} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Default shader templates (simplified examples)
const FLUID_SHADER_TEMPLATE = `@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  // Fluid advection shader
  // Implements velocity field advection
}`;

const PARTICLE_SHADER_TEMPLATE = `@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  // Particle update shader
  // Updates particle positions and velocities
}`;

const CLOTH_SHADER_TEMPLATE = `@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  // Cloth physics solver
  // Position-based dynamics constraints
}`;
