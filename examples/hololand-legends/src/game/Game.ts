/**
 * Core Game Engine
 * 
 * Handles game loop, rendering, and scene management
 */

import type { AssetLoader } from './AssetLoader';
import type { InputManager } from './InputManager';
import { World } from './World';
import { Player } from './Player';
import { BattleSystem } from './Battle';
import { UIManager } from '../ui/UIManager';

export interface GameConfig {
  TILE_SIZE: number;
  SCALE: number;
  VIEWPORT_WIDTH: number;
  VIEWPORT_HEIGHT: number;
  TARGET_FPS: number;
  DEBUG: boolean;
}

export type GameState = 'loading' | 'title' | 'overworld' | 'battle' | 'menu' | 'dialog';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private assets: AssetLoader;
  private input: InputManager;
  
  private state: GameState = 'title';
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly timestep: number;
  
  // Game systems
  private world: World | null = null;
  private player: Player | null = null;
  private battle: BattleSystem | null = null;
  private ui: UIManager;
  
  constructor(
    canvas: HTMLCanvasElement,
    config: GameConfig,
    assets: AssetLoader,
    input: InputManager
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.assets = assets;
    this.input = input;
    this.timestep = 1000 / config.TARGET_FPS;
    
    // Disable image smoothing for pixel art
    this.ctx.imageSmoothingEnabled = false;
    
    // Initialize UI
    this.ui = new UIManager(this.ctx, config);
  }
  
  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.initGame();
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  stop(): void {
    this.running = false;
  }
  
  private initGame(): void {
    // Create world
    this.world = new World(this.config, this.assets);
    
    // Create player
    this.player = new Player(this.config, this.assets, this.input);
    this.player.setPosition(5, 5); // Starting position
    
    // Create battle system
    this.battle = new BattleSystem(this.config, this.assets, this.ui);
    
    // Start in title screen, then transition to overworld
    this.state = 'title';
    
    // Auto-start after 2 seconds for demo
    setTimeout(() => {
      this.state = 'overworld';
    }, 2000);
  }
  
  private gameLoop(currentTime: number): void {
    if (!this.running) return;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;
    
    // Fixed timestep updates
    while (this.accumulator >= this.timestep) {
      this.update(this.timestep / 1000);
      this.accumulator -= this.timestep;
    }
    
    // Render
    this.render();
    
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  private update(dt: number): void {
    // Update input
    this.input.update();
    
    switch (this.state) {
      case 'title':
        if (this.input.isActionPressed('confirm')) {
          this.state = 'overworld';
        }
        break;
        
      case 'overworld':
        this.updateOverworld(dt);
        break;
        
      case 'battle':
        this.updateBattle(dt);
        break;
        
      case 'menu':
        this.updateMenu(dt);
        break;
    }
    
    // Update UI
    this.ui.update(dt);
  }
  
  private updateOverworld(dt: number): void {
    if (!this.world || !this.player) return;
    
    // Update player
    this.player.update(dt, this.world);
    
    // Check for encounters
    if (this.player.isMoving() && Math.random() < 0.005) {
      this.startRandomEncounter();
    }
    
    // Check for menu
    if (this.input.isActionPressed('menu')) {
      this.state = 'menu';
    }
  }
  
  private updateBattle(_dt: number): void {
    if (!this.battle) return;
    
    const battleResult = this.battle.update(this.input);
    
    if (battleResult === 'victory' || battleResult === 'defeat' || battleResult === 'flee') {
      this.state = 'overworld';
    }
  }
  
  private updateMenu(_dt: number): void {
    if (this.input.isActionPressed('cancel')) {
      this.state = 'overworld';
    }
  }
  
  private startRandomEncounter(): void {
    if (!this.battle) return;
    
    // Random creature encounter
    const creatures = ['slime', 'goblin', 'bat', 'mushroom'];
    const creature = creatures[Math.floor(Math.random() * creatures.length)];
    
    this.battle.startBattle([{ id: creature, level: 1 + Math.floor(Math.random() * 5) }]);
    this.state = 'battle';
  }
  
  private render(): void {
    // Clear
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.config.VIEWPORT_WIDTH, this.config.VIEWPORT_HEIGHT);
    
    switch (this.state) {
      case 'title':
        this.renderTitle();
        break;
        
      case 'overworld':
        this.renderOverworld();
        break;
        
      case 'battle':
        this.renderBattle();
        break;
        
      case 'menu':
        this.renderOverworld(); // Show world behind menu
        this.renderMenu();
        break;
    }
    
    // Always render UI on top
    this.ui.render();
    
    // Debug info
    if (this.config.DEBUG) {
      this.renderDebug();
    }
  }
  
  private renderTitle(): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px "Press Start 2P"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('HOLOLAND', this.config.VIEWPORT_WIDTH / 2, 80);
    this.ctx.fillText('LEGENDS', this.config.VIEWPORT_WIDTH / 2, 110);
    
    this.ctx.font = '8px "Press Start 2P"';
    this.ctx.fillText('Press ENTER to start', this.config.VIEWPORT_WIDTH / 2, 180);
  }
  
  private renderOverworld(): void {
    if (!this.world || !this.player) return;
    
    // Get camera offset centered on player
    const camX = this.player.x * this.config.TILE_SIZE - this.config.VIEWPORT_WIDTH / 2 + this.config.TILE_SIZE / 2;
    const camY = this.player.y * this.config.TILE_SIZE - this.config.VIEWPORT_HEIGHT / 2 + this.config.TILE_SIZE / 2;
    
    // Render world
    this.world.render(this.ctx, camX, camY);
    
    // Render player
    this.player.render(this.ctx, camX, camY);
  }
  
  private renderBattle(): void {
    if (!this.battle) return;
    this.battle.render(this.ctx);
  }
  
  private renderMenu(): void {
    // Darken background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.config.VIEWPORT_WIDTH, this.config.VIEWPORT_HEIGHT);
    
    // Menu box
    this.ctx.fillStyle = '#16213e';
    this.ctx.strokeStyle = '#e94560';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(40, 40, this.config.VIEWPORT_WIDTH - 80, this.config.VIEWPORT_HEIGHT - 80);
    this.ctx.strokeRect(40, 40, this.config.VIEWPORT_WIDTH - 80, this.config.VIEWPORT_HEIGHT - 80);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px "Press Start 2P"';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('PARTY', 60, 70);
    this.ctx.fillText('CREATURES', 60, 90);
    this.ctx.fillText('ITEMS', 60, 110);
    this.ctx.fillText('SAVE', 60, 130);
  }
  
  private renderDebug(): void {
    this.ctx.fillStyle = '#0f0';
    this.ctx.font = '8px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`State: ${this.state}`, 4, 12);
    if (this.player) {
      this.ctx.fillText(`Pos: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}`, 4, 24);
    }
  }
  
  // Public API
  getState(): GameState {
    return this.state;
  }
  
  setState(state: GameState): void {
    this.state = state;
  }
  
  getPlayer(): Player | null {
    return this.player;
  }
}
