import { Game } from './Game';
import { InputManager } from './InputManager';
import { Telemetry } from './Telemetry';

export interface BotConfig {
  mode: 'default' | 'aggressive' | 'safe';
  bravery: number; // 0-1, higher = more willing to jump proactively or longer
  stuck_timeout: number;
  debug_logs: boolean;
}

export class AutoPilot {
  private game: Game;
  private input: InputManager; // Unused in original, but kept for potential future integration
  private active: boolean = false;
  private timer: number = 0;
  
  // Config
  private config: BotConfig = {
    mode: 'default',
    bravery: 0.5,
    stuck_timeout: 2.0,
    debug_logs: true
  };
  
  // Stuck Detection
  private lastX: number = 0;
  private lastY: number = 0;
  private stuckTimer: number = 0;
  private unstuckTimer: number = 0; // New: Tracks duration of unstuck action
  private lastLevel: number = 1; // Could integrate with game.getLevel() if available

  // Key State Tracking
  private pressedKeys: Set<string> = new Set();

  constructor(game: Game, input: InputManager) {
    this.game = game;
    this.input = input;
  }
  
  setConfig(config: Partial<BotConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.debug_logs) {
      Telemetry.info('Bot Config Updated', this.config);
    }
  }

  startDemo(): void {
    this.active = true;
    this.timer = 0;
    this.stuckTimer = 0;
    this.unstuckTimer = 0;
    this.pressedKeys.clear();
    
    const p = this.game.getPlayer();
    if (p) {
      this.lastX = p.x;
      this.lastY = p.y;
    }
    
    if (this.config.debug_logs) {
      Telemetry.info(`Auto-Pilot Engaged: ${this.config.mode.toUpperCase()} MODE`);
    }
  }

  stopDemo(): void {
    this.active = false;
    this.releaseAllKeys();
    if (this.config.debug_logs) {
      Telemetry.info('Auto-Pilot Disengaged');
    }
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer += dt;

    const p = this.game.getPlayer();
    if (!p) return;

    // Check for level transition (improved: compare to previous position)
    if (p.x < 2 && this.lastX >= 2 && this.timer > 2.0) {
      if (this.config.debug_logs) {
        Telemetry.info('Level Transition Detected - Continuing Run');
      }
      this.timer = 1.1; // Skip start delay
      this.stuckTimer = 0;
      this.unstuckTimer = 0;
      this.lastLevel += 1; // Increment if tracking levels
    }

    // Start delay: 1s
    const shouldMove = this.timer > 1.0;

    if (shouldMove) {
      this.handleMovement(p, dt);
    } else {
      this.releaseKey('ArrowRight');
      this.releaseKey('ArrowUp');
      this.stuckTimer = 0;
      this.unstuckTimer = 0;
    }

    // Update last position for next frame
    this.lastX = p.x;
    this.lastY = p.y;
  }
  
  private battleTimer: number = 0;
  private battleStep: number = 0;
  private boredom: number = 0; // 0-100

  private handleBattle(dt: number): void {
      this.boredom = 0; // Fighting is fun!
      this.battleTimer += dt;
      
      // Simple Aggressive AI: Attack First Available Target
      if (this.battleTimer > 1.5) {
          Telemetry.info(`Auto-Pilot Battle Action: Step ${this.battleStep}`);
          
          if (this.battleStep === 0) {
              this.simulateKey('Enter', true); // Select 'Attack'
              this.battleStep++;
              this.battleTimer = 0;
          } else if (this.battleStep === 1) {
              this.simulateKey('Enter', false); // Release
              this.battleStep++; 
              this.battleTimer = 1.0; // Small delay
          } else if (this.battleStep === 2) {
              this.simulateKey('Enter', true); // Confirm Target
               this.battleStep++;
               this.battleTimer = 0;
          } else if (this.battleStep === 3) {
              this.simulateKey('Enter', false); // Release
              this.battleStep = 0; // Reset loop
              this.battleTimer = -2.0; // Wait longer for next turn
          }
      }
  }
  
  private handleWalking(dt: number): void {
      // Boredom Logic
      this.boredom += dt * 15; // Gets bored in ~7 seconds
      if (this.boredom > 100) {
          this.boredom = 0;
          Telemetry.info('BOREDOM THRESHOLD REACHED - Triggering Chaos');
          this.game.effects.spawnPopup(100, 100, "I'M BORED! 😡", '#ff00ff');
          this.game.startRandomEncounter();
          return;
      }
      
      if (this.checkStuck(dt)) return;

      // Default: Move Right
      this.pressKey('ArrowRight');
      this.releaseKey('ArrowUp');
      
      // Proactive jump in aggressive mode
      if (this.config.mode === 'aggressive' && Math.random() < this.config.bravery * 0.1) {
        this.triggerUnstuck(0.3);
      }
  }
  
  private checkStuck(dt: number): boolean {
    if (this.unstuckTimer > 0) {
      // During unstuck: Hold jump, optionally pause right
      this.pressKey('ArrowUp');
      if (this.config.mode === 'safe') {
        this.releaseKey('ArrowRight');
      } else {
        this.pressKey('ArrowRight');
      }
      this.unstuckTimer -= dt;
      if (this.unstuckTimer <= 0) {
        this.releaseKey('ArrowUp');
        if (this.config.debug_logs) {
          Telemetry.info('Unstuck Action Completed');
        }
      }
      return true;
    }
    
    // Stuck detection
    const p = this.game.getPlayer();
    if (!p) return false;
    
    if (Math.abs(p.x - this.lastX) < 0.1 && Math.abs(p.y - this.lastY) < 0.1) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }

    if (this.stuckTimer > this.config.stuck_timeout) {
      if (this.config.debug_logs) {
        Telemetry.error('STUCK DETECTED', { x: p.x, y: p.y, duration: this.stuckTimer });
      }
      this.triggerUnstuck(0.5 + this.config.bravery * 0.5);
      return true;
    }
    return false;
  }

  private triggerUnstuck(duration: number): void {
    this.unstuckTimer = duration;
    this.stuckTimer = 0;
    if (this.config.debug_logs) {
      Telemetry.info('Triggering Unstuck', { duration });
    }
  }

  private pressKey(key: string): void {
    if (!this.pressedKeys.has(key)) {
      this.simulateKey(key, true);
      this.pressedKeys.add(key);
    }
  }

  private releaseKey(key: string): void {
    if (this.pressedKeys.has(key)) {
      this.simulateKey(key, false);
      this.pressedKeys.delete(key);
    }
  }

  private releaseAllKeys(): void {
    for (const key of [...this.pressedKeys]) {
      this.releaseKey(key);
    }
  }

  private simulateKey(key: string, pressed: boolean) {
    const eventType = pressed ? 'keydown' : 'keyup';
    window.dispatchEvent(new KeyboardEvent(eventType, { code: key }));
  }
}