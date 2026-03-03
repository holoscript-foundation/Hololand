/**
 * Voice Hooks & Shared Types
 *
 * React hooks that bridge the frontend voice UI to the
 * @hololand/network WebRTCVoiceTransport and VoiceChannelManager APIs.
 * Provides reactive state for channels, participants, audio levels,
 * input devices, and voice settings.
 *
 * @module voice/useVoice
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { WebRTCVoiceTransport } from '@hololand/network/voice/WebRTCVoiceTransport';
import type { VoiceChannelManager } from '@hololand/network/voice/VoiceChannelManager';
import type {
  VoiceChannel,
  ChannelParticipant,
  InputMode,
} from '@hololand/network/voice/types';

// ============================================================================
// Shared Types for Voice UI Components
// ============================================================================

/** Voice notification event payload. */
export interface VoiceNotificationEvent {
  id: string;
  type: 'join' | 'leave' | 'muted-by-mod' | 'info' | 'error';
  message: string;
  timestamp: number;
}

/** Audio device descriptor. */
export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

/** Voice settings state. */
export interface VoiceSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  vadSensitivity: number;
  pushToTalkKey: string;
  masterVolume: number;
}

/** Participant with real-time audio level for UI rendering. */
export interface VoiceParticipantUI extends ChannelParticipant {
  audioLevel: number;
  avatarUrl?: string;
}

/** Spatial voice indicator data for 3D overlay. */
export interface SpatialSpeaker {
  participantId: string;
  displayName: string;
  position: { x: number; y: number; z: number };
  isSpeaking: boolean;
  distance: number;
  direction: number; // angle in radians from listener forward
}

// ============================================================================
// useVoiceChannels — channel listing and CRUD
// ============================================================================

export function useVoiceChannels(manager: VoiceChannelManager | null) {
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Sync channel list from manager
  const refreshChannels = useCallback(() => {
    if (!manager) return;
    setChannels(manager.listChannels());
    setCurrentChannelId(manager.getCurrentChannelId());
  }, [manager]);

  useEffect(() => {
    if (!manager) return;

    refreshChannels();

    const unsubs = [
      manager.on('channelCreated', () => refreshChannels()),
      manager.on('channelDeleted', () => refreshChannels()),
      manager.on('participantJoined', () => refreshChannels()),
      manager.on('participantLeft', () => refreshChannels()),
    ];

    return () => { unsubs.forEach((u) => u()); };
  }, [manager, refreshChannels]);

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!manager) return false;
      setIsJoining(true);
      try {
        const ok = await manager.joinChannel(channelId);
        refreshChannels();
        return ok;
      } finally {
        setIsJoining(false);
      }
    },
    [manager, refreshChannels],
  );

  const leaveChannel = useCallback(
    async (channelId: string) => {
      if (!manager) return;
      await manager.leaveChannel(channelId);
      refreshChannels();
    },
    [manager, refreshChannels],
  );

  const createChannel = useCallback(
    (name: string, capacity?: number) => {
      if (!manager) return null;
      const ch = manager.createChannel(name, { capacity });
      refreshChannels();
      return ch;
    },
    [manager, refreshChannels],
  );

  return {
    channels,
    currentChannelId,
    isJoining,
    joinChannel,
    leaveChannel,
    createChannel,
    refreshChannels,
  };
}

// ============================================================================
// useVoiceParticipants — per-channel participant list with audio levels
// ============================================================================

export function useVoiceParticipants(
  manager: VoiceChannelManager | null,
  transport: WebRTCVoiceTransport | null,
  channelId: string | null,
) {
  const [participants, setParticipants] = useState<VoiceParticipantUI[]>([]);
  const audioLevels = useRef<Map<string, number>>(new Map());

  // Refresh participant list
  const refreshParticipants = useCallback(() => {
    if (!manager || !channelId) {
      setParticipants([]);
      return;
    }
    const list = manager.getChannelParticipants(channelId);
    setParticipants(
      list.map((p) => ({
        ...p,
        audioLevel: audioLevels.current.get(p.participantId) ?? 0,
      })),
    );
  }, [manager, channelId]);

  useEffect(() => {
    if (!manager) return;
    refreshParticipants();

    const unsubs = [
      manager.on('participantJoined', () => refreshParticipants()),
      manager.on('participantLeft', () => refreshParticipants()),
      manager.on('voiceActivity', () => refreshParticipants()),
      manager.on('participantMuted', () => refreshParticipants()),
      manager.on('participantUnmuted', () => refreshParticipants()),
    ];

    return () => { unsubs.forEach((u) => u()); };
  }, [manager, refreshParticipants]);

  // Track audio levels from transport
  useEffect(() => {
    if (!transport) return;

    const unsub = transport.on('audioLevelChanged', (event) => {
      audioLevels.current.set(event.participantId, event.level);
      // Batch update participants on level changes
      refreshParticipants();
    });

    return unsub;
  }, [transport, refreshParticipants]);

  return participants;
}

// ============================================================================
// useVoiceControls — mic, deafen, input mode, volume
// ============================================================================

export function useVoiceControls(
  transport: WebRTCVoiceTransport | null,
  manager: VoiceChannelManager | null,
) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [inputMode, setInputModeState] = useState<InputMode>('vad');
  const [masterVolume, setMasterVolumeState] = useState(1.0);

  // Sync initial state
  useEffect(() => {
    if (transport) {
      setIsMuted(!transport.getMicEnabled());
      setIsDeafened(transport.isDeafened());
    }
    if (manager) {
      setInputModeState(manager.getInputMode());
    }
  }, [transport, manager]);

  const toggleMute = useCallback(() => {
    if (!transport) return;
    const newMuted = !isMuted;
    transport.setMicEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [transport, isMuted]);

  const toggleDeafen = useCallback(() => {
    if (!transport) return;
    const newDeafened = !isDeafened;
    transport.setDeafened(newDeafened);
    setIsDeafened(newDeafened);
    // Deafening also mutes
    if (newDeafened) {
      setIsMuted(true);
    }
  }, [transport, isDeafened]);

  const setInputMode = useCallback(
    (mode: InputMode) => {
      if (!manager) return;
      manager.setInputMode(mode);
      setInputModeState(mode);
    },
    [manager],
  );

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeState(Math.max(0, Math.min(2, volume)));
  }, []);

  return {
    isMuted,
    isDeafened,
    inputMode,
    masterVolume,
    toggleMute,
    toggleDeafen,
    setInputMode,
    setMasterVolume,
  };
}

// ============================================================================
// useAudioDevices — enumerate input/output devices
// ============================================================================

export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState<AudioDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs: AudioDeviceInfo[] = [];
      const outputs: AudioDeviceInfo[] = [];

      for (const device of devices) {
        if (device.kind === 'audioinput') {
          inputs.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${inputs.length + 1}`,
            kind: 'audioinput',
          });
        } else if (device.kind === 'audiooutput') {
          outputs.push({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${outputs.length + 1}`,
            kind: 'audiooutput',
          });
        }
      }

      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Set defaults if not already selected
      if (!selectedInput && inputs.length > 0) {
        setSelectedInput(inputs[0].deviceId);
      }
      if (!selectedOutput && outputs.length > 0) {
        setSelectedOutput(outputs[0].deviceId);
      }
    } catch (err) {
      console.error('[useAudioDevices] Failed to enumerate devices:', err);
    }
  }, [selectedInput, selectedOutput]);

  useEffect(() => {
    enumerateDevices();

    // Re-enumerate when devices change (plug/unplug)
    const handler = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handler);
    };
  }, [enumerateDevices]);

  return {
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    setSelectedInput,
    setSelectedOutput,
    enumerateDevices,
  };
}

// ============================================================================
// useVoiceNotifications — toast notification queue
// ============================================================================

export function useVoiceNotifications(
  manager: VoiceChannelManager | null,
  autoDismissMs: number = 3000,
) {
  const [notifications, setNotifications] = useState<VoiceNotificationEvent[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addNotification = useCallback(
    (type: VoiceNotificationEvent['type'], message: string) => {
      const id = `vn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const notification: VoiceNotificationEvent = {
        id,
        type,
        message,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        timerRefs.current.delete(id);
      }, autoDismissMs);

      timerRefs.current.set(id, timer);
    },
    [autoDismissMs],
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
  }, []);

  // Listen to manager events for auto-notifications
  useEffect(() => {
    if (!manager) return;

    const unsubs = [
      manager.on('participantJoined', (e) => {
        addNotification('join', `${e.participant.displayName} joined the channel`);
      }),
      manager.on('participantLeft', (e) => {
        addNotification('leave', `User left the channel`);
      }),
      manager.on('participantMuted', (e) => {
        addNotification('muted-by-mod', 'You were muted by a moderator');
      }),
      manager.on('error', (e) => {
        addNotification('error', e.message);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      // Clear all timers on unmount
      for (const timer of timerRefs.current.values()) {
        clearTimeout(timer);
      }
      timerRefs.current.clear();
    };
  }, [manager, addNotification]);

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}
