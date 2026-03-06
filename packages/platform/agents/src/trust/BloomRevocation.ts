/**
 * @hololand/agents BloomRevocation
 *
 * Bloom filter for fast trust revocation checking.
 */

export class BloomRevocation {
  private bitArray: Uint8Array;
  private hashCount: number;
  private size: number;

  constructor(size: number = 1024, hashCount: number = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(size);
  }

  revoke(agentId: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const hash = this.hash(agentId, i);
      this.bitArray[hash % this.size] = 1;
    }
  }

  isRevoked(agentId: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const hash = this.hash(agentId, i);
      if (this.bitArray[hash % this.size] === 0) return false;
    }
    return true; // Possibly revoked (may be false positive)
  }

  clear(): void { this.bitArray.fill(0); }

  private hash(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}
