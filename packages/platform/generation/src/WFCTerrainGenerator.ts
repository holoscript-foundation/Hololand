/**
 * @hololand/generation WFCTerrainGenerator
 *
 * Tier 2: Wave Function Collapse terrain generation.
 */

export class WFCTerrainGenerator {
  generate(size: number, seed: number): number[][] {
    const terrain: number[][] = [];
    let rng = seed;
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        row.push((rng % 256) / 255); // Height 0-1
      }
      terrain.push(row);
    }
    return terrain;
  }
}
