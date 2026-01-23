/**
 * @hololand/spatial
 *
 * Spatial visualization and 3D code representation package for Hololand.
 * Provides GLB asset management, mental world modeling, spatial embedding,
 * and HoloScript-to-GLB conversion capabilities.
 *
 * @packageDocumentation
 */

// GLB Asset Library - 3D asset management with caching and LOD
export {
  GLBAssetLibrary,
  getGLBAssetLibrary,
  resetGLBAssetLibrary,
  type GLBAsset,
  type GLBMetadata,
  type BoundingBox,
  type LoadOptions,
  type LODConfig,
} from './glb';

// Mental World State - AI agent mental modeling
export {
  MentalWorldStateService,
  getMentalWorldStateService,
  resetMentalWorldState,
  type Vector3,
  type Belief,
  type SpatialContext,
  type AgentModel,
  type Goal,
  type HiddenState,
  type MentalAction,
  type MentalContext,
} from './mental';

// Spatial Embedding Extractor - Code structure to 3D positions
export {
  SpatialEmbeddingExtractor,
  getSpatialEmbeddingExtractor,
  resetSpatialEmbeddingExtractor,
  type SpatialEntity,
  type CodeEntityType,
  type EntityMetadata,
  type Connection,
  type ConnectionType,
  type LayoutAlgorithm,
  type LayoutOptions,
  type Cluster,
} from './embedding';

// HoloScript to GLB Converter - 3D model generation
export {
  HoloScriptToGLBConverter,
  getHoloScriptToGLBConverter,
  type HoloScriptNode,
  type MaterialDef,
  type MeshDef,
  type GLBExportOptions,
  type GLTFDocument,
} from './converter';
