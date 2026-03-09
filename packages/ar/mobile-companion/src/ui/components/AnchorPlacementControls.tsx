/**
 * AnchorPlacementControls Component
 *
 * Touch gesture controls for AR anchor placement with multi-touch support.
 * Provides translation, rotation, and scaling interactions with visual feedback.
 *
 * Features:
 * - Single-finger drag for XZ-plane translation
 * - Two-finger pinch for scaling
 * - Two-finger rotation for Y-axis rotation
 * - Vertical drag for Y-axis (height) adjustment
 * - Snap-to-grid option
 * - Undo/redo placement history
 * - Placement confirmation/cancel buttons
 * - Haptic feedback on interactions (iOS/Android)
 *
 * @package @hololand/ar-mobile-companion
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
  Vibration,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import type { SpatialAnchor, Pose6DoF } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface AnchorTransform {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
}

export interface AnchorPlacementControlsProps {
  /** Current anchor being placed (null if no active anchor) */
  anchor: SpatialAnchor | null;

  /** Initial transform for the anchor */
  initialTransform?: Partial<AnchorTransform>;

  /** Callback when transform changes (real-time updates) */
  onTransformChange?: (transform: AnchorTransform) => void;

  /** Callback when placement is confirmed */
  onPlacementConfirm?: (anchor: SpatialAnchor, transform: AnchorTransform) => void;

  /** Callback when placement is cancelled */
  onPlacementCancel?: () => void;

  /** Enable snap-to-grid (in meters) */
  snapToGrid?: number | false;

  /** Minimum scale factor */
  minScale?: number;

  /** Maximum scale factor */
  maxScale?: number;

  /** Enable haptic feedback */
  hapticFeedback?: boolean;

  /** Enable undo/redo */
  enableHistory?: boolean;

  /** Custom control buttons */
  customControls?: React.ReactNode;

  /** Accessibility labels */
  accessibilityLabels?: {
    confirm?: string;
    cancel?: string;
    undo?: string;
    redo?: string;
  };
}

interface TouchInfo {
  x: number;
  y: number;
  identifier: number;
}

interface TransformHistory {
  transforms: AnchorTransform[];
  currentIndex: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TRANSFORM: AnchorTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1], // identity quaternion
  scale: [1, 1, 1],
};

const HAPTIC_DURATION = 50;
const ROTATION_SENSITIVITY = 0.5;
const SCALE_SENSITIVITY = 0.01;
const TRANSLATION_SENSITIVITY = 0.001; // meters per pixel

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const distance = (p1: TouchInfo, p2: TouchInfo): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const angle = (p1: TouchInfo, p2: TouchInfo): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AnchorPlacementControls: React.FC<AnchorPlacementControlsProps> = ({
  anchor,
  initialTransform = {},
  onTransformChange,
  onPlacementConfirm,
  onPlacementCancel,
  snapToGrid: gridSize = false,
  minScale = 0.1,
  maxScale = 10,
  hapticFeedback = true,
  enableHistory = true,
  customControls,
  accessibilityLabels = {},
}) => {
  // Animation values
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Transform state
  const [transform, setTransform] = useState<AnchorTransform>({
    ...DEFAULT_TRANSFORM,
    ...initialTransform,
  });

  // History state
  const [history, setHistory] = useState<TransformHistory>({
    transforms: [transform],
    currentIndex: 0,
  });

  // Gesture tracking state
  const [gestureState, setGestureState] = useState<{
    initialDistance: number | null;
    initialAngle: number | null;
    initialScale: number;
    initialRotation: number;
  }>({
    initialDistance: null,
    initialAngle: null,
    initialScale: 1,
    initialRotation: 0,
  });

  // =============================================================================
  // HAPTIC FEEDBACK
  // =============================================================================

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && Platform.OS !== 'web') {
      Vibration.vibrate(HAPTIC_DURATION);
    }
  }, [hapticFeedback]);

  // =============================================================================
  // TRANSFORM UPDATES
  // =============================================================================

  const updateTransform = useCallback(
    (updates: Partial<AnchorTransform>, addToHistory = false) => {
      const newTransform: AnchorTransform = {
        ...transform,
        ...updates,
      };

      setTransform(newTransform);
      onTransformChange?.(newTransform);

      if (addToHistory && enableHistory) {
        setHistory((prev) => {
          const newTransforms = prev.transforms.slice(0, prev.currentIndex + 1);
          newTransforms.push(newTransform);
          return {
            transforms: newTransforms,
            currentIndex: newTransforms.length - 1,
          };
        });
      }
    },
    [transform, onTransformChange, enableHistory]
  );

  // =============================================================================
  // GESTURE HANDLERS
  // =============================================================================

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Two-finger gesture: prepare for pinch/rotate
          const touch1: TouchInfo = {
            x: touches[0].pageX,
            y: touches[0].pageY,
            identifier: touches[0].identifier,
          };
          const touch2: TouchInfo = {
            x: touches[1].pageX,
            y: touches[1].pageY,
            identifier: touches[1].identifier,
          };

          const initialDistance = distance(touch1, touch2);
          const initialAngle = angle(touch1, touch2);

          setGestureState({
            initialDistance,
            initialAngle,
            initialScale: transform.scale[0],
            initialRotation: 0, // Extract from quaternion if needed
          });

          triggerHaptic();
        }
      },

      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 1) {
          // Single-finger drag: translate in XZ plane
          const dx = gestureState.dx * TRANSLATION_SENSITIVITY;
          const dz = -gestureState.dy * TRANSLATION_SENSITIVITY; // Inverted Y for forward/backward

          let newX = transform.position[0] + dx;
          let newZ = transform.position[2] + dz;

          if (gridSize) {
            newX = snapToGrid(newX, gridSize);
            newZ = snapToGrid(newZ, gridSize);
          }

          updateTransform({
            position: [newX, transform.position[1], newZ],
          });
        } else if (touches.length === 2) {
          // Two-finger gesture: pinch to scale, rotate
          const touch1: TouchInfo = {
            x: touches[0].pageX,
            y: touches[0].pageY,
            identifier: touches[0].identifier,
          };
          const touch2: TouchInfo = {
            x: touches[1].pageX,
            y: touches[1].pageY,
            identifier: touches[1].identifier,
          };

          const currentDistance = distance(touch1, touch2);
          const currentAngle = angle(touch1, touch2);

          // Scale calculation
          if (gestureState.initialDistance) {
            const scaleFactor = (currentDistance / gestureState.initialDistance) * gestureState.initialScale;
            const clampedScale = clamp(scaleFactor, minScale, maxScale);

            updateTransform({
              scale: [clampedScale, clampedScale, clampedScale],
            });
          }

          // Rotation calculation (Y-axis rotation)
          if (gestureState.initialAngle !== null) {
            const angleDelta = (currentAngle - gestureState.initialAngle) * ROTATION_SENSITIVITY;

            // Convert angle to quaternion (Y-axis rotation)
            const halfAngle = angleDelta / 2;
            const sinHalf = Math.sin(halfAngle);
            const cosHalf = Math.cos(halfAngle);

            updateTransform({
              rotation: [0, sinHalf, 0, cosHalf], // Y-axis rotation quaternion
            });
          }
        }
      },

      onPanResponderRelease: () => {
        // Add to history on gesture end
        updateTransform({}, true);

        setGestureState({
          initialDistance: null,
          initialAngle: null,
          initialScale: transform.scale[0],
          initialRotation: 0,
        });
      },
    })
  ).current;

  // =============================================================================
  // HISTORY MANAGEMENT
  // =============================================================================

  const handleUndo = useCallback(() => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      const previousTransform = history.transforms[newIndex];

      setTransform(previousTransform);
      onTransformChange?.(previousTransform);
      setHistory((prev) => ({ ...prev, currentIndex: newIndex }));

      triggerHaptic();
    }
  }, [history, onTransformChange, triggerHaptic]);

  const handleRedo = useCallback(() => {
    if (history.currentIndex < history.transforms.length - 1) {
      const newIndex = history.currentIndex + 1;
      const nextTransform = history.transforms[newIndex];

      setTransform(nextTransform);
      onTransformChange?.(nextTransform);
      setHistory((prev) => ({ ...prev, currentIndex: newIndex }));

      triggerHaptic();
    }
  }, [history, onTransformChange, triggerHaptic]);

  const canUndo = enableHistory && history.currentIndex > 0;
  const canRedo = enableHistory && history.currentIndex < history.transforms.length - 1;

  // =============================================================================
  // BUTTON HANDLERS
  // =============================================================================

  const handleConfirm = useCallback(() => {
    if (!anchor) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    triggerHaptic();
    onPlacementConfirm?.(anchor, transform);
  }, [anchor, transform, onPlacementConfirm, triggerHaptic, buttonScaleAnim]);

  const handleCancel = useCallback(() => {
    triggerHaptic();
    onPlacementCancel?.();
  }, [onPlacementCancel, triggerHaptic]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!anchor) {
    return null;
  }

  return (
    <>
      {/* Gesture capture area */}
      <View
        style={styles.gestureArea}
        {...panResponder.panHandlers}
        accessible={true}
        accessibilityLabel="AR anchor placement gesture area"
        accessibilityHint="Use one finger to move, two fingers to scale and rotate"
      />

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        {/* Undo/Redo buttons */}
        {enableHistory && (
          <View style={styles.historyButtons}>
            <TouchableOpacity
              style={[styles.historyButton, !canUndo && styles.historyButtonDisabled]}
              onPress={handleUndo}
              disabled={!canUndo}
              accessible={true}
              accessibilityLabel={accessibilityLabels.undo || 'Undo'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canUndo }}
            >
              <Text style={[styles.historyButtonText, !canUndo && styles.historyButtonTextDisabled]}>
                ↶ Undo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.historyButton, !canRedo && styles.historyButtonDisabled]}
              onPress={handleRedo}
              disabled={!canRedo}
              accessible={true}
              accessibilityLabel={accessibilityLabels.redo || 'Redo'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canRedo }}
            >
              <Text style={[styles.historyButtonText, !canRedo && styles.historyButtonTextDisabled]}>
                Redo ↷
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Custom controls */}
        {customControls}

        {/* Confirm/Cancel buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            accessible={true}
            accessibilityLabel={accessibilityLabels.cancel || 'Cancel placement'}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
              accessible={true}
              accessibilityLabel={accessibilityLabels.confirm || 'Confirm placement'}
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>Place</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Transform info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Position: ({transform.position[0].toFixed(2)}, {transform.position[1].toFixed(2)}, {transform.position[2].toFixed(2)})
          </Text>
          <Text style={styles.infoText}>
            Scale: {transform.scale[0].toFixed(2)}x
          </Text>
        </View>
      </View>
    </>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  gestureArea: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  historyButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 12,
  },
  historyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  historyButtonDisabled: {
    opacity: 0.3,
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButtonTextDisabled: {
    color: '#CCCCCC',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
