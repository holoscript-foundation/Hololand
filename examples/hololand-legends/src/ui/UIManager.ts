/**
 * UI Manager
 * 
 * Handles game UI rendering and messages
 */

import type { GameConfig } from '../game/Game';

interface Message {
  text: string;
  duration: number;
  elapsed: number;
}

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  
  private messages: Message[] = [];
  private maxMessages = 3;
  
  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.ctx = ctx;
    this.config = config;
  }
  
  update(dt: number): void {
    // Update message timers
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].elapsed += dt;
      if (this.messages[i].elapsed >= this.messages[i].duration) {
        this.messages.splice(i, 1);
      }
    }
  }
  
  render(): void {
    this.renderMessages();
  }
  
  private renderMessages(): void {
    if (this.messages.length === 0) return;
    
    const startY = this.config.VIEWPORT_HEIGHT - 20 - (this.messages.length - 1) * 14;
    
    this.messages.forEach((msg, i) => {
      const y = startY + i * 14;
      const alpha = Math.min(1, (msg.duration - msg.elapsed) / 0.5);
      
      // Message background
      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      this.ctx.fillRect(8, y - 10, this.config.VIEWPORT_WIDTH - 16, 14);
      
      // Message text
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = '8px "Press Start 2P"';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(msg.text, 12, y);
    });
  }
  
  showMessage(text: string, duration: number = 2): void {
    // Limit messages
    while (this.messages.length >= this.maxMessages) {
      this.messages.shift();
    }
    
    this.messages.push({
      text,
      duration,
      elapsed: 0,
    });
  }
  
  // Dialog box for longer text
  renderDialog(text: string): void {
    const boxHeight = 60;
    const boxY = this.config.VIEWPORT_HEIGHT - boxHeight - 10;
    
    // Background
    this.ctx.fillStyle = '#1e293b';
    this.ctx.strokeStyle = '#e94560';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(10, boxY, this.config.VIEWPORT_WIDTH - 20, boxHeight);
    this.ctx.strokeRect(10, boxY, this.config.VIEWPORT_WIDTH - 20, boxHeight);
    
    // Text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '8px "Press Start 2P"';
    this.ctx.textAlign = 'left';
    
    // Word wrap
    const words = text.split(' ');
    const maxWidth = this.config.VIEWPORT_WIDTH - 40;
    let line = '';
    let y = boxY + 18;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line) {
        this.ctx.fillText(line, 18, y);
        line = word;
        y += 14;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      this.ctx.fillText(line, 18, y);
    }
    
    // Continue indicator
    this.ctx.fillText('▼', this.config.VIEWPORT_WIDTH - 24, boxY + boxHeight - 10);
  }
}
