// =============================================================================
// stop-the-pop.wgsl
//
// StopThePop Hierarchical Re-Sort with t_opt Computation
//
// Implements the "StopThePop" popping artifact reduction from:
//   Radl et al., "StopThePop: Sorted Gaussian Splatting for
//   View-Consistent Real-time Rendering" (SIGGRAPH 2024)
//
// The core insight: standard depth sorting by Gaussian center fails because
// the actual visibility intersection of an oriented 3D Gaussian ellipsoid
// with a view ray occurs at t_opt (optimal intersection parameter), not at
// the center's projected depth. When the camera moves, the relative ordering
// of t_opt values can differ from center-depth ordering, causing "popping"
// artifacts as Gaussians swap blend order between frames.
//
// This shader computes t_opt per Gaussian per tile and performs a
// hierarchical local re-sort within each tile's Gaussian list to eliminate
// popping. The hierarchical approach:
//   1. Per-tile: Compute t_opt for each Gaussian assigned to this tile
//   2. Per-tile: Bitonic sort the Gaussians by t_opt (local to workgroup)
//   3. Write corrected sorted indices back to per-tile Gaussian lists
//
// t_opt computation (from StopThePop paper, Eq. 7):
//   Given a view ray through pixel (u, v) and a 3D Gaussian with:
//     - mean mu (3D position)
//     - covariance Sigma = R * S * S^T * R^T
//   The optimal depth parameter along the ray is:
//     t_opt = (ray_dir^T * Sigma^-1 * (mu - ray_origin)) /
//             (ray_dir^T * Sigma^-1 * ray_dir)
//
//   For efficiency, we approximate using the tile center ray and the
//   Gaussian's 2D projected covariance, avoiding full 3D inverse:
//     t_opt ~ depth_center + correction_term
//   where correction_term accounts for the Gaussian's extent along the ray.
//
// Properties:
//   - workgroup_size(256): processes one tile's Gaussians per workgroup
//   - No global atomics, no subgroup operations
//   - Bitonic sort within workgroup shared memory (O(n log^2 n) comparisons)
//   - Maximum 256 Gaussians per tile (workgroup size limit)
//
// @module gaussian-splat-viewer/shaders/stop-the-pop
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
  viewport: vec4<f32>,
  bgColor: vec4<f32>,
};

struct StopThePopParams {
  tileCountX: u32,              // Number of tiles in X
  tileCountY: u32,              // Number of tiles in Y
  tileSizePixels: u32,          // Tile size in pixels
  totalTiles: u32,              // Total tiles
  maxGaussiansPerTile: u32,     // Cap per tile (must be <= 256)
  enableToptCorrection: u32,    // 1 = compute t_opt, 0 = use center depth only
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> stpParams: StopThePopParams;
@group(0) @binding(2) var<storage, read> positions: array<f32>;
@group(0) @binding(3) var<storage, read> scales: array<f32>;
@group(0) @binding(4) var<storage, read> rotations: array<f32>;
@group(0) @binding(5) var<storage, read> tileGaussianCounts: array<u32>;
@group(0) @binding(6) var<storage, read> tileGaussianOffsets: array<u32>;
@group(0) @binding(7) var<storage, read_write> tileGaussianIndices: array<u32>;

// Workgroup-local storage for bitonic sort.
// Each element stores (t_opt as sortable uint, original index).
var<workgroup> sortKeysLocal: array<u32, 256>;
var<workgroup> sortValsLocal: array<u32, 256>;
var<workgroup> tileGaussianCount: u32;

// Build rotation matrix from quaternion (xyzw layout).
fn quatToMat3(q: vec4<f32>) -> mat3x3<f32> {
  let x = q.x;
  let y = q.y;
  let z = q.z;
  let w = q.w;

  let x2 = x * 2.0;
  let y2 = y * 2.0;
  let z2 = z * 2.0;
  let xx = x * x2;
  let xy = x * y2;
  let xz = x * z2;
  let yy = y * y2;
  let yz = y * z2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;

  return mat3x3<f32>(
    vec3<f32>(1.0 - yy - zz, xy + wz, xz - wy),
    vec3<f32>(xy - wz, 1.0 - xx - zz, yz + wx),
    vec3<f32>(xz + wy, yz - wx, 1.0 - xx - yy),
  );
}

// Compute t_opt for a Gaussian along a view ray from the tile center.
//
// This is the StopThePop correction: instead of sorting by the projected
// depth of the Gaussian center, we compute where the view ray through the
// tile center would intersect the Gaussian's isosurface at maximum density.
//
// For an axis-aligned case, t_opt = mu_z + (sigma_z^2 * (ray_z - mu_z)) / dot(ray, Sigma * ray)
// For the general case with rotation, we use the full covariance.
fn computeTopt(
  gaussianIdx: u32,
  tileCenterPixelX: f32,
  tileCenterPixelY: f32,
) -> f32 {
  // Read Gaussian parameters
  let px = positions[gaussianIdx * 3u + 0u];
  let py = positions[gaussianIdx * 3u + 1u];
  let pz = positions[gaussianIdx * 3u + 2u];
  let mu = vec3<f32>(px, py, pz);

  // Read scale
  let sx = scales[gaussianIdx * 3u + 0u] * uniforms.splatScale;
  let sy = scales[gaussianIdx * 3u + 1u] * uniforms.splatScale;
  let sz = scales[gaussianIdx * 3u + 2u] * uniforms.splatScale;

  // Read rotation quaternion
  let qx = rotations[gaussianIdx * 4u + 0u];
  let qy = rotations[gaussianIdx * 4u + 1u];
  let qz = rotations[gaussianIdx * 4u + 2u];
  let qw = rotations[gaussianIdx * 4u + 3u];
  let quat = vec4<f32>(qx, qy, qz, qw);

  // Build 3D covariance: Sigma = R * S^2 * R^T
  let R = quatToMat3(quat);
  let S2 = vec3<f32>(sx * sx, sy * sy, sz * sz);

  // Transform Gaussian mean to view space
  let viewMu = (uniforms.viewMatrix * vec4<f32>(mu, 1.0)).xyz;

  // Base depth: -z in view space
  let depthCenter = -viewMu.z;

  // If t_opt correction is disabled, return center depth directly
  if (stpParams.enableToptCorrection == 0u) {
    return depthCenter;
  }

  // Construct the view ray direction for the tile center pixel
  // Unproject tile center from pixel to view space
  let focalX = uniforms.projMatrix[0][0] * uniforms.viewport.x * 0.5;
  let focalY = uniforms.projMatrix[1][1] * uniforms.viewport.y * 0.5;
  let cx = uniforms.viewport.x * 0.5;
  let cy = uniforms.viewport.y * 0.5;

  let rayDirView = normalize(vec3<f32>(
    (tileCenterPixelX - cx) / focalX,
    -(tileCenterPixelY - cy) / focalY,
    -1.0,
  ));

  // Transform rotation to view space: viewR = viewRotation * R
  let viewRot = mat3x3<f32>(
    uniforms.viewMatrix[0].xyz,
    uniforms.viewMatrix[1].xyz,
    uniforms.viewMatrix[2].xyz,
  );
  let viewR = viewRot * R;

  // Sigma_view^{-1} operates via: viewR * diag(1/S^2) * viewR^T
  let invS2 = vec3<f32>(
    1.0 / max(S2.x, 1e-8),
    1.0 / max(S2.y, 1e-8),
    1.0 / max(S2.z, 1e-8),
  );

  // Project ray into Gaussian local frame: localRay = viewR^T * rayDirView
  let localRay = transpose(viewR) * rayDirView;

  // Compute ray^T * Sigma^{-1} * ray = sum(localRay_i^2 * invS2_i)
  let raySigmaInvRay = localRay.x * localRay.x * invS2.x
                     + localRay.y * localRay.y * invS2.y
                     + localRay.z * localRay.z * invS2.z;

  // Compute ray^T * Sigma^{-1} * diff where diff = mu_view (origin at 0)
  let localDiff = transpose(viewR) * viewMu;
  let raySigmaInvDiff = localRay.x * localDiff.x * invS2.x
                      + localRay.y * localDiff.y * invS2.y
                      + localRay.z * localDiff.z * invS2.z;

  // t_opt = raySigmaInvDiff / raySigmaInvRay
  if (abs(raySigmaInvRay) < 1e-8) {
    return depthCenter;  // Degenerate case, fall back to center depth
  }

  let tOpt = raySigmaInvDiff / raySigmaInvRay;

  // Clamp t_opt to be near the center depth (prevent wild values)
  let maxCorrection = max(sx, max(sy, sz)) * 3.0;
  return clamp(tOpt, depthCenter - maxCorrection, depthCenter + maxCorrection);
}

// Convert float to sortable uint32 (same as sort-key-gen)
fn floatToSortableUint(value: f32) -> u32 {
  let bits = bitcast<u32>(value);
  let mask = select(0x80000000u, 0xFFFFFFFFu, (bits & 0x80000000u) != 0u);
  return bits ^ mask;
}

@compute @workgroup_size(256)
fn main(
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let tid = lid.x;
  let tileId = wid.x;

  if (tileId >= stpParams.totalTiles) {
    return;
  }

  // ─── Step 1: Load tile Gaussian data ──────────────────────────────────
  let count = min(tileGaussianCounts[tileId], stpParams.maxGaussiansPerTile);
  let offset = tileGaussianOffsets[tileId];

  // Store count in workgroup-shared for all threads
  if (tid == 0u) {
    tileGaussianCount = count;
  }
  workgroupBarrier();

  let localCount = tileGaussianCount;

  // Compute tile center in pixel coordinates
  let tileX = tileId % stpParams.tileCountX;
  let tileY = tileId / stpParams.tileCountX;
  let tileSize = f32(stpParams.tileSizePixels);
  let tileCenterX = (f32(tileX) + 0.5) * tileSize;
  let tileCenterY = (f32(tileY) + 0.5) * tileSize;

  // ─── Step 2: Compute t_opt and load into shared memory ────────────────
  if (tid < localCount) {
    let gaussianIdx = tileGaussianIndices[offset + tid];
    let tOpt = computeTopt(gaussianIdx, tileCenterX, tileCenterY);

    sortKeysLocal[tid] = floatToSortableUint(tOpt);
    sortValsLocal[tid] = gaussianIdx;
  } else {
    // Pad with maximum key value so they sort to the end
    sortKeysLocal[tid] = 0xFFFFFFFFu;
    sortValsLocal[tid] = 0xFFFFFFFFu;
  }

  workgroupBarrier();

  // ─── Step 3: Bitonic sort within workgroup shared memory ──────────────
  // Bitonic sort for elements padded to next power of 2.
  // For 256 elements max: log2(256) = 8 outer stages.
  //
  // Bitonic sort is well-suited for GPU because:
  //   - Fixed comparison pattern (no data-dependent branches)
  //   - O(n * log^2(n)) parallel comparisons
  //   - All comparisons in each step are independent

  // Round up to next power of 2
  var sortN = 1u;
  loop {
    if (sortN >= localCount) {
      break;
    }
    sortN = sortN << 1u;
  }
  sortN = min(sortN, 256u);

  // Bitonic merge network
  var k = 2u;  // Block size
  loop {
    if (k > sortN) {
      break;
    }

    var j = k >> 1u;  // Comparison stride
    loop {
      if (j == 0u) {
        break;
      }

      workgroupBarrier();

      // Each thread handles one potential comparison
      if (tid < (sortN >> 1u)) {
        // Compute indices for this comparison
        let blockIdx = tid & (j - 1u);
        let halfBlockIdx = tid >> (firstTrailingBit(j));
        let i = halfBlockIdx * (j << 1u) + blockIdx;
        let partner = i ^ j;

        if (partner > i && partner < sortN) {
          // Determine sort direction: ascending in even blocks, descending in odd
          let ascending = ((i & k) == 0u);

          let keyI = sortKeysLocal[i];
          let keyP = sortKeysLocal[partner];

          let shouldSwap = select(keyI < keyP, keyI > keyP, ascending);

          if (shouldSwap) {
            sortKeysLocal[i] = keyP;
            sortKeysLocal[partner] = keyI;

            let valI = sortValsLocal[i];
            sortValsLocal[i] = sortValsLocal[partner];
            sortValsLocal[partner] = valI;
          }
        }
      }

      j = j >> 1u;
    }

    k = k << 1u;
  }

  workgroupBarrier();

  // ─── Step 4: Write re-sorted indices back to global memory ────────────
  if (tid < localCount) {
    tileGaussianIndices[offset + tid] = sortValsLocal[tid];
  }
}
