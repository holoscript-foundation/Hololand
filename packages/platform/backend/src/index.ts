/**
 * @hololand/backend - Backend Services
 * 
 * API, webhooks, and data services for Hololand
 */

// Services
export { AnalyticsService } from './services/AnalyticsService';
export { CreatorBonusService } from './services/CreatorBonusService';
export { EmailService } from './services/EmailService';
export { SocialService } from './services/SocialService';
export { SubscriptionService, subscriptionService, type Subscription, type SubscriptionTier, type SubscriptionStatus } from './services/SubscriptionService';
export { CreditService, getCreditService, type CreditBalance, type CreditTransaction, type UsageStats } from './services/CreditService';
export { RevenueTrackingService, getRevenueTrackingService, revenueTrackingService, type RevenueSource, type RevenueEvent, type RevenueBySource, type RevenueForecast, type ConversionMetrics } from './services/RevenueTrackingService';
export { RevenueSharingService, getRevenueSharingService, revenueSharingService, type PartnerType, type RevenueShare, type CommissionReport } from './services/RevenueSharingService';

// Config
export { PricingConfig, type PricingTier, type CoinPackage, type PayPerUsePricing } from './config/PricingConfig';

// Middleware
export * from './middleware/api.middleware';

// Infrastructure
export { DatabaseService, getDatabaseService, type DatabasePerformanceMonitor } from './infrastructure/DatabaseService';
export { CircuitBreakerService, getCircuitBreakerService } from './infrastructure/CircuitBreakerService';

// Lobby / Presence
export { PresenceTracker } from './services/PresenceTracker';
export type { PeerPresence, PresenceStatus, PresenceConfig, PresenceEvent, PresenceSnapshot } from './services/PresenceTracker';
export { RoomService } from './services/RoomService';
export type { RoomRecord, RoomPublicInfo, RoomStatus, RoomSearchQuery, RoomSearchResult, RoomServiceConfig, RoomEvent } from './services/RoomService';
export { LobbyServer } from './services/LobbyServer';
export type { LobbySession, LobbySessionSend, LobbyMessage, LobbyResponse, LobbyServerConfig, LobbyEvent, AuthenticateFn } from './services/LobbyServer';
export { MatchmakingService } from './services/MatchmakingService';
export type { GameModeConfig, EnqueueOptions, QueueEntry, MatchTeam, MatchResult, QueueStats, MatchmakingEvent, MatchmakingEventType, MatchmakingServiceConfig } from './services/MatchmakingService';
export { VoiceChannel } from './services/VoiceChannel';
export type { ChannelCreateOptions, VoiceChannelRecord, VoiceChannelInfo, VoiceParticipant, VoiceParticipantInfo, VoiceChannelEvent, VoiceChannelEventType, VoiceChannelConfig } from './services/VoiceChannel';
export { SpatialVoiceMixer } from './services/SpatialVoiceMixer';
export type { SpatialVoiceMixerConfig, VoicePosition, VoiceGain, VoiceOrientation, VoiceZone, RolloffModel } from './services/SpatialVoiceMixer';
export { ServerAntiCheat } from './services/ServerAntiCheat';
export type { ServerAntiCheatConfig, Vec3, ViolationType, PenaltyAction, Violation, Penalty, PlayerRecordInfo, PositionValidation, ActionValidation, StateValidation, AntiCheatEventType, AntiCheatEvent, AntiCheatStats, OwnershipCheckFn } from './services/ServerAntiCheat';

// Lib utilities
export * from './lib/api';
export * from './lib/supabase';
export * from './lib/supabase-replicas';
export * from './utils/errorHandling';
export * from './utils/logger';
