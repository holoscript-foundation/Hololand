// =============================================================================
// sort-key-gen.wgsl
//
// Foveated Sort Key Generation for Gaussian Splatting
//
// Each thread processes one Gaussian splat:
//   1. Transform world position to view space via viewMatrix
//   2. Compute linear depth = -viewPos.z (camera looks down -Z)
//   3. Encode depth as monotonically sortable uint32 (IEEE 754 bit trick)
//   4. Compute screen-space position for foveated zone classification
//   5. Encode zone into top 2 bits of key for coarse foveal priority
//   6. Write (key, originalIndex) pair to sort buffers
//
// Key layout (32 bits):
//   [31:30]  Foveated zone (0 = foveal, 1 = mid, 2 = peripheral, 3 = cull)
//   [29:0]   Depth bits (sortable uint30 from view-space depth)
//
// This ensures foveal splats sort first within their depth band,
// enabling early-out or reduced quality for peripheral regions.
//
// workgroup_size(256): standard tile for cross-platform safety
// No global atomics, no subgroup ops.
//
// @module gaussian-splat-viewer/shaders/sort-key-gen
// =============================================================================

struct Uniforms {
  viewMatrix: mat4x4<f32>,
  projMatrix: mat4x4<f32>,
  cameraPos: vec4<f32>,
  cameraFwd: vec4<f32>,
  splatCount: u32,
  splatScale: f32,
  opacityScale: f32,
  _pad0: u32,
  viewport: vec4<f32>,          // (width, height, 0, 0)
  bgColor: vec4<f32>,
};

struct FoveationParams {
  // Foveal region center in NDC space [-1, 1]
  foveaCenterX: f32,
  foveaCenterY: f32,
  // Radii squared in NDC space for zone boundaries
  fovealRadiusSq: f32,          // inner foveal zone
  midRadiusSq: f32,             // mid-peripheral zone
  // Foveal zone alpha multipliers (for quality scaling)
  fovealAlpha: f32,             // 1.0 (full quality)
  midAlpha: f32,                // 0.7 (reduced quality)
  peripheralAlpha: f32,         // 0.4 (low quality)
  cullBeyondDepth: f32,         // max depth before culling
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> foveation: FoveationParams;
@group(0) @binding(2) var<storage, read> positions: array<f32>;
@group(0) @binding(3) var<storage, read_write> sortKeys: array<u32>;
@group(0) @binding(4) var<storage, read_write> sortValues: array<u32>;
@group(0) @binding(5) var<storage, read_write> zoneAssignments: array<u32>;

// Convert a float to a monotonically sortable uint32.
// Positive floats map to [0x80000000, 0xFFFFFFFF] in order.
// Negative floats map to [0x00000000, 0x7FFFFFFF] in reverse order.
// After this transform, unsigned integer comparison preserves float ordering.
fn floatToSortableUint(value: f32) -> u32 {
  let bits = bitcast<u32>(value);
  let mask = select(0x80000000u, 0xFFFFFFFFu, (bits & 0x80000000u) != 0u);
  return bits ^ mask;
}

// Classify screen-space position into foveated zone.
// Zone 0 = foveal (highest priority, full quality)
// Zone 1 = mid-peripheral
// Zone 2 = peripheral (lowest quality)
// Zone 3 = culled (beyond depth threshold or off-screen)
fn classifyZone(ndcX: f32, ndcY: f32, depth: f32) -> u32 {
  // Cull if behind camera or beyond max depth
  if (depth < 0.0 || depth > foveation.cullBeyondDepth) {
    return 3u;
  }

  // Cull if outside NDC clip volume
  if (ndcX < -1.0 || ndcX > 1.0 || ndcY < -1.0 || ndcY > 1.0) {
    return 3u;
  }

  // Compute squared distance from fovea center in NDC
  let dx = ndcX - foveation.foveaCenterX;
  let dy = ndcY - foveation.foveaCenterY;
  let distSq = dx * dx + dy * dy;

  if (distSq <= foveation.fovealRadiusSq) {
    return 0u;  // Foveal
  }
  if (distSq <= foveation.midRadiusSq) {
    return 1u;  // Mid-peripheral
  }
  return 2u;    // Peripheral
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= uniforms.splatCount) {
    return;
  }

  // Read world-space position
  let px = positions[idx * 3u + 0u];
  let py = positions[idx * 3u + 1u];
  let pz = positions[idx * 3u + 2u];
  let worldPos = vec4<f32>(px, py, pz, 1.0);

  // Transform to view space
  let viewPos = uniforms.viewMatrix * worldPos;

  // Linear depth (positive = in front of camera)
  let depth = -viewPos.z;

  // Project to clip space for NDC computation
  let clipPos = uniforms.projMatrix * viewPos;
  let w = clipPos.w;

  // Perspective divide for NDC (guard against w near zero)
  var ndcX = 0.0;
  var ndcY = 0.0;
  if (abs(w) > 0.0001) {
    ndcX = clipPos.x / w;
    ndcY = clipPos.y / w;
  }

  // Classify into foveated zone
  let zone = classifyZone(ndcX, ndcY, depth);

  // Encode depth as sortable uint, then truncate to 30 bits
  let depthSortable = floatToSortableUint(depth);
  let depthBits30 = depthSortable >> 2u;  // Top 30 bits of depth

  // Compose key: [zone:2][depth:30]
  // Zone 0 (foveal) sorts first, then zone 1 (mid), then zone 2 (peripheral)
  // Within each zone, splats are sorted by depth (front-to-back)
  let key = (zone << 30u) | depthBits30;

  // Write outputs
  sortKeys[idx] = key;
  sortValues[idx] = idx;
  zoneAssignments[idx] = zone;
}
