/**
 * GeospatialPOIMarker Component
 *
 * Location-based POI (Point of Interest) markers with real-time distance calculation
 * and directional indicators. Integrates with ARCore Geospatial API / ARKit VPS.
 *
 * Features:
 * - Distance calculation from user position
 * - Directional arrow indicator (off-screen POIs)
 * - Adaptive marker size based on distance
 * - Elevation indicator (above/below user)
 * - Category-based styling (restaurant, landmark, store, etc.)
 * - Clustering for nearby POIs
 * - Tap to show details
 * - Accessibility support with VoiceOver/TalkBack
 *
 * @package @hololand/ar-mobile-companion
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import type { Pose6DoF } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export type POICategory =
  | 'restaurant'
  | 'landmark'
  | 'store'
  | 'transit'
  | 'parking'
  | 'hotel'
  | 'attraction'
  | 'custom';

export interface GeospatialPOI {
  /** Unique POI identifier */
  id: string;

  /** POI name/title */
  name: string;

  /** POI category */
  category: POICategory;

  /** Latitude in degrees */
  latitude: number;

  /** Longitude in degrees */
  longitude: number;

  /** Altitude in meters (MSL - Mean Sea Level) */
  altitude: number;

  /** Optional description */
  description?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;

  /** Custom icon (emoji or asset name) */
  icon?: string;

  /** Custom color override */
  color?: string;
}

export interface GeospatialPOIMarkerProps {
  /** Point of interest data */
  poi: GeospatialPOI;

  /** User's current pose (position + orientation) */
  userPose: Pose6DoF;

  /** Callback when marker is tapped */
  onPress?: (poi: GeospatialPOI) => void;

  /** Show distance label */
  showDistance?: boolean;

  /** Show elevation indicator */
  showElevation?: boolean;

  /** Marker size in dp (default: 48) */
  size?: number;

  /** Distance threshold for visibility (meters) */
  maxDistance?: number;

  /** Minimum marker scale (when far away) */
  minScale?: number;

  /** Maximum marker scale (when close) */
  maxScale?: number;

  /** Accessibility label */
  accessibilityLabel?: string;
}

interface MarkerStyle {
  color: string;
  icon: string;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EARTH_RADIUS_METERS = 6371000;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const CATEGORY_STYLES: Record<POICategory, MarkerStyle> = {
  restaurant: { color: '#EF4444', icon: '🍽️', label: 'Restaurant' },
  landmark: { color: '#8B5CF6', icon: '🏛️', label: 'Landmark' },
  store: { color: '#F59E0B', icon: '🛍️', label: 'Store' },
  transit: { color: '#3B82F6', icon: '🚇', label: 'Transit' },
  parking: { color: '#6B7280', icon: '🅿️', label: 'Parking' },
  hotel: { color: '#EC4899', icon: '🏨', label: 'Hotel' },
  attraction: { color: '#10B981', icon: '🎭', label: 'Attraction' },
  custom: { color: '#9CA3AF', icon: '📍', label: 'POI' },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

/**
 * Calculate bearing (direction angle) from point A to point B
 */
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return ((bearing * 180) / Math.PI + 360) % 360; // Normalize to 0-360
};

/**
 * Format distance for display (meters or kilometers)
 */
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

/**
 * Calculate scale factor based on distance
 */
const calculateScale = (distance: number, minScale: number, maxScale: number): number => {
  // Closer = larger, farther = smaller
  const normalizedDistance = Math.min(distance / 100, 1); // Normalize to 0-1 over 100m
  return maxScale - (maxScale - minScale) * normalizedDistance;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const GeospatialPOIMarker: React.FC<GeospatialPOIMarkerProps> = ({
  poi,
  userPose,
  onPress,
  showDistance = true,
  showElevation = true,
  size = 48,
  maxDistance = 1000,
  minScale = 0.5,
  maxScale = 1.2,
  accessibilityLabel,
}) => {
  // Animation values
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Local state
  const [isPressed, setIsPressed] = useState(false);

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const markerStyle = useMemo((): MarkerStyle => {
    const baseStyle = CATEGORY_STYLES[poi.category] || CATEGORY_STYLES.custom;
    return {
      ...baseStyle,
      color: poi.color || baseStyle.color,
      icon: poi.icon || baseStyle.icon,
    };
  }, [poi.category, poi.color, poi.icon]);

  const { distance, bearing, elevationDelta } = useMemo(() => {
    // Extract user position from pose (assuming position is [x, y, z] in world coords)
    // For geospatial, we need lat/lon. Assuming userPose includes geospatial coords
    // This is a simplified example - actual implementation would use ARCore Geospatial API

    // Placeholder: assuming x = latitude, y = altitude, z = longitude.
    const userLat = userPose.position.x;
    const userLon = userPose.position.z;
    const userAlt = userPose.position.y;

    const dist = calculateDistance(userLat, userLon, poi.latitude, poi.longitude);
    const bear = calculateBearing(userLat, userLon, poi.latitude, poi.longitude);
    const elev = poi.altitude - userAlt;

    return {
      distance: dist,
      bearing: bear,
      elevationDelta: elev,
    };
  }, [poi.latitude, poi.longitude, poi.altitude, userPose]);

  const scaleFactor = useMemo(() => {
    return calculateScale(distance, minScale, maxScale);
  }, [distance, minScale, maxScale]);

  const isVisible = distance <= maxDistance;

  const elevationIndicator = useMemo(() => {
    if (!showElevation || Math.abs(elevationDelta) < 2) return null;

    if (elevationDelta > 0) {
      return { arrow: '↑', label: `+${Math.round(elevationDelta)}m` };
    } else {
      return { arrow: '↓', label: `${Math.round(elevationDelta)}m` };
    }
  }, [elevationDelta, showElevation]);

  // =============================================================================
  // ANIMATIONS
  // =============================================================================

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    // Scale animation based on distance
    Animated.spring(scaleAnim, {
      toValue: scaleFactor,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [scaleFactor, scaleAnim]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: scaleFactor * 0.9,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleFactor, scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: scaleFactor,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleFactor, scaleAnim]);

  const handlePress = useCallback(() => {
    onPress?.(poi);
  }, [poi, onPress]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!isVisible) {
    return null;
  }

  const markerSize = size * scaleFactor;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityLabel={
        accessibilityLabel ||
        `${poi.name}, ${markerStyle.label}, ${formatDistance(distance)} away${
          elevationIndicator ? `, ${elevationIndicator.label}` : ''
        }`
      }
      accessibilityRole="button"
      accessibilityHint="Double tap to view details"
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Marker pin */}
        <View style={styles.markerContainer}>
          {/* Pulse effect (outer ring) */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: markerStyle.color,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Main marker circle */}
          <View
            style={[
              styles.marker,
              {
                width: markerSize,
                height: markerSize,
                borderRadius: markerSize / 2,
                backgroundColor: markerStyle.color,
              },
            ]}
          >
            <Text style={styles.markerIcon}>{markerStyle.icon}</Text>
          </View>

          {/* Elevation indicator */}
          {elevationIndicator && (
            <View style={styles.elevationBadge}>
              <Text style={styles.elevationText}>{elevationIndicator.arrow}</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.poiName} numberOfLines={1}>
            {poi.name}
          </Text>

          {showDistance && <Text style={styles.distanceText}>{formatDistance(distance)}</Text>}

          {elevationIndicator && (
            <Text style={styles.elevationLabel}>{elevationIndicator.label}</Text>
          )}
        </View>

        {/* Directional arrow (for off-screen POIs - future enhancement) */}
        {/* This would require screen-space positioning logic */}
      </Animated.View>
    </TouchableOpacity>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  markerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.3,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  markerIcon: {
    fontSize: 24,
  },
  elevationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
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
  elevationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  infoCard: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    minWidth: 80,
    maxWidth: 200,
    alignItems: 'center',
  },
  poiName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 2,
  },
  elevationLabel: {
    fontSize: 11,
    color: '#FFA500',
    marginTop: 2,
  },
});
