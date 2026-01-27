/**
 * AudioManager for React Three Fiber adapter
 *
 * Provides spatial audio via Three.js AudioListener.
 * Singleton pattern for consistent audio state across components.
 */
import * as THREE from 'three';

class AudioManager {
  private listener: THREE.AudioListener | null = null;
  private context: AudioContext | null = null;
  private masterVolume = 0.8;

  getListener(): THREE.AudioListener {
    if (!this.listener) {
      this.listener = new THREE.AudioListener();
      this.listener.setMasterVolume(this.masterVolume);
    }
    return this.listener;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.listener) {
      this.listener.setMasterVolume(this.masterVolume);
    }
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  dispose(): void {
    if (this.listener) {
      this.listener.setMasterVolume(0);
      this.listener = null;
    }
    this.context?.close();
    this.context = null;
  }
}

let instance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

export default AudioManager;
