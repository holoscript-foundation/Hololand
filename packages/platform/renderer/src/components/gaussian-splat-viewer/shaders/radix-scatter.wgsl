// =============================================================================
// radix-scatter.wgsl
//
// Radix Sort Scatter Pass with Ping-Pong Buffers
//
// Each workgroup reads its tile of (key, value) pairs from the input buffers,
// computes the scatter destination for each element using:
//   destination = globalOffset + localRank
// where:
//   globalOffset = prefix-summed histogram[digit * workgroupCount + wgId]
//   localRank    = position of this element within this workgroup's digit bucket
//
// The scatter writes to separate output buffers (keysOut, valuesOut),
// implementing the ping-pong pattern. After each digit pass, the host
// swaps input/output buffer references for the next pass.
//
// Algorithm per workgroup:
//   1. Zero local rank counters (256 bins, workgroup-local atomics)
//   2. First pass through tile: count elements per digit (local histogram)
//   3. Barrier; convert counts to local exclusive prefix sums
//   4. Second pass through tile: compute each element's rank and scatter
//
// The two-pass approach within a workgroup ensures deterministic ordering
// of elements within each digit bucket, which is essential for sort stability.
//
// Properties:
//   - No global atomics (only workgroup-local)
//   - No subgroup operations
//   - workgroup_size(256) for cross-platform safety
//   - Stable sort: preserves relative order from previous digit passes
//   - Ping-pong: reads from keysIn/valuesIn, writes to keysOut/valuesOut
//
// @module gaussian-splat-viewer/shaders/radix-scatter
// =============================================================================

struct SortParams {
  count: u32,               // Total number of keys
  digitShift: u32,          // Bit position of current digit (0, 8, 16, 24)
  workgroupCount: u32,      // Total number of workgroups
  tileSize: u32,            // Elements per workgroup tile
};

@group(0) @binding(0) var<uniform> params: SortParams;
@group(0) @binding(1) var<storage, read> keysIn: array<u32>;
@group(0) @binding(2) var<storage, read> valuesIn: array<u32>;
@group(0) @binding(3) var<storage, read> prefixSums: array<u32>;
@group(0) @binding(4) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(5) var<storage, read_write> valuesOut: array<u32>;

// Local histogram used for counting, then converted to prefix sums for ranking.
var<workgroup> localCounts: array<atomic<u32>, 256>;

// Local buffer to store tile elements for the two-pass approach.
// Max tile size per workgroup: 256 * 8 = 2048 elements.
// We store (key, digit) pairs compactly.
const MAX_TILE: u32 = 2048u;
var<workgroup> tileKeys: array<u32, 2048>;
var<workgroup> tileValues: array<u32, 2048>;
var<workgroup> tileDigits: array<u32, 2048>;

// After prefix sum conversion, these hold the exclusive scan of local counts.
// We reuse localCounts for the scan result (non-atomic reads after barrier).
var<workgroup> localPrefixSums: array<u32, 256>;

@compute @workgroup_size(256)
fn main(
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  let tid = lid.x;

  // ─── Step 1: Clear local counters ─────────────────────────────────────
  atomicStore(&localCounts[tid], 0u);
  workgroupBarrier();

  // ─── Step 2: Load tile and count digits ───────────────────────────────
  let tileStart = wid.x * params.tileSize;
  let tileEnd = min(tileStart + params.tileSize, params.count);
  let tileLen = tileEnd - tileStart;

  // Each thread loads elements at stride 256 and caches them in workgroup memory
  var i = tid;
  loop {
    if (i >= tileLen) {
      break;
    }

    let globalIdx = tileStart + i;
    let key = keysIn[globalIdx];
    let value = valuesIn[globalIdx];
    let digit = (key >> params.digitShift) & 0xFFu;

    tileKeys[i] = key;
    tileValues[i] = value;
    tileDigits[i] = digit;

    // Count occurrences of each digit
    atomicAdd(&localCounts[digit], 1u);

    i = i + 256u;
  }

  workgroupBarrier();

  // ─── Step 3: Convert local counts to exclusive prefix sums ────────────
  // Single-thread serial scan over 256 bins.
  // This is fast because 256 iterations is trivial for one thread.
  if (tid == 0u) {
    var runningSum = 0u;
    for (var d = 0u; d < 256u; d++) {
      let count = atomicLoad(&localCounts[d]);
      localPrefixSums[d] = runningSum;
      runningSum = runningSum + count;
    }
  }

  workgroupBarrier();

  // ─── Step 4: Reset local counters for ranking ─────────────────────────
  // We'll use these as per-digit sequential counters in the scatter pass.
  atomicStore(&localCounts[tid], 0u);
  workgroupBarrier();

  // ─── Step 5: Scatter elements to output buffers ───────────────────────
  // Each thread re-processes its elements in the same order as Step 2.
  // The atomicAdd gives each element a unique sequential rank within its
  // digit bucket for this workgroup.
  i = tid;
  loop {
    if (i >= tileLen) {
      break;
    }

    let key = tileKeys[i];
    let value = tileValues[i];
    let digit = tileDigits[i];

    // Get this element's rank within its local digit bucket
    let localRank = atomicAdd(&localCounts[digit], 1u);

    // Compute global destination:
    //   globalOffset = prefix sum from histogram[digit * workgroupCount + wgId]
    //   destination  = globalOffset + localPrefixSums[digit] + localRank
    //
    // Wait, the prefix sum already accounts for all workgroups before this one.
    // localPrefixSums[digit] gives the offset within this workgroup's tile.
    // Actually we don't need localPrefixSums here -- the globalOffset from
    // the histogram is already the scatter base for this (digit, workgroup) pair.
    // localRank gives the sequential position within this workgroup's contribution.

    let globalOffset = prefixSums[digit * params.workgroupCount + wid.x];
    let destIdx = globalOffset + localRank;

    // Bounds check before writing (safety for edge tiles)
    if (destIdx < params.count) {
      keysOut[destIdx] = key;
      valuesOut[destIdx] = value;
    }

    i = i + 256u;
  }
}
