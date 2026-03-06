/** VR Performance Overlay Types */
export interface OverlayMetrics { tokPerSecond: number; memoryPressure: number; memoryUsedMB: number; memoryTotalMB: number; thermalLevel: 'nominal' | 'warm' | 'hot' | 'critical'; temperatureC: number; networkStatus: 'connected' | 'degraded' | 'disconnected'; networkLatencyMs: number; networkBandwidthKbps: number; fps: number; }
