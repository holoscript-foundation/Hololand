/**
 * @hololand/generation RealtimeRenderer
 *
 * Tier 3: Prepares generated terrain for realtime VR rendering.
 */

export class RealtimeRenderer {
  private prepared: boolean = false;

  prepare(terrain: number[][]): boolean {
    if (terrain.length === 0 || terrain[0].length === 0) return false;
    this.prepared = true;
    return true;
  }

  isPrepared(): boolean { return this.prepared; }
  reset(): void { this.prepared = false; }
}
