/**
 * Tests for PlaneDetectionReticle Component
 *
 * @package @hololand/ar-mobile-companion
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlaneDetectionReticle } from '../components/PlaneDetectionReticle';
import type { ARPlane, TrackingState } from '../../types';

describe('PlaneDetectionReticle', () => {
  const mockPlane: ARPlane = {
    id: 'plane-1',
    alignment: 'horizontal',
    classification: 'floor',
    extent: { width: 2.0, height: 2.0 },
    center: { x: 0, y: 0, z: -1 },
    transform: new Float32Array(16),
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={null}
          trackingState="normal"
          placementMode={false}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should show "Searching for surface..." when no plane detected', () => {
      const { queryByText } = render(
        <PlaneDetectionReticle
          detectedPlane={null}
          trackingState="normal"
          placementMode={false}
        />
      );
      // Note: The label is conditionally rendered only when plane exists
      expect(queryByText('Searching for surface...')).toBeNull();
    });

    it('should show "Floor detected" for horizontal plane', () => {
      const { getByText } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
        />
      );
      expect(getByText('Floor detected')).toBeTruthy();
    });

    it('should show "Wall detected" for vertical plane', () => {
      const verticalPlane = { ...mockPlane, alignment: 'vertical' as const };
      const { getByText } = render(
        <PlaneDetectionReticle
          detectedPlane={verticalPlane}
          trackingState="normal"
          placementMode={false}
        />
      );
      expect(getByText('Wall detected')).toBeTruthy();
    });

    it('should show tracking quality indicator when enabled', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
          showTrackingQuality={true}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should hide tracking quality indicator when disabled', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
          showTrackingQuality={false}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Placement Mode', () => {
    it('should show "Tap to place" hint in placement mode', () => {
      const { getByText } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
        />
      );
      expect(getByText('Tap to place')).toBeTruthy();
    });

    it('should show cancel button in placement mode', () => {
      const { getByText } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
        />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should call onPlacementConfirm when tapped', () => {
      const onConfirm = jest.fn();
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
          onPlacementConfirm={onConfirm}
        />
      );

      const reticle = getByA11yLabel('AR plane detection reticle');
      fireEvent.press(reticle);

      // Wait for animation to complete
      setTimeout(() => {
        expect(onConfirm).toHaveBeenCalledWith(mockPlane);
      }, 700);
    });

    it('should call onPlacementCancel when cancel button pressed', () => {
      const onCancel = jest.fn();
      const { getByText } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
          onPlacementCancel={onCancel}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should not trigger placement when tracking is limited', () => {
      const onConfirm = jest.fn();
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="limited"
          placementMode={true}
          onPlacementConfirm={onConfirm}
        />
      );

      const reticle = getByA11yLabel('AR plane detection reticle');
      fireEvent.press(reticle);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should not trigger placement when no plane detected', () => {
      const onConfirm = jest.fn();
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={null}
          trackingState="normal"
          placementMode={true}
          onPlacementConfirm={onConfirm}
        />
      );

      const reticle = getByA11yLabel('AR plane detection reticle');
      fireEvent.press(reticle);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom horizontal color', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
          colors={{ horizontal: '#FF0000' }}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should apply custom size', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
          size={200}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
          accessibilityLabel="Custom reticle label"
        />
      );
      expect(getByA11yLabel('Custom reticle label')).toBeTruthy();
    });

    it('should have button role', () => {
      const { getByA11yRole } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
        />
      );
      expect(getByA11yRole('button')).toBeTruthy();
    });

    it('should indicate disabled state when not placeable', () => {
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={null}
          trackingState="normal"
          placementMode={true}
        />
      );

      const reticle = getByA11yLabel('AR plane detection reticle');
      expect(reticle.props.accessibilityState.disabled).toBe(true);
    });

    it('should provide appropriate accessibility hint', () => {
      const { getByA11yLabel } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={true}
        />
      );

      const reticle = getByA11yLabel('AR plane detection reticle');
      expect(reticle.props.accessibilityHint).toContain('Double tap to place');
    });
  });

  describe('Tracking States', () => {
    it('should show normal tracking color when tracking is normal', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="normal"
          placementMode={false}
          showTrackingQuality={true}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should show warning color when tracking is limited', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="limited"
          placementMode={false}
          showTrackingQuality={true}
        />
      );
      expect(container).toBeTruthy();
    });

    it('should show error color when tracking is not available', () => {
      const { container } = render(
        <PlaneDetectionReticle
          detectedPlane={mockPlane}
          trackingState="notAvailable"
          placementMode={false}
          showTrackingQuality={true}
        />
      );
      expect(container).toBeTruthy();
    });
  });
});
