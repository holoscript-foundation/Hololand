/**
 * @hololand/agents ThermalManager
 *
 * Thermal management for XR device inference workloads.
 * Monitors temperature, adjusts workload, and prevents thermal throttling.
 */

export type ThermalState = 'cool' | 'warm' | 'hot' | 'critical';

export interface ThermalConfig {
  warmThreshold: number;
  hotThreshold: number;
  criticalThreshold: number;
  cooldownRatePerSec: number;
  samplingIntervalMs: number;
}

const DEFAULT_CONFIG: ThermalConfig = {
  warmThreshold: 55,
  hotThreshold: 75,
  criticalThreshold: 85,
  cooldownRatePerSec: 0.5,
  samplingIntervalMs: 1000,
};

export interface ThermalReading {
  temperature: number;
  state: ThermalState;
  timestamp: number;
  workloadReduction: number; // 0 = none, 1 = full reduction
}

export class ThermalManager {
  private config: ThermalConfig;
  private currentTemp: number = 40;
  private readings: ThermalReading[] = [];
  private maxReadings: number = 300;

  constructor(config?: Partial<ThermalConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateTemperature(temp: number): ThermalReading {
    this.currentTemp = temp;
    const state = this.getState();
    const reduction = this.computeWorkloadReduction(state);

    const reading: ThermalReading = {
      temperature: temp,
      state,
      timestamp: Date.now(),
      workloadReduction: reduction,
    };
    this.readings.push(reading);
    if (this.readings.length > this.maxReadings) this.readings.shift();
    return reading;
  }

  getState(): ThermalState {
    if (this.currentTemp >= this.config.criticalThreshold) return 'critical';
    if (this.currentTemp >= this.config.hotThreshold) return 'hot';
    if (this.currentTemp >= this.config.warmThreshold) return 'warm';
    return 'cool';
  }

  getWorkloadReduction(): number {
    return this.computeWorkloadReduction(this.getState());
  }

  getCurrentTemp(): number { return this.currentTemp; }
  getReadings(): ThermalReading[] { return [...this.readings]; }

  shouldThrottle(): boolean {
    return this.getState() === 'hot' || this.getState() === 'critical';
  }

  shouldEmergencyShutdown(): boolean {
    return this.getState() === 'critical';
  }

  private computeWorkloadReduction(state: ThermalState): number {
    switch (state) {
      case 'cool': return 0;
      case 'warm': return 0.2;
      case 'hot': return 0.5;
      case 'critical': return 0.9;
    }
  }
}
