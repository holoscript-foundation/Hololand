/**
 * XR Spatial Reasoning Dataset Generation - Type Definitions
 *
 * Pipeline for generating 10K HoloLand-specific XR spatial reasoning
 * training examples:
 *   - 8K from ProcTHOR pipeline adapted to HoloLand VR scene format
 *   - 2K from ScanNet real-world annotations mapped to VR coordinates
 *
 * Pipeline: egocentric video capture -> RGB + semantic segmentation ->
 *           trajectory synthesis -> spatial QA generation
 *
 * @module spatial-dataset/types
 */

// =============================================================================
// 3D Spatial Primitives
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface BoundingBox3D {
  center: Vector3;
  extents: Vector3;
  rotation: Quaternion;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

// =============================================================================
// Scene Representation
// =============================================================================

export interface VRScene {
  /** Scene ID */
  id: string;
  /** Scene name */
  name: string;
  /** Scene source */
  source: 'procthor' | 'scannet' | 'hololand-native';
  /** All objects in the scene */
  objects: SceneObject[];
  /** Room/region boundaries */
  rooms: SceneRoom[];
  /** Floor plan data */
  floorPlan: FloorPlan;
  /** Lighting conditions */
  lighting: LightingCondition;
  /** Scene-level metadata */
  metadata: Record<string, unknown>;
}

export interface SceneObject {
  /** Unique object ID */
  id: string;
  /** Object class (e.g., 'chair', 'table', 'door') */
  category: string;
  /** Specific type within category (e.g., 'office_chair', 'dining_table') */
  type: string;
  /** World-space transform */
  transform: Transform;
  /** Axis-aligned bounding box */
  aabb: BoundingBox3D;
  /** Room this object belongs to */
  roomId: string;
  /** Material/appearance description */
  material: string;
  /** Whether the object is interactable */
  interactable: boolean;
  /** Semantic attributes */
  attributes: ObjectAttribute[];
  /** Relationships to other objects */
  relationships: SpatialRelationship[];
}

export interface ObjectAttribute {
  name: string;
  value: string | number | boolean;
}

export interface SpatialRelationship {
  /** Relationship type */
  type: SpatialRelationType;
  /** Target object ID */
  targetId: string;
  /** Confidence of this relationship (0-1) */
  confidence: number;
  /** Additional data (e.g., distance, direction) */
  data?: Record<string, unknown>;
}

export type SpatialRelationType =
  | 'on-top-of'
  | 'under'
  | 'next-to'
  | 'in-front-of'
  | 'behind'
  | 'left-of'
  | 'right-of'
  | 'inside'
  | 'contains'
  | 'above'
  | 'below'
  | 'adjacent'
  | 'facing'
  | 'between'
  | 'near'
  | 'far-from'
  | 'aligned-with'
  | 'attached-to';

export interface SceneRoom {
  id: string;
  name: string;
  type: string;
  bounds: BoundingBox3D;
  floorY: number;
  ceilingY: number;
  connectedRooms: string[];
}

export interface FloorPlan {
  width: number;
  height: number;
  /** Occupancy grid (1 = occupied, 0 = free, -1 = unknown) */
  grid: number[][];
  /** Resolution in meters per cell */
  resolution: number;
  /** Origin offset */
  origin: Vector3;
}

export interface LightingCondition {
  type: 'natural' | 'artificial' | 'mixed';
  intensity: number;
  direction?: Vector3;
  ambientColor: { r: number; g: number; b: number };
}

// =============================================================================
// Camera / Egocentric Capture
// =============================================================================

export interface CameraIntrinsics {
  focalLengthX: number;
  focalLengthY: number;
  principalPointX: number;
  principalPointY: number;
  width: number;
  height: number;
  distortionCoeffs?: number[];
}

export interface CameraPose {
  /** Position in world space */
  position: Vector3;
  /** Orientation */
  rotation: Quaternion;
  /** Timestamp (seconds from trajectory start) */
  timestamp: number;
  /** Camera intrinsics */
  intrinsics: CameraIntrinsics;
}

export interface EgocentricFrame {
  /** Frame index */
  index: number;
  /** Camera pose at this frame */
  pose: CameraPose;
  /** RGB image data (path or base64) */
  rgbPath: string;
  /** Semantic segmentation mask (path) */
  segmentationPath: string;
  /** Depth map (path) */
  depthPath: string;
  /** Instance segmentation (path) */
  instanceSegPath?: string;
  /** Visible object IDs from this viewpoint */
  visibleObjects: string[];
  /** Per-object visibility ratio (0-1) */
  objectVisibility: Map<string, number>;
}

export interface EgocentricTrajectory {
  /** Trajectory ID */
  id: string;
  /** Scene this trajectory was captured in */
  sceneId: string;
  /** All frames */
  frames: EgocentricFrame[];
  /** Total duration in seconds */
  durationSeconds: number;
  /** Average frames per second */
  fps: number;
  /** Trajectory type */
  type: 'exploration' | 'task-directed' | 'random-walk' | 'guided';
}

// =============================================================================
// Spatial QA (Training Examples)
// =============================================================================

export interface SpatialQAExample {
  /** Unique example ID */
  id: string;
  /** Scene context */
  sceneId: string;
  /** Trajectory context (optional) */
  trajectoryId?: string;
  /** Frame index (if egocentric) */
  frameIndex?: number;
  /** Source pipeline */
  source: 'procthor' | 'scannet';
  /** Question type */
  questionType: SpatialQuestionType;
  /** The spatial reasoning question */
  question: string;
  /** Ground truth answer */
  answer: string;
  /** Answer type */
  answerType: 'text' | 'position' | 'object-id' | 'boolean' | 'count' | 'direction';
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Reasoning steps needed */
  reasoningSteps: string[];
  /** Objects involved */
  involvedObjectIds: string[];
  /** Spatial relationships tested */
  testedRelations: SpatialRelationType[];
  /** Viewpoint dependency (egocentric-only vs. allocentric) */
  viewpointDependent: boolean;
  /** Quality score from validation (0-1) */
  qualityScore: number;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export type SpatialQuestionType =
  | 'object-localization'    // "Where is the red chair?"
  | 'spatial-relation'       // "What is to the left of the table?"
  | 'counting'               // "How many chairs are in the room?"
  | 'navigation'             // "How do I get from the kitchen to the bedroom?"
  | 'scene-understanding'    // "Describe the layout of this room"
  | 'object-comparison'      // "Which is larger, the table or the desk?"
  | 'occlusion-reasoning'    // "What is behind the bookshelf?"
  | 'distance-estimation'    // "How far is the door from the window?"
  | 'room-classification'    // "What type of room is this?"
  | 'functional-reasoning'   // "Where would I sit to eat dinner?"
  | 'trajectory-reasoning'   // "If I walk forward 3 steps, what will I see?"
  | 'viewpoint-reasoning';   // "From the doorway, which objects are visible?"

// =============================================================================
// Pipeline Configuration
// =============================================================================

export interface DatasetPipelineConfig {
  /** Total examples to generate */
  totalExamples: number;
  /** ProcTHOR examples (default: 8000) */
  procthorCount: number;
  /** ScanNet examples (default: 2000) */
  scannetCount: number;
  /** Output directory */
  outputDir: string;
  /** Image resolution */
  imageResolution: { width: number; height: number };
  /** Frames per trajectory */
  framesPerTrajectory: number;
  /** Question types to include */
  questionTypes: SpatialQuestionType[];
  /** Difficulty distribution */
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  /** Quality threshold (examples below this are rejected) */
  qualityThreshold: number;
  /** Random seed */
  seed: number;
  /** Enable semantic segmentation generation */
  generateSegmentation: boolean;
  /** Enable depth map generation */
  generateDepth: boolean;
  /** Number of parallel workers */
  workers: number;
}

// =============================================================================
// Pipeline Events
// =============================================================================

export interface PipelineEventMap {
  'scene:generated': { scene: VRScene; source: string };
  'trajectory:generated': { trajectory: EgocentricTrajectory };
  'example:generated': { example: SpatialQAExample };
  'example:rejected': { reason: string; data: Partial<SpatialQAExample> };
  'batch:complete': { count: number; total: number; source: string };
  'pipeline:progress': { phase: string; progress: number; total: number };
  'pipeline:complete': { totalExamples: number; durationMs: number; stats: DatasetStats };
  'error': { phase: string; message: string; recoverable: boolean };
}

export type PipelineEventType = keyof PipelineEventMap;
export type PipelineEventHandler<K extends PipelineEventType> = (
  event: PipelineEventMap[K],
) => void;

// =============================================================================
// Dataset Statistics
// =============================================================================

export interface DatasetStats {
  totalExamples: number;
  examplesBySource: Record<string, number>;
  examplesByType: Record<string, number>;
  examplesByDifficulty: Record<string, number>;
  averageQualityScore: number;
  rejectedCount: number;
  uniqueScenes: number;
  uniqueObjectCategories: number;
  spatialRelationCoverage: Record<string, number>;
  generationTimeMs: number;
}
