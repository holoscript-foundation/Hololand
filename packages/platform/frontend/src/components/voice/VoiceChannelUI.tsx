/**
 * VoiceChannelUI Component
 *
 * Main voice channel panel providing:
 *   - Channel list with participant counts and capacity (e.g. "Lobby 3/25")
 *   - Join button per channel, create channel button (name + capacity)
 *   - When joined: participant list with avatar, username, speaking indicator
 *     (green pulsing ring when audio level > threshold), mute/deafen icons
 *   - Controls bar: mic toggle, deafen toggle, disconnect, volume slider,
 *     input mode toggle (VAD vs push-to-talk with key display)
 *
 * Wired to WebRTCVoiceTransport and VoiceChannelManager APIs via hooks.
 *
 * @module voice/VoiceChannelUI
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { WebRTCVoiceTransport } from '@hololand/network/voice/WebRTCVoiceTransport';
import type { VoiceChannelManager } from '@hololand/network/voice/VoiceChannelManager';
import type { InputMode } from '@hololand/network/voice/types';
import {
  useVoiceChannels,
  useVoiceParticipants,
  useVoiceControls,
  type VoiceParticipantUI,
} from './useVoice';

// ============================================================================
// Props
// ============================================================================

export interface VoiceChannelUIProps {
  /** WebRTCVoiceTransport instance for media control. */
  transport: WebRTCVoiceTransport | null;
  /** VoiceChannelManager instance for channel CRUD. */
  manager: VoiceChannelManager | null;
  /** Callback when voice settings button is clicked. */
  onOpenSettings?: () => void;
  /** Optional CSS class name for the root container. */
  className?: string;
}

// ============================================================================
// Subcomponents
// ============================================================================

/** Speaking indicator: green pulsing ring around avatar. */
function SpeakingRing({ isSpeaking, audioLevel }: { isSpeaking: boolean; audioLevel: number }) {
  if (!isSpeaking) return null;

  return (
    <span
      className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse"
      style={{
        boxShadow: `0 0 ${4 + audioLevel * 12}px rgba(74, 222, 128, ${0.4 + audioLevel * 0.6})`,
      }}
      aria-hidden="true"
    />
  );
}

/** Participant row in the joined-channel view. */
function ParticipantRow({ participant }: { participant: VoiceParticipantUI }) {
  const initials = participant.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <li className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
      {/* Avatar with speaking ring */}
      <div className="relative w-8 h-8 flex-shrink-0">
        {participant.avatarUrl ? (
          <img
            src={participant.avatarUrl}
            alt={participant.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        )}
        <SpeakingRing
          isSpeaking={participant.isSpeaking}
          audioLevel={participant.audioLevel}
        />
      </div>

      {/* Username */}
      <span
        className={`flex-1 text-sm truncate ${
          participant.isSpeaking ? 'text-green-300 font-medium' : 'text-neutral-200'
        }`}
      >
        {participant.displayName}
      </span>

      {/* Status icons */}
      <div className="flex items-center gap-1.5">
        {participant.isMuted && (
          <span className="text-red-400" title="Muted" aria-label="Muted">
            <MicOffIcon className="w-4 h-4" />
          </span>
        )}
        {participant.isDeafened && (
          <span className="text-red-400" title="Deafened" aria-label="Deafened">
            <HeadphonesOffIcon className="w-4 h-4" />
          </span>
        )}
      </div>
    </li>
  );
}

/** Channel list row. */
function ChannelRow({
  channel,
  participantCount,
  onJoin,
  isJoining,
}: {
  channel: { id: string; name: string; capacity: number; participantIds: string[] };
  participantCount: number;
  onJoin: (id: string) => void;
  isJoining: boolean;
}) {
  return (
    <li className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <VolumeIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <span className="text-sm text-neutral-100 truncate">{channel.name}</span>
        <span className="text-xs text-neutral-500 flex-shrink-0">
          {participantCount}/{channel.capacity}
        </span>
      </div>
      <button
        onClick={() => onJoin(channel.id)}
        disabled={isJoining || participantCount >= channel.capacity}
        className="px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label={`Join ${channel.name}`}
      >
        Join
      </button>
    </li>
  );
}

// ============================================================================
// Create Channel Form
// ============================================================================

function CreateChannelForm({
  onSubmit,
}: {
  onSubmit: (name: string, capacity: number) => void;
}) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(25);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      onSubmit(trimmed, capacity);
      setName('');
      setCapacity(25);
      setIsOpen(false);
    },
    [name, capacity, onSubmit],
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2 text-sm text-neutral-400 hover:text-neutral-200 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg transition-colors"
        aria-label="Create new voice channel"
      >
        + Create Channel
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 rounded-lg bg-neutral-800/80 border border-neutral-700 space-y-3"
    >
      <div>
        <label htmlFor="vc-name" className="block text-xs text-neutral-400 mb-1">
          Channel Name
        </label>
        <input
          id="vc-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lobby"
          maxLength={48}
          autoFocus
          className="w-full px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-600 rounded-md text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="vc-capacity" className="block text-xs text-neutral-400 mb-1">
          Max Capacity
        </label>
        <select
          id="vc-capacity"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="w-full px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {[5, 10, 15, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} participants
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Controls Bar
// ============================================================================

function ControlsBar({
  isMuted,
  isDeafened,
  inputMode,
  masterVolume,
  pushToTalkKey,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
  onSetVolume,
  onToggleInputMode,
  onOpenSettings,
}: {
  isMuted: boolean;
  isDeafened: boolean;
  inputMode: InputMode;
  masterVolume: number;
  pushToTalkKey: string;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
  onSetVolume: (v: number) => void;
  onToggleInputMode: () => void;
  onOpenSettings?: () => void;
}) {
  const pttKeyDisplay = useMemo(() => {
    return pushToTalkKey.replace('Key', '');
  }, [pushToTalkKey]);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-neutral-900/90 border-t border-neutral-800">
      {/* Mic toggle */}
      <button
        onClick={onToggleMute}
        className={`relative p-2 rounded-lg transition-colors ${
          isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? (
          <MicOffIcon className="w-5 h-5" />
        ) : (
          <MicIcon className="w-5 h-5" />
        )}
      </button>

      {/* Deafen toggle */}
      <button
        onClick={onToggleDeafen}
        className={`p-2 rounded-lg transition-colors ${
          isDeafened
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
        title={isDeafened ? 'Undeafen' : 'Deafen'}
        aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
      >
        {isDeafened ? (
          <HeadphonesOffIcon className="w-5 h-5" />
        ) : (
          <HeadphonesIcon className="w-5 h-5" />
        )}
      </button>

      {/* Input mode toggle (VAD / PTT) */}
      <button
        onClick={onToggleInputMode}
        className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-xs font-mono"
        title={
          inputMode === 'vad'
            ? 'Switch to Push-to-Talk'
            : 'Switch to Voice Activity'
        }
        aria-label={`Input mode: ${inputMode === 'vad' ? 'voice activity detection' : 'push to talk'}`}
      >
        {inputMode === 'vad' ? (
          <span className="text-green-400">VAD</span>
        ) : (
          <span className="text-amber-400">{pttKeyDisplay}</span>
        )}
      </button>

      {/* Volume slider */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <VolumeIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <input
          type="range"
          min={0}
          max={200}
          step={1}
          value={Math.round(masterVolume * 100)}
          onChange={(e) => onSetVolume(Number(e.target.value) / 100)}
          className="flex-1 h-1.5 accent-indigo-500 bg-neutral-700 rounded-full cursor-pointer"
          aria-label="Master volume"
        />
      </div>

      {/* Settings gear */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors"
          title="Voice Settings"
          aria-label="Open voice settings"
        >
          <GearIcon className="w-4 h-4" />
        </button>
      )}

      {/* Disconnect */}
      <button
        onClick={onDisconnect}
        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
        title="Disconnect"
        aria-label="Disconnect from voice channel"
      >
        <PhoneOffIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VoiceChannelUI({
  transport,
  manager,
  onOpenSettings,
  className = '',
}: VoiceChannelUIProps) {
  const {
    channels,
    currentChannelId,
    isJoining,
    joinChannel,
    leaveChannel,
    createChannel,
  } = useVoiceChannels(manager);

  const participants = useVoiceParticipants(manager, transport, currentChannelId);

  const {
    isMuted,
    isDeafened,
    inputMode,
    masterVolume,
    toggleMute,
    toggleDeafen,
    setInputMode,
    setMasterVolume,
  } = useVoiceControls(transport, manager);

  const currentChannel = useMemo(
    () => channels.find((c) => c.id === currentChannelId) ?? null,
    [channels, currentChannelId],
  );

  const handleDisconnect = useCallback(() => {
    if (currentChannelId) {
      leaveChannel(currentChannelId);
    }
    transport?.disconnect();
  }, [currentChannelId, leaveChannel, transport]);

  const handleToggleInputMode = useCallback(() => {
    setInputMode(inputMode === 'vad' ? 'push-to-talk' : 'vad');
  }, [inputMode, setInputMode]);

  const handleCreateChannel = useCallback(
    (name: string, capacity: number) => {
      createChannel(name, capacity);
    },
    [createChannel],
  );

  const isConnected = currentChannelId !== null;

  return (
    <div
      className={`flex flex-col bg-neutral-900/95 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${className}`}
      role="region"
      aria-label="Voice Channel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <VolumeIcon className="w-4 h-4 text-indigo-400" />
          Voice Channels
        </h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700">
        {isConnected && currentChannel ? (
          /* ---- JOINED STATE ---- */
          <div className="p-3">
            {/* Channel info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-green-300 truncate">
                  {currentChannel.name}
                </span>
                <span className="text-xs text-neutral-500">
                  {participants.length}/{currentChannel.capacity}
                </span>
              </div>
            </div>

            {/* Participant list */}
            <ul className="space-y-0.5" role="list" aria-label="Voice participants">
              {participants.map((p) => (
                <ParticipantRow key={p.participantId} participant={p} />
              ))}
              {participants.length === 0 && (
                <li className="text-xs text-neutral-500 text-center py-4">
                  No other participants
                </li>
              )}
            </ul>
          </div>
        ) : (
          /* ---- CHANNEL BROWSE STATE ---- */
          <div className="p-3 space-y-2">
            {channels.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">
                No voice channels available
              </p>
            ) : (
              <ul className="space-y-1.5" role="list" aria-label="Available voice channels">
                {channels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    participantCount={ch.participantIds.length}
                    onJoin={joinChannel}
                    isJoining={isJoining}
                  />
                ))}
              </ul>
            )}

            <CreateChannelForm onSubmit={handleCreateChannel} />
          </div>
        )}
      </div>

      {/* Controls bar (only when connected) */}
      {isConnected && (
        <ControlsBar
          isMuted={isMuted}
          isDeafened={isDeafened}
          inputMode={inputMode}
          masterVolume={masterVolume}
          pushToTalkKey="KeyV"
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onDisconnect={handleDisconnect}
          onSetVolume={setMasterVolume}
          onToggleInputMode={handleToggleInputMode}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
}

// ============================================================================
// Inline SVG Icons (Tailwind-friendly, no external dependencies)
// ============================================================================

function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="2" x2="22" y2="22" className="text-red-400" />
    </svg>
  );
}

function HeadphonesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function HeadphonesOffIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function VolumeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function PhoneOffIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}

function GearIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
