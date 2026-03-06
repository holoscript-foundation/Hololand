/**
 * XR Spatial Reasoning Dataset Generation
 *
 * Pipeline for generating 10K HoloLand-specific XR spatial reasoning
 * training examples from ProcTHOR (8K) and ScanNet (2K) pipelines.
 *
 * @module spatial-dataset
 */

// Pipeline
export { DatasetPipeline, createDatasetPipeline } from './DatasetPipeline';

// Scene generation
export { SceneGenerator } from './SceneGenerator';

// QA generation
export { SpatialQAGenerator } from './SpatialQAGenerator';

// Types
export type {
  // Spatial primitives
  Vector3,
  Quaternion,
  BoundingBox3D,
  Transform,
  // Scene
  VRScene,
  SceneObject,
  SceneRoom,
  FloorPlan,
  LightingCondition,
  SpatialRelationship,
  SpatialRelationType,
  ObjectAttribute,
  // Camera
  CameraIntrinsics,
  CameraPose,
  EgocentricFrame,
  EgocentricTrajectory,
  // QA
  SpatialQAExample,
  SpatialQuestionType,
  // Config
  DatasetPipelineConfig,
  DatasetStats,
  // Events
  PipelineEventMap,
  PipelineEventType,
  PipelineEventHandler,
} from './types';
