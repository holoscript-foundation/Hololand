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

  // Game Systems
  inventorySystem: InventorySystemTemplate,
  healthSystem: HealthSystemTemplate,
  questSystem: QuestSystemTemplate,
  achievementSystem: AchievementSystemTemplate,
  saveLoadSystem: SaveLoadSystemTemplate,

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
