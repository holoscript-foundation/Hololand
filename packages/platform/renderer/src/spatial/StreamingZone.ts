/**
 * @hololand/renderer StreamingZone
 *
 * Defines streaming zones for progressive asset loading based on viewer proximity.
 */

export interface StreamingZoneConfig { zoneId: string; center: { x: number; y: number; z: number }; radius: number; priority: number; assetIds: string[]; }

export class StreamingZone {
  private zones: Map<string, StreamingZoneConfig> = new Map();
  private loadedAssets: Set<string> = new Set();

  addZone(config: StreamingZoneConfig): void { this.zones.set(config.zoneId, { ...config }); }
  removeZone(zoneId: string): void { this.zones.delete(zoneId); }

  getActiveZones(viewerPos: { x: number; y: number; z: number }): StreamingZoneConfig[] {
    const active: StreamingZoneConfig[] = [];
    for (const zone of this.zones.values()) {
      const dist = Math.sqrt((viewerPos.x - zone.center.x) ** 2 + (viewerPos.y - zone.center.y) ** 2 + (viewerPos.z - zone.center.z) ** 2);
      if (dist <= zone.radius) active.push(zone);
    }
    return active.sort((a, b) => b.priority - a.priority);
  }

  getAssetsToLoad(viewerPos: { x: number; y: number; z: number }): string[] {
    const zones = this.getActiveZones(viewerPos);
    const needed: string[] = [];
    for (const zone of zones) {
      for (const assetId of zone.assetIds) {
        if (!this.loadedAssets.has(assetId)) needed.push(assetId);
      }
    }
    return needed;
  }

  markLoaded(assetId: string): void { this.loadedAssets.add(assetId); }
  getZoneCount(): number { return this.zones.size; }
}
