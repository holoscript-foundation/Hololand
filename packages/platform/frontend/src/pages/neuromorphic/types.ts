/** Neuromorphic Hardware Monitoring Types */
export type ChipType = 'akida' | 'loihi';
export interface NeuromorphicDevice { id: string; chip: ChipType; name: string; powerMilliwatts: number; maxPowerMilliwatts: number; spikeRate: number; maxSpikeRate: number; sparsity: number; coreUtilization: number; temperature: number; status: 'active' | 'idle' | 'error'; }
