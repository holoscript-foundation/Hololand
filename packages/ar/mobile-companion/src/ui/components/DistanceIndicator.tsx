/**
 * DistanceIndicator Component
 *
 * Real-time distance measurement display with AR measurement tools.
 * Supports point-to-point, surface area, and volume measurements.
 *
 * Features:
 * - Point-to-point distance measurement
 * - Multi-point path measurement (perimeter)
 * - Surface area calculation (polygon)
 * - Volume estimation (bounding box)
 * - Unit conversion (metric/imperial)
 * - Measurement history
 * - Screenshot/export measurement
 * - Accessibility support
 *
 * @package @hololand/ar-mobile-companion
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import type { Pose6DoF } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export type MeasurementMode = 'point' | 'path' | 'area' | 'volume';
export type DistanceUnit = 'meters' | 'feet' | 'inches';

export interface MeasurementPoint {
  id: string;
  position: [number, number, number];
  timestamp: number;
}

export interface Measurement {
  id: string;
  mode: MeasurementMode;
  points: MeasurementPoint[];
  value: number;
  unit: DistanceUnit;
  timestamp: number;
  label?: string;
}

export interface DistanceIndicatorProps {
  /** Current AR camera pose */
  cameraPose: Pose6DoF;

  /** Active measurement points */
  measurementPoints?: MeasurementPoint[];

  /** Callback when new point is added */
  onPointAdded?: (point: MeasurementPoint) => void;

  /** Callback when measurement is completed */
  onMeasurementComplete?: (measurement: Measurement) => void;

  /** Callback when measurement is cleared */
  onMeasurementClear?: () => void;

  /** Current measurement mode */
  mode?: MeasurementMode;

  /** Distance unit preference */
  unit?: DistanceUnit;

  /** Callback when mode changes */
  onModeChange?: (mode: MeasurementMode) => void;

  /** Callback when unit changes */
  onUnitChange?: (unit: DistanceUnit) => void;

  /** Show measurement history */
  showHistory?: boolean;

  /** Measurement history */
  history?: Measurement[];

  /** Enable screenshot/export */
  enableExport?: boolean;

  /** Custom styling */
  containerStyle?: object;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const METERS_TO_FEET = 3.28084;
const METERS_TO_INCHES = 39.3701;

const MODE_LABELS: Record<MeasurementMode, string> = {
  point: 'Point to Point',
  path: 'Path Length',
  area: 'Area',
  volume: 'Volume',
};

const MODE_ICONS: Record<MeasurementMode, string> = {
  point: '📏',
  path: '📐',
  area: '◻️',
  volume: '📦',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const calculateDistance = (
  p1: [number, number, number],
  p2: [number, number, number]
): number => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const convertUnit = (meters: number, unit: DistanceUnit): number => {
  switch (unit) {
    case 'feet':
      return meters * METERS_TO_FEET;
    case 'inches':
      return meters * METERS_TO_INCHES;
    case 'meters':
    default:
      return meters;
  }
};

const formatMeasurement = (value: number, unit: DistanceUnit, mode: MeasurementMode): string => {
  const unitSuffix = (() => {
    switch (unit) {
      case 'feet':
        return mode === 'area' ? 'ft²' : mode === 'volume' ? 'ft³' : 'ft';
      case 'inches':
        return mode === 'area' ? 'in²' : mode === 'volume' ? 'in³' : 'in';
      case 'meters':
      default:
        return mode === 'area' ? 'm²' : mode === 'volume' ? 'm³' : 'm';
    }
  })();

  return `${value.toFixed(2)} ${unitSuffix}`;
};

const calculatePathLength = (points: MeasurementPoint[]): number => {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i].position, points[i + 1].position);
  }
  return total;
};

const calculateArea = (points: MeasurementPoint[]): number => {
  if (points.length < 3) return 0;

  // Simplified polygon area calculation (assumes planar polygon)
  // Uses Shoelace formula for 2D projection
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].position[0] * points[j].position[2];
    area -= points[j].position[0] * points[i].position[2];
  }

  return Math.abs(area) / 2;
};

const calculateVolume = (points: MeasurementPoint[]): number => {
  if (points.length < 2) return 0;

  // Bounding box volume
  const xs = points.map((p) => p.position[0]);
  const ys = points.map((p) => p.position[1]);
  const zs = points.map((p) => p.position[2]);

  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const depth = Math.max(...zs) - Math.min(...zs);

  return width * height * depth;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const DistanceIndicator: React.FC<DistanceIndicatorProps> = ({
  cameraPose,
  measurementPoints = [],
  onPointAdded,
  onMeasurementComplete,
  onMeasurementClear,
  mode = 'point',
  unit = 'meters',
  onModeChange,
  onUnitChange,
  showHistory = true,
  history = [],
  enableExport = true,
  containerStyle,
}) => {
  // Local state
  const [isExpanded, setIsExpanded] = useState(true);

  // =============================================================================
  // COMPUTED MEASUREMENTS
  // =============================================================================

  const currentMeasurement = useMemo((): number => {
    if (measurementPoints.length === 0) return 0;

    switch (mode) {
      case 'point':
        if (measurementPoints.length >= 2) {
          return calculateDistance(
            measurementPoints[0].position,
            measurementPoints[measurementPoints.length - 1].position
          );
        }
        return 0;

      case 'path':
        return calculatePathLength(measurementPoints);

      case 'area':
        return calculateArea(measurementPoints);

      case 'volume':
        return calculateVolume(measurementPoints);

      default:
        return 0;
    }
  }, [measurementPoints, mode]);

  const displayValue = useMemo(() => {
    let valueInMeters = currentMeasurement;

    // For area/volume, convert appropriately
    if (mode === 'area') {
      valueInMeters = currentMeasurement; // Already in m²
      if (unit === 'feet') {
        return valueInMeters * METERS_TO_FEET * METERS_TO_FEET;
      } else if (unit === 'inches') {
        return valueInMeters * METERS_TO_INCHES * METERS_TO_INCHES;
      }
      return valueInMeters;
    } else if (mode === 'volume') {
      valueInMeters = currentMeasurement; // Already in m³
      if (unit === 'feet') {
        return valueInMeters * METERS_TO_FEET * METERS_TO_FEET * METERS_TO_FEET;
      } else if (unit === 'inches') {
        return valueInMeters * METERS_TO_INCHES * METERS_TO_INCHES * METERS_TO_INCHES;
      }
      return valueInMeters;
    } else {
      return convertUnit(valueInMeters, unit);
    }
  }, [currentMeasurement, unit, mode]);

  const minPointsRequired = useMemo(() => {
    switch (mode) {
      case 'point':
        return 2;
      case 'path':
        return 2;
      case 'area':
        return 3;
      case 'volume':
        return 2;
      default:
        return 2;
    }
  }, [mode]);

  const canComplete = measurementPoints.length >= minPointsRequired;

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAddPoint = useCallback(() => {
    // Use center of screen as point (raycast from camera)
    // In real implementation, this would raycast to detected planes
    const newPoint: MeasurementPoint = {
      id: `point-${Date.now()}`,
      position: [
        cameraPose.position[0],
        cameraPose.position[1],
        cameraPose.position[2] - 1, // 1m in front of camera
      ],
      timestamp: Date.now(),
    };

    onPointAdded?.(newPoint);
  }, [cameraPose, onPointAdded]);

  const handleComplete = useCallback(() => {
    if (!canComplete) return;

    const measurement: Measurement = {
      id: `measurement-${Date.now()}`,
      mode,
      points: measurementPoints,
      value: displayValue,
      unit,
      timestamp: Date.now(),
    };

    onMeasurementComplete?.(measurement);
  }, [canComplete, mode, measurementPoints, displayValue, unit, onMeasurementComplete]);

  const handleClear = useCallback(() => {
    onMeasurementClear?.();
  }, [onMeasurementClear]);

  const handleModeChange = useCallback(
    (newMode: MeasurementMode) => {
      onModeChange?.(newMode);
      handleClear();
    },
    [onModeChange, handleClear]
  );

  const handleUnitToggle = useCallback(() => {
    const units: DistanceUnit[] = ['meters', 'feet', 'inches'];
    const currentIndex = units.indexOf(unit);
    const nextUnit = units[(currentIndex + 1) % units.length];
    onUnitChange?.(nextUnit);
  }, [unit, onUnitChange]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        accessible={true}
        accessibilityLabel="Measurement panel"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.headerTitle}>
          {MODE_ICONS[mode]} {MODE_LABELS[mode]}
        </Text>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▲'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <>
          {/* Current Measurement Display */}
          <View style={styles.measurementDisplay}>
            <Text style={styles.measurementValue}>
              {formatMeasurement(displayValue, unit, mode)}
            </Text>
            <Text style={styles.pointCount}>
              {measurementPoints.length} / {minPointsRequired}+ points
            </Text>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            {(['point', 'path', 'area', 'volume'] as MeasurementMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeButton, mode === m && styles.modeButtonActive]}
                onPress={() => handleModeChange(m)}
                accessible={true}
                accessibilityLabel={`${MODE_LABELS[m]} mode`}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
              >
                <Text style={[styles.modeButtonText, mode === m && styles.modeButtonTextActive]}>
                  {MODE_ICONS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.addButton]}
              onPress={handleAddPoint}
              accessible={true}
              accessibilityLabel="Add measurement point"
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>+ Add Point</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.unitButton]}
              onPress={handleUnitToggle}
              accessible={true}
              accessibilityLabel={`Change unit, currently ${unit}`}
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>{unit[0].toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClear}
              accessible={true}
              accessibilityLabel="Clear measurement"
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Complete Button */}
          {canComplete && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
              accessible={true}
              accessibilityLabel="Save measurement"
              accessibilityRole="button"
            >
              <Text style={styles.completeButtonText}>✓ Save Measurement</Text>
            </TouchableOpacity>
          )}

          {/* History */}
          {showHistory && history.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>History</Text>
              <ScrollView style={styles.historyScroll} nestedScrollEnabled={true}>
                {history.slice(-5).reverse().map((m) => (
                  <View key={m.id} style={styles.historyItem}>
                    <Text style={styles.historyMode}>
                      {MODE_ICONS[m.mode]} {MODE_LABELS[m.mode]}
                    </Text>
                    <Text style={styles.historyValue}>
                      {formatMeasurement(m.value, m.unit, m.mode)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    overflow: 'hidden',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandIcon: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  measurementDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  measurementValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pointCount: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3B82F6',
  },
  modeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  modeButtonTextActive: {
    color: '#3B82F6',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#10B981',
    flex: 2,
  },
  unitButton: {
    backgroundColor: '#6B7280',
  },
  clearButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  historyScroll: {
    maxHeight: 150,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    marginBottom: 6,
  },
  historyMode: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
