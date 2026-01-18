/**
 * Battle System
 * 
 * Turn-based combat inspired by Final Fantasy ATB
 */

import type { GameConfig } from './Game';
import type { AssetLoader, SpriteSheet } from './AssetLoader';
import type { UIManager } from '../ui/UIManager';
import type { InputManager } from './InputManager';
import { Party, type PartyMember } from './Party';

export interface EnemyData {
  id: string;
  level: number;
  hp?: number;
  maxHp?: number;
  atk?: number;
  def?: number;
  speed?: number;
}

export type BattleResult = 'ongoing' | 'victory' | 'defeat' | 'flee';

type BattleAction = 'attack' | 'skill' | 'item' | 'swap' | 'capture' | 'run';

interface BattleTurn {
  actor: PartyMember | EnemyData;
  isPlayer: boolean;
  ready: boolean;
  atb: number; // ATB gauge 0-100
}

export class BattleSystem {
  private config: GameConfig;
  private assets: AssetLoader;
  private ui: UIManager;
  
  private active = false;
  private enemies: EnemyData[] = [];
  private party: Party;
  private turns: BattleTurn[] = [];
  
  // UI state
  private menuIndex = 0;
  private targetIndex = 0;
  private selectedAction: BattleAction | null = null;
  
  private creatureSheet: SpriteSheet | null = null;
  
  constructor(config: GameConfig, assets: AssetLoader, ui: UIManager) {
    this.config = config;
    this.assets = assets;
    this.ui = ui;
    
    // Initialize party with starter creatures
    this.party = new Party();
    this.party.addMember({
      id: 'starter',
      name: 'Sparkle',
      class: 'dps',
      level: 5,
      hp: 50,
      maxHp: 50,
      mp: 20,
      maxMp: 20,
      atk: 12,
      def: 8,
      speed: 10,
      skills: ['tackle', 'spark'],
    });
    
    this.creatureSheet = assets.getSpriteSheet('creatures') || null;
  }
  
  startBattle(enemies: EnemyData[]): void {
    this.active = true;
    this.enemies = enemies.map(e => ({
      ...e,
      maxHp: e.maxHp ?? 20 + e.level * 5,
      hp: e.hp ?? 20 + e.level * 5,
      atk: e.atk ?? 5 + e.level * 2,
      def: e.def ?? 3 + e.level,
      speed: e.speed ?? 5 + Math.floor(Math.random() * 5),
    }));
    
    // Reset turns
    this.turns = [];
    
    // Add player party members
    this.party.getActiveMembers().forEach(member => {
      this.turns.push({
        actor: member,
        isPlayer: true,
        ready: false,
        atb: Math.random() * 50,
      });
    });
    
    // Add enemies
    this.enemies.forEach(enemy => {
      this.turns.push({
        actor: enemy,
        isPlayer: false,
        ready: false,
        atb: Math.random() * 50,
      });
    });
    
    this.menuIndex = 0;
    this.selectedAction = null;
  }
  
  update(input: InputManager): BattleResult {
    if (!this.active) return 'ongoing';
    
    // Update ATB for all participants
    this.updateATB();
    
    // Check victory/defeat
    if (this.enemies.every(e => (e.hp ?? 0) <= 0)) {
      this.active = false;
      return 'victory';
    }
    
    const playerParty = this.party.getActiveMembers();
    if (playerParty.every(m => m.hp <= 0)) {
      this.active = false;
      return 'defeat';
    }
    
    // Handle ready turns
    const readyTurn = this.turns.find(t => t.ready);
    
    if (readyTurn) {
      if (readyTurn.isPlayer) {
        // Player turn - handle menu input
        return this.handlePlayerTurn(input, readyTurn);
      } else {
        // Enemy turn - AI action
        this.handleEnemyTurn(readyTurn);
      }
    }
    
    return 'ongoing';
  }
  
  private updateATB(): void {
    for (const turn of this.turns) {
      if (turn.ready) continue;
      
      const actor = turn.actor as PartyMember | EnemyData;
      const speed = actor.speed ?? 10;
      
      turn.atb += speed * 0.1;
      
      if (turn.atb >= 100) {
        turn.atb = 100;
        turn.ready = true;
      }
    }
  }
  
  private handlePlayerTurn(input: InputManager, turn: BattleTurn): BattleResult {
    const menuOptions: BattleAction[] = ['attack', 'skill', 'item', 'capture', 'run'];
    
    if (this.selectedAction === null) {
      // Menu navigation
      if (input.isActionPressed('up')) {
        this.menuIndex = (this.menuIndex - 1 + menuOptions.length) % menuOptions.length;
      }
      if (input.isActionPressed('down')) {
        this.menuIndex = (this.menuIndex + 1) % menuOptions.length;
      }
      if (input.isActionPressed('confirm')) {
        this.selectedAction = menuOptions[this.menuIndex];
        this.targetIndex = 0;
      }
    } else if (this.selectedAction === 'run') {
      // Attempt to flee (50% chance)
      if (Math.random() < 0.5) {
        this.active = false;
        return 'flee';
      } else {
        this.ui.showMessage("Can't escape!");
        turn.atb = 0;
        turn.ready = false;
        this.selectedAction = null;
      }
    } else if (this.selectedAction === 'attack') {
      // Target selection
      if (input.isActionPressed('left')) {
        this.targetIndex = Math.max(0, this.targetIndex - 1);
      }
      if (input.isActionPressed('right')) {
        this.targetIndex = Math.min(this.enemies.length - 1, this.targetIndex + 1);
      }
      if (input.isActionPressed('confirm')) {
        this.executeAttack(turn.actor as PartyMember, this.enemies[this.targetIndex]);
        turn.atb = 0;
        turn.ready = false;
        this.selectedAction = null;
      }
      if (input.isActionPressed('cancel')) {
        this.selectedAction = null;
      }
    } else if (this.selectedAction === 'capture') {
      // Attempt capture
      const target = this.enemies[this.targetIndex];
      const hpPercent = (target.hp ?? 0) / (target.maxHp ?? 1);
      const captureChance = (1 - hpPercent) * 0.5; // Max 50% at 0 HP
      
      if (Math.random() < captureChance) {
        this.ui.showMessage(`Captured ${target.id}!`);
        // Remove from battle
        this.enemies.splice(this.targetIndex, 1);
        this.turns = this.turns.filter(t => t.actor !== target);
      } else {
        this.ui.showMessage("Capture failed!");
      }
      
      turn.atb = 0;
      turn.ready = false;
      this.selectedAction = null;
    } else {
      // Other actions - return to menu for now
      if (input.isActionPressed('cancel')) {
        this.selectedAction = null;
      }
    }
    
    return 'ongoing';
  }
  
  private executeAttack(attacker: PartyMember, target: EnemyData): void {
    const damage = Math.max(1, attacker.atk - (target.def ?? 0));
    target.hp = Math.max(0, (target.hp ?? 0) - damage);
    
    this.ui.showMessage(`${attacker.name} attacks for ${damage} damage!`);
  }
  
  private handleEnemyTurn(turn: BattleTurn): void {
    const enemy = turn.actor as EnemyData;
    const party = this.party.getActiveMembers().filter(m => m.hp > 0);
    
    if (party.length === 0) return;
    
    // Random target
    const target = party[Math.floor(Math.random() * party.length)];
    const damage = Math.max(1, (enemy.atk ?? 5) - target.def);
    target.hp = Math.max(0, target.hp - damage);
    
    this.ui.showMessage(`${enemy.id} attacks for ${damage} damage!`);
    
    turn.atb = 0;
    turn.ready = false;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    
    const { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } = this.config;
    
    // Battle background
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    
    // Draw ground line
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, VIEWPORT_HEIGHT / 2, VIEWPORT_WIDTH, VIEWPORT_HEIGHT / 2);
    
    // Draw enemies
    this.renderEnemies(ctx);
    
    // Draw party
    this.renderParty(ctx);
    
    // Draw ATB gauges
    this.renderATB(ctx);
    
    // Draw battle menu
    this.renderMenu(ctx);
  }
  
  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    const startX = 60;
    const spacing = 80;
    
    this.enemies.forEach((enemy, i) => {
      const x = startX + i * spacing;
      const y = 60;
      
      // Draw creature sprite or placeholder
      if (this.creatureSheet) {
        const creatureIndex = ['slime', 'goblin', 'bat', 'mushroom'].indexOf(enemy.id);
        const srcX = (creatureIndex % 4) * 64;
        const srcY = Math.floor(creatureIndex / 4) * 64;
        
        ctx.drawImage(
          this.creatureSheet.image,
          srcX, srcY, 64, 64,
          x - 32, y - 32, 64, 64
        );
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 24, y - 24, 48, 48);
      }
      
      // HP bar
      const hpPercent = (enemy.hp ?? 0) / (enemy.maxHp ?? 1);
      ctx.fillStyle = '#374151';
      ctx.fillRect(x - 24, y + 36, 48, 6);
      ctx.fillStyle = hpPercent > 0.3 ? '#22c55e' : '#ef4444';
      ctx.fillRect(x - 24, y + 36, 48 * hpPercent, 6);
      
      // Target indicator
      if (this.selectedAction === 'attack' && i === this.targetIndex) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(x, y - 44);
        ctx.lineTo(x - 8, y - 56);
        ctx.lineTo(x + 8, y - 56);
        ctx.fill();
      }
    });
  }
  
  private renderParty(ctx: CanvasRenderingContext2D): void {
    const party = this.party.getActiveMembers();
    const startX = this.config.VIEWPORT_WIDTH - 80;
    const startY = this.config.VIEWPORT_HEIGHT - 80;
    
    party.forEach((member, i) => {
      const x = startX - i * 30;
      const y = startY + i * 10;
      
      // Draw member sprite (simplified)
      ctx.fillStyle = member.hp > 0 ? '#3b82f6' : '#6b7280';
      ctx.fillRect(x - 12, y - 24, 24, 32);
      
      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(x - 8, y - 32, 16, 12);
    });
  }
  
  private renderATB(ctx: CanvasRenderingContext2D): void {
    const party = this.party.getActiveMembers();
    const startY = 160;
    
    party.forEach((member, i) => {
      const turn = this.turns.find(t => t.actor === member);
      if (!turn) return;
      
      const y = startY + i * 20;
      
      // Name
      ctx.fillStyle = '#fff';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(member.name.substring(0, 6), 10, y);
      
      // HP
      ctx.fillText(`${member.hp}/${member.maxHp}`, 80, y);
      
      // ATB bar
      ctx.fillStyle = '#374151';
      ctx.fillRect(140, y - 8, 60, 8);
      ctx.fillStyle = turn.ready ? '#fbbf24' : '#3b82f6';
      ctx.fillRect(140, y - 8, 60 * (turn.atb / 100), 8);
    });
  }
  
  private renderMenu(ctx: CanvasRenderingContext2D): void {
    const menuX = 10;
    const menuY = this.config.VIEWPORT_HEIGHT - 60;
    const menuWidth = 100;
    const menuHeight = 50;
    
    // Menu background
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
    ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
    
    const options = ['ATTACK', 'SKILL', 'ITEM', 'CAPTURE', 'RUN'];
    
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'left';
    
    options.forEach((opt, i) => {
      ctx.fillStyle = i === this.menuIndex ? '#fbbf24' : '#fff';
      ctx.fillText(opt, menuX + 8, menuY + 10 + i * 8);
    });
    
    // Cursor
    if (this.selectedAction === null) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('▶', menuX + 2, menuY + 10 + this.menuIndex * 8);
    }
  }
  
  getParty(): Party {
    return this.party;
  }
}
