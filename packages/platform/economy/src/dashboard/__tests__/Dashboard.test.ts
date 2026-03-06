import { describe, it, expect, beforeEach } from 'vitest';
import { EconomicHUD } from '../EconomicHUD';
import { InflationGauge } from '../InflationGauge';
import { GiniChart } from '../GiniChart';
import { VelocityMeter } from '../VelocityMeter';

describe('EconomicHUD', () => {
  let hud: EconomicHUD;
  beforeEach(() => { hud = new EconomicHUD({ maxElements: 5 }); });

  it('adds and retrieves elements', () => {
    hud.setElement({ id: 'e1', type: 'gauge', label: 'Test', value: 42, unit: '%', position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, color: '#fff', visible: true });
    expect(hud.getVisibleElements().length).toBe(1);
  });

  it('enforces max elements', () => {
    for (let i = 0; i < 6; i++) {
      hud.setElement({ id: `e${i}`, type: 'text', label: '', value: '', unit: '', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, color: '', visible: true });
    }
    expect(hud.getElementCount()).toBe(5);
  });

  it('hides elements when not visible', () => {
    hud.setElement({ id: 'e1', type: 'text', label: '', value: '', unit: '', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, color: '', visible: true });
    hud.setVisible(false);
    expect(hud.getVisibleElements().length).toBe(0);
  });

  it('updates element values', () => {
    hud.setElement({ id: 'e1', type: 'gauge', label: 'X', value: 0, unit: '', position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, color: '', visible: true });
    hud.updateValue('e1', 99);
    expect(hud.getVisibleElements()[0].value).toBe(99);
  });
});

describe('InflationGauge', () => {
  let gauge: InflationGauge;
  beforeEach(() => { gauge = new InflationGauge(0.05, 0.15); });

  it('records and tracks inflation', () => {
    gauge.record(0.02);
    expect(gauge.getCurrentRate()).toBe(0.02);
  });

  it('detects severity levels', () => {
    expect(gauge.record(0.01).severity).toBe('normal');
    expect(gauge.record(0.06).severity).toBe('warning');
    expect(gauge.record(0.20).severity).toBe('critical');
  });

  it('detects trend', () => {
    gauge.record(0.01);
    gauge.record(0.05);
    expect(gauge.getTrend()).toBe('rising');
  });
});

describe('GiniChart', () => {
  let chart: GiniChart;
  beforeEach(() => { chart = new GiniChart(0.4); });

  it('records Gini data points', () => {
    chart.record(0.35, 100);
    expect(chart.getCurrentGini()).toBe(0.35);
    expect(chart.isAboveTarget()).toBe(false);
  });

  it('detects above target', () => {
    chart.record(0.6, 100);
    expect(chart.isAboveTarget()).toBe(true);
    expect(chart.getDeviationFromTarget()).toBeCloseTo(0.2);
  });
});

describe('VelocityMeter', () => {
  let meter: VelocityMeter;
  beforeEach(() => { meter = new VelocityMeter(); });

  it('tracks transaction volume', () => {
    meter.recordTransaction(100);
    meter.recordTransaction(200);
    const reading = meter.computeVelocity(1000);
    expect(reading.velocity).toBe(0.3);
    expect(reading.transactionCount).toBe(2);
  });

  it('resets counters after velocity computation', () => {
    meter.recordTransaction(100);
    meter.computeVelocity(1000);
    const reading = meter.computeVelocity(1000);
    expect(reading.velocity).toBe(0);
  });
});
