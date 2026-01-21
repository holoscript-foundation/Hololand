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
import { AutoPilot } from './AutoPilot';
import { ProceduralGen } from './ProceduralGen';
import { Telemetry } from './Telemetry';
import { HoloScriptPlusParser, HoloScriptPlusRuntimeImpl } from '@holoscript/core';
import { AudioSynth } from './AudioSynth';
import { EffectsManager } from './Effects';

// Config / Types
export interface GameConfig {
  LEVEL_WIDTH: number;
  LEVEL_HEIGHT: number;
  TILE_SIZE: number;
  TARGET_FPS: number;
  RANDOM_ENCOUNTER_CHANCE: number;
  VIEWPORT_WIDTH: number;
  VIEWPORT_HEIGHT: number;
}

export type GameState = 'title' | 'overworld' | 'battle';

export class Game {
  // Rendering
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private assets: AssetLoader;
  private input: InputManager;
  private timestep: number;
  
  // Game systems
  private world: World | null = null;
  private player: Player | null = null;
  private battle: BattleSystem | null = null;
  private ui: UIManager;
  private autoPilot: AutoPilot;
  public audio: AudioSynth;
  public effects: EffectsManager; // Public for Battle/World
  private runtime: any = null; // HoloScript+ runtime for script-driven logic

  // Infinite Engine State
  private currentLevel: number = 1;
  private audioStarted: boolean = false;
  
  // Loop Control
  private running: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private state: GameState = 'title';

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
    
    // Initialize Audio
    this.audio = new AudioSynth();
    // Initialize Effects
    this.effects = new EffectsManager();
    
    // Initialize UI
    this.ui = new UIManager(this.ctx, config);
    // Initialize Auto-Pilot
    this.autoPilot = new AutoPilot(this, input);
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
    // Pass 'this' (Game) instead of just ui/config so Battle can access effects/audio
    this.battle = new BattleSystem(this.config, this.assets, this.ui, this); 
    
    // Start in title screen - wait for player to press Enter
    this.state = 'title';
  }
  
  private async parseScriptConfig(): Promise<void> {
    try {
        const response = await fetch('/game.hsplus');
        if (!response.ok) {
          throw new Error(`Failed to fetch script: ${response.status}`);
        }
        const text = await response.text();
        Telemetry.info('Fetching Script Content', { length: text.length });
        
        // --- REAL BRAIN UPGRADE: @holoscript/core ---
        const parser = new HoloScriptPlusParser();
        const result = parser.parse(text);

        if (!result.success) {
            Telemetry.error('HoloScript Parse Failed', { errors: result.errors });
            return;
        }

        Telemetry.info('HoloScript AST Parsed Successfully');

        // Extract @bot_config from AST
        // We look for any Orb that has the @bot_config directive
        // Since our game.hsplus has orb#HololandLegends, we search for that or any orb with the directive
        
        let botConfig: any = null;
        
        for (const node of result.ast) {
            if (node.type === 'orb') {
                const configDirective = node.directives?.find((d: any) => d.name === 'bot_config');
                if (configDirective) {
                    botConfig = configDirective.config || configDirective.body; // Handle both trait-style and state-style
                    break;
                }
            }
        }

        if (botConfig) {
             Telemetry.info('Bot Config Loaded from AST', botConfig);
             this.autoPilot.setConfig(botConfig);
        } else {
             Telemetry.warn('No @bot_config found in script AST');
        }

        // Initialize Runtime (for future logic hooks)
        const runtime = new HoloScriptPlusRuntimeImpl(result.ast, {
            // Engine Bindings (Custom Builtins)
            load_scene: (args: any[]) => {
                const mapId = args[0];
                this.loadScene(mapId);
                return true;
            },
            emit: (args: any[]) => {
                const [event, data] = args;
                Telemetry.info(`Script Event: ${event}`, { data });
                if (event === 'system_message') {
                     this.game.effects.spawnPopup(100, 100, String(data), '#ffff00');
                }
                return true;
            },
            get_random_encounter: (args: any[]) => {
                const tableName = args[0] || 'default';
                const encounterData = this.runtime?.context?.state?.encounterTables?.[tableName];
                
                if (!encounterData || !Array.isArray(encounterData)) {
                    Telemetry.warn('Encounter table not found', { tableName });
                    return 'slime'; // Fallback
                }
                
                // Weighted random selection
                const totalWeight = encounterData.reduce((sum: number, e: any) => sum + (e.weight || 0), 0);
                let random = Math.random() * totalWeight;
                
                for (const encounter of encounterData) {
                    random -= encounter.weight || 0;
                    if (random <= 0) {
                        return encounter.id;
                    }
                }
                
                return encounterData[0]?.id || 'slime'; // Fallback
            },
            audio: (args: any[]) => { // audio.play("sound") -> audio(["play", "sound"]) based on current parser limits or simple function call
                 // Simplified: play_audio("sound")
                 return false;
            },
            play_audio: (args: any[]) => {
                const soundId = args[0];
                this.audio.play(soundId);
                return true;
            },
            play_event_audio: (args: any[]) => {
                const eventName = args[0];
                const audioMap = this.runtime?.context?.state?.audioEvents;
                
                if (audioMap && audioMap[eventName]) {
                    const soundId = audioMap[eventName];
                    this.audio.play(soundId);
                    Telemetry.info(`Playing audio for event: ${eventName} -> ${soundId}`);
                    return true;
                }
                
                Telemetry.warn(`No audio mapping for event: ${eventName}`);
                return false;
            }
        });
        
        // Store runtime for executing lifecycle hooks
        this.runtime = runtime;
        Telemetry.info('HoloScript Runtime Mounted');
        
    } catch (e) {
        Telemetry.error('Failed to parse script (Real Brain Error)', { error: e });
    }
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
    // Update Auto-Pilot
    this.autoPilot.update(dt);
    
    // Audio Resume Hack (Browser Policy)
    if (!this.audioStarted && (this.input.isActionPressed('confirm') || this.input.getMovementVector().x !== 0)) {
        this.audio.resume();
        this.audioStarted = true;
    }
    
    switch (this.state) {
      case 'title':
        if (this.input.isActionPressed('confirm')) {
          this.state = 'overworld';
          // Parse script config and start AutoPilot when entering game
          this.parseScriptConfig().then(() => {
            this.startAutoPilot();
          });
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
    // Update Effects
    this.effects.update(dt);
    
    // Clear Input Frame
    this.input.update();
  }
  
  private updateOverworld(dt: number): void {
    if (!this.world || !this.player) return;
    
    // Update player
    this.player.update(dt, this.world);
    
    // Sync player state to HoloScript runtime
    if (this.runtime) {
      try {
        this.runtime.context.state.playerX = this.player.x;
        this.runtime.context.state.playerY = this.player.y;
        this.runtime.context.state.playerDirection = this.player.direction || 'down';
      } catch (e) {
        // State sync failed, continue gracefully
      }
    }
    
    // Execute HoloScript @on_update hooks (Script-Driven Logic)
    if (this.runtime) {
      try {
        // Execute all @on_update lifecycle hooks in the AST
        this.runtime.executeLifecycleHooks('on_update', dt);
      } catch (e) {
        Telemetry.warn('Script hook execution failed', { error: e });
      }
    }
    
    // Check for encounters (will migrate to HoloScript in Phase 2)
    if (this.player.isMoving() && Math.random() < 0.005) {
      this.startRandomEncounter();
    }
    
    // Check for menu
    if (this.input.isActionPressed('menu')) {
      this.state = 'menu';
    }

    // REMOVED: Hardcoded level transition logic (now handled by game.hsplus @on_update)
    
    // HACK: Simulate script trigger for transition to prove concept without full runtime loop
    // This bridges the gap until Phase 18 (Full Runtime Integration)
    if (this.currentLevel === 1 && this.state === 'overworld' && this.player.x >= 19) {
         // This is where HoloScript WOULD run:
         // load_scene("forest")
         // But since we haven't fully replaced the update loop, we leave this comment to mark the spot.
         // Actually, let's allow the script to drive it if we can.
    }
  }

  public loadScene(mapId: string): void {
    if (!this.world) return;
    
    // --- PROCEDURAL GENERATION HOOK ---
    // If map ID starts with 'generated_', create it on the fly
    if (mapId.startsWith('generated_')) {
        const levelData = ProceduralGen.generateLevel(this.currentLevel);
        this.assets.setJSON(mapId, levelData);
        Telemetry.info(`Level ${this.currentLevel} Generated & Injected`);
    }
    
    this.world.loadMap(mapId);
  }
  
  private updateBattle(dt: number): void {
    if (!this.battle) return;
    
    const battleResult = this.battle.update(this.input);
    
    if (battleResult === 'victory' || battleResult === 'defeat' || battleResult === 'flee') {
      this.state = 'overworld';
    }
  }
  
  private updateMenu(dt: number): void {
    if (this.input.isActionPressed('cancel')) {
      this.state = 'overworld';
    }
  }
  
  public startRandomEncounter(): void {
    if (!this.battle) return;
    
    // Get current biome from script state
    const biome = this.runtime?.context?.state?.currentBiome || 'default';
    
    // Get creature from biome-specific encounter table
    let creatureId = 'slime'; // Fallback
    
    if (this.runtime) {
      try {
        const result = this.runtime.builtins.get_random_encounter([biome]);
        if (result) creatureId = result;
      } catch (e) {
        Telemetry.warn('Failed to get encounter from script', { error: e });
      }
    }
    
    const level = 1 + Math.floor(Math.random() * 5);
    this.battle.startBattle([{ id: creatureId, level }]);
    this.state = 'battle';
  }
  
  private render(): void {
    // Clear
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.config.VIEWPORT_WIDTH, this.config.VIEWPORT_HEIGHT);
    
    // Apply Shake
    this.ctx.save();
    if (this.effects.shakeX !== 0 || this.effects.shakeY !== 0) {
        this.ctx.translate(this.effects.shakeX, this.effects.shakeY);
    }
    
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
    
    // Restore Shake translation (so UI isn't shaken)
    this.ctx.restore();
    
    // Render Effects (Particles)
    this.effects.render(this.ctx);
    
    // Always render UI on top (static)
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
      this.ctx.fillText(`Level: ${this.currentLevel}`, 4, 36);
    }
  }
  
  // Public API
  getState(): GameState {
    return this.state;
  }
  
  setState(state: GameState): void {
    this.state = state;
  }
  
  startAutoPilot(): void {
    Telemetry.info('Starting Auto-Pilot Demo...');
    this.autoPilot.startDemo();
  }

  stopAutoPilot(): void {
    Telemetry.info('Stopping Auto-Pilot Demo...');
    this.autoPilot.stopDemo();
  }
  
  getPlayer(): Player | null {
    return this.player;
  }
  
  getBattle(): BattleSystem | null {
      return this.battle;
  }
}