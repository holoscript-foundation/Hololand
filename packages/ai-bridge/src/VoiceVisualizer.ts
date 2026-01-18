/**
 * @hololand/ai-bridge - VoiceVisualizer
 * Renders real-time audio visualization for voice command feedback.
 */

import { logger } from './logger';

export interface VisualizerOptions {
  color?: string;
  lineWidth?: number;
  mode?: 'waveform' | 'frequency';
}

export class VoiceVisualizer {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private audioContext: AudioContext | null = null;

  constructor(private ctx: CanvasRenderingContext2D, private options: VisualizerOptions = {}) {
    this.options.color = options.color || '#00E676';
    this.options.lineWidth = options.lineWidth || 2;
    this.options.mode = options.mode || 'waveform';
  }

  /**
   * Start analyzing and drawing audio from a stream
   */
  public async start(stream: MediaStream): Promise<void> {
    if (this.animationId) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.draw();
      logger.debug('[VoiceVisualizer] Started visualization');
    } catch (error) {
      logger.error('[VoiceVisualizer] Failed to start', { error });
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return;
    
    this.animationId = requestAnimationFrame(this.draw);
    
    if (this.options.mode === 'waveform') {
      this.analyser.getByteTimeDomainData(this.dataArray);
      this.renderWaveform();
    } else {
      this.analyser.getByteFrequencyData(this.dataArray);
      this.renderFrequency();
    }
  };

  private renderWaveform(): void {
    const { width, height } = this.ctx.canvas;
    const bufferLength = this.dataArray!.length;
    
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.lineWidth = this.options.lineWidth!;
    this.ctx.strokeStyle = this.options.color!;
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = this.dataArray![i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
  }

  private renderFrequency(): void {
    const { width, height } = this.ctx.canvas;
    const bufferLength = this.dataArray!.length;
    
    this.ctx.clearRect(0, 0, width, height);
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (this.dataArray![i] / 255.0) * height;
      this.ctx.fillStyle = this.options.color!;
      this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }

  /**
   * Stop visualization
   */
  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    logger.debug('[VoiceVisualizer] Stopped visualization');
  }
}
 Vinc
