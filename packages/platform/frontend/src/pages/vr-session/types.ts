/** VR Session Monitor Types */
export interface UserSessionData { userId: string; name: string; gaussianBudget: number; gaussianUsed: number; foveationData: number[][]; frameTimeMs: number; cpuMs: number; gpuMs: number; headsetType: string; }
export interface VRSessionState { users: UserSessionData[]; sessionId: string; startedAt: number; targetFps: number; }
