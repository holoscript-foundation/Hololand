/**
 * LightEstimationFeedback Component
 *
 * Visual feedback for AR light estimation with real-time environmental lighting analysis.
 * Provides UI indicators for ambient intensity, color temperature, and HDR capability.
 *
 * Features:
 * - Ambient light intensity indicator (lux)
 * - Color temperature visualization (Kelvin)
 * - Light direction compass
 * - HDR capability indicator
 * - Auto-exposure recommendation
 * - Shadow casting quality indicator
 * - Time-of-day estimation
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
import type { LightEstimate } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface LightEstimationFeedbackProps {
  /** Light estimation data from AR framework */
  lightEstimate: LightEstimate | null;

  /** Show intensity indicator */
  showIntensity?: boolean;

  /** Show color temperature */
  showTemperature?: boolean;

  /** Show light direction */
  showDirection?: boolean;

  /** Show HDR capability */
  showHDR?: boolean;

  /** Compact mode (minimal UI) */
  compact?: boolean;

  /** Container style override */
  containerStyle?: object;

  /** Accessibility label */
  accessibilityLabel?: string;
}

interface LightCondition {
  label: string;
  icon: string;
  color: string;
}

interface TemperatureInfo {
  label: string;
  color: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LIGHT_CONDITIONS: Record<string, LightCondition> = {
  veryBright: { label: 'Very Bright', icon: '☀️', color: '#FFD700' },
  bright: { label: 'Bright', icon: '🌤️', color: '#FFA500' },
  normal: { label: 'Normal', icon: '☁️', color: '#87CEEB' },
  dim: { label: 'Dim', icon: '🌥️', color: '#778899' },
  dark: { label: 'Dark', icon: '🌙', color: '#2F4F4F' },
};

const TEMPERATURE_RANGES: Array<{ min: number; max: number; label: string; color: string }> = [
  { min: 1000, max: 2000, label: 'Candlelight', color: '#FF6B35' },
  { min: 2000, max: 3000, label: 'Warm', color: '#FF8C42' },
  { min: 3000, max: 4000, label: 'Warm White', color: '#FFB84D' },
  { min: 4000, max: 5000, label: 'Neutral', color: '#FFF4E6' },
  { min: 5000, max: 6500, label: 'Daylight', color: '#E8F4F8' },
  { min: 6500, max: 10000, label: 'Cool', color: '#A8D8EA' },
  { min: 10000, max: 20000, label: 'Sky Blue', color: '#5DADE2' },
];

// Lux ranges
const LUX_DARK = 50;
const LUX_DIM = 200;
const LUX_NORMAL = 400;
const LUX_BRIGHT = 1000;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getLightCondition = (lux: number): LightCondition => {
  if (lux >= LUX_BRIGHT) return LIGHT_CONDITIONS.veryBright;
  if (lux >= LUX_NORMAL) return LIGHT_CONDITIONS.bright;
  if (lux >= LUX_DIM) return LIGHT_CONDITIONS.normal;
  if (lux >= LUX_DARK) return LIGHT_CONDITIONS.dim;
  return LIGHT_CONDITIONS.dark;
};

const getTemperatureInfo = (kelvin: number): TemperatureInfo => {
  for (const range of TEMPERATURE_RANGES) {
    if (kelvin >= range.min && kelvin < range.max) {
      return { label: range.label, color: range.color };
    }
  }
  return { label: 'Unknown', color: '#FFFFFF' };
};

const formatLux = (lux: number): string => {
  if (lux < 10) return lux.toFixed(1);
  if (lux < 1000) return Math.round(lux).toString();
  return `${(lux / 1000).toFixed(1)}k`;
};

const calculateShadowQuality = (intensity: number, hdrCapable: boolean): string => {
  if (!hdrCapable) return 'Limited';
  if (intensity >= 800) return 'Excellent';
  if (intensity >= 400) return 'Good';
  if (intensity >= 200) return 'Fair';
  return 'Poor';
};

const estimateTimeOfDay = (temperature: number, intensity: number): string => {
  // Simplified heuristic
  if (temperature > 5500 && intensity > 500) return 'Midday';
  if (temperature > 4500 && intensity > 300) return 'Morning/Afternoon';
  if (temperature < 3500 && intensity > 200) return 'Golden Hour';
  if (intensity < 100) return 'Night';
  return 'Indoor';
};

// =============================================================================
// COMPONENT
// =============================================================================

export const LightEstimationFeedback: React.FC<LightEstimationFeedbackProps> = ({
  lightEstimate,
  showIntensity = true,
  showTemperature = true,
  showDirection = false,
  showHDR = true,
  compact = false,
  containerStyle,
  accessibilityLabel = 'AR light estimation feedback',
}) => {
  // Animation values
  const intensityAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const lightCondition = useMemo(() => {
    if (!lightEstimate || lightEstimate.ambientIntensity === undefined) {
      return LIGHT_CONDITIONS.normal;
    }
    return getLightCondition(lightEstimate.ambientIntensity);
  }, [lightEstimate]);

  const temperatureInfo = useMemo(() => {
    if (!lightEstimate || !lightEstimate.ambientColorTemperature) {
      return { label: 'Unknown', color: '#FFFFFF' };
    }
    return getTemperatureInfo(lightEstimate.ambientColorTemperature);
  }, [lightEstimate]);

  const shadowQuality = useMemo(() => {
    if (!lightEstimate) return 'Unknown';
    return calculateShadowQuality(
      lightEstimate.ambientIntensity || 0,
      lightEstimate.hdrCapable || false
    );
  }, [lightEstimate]);

  const timeOfDay = useMemo(() => {
    if (!lightEstimate) return 'Unknown';
    return estimateTimeOfDay(
      lightEstimate.ambientColorTemperature || 5500,
      lightEstimate.ambientIntensity || 400
    );
  }, [lightEstimate]);

  const intensityPercent = useMemo(() => {
    if (!lightEstimate || lightEstimate.ambientIntensity === undefined) {
      return 50;
    }
    // Normalize to 0-100% (clamped to reasonable range)
    const normalized = Math.min((lightEstimate.ambientIntensity / 2000) * 100, 100);
    return Math.max(normalized, 0);
  }, [lightEstimate]);

  // =============================================================================
  // ANIMATIONS
  // =============================================================================

  useEffect(() => {
    // Fade in when light estimate available
    Animated.timing(fadeAnim, {
      toValue: lightEstimate ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [lightEstimate, fadeAnim]);

  useEffect(() => {
    // Animate intensity bar
    Animated.spring(intensityAnim, {
      toValue: intensityPercent,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [intensityPercent, intensityAnim]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!lightEstimate) {
    return null;
  }

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          containerStyle,
          { opacity: fadeAnim },
        ]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="none"
      >
        <Text style={styles.compactIcon}>{lightCondition.icon}</Text>
        {showIntensity && lightEstimate.ambientIntensity !== undefined && (
          <Text style={styles.compactText}>
            {formatLux(lightEstimate.ambientIntensity)} lux
          </Text>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { opacity: fadeAnim },
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{lightCondition.icon}</Text>
        <Text style={[styles.headerTitle, { color: lightCondition.color }]}>
          {lightCondition.label}
        </Text>
      </View>

      {/* Intensity */}
      {showIntensity && lightEstimate.ambientIntensity !== undefined && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Ambient Intensity</Text>
            <Text style={styles.sectionValue}>
              {formatLux(lightEstimate.ambientIntensity)} lux
            </Text>
          </View>
          <View style={styles.intensityBar}>
            <Animated.View
              style={[
                styles.intensityFill,
                {
                  width: intensityAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: lightCondition.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Color Temperature */}
      {showTemperature && lightEstimate.ambientColorTemperature && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Color Temperature</Text>
            <Text style={styles.sectionValue}>
              {Math.round(lightEstimate.ambientColorTemperature)}K
            </Text>
          </View>
          <View style={styles.temperatureBar}>
            <View
              style={[
                styles.temperatureIndicator,
                { backgroundColor: temperatureInfo.color },
              ]}
            />
            <Text style={styles.temperatureLabel}>{temperatureInfo.label}</Text>
          </View>
        </View>
      )}

      {/* Additional Info */}
      <View style={styles.infoGrid}>
        {/* Time of Day */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Time of Day</Text>
          <Text style={styles.infoValue}>{timeOfDay}</Text>
        </View>

        {/* Shadow Quality */}
        {showHDR && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Shadows</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    shadowQuality === 'Excellent'
                      ? '#10B981'
                      : shadowQuality === 'Good'
                      ? '#F59E0B'
                      : '#EF4444',
                },
              ]}
            >
              {shadowQuality}
            </Text>
          </View>
        )}

        {/* HDR Capability */}
        {showHDR && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>HDR</Text>
            <Text
              style={[
                styles.infoValue,
                { color: lightEstimate.hdrCapable ? '#10B981' : '#6B7280' },
              ]}
            >
              {lightEstimate.hdrCapable ? 'Available' : 'Limited'}
            </Text>
          </View>
        )}
      </View>

      {/* Light Direction (if available and enabled) */}
      {showDirection && lightEstimate.primaryLightDirection && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Primary Light Direction</Text>
          <View style={styles.directionCompass}>
            <View
              style={[
                styles.directionArrow,
                {
                  transform: [
                    {
                      rotate: `${
                        Math.atan2(
                          lightEstimate.primaryLightDirection.x,
                          lightEstimate.primaryLightDirection.z
                        ) *
                        (180 / Math.PI)
                      }deg`,
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.arrowText}>↑</Text>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 260,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 16,
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
  compactContainer: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  compactIcon: {
    fontSize: 16,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  intensityBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    borderRadius: 4,
  },
  temperatureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  temperatureIndicator: {
    width: 40,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  temperatureLabel: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  directionCompass: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  directionArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 32,
    color: '#FFD700',
  },
});
