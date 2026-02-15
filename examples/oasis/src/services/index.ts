// Network service
export {
  initNetwork,
  getNetworkClient,
  joinWorldRoom,
  leaveCurrentRoom,
  getCurrentRoom,
  sendPlayerMove,
  sendChatMessage,
  disconnect,
  getConnectionInfo,
} from './networkService';

// Social service
export {
  initSocialSystems,
  destroySocialSystems,
  getFriendSystem,
  getPartySystem,
  getEmoteSystem,
  getNotificationSystem,
  sendFriendRequest,
  acceptFriendRequest,
  getOnlineFriends,
  createParty,
  inviteToParty,
  playEmote,
  getEmotes,
  setPresence,
  setActivityInWorld,
  getUnreadNotifications,
  markNotificationRead,
} from './socialService';

// Brittney AI service
export {
  translateToHoloScript,
  streamHoloScript,
  validateHoloScript,
  getWorldSuggestions,
  getWorldTemplates,
} from './brittneyService';

// Voice service for Brittney
export {
  getVoiceService,
  destroyVoiceService,
  speak,
  stopSpeaking,
  type VoiceRecognitionResult,
  type VoiceServiceConfig,
} from './voiceService';

// World spawner service (HoloScript → 3D objects)
export {
  parseHoloScript,
  r3fNodeToMesh,
  createPrefabMesh,
  getWorldSpawner,
  WorldSpawner,
  type SpawnedEntity,
  type ParseResult,
  type EntityType,
} from './worldSpawnerService';
