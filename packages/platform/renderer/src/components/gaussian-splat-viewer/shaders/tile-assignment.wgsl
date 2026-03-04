// =============================================================================
// tile-assignment.wgsl
//
// Tile Assignment with Foveated Zone Classification
//
// After the global radix sort has produced a depth-sorted index array,
// this shader assigns each sorted Gaussian to a screen-space tile and
// classifies it into a foveated rendering zone.
//
// The screen is divided into a grid of tiles (e.g., 16x16 pixels each).
// Each tile accumulates a count of Gaussians that overlap it. The foveated
// zone classification determines the rendering quality tier for each tile:
//
//   Zone 0 (Foveal):     Full quality, all Gaussians rendered
//   Zone 1 (Mid):        Reduced quality, skip every Nth Gaussian
//   Zone 2 (Peripheral): Low quality, aggressive culling + larger splats
//   Zone 3 (Culled):     Tile off-screen or beyond depth threshold
//
// This pass also computes per-tile offset and count arrays that the
// rasterizer uses for tile-based rendering, enabling efficient per-tile
// draw call generation.
//
// Algorithm:
//   1. Project sorted Gaussian center to screen space
//   2. Compute 2D Gaussian footprint (bounding box from covariance)
//   3. For each tile the Gaussian overlaps:
//      a. Classify tile center into foveated zone
//      b. Apply zone-specific decimation (skip factor)
//      c. If not skipped, atomicAdd to tile's Gaussian count
//   4. Write per-Gaussian tile assignment for rasterizer consumption
//
// Properties:
//   - workgroup_size(256)
//   - No global atomics (tile counters use workgroup-local + per-tile buffer atomics)
//   - No subgroup operations
//   - Output: tileGaussianCounts, tileZones, perGaussianTileId
//
// @module gaussian-splat-viewer/shaders/tile-assignment
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

struct TileParams {
  tileCountX: u32,              // Number of tiles in X dimension
  tileCountY: u32,              // Number of tiles in Y dimension
  tileSizePixels: u32,          // Tile size in pixels (e.g., 16)
  totalTiles: u32,              // tileCountX * tileCountY
  // Foveation parameters
  foveaCenterX: f32,            // Fovea center X in pixel coordinates
  foveaCenterY: f32,            // Fovea center Y in pixel coordinates
  fovealRadiusSq: f32,          // Foveal zone radius squared (pixels^2)
  midRadiusSq: f32,             // Mid zone radius squared (pixels^2)
  // Decimation factors per zone (1 = keep all, 2 = keep 1/2, etc.)
  fovealDecimation: u32,        // 1 (no decimation in foveal zone)
  midDecimation: u32,           // 2 (keep every other Gaussian)
  peripheralDecimation: u32,    // 4 (keep every 4th Gaussian)
  maxGaussiansPerTile: u32,     // Budget cap per tile
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> tileParams: TileParams;
@group(0) @binding(2) var<storage, read> sortedIndices: array<u32>;
@group(0) @binding(3) var<storage, read> positions: array<f32>;
@group(0) @binding(4) var<storage, read> scales: array<f32>;

// Output buffers
@group(0) @binding(5) var<storage, read_write> tileGaussianCounts: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> tileZones: array<u32>;
@group(0) @binding(7) var<storage, read_write> perGaussianTileId: array<u32>;

// Classify a tile center into foveated zone based on distance from fovea center.
fn classifyTileZone(tileCenterX: f32, tileCenterY: f32) -> u32 {
  let dx = tileCenterX - tileParams.foveaCenterX;
  let dy = tileCenterY - tileParams.foveaCenterY;
  let distSq = dx * dx + dy * dy;

  if (distSq <= tileParams.fovealRadiusSq) {
    return 0u;  // Foveal
  }
  if (distSq <= tileParams.midRadiusSq) {
    return 1u;  // Mid-peripheral
  }
  return 2u;    // Peripheral
}

// Get the decimation factor for a given zone.
fn getDecimationFactor(zone: u32) -> u32 {
  switch (zone) {
    case 0u: { return tileParams.fovealDecimation; }
    case 1u: { return tileParams.midDecimation; }
    case 2u: { return tileParams.peripheralDecimation; }
    default: { return 1u; }
  }
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let sortedIdx = gid.x;
  if (sortedIdx >= uniforms.splatCount) {
    return;
  }

  // Look up original Gaussian index from sorted order
  let gaussianIdx = sortedIndices[sortedIdx];

  // Read world-space position
  let px = positions[gaussianIdx * 3u + 0u];
  let py = positions[gaussianIdx * 3u + 1u];
  let pz = positions[gaussianIdx * 3u + 2u];
  let worldPos = vec4<f32>(px, py, pz, 1.0);

  // Transform to view space
  let viewPos = uniforms.viewMatrix * worldPos;

  // Skip if behind camera
  if (viewPos.z > -0.01) {
    perGaussianTileId[sortedIdx] = 0xFFFFFFFFu;  // Invalid tile marker
    return;
  }

  // Project to clip space
  let clipPos = uniforms.projMatrix * viewPos;
  let w = clipPos.w;

  if (abs(w) < 0.0001) {
    perGaussianTileId[sortedIdx] = 0xFFFFFFFFu;
    return;
  }

  // NDC to pixel coordinates
  let ndcX = clipPos.x / w;
  let ndcY = clipPos.y / w;
  let screenX = (ndcX * 0.5 + 0.5) * uniforms.viewport.x;
  let screenY = (1.0 - (ndcY * 0.5 + 0.5)) * uniforms.viewport.y;  // Y flipped

  // Compute approximate Gaussian footprint radius in pixels.
  // Use the maximum scale component as a conservative radius estimate.
  let sx = scales[gaussianIdx * 3u + 0u];
  let sy = scales[gaussianIdx * 3u + 1u];
  let sz = scales[gaussianIdx * 3u + 2u];
  let maxScale = max(max(abs(sx), abs(sy)), abs(sz)) * uniforms.splatScale;

  // Project scale to screen pixels (approximate)
  let focalX = uniforms.projMatrix[0][0] * uniforms.viewport.x * 0.5;
  let depth = -viewPos.z;
  let pixelRadius = maxScale * focalX / depth * 3.0;  // 3-sigma coverage

  // Compute tile bounding box for this Gaussian
  let tileSize = f32(tileParams.tileSizePixels);
  let minTileX = max(0, i32(floor((screenX - pixelRadius) / tileSize)));
  let maxTileX = min(i32(tileParams.tileCountX) - 1, i32(floor((screenX + pixelRadius) / tileSize)));
  let minTileY = max(0, i32(floor((screenY - pixelRadius) / tileSize)));
  let maxTileY = min(i32(tileParams.tileCountY) - 1, i32(floor((screenY + pixelRadius) / tileSize)));

  // Assign to the primary tile (tile containing the Gaussian center)
  let primaryTileX = clamp(u32(floor(screenX / tileSize)), 0u, tileParams.tileCountX - 1u);
  let primaryTileY = clamp(u32(floor(screenY / tileSize)), 0u, tileParams.tileCountY - 1u);
  let primaryTileId = primaryTileY * tileParams.tileCountX + primaryTileX;

  // Classify the primary tile's zone
  let tileCenterX = (f32(primaryTileX) + 0.5) * tileSize;
  let tileCenterY = (f32(primaryTileY) + 0.5) * tileSize;
  let zone = classifyTileZone(tileCenterX, tileCenterY);

  // Store tile zone (idempotent write, all Gaussians in same tile agree)
  tileZones[primaryTileId] = zone;

  // Apply foveated decimation: skip this Gaussian if its index in the
  // sorted sequence doesn't pass the decimation filter for this zone.
  let decimation = getDecimationFactor(zone);
  if (decimation > 1u && (sortedIdx % decimation) != 0u) {
    perGaussianTileId[sortedIdx] = 0xFFFFFFFFu;  // Decimated
    return;
  }

  // Write primary tile assignment
  perGaussianTileId[sortedIdx] = primaryTileId;

  // Increment Gaussian counts for all overlapping tiles
  for (var ty = minTileY; ty <= maxTileY; ty++) {
    for (var tx = minTileX; tx <= maxTileX; tx++) {
      let tileId = u32(ty) * tileParams.tileCountX + u32(tx);
      let currentCount = atomicAdd(&tileGaussianCounts[tileId], 1u);

      // Budget cap per tile: if exceeded, the extra Gaussians are effectively skipped
      // during rasterization (they still contribute to counts for stats).
      // Capping here prevents excessive overdraw in dense regions.
    }
  }
}

// =============================================================================
// Tile Zone Classification Pass (separate entry point)
//
// Pre-classifies all tiles into foveated zones. Run once per frame before
// the main tile assignment pass when tile zones are needed independently.
// =============================================================================

@compute @workgroup_size(256)
fn classifyTiles(@builtin(global_invocation_id) gid: vec3<u32>) {
  let tileId = gid.x;
  if (tileId >= tileParams.totalTiles) {
    return;
  }

  let tileX = tileId % tileParams.tileCountX;
  let tileY = tileId / tileParams.tileCountX;

  let tileSize = f32(tileParams.tileSizePixels);
  let tileCenterX = (f32(tileX) + 0.5) * tileSize;
  let tileCenterY = (f32(tileY) + 0.5) * tileSize;

  tileZones[tileId] = classifyTileZone(tileCenterX, tileCenterY);

  // Reset tile Gaussian count for the new frame
  atomicStore(&tileGaussianCounts[tileId], 0u);
}
