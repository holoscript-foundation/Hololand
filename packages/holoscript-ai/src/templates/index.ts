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
// Template Registry
// ============================================================================

export const Templates: Record<string, Template> = {
  // Worlds
  emptyWorld: EmptyWorldTemplate,
  galleryWorld: GalleryWorldTemplate,
  outdoorWorld: OutdoorWorldTemplate,

  // NPCs
  simpleNPC: SimpleNPCTemplate,
  patrollingNPC: PatrollingNPCTemplate,

  // Weapons
  meleeWeapon: MeleeWeaponTemplate,
  rangedWeapon: RangedWeaponTemplate,

  // UI Components
  healthBar: HealthBarTemplate,
  floatingText: FloatingTextTemplate,
  dialogueBox: DialogueBoxTemplate,

  // Collectibles
  collectibleItem: CollectibleItemTemplate,

  // Systems
  inventorySystem: InventorySystemTemplate,
  healthSystem: HealthSystemTemplate,

  // Materials
  glowingMaterial: GlowingMaterialTemplate,
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
