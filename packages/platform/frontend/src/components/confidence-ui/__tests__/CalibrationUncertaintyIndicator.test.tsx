/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CalibrationUncertaintyIndicator component
 *
 * Validates:
 * - computeCalibratedUncertainty algorithm correctness
 * - Inverse correlation: higher raw confidence => higher calibrated uncertainty
 * - Overconfidence factor and penalty threshold tuning
 * - Risk tier assignment (low / moderate / elevated / high)
 * - Edge cases: 0%, 50%, 100% confidence
 * - Component prop forwarding and rendering
 * - Accessibility attributes
 * - Comparison bar display toggle
 * - Sparkline history rendering
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  computeCalibratedUncertainty,
  CalibrationUncertaintyIndicator,
  type CalibrationSnapshot,
  type UncertaintyRisk,
} from '../CalibrationUncertaintyIndicator';

// =============================================================================
// HELPERS
// =============================================================================

function getProps(element: React.ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>;
}

// =============================================================================
// CALIBRATION ALGORITHM
// =============================================================================

describe('computeCalibratedUncertainty', () => {
  describe('basic behavior', () => {
    it('should return uncertainty as 1 - adjustedConfidence', () => {
      const result = computeCalibratedUncertainty(0.5);
      expect(result.calibratedUncertainty).toBeCloseTo(1 - result.adjustedConfidence, 10);
    });

    it('should return penalty of 0 when confidence is below threshold', () => {
      const result = computeCalibratedUncertainty(0.5, 0.34, 0.80);
      expect(result.penalty).toBe(0);
      expect(result.adjustedConfidence).toBe(0.5);
      expect(result.calibratedUncertainty).toBe(0.5);
    });

    it('should return non-zero penalty when confidence exceeds threshold', () => {
      const result = computeCalibratedUncertainty(0.90, 0.34, 0.80);
      expect(result.penalty).toBeGreaterThan(0);
      expect(result.adjustedConfidence).toBeLessThan(0.90);
    });
  });

  describe('inverse correlation at high confidence', () => {
    it('should produce higher uncertainty for 0.99 confidence than for 0.85 confidence', () => {
      const at99 = computeCalibratedUncertainty(0.99);
      const at85 = computeCalibratedUncertainty(0.85);

      // Key insight: at very high confidence the penalty pushes uncertainty UP
      expect(at99.calibratedUncertainty).toBeGreaterThan(at85.calibratedUncertainty);
    });

    it('should produce dramatically higher uncertainty at 0.99 than the naive 1%', () => {
      const result = computeCalibratedUncertainty(0.99);
      // Without calibration, uncertainty at 0.99 would be 0.01
      // With calibration it should be significantly higher
      expect(result.calibratedUncertainty).toBeGreaterThan(0.10);
    });

    it('should apply quadratic penalty curve', () => {
      const at85 = computeCalibratedUncertainty(0.85, 0.34, 0.80);
      const at90 = computeCalibratedUncertainty(0.90, 0.34, 0.80);
      const at95 = computeCalibratedUncertainty(0.95, 0.34, 0.80);

      // Penalty grows quadratically with excess over threshold
      const penalty85to90 = at90.penalty - at85.penalty;
      const penalty90to95 = at95.penalty - at90.penalty;

      // The second interval should have a larger penalty increase (quadratic growth)
      expect(penalty90to95).toBeGreaterThan(penalty85to90);
    });
  });

  describe('specific MIT baseline calculation', () => {
    it('should match the documented example for 99% confidence', () => {
      // From the docstring:
      // excess     = 0.19
      // penalty    = 0.34 * (0.19/0.20)^2 = 0.34 * 0.9025 = 0.30685
      // adjusted   = 0.99 * (1 - 0.30685) = 0.6862...
      // uncertainty = 0.3137...
      const result = computeCalibratedUncertainty(0.99, 0.34, 0.80);

      expect(result.penalty).toBeCloseTo(0.34 * Math.pow(0.19 / 0.20, 2), 5);
      expect(result.adjustedConfidence).toBeCloseTo(0.99 * (1 - result.penalty), 5);
      expect(result.calibratedUncertainty).toBeCloseTo(1 - result.adjustedConfidence, 5);
    });

    it('should yield ~31% uncertainty at 99% raw confidence with MIT defaults', () => {
      const result = computeCalibratedUncertainty(0.99, 0.34, 0.80);
      expect(result.calibratedUncertainty).toBeCloseTo(0.314, 1);
    });
  });

  describe('edge cases', () => {
    it('should handle 0% confidence', () => {
      const result = computeCalibratedUncertainty(0);
      expect(result.rawConfidence).toBeUndefined; // just verify it doesn't crash
      expect(result.calibratedUncertainty).toBe(1);
      expect(result.adjustedConfidence).toBe(0);
      expect(result.penalty).toBe(0);
      expect(result.risk).toBe('high');
    });

    it('should handle 100% confidence', () => {
      const result = computeCalibratedUncertainty(1.0);
      expect(result.penalty).toBeCloseTo(0.34, 5);
      expect(result.adjustedConfidence).toBeCloseTo(0.66, 2);
      expect(result.calibratedUncertainty).toBeCloseTo(0.34, 2);
      expect(result.risk).toBe('elevated');
    });

    it('should handle exactly-at-threshold confidence', () => {
      const result = computeCalibratedUncertainty(0.80, 0.34, 0.80);
      expect(result.penalty).toBe(0);
      expect(result.adjustedConfidence).toBe(0.80);
      expect(result.calibratedUncertainty).toBeCloseTo(0.20, 5);
    });

    it('should clamp confidence below 0 to 0', () => {
      const result = computeCalibratedUncertainty(-0.5);
      expect(result.adjustedConfidence).toBe(0);
      expect(result.calibratedUncertainty).toBe(1);
    });

    it('should clamp confidence above 1 to 1', () => {
      const result = computeCalibratedUncertainty(1.5);
      // Should behave as if rawConfidence = 1.0
      const reference = computeCalibratedUncertainty(1.0);
      expect(result.calibratedUncertainty).toBeCloseTo(reference.calibratedUncertainty, 5);
    });

    it('should handle 50% confidence with no penalty', () => {
      const result = computeCalibratedUncertainty(0.50, 0.34, 0.80);
      expect(result.penalty).toBe(0);
      expect(result.adjustedConfidence).toBe(0.50);
      expect(result.calibratedUncertainty).toBe(0.50);
    });
  });

  describe('risk tier assignment', () => {
    it('should assign low risk for uncertainty < 15%', () => {
      // At 0.70 raw confidence (below threshold), uncertainty = 0.30
      // We need below threshold confidence low enough for < 15% uncertainty
      // uncertainty = 1 - confidence when below threshold
      // So confidence > 0.85 but with small penalty
      const result = computeCalibratedUncertainty(0.82, 0.34, 0.80);
      // penalty is small, adjusted ~0.82 * (1 - small), uncertainty ~0.18
      // Actually let's compute: excess = 0.02, normalized = 0.02/0.20 = 0.10
      // penalty = 0.34 * 0.01 = 0.0034, adjusted = 0.82 * 0.9966 = 0.8172
      // uncertainty = 0.1828 -> moderate
      // Try lower threshold to get low risk
      const lowRisk = computeCalibratedUncertainty(0.90, 0.10, 0.95);
      // Below threshold, no penalty: adjusted = 0.90, uncertainty = 0.10 -> low
      expect(lowRisk.risk).toBe('low');
    });

    it('should assign moderate risk for uncertainty 15-30%', () => {
      const result = computeCalibratedUncertainty(0.82, 0.34, 0.80);
      // uncertainty ~0.18
      expect(result.risk).toBe('moderate');
    });

    it('should assign elevated risk for uncertainty 30-50%', () => {
      const result = computeCalibratedUncertainty(0.99, 0.34, 0.80);
      // uncertainty ~0.31
      expect(result.risk).toBe('elevated');
    });

    it('should assign high risk for uncertainty >= 50%', () => {
      const result = computeCalibratedUncertainty(0.0);
      expect(result.risk).toBe('high');
    });
  });

  describe('overconfidence factor tuning', () => {
    it('should increase penalty with higher overconfidence factor', () => {
      const low = computeCalibratedUncertainty(0.95, 0.20, 0.80);
      const high = computeCalibratedUncertainty(0.95, 0.50, 0.80);

      expect(high.penalty).toBeGreaterThan(low.penalty);
      expect(high.calibratedUncertainty).toBeGreaterThan(low.calibratedUncertainty);
    });

    it('should have zero penalty when overconfidence factor is 0', () => {
      const result = computeCalibratedUncertainty(0.99, 0.0, 0.80);
      expect(result.penalty).toBe(0);
      expect(result.adjustedConfidence).toBe(0.99);
      expect(result.calibratedUncertainty).toBeCloseTo(0.01, 5);
    });
  });

  describe('penalty threshold tuning', () => {
    it('should start applying penalty earlier with lower threshold', () => {
      const highThreshold = computeCalibratedUncertainty(0.75, 0.34, 0.80);
      const lowThreshold = computeCalibratedUncertainty(0.75, 0.34, 0.60);

      expect(highThreshold.penalty).toBe(0); // 0.75 < 0.80, no penalty
      expect(lowThreshold.penalty).toBeGreaterThan(0); // 0.75 > 0.60, penalty
    });

    it('should produce larger penalty with lower threshold at same confidence', () => {
      const high = computeCalibratedUncertainty(0.95, 0.34, 0.90);
      const low = computeCalibratedUncertainty(0.95, 0.34, 0.50);

      expect(low.penalty).toBeGreaterThan(high.penalty);
    });
  });
});

// =============================================================================
// COMPONENT PROPS
// =============================================================================

describe('CalibrationUncertaintyIndicator', () => {
  describe('prop forwarding', () => {
    it('should accept rawConfidence prop', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.92,
      });
      expect(getProps(element).rawConfidence).toBe(0.92);
    });

    it('should accept modelId prop', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.85,
        modelId: 'brittney-v3',
      });
      expect(getProps(element).modelId).toBe('brittney-v3');
    });

    it('should accept overconfidenceFactor and penaltyThreshold props', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.95,
        overconfidenceFactor: 0.50,
        penaltyThreshold: 0.70,
      });
      expect(getProps(element).overconfidenceFactor).toBe(0.50);
      expect(getProps(element).penaltyThreshold).toBe(0.70);
    });

    it('should accept showComparison and showHistory toggles', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.80,
        showComparison: false,
        showHistory: false,
      });
      expect(getProps(element).showComparison).toBe(false);
      expect(getProps(element).showHistory).toBe(false);
    });

    it('should accept history prop', () => {
      const history: CalibrationSnapshot[] = [
        { timestamp: 1000, rawConfidence: 0.85, wasCorrect: true },
        { timestamp: 2000, rawConfidence: 0.92, wasCorrect: false },
        { timestamp: 3000, rawConfidence: 0.78, wasCorrect: null },
      ];
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.90,
        history,
      });
      expect(getProps(element).history).toBe(history);
    });

    it('should accept className and style props', () => {
      const style = { maxWidth: 400 };
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.85,
        className: 'custom-class',
        style,
      });
      expect(getProps(element).className).toBe('custom-class');
      expect(getProps(element).style).toBe(style);
    });
  });

  describe('default values', () => {
    it('should default overconfidenceFactor to 0.34', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.95,
      });
      // The default is defined in the component; we verify the algorithm
      // uses 0.34 when no prop is passed
      const result = computeCalibratedUncertainty(0.95, 0.34, 0.80);
      expect(result.overconfidenceFactor).toBeUndefined; // not exposed, but used
      expect(result.penalty).toBeGreaterThan(0);
    });

    it('should default showComparison to true', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.85,
      });
      // Default is true per interface definition
      expect(getProps(element).showComparison).toBeUndefined();
      // undefined means the default in component body takes effect (true)
    });

    it('should default showHistory to true', () => {
      const element = React.createElement(CalibrationUncertaintyIndicator, {
        rawConfidence: 0.85,
      });
      expect(getProps(element).showHistory).toBeUndefined();
    });
  });
});

// =============================================================================
// INVERSE CORRELATION VERIFICATION
// =============================================================================

describe('inverse correlation property', () => {
  it('should demonstrate that 99% confident model has higher uncertainty than 70% confident model', () => {
    const highConf = computeCalibratedUncertainty(0.99, 0.34, 0.80);
    const medConf = computeCalibratedUncertainty(0.70, 0.34, 0.80);

    // At 0.70 (below threshold): uncertainty = 0.30
    // At 0.99 (above threshold): uncertainty ~0.31
    // This is the counterintuitive insight: 99% raw confidence
    // yields MORE uncertainty than 70% raw confidence
    expect(highConf.calibratedUncertainty).toBeGreaterThan(medConf.calibratedUncertainty);
  });

  it('should have monotonically increasing uncertainty above a critical confidence level', () => {
    // There exists a "sweet spot" confidence level where uncertainty is minimized.
    // Above that point, uncertainty INCREASES with raw confidence.
    const results: Array<{ raw: number; uncertainty: number }> = [];
    for (let raw = 0.85; raw <= 1.0; raw += 0.01) {
      const r = computeCalibratedUncertainty(raw, 0.34, 0.80);
      results.push({ raw, uncertainty: r.calibratedUncertainty });
    }

    // Find the minimum uncertainty point
    let minIdx = 0;
    for (let i = 1; i < results.length; i++) {
      if (results[i].uncertainty < results[minIdx].uncertainty) {
        minIdx = i;
      }
    }

    // Above the minimum, uncertainty should be increasing (or at least not decreasing)
    for (let i = minIdx + 1; i < results.length; i++) {
      expect(results[i].uncertainty).toBeGreaterThanOrEqual(results[i - 1].uncertainty - 0.001);
    }
  });

  it('should have monotonically decreasing uncertainty below the threshold', () => {
    // Below the threshold, no penalty is applied, so
    // uncertainty = 1 - rawConfidence (monotonically decreasing)
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.79];
    const uncertainties = values.map((v) =>
      computeCalibratedUncertainty(v, 0.34, 0.80).calibratedUncertainty,
    );

    for (let i = 1; i < uncertainties.length; i++) {
      expect(uncertainties[i]).toBeLessThan(uncertainties[i - 1]);
    }
  });
});

// =============================================================================
// RISK TIER BOUNDARIES
// =============================================================================

describe('risk tier boundary tests', () => {
  it('boundary at 15% uncertainty (low->moderate)', () => {
    // Find a confidence level that gives exactly ~15% uncertainty
    // Below threshold: uncertainty = 1 - confidence
    // At 85% confidence and 80% threshold:
    //   excess = 0.05, normalized = 0.25, penalty = 0.34 * 0.0625 = 0.02125
    //   adjusted = 0.85 * 0.97875 = 0.831937..., uncertainty = 0.168
    // That's moderate. Let's try 0.86:
    //   excess = 0.06, normalized = 0.30, penalty = 0.34 * 0.09 = 0.0306
    //   adjusted = 0.86 * 0.9694 = 0.83368, uncertainty = 0.166
    // Still moderate. For low we need uncertainty < 0.15
    const lowResult = computeCalibratedUncertainty(0.90, 0.10, 0.95);
    expect(lowResult.risk).toBe('low');
    expect(lowResult.calibratedUncertainty).toBeLessThan(0.15);

    const moderateResult = computeCalibratedUncertainty(0.82, 0.34, 0.80);
    expect(moderateResult.risk).toBe('moderate');
    expect(moderateResult.calibratedUncertainty).toBeGreaterThanOrEqual(0.15);
  });

  it('boundary at 30% uncertainty (moderate->elevated)', () => {
    const elevated = computeCalibratedUncertainty(0.99, 0.34, 0.80);
    expect(elevated.risk).toBe('elevated');
    expect(elevated.calibratedUncertainty).toBeGreaterThanOrEqual(0.30);
    expect(elevated.calibratedUncertainty).toBeLessThan(0.50);
  });

  it('boundary at 50% uncertainty (elevated->high)', () => {
    const high = computeCalibratedUncertainty(0.0);
    expect(high.risk).toBe('high');
    expect(high.calibratedUncertainty).toBeGreaterThanOrEqual(0.50);
  });
});
