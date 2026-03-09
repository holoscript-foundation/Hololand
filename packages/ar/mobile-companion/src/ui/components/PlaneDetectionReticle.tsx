/**
 * PlaneDetectionReticle Component
 *
 * Visual feedback for AR plane detection with animated reticle and placement indicator.
 * Adapts to detected surface type (horizontal/vertical) and tracking quality.
 *
 * Features:
 * - Animated crosshair reticle with pulsing effect
 * - Color-coded by plane type (horizontal: blue, vertical: green, unknown: yellow)
 * - Tracking quality indicator (excellent, good, fair, poor)
 * - Placement confirmation visual with scale animation
 * - Touch-to-place interaction
 * - Responsive to device orientation
 *
 * @package @hololand/ar-mobile-companion
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import type { PlaneAlignment, TrackingState, ARPlane } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PlaneDetectionReticleProps {
  /** Current detected plane (null if no plane detected) */
  detectedPlane: ARPlane | null;

  /** AR tracking state */
  trackingState: TrackingState;

  /** Whether placement mode is active */
  placementMode: boolean;

  /** Callback when user confirms placement */
  onPlacementConfirm?: (plane: ARPlane) => void;

  /** Callback when user cancels placement */
  onPlacementCancel?: () => void;

  /** Reticle size in dp */
  size?: number;

  /** Show tracking quality indicator */
  showTrackingQuality?: boolean;

  /** Custom color overrides */
  colors?: {
    horizontal?: string;
    vertical?: string;
    unknown?: string;
  };

  /** Accessibility label */
  accessibilityLabel?: string;
}

interface ReticleStyle {
  color: string;
  label: string;
  borderWidth: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SIZE = 120;
const PULSE_DURATION = 1200;
const SCALE_DURATION = 300;

const TRACKING_QUALITY_COLORS = {
  normal: '#00FF00',
  limited: '#FFA500',
  notAvailable: '#FF0000',
} as const;

const PLANE_COLORS = {
  horizontal: '#3B82F6', // blue
  vertical: '#10B981',   // green
  horizontalUpward: '#3B82F6',
  horizontalDownward: '#3B82F6',
  vertical: '#10B981',
  arbitrary: '#F59E0B', // yellow
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export const PlaneDetectionReticle: React.FC<PlaneDetectionReticleProps> = ({
  detectedPlane,
  trackingState,
  placementMode,
  onPlacementConfirm,
  onPlacementCancel,
  size = DEFAULT_SIZE,
  showTrackingQuality = true,
  colors = {},
  accessibilityLabel = 'AR plane detection reticle',
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Local state
  const [isPlacing, setIsPlacing] = useState(false);

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const reticleStyle = React.useMemo((): ReticleStyle => {
    if (!detectedPlane) {
      return {
        color: '#9CA3AF', // gray
        label: 'Searching for surface...',
        borderWidth: 2,
      };
    }

    const alignment = detectedPlane.alignment;
    const baseColor = (() => {
      if (alignment === 'horizontal' || alignment === 'horizontalUpward' || alignment === 'horizontalDownward') {
        return colors.horizontal || PLANE_COLORS.horizontal;
      } else if (alignment === 'vertical') {
        return colors.vertical || PLANE_COLORS.vertical;
      } else {
        return colors.unknown || PLANE_COLORS.arbitrary;
      }
    })();

    const label = (() => {
      switch (alignment) {
        case 'horizontal':
        case 'horizontalUpward':
          return 'Floor detected';
        case 'horizontalDownward':
          return 'Ceiling detected';
        case 'vertical':
          return 'Wall detected';
        default:
          return 'Surface detected';
      }
    })();

    return {
      color: baseColor,
      label,
      borderWidth: 3,
    };
  }, [detectedPlane, colors]);

  const trackingQualityColor = React.useMemo(() => {
    return TRACKING_QUALITY_COLORS[trackingState] || TRACKING_QUALITY_COLORS.notAvailable;
  }, [trackingState]);

  const isPlaceable = detectedPlane !== null && trackingState === 'normal';

  // =============================================================================
  // ANIMATIONS
  // =============================================================================

  // Pulsing animation for reticle
  useEffect(() => {
    if (!isPlaceable) {
      // Slow pulse when searching
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: PULSE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: PULSE_DURATION,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Fast pulse when ready
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isPlaceable, pulseAnim]);

  // Rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  // Fade in/out based on plane detection
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: detectedPlane ? 1 : 0.5,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [detectedPlane, opacityAnim]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handlePress = () => {
    if (!isPlaceable || !placementMode) return;

    setIsPlacing(true);

    // Confirmation animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: SCALE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: SCALE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsPlacing(false);
      onPlacementConfirm?.(detectedPlane);
    });
  };

  const handleCancel = () => {
    onPlacementCancel?.();
  };

  // =============================================================================
  // COMPUTED STYLES
  // =============================================================================

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
    },
  ];

  const reticleOuterStyle = [
    styles.reticleOuter,
    {
      borderColor: reticleStyle.color,
      borderWidth: reticleStyle.borderWidth,
      opacity: opacityAnim,
      transform: [
        { scale: pulseAnim },
        { scale: scaleAnim },
      ],
    },
  ];

  const reticleInnerStyle = [
    styles.reticleInner,
    {
      transform: [{ rotate: rotateInterpolate }],
    },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={!isPlaceable || !placementMode}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{
          disabled: !isPlaceable || !placementMode,
        }}
        accessibilityHint={
          isPlaceable && placementMode
            ? 'Double tap to place object on detected surface'
            : 'Move device to detect surfaces'
        }
      >
        <Animated.View style={containerStyle}>
          {/* Outer circle */}
          <Animated.View style={reticleOuterStyle}>
            {/* Inner rotating crosshair */}
            <Animated.View style={reticleInnerStyle}>
              {/* Horizontal line */}
              <View
                style={[
                  styles.crosshairLine,
                  styles.crosshairHorizontal,
                  { backgroundColor: reticleStyle.color },
                ]}
              />
              {/* Vertical line */}
              <View
                style={[
                  styles.crosshairLine,
                  styles.crosshairVertical,
                  { backgroundColor: reticleStyle.color },
                ]}
              />
            </Animated.View>

            {/* Center dot */}
            <View
              style={[
                styles.centerDot,
                { backgroundColor: reticleStyle.color },
              ]}
            />
          </Animated.View>

          {/* Tracking quality indicator */}
          {showTrackingQuality && (
            <View style={styles.trackingIndicator}>
              <View
                style={[
                  styles.trackingDot,
                  { backgroundColor: trackingQualityColor },
                ]}
              />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Status label */}
      {detectedPlane && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: reticleStyle.color }]}>
            {reticleStyle.label}
          </Text>
          {placementMode && isPlaceable && (
            <Text style={styles.placementHint}>Tap to place</Text>
          )}
        </View>
      )}

      {/* Cancel button (placement mode) */}
      {placementMode && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          accessible={true}
          accessibilityLabel="Cancel placement"
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'solid',
  },
  reticleInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
  },
  crosshairHorizontal: {
    width: '60%',
    height: 2,
  },
  crosshairVertical: {
    width: 2,
    height: '60%',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackingIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  trackingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  labelContainer: {
    position: 'absolute',
    bottom: -50,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  placementHint: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cancelButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
