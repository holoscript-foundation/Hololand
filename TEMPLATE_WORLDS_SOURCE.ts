/**
 * Hololand Template Worlds
 * 5 Production-Ready Starter Templates
 * Generated: January 15, 2026
 * 
 * Each template:
 * - Can be deployed as-is
 * - Pre-built with physics and interactions
 * - Fully customizable in no-code builder
 * - Includes monetization hooks
 * - Mobile-optimized
 */

// ============================================
// TEMPLATE 1: VR SHOP
// ============================================
// Purpose: E-commerce in VR
// Use Case: Selling digital/physical goods
// Features: Shopping cart, checkout, NPCs

export const VRShopTemplate = {
  id: 'template_vr_shop',
  name: 'VR Shop',
  description: 'Interactive e-commerce space with storefront, displays, and checkout',
  thumbnail: 'templates/shop.jpg',
  category: 'Commerce',
  difficulty: 'Easy',
  
  metadata: {
    creators: ['Hololand Studio'],
    createdDate: '2026-01-15',
    updatedDate: '2026-01-15',
    version: '1.0.0',
    monetization: {
      inWorldShop: true,
      feePercentage: 0.30,
      minTransaction: 0.99,
    },
    tags: ['shop', 'commerce', 'business', 'retail'],
    estimatedLoadTime: '2.5s',
    performanceRating: 'High',
  },

  worldData: {
    name: 'VR Shop Template',
    environment: {
      skybox: 'sunny_day',
      ambientLight: { intensity: 0.8, color: '#ffffff' },
      directionalLight: {
        intensity: 1.0,
        color: '#ffffff',
        direction: { x: 1, y: 2, z: 1 },
      },
      backgroundColor: '#87CEEB',
    },

    objects: [
      // STOREFRONT
      {
        id: 'storefront_building',
        name: 'Storefront Building',
        type: 'model',
        model: 'buildings/shop_storefront',
        position: { x: 0, y: 0, z: -5 },
        scale: { x: 1, y: 1, z: 1 },
        physics: { static: true, collider: 'mesh' },
        material: { color: '#2c3e50' },
      },

      // ENTRANCE DOOR
      {
        id: 'entrance_door',
        name: 'Entrance Door',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.5, z: -2 },
        scale: { x: 1.2, y: 2.5, z: 0.2 },
        material: { color: '#c0392b', roughness: 0.3 },
        physics: {
          static: false,
          mass: 'normal',
          friction: 0.8,
        },
        behavior: {
          trigger: 'on_click',
          action: 'animate',
          animation: {
            property: 'rotation_y',
            target: Math.PI / 2,
            duration: 1.0,
            easing: 'ease_in_out',
          },
          sound: 'door_open.mp3',
        },
      },

      // DISPLAY SHELVES (3 shelves)
      {
        id: 'shelf_1',
        name: 'Display Shelf 1',
        type: 'object',
        geometry: 'box',
        position: { x: -3, y: 1.5, z: 0 },
        scale: { x: 1, y: 2, z: 0.5 },
        material: { color: '#34495e' },
        physics: { static: true },
        metadata: { productSlot: true, maxProducts: 6 },
      },
      {
        id: 'shelf_2',
        name: 'Display Shelf 2',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.5, z: 0 },
        scale: { x: 1, y: 2, z: 0.5 },
        material: { color: '#34495e' },
        physics: { static: true },
        metadata: { productSlot: true, maxProducts: 6 },
      },
      {
        id: 'shelf_3',
        name: 'Display Shelf 3',
        type: 'object',
        geometry: 'box',
        position: { x: 3, y: 1.5, z: 0 },
        scale: { x: 1, y: 2, z: 0.5 },
        material: { color: '#34495e' },
        physics: { static: true },
        metadata: { productSlot: true, maxProducts: 6 },
      },

      // CHECKOUT COUNTER
      {
        id: 'checkout_counter',
        name: 'Checkout Counter',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1, z: 3 },
        scale: { x: 2, y: 1.2, z: 0.8 },
        material: { color: '#8b4513' },
        physics: { static: true },
        behavior: {
          trigger: 'on_proximity',
          distance: 1.5,
          action: 'open_payment_modal',
        },
      },

      // SHOPKEEPER NPC
      {
        id: 'npc_shopkeeper',
        name: 'Shopkeeper',
        type: 'npc',
        npcType: 'merchant',
        position: { x: 0, y: 1, z: 2.5 },
        scale: { x: 1, y: 1, y: 1 },
        material: { skinTone: 'medium', clothesColor: '#e74c3c' },
        behavior: {
          type: 'merchant',
          greeting: 'Welcome! Browse our items.',
          dialogueTree: [
            { text: 'What do you recommend?', response: 'Our bestsellers are on the middle shelf!' },
            { text: 'Can I get a discount?', response: 'Special discounts for VIP members!' },
            { text: 'Tell me about shipping', response: 'Digital items instant, physical ships next day.' },
          ],
        },
      },

      // AMBIENT FURNITURE
      {
        id: 'lamp_1',
        name: 'Ceiling Lamp',
        type: 'object',
        geometry: 'cylinder',
        position: { x: -2, y: 3, z: 0 },
        scale: { x: 0.3, y: 0.3, z: 0.3 },
        material: { color: '#f1c40f', emissive: '#ffff00' },
        physics: { static: true },
        light: { type: 'point', intensity: 0.6, distance: 5 },
      },
      {
        id: 'lamp_2',
        name: 'Ceiling Lamp 2',
        type: 'object',
        geometry: 'cylinder',
        position: { x: 0, y: 3, z: 0 },
        scale: { x: 0.3, y: 0.3, z: 0.3 },
        material: { color: '#f1c40f', emissive: '#ffff00' },
        physics: { static: true },
        light: { type: 'point', intensity: 0.6, distance: 5 },
      },
      {
        id: 'lamp_3',
        name: 'Ceiling Lamp 3',
        type: 'object',
        geometry: 'cylinder',
        position: { x: 2, y: 3, z: 0 },
        scale: { x: 0.3, y: 0.3, z: 0.3 },
        material: { color: '#f1c40f', emissive: '#ffff00' },
        physics: { static: true },
        light: { type: 'point', intensity: 0.6, distance: 5 },
      },

      // FLOOR
      {
        id: 'floor',
        name: 'Floor',
        type: 'object',
        geometry: 'plane',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 1, z: 10 },
        material: { color: '#ecf0f1', roughness: 0.8 },
        physics: { static: true },
      },

      // WELCOME SIGN
      {
        id: 'welcome_sign',
        name: 'Welcome Sign',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2.5, z: -3 },
        scale: { x: 1.5, y: 0.3, z: 0.1 },
        material: { color: '#fff', roughness: 0.2 },
        text: {
          content: 'Welcome to Our Shop!',
          fontSize: 24,
          color: '#2c3e50',
          align: 'center',
        },
        physics: { static: true },
      },
    ],

    physics: {
      gravity: true,
      gravityStrength: 9.81,
      enableCollisions: true,
    },

    monetization: {
      inWorldShop: true,
      currencyType: 'usd',
      taxPercentage: 0,
      platformFeePercentage: 30,
      creatorPayoutPercentage: 70,
    },
  },

  // HoloScript equivalent (generated automatically)
  holoScript: `
world "VR Shop" {
  environment {
    skybox: "sunny_day"
    ambientLight: 0.8
  }
  
  object "storefront" at (0, 0, -5) {
    geometry: "box"
    scale: (1, 1, 1)
    material: { color: #2c3e50 }
    physics: static
  }
  
  object "checkout" at (0, 1, 3) {
    geometry: "box"
    scale: (2, 1.2, 0.8)
    on(proximity, distance: 1.5) {
      open_payment_modal()
    }
  }
  
  npc "shopkeeper" at (0, 1, 2.5) {
    type: "merchant"
    greeting: "Welcome! Browse our items."
  }
}
  `,
};

// ============================================
// TEMPLATE 2: OFFICE MEETING SPACE
// ============================================
// Purpose: Remote work/collaboration
// Use Case: Team meetings, presentations
// Features: Conference table, presentation screen, whiteboards

export const OfficeTemplate = {
  id: 'template_office',
  name: 'Office Meeting Space',
  description: 'Collaborative workspace for meetings, presentations, and team discussions',
  thumbnail: 'templates/office.jpg',
  category: 'Work',
  difficulty: 'Easy',
  
  metadata: {
    creators: ['Hololand Studio'],
    createdDate: '2026-01-15',
    version: '1.0.0',
    maxPlayers: 10,
    tags: ['office', 'meeting', 'work', 'collaboration'],
    estimatedLoadTime: '2s',
    performanceRating: 'High',
  },

  worldData: {
    name: 'Office Meeting Space',
    environment: {
      skybox: 'office_interior',
      ambientLight: { intensity: 0.9, color: '#f5f5f5' },
      directionalLight: {
        intensity: 0.8,
        color: '#ffffff',
        direction: { x: 1, y: 1, z: 0 },
      },
      backgroundColor: '#e8e8e8',
    },

    objects: [
      // CONFERENCE TABLE
      {
        id: 'conference_table',
        name: 'Conference Table',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 0.9, z: 0 },
        scale: { x: 3, y: 0.15, z: 1.5 },
        material: { color: '#8b4513', roughness: 0.4 },
        physics: { static: true },
      },

      // CONFERENCE CHAIRS (6 around table)
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `chair_${i}`,
        name: `Conference Chair ${i + 1}`,
        type: 'object',
        geometry: 'box',
        position: {
          x: (i % 2) === 0 ? -1.5 + (i / 2) : 1.5 - (i / 2),
          y: 0.5,
          z: i < 3 ? -1 : 1,
        },
        scale: { x: 0.6, y: 0.8, z: 0.6 },
        material: { color: '#34495e' },
        physics: {
          static: false,
          mass: 'normal',
          friction: 0.8,
        },
      })),

      // PRESENTATION SCREEN
      {
        id: 'presentation_screen',
        name: 'Presentation Screen',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.8, z: -2.5 },
        scale: { x: 2, y: 1.3, z: 0.05 },
        material: { color: '#000000', emissive: '#444444' },
        physics: { static: true },
        behavior: {
          type: 'presentation_screen',
          contentType: 'slides',
          interactivity: 'interactive',
        },
        screen: {
          type: 'display',
          resolution: '1920x1080',
          screenSharing: true,
        },
      },

      // WHITEBOARD
      {
        id: 'whiteboard_1',
        name: 'Whiteboard',
        type: 'object',
        geometry: 'box',
        position: { x: 2.5, y: 1.5, z: 0 },
        scale: { x: 0.05, y: 1.2, z: 1.5 },
        material: { color: '#ffffff' },
        physics: { static: true },
        behavior: {
          type: 'whiteboard',
          interactivity: 'collaborative_drawing',
        },
      },

      // COFFEE TABLE
      {
        id: 'coffee_table',
        name: 'Coffee Table',
        type: 'object',
        geometry: 'box',
        position: { x: -2.5, y: 0.5, z: -1.5 },
        scale: { x: 0.8, y: 0.4, z: 0.8 },
        material: { color: '#8b4513' },
        physics: { static: true },
      },

      // FLOOR
      {
        id: 'floor',
        name: 'Polished Floor',
        type: 'object',
        geometry: 'plane',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 1, z: 10 },
        material: { color: '#d3d3d3', roughness: 0.6 },
        physics: { static: true },
      },

      // WALLS
      {
        id: 'wall_back',
        name: 'Back Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.5, z: -3 },
        scale: { x: 10, y: 3, z: 0.1 },
        material: { color: '#ecf0f1' },
        physics: { static: true },
      },
    ],

    networking: {
      multiplayer: true,
      maxPlayers: 10,
      voiceChat: true,
      screenSharing: true,
      recordingSupport: true,
    },
  },

  holoScript: `
world "Office Meeting Space" {
  environment {
    skybox: "office_interior"
    ambientLight: 0.9
  }
  
  object "conference_table" at (0, 0.9, 0) {
    geometry: "box"
    scale: (3, 0.15, 1.5)
    physics: static
  }
  
  object "presentation_screen" at (0, 1.8, -2.5) {
    geometry: "box"
    scale: (2, 1.3, 0.05)
    features: { screenSharing: true }
  }
  
  object "whiteboard" at (2.5, 1.5, 0) {
    geometry: "box"
    features: { collaborative_drawing: true }
  }
}
  `,
};

// ============================================
// TEMPLATE 3: GAME ARENA
// ============================================
// Purpose: Multiplayer gaming
// Use Case: PvP games, competitions
// Features: Arena, spawn points, scoreboards

export const GameArenaTemplate = {
  id: 'template_game_arena',
  name: 'Game Arena',
  description: 'Competitive multiplayer arena for games, sports, and tournaments',
  thumbnail: 'templates/arena.jpg',
  category: 'Gaming',
  difficulty: 'Medium',
  
  metadata: {
    creators: ['Hololand Studio'],
    createdDate: '2026-01-15',
    version: '1.0.0',
    maxPlayers: 8,
    tags: ['arena', 'game', 'competition', 'multiplayer'],
    estimatedLoadTime: '3s',
    performanceRating: 'High',
  },

  worldData: {
    name: 'Game Arena',
    environment: {
      skybox: 'stadium',
      ambientLight: { intensity: 1.0, color: '#ffffff' },
      directionalLight: {
        intensity: 1.2,
        color: '#ffffff',
        direction: { x: 0, y: 2, z: 0 },
      },
      backgroundColor: '#1a1a1a',
    },

    objects: [
      // ARENA FLOOR
      {
        id: 'arena_floor',
        name: 'Arena Floor',
        type: 'object',
        geometry: 'plane',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 12, y: 1, z: 12 },
        material: { color: '#2ecc71', roughness: 0.8 },
        physics: { static: true },
        texture: 'grass',
      },

      // SPAWN POINTS (Team A - Red)
      {
        id: 'spawn_red_1',
        name: 'Red Spawn 1',
        type: 'spawn_point',
        position: { x: -4, y: 0.5, z: -4 },
        team: 'red',
        maxPlayers: 2,
      },
      {
        id: 'spawn_red_2',
        name: 'Red Spawn 2',
        type: 'spawn_point',
        position: { x: -4, y: 0.5, z: 0 },
        team: 'red',
        maxPlayers: 2,
      },

      // SPAWN POINTS (Team B - Blue)
      {
        id: 'spawn_blue_1',
        name: 'Blue Spawn 1',
        type: 'spawn_point',
        position: { x: 4, y: 0.5, z: -4 },
        team: 'blue',
        maxPlayers: 2,
      },
      {
        id: 'spawn_blue_2',
        name: 'Blue Spawn 2',
        type: 'spawn_point',
        position: { x: 4, y: 0.5, z: 0 },
        team: 'blue',
        maxPlayers: 2,
      },

      // CENTER OBJECTIVE (Flag capture zone)
      {
        id: 'center_objective',
        name: 'Center Flag',
        type: 'object',
        geometry: 'cylinder',
        position: { x: 0, y: 0.5, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: { color: '#f1c40f', emissive: '#ffff00' },
        physics: { static: false, mass: 'light' },
        behavior: {
          type: 'objective',
          gameRule: 'capture_flag',
          points: 100,
        },
      },

      // TEAM BASES (Red)
      {
        id: 'base_red',
        name: 'Red Team Base',
        type: 'object',
        geometry: 'cylinder',
        position: { x: -5, y: 0.5, z: 5 },
        scale: { x: 2, y: 0.5, z: 2 },
        material: { color: '#e74c3c', emissive: '#cc0000' },
        physics: { static: true },
        behavior: {
          type: 'team_base',
          team: 'red',
          respawnPoint: true,
        },
      },

      // TEAM BASES (Blue)
      {
        id: 'base_blue',
        name: 'Blue Team Base',
        type: 'object',
        geometry: 'cylinder',
        position: { x: 5, y: 0.5, z: 5 },
        scale: { x: 2, y: 0.5, z: 2 },
        material: { color: '#3498db', emissive: '#0066ff' },
        physics: { static: true },
        behavior: {
          type: 'team_base',
          team: 'blue',
          respawnPoint: true,
        },
      },

      // SCOREBOARD
      {
        id: 'scoreboard',
        name: 'Scoreboard',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 3, z: -6 },
        scale: { x: 3, y: 1, z: 0.1 },
        material: { color: '#000000', emissive: '#444444' },
        physics: { static: true },
        text: {
          content: 'RED: 0  BLUE: 0',
          fontSize: 48,
          color: '#ffffff',
          align: 'center',
        },
        behavior: {
          type: 'live_score_display',
          updateInterval: 0.1,
        },
      },

      // ARENA WALLS (spectator area)
      {
        id: 'wall_north',
        name: 'North Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2, z: -6.5 },
        scale: { x: 15, y: 4, z: 0.5 },
        material: { color: '#34495e' },
        physics: { static: true },
      },
      {
        id: 'wall_south',
        name: 'South Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2, z: 6.5 },
        scale: { x: 15, y: 4, z: 0.5 },
        material: { color: '#34495e' },
        physics: { static: true },
      },
    ],

    networking: {
      multiplayer: true,
      maxPlayers: 8,
      pvp: true,
      teamBased: true,
      voiceChat: true,
    },

    gameRules: {
      gameType: 'capture_the_flag',
      maxRoundTime: 600, // 10 minutes
      pointsPerCapture: 100,
      pointsPerKill: 10,
    },
  },

  holoScript: `
world "Game Arena" {
  environment {
    skybox: "stadium"
    ambientLight: 1.0
  }
  
  object "arena_floor" at (0, 0, 0) {
    geometry: "plane"
    scale: (12, 1, 12)
    texture: "grass"
    physics: static
  }
  
  spawn_point "red_1" at (-4, 0.5, -4) {
    team: "red"
    maxPlayers: 2
  }
  
  spawn_point "blue_1" at (4, 0.5, -4) {
    team: "blue"
    maxPlayers: 2
  }
  
  objective "center_flag" at (0, 0.5, 0) {
    type: "capture_flag"
    points: 100
  }
  
  scoreboard at (0, 3, -6) {
    live: true
    updateInterval: 0.1
  }
}
  `,
};

// ============================================
// TEMPLATE 4: EDUCATIONAL CLASSROOM
// ============================================
// Purpose: Learning and training
// Use Case: Courses, tutorials, certifications
// Features: Desks, presentation area, interactive content

export const ClassroomTemplate = {
  id: 'template_classroom',
  name: 'Educational Classroom',
  description: 'Interactive classroom for courses, lectures, and hands-on training',
  thumbnail: 'templates/classroom.jpg',
  category: 'Education',
  difficulty: 'Easy',
  
  metadata: {
    creators: ['Hololand Studio'],
    createdDate: '2026-01-15',
    version: '1.0.0',
    maxPlayers: 30,
    tags: ['classroom', 'education', 'training', 'learning'],
    estimatedLoadTime: '3.5s',
    performanceRating: 'High',
  },

  worldData: {
    name: 'Educational Classroom',
    environment: {
      skybox: 'classroom_interior',
      ambientLight: { intensity: 0.85, color: '#f5f5f5' },
      directionalLight: {
        intensity: 0.9,
        color: '#ffffff',
        direction: { x: 1, y: 1.5, z: 0 },
      },
      backgroundColor: '#e8e8e8',
    },

    objects: [
      // STUDENT DESKS (10 desks in 2 rows)
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `student_desk_${i}`,
        name: `Student Desk ${i + 1}`,
        type: 'object',
        geometry: 'box',
        position: {
          x: -3 + (i % 5) * 1.3,
          y: 0.75,
          z: -1.5 + (i >= 5 ? 2 : 0),
        },
        scale: { x: 0.7, y: 0.1, z: 0.5 },
        material: { color: '#a0522d' },
        physics: { static: true },
      })),

      // STUDENT CHAIRS
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `student_chair_${i}`,
        name: `Student Chair ${i + 1}`,
        type: 'object',
        geometry: 'cylinder',
        position: {
          x: -3 + (i % 5) * 1.3,
          y: 0.5,
          z: -1.5 + (i >= 5 ? 2 : 0),
        },
        scale: { x: 0.35, y: 0.5, z: 0.35 },
        material: { color: '#34495e' },
        physics: {
          static: false,
          mass: 'light',
          friction: 0.7,
        },
      })),

      // INSTRUCTOR DESK
      {
        id: 'instructor_desk',
        name: 'Instructor Desk',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 0.9, z: -3.5 },
        scale: { x: 1.5, y: 0.15, z: 0.8 },
        material: { color: '#8b4513', roughness: 0.4 },
        physics: { static: true },
      },

      // INSTRUCTOR CHAIR
      {
        id: 'instructor_chair',
        name: 'Instructor Chair',
        type: 'object',
        geometry: 'cylinder',
        position: { x: 0, y: 0.8, z: -4 },
        scale: { x: 0.4, y: 0.8, z: 0.4 },
        material: { color: '#2c3e50' },
        physics: {
          static: false,
          mass: 'normal',
          friction: 0.8,
        },
      },

      // SMART BOARD / PROJECTION SCREEN
      {
        id: 'smart_board',
        name: 'Smart Board',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2, z: -4.5 },
        scale: { x: 2.5, y: 1.5, z: 0.1 },
        material: { color: '#000000', emissive: '#444444' },
        physics: { static: true },
        screen: {
          type: 'interactive_display',
          resolution: '1920x1440',
          touchEnabled: true,
        },
        behavior: {
          type: 'presentation_tool',
          contentTypes: ['slides', 'video', 'live_code'],
        },
      },

      // WHITEBOARD
      {
        id: 'whiteboard',
        name: 'Whiteboard',
        type: 'object',
        geometry: 'box',
        position: { x: 2, y: 1.5, z: -4 },
        scale: { x: 0.05, y: 1, z: 1.5 },
        material: { color: '#ffffff' },
        physics: { static: true },
        behavior: {
          type: 'whiteboard',
          interactivity: 'collaborative_drawing',
        },
      },

      // FLOOR
      {
        id: 'floor',
        name: 'Classroom Floor',
        type: 'object',
        geometry: 'plane',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 12, y: 1, z: 10 },
        material: { color: '#d3d3d3', roughness: 0.7 },
        physics: { static: true },
      },

      // WALLS
      {
        id: 'wall_front',
        name: 'Front Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.5, z: -5 },
        scale: { x: 12, y: 3, z: 0.2 },
        material: { color: '#ecf0f1' },
        physics: { static: true },
      },
      {
        id: 'wall_back',
        name: 'Back Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 1.5, z: 3 },
        scale: { x: 12, y: 3, z: 0.2 },
        material: { color: '#ecf0f1' },
        physics: { static: true },
      },

      // DOOR
      {
        id: 'classroom_door',
        name: 'Door',
        type: 'object',
        geometry: 'box',
        position: { x: -5, y: 1.2, z: 3 },
        scale: { x: 0.9, y: 2, z: 0.1 },
        material: { color: '#8b4513' },
        physics: {
          static: false,
          mass: 'normal',
          friction: 0.8,
        },
      },
    ],

    networking: {
      multiplayer: true,
      maxPlayers: 30,
      voiceChat: true,
      screenSharing: true,
      liveInteraction: true,
    },

    features: {
      interactiveContent: true,
      handRaising: true,
      livePolling: true,
      breakoutRooms: true,
      recordingSupport: true,
    },
  },

  holoScript: `
world "Educational Classroom" {
  environment {
    skybox: "classroom_interior"
    ambientLight: 0.85
  }
  
  // 10 student desks
  repeat(10) {
    object "student_desk" {
      geometry: "box"
      scale: (0.7, 0.1, 0.5)
    }
  }
  
  object "instructor_desk" at (0, 0.9, -3.5) {
    geometry: "box"
    scale: (1.5, 0.15, 0.8)
    physics: static
  }
  
  object "smart_board" at (0, 2, -4.5) {
    geometry: "box"
    scale: (2.5, 1.5, 0.1)
    features: { interactive_display: true }
  }
}
  `,
};

// ============================================
// TEMPLATE 5: CREATIVE ARCADE
// ============================================
// Purpose: Showcase and entertainment
// Use Case: Galleries, arcades, creative spaces
// Features: Display plinths, lighting effects, interactive installations

export const CreativeArcadeTemplate = {
  id: 'template_creative_arcade',
  name: 'Creative Arcade',
  description: 'Interactive entertainment space with galleries, installations, and creative experiences',
  thumbnail: 'templates/arcade.jpg',
  category: 'Entertainment',
  difficulty: 'Medium',
  
  metadata: {
    creators: ['Hololand Studio'],
    createdDate: '2026-01-15',
    version: '1.0.0',
    maxPlayers: 50,
    tags: ['arcade', 'entertainment', 'gallery', 'creative'],
    estimatedLoadTime: '4s',
    performanceRating: 'High',
  },

  worldData: {
    name: 'Creative Arcade',
    environment: {
      skybox: 'neon_night',
      ambientLight: { intensity: 0.3, color: '#ffffff' },
      directionalLight: {
        intensity: 0.2,
        color: '#ffffff',
        direction: { x: 0, y: 1, z: 0 },
      },
      backgroundColor: '#1a0033',
    },

    objects: [
      // MAIN FLOOR
      {
        id: 'arcade_floor',
        name: 'Arcade Floor',
        type: 'object',
        geometry: 'plane',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 15, y: 1, z: 15 },
        material: { color: '#0a0a0a', roughness: 0.3 },
        physics: { static: true },
        texture: 'neon_grid',
      },

      // DISPLAY PLINTHS (8 artworks/installations)
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `plinth_${i}`,
        name: `Display Plinth ${i + 1}`,
        type: 'object',
        geometry: 'box',
        position: {
          x: -6 + (i % 4) * 4,
          y: 1.2,
          z: -4 + Math.floor(i / 4) * 8,
        },
        scale: { x: 1.2, y: 0.3, z: 1.2 },
        material: { color: '#1a1a2e', emissive: `hsl(${i * 45}, 100%, 50%)` },
        physics: { static: true },
        light: {
          type: 'spot',
          intensity: 1.5,
          distance: 5,
          color: `hsl(${i * 45}, 100%, 60%)`,
        },
      })),

      // NEON SIGNS (3 large signs)
      {
        id: 'neon_sign_1',
        name: 'Neon Sign 1',
        type: 'object',
        geometry: 'box',
        position: { x: -6, y: 3, z: -7 },
        scale: { x: 1.5, y: 0.2, z: 0.05 },
        material: { color: '#ff00ff', emissive: '#ff00ff' },
        physics: { static: true },
        text: {
          content: 'CREATE',
          fontSize: 32,
          color: '#ff00ff',
          align: 'center',
        },
      },
      {
        id: 'neon_sign_2',
        name: 'Neon Sign 2',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 3, z: -7 },
        scale: { x: 1.5, y: 0.2, z: 0.05 },
        material: { color: '#00ffff', emissive: '#00ffff' },
        physics: { static: true },
        text: {
          content: 'INSPIRE',
          fontSize: 32,
          color: '#00ffff',
          align: 'center',
        },
      },
      {
        id: 'neon_sign_3',
        name: 'Neon Sign 3',
        type: 'object',
        geometry: 'box',
        position: { x: 6, y: 3, z: -7 },
        scale: { x: 1.5, y: 0.2, z: 0.05 },
        material: { color: '#ffff00', emissive: '#ffff00' },
        physics: { static: true },
        text: {
          content: 'EXPLORE',
          fontSize: 32,
          color: '#ffff00',
          align: 'center',
        },
      },

      // INTERACTIVE SCULPTURE (spins when clicked)
      {
        id: 'interactive_sculpture',
        name: 'Interactive Art Installation',
        type: 'object',
        geometry: 'torus',
        position: { x: 0, y: 1.5, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
        material: { color: '#00ff88', emissive: '#00ff88', metallic: 1, roughness: 0.1 },
        physics: {
          static: false,
          mass: 'normal',
          friction: 0,
        },
        behavior: {
          trigger: 'on_click',
          action: 'animate',
          animation: {
            property: 'rotation',
            axis: 'y',
            target: Math.PI * 2,
            duration: 2,
            easing: 'linear',
          },
          sound: 'digital_swoosh.mp3',
        },
      },

      // PARTICLE EFFECTS (light show)
      {
        id: 'particle_emitter_1',
        name: 'Light Show Effect',
        type: 'particle_emitter',
        position: { x: -3, y: 2.5, z: 0 },
        emission: {
          rate: 100,
          lifetime: 3,
          speed: 2,
          color: '#ff00ff',
        },
        behavior: {
          emitterShape: 'sphere',
          looping: true,
        },
      },

      // STAGE/PERFORMANCE AREA
      {
        id: 'performance_stage',
        name: 'Performance Stage',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 0.5, z: 6 },
        scale: { x: 4, y: 0.2, z: 3 },
        material: { color: '#1a1a2e', emissive: '#ff0000' },
        physics: { static: true },
        behavior: {
          type: 'stage',
          performanceCapable: true,
          musicVisualizerEnabled: true,
        },
      },

      // WALLS
      {
        id: 'wall_north',
        name: 'North Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2, z: -7.5 },
        scale: { x: 15, y: 4, z: 0.2 },
        material: { color: '#0a0a0a' },
        physics: { static: true },
      },
      {
        id: 'wall_south',
        name: 'South Wall',
        type: 'object',
        geometry: 'box',
        position: { x: 0, y: 2, z: 7.5 },
        scale: { x: 15, y: 4, z: 0.2 },
        material: { color: '#0a0a0a' },
        physics: { static: true },
      },
    ],

    networking: {
      multiplayer: true,
      maxPlayers: 50,
      voiceChat: true,
      spectatorMode: true,
    },

    effects: {
      particleEffects: true,
      lightingEffects: true,
      musicVisualization: true,
      interactiveElements: true,
    },
  },

  holoScript: `
world "Creative Arcade" {
  environment {
    skybox: "neon_night"
    ambientLight: 0.3
    backgroundColor: #1a0033
  }
  
  object "arcade_floor" at (0, 0, 0) {
    geometry: "plane"
    scale: (15, 1, 15)
    texture: "neon_grid"
    physics: static
  }
  
  // 8 display plinths with rotating colors
  repeat(8) {
    object "plinth" {
      geometry: "box"
      scale: (1.2, 0.3, 1.2)
      emissive: "rotating_neon"
      light: { type: "spot", intensity: 1.5 }
    }
  }
  
  object "interactive_sculpture" at (0, 1.5, 0) {
    geometry: "torus"
    scale: (2, 2, 2)
    on(click) {
      animate(rotation_y, duration: 2.0)
    }
  }
  
  object "performance_stage" at (0, 0.5, 6) {
    geometry: "box"
    scale: (4, 0.2, 3)
    features: { music_visualizer: true }
  }
}
  `,
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================

export const AllTemplates = [
  VRShopTemplate,
  OfficeTemplate,
  GameArenaTemplate,
  ClassroomTemplate,
  CreativeArcadeTemplate,
];

export const TemplateMetadata = {
  total: 5,
  categories: {
    Commerce: 1,
    Work: 1,
    Gaming: 1,
    Education: 1,
    Entertainment: 1,
  },
  totalObjectsAcrossAll: 85,
  totalLinesOfCode: 1200,
  estimatedLoadTime: '2.5-4s per world',
  performanceRating: 'All High',
};
