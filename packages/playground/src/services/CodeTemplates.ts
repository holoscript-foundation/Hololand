/**
 * Code Generation Templates - HoloScript boilerplate patterns
 */

export interface CodeTemplate {
  name: string;
  description: string;
  category: 'object' | 'behavior' | 'trait' | 'scene' | 'particle' | 'npc';
  code: string;
  tags: string[];
}

export class CodeTemplates {
  static readonly TEMPLATES: CodeTemplate[] = [
    // Object Templates
    {
      name: 'Basic Cube',
      description: 'A simple colored cube with material properties',
      category: 'object',
      tags: ['basic', 'cube', 'starter'],
      code: `object ${'{name}'} {
  position: [0, 0, 0]
  rotation: [0, 0, 0]
  scale: [1, 1, 1]
  
  trait Material {
    color: 0x${('000000' + Math.floor(Math.random() * 16777215).toString(16)).slice(-6)}
    metalness: 0.5
    roughness: 0.5
  }
}`,
    },

    {
      name: 'Animated Cube',
      description: 'A cube that spins continuously',
      category: 'object',
      tags: ['animation', 'rotation', 'cube'],
      code: `object ${'{name}'} {
  position: [0, 0, 0]
  
  trait Material {
    color: 0x00ff00
    metalness: 0.7
    roughness: 0.3
  }
  
  behavior Rotate {
    speed: 2.0
    axis: [0, 1, 0]
  }
}`,
    },

    {
      name: 'Platform',
      description: 'A flat platform for walking on',
      category: 'object',
      tags: ['platform', 'terrain', 'ground'],
      code: `object ${'{name}'} {
  position: [0, -1, 0]
  scale: [5, 0.1, 5]
  
  trait Material {
    color: 0xaaaaaa
    metalness: 0.3
    roughness: 0.7
  }
}`,
    },

    {
      name: 'Sphere',
      description: 'A smooth spherical object',
      category: 'object',
      tags: ['sphere', 'basic', 'ball'],
      code: `object ${'{name}'} {
  position: [0, 1, 0]
  scale: [1, 1, 1]
  
  trait Material {
    color: 0x0080ff
    metalness: 0.8
    roughness: 0.2
  }
}`,
    },

    {
      name: 'Light Source',
      description: 'An emissive object that provides light',
      category: 'object',
      tags: ['light', 'emissive', 'glow'],
      code: `object ${'{name}'} {
  position: [0, 5, 0]
  scale: [0.5, 0.5, 0.5]
  
  trait Material {
    color: 0xffff00
    metalness: 1.0
    roughness: 0.0
    emissive: 0xffff00
    emissiveIntensity: 1.0
  }
}`,
    },

    // Behavior Templates
    {
      name: 'Rotation Behavior',
      description: 'Make an object spin around an axis',
      category: 'behavior',
      tags: ['rotation', 'animation', 'movement'],
      code: `behavior Rotate {
  speed: 2.0
  axis: [0, 1, 0]
  
  onUpdate(deltaTime) {
    this.rotation += this.speed * deltaTime;
  }
}`,
    },

    {
      name: 'Float Behavior',
      description: 'Make an object bob up and down',
      category: 'behavior',
      tags: ['floating', 'animation', 'oscillation'],
      code: `behavior Float {
  speed: 1.0
  distance: 0.5
  startY: 0
  
  onInit() {
    this.startY = this.position.y;
  }
  
  onUpdate(deltaTime) {
    this.position.y = this.startY + Math.sin(Date.now() * 0.001 * this.speed) * this.distance;
  }
}`,
    },

    {
      name: 'Scale Pulse',
      description: 'Animate object scaling up and down',
      category: 'behavior',
      tags: ['scale', 'pulse', 'animation'],
      code: `behavior ScalePulse {
  speed: 2.0
  minScale: 0.8
  maxScale: 1.2
  
  onUpdate(deltaTime) {
    const scale = this.minScale + (this.maxScale - this.minScale) * 
                  (Math.sin(Date.now() * 0.001 * this.speed) + 1) / 2;
    this.scale = [scale, scale, scale];
  }
}`,
    },

    {
      name: 'Follow Player',
      description: 'Move object towards the player',
      category: 'behavior',
      tags: ['movement', 'chase', 'ai'],
      code: `behavior FollowPlayer {
  speed: 2.0
  stopDistance: 1.0
  
  onUpdate(deltaTime) {
    const direction = normalize(player.position - this.position);
    const distance = length(player.position - this.position);
    
    if (distance > this.stopDistance) {
      this.position += direction * this.speed * deltaTime;
    }
  }
}`,
    },

    // Trait Templates
    {
      name: 'Health Trait',
      description: 'Add health and damage system',
      category: 'trait',
      tags: ['health', 'combat', 'game'],
      code: `trait Health {
  maxHealth: 100
  currentHealth: 100
  
  damage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth <= 0) {
      this.onDeath();
    }
  }
  
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }
  
  onDeath() {
    // Override in implementation
  }
}`,
    },

    {
      name: 'Damage Trait',
      description: 'Make object deal damage on contact',
      category: 'trait',
      tags: ['damage', 'combat', 'collision'],
      code: `trait Damage {
  damageAmount: 10
  cooldown: 0.5
  lastDamageTime: 0
  
  onCollide(other) {
    const now = Date.now() / 1000;
    if (now - this.lastDamageTime > this.cooldown && other.health) {
      other.health.damage(this.damageAmount);
      this.lastDamageTime = now;
    }
  }
}`,
    },

    // Scene Templates
    {
      name: 'Simple World',
      description: 'Minimal world with platform and object',
      category: 'scene',
      tags: ['world', 'starter', 'basic'],
      code: `world ${'{worldName}'} {
  object platform {
    position: [0, -1, 0]
    scale: [10, 0.1, 10]
    
    trait Material {
      color: 0x888888
      metalness: 0.3
      roughness: 0.7
    }
  }
  
  object cube {
    position: [0, 1, 0]
    
    trait Material {
      color: 0x00ff00
    }
  }
}`,
    },

    {
      name: 'Arena World',
      description: 'Combat arena with multiple platforms',
      category: 'scene',
      tags: ['arena', 'combat', 'game'],
      code: `world ${'{worldName}'} {
  // Central platform
  object mainPlatform {
    position: [0, 0, 0]
    scale: [3, 0.1, 3]
    
    trait Material {
      color: 0x444444
    }
  }
  
  // Elevated platforms
  object platform1 {
    position: [3, 1, 0]
    scale: [1.5, 0.1, 1.5]
  }
  
  object platform2 {
    position: [-3, 1, 0]
    scale: [1.5, 0.1, 1.5]
  }
  
  // Walls
  object wall1 {
    position: [5, 2, 0]
    scale: [0.2, 4, 10]
  }
}`,
    },

    {
      name: 'Parkour Course',
      description: 'Jump and movement challenge',
      category: 'scene',
      tags: ['parkour', 'challenge', 'movement'],
      code: `world ${'{worldName}'} {
  // Start platform
  object start {
    position: [-10, 0, 0]
    scale: [2, 0.1, 2]
  }
  
  // Jumping platforms
  object jump1 { position: [-5, 0, 0]; scale: [1, 0.1, 1]; }
  object jump2 { position: [0, 0.5, 0]; scale: [1, 0.1, 1]; }
  object jump3 { position: [5, 1, 0]; scale: [1, 0.1, 1]; }
  object jump4 { position: [10, 1.5, 0]; scale: [1, 0.1, 1]; }
  
  // End platform
  object end {
    position: [15, 2, 0]
    scale: [2, 0.1, 2]
  }
}`,
    },

    // Particle Templates
    {
      name: 'Fire Particle',
      description: 'Animated fire effect',
      category: 'particle',
      tags: ['particles', 'fire', 'effect'],
      code: `object fireParticle {
  position: [0, 0, 0]
  scale: [0.1, 0.1, 0.1]
  
  trait Material {
    color: 0xff6600
    emissive: 0xff3300
    emissiveIntensity: 0.8
  }
  
  behavior ParticleFloat {
    lifetime: 1.0
    upForce: 0.5
  }
}`,
    },

    {
      name: 'Water Splash',
      description: 'Water particle effect',
      category: 'particle',
      tags: ['particles', 'water', 'splash'],
      code: `object waterParticle {
  position: [0, 0, 0]
  scale: [0.05, 0.05, 0.05]
  
  trait Material {
    color: 0x00ccff
    metalness: 0.8
    roughness: 0.1
  }
  
  behavior ParticleFall {
    lifetime: 2.0
    gravity: 0.98
  }
}`,
    },

    // NPC Templates
    {
      name: 'Patrolling Guard',
      description: 'NPC that walks back and forth',
      category: 'npc',
      tags: ['npc', 'ai', 'patrol'],
      code: `object guard {
  position: [0, 0, 0]
  scale: [0.5, 2, 0.5]
  
  trait Material {
    color: 0xff0000
  }
  
  trait Health {
    maxHealth: 50
    currentHealth: 50
  }
  
  behavior Patrol {
    pointA: [-5, 0, 0]
    pointB: [5, 0, 0]
    speed: 2.0
  }
}`,
    },

    {
      name: 'Treasure Chest',
      description: 'Interactive object with loot',
      category: 'npc',
      tags: ['interactive', 'collectible', 'reward'],
      code: `object treasureChest {
  position: [0, 0, 0]
  scale: [1, 1, 1]
  
  trait Material {
    color: 0xffaa00
    metalness: 0.9
    roughness: 0.1
  }
  
  behavior Interaction {
    opened: false
    rewards: ["gold", "potion", "key"]
    
    onInteract(player) {
      if (!this.opened) {
        this.opened = true;
        this.giveRewards(player);
        this.openAnimation();
      }
    }
  }
}`,
    },
  ];

  /**
   * Get template by name
   */
  static getTemplate(name: string): CodeTemplate | undefined {
    return this.TEMPLATES.find((t) => t.name === name);
  }

  /**
   * Get templates by category
   */
  static getByCategory(category: CodeTemplate['category']): CodeTemplate[] {
    return this.TEMPLATES.filter((t) => t.category === category);
  }

  /**
   * Get templates by tag
   */
  static getByTag(tag: string): CodeTemplate[] {
    return this.TEMPLATES.filter((t) => t.tags.includes(tag));
  }

  /**
   * Get all categories
   */
  static getCategories(): CodeTemplate['category'][] {
    const categories = new Set(this.TEMPLATES.map((t) => t.category));
    return Array.from(categories) as CodeTemplate['category'][];
  }

  /**
   * Get all tags
   */
  static getAllTags(): string[] {
    const tags = new Set<string>();
    this.TEMPLATES.forEach((t) => t.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }

  /**
   * Substitute template variables
   */
  static render(template: CodeTemplate, variables: Record<string, string>): string {
    let code = template.code;
    Object.entries(variables).forEach(([key, value]) => {
      code = code.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });
    return code;
  }
}
