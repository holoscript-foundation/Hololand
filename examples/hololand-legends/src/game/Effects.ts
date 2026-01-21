export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export class EffectsManager {
  // Screen Shake
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  public shakeX: number = 0;
  public shakeY: number = 0;

  // Particles
  private particles: Particle[] = [];

  constructor() {}

  triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  spawnPopup(x: number, y: number, text: string, color: string = '#fff'): void {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 50,
      vy: -50, // Upward float
      text,
      color,
      life: 1.0,
      maxLife: 1.0
    });
  }

  update(dt: number): void {
    // Shake Logic
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
      } else {
        this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      }
    }

    // Particle Logic
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = '10px "Press Start 2P"'; // Assuming font availability
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    
    ctx.restore();
  }
}
