/**
 * Audio System
 * 
 * Client-side audio manager with spatial audio for 3D worlds
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';

interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  spatialEnabled: boolean;
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  spatialEnabled: true,
};

// Pre-defined sounds (URLs would be actual assets)
const SOUNDS = {
  // UI
  click: '/assets/audio/click.mp3',
  hover: '/assets/audio/hover.mp3',
  success: '/assets/audio/success.mp3',
  error: '/assets/audio/error.mp3',
  
  // Portal
  portalEnter: '/assets/audio/portal_enter.mp3',
  portalAmbient: '/assets/audio/portal_ambient.mp3',
  
  // Ambient
  plaza: '/assets/audio/ambient_plaza.mp3',
  forest: '/assets/audio/ambient_forest.mp3',
  casino: '/assets/audio/ambient_casino.mp3',
  
  // Music
  menuMusic: '/assets/audio/music_menu.mp3',
  battleMusic: '/assets/audio/music_battle.mp3',
} as const;

type SoundId = keyof typeof SOUNDS;

/**
 * Audio Manager Class
 */
class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private buffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private config: AudioConfig = { ...DEFAULT_CONFIG };
  
  private listener: THREE.AudioListener | null = null;

  async init(): Promise<void> {
    if (this.context) return;
    
    this.context = new AudioContext();
    
    // Create gain nodes
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    
    // Connect chain
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    
    // Apply initial volumes
    this.setVolume('master', this.config.masterVolume);
    this.setVolume('music', this.config.musicVolume);
    this.setVolume('sfx', this.config.sfxVolume);
    
    // Pre-load common sounds
    await this.preload(['click', 'hover', 'success']);
  }

  async preload(soundIds: SoundId[]): Promise<void> {
    const promises = soundIds.map(id => this.loadSound(id));
    await Promise.allSettled(promises);
  }

  private async loadSound(id: SoundId): Promise<AudioBuffer | null> {
    if (this.buffers.has(id)) {
      return this.buffers.get(id)!;
    }
    
    try {
      const url = SOUNDS[id];
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      
      this.buffers.set(id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`[Audio] Failed to load ${id}:`, error);
      return null;
    }
  }

  async play(id: SoundId, options: { loop?: boolean; volume?: number } = {}): Promise<void> {
    if (!this.context || !this.sfxGain) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    let buffer = this.buffers.get(id);
    if (!buffer) {
      buffer = await this.loadSound(id);
      if (!buffer) return;
    }
    
    // Stop existing instance if any
    this.stop(id);
    
    // Create source
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;
    
    // Create volume node
    const gainNode = this.context.createGain();
    gainNode.gain.value = options.volume ?? 1;
    
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    source.start();
    this.activeSources.set(id, source);
    
    // Cleanup when done
    if (!options.loop) {
      source.onended = () => {
        this.activeSources.delete(id);
      };
    }
  }

  stop(id?: SoundId): void {
    if (id) {
      const source = this.activeSources.get(id);
      if (source) {
        source.stop();
        this.activeSources.delete(id);
      }
    } else {
      // Stop all
      this.activeSources.forEach(source => source.stop());
      this.activeSources.clear();
    }
  }

  setVolume(type: 'master' | 'music' | 'sfx', volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    switch (type) {
      case 'master':
        this.config.masterVolume = clampedVolume;
        this.masterGain?.gain.setValueAtTime(clampedVolume, this.context?.currentTime ?? 0);
        break;
      case 'music':
        this.config.musicVolume = clampedVolume;
        this.musicGain?.gain.setValueAtTime(clampedVolume, this.context?.currentTime ?? 0);
        break;
      case 'sfx':
        this.config.sfxVolume = clampedVolume;
        this.sfxGain?.gain.setValueAtTime(clampedVolume, this.context?.currentTime ?? 0);
        break;
    }
  }

  getVolume(type: 'master' | 'music' | 'sfx'): number {
    return this.config[`${type}Volume` as keyof AudioConfig] as number;
  }

  // For Three.js spatial audio
  getListener(): THREE.AudioListener {
    if (!this.listener) {
      this.listener = new THREE.AudioListener();
    }
    return this.listener;
  }

  dispose(): void {
    this.stop();
    this.context?.close();
    this.context = null;
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

/**
 * React Hook for Audio
 */
export function useAudio() {
  const [ready, setReady] = useState(false);
  const managerRef = useRef<AudioManager>(getAudioManager());

  useEffect(() => {
    const init = async () => {
      await managerRef.current.init();
      setReady(true);
    };
    
    // Init on first user interaction
    const handleInteraction = () => {
      init();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const play = useCallback((id: SoundId, options?: { loop?: boolean; volume?: number }) => {
    managerRef.current.play(id, options);
  }, []);

  const stop = useCallback((id?: SoundId) => {
    managerRef.current.stop(id);
  }, []);

  const setVolume = useCallback((type: 'master' | 'music' | 'sfx', volume: number) => {
    managerRef.current.setVolume(type, volume);
  }, []);

  return { ready, play, stop, setVolume };
}

export type { SoundId };
export default AudioManager;
