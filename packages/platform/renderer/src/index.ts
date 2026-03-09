/**
 * @hololand/renderer
 *
 * Advanced rendering engine for Hololand worlds.
 * Features quality tiers, PBR materials, HDRI environments,
 * post-processing, and GLTF asset loading.
 *
 * @example
 * ```typescript
 * import {
 *   HololandRenderer,
 *   QualityManager,
 *   createAssetLoader,
 *   HDRI_PRESETS
 * } from '@hololand/renderer';
 *
 * // Create renderer with quality auto-detection
 * const renderer = new HololandRenderer(canvas, world, {
 *   quality: 'auto',
 *   environment: { hdri: 'sunset', skybox: 'hdri' },
 *   postProcessing: { bloom: { enabled: true, strength: 0.5 } }
 * });
 *
 * // Load a 3D model
 * const assetLoader = createAssetLoader({ qualitySettings: renderer.getQualitySettings() });
 * const model = await assetLoader.loadModel('/models/character.glb');
 * scene.add(model.data.scene);
 * ```
 */

// =============================================================================
// CORE RENDERER
// =============================================================================

// 3D Renderer (Three.js + WebXR)
export { HololandRenderer } from './HololandRenderer';
export * from './HololandRenderer';
export * from './VolumetricBridge';
export * from './GPUContext';
export * from './types';

// 2D Renderer (Canvas)
export { Hololand2DRenderer } from './Hololand2DRenderer';
export type { Renderer2DConfig } from './Hololand2DRenderer';

// =============================================================================
// QUALITY SYSTEM
// =============================================================================

export {
  QualityManager,
  getQualityManager,
  createQualityManager,
} from './QualityManager';

export type { QualityManagerOptions } from './QualityManager';

// =============================================================================
// LOD SYSTEM (Distance-Based + Foveated)
// =============================================================================

export {
  LODManager,
} from './LODManager';

export type {
  LODLevel,
  LODDistanceThresholds,
  LODManagerConfig,
} from './LODManager';

export {
  ProceduralGeometryLODManager,
} from './ProceduralGeometryLOD';

export type {
  ProceduralGeometryType,
  ProceduralLODLevel,
  HullLODConfig,
  SplineLODConfig,
  MembraneLODConfig,
  FoveatedLODModifiers,
  ProceduralGeometryLODConfig,
  ProceduralGeometryObject,
} from './ProceduralGeometryLOD';

export {
  ProceduralGeometryLODIntegration,
  createProceduralGeometryLODIntegration,
} from './ProceduralGeometryLODIntegration';

// =============================================================================
// LIGHTING FIDELITY (Levels 0-4 Spectrum with Auto-Downgrade)
// =============================================================================

export {
  LightingFidelityManager,
  createLightingFidelityManager,
  createLightingFidelityManagerForDevice,
} from './LightingFidelityManager';

export type { LightingFidelityMetrics } from './LightingFidelityManager';

// =============================================================================
// POST-PROCESSING
// =============================================================================

export {
  PostProcessingPipeline,
  createPostProcessingPipeline,
} from './PostProcessing';

export type { PostProcessingOptions } from './PostProcessing';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export {
  EnvironmentManager,
  createEnvironmentManager,
  HDRI_PRESETS,
} from './EnvironmentManager';

export type { EnvironmentManagerOptions } from './EnvironmentManager';

// =============================================================================
// ASSET LOADING
// =============================================================================

export {
  AssetLoader,
  createAssetLoader,
} from './AssetLoader';

export type {
  AssetLoaderOptions,
  LoadedModel,
  LoadedTexture,
} from './AssetLoader';

// =============================================================================
// MATERIALS
// =============================================================================

export {
  MaterialFactory,
  createMaterialFactory,
} from './MaterialFactory';

export type {
  MaterialOptions,
  MaterialPreset,
} from './MaterialFactory';

// =============================================================================
// LOGGING
// =============================================================================

export { setHololandRendererLogger, type HololandRendererLogger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Quality
  QualityPreset,
  QualitySettings,
  DeviceType,
  // Rendering
  RenderMode,
  RendererConfig,
  // Materials & Lighting
  MaterialConfig,
  LightingConfig,
  // Lighting Fidelity
  LightingFidelityLevel,
  LightingFidelitySettings,
  LightingFidelityConfig,
  // Environment
  EnvironmentConfig,
  // Post-processing
  PostProcessingConfig,
  // Assets
  AssetLoadOptions,
  LoadedAsset,
} from './types';

export {
  QUALITY_PRESETS,
  LIGHTING_FIDELITY_PRESETS,
  LIGHTING_FIDELITY_NAMES,
} from './types';

// =============================================================================
// SMART PROXY VR PREVIEW
// =============================================================================

export {
  SmartProxyRenderer,
  createSmartProxyRenderer,
  PROXY_TIER_DESCRIPTIONS,
  getProxyTierSettings,
} from './SmartProxyRenderer';

export type {
  SmartProxyMode,
  SmartProxyConfig,
  ProxyQualityTier,
  PreviewMetrics,
} from './SmartProxyRenderer';

// =============================================================================
// VR MATERIAL PREVIEW
// =============================================================================

export {
  VRMaterialPreviewSystem,
  createVRMaterialPreviewSystem,
} from './VRMaterialPreviewSystem';

export type {
  MaterialDefinition,
  HoloMaterialType,
  TextureChannel,
  TextureMapDef,
  ShaderPassDef,
  GalleryLayout,
  VRMaterialPreviewConfig,
  PreviewSphereConfig,
  VRPreviewMetrics,
} from './VRMaterialPreviewSystem';

// =============================================================================
// HOLOSCRIPT MATERIAL PARSER
// =============================================================================

export { HoloScriptMaterialParser } from './HoloScriptMaterialParser';

export type {
  ASTNode,
  CompositionMaterialNode,
} from './HoloScriptMaterialParser';

// =============================================================================
// AGENT COMMUNICATION (Double-Buffered, Off Render Loop)
// =============================================================================

export {
  AgentStateBuffer,
  createAgentStateBuffer,
  createEmptyAgentWorldState,
  createDefaultAgentAvatarState,
} from './AgentStateBuffer';

export type {
  Vec3,
  Quat,
  AgentAvatarState,
  AgentCommand,
  AgentWorldState,
  AgentStateBufferMetrics,
} from './AgentStateBuffer';

export {
  AgentCommunicationManager,
  createAgentCommunicationManager,
} from './AgentCommunicationManager';

export type {
  AgentCommunicationConfig,
  AgentMessage,
  AgentCommunicationMetrics,
} from './AgentCommunicationManager';

// =============================================================================
// VR TRUST HANDSHAKE (5-Phase Zero-Trust Protocol)
// =============================================================================

export {
  VRTrustHandshake,
  createVRTrustHandshake,
  createEmptyTrustWorldState,
  DefaultTrustCryptoProvider,
  DEFAULT_TRUST_POLICY,
} from './VRTrustHandshake';

export type {
  TrustLevel,
  TrustPhase,
  AgentCapability,
  AgentManifest,
  TrustChallenge,
  ChallengeResponse,
  TrustSessionToken,
  AgentTrustState,
  TrustWorldState,
  TrustPolicy,
  VRTrustHandshakeConfig,
  TrustCryptoProvider,
  VRTrustHandshakeMetrics,
} from './VRTrustHandshake';

// =============================================================================
// BLOOM FILTER REVOCATION (O(1) Render-Loop Safe Revocation Check)
// =============================================================================

export {
  BloomFilterRevocation,
  createBloomFilterRevocation,
} from './BloomFilterRevocation';

export type {
  BloomFilterConfig,
  BloomFilterMetrics,
  BloomFilterSnapshot,
} from './BloomFilterRevocation';

// =============================================================================
// GOSSIP TRUST MESH (Epidemic Protocol, Fan-Out 3, O(log2 n) Convergence)
// =============================================================================

export {
  GossipTrustMesh,
  createGossipTrustMesh,
} from './GossipTrustMesh';

export type {
  VectorClock,
  TrustUpdate,
  GossipMessage,
  GossipPeer,
  GossipTrustMeshConfig,
  GossipTrustMeshMetrics,
} from './GossipTrustMesh';

// =============================================================================
// BEHAVIORAL TRUST SCORING (4-Dimension Avatar Trust)
// =============================================================================

export {
  BehavioralTrustScoring,
  createBehavioralTrustScoring,
  DEFAULT_BEHAVIORAL_SCORING_CONFIG,
} from './BehavioralTrustScoring';

export type {
  TrustDimension,
  TrustAction,
  BehavioralEventType,
  BehavioralEvent,
  DimensionScore,
  AgentBehavioralState,
  BehavioralTrustScoringConfig,
  TrustActionDetails,
  BehavioralTrustScoringMetrics,
} from './BehavioralTrustScoring';

// =============================================================================
// BEHAVIORAL TRUST BRIDGE (Feeds Avatar Observations into Behavioral Scoring)
// =============================================================================

export {
  BehavioralTrustBridge,
  createBehavioralTrustBridge,
} from './BehavioralTrustBridge';

export type {
  BoundingBox,
  ZoneDefinition,
  BehavioralTrustBridgeConfig,
  BehavioralTrustBridgeMetrics,
} from './BehavioralTrustBridge';

// =============================================================================
// TRUST INTEGRATION LAYER (Wires Handshake + Gossip + Behavioral)
// =============================================================================

export {
  TrustIntegrationLayer,
  createTrustIntegrationLayer,
} from './TrustIntegrationLayer';

export type {
  TrustMetrics,
  TrustIntegrationLayerConfig,
  TrustIntegrationEvent,
  TrustIntegrationEventType,
  TrustIntegrationFactoryConfig,
  TrustIntegrationFactoryResult,
} from './TrustIntegrationLayer';

// =============================================================================
// SPATIAL INFERENCE SCHEDULING (Hierarchical 1-5Hz / 90Hz Architecture)
// =============================================================================

export {
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
} from './SpatialReasoningEngine';

export type {
  ObjectSnapshot,
  CameraSnapshot,
  SpatialReasoningEngineConfig,
} from './SpatialReasoningEngine';

export {
  InferenceScheduler,
  createInferenceScheduler,
} from './InferenceScheduler';

export type {
  SceneSnapshotCallback,
} from './InferenceScheduler';

export {
  createEmptyCachedSpatialState,
} from './SpatialInferenceTypes';

export type {
  SpatialRelationship,
  SpatialRelationType,
  SpatialRegion,
  SpatialRegionType,
  OcclusionState,
  NavigationHint,
  SpatialLabel,
  CachedSpatialState,
  InferenceSchedulerConfig,
  InferenceSchedulerMetrics,
  SpatialReasoningProvider,
} from './SpatialInferenceTypes';

// =============================================================================
// GAUSSIAN SPLAT BUDGET MANAGER (Layered 120K+30K+10K=160K on Quest 3)
// =============================================================================

export {
  GaussianBudgetManager,
  createGaussianBudgetManager,
  createGaussianBudgetManagerForDevice,
  SPLAT_MEMORY_BYTES,
  SPLAT_RENDER_COST,
} from './GaussianBudgetManager';

export type {
  GaussianLayerType,
  GaussianLODLevel,
  GaussianSplatEntry,
  LayerBudgetConfig,
  FoveatedConfig,
  GaussianBudgetManagerConfig,
  LayerBudgetState,
  GaussianBudgetMetrics,
  GaussianBudgetEvent,
} from './GaussianBudgetManager';

// =============================================================================
// SHARED SPATIAL ANCHORS (CRDT-Backed Multi-Agent Collaboration Foundation)
// =============================================================================

export {
  SharedSpatialAnchorManager,
  createSharedSpatialAnchorManager,
} from './SharedSpatialAnchorManager';

export type {
  AnchorDelta,
} from './SharedSpatialAnchorManager';

export {
  createEmptyAnchorWorldState,
  createDefaultAnchor,
  makeAnchorId,
  parseAnchorId,
} from './SharedSpatialAnchorTypes';

export type {
  AnchorId,
  AnchorNamespace,
  AnchorType,
  AnchorPersistence,
  AnchorMergeStrategy,
  AnchorPriorityMap,
  AnchorLockState,
  AnchorSpatialState,
  AnchorWorldState,
  AnchorEventMap,
  AnchorEventType,
  AnchorEventHandler,
  AnchorQuery,
  SharedSpatialAnchor,
  SharedSpatialAnchorManagerConfig,
  SharedSpatialAnchorMetrics,
} from './SharedSpatialAnchorTypes';

// =============================================================================
// FOVEATED GAUSSIAN RENDERING (VRSplat + StopThePop Pipeline)
// =============================================================================

export {
  FoveatedGaussianRenderer,
  createFoveatedGaussianRenderer,
  createFoveatedGaussianRendererForDevice,
} from './FoveatedGaussianRenderer';

export {
  DEFAULT_FOVEATED_ZONES,
  DEFAULT_STOPTHEPOP_CONFIG,
  DEFAULT_FOVEATED_RENDER_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  QUEST3_PIPELINE_CONFIG,
  PCVR_PIPELINE_CONFIG,
} from './FoveatedGaussianTypes';

export type {
  GaussianSplatData,
  SortKey,
  FoveatedZone,
  FoveatedZoneConfig,
  FoveatedRenderConfig,
  StopThePopConfig,
  EyeRenderState,
  TileClassification,
  SortBufferState,
  GaussianRenderTimings,
  GaussianRenderStats,
  FoveatedGaussianPipelineConfig,
  GaussianCloudParams,
  PipelineEventType,
  PipelineEvent,
} from './FoveatedGaussianTypes';

// =============================================================================
// BUDGET-ENFORCED GAUSSIAN RENDERER (GaussianBudgetManager + FoveatedGaussianRenderer)
// =============================================================================

export {
  BudgetEnforcedGaussianRenderer,
  createBudgetEnforcedGaussianRenderer,
  createBudgetEnforcedGaussianRendererForDevice,
} from './BudgetEnforcedGaussianRenderer';

export type {
  BudgetEnforcedRendererConfig,
  IntegratedMetrics,
  LayerEnforcementResult,
  IntegratedEventType,
} from './BudgetEnforcedGaussianRenderer';

// =============================================================================
// SPATIAL INFERENCE COMPUTE PIPELINE (WebGPU Compute Shader Backend)
// =============================================================================

export {
  SpatialInferenceComputePipeline,
  createSpatialInferenceComputePipeline,
  REL_TYPE_BITS,
} from './SpatialInferenceComputePipeline';

export type {
  GPURelationshipResult,
  SpatialInferenceComputeConfig,
  SpatialInferenceComputeMetrics,
} from './SpatialInferenceComputePipeline';

// =============================================================================
// GAUSSIAN SPLAT VIEWER (WebGPU + WebSplatter Wait-Free Radix Sort)
// =============================================================================

export {
  GaussianSplatViewer,
} from './components/gaussian-splat-viewer';

export type {
  GaussianSplatViewerProps,
  GaussianSplatPanel,
} from './components/gaussian-splat-viewer';

export {
  useGaussianSplatViewer,
} from './components/gaussian-splat-viewer';

export type {
  UseGaussianSplatViewerConfig,
} from './components/gaussian-splat-viewer';

export {
  WebGPUSplatRenderer,
  createWebGPUSplatRenderer,
} from './components/gaussian-splat-viewer';

export {
  OrbitCameraController,
  createOrbitCameraController,
} from './components/gaussian-splat-viewer';

export {
  loadPlyFromUrl,
  parsePlyBuffer,
  parseSplatBuffer,
} from './components/gaussian-splat-viewer';

export {
  DEFAULT_GSPLAT_THEME,
} from './components/gaussian-splat-viewer';

export type {
  ViewerStatus as GaussianViewerStatus,
  SplatCloudData,
  SplatGPUBuffers,
  CameraState as GaussianCameraState,
  CameraControllerConfig,
  SplatRenderConfig,
  SplatFrameMetrics,
  SplatRenderStats,
  GaussianSplatViewerState,
  GaussianSplatViewerActions,
  GaussianSplatViewerTheme,
  GaussianSplatDisplayMode,
} from './components/gaussian-splat-viewer';

// =============================================================================
// VR PERFORMANCE DASHBOARD (Gaussian Budget + Frame Time Waterfall)
// =============================================================================

export {
  VRPerformanceDashboard,
} from './components/vr-performance-dashboard';

export type {
  VRPerformanceDashboardProps,
} from './components/vr-performance-dashboard';

export {
  GaussianBudgetUtilization,
} from './components/vr-performance-dashboard';

export type {
  GaussianBudgetUtilizationProps,
} from './components/vr-performance-dashboard';

export {
  FrameTimeWaterfall,
} from './components/vr-performance-dashboard';

export type {
  FrameTimeWaterfallProps,
} from './components/vr-performance-dashboard';

export {
  useVRPerformance,
} from './components/vr-performance-dashboard';

export type {
  UseVRPerformanceConfig,
} from './components/vr-performance-dashboard';

export {
  DEFAULT_VR_PERF_THEME,
  LAYER_DISPLAY_CONFIG,
  WATERFALL_PHASES,
} from './components/vr-performance-dashboard';

export type {
  VRPerfDisplayMode,
  VRPerfPanel,
  VRPerfTheme,
  VRPerformanceState,
  VRPerformanceActions,
  FrameTimeSample,
  PerformanceAlert,
  LayerDisplayMeta,
  WaterfallPhase,
} from './components/vr-performance-dashboard';

// =============================================================================
// HOLOGRAPHIC ECONOMIC DASHBOARD (Layer 6 Transparency, 11.1ms Frame Budget)
// =============================================================================

export {
  EconomicDashboard,
} from './components/economic-dashboard';

export type {
  EconomicDashboardProps,
} from './components/economic-dashboard';

export {
  useEconomicDashboard,
} from './components/economic-dashboard';

export type {
  UseEconomicDashboardConfig,
} from './components/economic-dashboard';

export {
  DEFAULT_ECON_DASHBOARD_THEME,
  FRAME_BUDGET,
} from './components/economic-dashboard';

export type {
  EconDashboardDisplayMode,
  EconDashboardPanel,
  EconDashboardTheme,
  EconHealthState,
  EconTimeSample,
  InflationSnapshot,
  GiniSnapshot,
  VelocitySnapshot,
  FaucetSinkSnapshot,
  EconBreakdownEntry,
  PIDMode,
  PIDControllerSnapshot,
  EconomicDashboardState,
  EconomicDashboardActions,
  EconomicAlert,
} from './components/economic-dashboard';

// =============================================================================
// MARKETPLACE TRADING UI (Bonding Curve Visualization + Price Impact Preview)
// =============================================================================

export {
  MarketplaceTradingUI,
} from './components/marketplace-trading';

export type {
  MarketplaceTradingUIProps,
} from './components/marketplace-trading';

export {
  useMarketplaceTrading,
} from './components/marketplace-trading';

export type {
  UseMarketplaceTradingConfig,
} from './components/marketplace-trading';

export {
  DEFAULT_MARKETPLACE_THEME,
  MARKETPLACE_BUDGET,
} from './components/marketplace-trading';

export type {
  BondingCurveType,
  PolynomialCurveParams,
  SigmoidCurveParams,
  BondingCurveParams,
  TradeDirection,
  MarketplaceTransaction,
  PriceImpactPreview,
  PriceImpactSeverity,
  MarketplaceDisplayMode,
  MarketplaceTradingState,
  MarketplaceTradingActions,
  CurveChartPoint,
  CurveAnnotation,
  MarketplaceTheme,
} from './components/marketplace-trading';

// =============================================================================
// DISTRIBUTED SCENE GRAPH (MA3DSG-Inspired Multi-Agent World Creation)
// =============================================================================

export {
  AgentLocalGraphBuilder,
  createAgentLocalGraphBuilder,
} from './AgentLocalGraphBuilder';

export type {
  AgentLocalGraphBuilderConfig,
} from './AgentLocalGraphBuilder';

export {
  TrainingFreeAlignmentMerger,
  createTrainingFreeAlignmentMerger,
} from './TrainingFreeAlignmentMerger';

export type {
  MergeResult,
} from './TrainingFreeAlignmentMerger';

export {
  SpatialRelationshipExtractor,
  createSpatialRelationshipExtractor,
} from './SpatialRelationshipExtractor';

export type {
  SpatialRelationshipExtractorConfig,
  ExtractionResult,
} from './SpatialRelationshipExtractor';

export {
  DistributedSceneGraphOrchestrator,
  createDistributedSceneGraphOrchestrator,
} from './DistributedSceneGraphOrchestrator';

export type {
  DistributedSceneGraphEventListener,
} from './DistributedSceneGraphOrchestrator';

export {
  createEmptyLocalSceneGraph,
  createEmptyGlobalSceneGraph,
  DEFAULT_ALIGNMENT_CONFIG,
  DEFAULT_DISTRIBUTED_SCENE_GRAPH_CONFIG,
} from './DistributedSceneGraphTypes';

export type {
  SceneGraphSegment,
  SceneGraphNode,
  SceneGraphEdge,
  DistributedSpatialRelationType,
  LocalSceneGraph,
  GlobalSceneGraph,
  MergeEvent,
  NodeMatch,
  TripletMatch,
  AlignmentConfig,
  DistributedSceneGraphConfig,
  DistributedSceneGraphMetrics,
  DistributedSceneGraphEvent,
  DistributedSceneGraphEventType,
} from './DistributedSceneGraphTypes';

// =============================================================================
// SNN PERCEPTION (Spiking Neural Network, WebGPU Compute, Off Render Loop)
// =============================================================================

export {
  SNNPerceptionWorker,
  createSNNPerceptionWorker,
} from './SNNPerceptionWorker';

export {
  SharedPerceptionBuffer,
  createSharedPerceptionBuffer,
} from './SharedPerceptionBuffer';

export {
  SNNPerceptionBridge,
  createSNNPerceptionBridge,
} from './SNNPerceptionBridge';

export type {
  SceneInputExtractor,
} from './SNNPerceptionBridge';

export {
  DEFAULT_SNN_NETWORK_CONFIG,
  DEFAULT_WORKER_CONFIG as DEFAULT_SNN_WORKER_CONFIG,
  DEFAULT_BRIDGE_CONFIG as DEFAULT_SNN_BRIDGE_CONFIG,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  SALIENCE_ENCODING,
  SALIENCE_DECODING,
  calculateBufferLayout,
  createEmptySNNPerceptionState,
} from './SNNPerceptionTypes';

export type {
  LIFLayerConfig,
  SNNNetworkConfig,
  AttentionScore,
  SalienceLevel,
  SpatialAttentionField,
  SNNPerceptionState,
  PerceptionObjectInput,
  PerceptionSceneInput,
  WorkerInMessage,
  WorkerOutMessage,
  InferenceMetrics as SNNInferenceMetrics,
  SNNPerceptionWorkerConfig,
  SNNPerceptionBridgeConfig,
  SNNPerceptionBridgeMetrics,
  SharedBufferLayout,
} from './SNNPerceptionTypes';

// =============================================================================
// DNF (Dynamic Neural Fields - Amari Equation, Lava-DNF Inspired)
// =============================================================================

export {
  DynamicNeuralField,
  createDynamicNeuralField,
} from './DynamicNeuralField';

export {
  DNFSpatialAttentionField,
  createDNFSpatialAttentionField,
} from './DNFSpatialAttentionField';

export {
  DNFPerceptionIntegration,
  createDNFPerceptionIntegration,
  DEFAULT_DNF_INTEGRATION_CONFIG,
} from './DNFPerceptionIntegration';

export type {
  DNFPerceptionIntegrationConfig,
} from './DNFPerceptionIntegration';

export {
  DNFVisualizationDataBuilder,
  createDNFVisualizationDataBuilder,
  DEFAULT_DNF_COLOR_MAP,
} from './DNFVisualizationData';

export type {
  DNFTimeSample,
  DNFColorMap,
  DNFDashboardData,
} from './DNFVisualizationData';

export {
  DEFAULT_DNF_KERNEL,
  DEFAULT_DNF_ACTIVATION,
  DEFAULT_DNF_CONFIG,
  DEFAULT_WORLD_MAPPING,
  DEFAULT_SPATIAL_ATTENTION_CONFIG,
  createEmptyDNFFieldState,
  createEmptyDNFStatistics,
  createEmptyVisualizationSnapshot,
} from './DynamicNeuralFieldTypes';

export type {
  DNFKernelType,
  DNFKernelConfig,
  DNFActivationFunctionType,
  DNFActivationConfig,
  DNFDimensionality,
  DynamicNeuralFieldConfig,
  DNFFieldState,
  DNFFieldStatistics,
  DNFPeak,
  DNFWorldMapping,
  SpatialAttentionFieldConfig,
  DNFVisualizationSnapshot,
  DNFIntegrationMetrics,
} from './DynamicNeuralFieldTypes';

// =============================================================================
// WEBXR PLATFORM DETECTION (Multi-Platform Capability Detection + Badge UI)
// =============================================================================

export {
  PlatformCapabilityBadge,
} from './components/webxr-platform';

export type {
  PlatformCapabilityBadgeProps,
} from './components/webxr-platform';

export {
  useWebXRPlatform,
} from './components/webxr-platform';

export type {
  UseWebXRPlatformOptions,
} from './components/webxr-platform';

export {
  detectWebXRPlatform,
  detectPlatformSync,
  detectFeatures,
  getRecommendedFeatures,
  identifyPlatform,
  checkSessionModeSupport,
  detectSessionModes,
  isVisionOSSafari,
  isMetaQuestBrowser,
  isChromeAndroidXR,
} from './components/webxr-platform';

export type {
  DetectionConfig,
} from './components/webxr-platform';

export {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  FEATURE_STATUS_ICONS,
  FEATURE_DESCRIPTIONS,
  DEFAULT_XR_PLATFORM_THEME,
  DEFAULT_SESSION_MODE_SUPPORT,
  PLATFORM_RECOMMENDED_FEATURES,
} from './components/webxr-platform';

export type {
  XRPlatformType,
  XRSessionMode as XRSessionModeType,
  XRSessionModeStatus,
  XRSessionModeSupport,
  XRFeatureName,
  XRFeatureStatus,
  XRFeatureCapability,
  XRRecommendedFeatures,
  XRPlatformCapabilities,
  UseWebXRPlatformState,
  CapabilityBadgeSize,
  CapabilityBadgeVariant,
  CapabilityBadgeDisplayMode,
  XRPlatformTheme,
  PlatformColorSet,
} from './components/webxr-platform';

// =============================================================================
// ROBOT TELEOPERATION (XR Headset + GR00T N1.6 Policy Streaming)
// =============================================================================

export {
  TeleoperationHub,
  createTeleoperationHub,
} from './TeleoperationHub';

export {
  RobotPolicyStreamClient,
  createRobotPolicyStreamClient,
} from './RobotPolicyStreamClient';

export {
  RobotCameraOverlay,
  createRobotCameraOverlay,
} from './RobotCameraOverlay';

export {
  RobotTelemetryDisplay,
  createRobotTelemetryDisplay,
} from './RobotTelemetryDisplay';

export {
  SafetyBoundarySystem,
  createSafetyBoundarySystem,
} from './SafetyBoundarySystem';

export {
  InverseKinematicsSolver,
  createInverseKinematicsSolver,
} from './InverseKinematicsSolver';

export {
  GR00TN16PolicyClient,
  createGR00TN16PolicyClient,
} from './GR00TN16PolicyClient';

export type {
  GR00TN16Config,
  GR00TObservation,
  GR00TActionChunk,
  GR00TActionStep,
  GR00TPolicyMode,
  GR00TConnectionState,
  GR00TN16Metrics,
  GR00TEvent,
  GR00TEventType,
  GR00TEventListener,
  GR00TJointName,
  PolicyModeConfig,
  ActionChunkingConfig,
  CameraEmbeddingConfig,
} from './GR00TN16PolicyClientTypes';

export {
  DEFAULT_GROOT_N16_CONFIG,
  DEFAULT_POLICY_MODES,
  DEFAULT_ACTION_CHUNKING_CONFIG,
  OBSERVATION_TOTAL_DIM,
  ACTION_DIM,
  ACTION_JOINT_COUNT,
  GROOT_37DOF_JOINT_NAMES,
  createEmptyGR00TMetrics,
} from './GR00TN16PolicyClientTypes';

// =============================================================================
// GPU COMPUTE (merged from @holoscript/gpu)
// =============================================================================

export * from './GPUCompute';

// =============================================================================
// CROSS-REALITY AGENT CONTINUITY
// =============================================================================

export * from './CrossRealityContinuityTypes';
export * from './AuthenticatedCRDTEngine';
export * from './GeospatialAnchorBridge';
export * from './CrossRealityHandoffProtocol';
export * from './CrossRealityAnchorSystem';
export * from './MVCSerializer';
export * from './NetworkTransportAdapter';
export * from './OfflineRecoveryQueue';
export * from './EmbodimentTransitionAnimator';
export * from './CrossRealitySessionManager';
export * from './CrossRealityAgent';
export * from './VendorAnchorCloudProvider';
export * from './MVCPayloadCompressor';
export * from './HandoffNormEnforcer';
export * from './CrossRealityCRDTBridge';
export * from './WebSocketTransportBackend';
export * from './AgentIdentityContinuity';
export * from './components/webxr-agent-embodiment';
export * from './components/cross-reality-monitor';

// =============================================================================
// CROSS-REALITY ECS (Entity-Component-System for Agent State Persistence)
// =============================================================================

export * from './CrossRealityECS';

// =============================================================================
// WEBXR SESSION BRIDGE (WebXR Device API Integration for VR/AR Handoffs)
// =============================================================================

export {
  WebXRSessionBridge,
  createWebXRSessionBridge,
} from './WebXRSessionBridge';
export type {
  XRSessionMode,
  XRReferenceSpaceType,
  WebXRCapabilities as WebXRSessionCapabilities,
  XRSessionState,
} from './WebXRSessionBridge';

// =============================================================================
// GDPR COMPLIANCE (Right to Erasure, Data Portability, Consent Tracking)
// =============================================================================

export * from './security/GDPRComplianceManager';

// =============================================================================
// VR SCENE PERFORMANCE BUDGET (Draw Call Analysis, Frame Budget, Batching)
// =============================================================================

export {
  analyzeScenePerformanceBudget,
  createDragonMeshDescriptors,
} from './VRScenePerformanceBudget';

export type {
  VRTargetPlatform,
  GeometryComplexity,
  MeshCategory,
  FrameBudgetAllocation,
  DrawCallAnalysis,
  AnimationAnalysis,
  VolumetricAnalysis,
  LightingAnalysis,
  ScenePerformanceBudget,
  OptimizationRecommendation,
  SceneMeshDescriptor,
} from './VRScenePerformanceBudget';

// =============================================================================
// DRAGON MESH BATCHER (163 Meshes -> 10-20 Draw Calls)
// =============================================================================

export {
  DragonMeshBatcher,
  createDragonMeshBatcher,
} from './DragonMeshBatcher';

export type {
  BatchGroupType,
  CreatureBodyRegion,
  BatchMeshEntry,
  BatchGroup,
  BatchingPlan,
  BatchingConfig,
} from './DragonMeshBatcher';

// =============================================================================
// CREATURE LOD PROFILE (Dragon-Specific LOD for Procedural Geometry)
// =============================================================================

export {
  generateCreatureLODProfile,
  createDragonLODProfile,
  DRAGON_LOD_PROFILE,
} from './CreatureLODProfile';

export type {
  CreatureSizeClass,
  RegionDetailImportance,
  CreatureLODProfileConfig,
  CreatureLODOutput,
  RegionLODRecommendation,
  AnimationLODConfig,
  AnimationLODThreshold,
  DetailMergingConfig,
} from './CreatureLODProfile';

// =============================================================================
// CREATURE FOVEATED PROFILE (Gaze-Contingent VR Rendering for Organic Models)
// =============================================================================

export {
  CreatureFoveatedRenderer,
  createCreatureFoveatedRenderer,
} from './CreatureFoveatedProfile';

export type {
  FoveatedZoneType,
  EyeTrackingData,
  FoveatedZoneConfig as CreatureFoveatedZoneConfig,
  RegionFoveatedState,
  CreatureFoveatedConfig,
  CreatureFoveatedMetrics,
} from './CreatureFoveatedProfile';

// =============================================================================
// VR SCENE PROFILER DASHBOARD (Real-Time Performance Profiling UI)
// =============================================================================

export {
  SceneProfilerDashboard,
} from './components/scene-profiler';

export type {
  SceneProfilerDashboardProps,
} from './components/scene-profiler';

export {
  useSceneProfiler,
} from './components/scene-profiler';

export type {
  UseSceneProfilerConfig,
} from './components/scene-profiler';

export {
  DEFAULT_SCENE_PROFILER_THEME,
  FRAME_BUDGET_90HZ as SCENE_PROFILER_FRAME_BUDGET_90HZ,
  FRAME_BUDGET_60HZ as SCENE_PROFILER_FRAME_BUDGET_60HZ,
  PANEL_LABELS as SCENE_PROFILER_PANEL_LABELS,
  BATCH_TYPE_LABELS,
  BATCH_TYPE_COLORS,
} from './components/scene-profiler';

export type {
  SceneProfilerPanel,
  ProfilerDisplayMode,
  ProfilerFrameSample,
  BatchingStatus,
  LODStatus as SceneProfilerLODStatus,
  VolumetricFireStatus,
  BudgetHealthStatus,
  SceneProfilerState,
  SceneProfilerActions,
  SceneProfilerTheme,
} from './components/scene-profiler';

// =============================================================================
// WEBGPU COMPUTE SHADER CONTROLS
// =============================================================================

export {
  ComputeShaderPanel,
} from './components/webgpu-compute';

export type {
  ComputeShaderPanelProps,
} from './components/webgpu-compute';

export {
  FluidSimulationControls,
} from './components/webgpu-compute';

export type {
  FluidSimulationControlsProps,
} from './components/webgpu-compute';

export {
  ParticleSystemControls,
} from './components/webgpu-compute';

export type {
  ParticleSystemControlsProps,
} from './components/webgpu-compute';

export {
  ClothSimulationControls,
} from './components/webgpu-compute';

export type {
  ClothSimulationControlsProps,
} from './components/webgpu-compute';

export {
  GPUPerformanceOverlay,
} from './components/webgpu-compute';

export type {
  GPUPerformanceOverlayProps,
} from './components/webgpu-compute';

export {
  ShaderEditorPanel,
} from './components/webgpu-compute';

export type {
  ShaderEditorPanelProps,
} from './components/webgpu-compute';

export {
  useComputeShaderPanel,
  useFluidSimulation,
  useParticleSystem,
  useClothSimulation,
  useGPUPerformance,
  useShaderEditor,
} from './components/webgpu-compute';

export type {
  UseComputeShaderPanelConfig,
  UseFluidSimulationConfig,
  UseParticleSystemConfig,
  UseClothSimulationConfig,
  UseGPUPerformanceConfig,
  UseShaderEditorConfig,
} from './components/webgpu-compute';

export {
  DEFAULT_WEBGPU_COMPUTE_THEME,
  MAX_PARTICLE_COUNT,
  DEFAULT_FLUID_PARAMS,
  DEFAULT_PARTICLE_PARAMS,
  DEFAULT_CLOTH_PARAMS,
  WGSL_TEMPLATES,
  WGSL_KEYWORDS,
  WGSL_TYPES,
  WGSL_BUILTINS,
  WGSL_ATTRIBUTES,
  VELOCITY_FIELD_LABELS,
  FORCE_FIELD_LABELS,
  EMITTER_SHAPE_LABELS,
} from './components/webgpu-compute';

export type {
  PipelineStatus,
  WorkgroupSize,
  DispatchSize,
  ComputePipelineState,
  ComputeShaderPanelState,
  ComputeShaderPanelActions,
  FluidSolverType,
  BoundaryCondition,
  FluidSimulationParams,
  VelocityFieldDisplay,
  FluidSimulationState,
  FluidSimulationActions,
  EmitterShape,
  ForceFieldType,
  GradientStop,
  ForceField,
  ParticleSystemParams,
  ParticleSystemState,
  ParticleSystemActions,
  ClothIntegrationMethod,
  PinPoint,
  ClothSimulationParams,
  ClothSimulationState,
  ClothSimulationActions,
  GPUPerformanceSample,
  GPUBufferInfo,
  GPUPerformanceOverlayState,
  GPUPerfPanel,
  GPUPerformanceOverlayActions,
  ShaderCompilationStatus,
  ShaderCompilationError,
  WGSLTokenType,
  ShaderEditorState,
  ShaderEditorActions,
  WebGPUComputeTheme,
} from './components/webgpu-compute';

// =============================================================================
// SPECTATOR CAMERA (Non-XR Scene Capture + Multi-Mode Camera Control)
// =============================================================================

export {
  SpectatorCameraPanel,
} from './components/spectator-camera';

export type {
  SpectatorCameraPanelProps,
} from './components/spectator-camera';

export {
  SpectatorCameraController,
  createSpectatorCameraController,
} from './components/spectator-camera';

export {
  SpectatorCaptureEngine,
  createSpectatorCaptureEngine,
} from './components/spectator-camera';

export {
  useSpectatorCamera,
} from './components/spectator-camera';

export type {
  UseSpectatorCameraConfig,
} from './components/spectator-camera';

export {
  CAMERA_MODE_LABELS,
  CAMERA_MODE_DESCRIPTIONS,
  CAPTURE_RESOLUTION_PRESETS,
  DEFAULT_SPECTATOR_CAMERA_STATE,
  DEFAULT_ORBIT_CONFIG,
  DEFAULT_FLY_CONFIG,
  DEFAULT_CINEMATIC_CONFIG,
  DEFAULT_CAPTURE_CONFIG,
  DEFAULT_PLAYBACK_STATE,
  DEFAULT_SPECTATOR_THEME,
  EASING_FUNCTIONS,
} from './components/spectator-camera';

export type {
  SpectatorCameraMode,
  SpectatorCameraState,
  SpectatorOrbitConfig,
  SpectatorFlyConfig,
  SpectatorCinematicConfig,
  CinematicWaypoint,
  CinematicEasing,
  CinematicPlaybackState,
  CaptureFormat,
  CaptureResolutionPreset,
  SpectatorCaptureConfig,
  CaptureResult,
  CaptureHistoryEntry,
  SpectatorStatus,
  SpectatorPerformanceMetrics,
  SpectatorCameraHookState,
  SpectatorCameraHookActions,
  SpectatorCameraTheme,
} from './components/spectator-camera';

// =============================================================================
// VERSION
// =============================================================================

export const HOLOLAND_RENDERER_VERSION = '1.0.0-alpha.5';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

import { HololandRenderer } from './HololandRenderer';
import { Hololand2DRenderer } from './Hololand2DRenderer';
import { QualityManager } from './QualityManager';
import { PostProcessingPipeline } from './PostProcessing';
import { EnvironmentManager, HDRI_PRESETS } from './EnvironmentManager';
import { AssetLoader } from './AssetLoader';
import { MaterialFactory } from './MaterialFactory';
import { SmartProxyRenderer } from './SmartProxyRenderer';
import { VRMaterialPreviewSystem } from './VRMaterialPreviewSystem';
import { HoloScriptMaterialParser } from './HoloScriptMaterialParser';
import { AgentStateBuffer } from './AgentStateBuffer';
import { AgentCommunicationManager } from './AgentCommunicationManager';
import { VRTrustHandshake } from './VRTrustHandshake';
import { BloomFilterRevocation } from './BloomFilterRevocation';
import { GossipTrustMesh } from './GossipTrustMesh';
import { BehavioralTrustScoring } from './BehavioralTrustScoring';
import { BehavioralTrustBridge } from './BehavioralTrustBridge';
import { TrustIntegrationLayer } from './TrustIntegrationLayer';
import { SpatialReasoningEngine } from './SpatialReasoningEngine';
import { InferenceScheduler } from './InferenceScheduler';
import { GaussianBudgetManager } from './GaussianBudgetManager';
import { SharedSpatialAnchorManager } from './SharedSpatialAnchorManager';
import { FoveatedGaussianRenderer } from './FoveatedGaussianRenderer';
import { BudgetEnforcedGaussianRenderer } from './BudgetEnforcedGaussianRenderer';
import { SpatialInferenceComputePipeline } from './SpatialInferenceComputePipeline';
import { LightingFidelityManager } from './LightingFidelityManager';
import { GaussianSplatViewer } from './components/gaussian-splat-viewer';
import { WebGPUSplatRenderer } from './components/gaussian-splat-viewer';
import { OrbitCameraController } from './components/gaussian-splat-viewer';
import { VRPerformanceDashboard } from './components/vr-performance-dashboard';
import { GaussianBudgetUtilization } from './components/vr-performance-dashboard';
import { FrameTimeWaterfall } from './components/vr-performance-dashboard';
import { EconomicDashboard } from './components/economic-dashboard';
import { MarketplaceTradingUI } from './components/marketplace-trading';
import { AgentLocalGraphBuilder } from './AgentLocalGraphBuilder';
import { TrainingFreeAlignmentMerger } from './TrainingFreeAlignmentMerger';
import { SpatialRelationshipExtractor } from './SpatialRelationshipExtractor';
import { DistributedSceneGraphOrchestrator } from './DistributedSceneGraphOrchestrator';
import { SNNPerceptionWorker } from './SNNPerceptionWorker';
import { SharedPerceptionBuffer } from './SharedPerceptionBuffer';
import { SNNPerceptionBridge } from './SNNPerceptionBridge';
import { DynamicNeuralField } from './DynamicNeuralField';
import { DNFSpatialAttentionField } from './DNFSpatialAttentionField';
import { DNFPerceptionIntegration } from './DNFPerceptionIntegration';
import { DNFVisualizationDataBuilder } from './DNFVisualizationData';
import { PlatformCapabilityBadge } from './components/webxr-platform';
import { detectWebXRPlatform, detectPlatformSync } from './components/webxr-platform';
import { TeleoperationHub } from './TeleoperationHub';
import { GR00TN16PolicyClient } from './GR00TN16PolicyClient';
import { ComputeShaderPanel } from './components/webgpu-compute';
import { FluidSimulationControls } from './components/webgpu-compute';
import { ParticleSystemControls } from './components/webgpu-compute';
import { ClothSimulationControls } from './components/webgpu-compute';
import { GPUPerformanceOverlay } from './components/webgpu-compute';
import { ShaderEditorPanel } from './components/webgpu-compute';
import { SpectatorCameraPanel } from './components/spectator-camera';
import { SpectatorCameraController } from './components/spectator-camera';
import { SpectatorCaptureEngine } from './components/spectator-camera';

export default {
  HololandRenderer,
  Hololand2DRenderer,
  SmartProxyRenderer,
  VRMaterialPreviewSystem,
  HoloScriptMaterialParser,
  QualityManager,
  PostProcessingPipeline,
  EnvironmentManager,
  AssetLoader,
  MaterialFactory,
  AgentStateBuffer,
  AgentCommunicationManager,
  VRTrustHandshake,
  BloomFilterRevocation,
  GossipTrustMesh,
  BehavioralTrustScoring,
  BehavioralTrustBridge,
  TrustIntegrationLayer,
  SpatialReasoningEngine,
  InferenceScheduler,
  GaussianBudgetManager,
  SharedSpatialAnchorManager,
  FoveatedGaussianRenderer,
  BudgetEnforcedGaussianRenderer,
  SpatialInferenceComputePipeline,
  LightingFidelityManager,
  GaussianSplatViewer,
  WebGPUSplatRenderer,
  OrbitCameraController,
  VRPerformanceDashboard,
  GaussianBudgetUtilization,
  FrameTimeWaterfall,
  EconomicDashboard,
  MarketplaceTradingUI,
  AgentLocalGraphBuilder,
  TrainingFreeAlignmentMerger,
  SpatialRelationshipExtractor,
  DistributedSceneGraphOrchestrator,
  SNNPerceptionWorker,
  SharedPerceptionBuffer,
  SNNPerceptionBridge,
  DynamicNeuralField,
  DNFSpatialAttentionField,
  DNFPerceptionIntegration,
  DNFVisualizationDataBuilder,
  PlatformCapabilityBadge,
  detectWebXRPlatform,
  detectPlatformSync,
  TeleoperationHub,
  GR00TN16PolicyClient,
  ComputeShaderPanel,
  FluidSimulationControls,
  ParticleSystemControls,
  ClothSimulationControls,
  GPUPerformanceOverlay,
  ShaderEditorPanel,
  SpectatorCameraPanel,
  SpectatorCameraController,
  SpectatorCaptureEngine,
  HDRI_PRESETS,
  HOLOLAND_RENDERER_VERSION: '1.0.0-alpha.5',
};
