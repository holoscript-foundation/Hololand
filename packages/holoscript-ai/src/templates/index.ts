/**
 * @holoscript/ai - Agent Templates
 *
 * Pre-built templates for common HoloScript Plus patterns.
 * Agents can use these to quickly generate worlds, NPCs, scenes, etc.
 */

export interface Template {
  name: string;
  description: string;
  category: 'world' | 'orb' | 'system' | 'material' | 'scene' | 'game';
  parameters: TemplateParameter[];
  generate: (params: Record<string, unknown>) => string;
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'vec3' | 'select';
  description: string;
  default?: unknown;
  options?: string[]; // For select type
  min?: number;
  max?: number;
}

// ============================================================================
// World Templates
// ============================================================================

export const EmptyWorldTemplate: Template = {
  name: 'Empty World',
  description: 'A minimal empty world with basic lighting',
  category: 'world',
  parameters: [
    { name: 'name', type: 'string', description: 'World name', default: 'MyWorld' },
    { name: 'background', type: 'color', description: 'Background color', default: '#1a1a2e' },
    { name: 'ambientLight', type: 'boolean', description: 'Include ambient light', default: true },
  ],
  generate: (params) => `
import { Vec3, Color } from "@holoscript/std";

world ${params.name || 'MyWorld'} {
  background: ${params.background || '#1a1a2e'};
  ${params.ambientLight !== false ? 'light: ambient;' : ''}
}
`.trim(),
};

export const GalleryWorldTemplate: Template = {
  name: 'Gallery World',
  description: 'A 3D gallery space for displaying objects',
  category: 'world',
  parameters: [
    { name: 'name', type: 'string', description: 'World name', default: 'Gallery' },
    { name: 'wallColor', type: 'color', description: 'Wall color', default: '#f0f0f0' },
    { name: 'floorColor', type: 'color', description: 'Floor color', default: '#808080' },
    { name: 'width', type: 'number', description: 'Gallery width', default: 20, min: 5, max: 100 },
    { name: 'depth', type: 'number', description: 'Gallery depth', default: 30, min: 5, max: 100 },
  ],
  generate: (params) => `
import { Vec3, Color } from "@holoscript/std";

world ${params.name || 'Gallery'} {
  background: #ffffff;
  light: ambient;

  // Floor
  orb Floor {
    geometry: plane;
    color: ${params.floorColor || '#808080'};
    position: [0, 0, 0];
    scale: [${params.width || 20}, 1, ${params.depth || 30}];
    receiveShadow: true;
  }

  // Ceiling
  orb Ceiling {
    geometry: plane;
    color: #ffffff;
    position: [0, 5, 0];
    rotation: [3.14159, 0, 0];
    scale: [${params.width || 20}, 1, ${params.depth || 30}];
  }

  // Walls
  orb BackWall {
    geometry: plane;
    color: ${params.wallColor || '#f0f0f0'};
    position: [0, 2.5, -${(params.depth as number || 30) / 2}];
    rotation: [0, 0, 0];
    scale: [${params.width || 20}, 5, 1];
  }

  orb LeftWall {
    geometry: plane;
    color: ${params.wallColor || '#f0f0f0'};
    position: [-${(params.width as number || 20) / 2}, 2.5, 0];
    rotation: [0, 1.5708, 0];
    scale: [${params.depth || 30}, 5, 1];
  }

  orb RightWall {
    geometry: plane;
    color: ${params.wallColor || '#f0f0f0'};
    position: [${(params.width as number || 20) / 2}, 2.5, 0];
    rotation: [0, -1.5708, 0];
    scale: [${params.depth || 30}, 5, 1];
  }

  // Lighting
  orb MainLight {
    geometry: point;
    color: #ffffff;
    position: [0, 4.5, 0];
    intensity: 1.5;
    castShadow: true;
  }
}
`.trim(),
};

export const OutdoorWorldTemplate: Template = {
  name: 'Outdoor World',
  description: 'An outdoor environment with sky and terrain',
  category: 'world',
  parameters: [
    { name: 'name', type: 'string', description: 'World name', default: 'Outdoors' },
    { name: 'timeOfDay', type: 'select', description: 'Time of day', default: 'day', options: ['dawn', 'day', 'dusk', 'night'] },
    { name: 'terrainSize', type: 'number', description: 'Terrain size', default: 100, min: 10, max: 1000 },
    { name: 'hasTrees', type: 'boolean', description: 'Include trees', default: true },
  ],
  generate: (params) => {
    const timeColors: Record<string, { sky: string; sun: string; ambient: string }> = {
      dawn: { sky: '#ff9e80', sun: '#ff6b35', ambient: '#4a3f35' },
      day: { sky: '#87ceeb', sun: '#fff5cc', ambient: '#404040' },
      dusk: { sky: '#ff7b54', sun: '#ff4500', ambient: '#3d2c3a' },
      night: { sky: '#1a1a2e', sun: '#4a4a6a', ambient: '#0a0a0a' },
    };
    const time = (params.timeOfDay as string) || 'day';
    const colors = timeColors[time];

    return `
import { Vec3, Color, random, List } from "@holoscript/std";

const TERRAIN_SIZE = ${params.terrainSize || 100};

world ${params.name || 'Outdoors'} {
  background: ${colors.sky};

  // Skybox (simulated with large sphere)
  orb Sky {
    geometry: sphere;
    color: ${colors.sky};
    position: [0, 0, 0];
    scale: 500;
    material: { side: "back" };
  }

  // Sun/Moon
  orb Sun {
    geometry: sphere;
    color: ${colors.sun};
    position: [100, ${time === 'night' ? 20 : 80}, -100];
    scale: 10;
    material: { emissive: ${colors.sun}, emissiveIntensity: 2 };
  }

  // Directional light
  orb SunLight {
    type: directional;
    color: ${colors.sun};
    position: [100, 80, -100];
    intensity: ${time === 'night' ? 0.2 : 1.0};
    castShadow: true;
  }

  // Ambient light
  orb AmbientLight {
    type: ambient;
    color: ${colors.ambient};
    intensity: 0.5;
  }

  // Terrain
  orb Terrain {
    geometry: plane;
    color: #4a7c3a;
    position: [0, 0, 0];
    rotation: [-1.5708, 0, 0];
    scale: [TERRAIN_SIZE, TERRAIN_SIZE, 1];
    receiveShadow: true;
  }
}

${params.hasTrees !== false ? `
// Tree generation system
system TreeGenerator {
  state: { trees: [] };

  init: fn() {
    for (let i = 0; i < 50; i++) {
      let x = random(-TERRAIN_SIZE/2 + 5, TERRAIN_SIZE/2 - 5);
      let z = random(-TERRAIN_SIZE/2 + 5, TERRAIN_SIZE/2 - 5);
      let height = random(3, 8);

      // Tree trunk
      orb TreeTrunk_{i} {
        geometry: cylinder;
        color: #8b4513;
        position: [x, height/2, z];
        scale: [0.3, height, 0.3];
        castShadow: true;
      }

      // Tree foliage
      orb TreeFoliage_{i} {
        geometry: sphere;
        color: #228b22;
        position: [x, height + 1.5, z];
        scale: [2, 3, 2];
        castShadow: true;
      }
    }
  };
}` : ''}
`.trim();
  },
};

// ============================================================================
// NPC/Character Templates
// ============================================================================

export const SimpleNPCTemplate: Template = {
  name: 'Simple NPC',
  description: 'A basic NPC with idle and interaction behavior',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'NPC' },
    { name: 'color', type: 'color', description: 'NPC color', default: '#4a90d9' },
    { name: 'position', type: 'vec3', description: 'Starting position', default: [0, 1, 0] },
    { name: 'dialogueLines', type: 'string', description: 'Dialogue lines (comma-separated)', default: 'Hello!,Nice day isn\'t it?,Goodbye!' },
  ],
  generate: (params) => {
    const lines = ((params.dialogueLines as string) || 'Hello!').split(',').map((l) => `"${l.trim()}"`);
    return `
import { Vec3, random, List } from "@holoscript/std";

// NPC: ${params.name || 'NPC'}
orb ${params.name || 'NPC'} {
  geometry: capsule;
  color: ${params.color || '#4a90d9'};
  position: ${JSON.stringify(params.position || [0, 1, 0])};
  scale: [0.5, 1, 0.5];

  onClick: fn() {
    ${params.name || 'NPC'}Behavior.speak();
  };
}

// NPC head
orb ${params.name || 'NPC'}Head {
  geometry: sphere;
  color: #ffd9b3;
  position: [${(params.position as number[])?.[0] || 0}, ${((params.position as number[])?.[1] || 1) + 1.2}, ${(params.position as number[])?.[2] || 0}];
  scale: 0.4;
}

system ${params.name || 'NPC'}Behavior {
  state: {
    dialogueLines: [${lines.join(', ')}],
    currentLine: 0,
    idleTimer: 0,
    isIdle: true
  };

  update: fn(dt) {
    if (state.isIdle) {
      state.idleTimer += dt;
      // Subtle idle animation
      let bobAmount = Math.sin(state.idleTimer * 2) * 0.05;
      ${params.name || 'NPC'}.position.y = ${(params.position as number[])?.[1] || 1} + bobAmount;
    }
  };

  fn speak() {
    let line = state.dialogueLines[state.currentLine];
    UI.showDialogue("${params.name || 'NPC'}", line);
    state.currentLine = (state.currentLine + 1) % state.dialogueLines.length;
  }
}
`.trim();
  },
};

export const PatrollingNPCTemplate: Template = {
  name: 'Patrolling NPC',
  description: 'An NPC that patrols between waypoints',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'Guard' },
    { name: 'color', type: 'color', description: 'NPC color', default: '#8b0000' },
    { name: 'speed', type: 'number', description: 'Movement speed', default: 2, min: 0.5, max: 10 },
    { name: 'waypointCount', type: 'number', description: 'Number of waypoints', default: 4, min: 2, max: 10 },
    { name: 'patrolRadius', type: 'number', description: 'Patrol radius', default: 5, min: 2, max: 20 },
  ],
  generate: (params) => {
    const count = (params.waypointCount as number) || 4;
    const radius = (params.patrolRadius as number) || 5;
    const waypoints = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      waypoints.push(`[${(Math.cos(angle) * radius).toFixed(2)}, 0.5, ${(Math.sin(angle) * radius).toFixed(2)}]`);
    }

    return `
import { Vec3, vec3Distance, vec3Lerp } from "@holoscript/std";

// Patrolling NPC: ${params.name || 'Guard'}
orb ${params.name || 'Guard'} {
  geometry: capsule;
  color: ${params.color || '#8b0000'};
  position: ${waypoints[0]};
  scale: [0.5, 1.2, 0.5];
}

system ${params.name || 'Guard'}Patrol {
  state: {
    waypoints: [${waypoints.join(', ')}],
    currentWaypoint: 0,
    speed: ${params.speed || 2},
    waitTime: 0,
    isWaiting: false
  };

  update: fn(dt) {
    if (state.isWaiting) {
      state.waitTime -= dt;
      if (state.waitTime <= 0) {
        state.isWaiting = false;
        state.currentWaypoint = (state.currentWaypoint + 1) % state.waypoints.length;
      }
      return;
    }

    let target = state.waypoints[state.currentWaypoint];
    let current = ${params.name || 'Guard'}.position;
    let distance = vec3Distance(current, target);

    if (distance < 0.1) {
      // Reached waypoint, wait before moving to next
      state.isWaiting = true;
      state.waitTime = 1.0; // Wait 1 second
    } else {
      // Move towards waypoint
      let t = Math.min(1, (state.speed * dt) / distance);
      ${params.name || 'Guard'}.position = vec3Lerp(current, target, t);

      // Rotate to face movement direction
      let dx = target[0] - current[0];
      let dz = target[2] - current[2];
      ${params.name || 'Guard'}.rotation.y = Math.atan2(dx, dz);
    }
  };
}
`.trim();
  },
};

// ============================================================================
// Game System Templates
// ============================================================================

export const InventorySystemTemplate: Template = {
  name: 'Inventory System',
  description: 'A basic inventory management system',
  category: 'system',
  parameters: [
    { name: 'maxSlots', type: 'number', description: 'Maximum inventory slots', default: 20, min: 5, max: 100 },
    { name: 'stackable', type: 'boolean', description: 'Allow item stacking', default: true },
    { name: 'maxStackSize', type: 'number', description: 'Maximum stack size', default: 99, min: 1, max: 999 },
  ],
  generate: (params) => `
import { List, HoloMap } from "@holoscript/std";

// Item type definition
const ItemType = {
  WEAPON: "weapon",
  ARMOR: "armor",
  CONSUMABLE: "consumable",
  MATERIAL: "material",
  KEY: "key"
};

system Inventory {
  state: {
    slots: new Array(${params.maxSlots || 20}).fill(null),
    maxSlots: ${params.maxSlots || 20},
    stackable: ${params.stackable !== false},
    maxStackSize: ${params.maxStackSize || 99},
    selectedSlot: 0
  };

  fn addItem(item, quantity = 1) {
    // Try to stack with existing items first
    if (state.stackable && item.stackable) {
      for (let i = 0; i < state.maxSlots; i++) {
        let slot = state.slots[i];
        if (slot && slot.id === item.id && slot.quantity < state.maxStackSize) {
          let canAdd = Math.min(quantity, state.maxStackSize - slot.quantity);
          slot.quantity += canAdd;
          quantity -= canAdd;
          if (quantity <= 0) return true;
        }
      }
    }

    // Find empty slot for remaining items
    while (quantity > 0) {
      let emptySlot = state.slots.findIndex(s => s === null);
      if (emptySlot === -1) return false; // Inventory full

      let addQuantity = state.stackable ? Math.min(quantity, state.maxStackSize) : 1;
      state.slots[emptySlot] = {
        ...item,
        quantity: addQuantity
      };
      quantity -= addQuantity;
    }

    return true;
  }

  fn removeItem(slotIndex, quantity = 1) {
    let slot = state.slots[slotIndex];
    if (!slot) return false;

    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      state.slots[slotIndex] = null;
    }
    return true;
  }

  fn getItem(slotIndex) {
    return state.slots[slotIndex];
  }

  fn getItemCount(itemId) {
    let count = 0;
    for (let slot of state.slots) {
      if (slot && slot.id === itemId) {
        count += slot.quantity;
      }
    }
    return count;
  }

  fn hasItem(itemId, quantity = 1) {
    return this.getItemCount(itemId) >= quantity;
  }

  fn selectSlot(index) {
    if (index >= 0 && index < state.maxSlots) {
      state.selectedSlot = index;
    }
  }

  fn useSelectedItem() {
    let item = state.slots[state.selectedSlot];
    if (!item) return null;

    if (item.type === ItemType.CONSUMABLE) {
      this.removeItem(state.selectedSlot, 1);
      return item.effect;
    }

    return item;
  }

  fn swapSlots(slotA, slotB) {
    let temp = state.slots[slotA];
    state.slots[slotA] = state.slots[slotB];
    state.slots[slotB] = temp;
  }
}
`.trim(),
};

export const HealthSystemTemplate: Template = {
  name: 'Health System',
  description: 'A health and damage system for entities',
  category: 'system',
  parameters: [
    { name: 'maxHealth', type: 'number', description: 'Maximum health', default: 100, min: 1, max: 10000 },
    { name: 'regenRate', type: 'number', description: 'Health regen per second', default: 0, min: 0, max: 100 },
    { name: 'invincibilityTime', type: 'number', description: 'Invincibility time after damage (seconds)', default: 0.5 },
  ],
  generate: (params) => `
import { clamp } from "@holoscript/std";

system HealthSystem {
  state: {
    currentHealth: ${params.maxHealth || 100},
    maxHealth: ${params.maxHealth || 100},
    regenRate: ${params.regenRate || 0},
    invincibilityTime: ${params.invincibilityTime || 0.5},
    invincibilityTimer: 0,
    isInvincible: false,
    isDead: false,
    damageMultiplier: 1.0,
    healMultiplier: 1.0
  };

  update: fn(dt) {
    // Handle invincibility
    if (state.isInvincible) {
      state.invincibilityTimer -= dt;
      if (state.invincibilityTimer <= 0) {
        state.isInvincible = false;
      }
    }

    // Health regeneration
    if (!state.isDead && state.regenRate > 0 && state.currentHealth < state.maxHealth) {
      this.heal(state.regenRate * dt, false);
    }
  };

  fn takeDamage(amount, ignoreInvincibility = false) {
    if (state.isDead) return 0;
    if (state.isInvincible && !ignoreInvincibility) return 0;

    let actualDamage = amount * state.damageMultiplier;
    state.currentHealth = clamp(state.currentHealth - actualDamage, 0, state.maxHealth);

    // Trigger invincibility
    if (state.invincibilityTime > 0) {
      state.isInvincible = true;
      state.invincibilityTimer = state.invincibilityTime;
    }

    // Check for death
    if (state.currentHealth <= 0) {
      state.isDead = true;
      Events.emit("entityDeath", { health: this });
    } else {
      Events.emit("entityDamaged", { health: this, damage: actualDamage });
    }

    return actualDamage;
  }

  fn heal(amount, triggerEvents = true) {
    if (state.isDead) return 0;

    let actualHeal = amount * state.healMultiplier;
    let previousHealth = state.currentHealth;
    state.currentHealth = clamp(state.currentHealth + actualHeal, 0, state.maxHealth);
    let healedAmount = state.currentHealth - previousHealth;

    if (triggerEvents && healedAmount > 0) {
      Events.emit("entityHealed", { health: this, amount: healedAmount });
    }

    return healedAmount;
  }

  fn setMaxHealth(newMax, scaleCurrentHealth = true) {
    let ratio = state.currentHealth / state.maxHealth;
    state.maxHealth = newMax;
    if (scaleCurrentHealth) {
      state.currentHealth = newMax * ratio;
    } else {
      state.currentHealth = clamp(state.currentHealth, 0, newMax);
    }
  }

  fn revive(healthPercent = 1.0) {
    state.isDead = false;
    state.currentHealth = state.maxHealth * healthPercent;
    Events.emit("entityRevived", { health: this });
  }

  fn getHealthPercent() {
    return state.currentHealth / state.maxHealth;
  }

  fn isFullHealth() {
    return state.currentHealth >= state.maxHealth;
  }
}
`.trim(),
};

// ============================================================================
// Weapon Templates
// ============================================================================

export const MeleeWeaponTemplate: Template = {
  name: 'Melee Weapon',
  description: 'A grabbable melee weapon with damage dealing',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Weapon name', default: 'Sword' },
    { name: 'damage', type: 'number', description: 'Base damage', default: 25, min: 1, max: 100 },
    { name: 'swingSpeed', type: 'number', description: 'Swing speed', default: 1.0, min: 0.5, max: 3.0 },
    { name: 'color', type: 'color', description: 'Weapon color', default: '#c0c0c0' },
  ],
  generate: (params) => `
template "${params.name || 'Sword'}" {
  @grabbable
  @throwable
  
  state {
    damage: ${params.damage || 25}
    swingSpeed: ${params.swingSpeed || 1.0}
    isSwinging: false
    lastHitTime: 0
  }
  
  mesh: "weapons/${(params.name as string || 'sword').toLowerCase()}.glb"
  color: "${params.color || '#c0c0c0'}"
  mass: 2.0
  
  on_grab: () => {
    emit("weapon:equipped", { weapon: this })
  }
  
  on_release: () => {
    emit("weapon:unequipped", { weapon: this })
  }
  
  action swing() {
    if (this.isSwinging) return
    this.isSwinging = true
    
    animate("rotation.z", -1.5, 200 / this.swingSpeed)
    await delay(200 / this.swingSpeed)
    animate("rotation.z", 0, 300 / this.swingSpeed)
    await delay(300 / this.swingSpeed)
    
    this.isSwinging = false
  }
  
  on_collision: (other) => {
    const now = Date.now()
    if (now - this.lastHitTime < 500) return // Cooldown
    
    if (other.health !== undefined && this.isSwinging) {
      other.takeDamage(this.damage)
      this.lastHitTime = now
      emit("weapon:hit", { weapon: this, target: other, damage: this.damage })
    }
  }
}
`.trim(),
};

export const RangedWeaponTemplate: Template = {
  name: 'Ranged Weapon',
  description: 'A ranged weapon that fires projectiles',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Weapon name', default: 'Bow' },
    { name: 'damage', type: 'number', description: 'Projectile damage', default: 15, min: 1, max: 100 },
    { name: 'projectileSpeed', type: 'number', description: 'Projectile speed', default: 20, min: 5, max: 50 },
    { name: 'fireRate', type: 'number', description: 'Shots per second', default: 1, min: 0.1, max: 10 },
    { name: 'ammoCapacity', type: 'number', description: 'Max ammo', default: 30, min: 1, max: 999 },
  ],
  generate: (params) => `
template "${params.name || 'Bow'}Projectile" {
  geometry: sphere
  scale: [0.1, 0.1, 0.5]
  color: "#ffcc00"
  mass: 0.1
  
  state {
    damage: ${params.damage || 15}
    lifetime: 5000
    spawnTime: 0
  }
  
  on_spawn: () => {
    this.spawnTime = Date.now()
  }
  
  every(100) {
    if (Date.now() - this.spawnTime > this.lifetime) {
      destroy()
    }
  }
  
  on_collision: (other) => {
    if (other.health !== undefined) {
      other.takeDamage(this.damage)
      emit("projectile:hit", { projectile: this, target: other })
    }
    destroy()
  }
}

template "${params.name || 'Bow'}" {
  @grabbable
  
  state {
    ammo: ${params.ammoCapacity || 30}
    maxAmmo: ${params.ammoCapacity || 30}
    fireRate: ${params.fireRate || 1}
    projectileSpeed: ${params.projectileSpeed || 20}
    lastFireTime: 0
    isAiming: false
  }
  
  mesh: "weapons/${(params.name as string || 'bow').toLowerCase()}.glb"
  
  on_grab: () => {
    this.isAiming = true
    emit("weapon:equipped", { weapon: this })
  }
  
  on_release: () => {
    this.isAiming = false
  }
  
  action fire() {
    const now = Date.now()
    const cooldown = 1000 / this.fireRate
    
    if (now - this.lastFireTime < cooldown) return
    if (this.ammo <= 0) {
      emit("weapon:empty", { weapon: this })
      return
    }
    
    this.ammo--
    this.lastFireTime = now
    
    const projectile = spawn("${params.name || 'Bow'}Projectile", {
      position: this.position,
      rotation: this.rotation
    })
    
    const direction = getForwardVector(this.rotation)
    projectile.velocity = direction.multiply(this.projectileSpeed)
    
    emit("weapon:fired", { weapon: this, projectile: projectile })
  }
  
  action reload() {
    this.ammo = this.maxAmmo
    emit("weapon:reloaded", { weapon: this })
  }
}
`.trim(),
};

// ============================================================================
// UI Component Templates
// ============================================================================

export const HealthBarTemplate: Template = {
  name: 'Health Bar UI',
  description: '3D health bar that follows an entity',
  category: 'orb',
  parameters: [
    { name: 'width', type: 'number', description: 'Bar width', default: 1.5, min: 0.5, max: 5 },
    { name: 'height', type: 'number', description: 'Bar height', default: 0.15, min: 0.05, max: 0.5 },
    { name: 'healthyColor', type: 'color', description: 'Full health color', default: '#22c55e' },
    { name: 'damagedColor', type: 'color', description: 'Low health color', default: '#ef4444' },
    { name: 'backgroundColor', type: 'color', description: 'Background color', default: '#1f2937' },
  ],
  generate: (params) => `
template "HealthBar" {
  state {
    targetEntity: null
    currentHealth: 100
    maxHealth: 100
    width: ${params.width || 1.5}
    height: ${params.height || 0.15}
    yOffset: 2.2
  }
  
  object "Background" {
    geometry: plane
    color: "${params.backgroundColor || '#1f2937'}"
    position: [0, 0, -0.01]
    scale: [this.width + 0.1, this.height + 0.05, 1]
  }
  
  object "Bar" {
    geometry: plane
    color: "${params.healthyColor || '#22c55e'}"
    position: [0, 0, 0]
    scale: [this.width, this.height, 1]
  }
  
  action attachTo(entity) {
    this.targetEntity = entity
    if (entity.health !== undefined) {
      this.maxHealth = entity.maxHealth || 100
      this.currentHealth = entity.health
    }
  }
  
  action updateHealth(current, max) {
    this.currentHealth = current
    this.maxHealth = max || this.maxHealth
    
    const percent = this.currentHealth / this.maxHealth
    this.Bar.scale.x = this.width * percent
    this.Bar.position.x = -this.width * (1 - percent) / 2
    
    // Interpolate color from healthy to damaged
    if (percent > 0.5) {
      this.Bar.color = "${params.healthyColor || '#22c55e'}"
    } else if (percent > 0.25) {
      this.Bar.color = "#eab308" // Yellow warning
    } else {
      this.Bar.color = "${params.damagedColor || '#ef4444'}"
    }
  }
  
  every(16) {
    if (this.targetEntity) {
      // Follow entity
      this.position = [
        this.targetEntity.position[0],
        this.targetEntity.position[1] + this.yOffset,
        this.targetEntity.position[2]
      ]
      
      // Billboard - face camera
      this.rotation = camera.rotation
      
      // Update health if entity has it
      if (this.targetEntity.health !== undefined) {
        this.updateHealth(this.targetEntity.health, this.targetEntity.maxHealth)
      }
    }
  }
}
`.trim(),
};

export const FloatingTextTemplate: Template = {
  name: 'Floating Text',
  description: 'Animated floating text (damage numbers, pickups, etc.)',
  category: 'orb',
  parameters: [
    { name: 'fontSize', type: 'number', description: 'Text size', default: 0.5, min: 0.1, max: 2 },
    { name: 'duration', type: 'number', description: 'Display duration (ms)', default: 1500, min: 500, max: 5000 },
    { name: 'floatHeight', type: 'number', description: 'Float up distance', default: 1.5, min: 0.5, max: 5 },
    { name: 'defaultColor', type: 'color', description: 'Default text color', default: '#ffffff' },
  ],
  generate: (params) => `
template "FloatingText" {
  state {
    text: ""
    color: "${params.defaultColor || '#ffffff'}"
    fontSize: ${params.fontSize || 0.5}
    duration: ${params.duration || 1500}
    floatHeight: ${params.floatHeight || 1.5}
    startY: 0
    startTime: 0
  }
  
  geometry: text
  billboard: true
  
  on_spawn: () => {
    this.startY = this.position[1]
    this.startTime = Date.now()
    
    // Animate upward with fade
    animate("position.y", this.startY + this.floatHeight, this.duration)
    animate("opacity", 0, this.duration)
  }
  
  every(16) {
    if (Date.now() - this.startTime > this.duration) {
      destroy()
    }
  }
}

// Helper function to spawn floating text
function showFloatingText(position, text, color = "${params.defaultColor || '#ffffff'}") {
  spawn("FloatingText", {
    position: position,
    text: text,
    color: color
  })
}

// Preset functions
function showDamageNumber(position, damage) {
  showFloatingText(position, "-" + damage, "#ef4444")
}

function showHealNumber(position, amount) {
  showFloatingText(position, "+" + amount, "#22c55e")
}

function showPickupText(position, itemName) {
  showFloatingText(position, itemName, "#fbbf24")
}
`.trim(),
};

export const DialogueBoxTemplate: Template = {
  name: 'Dialogue Box',
  description: '3D dialogue UI for NPC conversations',
  category: 'orb',
  parameters: [
    { name: 'width', type: 'number', description: 'Box width', default: 3, min: 1, max: 6 },
    { name: 'height', type: 'number', description: 'Box height', default: 1, min: 0.5, max: 3 },
    { name: 'backgroundColor', type: 'color', description: 'Background color', default: '#1e293b' },
    { name: 'textColor', type: 'color', description: 'Text color', default: '#f1f5f9' },
    { name: 'typewriterSpeed', type: 'number', description: 'Characters per second', default: 30, min: 10, max: 100 },
  ],
  generate: (params) => `
template "DialogueBox" {
  state {
    isVisible: false
    currentSpeaker: ""
    fullText: ""
    displayedText: ""
    charIndex: 0
    typewriterSpeed: ${params.typewriterSpeed || 30}
    onComplete: null
    choices: []
    selectedChoice: 0
  }
  
  position: [0, 1.5, -2] // In front of player
  billboard: true
  visible: false
  
  object "Background" {
    geometry: roundedRect
    color: "${params.backgroundColor || '#1e293b'}"
    opacity: 0.95
    scale: [${params.width || 3}, ${params.height || 1}, 1]
  }
  
  object "SpeakerName" {
    geometry: text
    color: "#60a5fa"
    fontSize: 0.12
    position: [-${(params.width as number || 3) / 2 - 0.2}, ${(params.height as number || 1) / 2 - 0.15}, 0.01]
    text: ""
  }
  
  object "DialogueText" {
    geometry: text
    color: "${params.textColor || '#f1f5f9'}"
    fontSize: 0.1
    position: [-${(params.width as number || 3) / 2 - 0.2}, 0, 0.01]
    maxWidth: ${(params.width as number || 3) - 0.4}
    text: ""
  }
  
  action show(speaker, text, choices = [], onComplete = null) {
    this.currentSpeaker = speaker
    this.fullText = text
    this.displayedText = ""
    this.charIndex = 0
    this.choices = choices
    this.selectedChoice = 0
    this.onComplete = onComplete
    
    this.SpeakerName.text = speaker
    this.isVisible = true
    this.visible = true
  }
  
  action hide() {
    this.isVisible = false
    this.visible = false
  }
  
  action skipToEnd() {
    this.displayedText = this.fullText
    this.charIndex = this.fullText.length
    this.DialogueText.text = this.displayedText
  }
  
  action selectChoice(index) {
    if (index >= 0 && index < this.choices.length) {
      this.selectedChoice = index
      if (this.onComplete) {
        this.onComplete(this.choices[index])
      }
      this.hide()
    }
  }
  
  every(1000 / ${params.typewriterSpeed || 30}) {
    if (!this.isVisible) return
    if (this.charIndex >= this.fullText.length) return
    
    this.charIndex++
    this.displayedText = this.fullText.substring(0, this.charIndex)
    this.DialogueText.text = this.displayedText
  }
  
  on("input:confirm"): () => {
    if (!this.isVisible) return
    
    if (this.charIndex < this.fullText.length) {
      this.skipToEnd()
    } else if (this.choices.length > 0) {
      this.selectChoice(this.selectedChoice)
    } else if (this.onComplete) {
      this.onComplete()
      this.hide()
    }
  }
}
`.trim(),
};

// ============================================================================
// Collectible Templates
// ============================================================================

export const CollectibleItemTemplate: Template = {
  name: 'Collectible Item',
  description: 'A spinning collectible with pickup effects',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Item name', default: 'Coin' },
    { name: 'value', type: 'number', description: 'Item value', default: 1, min: 1, max: 1000 },
    { name: 'color', type: 'color', description: 'Item color', default: '#fbbf24' },
    { name: 'spinSpeed', type: 'number', description: 'Rotation speed', default: 2, min: 0, max: 10 },
    { name: 'bobHeight', type: 'number', description: 'Bob height', default: 0.2, min: 0, max: 1 },
  ],
  generate: (params) => `
template "${params.name || 'Coin'}" {
  @interactive
  
  state {
    value: ${params.value || 1}
    collected: false
    spinSpeed: ${params.spinSpeed || 2}
    bobHeight: ${params.bobHeight || 0.2}
    startY: 0
    time: 0
  }
  
  geometry: cylinder
  scale: [0.3, 0.05, 0.3]
  color: "${params.color || '#fbbf24'}"
  emissive: "${params.color || '#fbbf24'}"
  emissiveIntensity: 0.3
  
  on_spawn: () => {
    this.startY = this.position[1]
  }
  
  every(16) {
    if (this.collected) return
    
    this.time += 0.016
    
    // Spin
    this.rotation[1] += this.spinSpeed * 0.016
    
    // Bob up and down
    this.position[1] = this.startY + Math.sin(this.time * 3) * this.bobHeight
  }
  
  on_trigger: (other) => {
    if (this.collected) return
    if (!other.isPlayer) return
    
    this.collected = true
    
    // Pickup effect
    animate("scale", [0, 0, 0], 200)
    animate("position.y", this.position[1] + 1, 200)
    
    // Show pickup text
    showFloatingText(this.position, "+${params.value || 1} ${params.name || 'Coin'}", "${params.color || '#fbbf24'}")
    
    // Emit event
    emit("item:collected", { item: this, value: this.value, collector: other })
    
    // Destroy after animation
    await delay(200)
    destroy()
  }
}
`.trim(),
};

// ============================================================================
// Material Templates
// ============================================================================

export const GlowingMaterialTemplate: Template = {
  name: 'Glowing Material',
  description: 'A material with emissive glow effect',
  category: 'material',
  parameters: [
    { name: 'name', type: 'string', description: 'Material name', default: 'GlowMaterial' },
    { name: 'baseColor', type: 'color', description: 'Base color', default: '#4a90d9' },
    { name: 'emissiveColor', type: 'color', description: 'Glow color', default: '#4a90d9' },
    { name: 'emissiveIntensity', type: 'number', description: 'Glow intensity', default: 1.0, min: 0, max: 5 },
    { name: 'pulseSpeed', type: 'number', description: 'Pulse speed (0 for static)', default: 0, min: 0, max: 10 },
  ],
  generate: (params) => `
material ${params.name || 'GlowMaterial'} {
  color: ${params.baseColor || '#4a90d9'};
  emissive: ${params.emissiveColor || '#4a90d9'};
  emissiveIntensity: ${params.emissiveIntensity || 1.0};
  metalness: 0.2;
  roughness: 0.3;
}

${(params.pulseSpeed as number) > 0 ? `
system ${params.name || 'GlowMaterial'}Pulse {
  state: { time: 0 };

  update: fn(dt) {
    state.time += dt * ${params.pulseSpeed || 1};
    let intensity = ${params.emissiveIntensity || 1.0} * (0.5 + 0.5 * Math.sin(state.time));
    ${params.name || 'GlowMaterial'}.emissiveIntensity = intensity;
  };
}` : ''}
`.trim(),
};

// ============================================================================
// NPC Archetype Templates
// ============================================================================

export const WarriorNPCTemplate: Template = {
  name: 'Warrior NPC',
  description: 'Melee fighter with heavy armor and close combat abilities',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'Warrior' },
    { name: 'health', type: 'number', description: 'Max health', default: 150, min: 50, max: 500 },
    { name: 'damage', type: 'number', description: 'Attack damage', default: 25, min: 5, max: 100 },
    { name: 'armor', type: 'number', description: 'Damage reduction %', default: 30, min: 0, max: 75 },
    { name: 'aggressive', type: 'boolean', description: 'Attacks on sight', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Warrior'}" {
  @interactive
  
  state {
    health: ${params.health || 150}
    maxHealth: ${params.health || 150}
    damage: ${params.damage || 25}
    armor: ${params.armor || 30}
    isAggressive: ${params.aggressive !== false}
    target: null
    attackCooldown: 0
    attackRange: 2.0
    aggroRange: 8.0
    state: "idle" // idle, chase, attack, dead
  }
  
  mesh: "npcs/warrior.glb"
  color: "#8b4513"
  scale: [1.2, 1.2, 1.2]
  
  // Heavy armor visual indicator
  object "ArmorPlate" {
    geometry: box
    color: "#4a4a4a"
    scale: [0.6, 0.8, 0.3]
    position: [0, 0.5, 0.2]
    metalness: 0.8
  }
  
  action takeDamage(amount) {
    const reduced = amount * (1 - this.armor / 100)
    this.health -= reduced
    
    emit("npc:damaged", { npc: this, damage: reduced, type: "warrior" })
    showDamageNumber(this.position, Math.round(reduced))
    
    if (this.health <= 0) {
      this.die()
    }
  }
  
  action attack(target) {
    if (this.attackCooldown > 0) return
    
    this.attackCooldown = 1.5 // Slow but powerful
    
    // Heavy swing animation
    animate("rotation.z", -0.8, 300)
    await delay(300)
    
    if (distance(this.position, target.position) <= this.attackRange) {
      target.takeDamage(this.damage)
      emit("npc:attack", { attacker: this, target: target, damage: this.damage })
    }
    
    animate("rotation.z", 0, 200)
  }
  
  action die() {
    this.state = "dead"
    emit("npc:died", { npc: this, type: "warrior" })
    animate("rotation.x", 1.57, 500)
    await delay(2000)
    destroy()
  }
  
  every(100) {
    if (this.state === "dead") return
    
    this.attackCooldown = Math.max(0, this.attackCooldown - 0.1)
    
    // Find player
    const player = getPlayer()
    if (!player) return
    
    const dist = distance(this.position, player.position)
    
    if (this.isAggressive && dist <= this.aggroRange) {
      this.target = player
      
      if (dist <= this.attackRange) {
        this.state = "attack"
        this.attack(player)
      } else {
        this.state = "chase"
        moveToward(this, player.position, 3.0 * 0.1)
        lookAt(this, player.position)
      }
    } else {
      this.state = "idle"
      this.target = null
    }
  }
}
`.trim(),
};

export const MageNPCTemplate: Template = {
  name: 'Mage NPC',
  description: 'Ranged spellcaster with magical projectiles and abilities',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'Mage' },
    { name: 'health', type: 'number', description: 'Max health', default: 80, min: 30, max: 200 },
    { name: 'damage', type: 'number', description: 'Spell damage', default: 35, min: 10, max: 150 },
    { name: 'mana', type: 'number', description: 'Max mana', default: 100, min: 50, max: 300 },
    { name: 'spellType', type: 'select', description: 'Primary spell', default: 'fireball', options: ['fireball', 'ice', 'lightning', 'arcane'] },
  ],
  generate: (params) => {
    const spellColors: Record<string, string> = {
      fireball: '#ff4500',
      ice: '#00bfff',
      lightning: '#ffff00',
      arcane: '#9932cc',
    };
    const spell = (params.spellType as string) || 'fireball';
    const color = spellColors[spell];
    
    return `
template "${params.name || 'Mage'}Projectile" {
  geometry: sphere
  scale: [0.3, 0.3, 0.3]
  color: "${color}"
  emissive: "${color}"
  emissiveIntensity: 2.0
  
  state {
    damage: ${params.damage || 35}
    speed: 15
    lifetime: 3000
  }
  
  // Particle trail
  every(50) {
    spawn("MagicParticle", {
      position: this.position,
      color: "${color}",
      lifetime: 300
    })
  }
  
  on_collision: (other) => {
    if (other.takeDamage) {
      other.takeDamage(this.damage)
      // Spell effect based on type
      ${spell === 'ice' ? 'other.slowEffect(2.0)' : ''}
      ${spell === 'lightning' ? 'chainLightning(other, 3)' : ''}
    }
    spawnParticleBurst(this.position, "${color}", 20)
    destroy()
  }
}

template "${params.name || 'Mage'}" {
  @interactive
  
  state {
    health: ${params.health || 80}
    maxHealth: ${params.health || 80}
    mana: ${params.mana || 100}
    maxMana: ${params.mana || 100}
    damage: ${params.damage || 35}
    castCooldown: 0
    castRange: 12.0
    fleeRange: 4.0
    state: "idle"
  }
  
  mesh: "npcs/mage.glb"
  color: "#4b0082"
  
  // Floating staff
  object "Staff" {
    mesh: "items/staff.glb"
    position: [0.5, 0, 0]
    emissive: "${color}"
    emissiveIntensity: 0.5
  }
  
  action castSpell(target) {
    if (this.castCooldown > 0 || this.mana < 15) return
    
    this.mana -= 15
    this.castCooldown = 1.0
    
    // Cast animation
    animate("Staff.rotation.x", -0.5, 200)
    await delay(200)
    
    const projectile = spawn("${params.name || 'Mage'}Projectile", {
      position: this.position
    })
    
    const dir = normalize(subtract(target.position, this.position))
    projectile.velocity = multiply(dir, projectile.speed)
    
    animate("Staff.rotation.x", 0, 200)
    
    emit("npc:cast", { caster: this, spell: "${spell}" })
  }
  
  action takeDamage(amount) {
    this.health -= amount
    showDamageNumber(this.position, amount)
    
    if (this.health <= 0) {
      this.die()
    }
  }
  
  action die() {
    this.state = "dead"
    emit("npc:died", { npc: this, type: "mage" })
    spawnParticleBurst(this.position, "${color}", 30)
    destroy()
  }
  
  // Mana regeneration
  every(1000) {
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 5)
    }
  }
  
  every(100) {
    if (this.state === "dead") return
    
    this.castCooldown = Math.max(0, this.castCooldown - 0.1)
    
    const player = getPlayer()
    if (!player) return
    
    const dist = distance(this.position, player.position)
    
    // Flee if too close
    if (dist < this.fleeRange) {
      this.state = "flee"
      const awayDir = normalize(subtract(this.position, player.position))
      moveInDirection(this, awayDir, 4.0 * 0.1)
    } else if (dist <= this.castRange) {
      this.state = "attack"
      lookAt(this, player.position)
      this.castSpell(player)
    } else {
      this.state = "idle"
    }
  }
}
`.trim();
  },
};

export const ScoutNPCTemplate: Template = {
  name: 'Scout NPC',
  description: 'Fast and agile with stealth and ranged attacks',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'Scout' },
    { name: 'health', type: 'number', description: 'Max health', default: 60, min: 30, max: 150 },
    { name: 'damage', type: 'number', description: 'Arrow damage', default: 20, min: 5, max: 80 },
    { name: 'speed', type: 'number', description: 'Movement speed', default: 8, min: 4, max: 15 },
    { name: 'canStealth', type: 'boolean', description: 'Can go invisible', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Scout'}Arrow" {
  geometry: cylinder
  scale: [0.05, 0.5, 0.05]
  color: "#8b4513"
  
  state { damage: ${params.damage || 20} }
  
  on_collision: (other) => {
    if (other.takeDamage) {
      other.takeDamage(this.damage)
    }
    destroy()
  }
}

template "${params.name || 'Scout'}" {
  @interactive
  
  state {
    health: ${params.health || 60}
    maxHealth: ${params.health || 60}
    damage: ${params.damage || 20}
    speed: ${params.speed || 8}
    canStealth: ${params.canStealth !== false}
    isStealthed: false
    stealthCooldown: 0
    attackCooldown: 0
    attackRange: 15.0
    state: "patrol"
  }
  
  mesh: "npcs/scout.glb"
  color: "#228b22"
  scale: [0.9, 0.9, 0.9]
  
  action shoot(target) {
    if (this.attackCooldown > 0) return
    
    this.attackCooldown = 0.8 // Fast attacks
    
    const arrow = spawn("${params.name || 'Scout'}Arrow", {
      position: this.position,
      rotation: this.rotation
    })
    
    const dir = normalize(subtract(target.position, this.position))
    arrow.velocity = multiply(dir, 25)
    
    emit("npc:attack", { attacker: this, type: "ranged" })
  }
  
  action enterStealth() {
    if (!this.canStealth || this.stealthCooldown > 0 || this.isStealthed) return
    
    this.isStealthed = true
    animate("opacity", 0.2, 500)
    emit("npc:stealth", { npc: this, active: true })
  }
  
  action exitStealth() {
    if (!this.isStealthed) return
    
    this.isStealthed = false
    this.stealthCooldown = 10.0
    animate("opacity", 1.0, 300)
    emit("npc:stealth", { npc: this, active: false })
  }
  
  action takeDamage(amount) {
    this.exitStealth()
    this.health -= amount
    showDamageNumber(this.position, amount)
    
    if (this.health <= 0) {
      emit("npc:died", { npc: this, type: "scout" })
      destroy()
    }
  }
  
  every(100) {
    this.attackCooldown = Math.max(0, this.attackCooldown - 0.1)
    this.stealthCooldown = Math.max(0, this.stealthCooldown - 0.1)
    
    const player = getPlayer()
    if (!player) return
    
    const dist = distance(this.position, player.position)
    
    // Stealth if damaged and can
    if (this.health < this.maxHealth * 0.3 && this.canStealth) {
      this.enterStealth()
    }
    
    if (dist <= this.attackRange && !this.isStealthed) {
      this.state = "attack"
      lookAt(this, player.position)
      this.shoot(player)
    } else {
      this.state = "patrol"
    }
  }
}
`.trim(),
};

export const RogueNPCTemplate: Template = {
  name: 'Rogue NPC',
  description: 'Stealthy assassin with backstab and poison abilities',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'NPC name', default: 'Rogue' },
    { name: 'health', type: 'number', description: 'Max health', default: 70, min: 30, max: 150 },
    { name: 'damage', type: 'number', description: 'Dagger damage', default: 15, min: 5, max: 50 },
    { name: 'backstabMultiplier', type: 'number', description: 'Backstab damage multiplier', default: 3, min: 1.5, max: 5 },
    { name: 'poisonDamage', type: 'number', description: 'Poison DPS', default: 5, min: 0, max: 20 },
  ],
  generate: (params) => `
template "${params.name || 'Rogue'}" {
  @interactive
  
  state {
    health: ${params.health || 70}
    maxHealth: ${params.health || 70}
    damage: ${params.damage || 15}
    backstabMultiplier: ${params.backstabMultiplier || 3}
    poisonDamage: ${params.poisonDamage || 5}
    isStealthed: true
    attackCooldown: 0
    attackRange: 1.5
    state: "stalk"
  }
  
  mesh: "npcs/rogue.glb"
  color: "#2f2f2f"
  scale: [0.85, 0.85, 0.85]
  opacity: 0.3 // Starts stealthed
  
  action attack(target, isBackstab = false) {
    if (this.attackCooldown > 0) return
    
    this.attackCooldown = 0.5 // Fast attacks
    this.exitStealth()
    
    let finalDamage = this.damage
    if (isBackstab) {
      finalDamage *= this.backstabMultiplier
      emit("npc:backstab", { attacker: this, target: target })
      showFloatingText(target.position, "BACKSTAB!", "#ff0000")
    }
    
    target.takeDamage(finalDamage)
    
    // Apply poison
    if (this.poisonDamage > 0) {
      target.applyPoison(this.poisonDamage, 5.0) // 5 second poison
    }
  }
  
  action exitStealth() {
    if (!this.isStealthed) return
    this.isStealthed = false
    animate("opacity", 1.0, 200)
  }
  
  action enterStealth() {
    if (this.isStealthed) return
    this.isStealthed = true
    animate("opacity", 0.3, 500)
  }
  
  action isBackstab(target) {
    // Check if behind target
    const toTarget = subtract(target.position, this.position)
    const targetForward = getForwardVector(target.rotation)
    const dot = dotProduct(normalize(toTarget), targetForward)
    return dot > 0.5 // Behind if facing same direction
  }
  
  action takeDamage(amount) {
    this.exitStealth()
    this.health -= amount
    showDamageNumber(this.position, amount)
    
    if (this.health <= 0) {
      emit("npc:died", { npc: this, type: "rogue" })
      destroy()
    }
  }
  
  every(100) {
    this.attackCooldown = Math.max(0, this.attackCooldown - 0.1)
    
    const player = getPlayer()
    if (!player) return
    
    const dist = distance(this.position, player.position)
    
    if (this.isStealthed) {
      // Stalk player from behind
      this.state = "stalk"
      const behindPos = getBehindPosition(player, 3.0)
      moveToward(this, behindPos, 5.0 * 0.1)
      
      if (dist <= this.attackRange) {
        const backstab = this.isBackstab(player)
        this.attack(player, backstab)
      }
    } else {
      // Fight or flee
      if (this.health < this.maxHealth * 0.4) {
        this.state = "flee"
        const awayDir = normalize(subtract(this.position, player.position))
        moveInDirection(this, awayDir, 6.0 * 0.1)
        
        // Try to re-stealth
        if (dist > 10) {
          this.enterStealth()
        }
      } else {
        this.state = "attack"
        if (dist <= this.attackRange) {
          this.attack(player, false)
        } else {
          moveToward(this, player.position, 5.0 * 0.1)
        }
      }
    }
  }
}
`.trim(),
};

export const BossNPCTemplate: Template = {
  name: 'Boss NPC',
  description: 'Powerful boss enemy with multiple phases and special attacks',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Boss name', default: 'DarkLord' },
    { name: 'health', type: 'number', description: 'Max health', default: 1000, min: 500, max: 10000 },
    { name: 'phases', type: 'number', description: 'Number of phases', default: 3, min: 1, max: 5 },
    { name: 'minionType', type: 'string', description: 'Summon minion type', default: 'Skeleton' },
    { name: 'arenaRadius', type: 'number', description: 'Boss arena radius', default: 15, min: 10, max: 50 },
  ],
  generate: (params) => `
template "${params.name || 'DarkLord'}" {
  @interactive
  
  state {
    health: ${params.health || 1000}
    maxHealth: ${params.health || 1000}
    phase: 1
    maxPhases: ${params.phases || 3}
    enraged: false
    attackCooldown: 0
    specialCooldown: 0
    summonCooldown: 0
    arenaRadius: ${params.arenaRadius || 15}
    state: "idle"
  }
  
  mesh: "npcs/boss/${(params.name as string || 'darklord').toLowerCase()}.glb"
  color: "#4a0000"
  scale: [2.5, 2.5, 2.5]
  emissive: "#ff0000"
  emissiveIntensity: 0.3
  
  // Boss healthbar (always visible)
  object "BossHealthBar" using "HealthBar" {
    position: [0, 4, 0]
    scale: [3, 0.3, 1]
  }
  
  action enterPhase(phaseNum) {
    this.phase = phaseNum
    
    emit("boss:phase", { boss: this, phase: phaseNum })
    showFloatingText(this.position, "PHASE " + phaseNum, "#ff00ff")
    
    // Phase transition effects
    spawnParticleBurst(this.position, "#ff0000", 50)
    screenShake(0.5)
    
    // Heal slightly between phases
    this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.1)
    
    // Enrage on final phase
    if (phaseNum === this.maxPhases) {
      this.enraged = true
      this.emissiveIntensity = 1.0
      animate("scale", [3, 3, 3], 1000)
    }
  }
  
  action basicAttack(target) {
    if (this.attackCooldown > 0) return
    this.attackCooldown = this.enraged ? 0.8 : 1.5
    
    const damage = this.enraged ? 50 : 35
    
    animate("rotation.z", -0.5, 300)
    await delay(300)
    
    if (distance(this.position, target.position) <= 4) {
      target.takeDamage(damage)
      emit("boss:attack", { type: "basic" })
    }
    
    animate("rotation.z", 0, 200)
  }
  
  action groundSlam() {
    if (this.specialCooldown > 0) return
    this.specialCooldown = 8.0
    
    emit("boss:attack", { type: "groundSlam" })
    
    // Jump up
    animate("position.y", 5, 500)
    await delay(500)
    
    // Slam down
    animate("position.y", 0, 200)
    await delay(200)
    
    // Shockwave damage
    screenShake(1.0)
    const shockwaveRadius = 8
    
    for (const entity of getEntitiesInRadius(this.position, shockwaveRadius)) {
      if (entity.isPlayer) {
        entity.takeDamage(40)
        knockback(entity, this.position, 10)
      }
    }
    
    spawnShockwave(this.position, shockwaveRadius, "#ff4500")
  }
  
  action summonMinions() {
    if (this.summonCooldown > 0) return
    this.summonCooldown = 15.0
    
    const count = this.phase + 1
    emit("boss:summon", { count: count })
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const spawnPos = [
        this.position[0] + Math.cos(angle) * 5,
        0,
        this.position[2] + Math.sin(angle) * 5
      ]
      
      spawn("${params.minionType || 'Skeleton'}", { position: spawnPos })
    }
  }
  
  action takeDamage(amount) {
    // Damage reduction in higher phases
    const reduction = (this.phase - 1) * 0.1
    const finalDamage = amount * (1 - reduction)
    
    this.health -= finalDamage
    showDamageNumber(this.position, Math.round(finalDamage))
    this.BossHealthBar.updateHealth(this.health, this.maxHealth)
    
    // Check phase transitions
    const healthPercent = this.health / this.maxHealth
    const phaseThreshold = 1 - (this.phase / this.maxPhases)
    
    if (healthPercent <= phaseThreshold && this.phase < this.maxPhases) {
      this.enterPhase(this.phase + 1)
    }
    
    if (this.health <= 0) {
      this.die()
    }
  }
  
  action die() {
    this.state = "dead"
    emit("boss:defeated", { boss: this })
    
    // Epic death sequence
    for (let i = 0; i < 10; i++) {
      await delay(200)
      spawnParticleBurst(this.position, "#ff0000", 20)
      screenShake(0.3)
    }
    
    // Drop loot
    spawn("EpicLootChest", { position: this.position })
    
    destroy()
  }
  
  every(100) {
    if (this.state === "dead") return
    
    this.attackCooldown = Math.max(0, this.attackCooldown - 0.1)
    this.specialCooldown = Math.max(0, this.specialCooldown - 0.1)
    this.summonCooldown = Math.max(0, this.summonCooldown - 0.1)
    
    const player = getPlayer()
    if (!player) return
    
    const dist = distance(this.position, player.position)
    
    // Keep player in arena
    if (dist > this.arenaRadius) {
      // Pull player back or block exit
      emit("boss:arena_edge", { player: player })
    }
    
    // AI behavior based on phase
    if (this.phase >= 2 && this.summonCooldown <= 0) {
      this.summonMinions()
    }
    
    if (this.phase >= 2 && dist <= 6 && this.specialCooldown <= 0) {
      this.groundSlam()
    } else if (dist <= 4) {
      this.basicAttack(player)
    } else {
      // Chase player
      moveToward(this, player.position, (this.enraged ? 4 : 2) * 0.1)
      lookAt(this, player.position)
    }
  }
  
  on_spawn: () => {
    emit("boss:spawn", { boss: this })
    playMusic("boss_theme")
    showBossHealthbar(this)
  }
}
`.trim(),
};

// ============================================================================
// Additional Weapon Templates
// ============================================================================

export const MagicStaffTemplate: Template = {
  name: 'Magic Staff',
  description: 'A channeling staff for magic spells',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Staff name', default: 'ArcaneStaff' },
    { name: 'damage', type: 'number', description: 'Spell damage', default: 30, min: 10, max: 100 },
    { name: 'manaCost', type: 'number', description: 'Mana per cast', default: 10, min: 1, max: 50 },
    { name: 'element', type: 'select', description: 'Element type', default: 'arcane', options: ['fire', 'ice', 'lightning', 'arcane'] },
  ],
  generate: (params) => {
    const colors: Record<string, string> = {
      fire: '#ff4500', ice: '#00bfff', lightning: '#ffff00', arcane: '#9932cc'
    };
    const element = (params.element as string) || 'arcane';
    const color = colors[element];
    
    return `
template "${params.name || 'ArcaneStaff'}" {
  @grabbable
  
  state {
    damage: ${params.damage || 30}
    manaCost: ${params.manaCost || 10}
    element: "${element}"
    isChanneling: false
    chargeLevel: 0
  }
  
  mesh: "weapons/staff_${element}.glb"
  
  object "Orb" {
    geometry: sphere
    scale: [0.15, 0.15, 0.15]
    position: [0, 1.2, 0]
    color: "${color}"
    emissive: "${color}"
    emissiveIntensity: 1.0
  }
  
  on_grab: () => {
    emit("weapon:equipped", { weapon: this })
  }
  
  action startChanneling() {
    this.isChanneling = true
    this.chargeLevel = 0
  }
  
  action stopChanneling() {
    if (!this.isChanneling) return
    this.isChanneling = false
    
    // Release charged spell
    const chargeMultiplier = 1 + (this.chargeLevel / 100)
    this.castSpell(chargeMultiplier)
    this.chargeLevel = 0
  }
  
  action castSpell(multiplier = 1) {
    const player = getPlayer()
    if (!player || player.mana < this.manaCost) return
    
    player.mana -= this.manaCost
    
    const projectile = spawn("MagicProjectile", {
      position: this.Orb.getWorldPosition(),
      color: "${color}",
      damage: this.damage * multiplier,
      element: "${element}"
    })
    
    projectile.velocity = getForwardVector(player.rotation).multiply(20)
    
    emit("weapon:cast", { weapon: this, element: "${element}" })
  }
  
  every(50) {
    if (this.isChanneling) {
      this.chargeLevel = Math.min(100, this.chargeLevel + 2)
      this.Orb.emissiveIntensity = 1 + (this.chargeLevel / 50)
      this.Orb.scale.setScalar(0.15 + this.chargeLevel * 0.002)
    }
  }
}
`.trim();
  },
};

export const WarHammerTemplate: Template = {
  name: 'War Hammer',
  description: 'Heavy two-handed hammer with ground slam',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Weapon name', default: 'WarHammer' },
    { name: 'damage', type: 'number', description: 'Base damage', default: 45, min: 20, max: 150 },
    { name: 'knockback', type: 'number', description: 'Knockback force', default: 10, min: 0, max: 30 },
    { name: 'slamRadius', type: 'number', description: 'Ground slam radius', default: 4, min: 2, max: 10 },
  ],
  generate: (params) => `
template "${params.name || 'WarHammer'}" {
  @grabbable
  
  state {
    damage: ${params.damage || 45}
    knockbackForce: ${params.knockback || 10}
    slamRadius: ${params.slamRadius || 4}
    isSwinging: false
    slamCooldown: 0
  }
  
  mesh: "weapons/warhammer.glb"
  mass: 5.0
  
  action swing() {
    if (this.isSwinging) return
    this.isSwinging = true
    
    animate("rotation.z", -2.0, 400)
    await delay(400)
    animate("rotation.z", 0, 300)
    await delay(300)
    
    this.isSwinging = false
  }
  
  action groundSlam() {
    if (this.slamCooldown > 0) return
    this.slamCooldown = 3.0
    
    // Slam animation
    animate("position.y", 2, 300)
    await delay(300)
    animate("position.y", 0, 150)
    await delay(150)
    
    // AOE damage
    const hitPos = this.getWorldPosition()
    spawnShockwave(hitPos, this.slamRadius, "#8b4513")
    screenShake(0.5)
    
    for (const entity of getEntitiesInRadius(hitPos, this.slamRadius)) {
      if (entity !== getPlayer()) {
        entity.takeDamage(this.damage * 0.75)
        knockback(entity, hitPos, this.knockbackForce)
      }
    }
    
    emit("weapon:slam", { weapon: this, radius: this.slamRadius })
  }
  
  on_collision: (other) => {
    if (this.isSwinging && other.takeDamage) {
      other.takeDamage(this.damage)
      knockback(other, this.position, this.knockbackForce)
      emit("weapon:hit", { weapon: this, target: other })
    }
  }
  
  every(100) {
    this.slamCooldown = Math.max(0, this.slamCooldown - 0.1)
  }
}
`.trim(),
};

export const SpearTemplate: Template = {
  name: 'Spear',
  description: 'Long-reach polearm that can be thrown',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Weapon name', default: 'Spear' },
    { name: 'meleeDamage', type: 'number', description: 'Melee damage', default: 20, min: 10, max: 60 },
    { name: 'throwDamage', type: 'number', description: 'Throw damage', default: 40, min: 20, max: 100 },
    { name: 'throwSpeed', type: 'number', description: 'Throw speed', default: 25, min: 15, max: 40 },
  ],
  generate: (params) => `
template "${params.name || 'Spear'}" {
  @grabbable
  @throwable
  
  state {
    meleeDamage: ${params.meleeDamage || 20}
    throwDamage: ${params.throwDamage || 40}
    throwSpeed: ${params.throwSpeed || 25}
    isThrust: false
    isThrown: false
    returnTimer: 0
  }
  
  mesh: "weapons/spear.glb"
  mass: 1.5
  
  action thrust() {
    if (this.isThrust || this.isThrown) return
    this.isThrust = true
    
    const startZ = this.position.z
    animate("position.z", startZ + 1.5, 150)
    await delay(150)
    animate("position.z", startZ, 200)
    await delay(200)
    
    this.isThrust = false
  }
  
  on_throw: (velocity) => {
    this.isThrown = true
    this.velocity = velocity.normalize().multiply(this.throwSpeed)
    
    // Rotate to point forward
    lookInDirection(this, velocity)
    
    emit("weapon:thrown", { weapon: this })
  }
  
  on_collision: (other) => {
    if (this.isThrown) {
      if (other.takeDamage) {
        other.takeDamage(this.throwDamage)
        emit("weapon:hit", { weapon: this, target: other, type: "throw" })
      }
      
      // Stick in surface
      this.velocity = [0, 0, 0]
      this.isThrown = false
      this.returnTimer = 5.0 // Auto-return after 5 seconds
    } else if (this.isThrust && other.takeDamage) {
      other.takeDamage(this.meleeDamage)
      emit("weapon:hit", { weapon: this, target: other, type: "thrust" })
    }
  }
  
  action recall() {
    if (!this.isThrown && this.returnTimer > 0) {
      // Fly back to player
      const player = getPlayer()
      const dir = subtract(player.position, this.position)
      this.velocity = normalize(dir).multiply(15)
      
      if (distance(this.position, player.position) < 1) {
        player.equip(this)
        this.returnTimer = 0
      }
    }
  }
  
  every(100) {
    if (this.returnTimer > 0) {
      this.returnTimer -= 0.1
      if (this.returnTimer <= 0) {
        this.recall()
      }
    }
  }
}
`.trim(),
};

// ============================================================================
// Game System Templates
// ============================================================================

export const QuestSystemTemplate: Template = {
  name: 'Quest System',
  description: 'Complete quest tracking with objectives and rewards',
  category: 'system',
  parameters: [
    { name: 'maxActiveQuests', type: 'number', description: 'Max active quests', default: 5, min: 1, max: 20 },
    { name: 'showNotifications', type: 'boolean', description: 'Show quest notifications', default: true },
  ],
  generate: (params) => `
// Quest Types
const QuestType = {
  KILL: "kill",
  COLLECT: "collect",
  TALK: "talk",
  EXPLORE: "explore",
  ESCORT: "escort"
}

// Quest Status
const QuestStatus = {
  AVAILABLE: "available",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed"
}

system QuestSystem {
  state {
    quests: new Map() // questId -> Quest
    activeQuests: []
    completedQuests: []
    maxActive: ${params.maxActiveQuests || 5}
    showNotifications: ${params.showNotifications !== false}
  }
  
  action registerQuest(quest) {
    state.quests.set(quest.id, {
      ...quest,
      status: QuestStatus.AVAILABLE,
      objectives: quest.objectives.map(obj => ({
        ...obj,
        current: 0,
        completed: false
      }))
    })
  }
  
  action acceptQuest(questId) {
    const quest = state.quests.get(questId)
    if (!quest || quest.status !== QuestStatus.AVAILABLE) return false
    if (state.activeQuests.length >= state.maxActive) {
      if (state.showNotifications) {
        showFloatingText(getPlayer().position, "Quest log full!", "#ff0000")
      }
      return false
    }
    
    quest.status = QuestStatus.ACTIVE
    state.activeQuests.push(questId)
    
    emit("quest:accepted", { quest: quest })
    if (state.showNotifications) {
      showNotification("Quest Accepted: " + quest.name, quest.description)
    }
    
    return true
  }
  
  action updateObjective(questId, objectiveId, amount = 1) {
    const quest = state.quests.get(questId)
    if (!quest || quest.status !== QuestStatus.ACTIVE) return
    
    const objective = quest.objectives.find(o => o.id === objectiveId)
    if (!objective || objective.completed) return
    
    objective.current = Math.min(objective.target, objective.current + amount)
    
    if (objective.current >= objective.target) {
      objective.completed = true
      emit("quest:objective_complete", { quest: quest, objective: objective })
      
      if (state.showNotifications) {
        showFloatingText(getPlayer().position, objective.description + " ✓", "#22c55e")
      }
    }
    
    // Check if all objectives complete
    if (quest.objectives.every(o => o.completed)) {
      this.completeQuest(questId)
    }
  }
  
  action completeQuest(questId) {
    const quest = state.quests.get(questId)
    if (!quest) return
    
    quest.status = QuestStatus.COMPLETED
    state.activeQuests = state.activeQuests.filter(id => id !== questId)
    state.completedQuests.push(questId)
    
    // Grant rewards
    if (quest.rewards) {
      if (quest.rewards.xp) grantXP(quest.rewards.xp)
      if (quest.rewards.gold) grantGold(quest.rewards.gold)
      if (quest.rewards.items) {
        quest.rewards.items.forEach(item => grantItem(item))
      }
    }
    
    emit("quest:completed", { quest: quest })
    if (state.showNotifications) {
      showNotification("Quest Complete!", quest.name, "#fbbf24")
    }
  }
  
  action failQuest(questId) {
    const quest = state.quests.get(questId)
    if (!quest || quest.status !== QuestStatus.ACTIVE) return
    
    quest.status = QuestStatus.FAILED
    state.activeQuests = state.activeQuests.filter(id => id !== questId)
    
    emit("quest:failed", { quest: quest })
    if (state.showNotifications) {
      showNotification("Quest Failed", quest.name, "#ef4444")
    }
  }
  
  action getActiveQuests() {
    return state.activeQuests.map(id => state.quests.get(id))
  }
  
  action getQuestProgress(questId) {
    const quest = state.quests.get(questId)
    if (!quest) return null
    
    const total = quest.objectives.length
    const completed = quest.objectives.filter(o => o.completed).length
    return { total, completed, percent: completed / total }
  }
}

// Auto-track common events
on("enemy:killed"): (data) => {
  for (const questId of QuestSystem.state.activeQuests) {
    const quest = QuestSystem.state.quests.get(questId)
    for (const obj of quest.objectives) {
      if (obj.type === QuestType.KILL && obj.targetType === data.enemyType) {
        QuestSystem.updateObjective(questId, obj.id)
      }
    }
  }
}

on("item:collected"): (data) => {
  for (const questId of QuestSystem.state.activeQuests) {
    const quest = QuestSystem.state.quests.get(questId)
    for (const obj of quest.objectives) {
      if (obj.type === QuestType.COLLECT && obj.itemType === data.itemType) {
        QuestSystem.updateObjective(questId, obj.id)
      }
    }
  }
}
`.trim(),
};

export const AchievementSystemTemplate: Template = {
  name: 'Achievement System',
  description: 'Track and unlock achievements with progress',
  category: 'system',
  parameters: [
    { name: 'showPopups', type: 'boolean', description: 'Show unlock popups', default: true },
    { name: 'soundEnabled', type: 'boolean', description: 'Play unlock sound', default: true },
  ],
  generate: (params) => `
// Achievement Categories
const AchievementCategory = {
  COMBAT: "combat",
  EXPLORATION: "exploration",
  COLLECTION: "collection",
  SOCIAL: "social",
  SECRET: "secret"
}

system AchievementSystem {
  state {
    achievements: new Map() // id -> Achievement
    unlocked: new Set()
    progress: new Map() // id -> current progress
    showPopups: ${params.showPopups !== false}
    soundEnabled: ${params.soundEnabled !== false}
  }
  
  action register(achievement) {
    state.achievements.set(achievement.id, {
      ...achievement,
      unlocked: false,
      unlockedAt: null
    })
    state.progress.set(achievement.id, 0)
  }
  
  action updateProgress(achievementId, amount = 1) {
    if (state.unlocked.has(achievementId)) return
    
    const achievement = state.achievements.get(achievementId)
    if (!achievement) return
    
    const current = state.progress.get(achievementId) + amount
    state.progress.set(achievementId, current)
    
    if (current >= achievement.target) {
      this.unlock(achievementId)
    }
  }
  
  action unlock(achievementId) {
    if (state.unlocked.has(achievementId)) return
    
    const achievement = state.achievements.get(achievementId)
    if (!achievement) return
    
    achievement.unlocked = true
    achievement.unlockedAt = Date.now()
    state.unlocked.add(achievementId)
    
    emit("achievement:unlocked", { achievement: achievement })
    
    if (state.showPopups) {
      showAchievementPopup(achievement)
    }
    
    if (state.soundEnabled) {
      playSound("achievement_unlock")
    }
    
    // Grant rewards
    if (achievement.rewards) {
      if (achievement.rewards.xp) grantXP(achievement.rewards.xp)
      if (achievement.rewards.title) unlockTitle(achievement.rewards.title)
      if (achievement.rewards.cosmetic) unlockCosmetic(achievement.rewards.cosmetic)
    }
  }
  
  action getProgress(achievementId) {
    const achievement = state.achievements.get(achievementId)
    if (!achievement) return null
    
    const current = state.progress.get(achievementId)
    return {
      current,
      target: achievement.target,
      percent: (current / achievement.target) * 100,
      unlocked: state.unlocked.has(achievementId)
    }
  }
  
  action getByCategory(category) {
    return Array.from(state.achievements.values())
      .filter(a => a.category === category)
  }
  
  action getTotalProgress() {
    const total = state.achievements.size
    const unlocked = state.unlocked.size
    return { total, unlocked, percent: (unlocked / total) * 100 }
  }
}

function showAchievementPopup(achievement) {
  spawn("AchievementPopup", {
    position: [0, 3, -2],
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rarity: achievement.rarity || "common"
  })
}

// Common achievement triggers
on("enemy:killed"): () => {
  AchievementSystem.updateProgress("first_blood")
  AchievementSystem.updateProgress("monster_slayer")
}

on("level:up"): (data) => {
  if (data.level >= 10) AchievementSystem.unlock("level_10")
  if (data.level >= 50) AchievementSystem.unlock("level_50")
  if (data.level >= 100) AchievementSystem.unlock("max_level")
}

on("world:visited"): (data) => {
  AchievementSystem.updateProgress("explorer")
}
`.trim(),
};

export const SaveLoadSystemTemplate: Template = {
  name: 'Save/Load System',
  description: 'Persistent game save with multiple slots',
  category: 'system',
  parameters: [
    { name: 'maxSlots', type: 'number', description: 'Max save slots', default: 5, min: 1, max: 20 },
    { name: 'autoSaveInterval', type: 'number', description: 'Auto-save minutes (0 = disabled)', default: 5, min: 0, max: 60 },
    { name: 'cloudSync', type: 'boolean', description: 'Enable cloud sync', default: false },
  ],
  generate: (params) => `
system SaveLoadSystem {
  state {
    maxSlots: ${params.maxSlots || 5}
    autoSaveInterval: ${(Number(params.autoSaveInterval) || 5) * 60 * 1000}
    cloudSync: ${params.cloudSync || false}
    lastAutoSave: Date.now()
    currentSlot: null
  }
  
  action save(slot = 0) {
    if (slot >= state.maxSlots) {
      console.error("Invalid save slot")
      return false
    }
    
    const saveData = {
      version: "1.0",
      timestamp: Date.now(),
      slot: slot,
      
      // Player data
      player: {
        position: getPlayer().position,
        rotation: getPlayer().rotation,
        health: getPlayer().health,
        mana: getPlayer().mana,
        level: getPlayer().level,
        xp: getPlayer().xp,
        stats: getPlayer().stats
      },
      
      // Inventory
      inventory: InventorySystem.serialize(),
      
      // Quests
      quests: {
        active: QuestSystem.state.activeQuests,
        completed: QuestSystem.state.completedQuests
      },
      
      // Achievements
      achievements: Array.from(AchievementSystem.state.unlocked),
      
      // World state
      world: {
        currentScene: getCurrentScene(),
        visitedAreas: getVisitedAreas(),
        npcsDefeated: getNPCsDefeated(),
        chestsOpened: getChestsOpened()
      },
      
      // Settings
      settings: getSettings()
    }
    
    const json = JSON.stringify(saveData)
    localStorage.setItem("hololand_save_" + slot, json)
    state.currentSlot = slot
    
    if (state.cloudSync) {
      this.syncToCloud(slot, json)
    }
    
    emit("game:saved", { slot: slot })
    showNotification("Game Saved", "Slot " + (slot + 1))
    
    return true
  }
  
  action load(slot = 0) {
    const json = localStorage.getItem("hololand_save_" + slot)
    if (!json) {
      showNotification("No Save Found", "Slot " + (slot + 1), "#ef4444")
      return false
    }
    
    try {
      const saveData = JSON.parse(json)
      
      // Restore player
      const player = getPlayer()
      player.position = saveData.player.position
      player.rotation = saveData.player.rotation
      player.health = saveData.player.health
      player.mana = saveData.player.mana
      player.level = saveData.player.level
      player.xp = saveData.player.xp
      Object.assign(player.stats, saveData.player.stats)
      
      // Restore inventory
      InventorySystem.deserialize(saveData.inventory)
      
      // Restore quests
      QuestSystem.state.activeQuests = saveData.quests.active
      QuestSystem.state.completedQuests = saveData.quests.completed
      
      // Restore achievements
      saveData.achievements.forEach(id => {
        AchievementSystem.state.unlocked.add(id)
      })
      
      // Restore world
      loadScene(saveData.world.currentScene)
      setVisitedAreas(saveData.world.visitedAreas)
      
      // Restore settings
      applySettings(saveData.settings)
      
      state.currentSlot = slot
      
      emit("game:loaded", { slot: slot })
      showNotification("Game Loaded", "Slot " + (slot + 1))
      
      return true
    } catch (e) {
      console.error("Failed to load save:", e)
      showNotification("Load Failed", "Corrupted save data", "#ef4444")
      return false
    }
  }
  
  action deleteSave(slot) {
    localStorage.removeItem("hololand_save_" + slot)
    
    if (state.cloudSync) {
      this.deleteFromCloud(slot)
    }
    
    emit("game:save_deleted", { slot: slot })
  }
  
  action getSaveInfo(slot) {
    const json = localStorage.getItem("hololand_save_" + slot)
    if (!json) return null
    
    try {
      const data = JSON.parse(json)
      return {
        slot: slot,
        timestamp: data.timestamp,
        playTime: data.playTime,
        level: data.player.level,
        scene: data.world.currentScene
      }
    } catch {
      return null
    }
  }
  
  action listSaves() {
    const saves = []
    for (let i = 0; i < state.maxSlots; i++) {
      const info = this.getSaveInfo(i)
      saves.push(info)
    }
    return saves
  }
  
  async action syncToCloud(slot, json) {
    // Cloud sync implementation
    try {
      await fetch("/api/saves/" + slot, {
        method: "POST",
        body: json
      })
    } catch (e) {
      console.warn("Cloud sync failed:", e)
    }
  }
  
  // Auto-save
  every(60000) {
    if (state.autoSaveInterval <= 0) return
    if (Date.now() - state.lastAutoSave < state.autoSaveInterval) return
    
    state.lastAutoSave = Date.now()
    this.save(0) // Auto-save to slot 0
  }
}
`.trim(),
};

// ============================================================================
// Environmental Templates
// ============================================================================

export const PortalTemplate: Template = {
  name: 'Portal',
  description: 'Teleportation portal with visual effects',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Portal name', default: 'Portal' },
    { name: 'destination', type: 'string', description: 'Destination world/position', default: 'spawn' },
    { name: 'color', type: 'color', description: 'Portal color', default: '#9932cc' },
    { name: 'radius', type: 'number', description: 'Portal radius', default: 1.5, min: 0.5, max: 5 },
    { name: 'bidirectional', type: 'boolean', description: 'Works both ways', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Portal'}" {
  @interactive
  
  state {
    destination: "${params.destination || 'spawn'}"
    isActive: true
    cooldown: 0
    bidirectional: ${params.bidirectional !== false}
  }
  
  // Portal ring
  object "Ring" {
    geometry: torus
    color: "${params.color || '#9932cc'}"
    emissive: "${params.color || '#9932cc'}"
    emissiveIntensity: 0.8
    scale: [${params.radius || 1.5}, ${params.radius || 1.5}, 0.1]
    rotation: [1.57, 0, 0]
  }
  
  // Portal surface
  object "Surface" {
    geometry: circle
    color: "${params.color || '#9932cc'}"
    opacity: 0.6
    transparent: true
    scale: [${(params.radius as number) - 0.2 || 1.3}, ${(params.radius as number) - 0.2 || 1.3}, 1]
    rotation: [1.57, 0, 0]
  }
  
  // Particle emitter
  object "Particles" {
    type: particleSystem
    count: 50
    color: "${params.color || '#9932cc'}"
    size: 0.1
    lifetime: 1000
    velocity: [0, 0.5, 0]
    spread: ${params.radius || 1.5}
  }
  
  action teleport(entity) {
    if (!this.isActive || this.cooldown > 0) return
    
    this.cooldown = 2.0
    
    // Teleport effect
    spawnParticleBurst(entity.position, "${params.color || '#9932cc'}", 30)
    playSound("portal_enter")
    
    // Teleport to destination
    if (this.destination.startsWith("world:")) {
      loadWorld(this.destination.substring(6))
    } else {
      const destPortal = getObject(this.destination)
      if (destPortal) {
        entity.position = destPortal.position.clone().add([0, 0, 2])
        destPortal.cooldown = 2.0 // Prevent instant return
      }
    }
    
    emit("portal:used", { portal: this, entity: entity })
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer) {
      this.teleport(other)
    }
  }
  
  every(100) {
    this.cooldown = Math.max(0, this.cooldown - 0.1)
    
    // Rotate ring
    this.Ring.rotation.z += 0.02
    
    // Pulse effect
    const pulse = 0.8 + Math.sin(Date.now() * 0.003) * 0.2
    this.Ring.emissiveIntensity = pulse
  }
}
`.trim(),
};

export const DoorTemplate: Template = {
  name: 'Door',
  description: 'Interactive door with open/close animations',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Door name', default: 'Door' },
    { name: 'width', type: 'number', description: 'Door width', default: 2, min: 1, max: 5 },
    { name: 'height', type: 'number', description: 'Door height', default: 3, min: 2, max: 6 },
    { name: 'openType', type: 'select', description: 'Open mechanism', default: 'swing', options: ['swing', 'slide', 'double'] },
    { name: 'requiresKey', type: 'boolean', description: 'Requires key to open', default: false },
    { name: 'autoClose', type: 'boolean', description: 'Auto-close after delay', default: true },
  ],
  generate: (params) => {
    const openType = (params.openType as string) || 'swing';
    
    return `
template "${params.name || 'Door'}" {
  @interactive
  
  state {
    isOpen: false
    isLocked: ${params.requiresKey || false}
    keyId: "${params.name || 'Door'}_key"
    autoClose: ${params.autoClose !== false}
    autoCloseDelay: 3000
    openProgress: 0
  }
  
  // Door frame
  object "Frame" {
    geometry: box
    color: "#4a3728"
    scale: [${(params.width as number) + 0.3 || 2.3}, ${(params.height as number) + 0.2 || 3.2}, 0.2]
  }
  
  ${openType === 'double' ? `
  // Left door panel
  object "LeftPanel" {
    geometry: box
    color: "#6b4423"
    scale: [${(params.width as number) / 2 - 0.1 || 0.9}, ${(params.height as number) - 0.2 || 2.8}, 0.1]
    position: [-${(params.width as number) / 4 || 0.5}, 0, 0]
    pivot: [-${(params.width as number) / 4 || 0.5}, 0, 0]
  }
  
  // Right door panel
  object "RightPanel" {
    geometry: box
    color: "#6b4423"
    scale: [${(params.width as number) / 2 - 0.1 || 0.9}, ${(params.height as number) - 0.2 || 2.8}, 0.1]
    position: [${(params.width as number) / 4 || 0.5}, 0, 0]
    pivot: [${(params.width as number) / 4 || 0.5}, 0, 0]
  }
  ` : `
  // Door panel
  object "Panel" {
    geometry: box
    color: "#6b4423"
    scale: [${(params.width as number) - 0.2 || 1.8}, ${(params.height as number) - 0.2 || 2.8}, 0.1]
    ${openType === 'swing' ? `pivot: [-${(params.width as number) / 2 || 1}, 0, 0]` : ''}
  }
  `}
  
  // Door handle
  object "Handle" {
    geometry: cylinder
    color: "#b8860b"
    metalness: 0.8
    scale: [0.05, 0.15, 0.05]
    position: [${(params.width as number) / 2 - 0.3 || 0.7}, 0, 0.1]
    rotation: [0, 0, 1.57]
  }
  
  action open() {
    if (this.isOpen) return
    if (this.isLocked) {
      playSound("door_locked")
      showFloatingText(this.position, "Locked!", "#ff0000")
      return
    }
    
    this.isOpen = true
    playSound("door_open")
    
    ${openType === 'swing' ? `
    animate("Panel.rotation.y", -1.57, 500)
    ` : openType === 'slide' ? `
    animate("Panel.position.x", ${params.width || 2}, 500)
    ` : `
    animate("LeftPanel.rotation.y", 1.57, 500)
    animate("RightPanel.rotation.y", -1.57, 500)
    `}
    
    emit("door:opened", { door: this })
    
    if (this.autoClose) {
      setTimeout(() => this.close(), this.autoCloseDelay)
    }
  }
  
  action close() {
    if (!this.isOpen) return
    
    this.isOpen = false
    playSound("door_close")
    
    ${openType === 'swing' ? `
    animate("Panel.rotation.y", 0, 500)
    ` : openType === 'slide' ? `
    animate("Panel.position.x", 0, 500)
    ` : `
    animate("LeftPanel.rotation.y", 0, 500)
    animate("RightPanel.rotation.y", 0, 500)
    `}
    
    emit("door:closed", { door: this })
  }
  
  action toggle() {
    if (this.isOpen) this.close()
    else this.open()
  }
  
  action unlock(keyId) {
    if (keyId === this.keyId) {
      this.isLocked = false
      playSound("door_unlock")
      showFloatingText(this.position, "Unlocked!", "#22c55e")
      emit("door:unlocked", { door: this })
    }
  }
  
  on_interact: () => {
    this.toggle()
  }
}
`.trim();
  },
};

export const TrapTemplate: Template = {
  name: 'Trap',
  description: 'Damaging trap with various trigger types',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Trap name', default: 'SpikeTrap' },
    { name: 'damage', type: 'number', description: 'Damage amount', default: 25, min: 5, max: 100 },
    { name: 'trapType', type: 'select', description: 'Trap type', default: 'spikes', options: ['spikes', 'fire', 'poison', 'crusher'] },
    { name: 'triggerType', type: 'select', description: 'Trigger mechanism', default: 'pressure', options: ['pressure', 'proximity', 'timed'] },
    { name: 'resetTime', type: 'number', description: 'Reset delay (ms)', default: 3000, min: 1000, max: 10000 },
  ],
  generate: (params) => {
    const trapType = (params.trapType as string) || 'spikes';
    const triggerType = (params.triggerType as string) || 'pressure';
    
    const trapColors: Record<string, string> = {
      spikes: '#4a4a4a',
      fire: '#ff4500',
      poison: '#32cd32',
      crusher: '#696969',
    };
    
    return `
template "${params.name || 'SpikeTrap'}" {
  state {
    damage: ${params.damage || 25}
    isArmed: true
    isTriggered: false
    resetTime: ${params.resetTime || 3000}
    triggerType: "${triggerType}"
  }
  
  // Base plate
  object "Base" {
    geometry: box
    color: "#3d3d3d"
    scale: [2, 0.1, 2]
    position: [0, -0.05, 0]
  }
  
  ${trapType === 'spikes' ? `
  // Spike grid
  object "Spikes" {
    mesh: "traps/spikes.glb"
    color: "${trapColors[trapType]}"
    position: [0, -0.5, 0]
  }
  ` : trapType === 'fire' ? `
  // Fire emitter
  object "FireEmitter" {
    type: particleSystem
    color: "${trapColors[trapType]}"
    count: 100
    lifetime: 500
    velocity: [0, 3, 0]
    spread: 0.5
    enabled: false
  }
  ` : trapType === 'poison' ? `
  // Poison cloud
  object "PoisonCloud" {
    geometry: sphere
    color: "${trapColors[trapType]}"
    opacity: 0
    transparent: true
    scale: [3, 1, 3]
  }
  ` : `
  // Crusher
  object "Crusher" {
    geometry: box
    color: "${trapColors[trapType]}"
    scale: [2, 0.5, 2]
    position: [0, 3, 0]
  }
  `}
  
  action trigger() {
    if (!this.isArmed || this.isTriggered) return
    
    this.isTriggered = true
    this.isArmed = false
    
    emit("trap:triggered", { trap: this, type: "${trapType}" })
    
    ${trapType === 'spikes' ? `
    playSound("trap_spikes")
    animate("Spikes.position.y", 0.3, 100)
    ` : trapType === 'fire' ? `
    playSound("trap_fire")
    this.FireEmitter.enabled = true
    ` : trapType === 'poison' ? `
    playSound("trap_poison")
    animate("PoisonCloud.opacity", 0.5, 300)
    animate("PoisonCloud.scale", [5, 2, 5], 500)
    ` : `
    playSound("trap_crusher")
    animate("Crusher.position.y", 0.25, 200)
    `}
    
    // Reset after delay
    setTimeout(() => this.reset(), this.resetTime)
  }
  
  action reset() {
    ${trapType === 'spikes' ? `
    animate("Spikes.position.y", -0.5, 500)
    ` : trapType === 'fire' ? `
    this.FireEmitter.enabled = false
    ` : trapType === 'poison' ? `
    animate("PoisonCloud.opacity", 0, 300)
    animate("PoisonCloud.scale", [3, 1, 3], 300)
    ` : `
    animate("Crusher.position.y", 3, 1000)
    `}
    
    this.isTriggered = false
    this.isArmed = true
    
    emit("trap:reset", { trap: this })
  }
  
  action applyDamage(entity) {
    if (!entity.takeDamage) return
    
    entity.takeDamage(this.damage)
    
    ${trapType === 'poison' ? `
    entity.applyPoison(5, 3000) // 5 DPS for 3 seconds
    ` : trapType === 'fire' ? `
    entity.applyBurn(10, 2000) // 10 DPS for 2 seconds
    ` : ''}
    
    emit("trap:damage", { trap: this, entity: entity, damage: this.damage })
  }
  
  ${triggerType === 'pressure' ? `
  on_trigger_enter: (other) => {
    if (other.isPlayer || other.isNPC) {
      this.trigger()
      this.applyDamage(other)
    }
  }
  ` : triggerType === 'proximity' ? `
  every(100) {
    if (!this.isArmed) return
    
    const nearby = getEntitiesInRadius(this.position, 2)
    for (const entity of nearby) {
      if (entity.isPlayer || entity.isNPC) {
        this.trigger()
        this.applyDamage(entity)
        break
      }
    }
  }
  ` : `
  // Timed trigger
  every(${params.resetTime || 3000}) {
    this.trigger()
    
    const nearby = getEntitiesInRadius(this.position, 2)
    for (const entity of nearby) {
      this.applyDamage(entity)
    }
  }
  `}
}
`.trim();
  },
};

export const ParticleSystemTemplate: Template = {
  name: 'Particle System',
  description: 'Customizable particle effects for fire, water, magic, etc.',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Effect name', default: 'ParticleEffect' },
    { name: 'effectType', type: 'select', description: 'Effect preset', default: 'fire', options: ['fire', 'water', 'magic', 'smoke', 'sparkle', 'snow', 'rain'] },
    { name: 'intensity', type: 'number', description: 'Particle count', default: 100, min: 10, max: 500 },
    { name: 'size', type: 'number', description: 'Particle size', default: 0.2, min: 0.05, max: 1 },
    { name: 'spread', type: 'number', description: 'Emission spread', default: 1, min: 0.1, max: 5 },
  ],
  generate: (params) => {
    const effectType = (params.effectType as string) || 'fire';
    
    const presets: Record<string, { color: string; velocity: string; lifetime: number; gravity: number }> = {
      fire: { color: '#ff4500', velocity: '[0, 2, 0]', lifetime: 800, gravity: -0.5 },
      water: { color: '#00bfff', velocity: '[0, -2, 0]', lifetime: 1000, gravity: 2 },
      magic: { color: '#9932cc', velocity: '[0, 1, 0]', lifetime: 1500, gravity: 0 },
      smoke: { color: '#696969', velocity: '[0, 1.5, 0]', lifetime: 2000, gravity: -0.2 },
      sparkle: { color: '#ffd700', velocity: '[0, 0.5, 0]', lifetime: 500, gravity: 0 },
      snow: { color: '#ffffff', velocity: '[0, -0.5, 0]', lifetime: 5000, gravity: 0.3 },
      rain: { color: '#4a90d9', velocity: '[0, -10, 0]', lifetime: 500, gravity: 5 },
    };
    
    const preset = presets[effectType];
    
    return `
template "${params.name || 'ParticleEffect'}" {
  state {
    isActive: true
    intensity: ${params.intensity || 100}
  }
  
  object "Emitter" {
    type: particleSystem
    
    // Particle properties
    count: ${params.intensity || 100}
    color: "${preset.color}"
    size: ${params.size || 0.2}
    sizeVariance: ${(params.size as number) * 0.3 || 0.06}
    
    // Motion
    velocity: ${preset.velocity}
    velocityVariance: [${params.spread || 1}, 0.5, ${params.spread || 1}]
    gravity: ${preset.gravity}
    
    // Lifetime
    lifetime: ${preset.lifetime}
    lifetimeVariance: ${preset.lifetime * 0.2}
    
    // Appearance
    ${effectType === 'fire' || effectType === 'magic' ? `
    emissive: "${preset.color}"
    emissiveIntensity: 1.5
    blending: additive
    ` : effectType === 'smoke' ? `
    opacity: 0.6
    fadeOut: true
    ` : effectType === 'sparkle' ? `
    emissive: "${preset.color}"
    emissiveIntensity: 2.0
    blending: additive
    twinkle: true
    ` : ''}
    
    // Shape
    emitterShape: ${effectType === 'rain' || effectType === 'snow' ? 'box' : 'sphere'}
    emitterSize: [${params.spread || 1}, 0.1, ${params.spread || 1}]
  }
  
  ${effectType === 'fire' ? `
  // Fire light
  object "FireLight" {
    type: pointLight
    color: "#ff6600"
    intensity: 1.0
    distance: 5
  }
  
  every(50) {
    // Flicker light
    this.FireLight.intensity = 0.8 + Math.random() * 0.4
  }
  ` : effectType === 'magic' ? `
  // Magic glow
  object "MagicGlow" {
    type: pointLight
    color: "${preset.color}"
    intensity: 0.8
    distance: 4
  }
  
  every(50) {
    // Pulse glow
    this.MagicGlow.intensity = 0.6 + Math.sin(Date.now() * 0.005) * 0.4
  }
  ` : ''}
  
  action setIntensity(value) {
    this.intensity = value
    this.Emitter.count = value
  }
  
  action start() {
    this.isActive = true
    this.Emitter.enabled = true
  }
  
  action stop() {
    this.isActive = false
    this.Emitter.enabled = false
  }
  
  action burst(count = 50) {
    spawnParticleBurst(this.position, "${preset.color}", count)
  }
}

// Preset instances
${effectType === 'fire' ? `
template "Campfire" using "${params.name || 'ParticleEffect'}" {
  // Add logs
  object "Logs" {
    mesh: "environment/logs.glb"
    position: [0, -0.2, 0]
  }
  
  // Crackle sound
  on_spawn: () => {
    playSound("fire_crackle", { loop: true, volume: 0.5 })
  }
}

template "Torch" using "${params.name || 'ParticleEffect'}" {
  scale: [0.3, 0.3, 0.3]
  
  object "TorchHandle" {
    mesh: "items/torch.glb"
    position: [0, -0.5, 0]
  }
}
` : effectType === 'water' ? `
template "Fountain" using "${params.name || 'ParticleEffect'}" {
  object "Basin" {
    geometry: cylinder
    color: "#4a4a4a"
    scale: [2, 0.5, 2]
    position: [0, -0.25, 0]
  }
  
  on_spawn: () => {
    playSound("water_fountain", { loop: true, volume: 0.3 })
  }
}

template "Waterfall" using "${params.name || 'ParticleEffect'}" {
  Emitter.emitterShape: box
  Emitter.emitterSize: [3, 0.1, 0.5]
  Emitter.count: 200
  
  on_spawn: () => {
    playSound("waterfall", { loop: true, volume: 0.6 })
  }
}
` : ''}
`.trim();
  },
};

export const HazardZoneTemplate: Template = {
  name: 'Hazard Zone',
  description: 'Area-based hazard (lava, acid, electricity)',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Zone name', default: 'LavaPool' },
    { name: 'hazardType', type: 'select', description: 'Hazard type', default: 'lava', options: ['lava', 'acid', 'electricity', 'ice'] },
    { name: 'damage', type: 'number', description: 'DPS while inside', default: 10, min: 1, max: 50 },
    { name: 'width', type: 'number', description: 'Zone width', default: 5, min: 1, max: 20 },
    { name: 'depth', type: 'number', description: 'Zone depth', default: 5, min: 1, max: 20 },
  ],
  generate: (params) => {
    const hazardType = (params.hazardType as string) || 'lava';
    
    const hazardProps: Record<string, { color: string; emissive: string; effect: string }> = {
      lava: { color: '#ff4500', emissive: '#ff6600', effect: 'burn' },
      acid: { color: '#32cd32', emissive: '#00ff00', effect: 'poison' },
      electricity: { color: '#ffff00', emissive: '#ffffff', effect: 'shock' },
      ice: { color: '#00bfff', emissive: '#87ceeb', effect: 'freeze' },
    };
    
    const props = hazardProps[hazardType];
    
    return `
template "${params.name || 'LavaPool'}" {
  state {
    damage: ${params.damage || 10}
    hazardType: "${hazardType}"
    entitiesInside: new Set()
  }
  
  // Hazard surface
  object "Surface" {
    geometry: plane
    color: "${props.color}"
    emissive: "${props.emissive}"
    emissiveIntensity: 0.8
    scale: [${params.width || 5}, 1, ${params.depth || 5}]
    ${hazardType === 'lava' || hazardType === 'acid' ? `
    animated: true
    animationSpeed: 0.5
    ` : ''}
  }
  
  // Trigger volume
  object "TriggerZone" {
    type: trigger
    scale: [${params.width || 5}, 2, ${params.depth || 5}]
    visible: false
  }
  
  ${hazardType === 'lava' ? `
  // Lava bubbles
  object "Bubbles" {
    type: particleSystem
    color: "#ff6600"
    count: 20
    size: 0.3
    lifetime: 1000
    velocity: [0, 1, 0]
    spread: ${(params.width as number) / 2 || 2.5}
  }
  
  // Heat distortion light
  object "HeatLight" {
    type: pointLight
    color: "#ff4500"
    intensity: 1.5
    distance: 10
    position: [0, 1, 0]
  }
  ` : hazardType === 'electricity' ? `
  // Electric arcs
  every(200) {
    if (Math.random() < 0.3) {
      const x = (Math.random() - 0.5) * ${params.width || 5}
      const z = (Math.random() - 0.5) * ${params.depth || 5}
      spawnLightningArc([x, 0, z], [x + Math.random(), 1, z + Math.random()])
    }
  }
  
  object "ElectricLight" {
    type: pointLight
    color: "#ffff00"
    intensity: 1.0
    distance: 8
    position: [0, 0.5, 0]
  }
  ` : hazardType === 'ice' ? `
  // Frost particles
  object "FrostParticles" {
    type: particleSystem
    color: "#87ceeb"
    count: 30
    size: 0.1
    lifetime: 2000
    velocity: [0, 0.3, 0]
    spread: ${(params.width as number) / 2 || 2.5}
  }
  ` : `
  // Acid bubbles
  object "AcidBubbles" {
    type: particleSystem
    color: "#00ff00"
    count: 30
    size: 0.2
    lifetime: 800
    velocity: [0, 0.8, 0]
    spread: ${(params.width as number) / 2 || 2.5}
  }
  `}
  
  action applyHazardEffect(entity) {
    entity.takeDamage(this.damage * 0.1) // DPS converted to per-tick
    
    ${hazardType === 'lava' ? `
    entity.applyBurn(5, 2000)
    ` : hazardType === 'acid' ? `
    entity.applyPoison(3, 3000)
    ` : hazardType === 'electricity' ? `
    entity.applyShock(0.5) // Stun
    ` : `
    entity.applySlow(0.5, 2000) // 50% slow
    `}
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer || other.isNPC) {
      this.entitiesInside.add(other.id)
      emit("hazard:enter", { hazard: this, entity: other })
    }
  }
  
  on_trigger_exit: (other) => {
    this.entitiesInside.delete(other.id)
    emit("hazard:exit", { hazard: this, entity: other })
  }
  
  every(100) {
    for (const entityId of this.entitiesInside) {
      const entity = getObjectById(entityId)
      if (entity) {
        this.applyHazardEffect(entity)
      }
    }
    
    ${hazardType === 'electricity' ? `
    // Flicker light
    this.ElectricLight.intensity = 0.8 + Math.random() * 0.4
    ` : hazardType === 'lava' ? `
    // Pulse light
    this.HeatLight.intensity = 1.3 + Math.sin(Date.now() * 0.003) * 0.2
    ` : ''}
  }
}
`.trim();
  },
};

export const PlatformTemplate: Template = {
  name: 'Moving Platform',
  description: 'Platform that moves between waypoints',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Platform name', default: 'MovingPlatform' },
    { name: 'width', type: 'number', description: 'Platform width', default: 3, min: 1, max: 10 },
    { name: 'moveType', type: 'select', description: 'Movement pattern', default: 'linear', options: ['linear', 'circular', 'elevator'] },
    { name: 'distance', type: 'number', description: 'Travel distance', default: 5, min: 1, max: 20 },
    { name: 'speed', type: 'number', description: 'Movement speed', default: 2, min: 0.5, max: 10 },
  ],
  generate: (params) => {
    const moveType = (params.moveType as string) || 'linear';
    
    return `
template "${params.name || 'MovingPlatform'}" {
  state {
    moveType: "${moveType}"
    distance: ${params.distance || 5}
    speed: ${params.speed || 2}
    progress: 0
    direction: 1
    startPos: null
    ridingEntities: new Set()
  }
  
  // Platform surface
  object "Surface" {
    geometry: box
    color: "#4a5568"
    scale: [${params.width || 3}, 0.3, ${params.width || 3}]
  }
  
  // Edge indicators
  object "EdgeStripes" {
    geometry: box
    color: "#fbbf24"
    scale: [${params.width || 3}, 0.31, 0.1]
    position: [0, 0, ${(params.width as number) / 2 - 0.05 || 1.45}]
  }
  
  on_spawn: () => {
    this.startPos = this.position.clone()
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer || other.isNPC) {
      this.ridingEntities.add(other.id)
      other.parentTo(this) // Move with platform
    }
  }
  
  on_trigger_exit: (other) => {
    this.ridingEntities.delete(other.id)
    other.unparent()
  }
  
  every(16) { // ~60fps
    const dt = 0.016
    
    ${moveType === 'linear' ? `
    this.progress += this.speed * dt * this.direction
    
    if (this.progress >= this.distance) {
      this.progress = this.distance
      this.direction = -1
      playSound("platform_reverse")
    } else if (this.progress <= 0) {
      this.progress = 0
      this.direction = 1
      playSound("platform_reverse")
    }
    
    this.position.x = this.startPos.x + this.progress
    ` : moveType === 'circular' ? `
    this.progress += this.speed * dt * 0.5
    
    const radius = this.distance / 2
    this.position.x = this.startPos.x + Math.cos(this.progress) * radius
    this.position.z = this.startPos.z + Math.sin(this.progress) * radius
    ` : `
    // Elevator
    this.progress += this.speed * dt * this.direction
    
    if (this.progress >= this.distance) {
      this.progress = this.distance
      this.direction = -1
      // Wait at top
      await delay(2000)
    } else if (this.progress <= 0) {
      this.progress = 0
      this.direction = 1
      // Wait at bottom
      await delay(2000)
    }
    
    this.position.y = this.startPos.y + this.progress
    `}
  }
}
`.trim();
  },
};

export const LeverTemplate: Template = {
  name: 'Lever',
  description: 'Interactive lever switch for triggering events',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Lever name', default: 'Lever' },
    { name: 'targetId', type: 'string', description: 'Object to control', default: 'Door1' },
    { name: 'isToggle', type: 'boolean', description: 'Toggle or momentary', default: true },
    { name: 'requiresHold', type: 'boolean', description: 'Must hold to activate', default: false },
  ],
  generate: (params) => `
template "${params.name || 'Lever'}" {
  @interactive
  
  state {
    isOn: false
    targetId: "${params.targetId || 'Door1'}"
    isToggle: ${params.isToggle !== false}
    requiresHold: ${params.requiresHold || false}
    isHeld: false
  }
  
  // Base
  object "Base" {
    geometry: box
    color: "#4a4a4a"
    scale: [0.3, 0.2, 0.3]
    position: [0, 0.1, 0]
  }
  
  // Lever arm
  object "Arm" {
    geometry: cylinder
    color: "#8b4513"
    scale: [0.05, 0.4, 0.05]
    position: [0, 0.3, 0]
    pivot: [0, -0.2, 0]
    rotation: [0.5, 0, 0] // Start in off position
  }
  
  // Handle
  object "Handle" {
    geometry: sphere
    color: "#b22222"
    scale: [0.1, 0.1, 0.1]
    position: [0, 0.5, 0.15]
  }
  
  action activate() {
    if (this.isToggle) {
      this.isOn = !this.isOn
    } else {
      this.isOn = true
    }
    
    // Animate lever
    const targetAngle = this.isOn ? -0.5 : 0.5
    animate("Arm.rotation.x", targetAngle, 200)
    animate("Handle.position.z", this.isOn ? -0.15 : 0.15, 200)
    
    playSound("lever_pull")
    
    // Trigger target
    const target = getObject(this.targetId)
    if (target) {
      if (this.isOn) {
        target.activate?.() || target.open?.() || target.start?.()
      } else {
        target.deactivate?.() || target.close?.() || target.stop?.()
      }
    }
    
    emit("lever:toggled", { lever: this, isOn: this.isOn, target: this.targetId })
  }
  
  action deactivate() {
    if (!this.isToggle && this.isOn) {
      this.isOn = false
      animate("Arm.rotation.x", 0.5, 200)
      animate("Handle.position.z", 0.15, 200)
      
      const target = getObject(this.targetId)
      if (target) {
        target.deactivate?.() || target.close?.() || target.stop?.()
      }
      
      emit("lever:toggled", { lever: this, isOn: false, target: this.targetId })
    }
  }
  
  on_interact: () => {
    if (this.requiresHold) {
      this.isHeld = true
      this.activate()
    } else {
      this.activate()
    }
  }
  
  on_interact_end: () => {
    if (this.requiresHold) {
      this.isHeld = false
      this.deactivate()
    }
  }
}
`.trim(),
};

export const PressurePlateTemplate: Template = {
  name: 'Pressure Plate',
  description: 'Floor trigger activated by weight',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Plate name', default: 'PressurePlate' },
    { name: 'targetId', type: 'string', description: 'Object to control', default: 'Door1' },
    { name: 'requireWeight', type: 'number', description: 'Min weight to trigger', default: 1, min: 0, max: 100 },
    { name: 'stayActive', type: 'boolean', description: 'Stay active after triggered', default: false },
  ],
  generate: (params) => `
template "${params.name || 'PressurePlate'}" {
  state {
    isPressed: false
    targetId: "${params.targetId || 'Door1'}"
    requireWeight: ${params.requireWeight || 1}
    stayActive: ${params.stayActive || false}
    entitiesOn: new Map() // id -> weight
  }
  
  // Plate surface
  object "Plate" {
    geometry: box
    color: "#696969"
    scale: [1, 0.1, 1]
    position: [0, 0.05, 0]
  }
  
  // Edge trim
  object "Edge" {
    geometry: box
    color: "#4a4a4a"
    scale: [1.1, 0.05, 1.1]
    position: [0, 0, 0]
  }
  
  action updateState() {
    let totalWeight = 0
    for (const weight of this.entitiesOn.values()) {
      totalWeight += weight
    }
    
    const shouldBePressed = totalWeight >= this.requireWeight
    
    if (shouldBePressed && !this.isPressed) {
      this.press()
    } else if (!shouldBePressed && this.isPressed && !this.stayActive) {
      this.release()
    }
  }
  
  action press() {
    this.isPressed = true
    
    animate("Plate.position.y", 0.02, 100)
    animate("Plate.color", "#228b22", 100)
    playSound("plate_press")
    
    const target = getObject(this.targetId)
    if (target) {
      target.activate?.() || target.open?.() || target.start?.()
    }
    
    emit("plate:pressed", { plate: this, target: this.targetId })
  }
  
  action release() {
    this.isPressed = false
    
    animate("Plate.position.y", 0.05, 100)
    animate("Plate.color", "#696969", 100)
    playSound("plate_release")
    
    const target = getObject(this.targetId)
    if (target) {
      target.deactivate?.() || target.close?.() || target.stop?.()
    }
    
    emit("plate:released", { plate: this, target: this.targetId })
  }
  
  on_trigger_enter: (other) => {
    const weight = other.mass || (other.isPlayer ? 1 : 0.5)
    this.entitiesOn.set(other.id, weight)
    this.updateState()
  }
  
  on_trigger_exit: (other) => {
    this.entitiesOn.delete(other.id)
    this.updateState()
  }
}
`.trim(),
};

// ============================================================================
// Extended UI Components
// ============================================================================

export const InventoryPanelTemplate: Template = {
  name: 'Inventory Panel',
  description: 'Grid-based inventory UI with item slots',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Panel name', default: 'InventoryPanel' },
    { name: 'rows', type: 'number', description: 'Grid rows', default: 4, min: 1, max: 10 },
    { name: 'cols', type: 'number', description: 'Grid columns', default: 6, min: 1, max: 12 },
    { name: 'slotSize', type: 'number', description: 'Slot size pixels', default: 64, min: 32, max: 128 },
  ],
  generate: (params) => `
template "${params.name || 'InventoryPanel'}" {
  @ui
  
  state {
    isOpen: false
    rows: ${params.rows || 4}
    cols: ${params.cols || 6}
    slotSize: ${params.slotSize || 64}
    slots: []
    selectedSlot: null
    draggedItem: null
  }
  
  style {
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    background: rgba(0, 0, 0, 0.9)
    border: 2px solid #4a5568
    borderRadius: 8px
    padding: 16px
    display: none
  }
  
  object "Header" {
    @ui
    style {
      display: flex
      justifyContent: space-between
      alignItems: center
      marginBottom: 12px
    }
    
    object "Title" {
      @ui
      text: "Inventory"
      style { color: #fff, fontSize: 18px, fontWeight: bold }
    }
    
    object "CloseBtn" {
      @ui
      text: "✕"
      style { 
        color: #999
        cursor: pointer
        fontSize: 20px
      }
      on_click: () => this.parent.parent.close()
    }
  }
  
  object "Grid" {
    @ui
    style {
      display: grid
      gridTemplateColumns: repeat(${params.cols || 6}, ${params.slotSize || 64}px)
      gap: 4px
    }
  }
  
  action initialize() {
    const totalSlots = this.rows * this.cols
    for (let i = 0; i < totalSlots; i++) {
      this.slots.push({ index: i, item: null, count: 0 })
      this.Grid.appendChild(createSlotElement(i))
    }
  }
  
  action open() {
    this.isOpen = true
    this.style.display = "block"
    playSound("ui_open")
    emit("inventory:opened")
  }
  
  action close() {
    this.isOpen = false
    this.style.display = "none"
    playSound("ui_close")
    emit("inventory:closed")
  }
  
  action toggle() {
    if (this.isOpen) this.close()
    else this.open()
  }
  
  action addItem(item, count = 1) {
    // Find existing stack or empty slot
    let slot = this.slots.find(s => s.item?.id === item.id && s.count < item.maxStack)
    if (!slot) {
      slot = this.slots.find(s => s.item === null)
    }
    
    if (slot) {
      slot.item = item
      slot.count += count
      this.updateSlotDisplay(slot.index)
      emit("inventory:itemAdded", { item, count, slot: slot.index })
      return true
    }
    
    showNotification("Inventory Full!", "#ef4444")
    return false
  }
  
  action removeItem(slotIndex, count = 1) {
    const slot = this.slots[slotIndex]
    if (!slot?.item) return null
    
    const item = slot.item
    slot.count -= count
    
    if (slot.count <= 0) {
      slot.item = null
      slot.count = 0
    }
    
    this.updateSlotDisplay(slotIndex)
    emit("inventory:itemRemoved", { item, count, slot: slotIndex })
    return item
  }
  
  on_spawn: () => this.initialize()
}
`.trim(),
};

export const MinimapTemplate: Template = {
  name: 'Minimap',
  description: 'Corner minimap showing player and points of interest',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Minimap name', default: 'Minimap' },
    { name: 'size', type: 'number', description: 'Map size pixels', default: 200, min: 100, max: 400 },
    { name: 'zoom', type: 'number', description: 'Zoom level', default: 1, min: 0.5, max: 3 },
    { name: 'showNPCs', type: 'boolean', description: 'Show NPCs', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Minimap'}" {
  @ui
  
  state {
    size: ${params.size || 200}
    zoom: ${params.zoom || 1}
    showNPCs: ${params.showNPCs !== false}
    markers: new Map()
  }
  
  style {
    position: fixed
    top: 16px
    right: 16px
    width: ${params.size || 200}px
    height: ${params.size || 200}px
    borderRadius: 50%
    border: 3px solid #4a5568
    background: rgba(0, 0, 0, 0.7)
    overflow: hidden
  }
  
  object "MapSurface" {
    @ui
    style { width: 100%, height: 100%, position: relative }
  }
  
  object "PlayerMarker" {
    @ui
    style {
      position: absolute
      top: 50%
      left: 50%
      width: 10px
      height: 10px
      background: #22c55e
      borderRadius: 50%
      transform: translate(-50%, -50%)
      zIndex: 10
    }
  }
  
  object "DirectionIndicator" {
    @ui
    style {
      position: absolute
      top: 45%
      left: 50%
      width: 0
      height: 0
      borderLeft: 5px solid transparent
      borderRight: 5px solid transparent
      borderBottom: 10px solid #22c55e
      transformOrigin: center bottom
    }
  }
  
  action addMarker(id, worldPos, color = "#ff0000", icon = "circle") {
    this.markers.set(id, { worldPos, color, icon })
  }
  
  action removeMarker(id) {
    this.markers.delete(id)
  }
  
  action worldToMap(worldPos) {
    const player = getPlayer()
    const relX = (worldPos.x - player.position.x) * this.zoom
    const relZ = (worldPos.z - player.position.z) * this.zoom
    
    return {
      x: (this.size / 2) + relX,
      y: (this.size / 2) + relZ
    }
  }
  
  every(100) {
    const player = getPlayer()
    if (!player) return
    
    // Update direction indicator
    this.DirectionIndicator.style.transform = \`translate(-50%, 0) rotate(\${-player.rotation.y}rad)\`
    
    // Update markers
    for (const [id, marker] of this.markers) {
      const mapPos = this.worldToMap(marker.worldPos)
      // Update or create marker element
    }
    
    // Update NPC markers
    if (this.showNPCs) {
      for (const npc of getNPCs()) {
        const mapPos = this.worldToMap(npc.position)
        // Show red dot for enemies, yellow for neutrals
      }
    }
  }
}
`.trim(),
};

export const ChatBubbleTemplate: Template = {
  name: 'Chat Bubble',
  description: 'Floating speech bubble above entities',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Bubble name', default: 'ChatBubble' },
    { name: 'maxWidth', type: 'number', description: 'Max width pixels', default: 200, min: 100, max: 400 },
    { name: 'duration', type: 'number', description: 'Display time ms', default: 3000, min: 1000, max: 10000 },
    { name: 'fadeOut', type: 'boolean', description: 'Fade out animation', default: true },
  ],
  generate: (params) => `
template "${params.name || 'ChatBubble'}" {
  @billboard
  
  state {
    text: ""
    maxWidth: ${params.maxWidth || 200}
    duration: ${params.duration || 3000}
    fadeOut: ${params.fadeOut !== false}
    hideTimer: null
  }
  
  object "Bubble" {
    @ui
    style {
      background: rgba(255, 255, 255, 0.95)
      borderRadius: 12px
      padding: 8px 12px
      maxWidth: ${params.maxWidth || 200}px
      boxShadow: 0 2px 8px rgba(0,0,0,0.2)
    }
    
    object "Text" {
      @ui
      style {
        color: #1a1a1a
        fontSize: 14px
        lineHeight: 1.4
      }
    }
    
    object "Tail" {
      @ui
      style {
        position: absolute
        bottom: -8px
        left: 50%
        transform: translateX(-50%)
        width: 0
        height: 0
        borderLeft: 8px solid transparent
        borderRight: 8px solid transparent
        borderTop: 8px solid rgba(255, 255, 255, 0.95)
      }
    }
  }
  
  action show(text, duration = this.duration) {
    this.text = text
    this.Bubble.Text.textContent = text
    this.visible = true
    this.Bubble.style.opacity = 1
    
    if (this.hideTimer) clearTimeout(this.hideTimer)
    
    this.hideTimer = setTimeout(() => {
      this.hide()
    }, duration)
  }
  
  action hide() {
    if (this.fadeOut) {
      animate("Bubble.style.opacity", 0, 300)
      await delay(300)
    }
    this.visible = false
  }
  
  action typewriter(text, charDelay = 30) {
    this.visible = true
    this.Bubble.Text.textContent = ""
    
    for (let i = 0; i < text.length; i++) {
      await delay(charDelay)
      this.Bubble.Text.textContent += text[i]
    }
    
    this.hideTimer = setTimeout(() => this.hide(), this.duration)
  }
}
`.trim(),
};

export const ScoreDisplayTemplate: Template = {
  name: 'Score Display',
  description: 'Animated score counter UI',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Display name', default: 'ScoreDisplay' },
    { name: 'label', type: 'string', description: 'Score label', default: 'SCORE' },
    { name: 'animate', type: 'boolean', description: 'Animate changes', default: true },
  ],
  generate: (params) => `
template "${params.name || 'ScoreDisplay'}" {
  @ui
  
  state {
    score: 0
    displayScore: 0
    highScore: 0
    multiplier: 1
    animate: ${params.animate !== false}
  }
  
  style {
    position: fixed
    top: 16px
    left: 16px
    fontFamily: monospace
  }
  
  object "Label" {
    @ui
    text: "${params.label || 'SCORE'}"
    style { color: #888, fontSize: 12px, letterSpacing: 2px }
  }
  
  object "Value" {
    @ui
    style { 
      color: #fff
      fontSize: 32px
      fontWeight: bold
      textShadow: 0 0 10px rgba(255,255,255,0.5)
    }
  }
  
  object "Multiplier" {
    @ui
    style { 
      color: #fbbf24
      fontSize: 16px
      marginLeft: 8px
      opacity: 0
    }
  }
  
  action add(points) {
    const gained = points * this.multiplier
    this.score += gained
    
    if (this.score > this.highScore) {
      this.highScore = this.score
    }
    
    emit("score:changed", { score: this.score, gained: gained })
    
    // Pop animation
    animate("Value.style.transform", "scale(1.2)", 100)
    await delay(100)
    animate("Value.style.transform", "scale(1)", 100)
  }
  
  action setMultiplier(mult) {
    this.multiplier = mult
    this.Multiplier.textContent = "x" + mult
    
    if (mult > 1) {
      animate("Multiplier.style.opacity", 1, 200)
    } else {
      animate("Multiplier.style.opacity", 0, 200)
    }
  }
  
  action reset() {
    this.score = 0
    this.displayScore = 0
    this.multiplier = 1
  }
  
  every(16) {
    if (this.animate && this.displayScore !== this.score) {
      const diff = this.score - this.displayScore
      this.displayScore += Math.ceil(diff * 0.1)
      if (Math.abs(diff) < 1) this.displayScore = this.score
    } else {
      this.displayScore = this.score
    }
    
    this.Value.textContent = this.displayScore.toLocaleString()
  }
}
`.trim(),
};

export const TimerDisplayTemplate: Template = {
  name: 'Timer Display',
  description: 'Countdown or count-up timer UI',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Timer name', default: 'Timer' },
    { name: 'mode', type: 'select', description: 'Timer mode', default: 'countdown', options: ['countdown', 'countup', 'stopwatch'] },
    { name: 'initialTime', type: 'number', description: 'Initial time (seconds)', default: 60, min: 0, max: 3600 },
  ],
  generate: (params) => `
template "${params.name || 'Timer'}" {
  @ui
  
  state {
    mode: "${params.mode || 'countdown'}"
    time: ${params.initialTime || 60}
    initialTime: ${params.initialTime || 60}
    isRunning: false
    isPaused: false
  }
  
  style {
    position: fixed
    top: 16px
    left: 50%
    transform: translateX(-50%)
    fontFamily: monospace
    textAlign: center
  }
  
  object "Display" {
    @ui
    style {
      color: #fff
      fontSize: 48px
      fontWeight: bold
      textShadow: 0 0 20px rgba(255,255,255,0.3)
    }
  }
  
  action start() {
    this.isRunning = true
    this.isPaused = false
    emit("timer:started", { time: this.time })
  }
  
  action pause() {
    this.isPaused = true
    emit("timer:paused", { time: this.time })
  }
  
  action resume() {
    this.isPaused = false
    emit("timer:resumed", { time: this.time })
  }
  
  action stop() {
    this.isRunning = false
    emit("timer:stopped", { time: this.time })
  }
  
  action reset() {
    this.time = this.initialTime
    this.isRunning = false
    this.isPaused = false
    this.updateDisplay()
  }
  
  action addTime(seconds) {
    this.time += seconds
    if (this.time < 0) this.time = 0
  }
  
  action formatTime(t) {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 100)
    
    if (this.mode === "stopwatch") {
      return mins.toString().padStart(2, "0") + ":" + 
             secs.toString().padStart(2, "0") + "." + 
             ms.toString().padStart(2, "0")
    }
    return mins.toString().padStart(2, "0") + ":" + 
           secs.toString().padStart(2, "0")
  }
  
  action updateDisplay() {
    this.Display.textContent = this.formatTime(this.time)
    
    // Warning colors for countdown
    if (this.mode === "countdown") {
      if (this.time <= 10) {
        this.Display.style.color = "#ef4444"
        if (this.time <= 5) {
          animate("Display.style.transform", "scale(1.1)", 100)
          await delay(100)
          animate("Display.style.transform", "scale(1)", 100)
        }
      } else if (this.time <= 30) {
        this.Display.style.color = "#fbbf24"
      } else {
        this.Display.style.color = "#fff"
      }
    }
  }
  
  every(this.mode === "stopwatch" ? 10 : 1000) {
    if (!this.isRunning || this.isPaused) return
    
    if (this.mode === "countdown") {
      this.time -= 1
      if (this.time <= 0) {
        this.time = 0
        this.stop()
        emit("timer:finished")
        playSound("timer_end")
      }
    } else {
      this.time += this.mode === "stopwatch" ? 0.01 : 1
    }
    
    this.updateDisplay()
  }
  
  on_spawn: () => this.updateDisplay()
}
`.trim(),
};

export const NotificationToastTemplate: Template = {
  name: 'Notification Toast',
  description: 'Pop-up notification messages',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Toast name', default: 'NotificationToast' },
    { name: 'position', type: 'select', description: 'Screen position', default: 'top-right', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center'] },
    { name: 'duration', type: 'number', description: 'Display time ms', default: 3000, min: 1000, max: 10000 },
  ],
  generate: (params) => {
    const pos = (params.position as string) || 'top-right';
    const posStyles: Record<string, string> = {
      'top-left': 'top: 16px; left: 16px;',
      'top-right': 'top: 16px; right: 16px;',
      'bottom-left': 'bottom: 16px; left: 16px;',
      'bottom-right': 'bottom: 16px; right: 16px;',
      'top-center': 'top: 16px; left: 50%; transform: translateX(-50%);',
    };
    
    return `
template "${params.name || 'NotificationToast'}" {
  @ui
  
  state {
    queue: []
    duration: ${params.duration || 3000}
  }
  
  style {
    position: fixed
    ${posStyles[pos]}
    display: flex
    flexDirection: column
    gap: 8px
    zIndex: 1000
  }
  
  action show(message, type = "info", duration = this.duration) {
    const toast = {
      id: Date.now(),
      message,
      type,
      duration
    }
    
    this.queue.push(toast)
    this.renderToast(toast)
    
    setTimeout(() => this.dismiss(toast.id), duration)
  }
  
  action success(message) { this.show(message, "success") }
  action error(message) { this.show(message, "error") }
  action warning(message) { this.show(message, "warning") }
  action info(message) { this.show(message, "info") }
  
  action renderToast(toast) {
    const colors = {
      success: { bg: "#22c55e", icon: "✓" },
      error: { bg: "#ef4444", icon: "✕" },
      warning: { bg: "#fbbf24", icon: "⚠" },
      info: { bg: "#3b82f6", icon: "ℹ" }
    }
    
    const config = colors[toast.type] || colors.info
    
    const el = createElement("div", {
      id: "toast-" + toast.id,
      style: {
        background: config.bg,
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        animation: "slideIn 0.3s ease"
      }
    })
    
    el.innerHTML = config.icon + " " + toast.message
    this.appendChild(el)
  }
  
  action dismiss(id) {
    const el = this.querySelector("#toast-" + id)
    if (el) {
      animate(el, "opacity", 0, 200)
      await delay(200)
      el.remove()
    }
    
    this.queue = this.queue.filter(t => t.id !== id)
  }
}
`.trim();
  },
};

// ============================================================================
// Dialogue & Story Templates
// ============================================================================

export const DialogueTreeTemplate: Template = {
  name: 'Dialogue Tree',
  description: 'Branching dialogue system with choices',
  category: 'system',
  parameters: [
    { name: 'name', type: 'string', description: 'Dialogue name', default: 'DialogueSystem' },
    { name: 'typewriterSpeed', type: 'number', description: 'Text speed (ms per char)', default: 30, min: 10, max: 100 },
  ],
  generate: (params) => `
system ${params.name || 'DialogueSystem'} {
  state {
    isActive: false
    currentNode: null
    dialogueData: new Map()
    variables: {}
    history: []
    typewriterSpeed: ${params.typewriterSpeed || 30}
  }
  
  action registerDialogue(id, nodes) {
    state.dialogueData.set(id, nodes)
  }
  
  action start(dialogueId, startNode = "start") {
    const dialogue = state.dialogueData.get(dialogueId)
    if (!dialogue) return
    
    state.isActive = true
    state.history = []
    
    emit("dialogue:started", { id: dialogueId })
    this.goToNode(dialogueId, startNode)
  }
  
  action goToNode(dialogueId, nodeId) {
    const dialogue = state.dialogueData.get(dialogueId)
    const node = dialogue[nodeId]
    
    if (!node) {
      this.end()
      return
    }
    
    state.currentNode = { dialogueId, nodeId, ...node }
    state.history.push(nodeId)
    
    // Show dialogue UI
    DialogueUI.show({
      speaker: node.speaker,
      text: node.text,
      choices: node.choices || [],
      portrait: node.portrait
    })
    
    // Execute any actions
    if (node.action) {
      node.action(state.variables)
    }
    
    emit("dialogue:node", { dialogueId, nodeId, node })
  }
  
  action selectChoice(index) {
    const node = state.currentNode
    if (!node?.choices?.[index]) return
    
    const choice = node.choices[index]
    
    // Update variables
    if (choice.setVar) {
      Object.assign(state.variables, choice.setVar)
    }
    
    emit("dialogue:choice", { choice: choice, index: index })
    
    if (choice.next) {
      this.goToNode(node.dialogueId, choice.next)
    } else {
      this.end()
    }
  }
  
  action end() {
    state.isActive = false
    state.currentNode = null
    DialogueUI.hide()
    emit("dialogue:ended")
  }
  
  action setVariable(key, value) {
    state.variables[key] = value
  }
  
  action getVariable(key) {
    return state.variables[key]
  }
}

// Example dialogue data:
// DialogueSystem.registerDialogue("npc_merchant", {
//   start: {
//     speaker: "Merchant",
//     text: "Welcome, traveler! What can I do for you?",
//     choices: [
//       { text: "Show me your wares", next: "shop" },
//       { text: "Any news?", next: "rumors" },
//       { text: "Goodbye", next: null }
//     ]
//   },
//   shop: { ... },
//   rumors: { ... }
// })
`.trim(),
};

export const CutsceneTemplate: Template = {
  name: 'Cutscene',
  description: 'Scripted cutscene with camera movements and actions',
  category: 'system',
  parameters: [
    { name: 'name', type: 'string', description: 'Cutscene name', default: 'Cutscene' },
    { name: 'skipEnabled', type: 'boolean', description: 'Allow skipping', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Cutscene'}" {
  state {
    isPlaying: false
    currentStep: 0
    steps: []
    skipEnabled: ${params.skipEnabled !== false}
    savedCameraPos: null
  }
  
  action define(steps) {
    this.steps = steps
  }
  
  action play() {
    if (this.isPlaying) return
    
    this.isPlaying = true
    this.currentStep = 0
    
    // Save camera state
    const camera = getCamera()
    this.savedCameraPos = camera.position.clone()
    this.savedCameraRot = camera.rotation.clone()
    
    // Disable player controls
    getPlayer().controlsEnabled = false
    
    // Show cinematic bars
    showCinematicBars()
    
    emit("cutscene:started", { cutscene: this })
    
    await this.executeSteps()
  }
  
  async action executeSteps() {
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.isPlaying) break
      
      this.currentStep = i
      const step = this.steps[i]
      
      switch (step.type) {
        case "camera":
          await this.cameraMove(step)
          break
        case "dialogue":
          await this.showDialogue(step)
          break
        case "wait":
          await delay(step.duration)
          break
        case "action":
          await step.execute()
          break
        case "fadeIn":
          await fadeIn(step.duration || 500)
          break
        case "fadeOut":
          await fadeOut(step.duration || 500)
          break
      }
    }
    
    this.end()
  }
  
  async action cameraMove(step) {
    const camera = getCamera()
    
    if (step.position) {
      animate(camera, "position", step.position, step.duration || 1000)
    }
    if (step.lookAt) {
      const target = typeof step.lookAt === "string" 
        ? getObject(step.lookAt).position 
        : step.lookAt
      animateLookAt(camera, target, step.duration || 1000)
    }
    
    await delay(step.duration || 1000)
  }
  
  async action showDialogue(step) {
    return new Promise(resolve => {
      DialogueUI.show({
        speaker: step.speaker,
        text: step.text,
        portrait: step.portrait,
        onComplete: resolve
      })
    })
  }
  
  action skip() {
    if (!this.skipEnabled || !this.isPlaying) return
    this.end()
  }
  
  action end() {
    this.isPlaying = false
    
    // Restore camera
    const camera = getCamera()
    camera.position.copy(this.savedCameraPos)
    camera.rotation.copy(this.savedCameraRot)
    
    // Re-enable player
    getPlayer().controlsEnabled = true
    
    // Hide cinematic bars
    hideCinematicBars()
    
    emit("cutscene:ended", { cutscene: this })
  }
}
`.trim(),
};

// ============================================================================
// Camera & View Templates
// ============================================================================

export const CameraControllerTemplate: Template = {
  name: 'Camera Controller',
  description: 'Configurable camera follow and orbit system',
  category: 'system',
  parameters: [
    { name: 'name', type: 'string', description: 'Controller name', default: 'CameraController' },
    { name: 'mode', type: 'select', description: 'Camera mode', default: 'thirdPerson', options: ['firstPerson', 'thirdPerson', 'topDown', 'isometric', 'orbit'] },
    { name: 'distance', type: 'number', description: 'Follow distance', default: 5, min: 1, max: 20 },
    { name: 'smoothing', type: 'number', description: 'Movement smoothing', default: 0.1, min: 0.01, max: 1 },
  ],
  generate: (params) => `
system ${params.name || 'CameraController'} {
  state {
    mode: "${params.mode || 'thirdPerson'}"
    target: null
    distance: ${params.distance || 5}
    height: 2
    smoothing: ${params.smoothing || 0.1}
    orbitAngle: 0
    orbitPitch: 0.3
    minPitch: -1.2
    maxPitch: 1.2
    minDistance: 2
    maxDistance: 15
    isLocked: false
  }
  
  action setTarget(target) {
    state.target = target
  }
  
  action setMode(mode) {
    state.mode = mode
    
    // Reset camera for mode
    switch (mode) {
      case "topDown":
        state.height = 15
        state.orbitPitch = 1.5
        break
      case "isometric":
        state.height = 10
        state.orbitPitch = 0.8
        state.orbitAngle = 0.785 // 45 degrees
        break
      case "firstPerson":
        state.distance = 0
        state.height = 1.6
        break
      default:
        state.distance = ${params.distance || 5}
        state.height = 2
    }
  }
  
  action orbit(deltaX, deltaY) {
    if (state.isLocked) return
    
    state.orbitAngle += deltaX * 0.005
    state.orbitPitch = Math.max(state.minPitch, 
      Math.min(state.maxPitch, state.orbitPitch + deltaY * 0.005))
  }
  
  action zoom(delta) {
    if (state.isLocked) return
    
    state.distance = Math.max(state.minDistance,
      Math.min(state.maxDistance, state.distance + delta))
  }
  
  action shake(intensity = 0.5, duration = 500) {
    const camera = getCamera()
    const originalPos = camera.position.clone()
    
    const startTime = Date.now()
    
    const shakeLoop = () => {
      const elapsed = Date.now() - startTime
      if (elapsed >= duration) {
        camera.position.copy(originalPos)
        return
      }
      
      const decay = 1 - (elapsed / duration)
      camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity * decay
      camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity * decay
      
      requestAnimationFrame(shakeLoop)
    }
    
    shakeLoop()
  }
  
  every(16) {
    if (!state.target) return
    
    const camera = getCamera()
    const target = state.target
    
    let desiredPos
    
    switch (state.mode) {
      case "firstPerson":
        desiredPos = target.position.clone()
        desiredPos.y += state.height
        camera.rotation.copy(target.rotation)
        break
        
      case "thirdPerson":
      case "orbit":
        const offset = [
          Math.sin(state.orbitAngle) * Math.cos(state.orbitPitch) * state.distance,
          Math.sin(state.orbitPitch) * state.distance + state.height,
          Math.cos(state.orbitAngle) * Math.cos(state.orbitPitch) * state.distance
        ]
        desiredPos = target.position.clone().add(offset)
        break
        
      case "topDown":
        desiredPos = target.position.clone()
        desiredPos.y += state.height
        break
        
      case "isometric":
        const isoOffset = [
          Math.sin(state.orbitAngle) * state.distance,
          state.height,
          Math.cos(state.orbitAngle) * state.distance
        ]
        desiredPos = target.position.clone().add(isoOffset)
        break
    }
    
    // Smooth interpolation
    camera.position.lerp(desiredPos, state.smoothing)
    
    // Look at target (except first person)
    if (state.mode !== "firstPerson") {
      const lookTarget = target.position.clone()
      lookTarget.y += 1
      camera.lookAt(lookTarget)
    }
  }
}
`.trim(),
};

export const CameraZoneTemplate: Template = {
  name: 'Camera Zone',
  description: 'Trigger area that changes camera behavior',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Zone name', default: 'CameraZone' },
    { name: 'cameraMode', type: 'select', description: 'Camera mode', default: 'fixed', options: ['fixed', 'follow', 'pan', 'zoom'] },
    { name: 'transitionTime', type: 'number', description: 'Transition ms', default: 1000, min: 100, max: 5000 },
  ],
  generate: (params) => `
template "${params.name || 'CameraZone'}" {
  state {
    cameraMode: "${params.cameraMode || 'fixed'}"
    transitionTime: ${params.transitionTime || 1000}
    fixedPosition: [0, 5, 10]
    fixedLookAt: [0, 0, 0]
    previousSettings: null
  }
  
  // Invisible trigger volume
  object "TriggerVolume" {
    type: trigger
    visible: false
  }
  
  on_trigger_enter: (other) => {
    if (!other.isPlayer) return
    
    // Save current camera settings
    this.previousSettings = CameraController.getSettings()
    
    switch (this.cameraMode) {
      case "fixed":
        CameraController.setMode("fixed")
        animateCamera(this.fixedPosition, this.fixedLookAt, this.transitionTime)
        break
        
      case "follow":
        CameraController.setMode("follow")
        CameraController.setDistance(10)
        break
        
      case "pan":
        CameraController.isLocked = true
        break
        
      case "zoom":
        CameraController.zoom(-3)
        break
    }
    
    emit("camera:zone_enter", { zone: this })
  }
  
  on_trigger_exit: (other) => {
    if (!other.isPlayer) return
    
    // Restore previous settings
    if (this.previousSettings) {
      CameraController.applySettings(this.previousSettings, this.transitionTime)
    }
    
    emit("camera:zone_exit", { zone: this })
  }
}
`.trim(),
};

// ============================================================================
// Audio & Ambient Templates
// ============================================================================

export const AmbientSoundTemplate: Template = {
  name: 'Ambient Sound',
  description: 'Continuous background audio',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Sound name', default: 'AmbientSound' },
    { name: 'sound', type: 'string', description: 'Sound file', default: 'ambient/forest.mp3' },
    { name: 'volume', type: 'number', description: 'Volume', default: 0.5, min: 0, max: 1 },
    { name: 'fadeIn', type: 'number', description: 'Fade in ms', default: 2000, min: 0, max: 10000 },
  ],
  generate: (params) => `
template "${params.name || 'AmbientSound'}" {
  state {
    sound: "${params.sound || 'ambient/forest.mp3'}"
    volume: ${params.volume || 0.5}
    fadeTime: ${params.fadeIn || 2000}
    isPlaying: false
    audioInstance: null
  }
  
  action play() {
    if (this.isPlaying) return
    
    this.audioInstance = playSound(this.sound, {
      loop: true,
      volume: 0
    })
    
    this.isPlaying = true
    
    // Fade in
    animateVolume(this.audioInstance, this.volume, this.fadeTime)
    
    emit("ambient:started", { sound: this.sound })
  }
  
  action stop() {
    if (!this.isPlaying) return
    
    // Fade out
    animateVolume(this.audioInstance, 0, this.fadeTime)
    
    setTimeout(() => {
      this.audioInstance?.stop()
      this.audioInstance = null
      this.isPlaying = false
    }, this.fadeTime)
    
    emit("ambient:stopped", { sound: this.sound })
  }
  
  action setVolume(vol) {
    this.volume = vol
    if (this.audioInstance) {
      this.audioInstance.volume = vol
    }
  }
  
  on_spawn: () => this.play()
  on_destroy: () => this.stop()
}
`.trim(),
};

export const MusicZoneTemplate: Template = {
  name: 'Music Zone',
  description: 'Area trigger that changes background music',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Zone name', default: 'MusicZone' },
    { name: 'track', type: 'string', description: 'Music track', default: 'music/exploration.mp3' },
    { name: 'crossfade', type: 'number', description: 'Crossfade ms', default: 2000, min: 0, max: 5000 },
  ],
  generate: (params) => `
template "${params.name || 'MusicZone'}" {
  state {
    track: "${params.track || 'music/exploration.mp3'}"
    crossfadeTime: ${params.crossfade || 2000}
    previousTrack: null
  }
  
  // Invisible trigger
  object "Zone" {
    type: trigger
    visible: false
  }
  
  on_trigger_enter: (other) => {
    if (!other.isPlayer) return
    
    this.previousTrack = MusicManager.getCurrentTrack()
    MusicManager.crossfadeTo(this.track, this.crossfadeTime)
    
    emit("music:zone_enter", { track: this.track })
  }
  
  on_trigger_exit: (other) => {
    if (!other.isPlayer) return
    
    if (this.previousTrack) {
      MusicManager.crossfadeTo(this.previousTrack, this.crossfadeTime)
    }
    
    emit("music:zone_exit", { track: this.track })
  }
}
`.trim(),
};

export const SoundTriggerTemplate: Template = {
  name: 'Sound Trigger',
  description: 'One-shot sound played on trigger',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Trigger name', default: 'SoundTrigger' },
    { name: 'sound', type: 'string', description: 'Sound file', default: 'sfx/woosh.mp3' },
    { name: 'volume', type: 'number', description: 'Volume', default: 1, min: 0, max: 1 },
    { name: 'cooldown', type: 'number', description: 'Cooldown ms', default: 1000, min: 0, max: 10000 },
    { name: 'spatial', type: 'boolean', description: '3D spatial audio', default: true },
  ],
  generate: (params) => `
template "${params.name || 'SoundTrigger'}" {
  state {
    sound: "${params.sound || 'sfx/woosh.mp3'}"
    volume: ${params.volume || 1}
    cooldown: ${params.cooldown || 1000}
    spatial: ${params.spatial !== false}
    lastPlayed: 0
  }
  
  object "TriggerZone" {
    type: trigger
    visible: false
  }
  
  action play() {
    const now = Date.now()
    if (now - this.lastPlayed < this.cooldown) return
    
    this.lastPlayed = now
    
    if (this.spatial) {
      playSpatialSound(this.sound, this.position, {
        volume: this.volume,
        rolloff: 1
      })
    } else {
      playSound(this.sound, { volume: this.volume })
    }
    
    emit("sound:triggered", { sound: this.sound, position: this.position })
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer) {
      this.play()
    }
  }
}
`.trim(),
};

// ============================================================================
// Weather & Atmosphere Templates
// ============================================================================

export const WeatherSystemTemplate: Template = {
  name: 'Weather System',
  description: 'Dynamic weather with rain, snow, and effects',
  category: 'system',
  parameters: [
    { name: 'name', type: 'string', description: 'System name', default: 'WeatherSystem' },
    { name: 'startWeather', type: 'select', description: 'Initial weather', default: 'clear', options: ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'] },
  ],
  generate: (params) => `
system ${params.name || 'WeatherSystem'} {
  state {
    current: "${params.startWeather || 'clear'}"
    intensity: 1.0
    windDirection: [1, 0, 0]
    windSpeed: 0
    transitionProgress: 0
  }
  
  const weatherPresets = {
    clear: {
      skyColor: "#87ceeb",
      ambientLight: 1.0,
      fogDensity: 0,
      precipitation: null
    },
    cloudy: {
      skyColor: "#708090",
      ambientLight: 0.6,
      fogDensity: 0.001,
      precipitation: null
    },
    rain: {
      skyColor: "#4a5568",
      ambientLight: 0.4,
      fogDensity: 0.003,
      precipitation: "rain"
    },
    storm: {
      skyColor: "#2d3748",
      ambientLight: 0.2,
      fogDensity: 0.005,
      precipitation: "rain",
      lightning: true
    },
    snow: {
      skyColor: "#e2e8f0",
      ambientLight: 0.8,
      fogDensity: 0.002,
      precipitation: "snow"
    },
    fog: {
      skyColor: "#cbd5e0",
      ambientLight: 0.5,
      fogDensity: 0.02,
      precipitation: null
    }
  }
  
  action setWeather(weather, transitionTime = 5000) {
    const preset = this.weatherPresets[weather]
    if (!preset) return
    
    const oldWeather = state.current
    state.current = weather
    
    // Transition sky
    animateSkyColor(preset.skyColor, transitionTime)
    
    // Transition lighting
    animateAmbientLight(preset.ambientLight, transitionTime)
    
    // Transition fog
    setFogDensity(preset.fogDensity, transitionTime)
    
    // Handle precipitation
    if (preset.precipitation !== this.weatherPresets[oldWeather].precipitation) {
      this.setPrecipitation(preset.precipitation)
    }
    
    // Wind
    if (weather === "storm") {
      state.windSpeed = 10
    } else if (weather === "rain") {
      state.windSpeed = 3
    } else {
      state.windSpeed = 0.5
    }
    
    emit("weather:changed", { from: oldWeather, to: weather })
  }
  
  action setPrecipitation(type) {
    // Disable old precipitation
    PrecipitationEmitter.stop()
    
    if (type === "rain") {
      PrecipitationEmitter.configure({
        type: "rain",
        count: 5000,
        color: "#4a90d9",
        size: 0.1,
        speed: 15,
        spread: 50
      })
      PrecipitationEmitter.start()
      playSound("rain_loop", { loop: true, volume: 0.4 })
    } else if (type === "snow") {
      PrecipitationEmitter.configure({
        type: "snow",
        count: 2000,
        color: "#ffffff",
        size: 0.15,
        speed: 2,
        spread: 50
      })
      PrecipitationEmitter.start()
    }
  }
  
  action triggerLightning() {
    // Flash
    flashScreen("#ffffff", 100)
    
    // Thunder after delay
    const delay = 500 + Math.random() * 2000
    setTimeout(() => {
      playSound("thunder", { volume: 0.8 })
    }, delay)
  }
  
  every(5000) {
    if (state.current === "storm" && Math.random() < 0.3) {
      this.triggerLightning()
    }
  }
}
`.trim(),
};

export const DayNightCycleTemplate: Template = {
  name: 'Day/Night Cycle',
  description: 'Realistic day/night lighting transitions',
  category: 'system',
  parameters: [
    { name: 'name', type: 'string', description: 'System name', default: 'DayNightCycle' },
    { name: 'dayLength', type: 'number', description: 'Day length (minutes)', default: 10, min: 1, max: 60 },
    { name: 'startHour', type: 'number', description: 'Start hour (0-24)', default: 12, min: 0, max: 24 },
  ],
  generate: (params) => `
system ${params.name || 'DayNightCycle'} {
  state {
    timeOfDay: ${params.startHour || 12} // 0-24 hours
    dayLengthMs: ${(Number(params.dayLength) || 10) * 60 * 1000}
    isPaused: false
    timeScale: 1
  }
  
  const phases = {
    dawn: { start: 5, end: 7, sky: "#ff7f50", ambient: 0.4, sunAngle: 10 },
    morning: { start: 7, end: 10, sky: "#87ceeb", ambient: 0.8, sunAngle: 45 },
    noon: { start: 10, end: 14, sky: "#87ceeb", ambient: 1.0, sunAngle: 90 },
    afternoon: { start: 14, end: 17, sky: "#87ceeb", ambient: 0.9, sunAngle: 135 },
    dusk: { start: 17, end: 19, sky: "#ff6347", ambient: 0.5, sunAngle: 170 },
    night: { start: 19, end: 5, sky: "#1a1a2e", ambient: 0.1, sunAngle: 270 }
  }
  
  action getPhase() {
    const hour = state.timeOfDay
    
    for (const [name, phase] of Object.entries(this.phases)) {
      if (name === "night") {
        if (hour >= phase.start || hour < phase.end) return name
      } else {
        if (hour >= phase.start && hour < phase.end) return name
      }
    }
    return "noon"
  }
  
  action setTime(hour) {
    state.timeOfDay = hour % 24
    this.updateLighting()
  }
  
  action updateLighting() {
    const phase = this.getPhase()
    const config = this.phases[phase]
    
    // Calculate progress within phase
    let progress = 0
    if (phase !== "night") {
      progress = (state.timeOfDay - config.start) / (config.end - config.start)
    }
    
    // Set sky
    setSkyColor(config.sky)
    
    // Set ambient light
    setAmbientIntensity(config.ambient)
    
    // Set sun position
    const sun = getDirectionalLight("Sun")
    if (sun) {
      const angle = config.sunAngle * Math.PI / 180
      sun.position.set(Math.cos(angle) * 50, Math.sin(angle) * 50, 0)
    }
    
    // Toggle stars
    if (phase === "night" || phase === "dusk" || phase === "dawn") {
      showStars(true)
    } else {
      showStars(false)
    }
    
    emit("time:phase", { phase: phase, hour: state.timeOfDay })
  }
  
  action pause() { state.isPaused = true }
  action resume() { state.isPaused = false }
  
  every(100) {
    if (state.isPaused) return
    
    // Advance time
    const hourPerMs = 24 / state.dayLengthMs
    state.timeOfDay += hourPerMs * 100 * state.timeScale
    state.timeOfDay %= 24
    
    this.updateLighting()
  }
}
`.trim(),
};

export const FogZoneTemplate: Template = {
  name: 'Fog Zone',
  description: 'Localized fog effect area',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Zone name', default: 'FogZone' },
    { name: 'color', type: 'color', description: 'Fog color', default: '#a0a0a0' },
    { name: 'density', type: 'number', description: 'Fog density', default: 0.05, min: 0.001, max: 0.2 },
    { name: 'height', type: 'number', description: 'Fog height', default: 3, min: 0.5, max: 20 },
  ],
  generate: (params) => `
template "${params.name || 'FogZone'}" {
  state {
    color: "${params.color || '#a0a0a0'}"
    density: ${params.density || 0.05}
    height: ${params.height || 3}
    previousFog: null
  }
  
  // Trigger volume
  object "Zone" {
    type: trigger
    visible: false
  }
  
  // Visual fog layer
  object "FogLayer" {
    geometry: box
    color: "${params.color || '#a0a0a0'}"
    opacity: 0.3
    transparent: true
    scale: [1, ${params.height || 3}, 1]
  }
  
  on_trigger_enter: (other) => {
    if (!other.isPlayer) return
    
    this.previousFog = getFogSettings()
    
    setFog({
      color: this.color,
      density: this.density,
      near: 1,
      far: 50
    })
    
    emit("fog:enter", { zone: this })
  }
  
  on_trigger_exit: (other) => {
    if (!other.isPlayer) return
    
    if (this.previousFog) {
      setFog(this.previousFog)
    } else {
      clearFog()
    }
    
    emit("fog:exit", { zone: this })
  }
}
`.trim(),
};

// ============================================================================
// Gameplay Mechanics Templates
// ============================================================================

export const CheckpointTemplate: Template = {
  name: 'Checkpoint',
  description: 'Save point with visual indicator',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Checkpoint name', default: 'Checkpoint' },
    { name: 'autoActivate', type: 'boolean', description: 'Auto-activate on touch', default: true },
    { name: 'healPlayer', type: 'boolean', description: 'Heal player on activate', default: true },
  ],
  generate: (params) => `
template "${params.name || 'Checkpoint'}" {
  @interactive
  
  state {
    isActivated: false
    autoActivate: ${params.autoActivate !== false}
    healPlayer: ${params.healPlayer !== false}
  }
  
  // Checkpoint pillar
  object "Pillar" {
    geometry: cylinder
    color: "#4a5568"
    scale: [0.3, 2, 0.3]
  }
  
  // Crystal indicator
  object "Crystal" {
    geometry: octahedron
    color: "#4a5568"
    scale: [0.3, 0.5, 0.3]
    position: [0, 2.5, 0]
  }
  
  // Glow effect (when active)
  object "Glow" {
    type: pointLight
    color: "#22c55e"
    intensity: 0
    distance: 5
    position: [0, 2.5, 0]
  }
  
  action activate() {
    if (this.isActivated) return
    
    this.isActivated = true
    
    // Visual feedback
    animate("Crystal.color", "#22c55e", 500)
    animate("Crystal.emissive", "#22c55e", 500)
    animate("Crystal.emissiveIntensity", 1, 500)
    animate("Glow.intensity", 2, 500)
    
    // Particles
    spawnParticleBurst(this.Crystal.getWorldPosition(), "#22c55e", 30)
    
    // Sound
    playSound("checkpoint_activate")
    
    // Save position
    setRespawnPoint(this.position)
    
    // Heal player
    if (this.healPlayer) {
      const player = getPlayer()
      player.health = player.maxHealth
    }
    
    emit("checkpoint:activated", { checkpoint: this })
    showFloatingText(this.position, "Checkpoint!", "#22c55e")
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer && this.autoActivate) {
      this.activate()
    }
  }
  
  on_interact: () => {
    this.activate()
  }
}
`.trim(),
};

export const RespawnPointTemplate: Template = {
  name: 'Respawn Point',
  description: 'Player respawn location with effects',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Respawn name', default: 'RespawnPoint' },
    { name: 'isDefault', type: 'boolean', description: 'Default spawn point', default: false },
  ],
  generate: (params) => `
template "${params.name || 'RespawnPoint'}" {
  state {
    isDefault: ${params.isDefault || false}
  }
  
  // Visual marker (editor only)
  object "Marker" {
    geometry: cone
    color: "#22c55e"
    opacity: 0.5
    scale: [1, 0.5, 1]
    rotation: [3.14, 0, 0]
    position: [0, 0.25, 0]
    editorOnly: true
  }
  
  action respawnPlayer() {
    const player = getPlayer()
    
    // Fade out
    await fadeOut(300)
    
    // Move player
    player.position.copy(this.position)
    player.position.y += 1
    player.rotation.set(0, 0, 0)
    player.velocity = [0, 0, 0]
    
    // Reset player state
    player.health = player.maxHealth
    player.mana = player.maxMana
    
    // Fade in
    await fadeIn(300)
    
    // Spawn effect
    spawnParticleBurst(player.position, "#22c55e", 20)
    
    emit("player:respawned", { point: this })
  }
  
  on_spawn: () => {
    if (this.isDefault) {
      setDefaultRespawnPoint(this)
    }
  }
}
`.trim(),
};

export const TeleporterTemplate: Template = {
  name: 'Teleporter',
  description: 'Instant teleport pad to destination',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Teleporter name', default: 'Teleporter' },
    { name: 'destination', type: 'string', description: 'Destination teleporter ID', default: 'TeleporterB' },
    { name: 'color', type: 'color', description: 'Pad color', default: '#3b82f6' },
  ],
  generate: (params) => `
template "${params.name || 'Teleporter'}" {
  @interactive
  
  state {
    destination: "${params.destination || 'TeleporterB'}"
    cooldown: 0
    isReceiving: false
  }
  
  // Base pad
  object "Pad" {
    geometry: cylinder
    color: "${params.color || '#3b82f6'}"
    scale: [1.5, 0.1, 1.5]
    emissive: "${params.color || '#3b82f6'}"
    emissiveIntensity: 0.5
  }
  
  // Ring effect
  object "Ring" {
    geometry: torus
    color: "${params.color || '#3b82f6'}"
    emissive: "${params.color || '#3b82f6'}"
    emissiveIntensity: 1
    scale: [1.3, 1.3, 0.05]
    position: [0, 0.2, 0]
    rotation: [1.57, 0, 0]
  }
  
  // Beam
  object "Beam" {
    type: particleSystem
    color: "${params.color || '#3b82f6'}"
    count: 100
    size: 0.1
    velocity: [0, 3, 0]
    lifetime: 1000
    spread: 0.5
  }
  
  action teleport(entity) {
    if (this.cooldown > 0 || this.isReceiving) return
    
    const dest = getObject(this.destination)
    if (!dest) return
    
    this.cooldown = 2.0
    dest.isReceiving = true
    
    // Effect at source
    playSound("teleport_out")
    spawnParticleBurst(entity.position, "${params.color || '#3b82f6'}", 30)
    
    // Teleport
    entity.position.copy(dest.position)
    entity.position.y += 1
    
    // Effect at destination
    playSound("teleport_in")
    spawnParticleBurst(entity.position, "${params.color || '#3b82f6'}", 30)
    
    setTimeout(() => { dest.isReceiving = false }, 1000)
    
    emit("teleporter:used", { from: this, to: dest, entity })
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer) {
      this.teleport(other)
    }
  }
  
  every(100) {
    this.cooldown = Math.max(0, this.cooldown - 0.1)
    this.Ring.rotation.y += 0.02
  }
}
`.trim(),
};

export const JumpPadTemplate: Template = {
  name: 'Jump Pad',
  description: 'Launches entities into the air',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Pad name', default: 'JumpPad' },
    { name: 'force', type: 'number', description: 'Launch force', default: 15, min: 5, max: 50 },
    { name: 'angle', type: 'number', description: 'Launch angle (degrees)', default: 80, min: 45, max: 90 },
    { name: 'color', type: 'color', description: 'Pad color', default: '#fbbf24' },
  ],
  generate: (params) => `
template "${params.name || 'JumpPad'}" {
  state {
    force: ${params.force || 15}
    angle: ${(Number(params.angle) || 80) * Math.PI / 180}
    cooldown: 0
  }
  
  // Base
  object "Pad" {
    geometry: cylinder
    color: "${params.color || '#fbbf24'}"
    scale: [1.5, 0.2, 1.5]
    emissive: "${params.color || '#fbbf24'}"
    emissiveIntensity: 0.3
  }
  
  // Arrow indicator
  object "Arrow" {
    mesh: "ui/arrow_up.glb"
    color: "${params.color || '#fbbf24'}"
    scale: [0.5, 0.5, 0.5]
    position: [0, 0.3, 0]
    emissive: "${params.color || '#fbbf24'}"
    emissiveIntensity: 1
  }
  
  action launch(entity) {
    if (this.cooldown > 0) return
    this.cooldown = 0.5
    
    // Calculate launch vector
    const forwardDir = getForwardVector(this.rotation)
    const launchVec = [
      forwardDir.x * Math.cos(this.angle) * this.force,
      Math.sin(this.angle) * this.force,
      forwardDir.z * Math.cos(this.angle) * this.force
    ]
    
    entity.velocity = launchVec
    
    // Effects
    playSound("jump_pad")
    spawnParticleBurst(this.position, "${params.color || '#fbbf24'}", 20)
    
    // Squash animation
    animate("Pad.scale.y", 0.1, 50)
    await delay(50)
    animate("Pad.scale.y", 0.2, 100)
    
    emit("jumppad:launched", { pad: this, entity })
  }
  
  on_trigger_enter: (other) => {
    if (other.isPlayer || other.isNPC) {
      this.launch(other)
    }
  }
  
  every(100) {
    this.cooldown = Math.max(0, this.cooldown - 0.1)
    
    // Bounce arrow
    this.Arrow.position.y = 0.3 + Math.sin(Date.now() * 0.005) * 0.1
  }
}
`.trim(),
};

export const ConveyorTemplate: Template = {
  name: 'Conveyor Belt',
  description: 'Moves entities along a path',
  category: 'orb',
  parameters: [
    { name: 'name', type: 'string', description: 'Conveyor name', default: 'Conveyor' },
    { name: 'speed', type: 'number', description: 'Belt speed', default: 3, min: 0.5, max: 10 },
    { name: 'length', type: 'number', description: 'Belt length', default: 5, min: 1, max: 20 },
    { name: 'width', type: 'number', description: 'Belt width', default: 2, min: 1, max: 5 },
  ],
  generate: (params) => `
template "${params.name || 'Conveyor'}" {
  state {
    speed: ${params.speed || 3}
    length: ${params.length || 5}
    isActive: true
    entitiesOn: new Set()
  }
  
  // Belt surface
  object "Belt" {
    geometry: box
    color: "#4a4a4a"
    scale: [${params.width || 2}, 0.1, ${params.length || 5}]
    
    // Animated texture
    material: {
      map: "textures/conveyor.png",
      repeat: [1, ${params.length || 5}]
    }
  }
  
  // Side rails
  object "RailLeft" {
    geometry: box
    color: "#666666"
    scale: [0.1, 0.2, ${params.length || 5}]
    position: [-${(params.width as number) / 2 || 1}, 0.05, 0]
  }
  
  object "RailRight" {
    geometry: box
    color: "#666666"
    scale: [0.1, 0.2, ${params.length || 5}]
    position: [${(params.width as number) / 2 || 1}, 0.05, 0]
  }
  
  // Direction arrows
  object "Arrows" {
    type: decal
    texture: "textures/arrows.png"
    position: [0, 0.06, 0]
    scale: [${params.width || 2}, 1, ${params.length || 5}]
  }
  
  action toggle() {
    this.isActive = !this.isActive
  }
  
  action setSpeed(speed) {
    this.speed = speed
  }
  
  on_trigger_enter: (other) => {
    this.entitiesOn.add(other.id)
  }
  
  on_trigger_exit: (other) => {
    this.entitiesOn.delete(other.id)
  }
  
  every(16) {
    if (!this.isActive) return
    
    // Animate texture scroll
    this.Belt.material.offset.y += this.speed * 0.001
    
    // Move entities
    const forwardDir = getForwardVector(this.rotation)
    const moveVec = multiply(forwardDir, this.speed * 0.016)
    
    for (const id of this.entitiesOn) {
      const entity = getObjectById(id)
      if (entity) {
        entity.position.add(moveVec)
      }
    }
  }
}
`.trim(),
};

// ============================================================================
// Additional Material Templates
// ============================================================================

export const WaterMaterialTemplate: Template = {
  name: 'Water Material',
  description: 'Animated water surface material',
  category: 'material',
  parameters: [
    { name: 'name', type: 'string', description: 'Material name', default: 'WaterMaterial' },
    { name: 'color', type: 'color', description: 'Water color', default: '#006994' },
    { name: 'opacity', type: 'number', description: 'Transparency', default: 0.7, min: 0.1, max: 1 },
    { name: 'waveSpeed', type: 'number', description: 'Wave speed', default: 1, min: 0.1, max: 5 },
  ],
  generate: (params) => `
material ${params.name || 'WaterMaterial'} {
  color: ${params.color || '#006994'}
  opacity: ${params.opacity || 0.7}
  transparent: true
  metalness: 0.1
  roughness: 0.1
  
  // Reflections
  envMapIntensity: 0.8
  
  // Normal map for waves
  normalMap: "textures/water_normal.png"
  normalScale: [0.5, 0.5]
}

system ${params.name || 'WaterMaterial'}Animator {
  state {
    time: 0
    speed: ${params.waveSpeed || 1}
  }
  
  every(16) {
    state.time += 0.016 * state.speed
    
    // Scroll normal map
    ${params.name || 'WaterMaterial'}.normalMap.offset.x = Math.sin(state.time * 0.5) * 0.1
    ${params.name || 'WaterMaterial'}.normalMap.offset.y = state.time * 0.05
  }
}
`.trim(),
};

export const PBRMaterialTemplate: Template = {
  name: 'PBR Material',
  description: 'Physically-based rendering material',
  category: 'material',
  parameters: [
    { name: 'name', type: 'string', description: 'Material name', default: 'PBRMaterial' },
    { name: 'preset', type: 'select', description: 'Material preset', default: 'metal', options: ['metal', 'plastic', 'wood', 'stone', 'fabric', 'glass'] },
  ],
  generate: (params) => {
    const presets: Record<string, { color: string; metalness: number; roughness: number; extra: string }> = {
      metal: { color: '#c0c0c0', metalness: 1.0, roughness: 0.2, extra: '' },
      plastic: { color: '#ffffff', metalness: 0.0, roughness: 0.4, extra: '' },
      wood: { color: '#8b4513', metalness: 0.0, roughness: 0.8, extra: 'normalMap: "textures/wood_normal.png"' },
      stone: { color: '#808080', metalness: 0.0, roughness: 0.9, extra: 'normalMap: "textures/stone_normal.png"' },
      fabric: { color: '#a0522d', metalness: 0.0, roughness: 1.0, extra: '' },
      glass: { color: '#ffffff', metalness: 0.0, roughness: 0.0, extra: 'transparent: true\n  opacity: 0.3\n  envMapIntensity: 1.0' },
    };
    
    const p = presets[(params.preset as string) || 'metal'];
    
    return `
material ${params.name || 'PBRMaterial'} {
  // ${(params.preset as string || 'metal').toUpperCase()} preset
  color: ${p.color}
  metalness: ${p.metalness}
  roughness: ${p.roughness}
  ${p.extra}
}
`.trim();
  },
};

// ============================================================================
// Template Registry
// ============================================================================

export const Templates: Record<string, Template> = {
  // Worlds
  emptyWorld: EmptyWorldTemplate,
  galleryWorld: GalleryWorldTemplate,
  outdoorWorld: OutdoorWorldTemplate,

  // NPCs - Basic
  simpleNPC: SimpleNPCTemplate,
  patrollingNPC: PatrollingNPCTemplate,

  // NPCs - Archetypes
  warriorNPC: WarriorNPCTemplate,
  mageNPC: MageNPCTemplate,
  scoutNPC: ScoutNPCTemplate,
  rogueNPC: RogueNPCTemplate,
  bossNPC: BossNPCTemplate,

  // Weapons - Melee
  meleeWeapon: MeleeWeaponTemplate,
  warHammer: WarHammerTemplate,
  spear: SpearTemplate,

  // Weapons - Ranged/Magic
  rangedWeapon: RangedWeaponTemplate,
  magicStaff: MagicStaffTemplate,

  // UI Components
  healthBar: HealthBarTemplate,
  floatingText: FloatingTextTemplate,
  dialogueBox: DialogueBoxTemplate,

  // Collectibles
  collectibleItem: CollectibleItemTemplate,

  // Environmental
  portal: PortalTemplate,
  door: DoorTemplate,
  trap: TrapTemplate,
  particleSystem: ParticleSystemTemplate,
  hazardZone: HazardZoneTemplate,
  movingPlatform: PlatformTemplate,
  lever: LeverTemplate,
  pressurePlate: PressurePlateTemplate,

  // UI Components - Extended
  inventoryPanel: InventoryPanelTemplate,
  minimap: MinimapTemplate,
  chatBubble: ChatBubbleTemplate,
  scoreDisplay: ScoreDisplayTemplate,
  timerDisplay: TimerDisplayTemplate,
  notificationToast: NotificationToastTemplate,

  // Dialogue & Story
  dialogueTree: DialogueTreeTemplate,
  cutscene: CutsceneTemplate,

  // Camera & View
  cameraController: CameraControllerTemplate,
  cameraZone: CameraZoneTemplate,

  // Audio & Ambient
  ambientSound: AmbientSoundTemplate,
  musicZone: MusicZoneTemplate,
  soundTrigger: SoundTriggerTemplate,

  // Weather & Atmosphere
  weatherSystem: WeatherSystemTemplate,
  dayNightCycle: DayNightCycleTemplate,
  fogZone: FogZoneTemplate,

  // Gameplay Mechanics
  checkpoint: CheckpointTemplate,
  respawnPoint: RespawnPointTemplate,
  teleporter: TeleporterTemplate,
  jumpPad: JumpPadTemplate,
  conveyor: ConveyorTemplate,

  // Game Systems
  inventorySystem: InventorySystemTemplate,
  healthSystem: HealthSystemTemplate,
  questSystem: QuestSystemTemplate,
  achievementSystem: AchievementSystemTemplate,
  saveLoadSystem: SaveLoadSystemTemplate,

  // Materials
  glowingMaterial: GlowingMaterialTemplate,
  waterMaterial: WaterMaterialTemplate,
  pbrmaterial: PBRMaterialTemplate,
};

/**
 * Get all templates in a category
 */
export function getTemplatesByCategory(category: Template['category']): Template[] {
  return Object.values(Templates).filter((t) => t.category === category);
}

/**
 * Generate code from a template
 */
export function generateFromTemplate(templateName: string, params: Record<string, unknown> = {}): string {
  const template = Templates[templateName];
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  // Fill in defaults
  const fullParams: Record<string, unknown> = {};
  for (const param of template.parameters) {
    fullParams[param.name] = params[param.name] ?? param.default;
  }

  return template.generate(fullParams);
}

/**
 * List all available templates
 */
export function listTemplates(): Array<{ name: string; description: string; category: string }> {
  return Object.entries(Templates).map(([name, template]) => ({
    name,
    description: template.description,
    category: template.category,
  }));
}
