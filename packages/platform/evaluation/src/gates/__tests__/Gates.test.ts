import { describe, it, expect } from 'vitest';
import { PerformanceGates } from '../PerformanceGates';
import { MotionSicknessTracker } from '../MotionSicknessTracker';
import { GateReport } from '../GateReport';

describe('PerformanceGates', () => {
  const gates = new PerformanceGates();

  it('passes dev at 60fps', () => {
    expect(gates.evaluate('dev', 60, 16, 3000, 300).passed).toBe(true);
  });

  it('fails prod at 60fps', () => {
    expect(gates.evaluate('prod', 60, 16, 3000, 200).passed).toBe(false);
  });

  it('passes prod at 90fps', () => {
    expect(gates.evaluate('prod', 90, 11, 2000, 150).passed).toBe(true);
  });
});

describe('MotionSicknessTracker', () => {
  it('assesses low risk for good conditions', () => {
    const tracker = new MotionSicknessTracker();
    const result = tracker.record({ frameDropRate: 0, rotationVelocityDegS: 30, artificialLocomotion: false, fovReduction: 0 });
    expect(result.riskLevel).toBe('low');
  });

  it('assesses high risk for bad conditions', () => {
    const tracker = new MotionSicknessTracker();
    const result = tracker.record({ frameDropRate: 0.2, rotationVelocityDegS: 180, artificialLocomotion: true, fovReduction: 0 });
    expect(['high', 'critical']).toContain(result.riskLevel);
  });
});

describe('GateReport', () => {
  it('generates aggregated report', () => {
    const report = new GateReport();
    const result = report.generate('world1', 90, 11, 2000, 150);
    expect(result.readyForProd).toBe(true);
    expect(result.gates.length).toBe(3);
  });
});
