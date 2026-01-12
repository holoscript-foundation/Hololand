export interface AvatarConfig {
  id?: string;
  userId: string;
  displayName: string;
  position?: { x: number; y: number; z: number };
  metadata?: Record<string, any>;
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface SocialEvent {
  type: string;
  timestamp: number;
  data?: any;
}
