/**
 * Player - Player character controller
 * 
 * Handles movement, animation, and world interaction
 */

import type { GameConfig } from './Game';
import type { AssetLoader, SpriteSheet } from './AssetLoader';
import type { InputManager } from './InputManager';
import type { World } from './World';

export type Direction = 'down' | 'left' | 'right' | 'up';

export class Player {
  private config: GameConfig;
  private assets: AssetLoader;
  private input: InputManager;
  
  // Position (in tiles, not pixels)
  x: number = 0;
  y: number = 0;
  
  // Movement
  private targetX: number = 0;
  private targetY: number = 0;
  private moving: boolean = false;
  private moveSpeed: number = 4; // tiles per second
  
  // Animation
  private direction: Direction = 'down';
  private animFrame: number = 0;
  private animTimer: number = 0;
  private animSpeed: number = 0.15; // seconds per frame
  
  private spriteSheet: SpriteSheet | null = null;
  
  constructor(config: GameConfig, assets: AssetLoader, input: InputManager) {
    this.config = config;
    this.assets = assets;
    this.input = input;
    
    this.spriteSheet = assets.getSpriteSheet('player') || null;
  }
  
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }
  
  update(dt: number, world: World): void {
    if (this.moving) {
      this.updateMovement(dt);
    } else {
      this.checkInput(world);
    }
    
    // Update animation
    if (this.moving) {
      this.animTimer += dt;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0;
    }
  }
  
  private checkInput(world: World): void {
    const { x: dx, y: dy } = this.input.getMovementVector();
    
    if (dx !== 0 || dy !== 0) {
      // Set direction
      if (dy < 0) this.direction = 'up';
      else if (dy > 0) this.direction = 'down';
      else if (dx < 0) this.direction = 'left';
      else if (dx > 0) this.direction = 'right';
      
      // Calculate target tile
      const newX = this.x + dx;
      const newY = this.y + dy;
      
      // Check collision
      if (!world.isTileSolid(newX, newY)) {
        this.targetX = newX;
        this.targetY = newY;
        this.moving = true;
      }
    }
  }
  
  private updateMovement(dt: number): void {
    const speed = this.moveSpeed * dt;
    
    // Move towards target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= speed) {
      // Arrived at target
      this.x = this.targetX;
      this.y = this.targetY;
      this.moving = false;
    } else {
      // Continue moving
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }
  
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (!this.spriteSheet) {
      // Fallback: draw colored rectangle
      const screenX = this.x * this.config.TILE_SIZE - camX;
      const screenY = this.y * this.config.TILE_SIZE - camY;
      
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(screenX, screenY - 16, this.config.TILE_SIZE, this.config.TILE_SIZE * 2);
      return;
    }
    
    const { tileWidth, tileHeight, image } = this.spriteSheet;
    
    // Calculate sprite position
    const directionRow = ['down', 'left', 'right', 'up'].indexOf(this.direction);
    const srcX = this.animFrame * tileWidth;
    const srcY = directionRow * tileHeight;
    
    // Screen position (center player on tile, adjust for sprite height)
    const screenX = this.x * this.config.TILE_SIZE - camX - (tileWidth - this.config.TILE_SIZE) / 2;
    const screenY = this.y * this.config.TILE_SIZE - camY - (tileHeight - this.config.TILE_SIZE);
    
    ctx.drawImage(
      image,
      srcX, srcY, tileWidth, tileHeight,
      Math.floor(screenX), Math.floor(screenY), tileWidth, tileHeight
    );
  }
  
  isMoving(): boolean {
    return this.moving;
  }
  
  getDirection(): Direction {
    return this.direction;
  }
}
