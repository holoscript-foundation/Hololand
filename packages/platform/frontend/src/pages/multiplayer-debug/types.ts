/** Multiplayer Debug Dashboard Types */

export type BandwidthTier = 'critical' | 'high' | 'medium' | 'low' | 'background';

export interface TierBandwidth { tier: BandwidthTier; bytesPerSecond: number; packetCount: number; maxBudget: number; color: string; }

export interface PriorityCell { zoneId: string; entityId: string; priority: number; accumulated: number; lastUpdate: number; }

export interface SpatialZone { id: string; name: string; position: { x: number; y: number }; radius: number; playerCount: number; entityCount: number; isActive: boolean; }

export interface BrainServerMetric { serverId: string; cpu: number; memory: number; connections: number; tickRate: number; latencyMs: number; status: 'healthy' | 'degraded' | 'down'; }

export interface MultiplayerDebugState {
  bandwidth: TierBandwidth[];
  priorityMap: PriorityCell[];
  zones: SpatialZone[];
  brainServers: BrainServerMetric[];
  totalPlayers: number;
  totalEntities: number;
  serverTime: number;
}
