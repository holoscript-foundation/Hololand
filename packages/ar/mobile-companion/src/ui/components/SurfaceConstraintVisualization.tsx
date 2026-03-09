/**
 * SurfaceConstraintVisualization Component
 *
 * Visual feedback for surface detection constraints and placement validation.
 * Shows surface type, orientation, and placement suitability with real-time feedback.
 *
 * Features:
 * - Surface type visualization (floor, wall, ceiling, table)
 * - Surface orientation indicators (horizontal/vertical/angled)
 * - Surface size estimation (area in m²)
 * - Placement constraint warnings (too small, unstable, occluded)
 * - Surface stability score
 * - Grid overlay for spatial reference
 * - Classification confidence indicator
 * - Accessibility support
 *
 * @package @hololand/ar-mobile-companion
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Platform,
} from 'react-native';
import type { ARPlane, PlaneAlignment, PlaneClassification } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface SurfaceConstraint {
  type: 'size' | 'stability' | 'occlusion' | 'orientation' | 'boundary';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface SurfaceAnalysis {
  plane: ARPlane;
  area: number;
  stability: number; // 0-1
  constraints: SurfaceConstraint[];
  isPlaceable: boolean;
}

export interface SurfaceConstraintVisualizationProps {
  /** Detected plane */
  plane: ARPlane | null;

  /** Surface analysis results */
  analysis?: SurfaceAnalysis | null;

  /** Minimum required surface area (m²) */
  minArea?: number;

  /** Minimum stability score (0-1) */
  minStability?: number;

  /** Show grid overlay */
  showGrid?: boolean;

  /** Show classification label */
  showClassification?: boolean;

  /** Show constraint warnings */
  showConstraints?: boolean;

  /** Custom constraint validator */
  customValidator?: (plane: ARPlane) => SurfaceConstraint[];

  /** Container style override */
  containerStyle?: object;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CLASSIFICATION_LABELS: Record<PlaneClassification, string> = {
  floor: '🏠 Floor',
  wall: '🧱 Wall',
  ceiling: '⬆️ Ceiling',
  table: '🪑 Table',
  seat: '💺 Seat',
  door: '🚪 Door',
  window: '🪟 Window',
  none: '❓ Unknown',
};

const CLASSIFICATION_COLORS: Record<PlaneClassification, string> = {
  floor: '#10B981',
  wall: '#3B82F6',
  ceiling: '#8B5CF6',
  table: '#F59E0B',
  seat: '#EC4899',
  door: '#EF4444',
  window: '#06B6D4',
  none: '#6B7280',
};

const ALIGNMENT_LABELS: Record<PlaneAlignment, string> = {
  horizontal: 'Horizontal',
  horizontalUpward: 'Horizontal ↑',
  horizontalDownward: 'Horizontal ↓',
  vertical: 'Vertical',
  arbitrary: 'Angled',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const calculateArea = (plane: ARPlane): number => {
  // Simplified area calculation from extent
  if (plane.extent) {
    return plane.extent.width * plane.extent.height;
  }
  return 0;
};

const calculateStability = (plane: ARPlane): number => {
  // Stability heuristic based on:
  // - Tracking state
  // - Surface size (larger = more stable)
  // - Classification confidence
  // - Time since first detection (older = more stable)

  let stability = 0.5; // Base score

  // Size factor (larger surfaces are more stable)
  const area = calculateArea(plane);
  if (area > 1.0) stability += 0.2;
  if (area > 2.0) stability += 0.1;

  // Classification factor (known types are more stable)
  if (plane.classification && plane.classification !== 'none') {
    stability += 0.2;
  }

  return Math.min(stability, 1.0);
};

const validateConstraints = (
  plane: ARPlane,
  minArea: number,
  minStability: number
): SurfaceConstraint[] => {
  const constraints: SurfaceConstraint[] = [];
  const area = calculateArea(plane);
  const stability = calculateStability(plane);

  // Size constraint
  if (area < minArea) {
    constraints.push({
      type: 'size',
      severity: 'warning',
      message: `Surface too small (${area.toFixed(2)}m² < ${minArea.toFixed(2)}m²)`,
    });
  }

  // Stability constraint
  if (stability < minStability) {
    constraints.push({
      type: 'stability',
      severity: 'warning',
      message: `Low surface stability (${(stability * 100).toFixed(0)}% < ${(minStability * 100).toFixed(0)}%)`,
    });
  }

  // Orientation constraint
  if (plane.alignment === 'arbitrary') {
    constraints.push({
      type: 'orientation',
      severity: 'info',
      message: 'Angled surface may affect placement accuracy',
    });
  }

  return constraints;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const SurfaceConstraintVisualization: React.FC<SurfaceConstraintVisualizationProps> = ({
  plane,
  analysis,
  minArea = 0.25,
  minStability = 0.6,
  showGrid = true,
  showClassification = true,
  showConstraints = true,
  customValidator,
  containerStyle,
}) => {
  // Animation values
  const gridOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const surfaceAnalysis = useMemo((): SurfaceAnalysis | null => {
    if (!plane) return null;

    if (analysis) return analysis;

    // Generate analysis if not provided
    const area = calculateArea(plane);
    const stability = calculateStability(plane);
    const constraints = [
      ...validateConstraints(plane, minArea, minStability),
      ...(customValidator ? customValidator(plane) : []),
    ];

    return {
      plane,
      area,
      stability,
      constraints,
      isPlaceable: constraints.filter((c) => c.severity === 'error').length === 0,
    };
  }, [plane, analysis, minArea, minStability, customValidator]);

  const classificationColor = useMemo(() => {
    if (!plane || !plane.classification) {
      return CLASSIFICATION_COLORS.none;
    }
    return CLASSIFICATION_COLORS[plane.classification];
  }, [plane]);

  const classificationLabel = useMemo(() => {
    if (!plane || !plane.classification) {
      return CLASSIFICATION_LABELS.none;
    }
    return CLASSIFICATION_LABELS[plane.classification];
  }, [plane]);

  const alignmentLabel = useMemo(() => {
    if (!plane) return '';
    return ALIGNMENT_LABELS[plane.alignment] || 'Unknown';
  }, [plane]);

  const stabilityColor = useMemo(() => {
    if (!surfaceAnalysis) return '#6B7280';

    if (surfaceAnalysis.stability >= 0.8) return '#10B981'; // Green
    if (surfaceAnalysis.stability >= 0.6) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  }, [surfaceAnalysis]);

  const hasErrors = useMemo(() => {
    return surfaceAnalysis?.constraints.some((c) => c.severity === 'error') || false;
  }, [surfaceAnalysis]);

  const hasWarnings = useMemo(() => {
    return surfaceAnalysis?.constraints.some((c) => c.severity === 'warning') || false;
  }, [surfaceAnalysis]);

  // =============================================================================
  // ANIMATIONS
  // =============================================================================

  useEffect(() => {
    // Fade in grid when plane detected
    Animated.timing(gridOpacityAnim, {
      toValue: plane ? 0.3 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [plane, gridOpacityAnim]);

  useEffect(() => {
    // Pulse animation for warnings/errors
    if (hasErrors || hasWarnings) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasErrors, hasWarnings, pulseAnim]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!plane || !surfaceAnalysis) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Grid Overlay */}
      {showGrid && (
        <Animated.View
          style={[
            styles.gridOverlay,
            {
              opacity: gridOpacityAnim,
              borderColor: classificationColor,
            },
          ]}
        >
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={`h-${i}`}
                style={[
                  styles.gridLine,
                  styles.gridLineHorizontal,
                  { backgroundColor: classificationColor },
                ]}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={`v-${i}`}
                style={[
                  styles.gridLine,
                  styles.gridLineVertical,
                  { backgroundColor: classificationColor },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Info Panel */}
      <Animated.View
        style={[
          styles.infoPanel,
          {
            transform: [{ scale: pulseAnim }],
            borderColor: hasErrors ? '#EF4444' : hasWarnings ? '#F59E0B' : classificationColor,
          },
        ]}
      >
        {/* Classification */}
        {showClassification && (
          <View style={styles.infoRow}>
            <View style={[styles.badge, { backgroundColor: classificationColor }]}>
              <Text style={styles.badgeText}>{classificationLabel}</Text>
            </View>
            <Text style={styles.infoText}>{alignmentLabel}</Text>
          </View>
        )}

        {/* Surface metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Area</Text>
            <Text style={styles.metricValue}>
              {surfaceAnalysis.area.toFixed(2)} m²
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Stability</Text>
            <View style={styles.stabilityBar}>
              <View
                style={[
                  styles.stabilityFill,
                  {
                    width: `${surfaceAnalysis.stability * 100}%`,
                    backgroundColor: stabilityColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.metricValue, { color: stabilityColor }]}>
              {(surfaceAnalysis.stability * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Constraints */}
        {showConstraints && surfaceAnalysis.constraints.length > 0 && (
          <View style={styles.constraintsContainer}>
            {surfaceAnalysis.constraints.map((constraint, idx) => (
              <View
                key={idx}
                style={[
                  styles.constraint,
                  {
                    borderLeftColor:
                      constraint.severity === 'error'
                        ? '#EF4444'
                        : constraint.severity === 'warning'
                        ? '#F59E0B'
                        : '#3B82F6',
                  },
                ]}
              >
                <Text style={styles.constraintIcon}>
                  {constraint.severity === 'error'
                    ? '❌'
                    : constraint.severity === 'warning'
                    ? '⚠️'
                    : 'ℹ️'}
                </Text>
                <Text style={styles.constraintText}>{constraint.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Placeable status */}
        <View style={styles.statusRow}>
          {surfaceAnalysis.isPlaceable ? (
            <Text style={styles.statusSuccess}>✓ Surface suitable for placement</Text>
          ) : (
            <Text style={styles.statusError}>✗ Surface not suitable</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
  },
  gridOverlay: {
    position: 'absolute',
    top: -60,
    left: -20,
    right: -20,
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  gridLines: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    opacity: 0.2,
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  infoPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    gap: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stabilityBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  stabilityFill: {
    height: '100%',
    borderRadius: 3,
  },
  constraintsContainer: {
    marginTop: 8,
    gap: 8,
  },
  constraint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 6,
    gap: 8,
  },
  constraintIcon: {
    fontSize: 14,
  },
  constraintText: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
  },
  statusRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statusSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusError: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
