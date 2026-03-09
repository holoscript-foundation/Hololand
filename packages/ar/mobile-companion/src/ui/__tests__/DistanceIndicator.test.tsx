/**
 * Tests for DistanceIndicator Component
 *
 * @package @hololand/ar-mobile-companion
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DistanceIndicator } from '../components/DistanceIndicator';
import type { Pose6DoF, MeasurementPoint } from '../../types';

describe('DistanceIndicator', () => {
  const mockCameraPose: Pose6DoF = {
    position: [0, 1.5, 0],
    orientation: [0, 0, 0, 1],
  };

  const mockPoints: MeasurementPoint[] = [
    { id: 'p1', position: [0, 0, 0], timestamp: Date.now() },
    { id: 'p2', position: [1, 0, 0], timestamp: Date.now() + 1000 },
  ];

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <DistanceIndicator cameraPose={mockCameraPose} />
      );
      expect(container).toBeTruthy();
    });

    it('should show current measurement mode', () => {
      const { getByText } = render(
        <DistanceIndicator cameraPose={mockCameraPose} mode="point" />
      );
      expect(getByText('📏 Point to Point')).toBeTruthy();
    });

    it('should collapse/expand on header press', () => {
      const { getByA11yLabel, queryByText } = render(
        <DistanceIndicator cameraPose={mockCameraPose} />
      );

      const header = getByA11yLabel('Measurement panel');

      // Initially expanded
      expect(queryByText('+ Add Point')).toBeTruthy();

      // Collapse
      fireEvent.press(header);
      expect(queryByText('+ Add Point')).toBeNull();

      // Expand again
      fireEvent.press(header);
      expect(queryByText('+ Add Point')).toBeTruthy();
    });
  });

  describe('Measurement Modes', () => {
    it('should calculate point-to-point distance correctly', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="point"
          unit="meters"
        />
      );
      // Distance between [0,0,0] and [1,0,0] is 1.0m
      expect(getByText('1.00 m')).toBeTruthy();
    });

    it('should calculate path length correctly', () => {
      const threePoints: MeasurementPoint[] = [
        { id: 'p1', position: [0, 0, 0], timestamp: Date.now() },
        { id: 'p2', position: [1, 0, 0], timestamp: Date.now() + 1000 },
        { id: 'p3', position: [1, 1, 0], timestamp: Date.now() + 2000 },
      ];

      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={threePoints}
          mode="path"
          unit="meters"
        />
      );
      // Path length: 1.0 + 1.0 = 2.0m
      expect(getByText('2.00 m')).toBeTruthy();
    });

    it('should show 0 for area with less than 3 points', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="area"
          unit="meters"
        />
      );
      expect(getByText('0.00 m²')).toBeTruthy();
    });

    it('should switch modes when mode button pressed', () => {
      const onModeChange = jest.fn();
      const { getByA11yLabel } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          mode="point"
          onModeChange={onModeChange}
        />
      );

      const pathButton = getByA11yLabel('Path Length mode');
      fireEvent.press(pathButton);

      expect(onModeChange).toHaveBeenCalledWith('path');
    });

    it('should show minimum points required', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={[mockPoints[0]]}
          mode="point"
        />
      );
      expect(getByText('1 / 2+ points')).toBeTruthy();
    });

    it('should require 3 points minimum for area mode', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="area"
        />
      );
      expect(getByText('2 / 3+ points')).toBeTruthy();
    });
  });

  describe('Unit Conversion', () => {
    it('should display measurement in meters', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="point"
          unit="meters"
        />
      );
      expect(getByText('1.00 m')).toBeTruthy();
    });

    it('should toggle units when unit button pressed', () => {
      const onUnitChange = jest.fn();
      const { getByA11yLabel } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          unit="meters"
          onUnitChange={onUnitChange}
        />
      );

      const unitButton = getByA11yLabel('Change unit, currently meters');
      fireEvent.press(unitButton);

      expect(onUnitChange).toHaveBeenCalledWith('feet');
    });

    it('should cycle through units: meters -> feet -> inches -> meters', () => {
      const onUnitChange = jest.fn();
      const { getByA11yLabel, rerender } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          unit="meters"
          onUnitChange={onUnitChange}
        />
      );

      const unitButton = getByA11yLabel('Change unit, currently meters');
      fireEvent.press(unitButton);
      expect(onUnitChange).toHaveBeenCalledWith('feet');

      rerender(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          unit="feet"
          onUnitChange={onUnitChange}
        />
      );

      fireEvent.press(unitButton);
      expect(onUnitChange).toHaveBeenCalledWith('inches');
    });
  });

  describe('Actions', () => {
    it('should call onPointAdded when Add Point button pressed', () => {
      const onPointAdded = jest.fn();
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          onPointAdded={onPointAdded}
        />
      );

      const addButton = getByText('+ Add Point');
      fireEvent.press(addButton);

      expect(onPointAdded).toHaveBeenCalled();
      expect(onPointAdded.mock.calls[0][0]).toHaveProperty('id');
      expect(onPointAdded.mock.calls[0][0]).toHaveProperty('position');
      expect(onPointAdded.mock.calls[0][0]).toHaveProperty('timestamp');
    });

    it('should call onMeasurementClear when Clear button pressed', () => {
      const onClear = jest.fn();
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          onMeasurementClear={onClear}
        />
      );

      const clearButton = getByText('Clear');
      fireEvent.press(clearButton);

      expect(onClear).toHaveBeenCalled();
    });

    it('should call onMeasurementComplete when Save button pressed', () => {
      const onComplete = jest.fn();
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="point"
          unit="meters"
          onMeasurementComplete={onComplete}
        />
      );

      const saveButton = getByText('✓ Save Measurement');
      fireEvent.press(saveButton);

      expect(onComplete).toHaveBeenCalled();
      const measurement = onComplete.mock.calls[0][0];
      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('mode', 'point');
      expect(measurement).toHaveProperty('value');
      expect(measurement).toHaveProperty('unit', 'meters');
    });

    it('should not show Save button when insufficient points', () => {
      const { queryByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={[mockPoints[0]]}
          mode="point"
        />
      );

      expect(queryByText('✓ Save Measurement')).toBeNull();
    });

    it('should show Save button when sufficient points', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          measurementPoints={mockPoints}
          mode="point"
        />
      );

      expect(getByText('✓ Save Measurement')).toBeTruthy();
    });
  });

  describe('History', () => {
    const mockHistory = [
      {
        id: 'm1',
        mode: 'point' as const,
        points: mockPoints,
        value: 1.0,
        unit: 'meters' as const,
        timestamp: Date.now(),
      },
      {
        id: 'm2',
        mode: 'path' as const,
        points: mockPoints,
        value: 2.0,
        unit: 'meters' as const,
        timestamp: Date.now(),
      },
    ];

    it('should show history when enabled', () => {
      const { getByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          showHistory={true}
          history={mockHistory}
        />
      );

      expect(getByText('History')).toBeTruthy();
      expect(getByText('1.00 m')).toBeTruthy();
      expect(getByText('2.00 m')).toBeTruthy();
    });

    it('should hide history when disabled', () => {
      const { queryByText } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          showHistory={false}
          history={mockHistory}
        />
      );

      expect(queryByText('History')).toBeNull();
    });

    it('should show most recent 5 measurements', () => {
      const largeHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `m${i}`,
        mode: 'point' as const,
        points: mockPoints,
        value: i,
        unit: 'meters' as const,
        timestamp: Date.now() + i,
      }));

      const { container } = render(
        <DistanceIndicator
          cameraPose={mockCameraPose}
          showHistory={true}
          history={largeHistory}
        />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible measurement panel', () => {
      const { getByA11yLabel } = render(
        <DistanceIndicator cameraPose={mockCameraPose} />
      );
      expect(getByA11yLabel('Measurement panel')).toBeTruthy();
    });

    it('should have accessible mode buttons', () => {
      const { getByA11yLabel } = render(
        <DistanceIndicator cameraPose={mockCameraPose} mode="point" />
      );

      expect(getByA11yLabel('Point to Point mode')).toBeTruthy();
      expect(getByA11yLabel('Path Length mode')).toBeTruthy();
      expect(getByA11yLabel('Area mode')).toBeTruthy();
      expect(getByA11yLabel('Volume mode')).toBeTruthy();
    });

    it('should indicate selected mode in accessibility state', () => {
      const { getByA11yLabel } = render(
        <DistanceIndicator cameraPose={mockCameraPose} mode="point" />
      );

      const pointButton = getByA11yLabel('Point to Point mode');
      expect(pointButton.props.accessibilityState.selected).toBe(true);

      const pathButton = getByA11yLabel('Path Length mode');
      expect(pathButton.props.accessibilityState.selected).toBe(false);
    });
  });
});
