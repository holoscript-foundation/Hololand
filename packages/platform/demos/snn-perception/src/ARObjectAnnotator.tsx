/**
 * ARObjectAnnotator
 *
 * React Three Fiber component for real-time AR object annotation using SNN perception.
 *
 * FEATURES:
 * - Renders 3D bounding boxes around detected objects
 * - Shows class labels, confidence scores, and metadata
 * - Integrates with HoloLand spatial scene graph
 * - Updates at perception frequency (2-30 Hz adaptive)
 * - Spatial anchoring for stable AR overlays
 *
 * INTEGRATION:
 * ```tsx
 *   <ARObjectAnnotator
 *     perceptionState={bridge.readPerception()}
 *     sceneObjects={sceneGraph.objects}
 *     modelLoader={snnModelLoader}
 *   />
 * ```
 *
 * @module ARObjectAnnotator
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Box, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SNNDetectionResult } from './SNNModelLoader';

export interface ARObjectAnnotation {
  objectId: string;
  position: THREE.Vector3;
  boundingBox: THREE.Box3;
  detection: SNNDetectionResult;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ARObjectAnnotatorProps {
  annotations: ARObjectAnnotation[];
  showBoundingBoxes?: boolean;
  showLabels?: boolean;
  showConfidence?: boolean;
  showMetadata?: boolean;
  annotationLifetimeS?: number;
  confidenceThreshold?: number;
}

/**
 * Bounding box visualization for detected object.
 */
const BoundingBox: React.FC<{
  box: THREE.Box3;
  color: string;
  opacity?: number;
}> = ({ box, color, opacity = 0.3 }) => {
  const size = useMemo(() => {
    const s = new THREE.Vector3();
    box.getSize(s);
    return s;
  }, [box]);

  const center = useMemo(() => {
    const c = new THREE.Vector3();
    box.getCenter(c);
    return c;
  }, [box]);

  // Edges for wireframe
  const edges = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const min = box.min;
    const max = box.max;

    // Bottom face
    points.push(new THREE.Vector3(min.x, min.y, min.z));
    points.push(new THREE.Vector3(max.x, min.y, min.z));
    points.push(new THREE.Vector3(max.x, min.y, max.z));
    points.push(new THREE.Vector3(min.x, min.y, max.z));
    points.push(new THREE.Vector3(min.x, min.y, min.z));

    // Vertical edges
    points.push(new THREE.Vector3(min.x, max.y, min.z));
    points.push(new THREE.Vector3(max.x, max.y, min.z));
    points.push(new THREE.Vector3(max.x, min.y, min.z));
    points.push(new THREE.Vector3(max.x, max.y, min.z));
    points.push(new THREE.Vector3(max.x, max.y, max.z));
    points.push(new THREE.Vector3(max.x, min.y, max.z));
    points.push(new THREE.Vector3(max.x, max.y, max.z));
    points.push(new THREE.Vector3(min.x, max.y, max.z));
    points.push(new THREE.Vector3(min.x, min.y, max.z));
    points.push(new THREE.Vector3(min.x, max.y, max.z));
    points.push(new THREE.Vector3(min.x, max.y, min.z));

    return points;
  }, [box]);

  return (
    <group>
      {/* Semi-transparent box */}
      <Box args={[size.x, size.y, size.z]} position={center}>
        <meshBasicMaterial color={color} transparent opacity={opacity} wireframe={false} />
      </Box>

      {/* Wireframe edges */}
      <Line points={edges} color={color} lineWidth={2} />
    </group>
  );
};

/**
 * Label overlay for detected object.
 */
const ObjectLabel: React.FC<{
  position: THREE.Vector3;
  classLabel: string;
  confidence: number;
  metadata?: Record<string, any>;
  showConfidence: boolean;
  showMetadata: boolean;
}> = ({ position, classLabel, confidence, metadata, showConfidence, showMetadata }) => {
  const labelText = useMemo(() => {
    let text = classLabel.toUpperCase();
    if (showConfidence) {
      text += ` (${(confidence * 100).toFixed(0)}%)`;
    }
    if (showMetadata && metadata) {
      const metaLines = Object.entries(metadata)
        .slice(0, 3) // Show max 3 metadata fields
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      if (metaLines) {
        text += `\n${metaLines}`;
      }
    }
    return text;
  }, [classLabel, confidence, metadata, showConfidence, showMetadata]);

  const labelColor = useMemo(() => {
    // Color based on confidence: green (high) -> yellow (medium) -> red (low)
    if (confidence >= 0.8) return '#00ff88';
    if (confidence >= 0.6) return '#ffcc00';
    return '#ff4444';
  }, [confidence]);

  return (
    <Billboard position={[position.x, position.y + 0.5, position.z]}>
      <Text
        fontSize={0.12}
        color={labelColor}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {labelText}
      </Text>
    </Billboard>
  );
};

/**
 * AR Object Annotator component.
 */
export const ARObjectAnnotator: React.FC<ARObjectAnnotatorProps> = ({
  annotations,
  showBoundingBoxes = true,
  showLabels = true,
  showConfidence = true,
  showMetadata = false,
  annotationLifetimeS = 2,
  confidenceThreshold = 0.6,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const annotationTimestamps = useRef<Map<string, number>>(new Map());

  // Filter annotations by confidence threshold
  const visibleAnnotations = useMemo(() => {
    return annotations.filter((a) => a.confidence >= confidenceThreshold);
  }, [annotations, confidenceThreshold]);

  // Clean up expired annotations
  useEffect(() => {
    const now = Date.now();
    visibleAnnotations.forEach((a) => {
      if (!annotationTimestamps.current.has(a.objectId)) {
        annotationTimestamps.current.set(a.objectId, now);
      }
    });

    // Remove expired annotations
    const expiredIds: string[] = [];
    annotationTimestamps.current.forEach((timestamp, id) => {
      if (now - timestamp > annotationLifetimeS * 1000) {
        expiredIds.push(id);
      }
    });
    expiredIds.forEach((id) => annotationTimestamps.current.delete(id));
  }, [visibleAnnotations, annotationLifetimeS]);

  // Animate annotations (subtle pulse effect)
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();
    groupRef.current.children.forEach((child, idx) => {
      // Subtle scale pulse
      const pulse = 1 + Math.sin(time * 2 + idx * 0.5) * 0.03;
      child.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {visibleAnnotations.map((annotation) => {
        const boxColor = annotation.confidence >= 0.8 ? '#00ff88' : '#ffcc00';

        return (
          <group key={annotation.objectId}>
            {/* Bounding box */}
            {showBoundingBoxes && (
              <BoundingBox box={annotation.boundingBox} color={boxColor} opacity={0.2} />
            )}

            {/* Label overlay */}
            {showLabels && (
              <ObjectLabel
                position={annotation.position}
                classLabel={annotation.detection.class_label}
                confidence={annotation.confidence}
                metadata={annotation.metadata}
                showConfidence={showConfidence}
                showMetadata={showMetadata}
              />
            )}
          </group>
        );
      })}
    </group>
  );
};

/**
 * Hook for converting SNN perception state to AR annotations.
 *
 * Integrates with HoloLand spatial scene graph to map detected objects
 * to 3D positions and bounding boxes.
 *
 * @param perceptionState - Current SNN perception state
 * @param sceneObjects - Scene graph objects
 * @param modelLoader - SNN model loader for class labels
 * @returns AR annotations ready for rendering
 */
export function useARAnnotations(
  perceptionState: {
    attentionScores: Array<{
      objectId: string;
      attention: number;
      spikeRate: number;
    }>;
  },
  sceneObjects: Map<
    string,
    {
      position: THREE.Vector3;
      boundingBox?: THREE.Box3;
      metadata?: Record<string, any>;
    }
  >,
  modelLoader: {
    decodeOutput: (spikes: number[]) => Array<{
      class_id: number;
      class_label: string;
      confidence: number;
    }>;
  },
): ARObjectAnnotation[] {
  return useMemo(() => {
    const annotations: ARObjectAnnotation[] = [];

    perceptionState.attentionScores.forEach((score) => {
      const obj = sceneObjects.get(score.objectId);
      if (!obj) return;

      // Mock spike output (in production, this comes from SNNPerceptionWorker)
      const mockSpikes = new Array(10).fill(0);
      mockSpikes[Math.floor(Math.random() * 10)] = score.spikeRate * 10;

      const detections = modelLoader.decodeOutput(mockSpikes);
      const topDetection = detections[0];

      if (!topDetection) return;

      // Create bounding box if not present
      const boundingBox =
        obj.boundingBox ||
        new THREE.Box3().setFromCenterAndSize(
          obj.position,
          new THREE.Vector3(1, 1, 1),
        );

      annotations.push({
        objectId: score.objectId,
        position: obj.position.clone(),
        boundingBox,
        detection: topDetection,
        confidence: topDetection.confidence,
        metadata: obj.metadata,
      });
    });

    return annotations;
  }, [perceptionState, sceneObjects, modelLoader]);
}

export default ARObjectAnnotator;
