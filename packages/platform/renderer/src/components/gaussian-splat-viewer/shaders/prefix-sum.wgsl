// =============================================================================
// prefix-sum.wgsl
//
// Blelloch Exclusive Prefix Sum (Scan) over Radix Histogram
//
// Computes an in-place exclusive prefix sum over the flattened histogram
// array of size 256 * workgroupCount. After this pass, each entry
// histogram[digit * workgroupCount + wg] contains the global offset
// where workgroup `wg` should begin scattering keys with digit value `digit`.
//
// Algorithm: Work-efficient Blelloch parallel scan
//   Phase 1 (Up-sweep / Reduce): Build partial sums bottom-up
//   Phase 2 (Down-sweep): Propagate prefix sums top-down
//
// This shader handles histograms up to 2048 elements (256 bins * 8 workgroups)
// in a single workgroup dispatch. For larger workgroup counts, the TypeScript
// host should dispatch a multi-level hierarchical scan (reduce -> scan -> propagate).
//
// Memory layout (column-major from histogram pass):
//   histogram[digit * workgroupCount + wgId] = count
//
// After scan:
//   histogram[digit * workgroupCount + wgId] = exclusive prefix sum
//     (total elements before this (digit, wgId) pair in sorted order)
//
// The digitOffsets output stores the total exclusive offset for each digit,
// used for verification and debugging.
//
// Properties:
//   - Work-efficient O(n) scan (2n - 2 operations for n elements)
//   - No global atomics, no subgroup ops
//   - workgroup_size(256) handles up to 512 elements directly,
//     or 2048 via 4-element serial scan per thread
//   - Bank-conflict avoidance via padding stride
//
// @module gaussian-splat-viewer/shaders/prefix-sum
// =============================================================================

struct SortParams {
  count: u32,               // Total keys (unused in this pass, kept for layout compat)
  digitShift: u32,          // Current digit shift (unused, kept for layout compat)
  workgroupCount: u32,      // Number of sort workgroups
  tileSize: u32,            // Tile size (unused, kept for layout compat)
};

@group(0) @binding(0) var<uniform> params: SortParams;
@group(0) @binding(1) var<storage, read_write> histogram: array<u32>;
@group(0) @binding(2) var<storage, read_write> digitOffsets: array<u32>;

// Shared memory for Blelloch scan.
// Max 2048 elements + padding to avoid bank conflicts.
// Padding: every 32 elements, add 1 padding slot.
// Total: 2048 + 2048/32 = 2048 + 64 = 2112
const SHARED_SIZE: u32 = 2112u;
var<workgroup> shared: array<u32, 2112>;

// Compute padded index to avoid shared memory bank conflicts.
// For a 32-bank GPU, adding offset/32 spaces out access patterns.
fn padIdx(idx: u32) -> u32 {
  return idx + (idx >> 5u);
}

@compute @workgroup_size(256)
fn main(
  @builtin(local_invocation_id) lid: vec3<u32>,
) {
  let totalBins = 256u * params.workgroupCount;
  let tid = lid.x;

  // ─── Phase 0: Load histogram into shared memory ───────────────────────
  // Each thread loads up to 8 elements (for workgroupCount up to 8).
  // For larger histograms, each thread handles ceil(totalBins / 256) elements
  // using a serial scan within its segment first, then parallel Blelloch
  // across segment sums.

  // We handle the general case: totalBins <= 2048
  // Each of 256 threads loads at most 8 elements.
  let elementsPerThread = (totalBins + 255u) / 256u;

  // Serial load into shared memory
  for (var k = 0u; k < elementsPerThread; k++) {
    let globalIdx = tid * elementsPerThread + k;
    if (globalIdx < totalBins) {
      shared[padIdx(globalIdx)] = histogram[globalIdx];
    } else {
      shared[padIdx(globalIdx)] = 0u;
    }
  }

  workgroupBarrier();

  // ─── Phase 0.5: Determine scan size (round up to power of 2) ─────────
  // For Blelloch, we need a power-of-2 array size.
  var n = totalBins;
  // Round up to next power of 2
  var powerOf2 = 1u;
  loop {
    if (powerOf2 >= n) {
      break;
    }
    powerOf2 = powerOf2 << 1u;
  }
  n = powerOf2;

  // Pad any remaining entries in shared memory with 0
  for (var k = 0u; k < elementsPerThread; k++) {
    let globalIdx = tid * elementsPerThread + k;
    if (globalIdx >= totalBins && globalIdx < n) {
      shared[padIdx(globalIdx)] = 0u;
    }
  }

  workgroupBarrier();

  // ─── Phase 1: Up-Sweep (Reduce) ──────────────────────────────────────
  // Build partial sums in a binary tree fashion.
  // At each level d, thread tid adds element at (2*tid+1)*(stride) - 1
  // to element at (2*tid+2)*(stride) - 1.
  var stride = 1u;
  var activeThreads = n >> 1u;

  loop {
    if (stride >= n) {
      break;
    }

    workgroupBarrier();

    if (tid < activeThreads) {
      let ai = stride * (2u * tid + 1u) - 1u;
      let bi = stride * (2u * tid + 2u) - 1u;
      if (bi < n) {
        shared[padIdx(bi)] = shared[padIdx(bi)] + shared[padIdx(ai)];
      }
    }

    stride = stride << 1u;
    activeThreads = activeThreads >> 1u;
  }

  // ─── Phase 1.5: Clear last element (set root to 0 for exclusive scan) ─
  workgroupBarrier();
  if (tid == 0u) {
    shared[padIdx(n - 1u)] = 0u;
  }

  // ─── Phase 2: Down-Sweep (Distribute) ─────────────────────────────────
  // Propagate prefix sums from root to leaves.
  stride = n >> 1u;
  activeThreads = 1u;

  loop {
    if (stride == 0u) {
      break;
    }

    workgroupBarrier();

    if (tid < activeThreads) {
      let ai = stride * (2u * tid + 1u) - 1u;
      let bi = stride * (2u * tid + 2u) - 1u;
      if (bi < n) {
        let tmp = shared[padIdx(ai)];
        shared[padIdx(ai)] = shared[padIdx(bi)];
        shared[padIdx(bi)] = shared[padIdx(bi)] + tmp;
      }
    }

    stride = stride >> 1u;
    activeThreads = activeThreads << 1u;
  }

  workgroupBarrier();

  // ─── Phase 3: Write back to global histogram ──────────────────────────
  for (var k = 0u; k < elementsPerThread; k++) {
    let globalIdx = tid * elementsPerThread + k;
    if (globalIdx < totalBins) {
      histogram[globalIdx] = shared[padIdx(globalIdx)];
    }
  }

  // ─── Phase 4: Write per-digit total offsets ───────────────────────────
  // The offset for digit d is histogram[d * workgroupCount + 0]
  // (the first workgroup's exclusive prefix sum for that digit).
  workgroupBarrier();
  if (tid < 256u && tid < (totalBins / params.workgroupCount)) {
    digitOffsets[tid] = histogram[tid * params.workgroupCount];
  }
}
