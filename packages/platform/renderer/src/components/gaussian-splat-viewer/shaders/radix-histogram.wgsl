// =============================================================================
// radix-histogram.wgsl
//
// Per-Workgroup Radix Histogram with Workgroup-Local Atomics
//
// Computes a local 256-bin histogram for each workgroup's tile of sort keys.
// Each workgroup independently processes a contiguous tile of the key array
// and writes its per-digit histogram to the global histogram buffer.
//
// The global histogram is laid out as:
//   histogram[digit * workgroupCount + workgroupId]
// This column-major layout enables efficient prefix sum computation
// in the subsequent Blelloch scan pass.
//
// Algorithm per workgroup:
//   1. Zero the 256-entry workgroup-local histogram (atomic)
//   2. Each thread loops over its assigned keys in the tile
//   3. Extract the current 8-bit digit via (key >> digitShift) & 0xFF
//   4. atomicAdd to the local histogram bin
//   5. Barrier, then write local histogram to global memory
//
// Key properties:
//   - No global atomics (only workgroup-local atomics)
//   - No subgroup operations for cross-platform compatibility
//   - workgroup_size(256) matches the 256 histogram bins
//   - Each thread clears exactly one bin, ensuring balanced init
//
// @module gaussian-splat-viewer/shaders/radix-histogram
// =============================================================================

struct SortParams {
  count: u32,               // Total number of keys to sort
  digitShift: u32,          // Bit position of current digit (0, 8, 16, 24)
  workgroupCount: u32,      // Total number of workgroups dispatched
  tileSize: u32,            // Elements per workgroup tile
};

@group(0) @binding(0) var<uniform> params: SortParams;
@group(0) @binding(1) var<storage, read> keys: array<u32>;
@group(0) @binding(2) var<storage, read_write> histogram: array<u32>;

// Workgroup-local histogram: 256 bins, one per possible 8-bit digit value.
// Using atomics for thread-safe concurrent accumulation within the workgroup.
var<workgroup> localHist: array<atomic<u32>, 256>;

@compute @workgroup_size(256)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
) {
  // ─── Step 1: Clear local histogram ────────────────────────────────────
  // Each thread clears exactly one bin (256 threads = 256 bins).
  atomicStore(&localHist[lid.x], 0u);
  workgroupBarrier();

  // ─── Step 2: Compute tile boundaries ──────────────────────────────────
  // Each workgroup processes a contiguous tile of keys.
  let tileStart = wid.x * params.tileSize;
  let tileEnd = min(tileStart + params.tileSize, params.count);

  // ─── Step 3: Accumulate digit histogram ───────────────────────────────
  // Each thread processes elements at stride 256 within the tile.
  // This interleaved access pattern improves memory coalescing.
  var i = tileStart + lid.x;
  loop {
    if (i >= tileEnd) {
      break;
    }

    let key = keys[i];
    let digit = (key >> params.digitShift) & 0xFFu;
    atomicAdd(&localHist[digit], 1u);

    i = i + 256u;
  }

  // ─── Step 4: Write local histogram to global memory ───────────────────
  workgroupBarrier();

  // Column-major layout: histogram[digit * workgroupCount + workgroupId]
  // This layout groups all workgroups' counts for the same digit together,
  // which is optimal for the subsequent prefix sum that scans across
  // workgroups within each digit.
  let globalIdx = lid.x * params.workgroupCount + wid.x;
  histogram[globalIdx] = atomicLoad(&localHist[lid.x]);
}
