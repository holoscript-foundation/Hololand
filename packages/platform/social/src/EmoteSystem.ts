/**
 * @hololand/social EmoteSystem
 *
 * Emotes and gestures for non-verbal communication
 */

import { logger } from './logger';
import type {
  Emote,
  Gesture,
  EmoteCategory,
  EmotePerformed,
  Vector3,
  SocialEventMap,
  SocialEventType,
  SocialEventHandler,
} from './types';

// Built-in emotes
const BUILTIN_EMOTES: Emote[] = [
  // Greetings
  { id: 'wave', name: 'Wave', category: 'greeting', animation: 'anim_wave', duration: 2000, icon: '\u{1F44B}', isLooping: false, unlocked: true },
  { id: 'bow', name: 'Bow', category: 'greeting', animation: 'anim_bow', duration: 2500, icon: '\u{1F647}', isLooping: false, unlocked: true },
  { id: 'salute', name: 'Salute', category: 'greeting', animation: 'anim_salute', duration: 1500, icon: '\u{1FAE1}', isLooping: false, unlocked: true },
  { id: 'fistbump', name: 'Fist Bump', category: 'greeting', animation: 'anim_fistbump', duration: 2000, icon: '\u{1F91C}', isLooping: false, unlocked: true },

  // Expressions
  { id: 'happy', name: 'Happy', category: 'expression', animation: 'anim_happy', duration: 3000, icon: '\u{1F604}', isLooping: false, unlocked: true },
  { id: 'sad', name: 'Sad', category: 'expression', animation: 'anim_sad', duration: 3000, icon: '\u{1F622}', isLooping: false, unlocked: true },
  { id: 'laugh', name: 'Laugh', category: 'expression', animation: 'anim_laugh', duration: 3500, icon: '\u{1F602}', isLooping: false, unlocked: true },
  { id: 'shrug', name: 'Shrug', category: 'expression', animation: 'anim_shrug', duration: 2000, icon: '\u{1F937}', isLooping: false, unlocked: true },
  { id: 'think', name: 'Think', category: 'expression', animation: 'anim_think', duration: 2500, icon: '\u{1F914}', isLooping: false, unlocked: true },

  // Dances
  { id: 'dance_basic', name: 'Dance', category: 'dance', animation: 'anim_dance_basic', duration: 5000, icon: '\u{1F57A}', isLooping: true, unlocked: true },
  { id: 'dance_victory', name: 'Victory Dance', category: 'dance', animation: 'anim_dance_victory', duration: 4000, icon: '\u{1F3C6}', isLooping: false, unlocked: true },
  { id: 'dance_robot', name: 'Robot', category: 'dance', animation: 'anim_dance_robot', duration: 6000, icon: '\u{1F916}', isLooping: true, unlocked: false },

  // Actions
  { id: 'clap', name: 'Clap', category: 'action', animation: 'anim_clap', duration: 3000, icon: '\u{1F44F}', isLooping: false, unlocked: true },
  { id: 'point', name: 'Point', category: 'action', animation: 'anim_point', duration: 2000, icon: '\u{1F446}', isLooping: false, unlocked: true },
  { id: 'sit', name: 'Sit', category: 'action', animation: 'anim_sit', duration: 0, icon: '\u{1FA91}', isLooping: true, unlocked: true },
  { id: 'meditate', name: 'Meditate', category: 'action', animation: 'anim_meditate', duration: 0, icon: '\u{1F9D8}', isLooping: true, unlocked: true },

  // Reactions
  { id: 'thumbsup', name: 'Thumbs Up', category: 'reaction', animation: 'anim_thumbsup', duration: 1500, icon: '\u{1F44D}', isLooping: false, unlocked: true },
  { id: 'thumbsdown', name: 'Thumbs Down', category: 'reaction', animation: 'anim_thumbsdown', duration: 1500, icon: '\u{1F44E}', isLooping: false, unlocked: true },
  { id: 'heart', name: 'Heart', category: 'reaction', animation: 'anim_heart', duration: 2000, icon: '\u{2764}', isLooping: false, unlocked: true },
  { id: 'fire', name: 'Fire', category: 'reaction', animation: 'anim_fire', duration: 2500, icon: '\u{1F525}', isLooping: false, unlocked: true },
];

// Built-in gestures
const BUILTIN_GESTURES: Gesture[] = [
  { id: 'nod', name: 'Nod', trigger: 'motion', animation: 'anim_nod', duration: 1000, canInterrupt: true },
  { id: 'shake_head', name: 'Shake Head', trigger: 'motion', animation: 'anim_shake_head', duration: 1000, canInterrupt: true },
  { id: 'look_around', name: 'Look Around', trigger: 'button', animation: 'anim_look_around', duration: 3000, canInterrupt: true },
];

export class EmoteSystem {
  private localUserId: string;
  private localDisplayName: string;
  private emotes: Map<string, Emote> = new Map();
  private gestures: Map<string, Gesture> = new Map();
  private favorites: Set<string> = new Set();
  private currentEmote: Emote | null = null;
  private emoteTimer: ReturnType<typeof setTimeout> | null = null;
  private localPosition: Vector3 = { x: 0, y: 0, z: 0 };

  private eventListeners: Map<
    SocialEventType,
    Set<SocialEventHandler<SocialEventType>>
  > = new Map();

  // Callbacks
  private sendRequest?: (type: string, data: unknown) => void;
  private playAnimation?: (animation: string, duration: number, loop: boolean) => void;
  private playSound?: (sound: string) => void;

  constructor(userId: string, displayName: string) {
    this.localUserId = userId;
    this.localDisplayName = displayName;

    // Load built-in emotes and gestures
    BUILTIN_EMOTES.forEach((e) => this.emotes.set(e.id, { ...e }));
    BUILTIN_GESTURES.forEach((g) => this.gestures.set(g.id, { ...g }));

    logger.info('[EmoteSystem] Initialized', {
      emotes: this.emotes.size,
      gestures: this.gestures.size,
    });
  }

  // ============================================================================
  // Integration
  // ============================================================================

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.sendRequest = callback;
  }

  setAnimationCallback(
    playAnimation: (animation: string, duration: number, loop: boolean) => void
  ): void {
    this.playAnimation = playAnimation;
  }

  setSoundCallback(playSound: (sound: string) => void): void {
    this.playSound = playSound;
  }

  updatePosition(position: Vector3): void {
    this.localPosition = position;
  }

  handleNetworkEvent(type: string, data: unknown): void {
    switch (type) {
      case 'emote_performed':
        this.handleRemoteEmote(data as EmotePerformed);
        break;
      case 'gesture_performed':
        this.handleRemoteGesture(data as { userId: string; gestureId: string });
        break;
    }
  }

  // ============================================================================
  // Emote Playback
  // ============================================================================

  playEmote(emoteId: string): void {
    const emote = this.emotes.get(emoteId);
    if (!emote) {
      throw new Error(`Emote "${emoteId}" not found`);
    }

    if (!emote.unlocked) {
      throw new Error(`Emote "${emoteId}" is locked`);
    }

    // Cancel current emote if playing
    this.stopEmote();

    this.currentEmote = emote;

    // Play animation
    this.playAnimation?.(emote.animation, emote.duration, emote.isLooping);

    // Play sound
    if (emote.sound) {
      this.playSound?.(emote.sound);
    }

    // Send to network
    const performed: EmotePerformed = {
      emoteId: emote.id,
      userId: this.localUserId,
      displayName: this.localDisplayName,
      position: this.localPosition,
      timestamp: Date.now(),
    };
    this.sendRequest?.('emote_performed', performed);

    // Emit local event
    this.emit('emotePerformed', { emote: performed });

    // Set timer to clear emote (unless looping)
    if (!emote.isLooping && emote.duration > 0) {
      this.emoteTimer = setTimeout(() => {
        this.currentEmote = null;
        this.emoteTimer = null;
      }, emote.duration);
    }

    logger.debug('[EmoteSystem] Playing emote', { emoteId });
  }

  stopEmote(): void {
    if (this.emoteTimer) {
      clearTimeout(this.emoteTimer);
      this.emoteTimer = null;
    }

    if (this.currentEmote) {
      // Stop animation
      this.playAnimation?.('anim_idle', 0, true);
      this.currentEmote = null;

      // Notify network
      this.sendRequest?.('emote_stopped', { userId: this.localUserId });
    }
  }

  private handleRemoteEmote(data: EmotePerformed): void {
    // Don't handle our own emotes
    if (data.userId === this.localUserId) return;

    const emote = this.emotes.get(data.emoteId);
    if (!emote) return;

    this.emit('emotePerformed', { emote: data });

    logger.debug('[EmoteSystem] Remote emote received', {
      userId: data.userId,
      emoteId: data.emoteId,
    });
  }

  // ============================================================================
  // Gesture Playback
  // ============================================================================

  playGesture(gestureId: string): void {
    const gesture = this.gestures.get(gestureId);
    if (!gesture) {
      throw new Error(`Gesture "${gestureId}" not found`);
    }

    // Play animation
    this.playAnimation?.(gesture.animation, gesture.duration, false);

    // Send to network
    this.sendRequest?.('gesture_performed', {
      userId: this.localUserId,
      gestureId,
    });

    this.emit('gesturePerformed', {
      userId: this.localUserId,
      gesture,
    });

    logger.debug('[EmoteSystem] Playing gesture', { gestureId });
  }

  private handleRemoteGesture(data: { userId: string; gestureId: string }): void {
    if (data.userId === this.localUserId) return;

    const gesture = this.gestures.get(data.gestureId);
    if (!gesture) return;

    this.emit('gesturePerformed', {
      userId: data.userId,
      gesture,
    });
  }

  // ============================================================================
  // Emote Management
  // ============================================================================

  unlockEmote(emoteId: string): void {
    const emote = this.emotes.get(emoteId);
    if (emote) {
      emote.unlocked = true;
      logger.info('[EmoteSystem] Emote unlocked', { emoteId });
    }
  }

  addCustomEmote(emote: Emote): void {
    this.emotes.set(emote.id, emote);
    logger.info('[EmoteSystem] Custom emote added', { emoteId: emote.id });
  }

  setFavorite(emoteId: string, isFavorite: boolean): void {
    if (isFavorite) {
      this.favorites.add(emoteId);
    } else {
      this.favorites.delete(emoteId);
    }
  }

  isFavorite(emoteId: string): boolean {
    return this.favorites.has(emoteId);
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getEmote(emoteId: string): Emote | undefined {
    return this.emotes.get(emoteId);
  }

  getEmotes(): Emote[] {
    return Array.from(this.emotes.values());
  }

  getUnlockedEmotes(): Emote[] {
    return this.getEmotes().filter((e) => e.unlocked);
  }

  getLockedEmotes(): Emote[] {
    return this.getEmotes().filter((e) => !e.unlocked);
  }

  getEmotesByCategory(category: EmoteCategory): Emote[] {
    return this.getEmotes().filter((e) => e.category === category);
  }

  getFavoriteEmotes(): Emote[] {
    return this.getEmotes().filter((e) => this.favorites.has(e.id));
  }

  getGestures(): Gesture[] {
    return Array.from(this.gestures.values());
  }

  getGesture(gestureId: string): Gesture | undefined {
    return this.gestures.get(gestureId);
  }

  getCurrentEmote(): Emote | null {
    return this.currentEmote;
  }

  isPlayingEmote(): boolean {
    return this.currentEmote !== null;
  }

  // ============================================================================
  // Quick Access
  // ============================================================================

  wave(): void {
    this.playEmote('wave');
  }

  clap(): void {
    this.playEmote('clap');
  }

  thumbsUp(): void {
    this.playEmote('thumbsup');
  }

  dance(): void {
    this.playEmote('dance_basic');
  }

  laugh(): void {
    this.playEmote('laugh');
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends SocialEventType>(
    event: T,
    handler: SocialEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as SocialEventHandler<SocialEventType>);

    return () => this.off(event, handler);
  }

  off<T extends SocialEventType>(event: T, handler: SocialEventHandler<T>): void {
    this.eventListeners.get(event)?.delete(handler as SocialEventHandler<SocialEventType>);
  }

  private emit<T extends SocialEventType>(event: T, data: SocialEventMap[T]): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): {
    unlockedEmotes: string[];
    favorites: string[];
  } {
    return {
      unlockedEmotes: this.getUnlockedEmotes().map((e) => e.id),
      favorites: Array.from(this.favorites),
    };
  }

  loadFromJSON(data: { unlockedEmotes?: string[]; favorites?: string[] }): void {
    if (data.unlockedEmotes) {
      data.unlockedEmotes.forEach((id) => this.unlockEmote(id));
    }
    if (data.favorites) {
      this.favorites = new Set(data.favorites);
    }
  }
}
