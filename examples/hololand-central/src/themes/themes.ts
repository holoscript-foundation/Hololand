import { Theme } from './types';

export const THEMES: Record<string, Theme> = {
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk Station',
    description: 'High-tech neon space station',
    icon: '🌐',
    colors: {
      primary: 0x667eea,
      secondary: 0x16213e,
      accent1: 0xf093fb,
      accent2: 0x764ba2,
      floor: 0x1a1a2e,
      background: 0x0a0a0a,
      emissive: 0x667eea,
    },
    lighting: {
      ambientIntensity: 0.4,
      mainLightIntensity: 1,
      pointLights: [
        { position: [0, 10, 0], intensity: 0.5, color: 0x667eea, distance: 20 },
        { position: [10, 5, 10], intensity: 0.3, color: 0xf093fb, distance: 15 },
        { position: [-10, 5, -10], intensity: 0.3, color: 0x764ba2, distance: 15 },
      ],
    },
    fog: {
      color: 0x0a0a0a,
      near: 30,
      far: 80,
    },
    buildings: [
      // Neon towers
      { type: 'box', position: [20, 8, 20], size: [4, 16, 4], color: 0x16213e, metalness: 0.8, roughness: 0.2, emissive: 0x667eea, emissiveIntensity: 0.2 },
      { type: 'box', position: [-20, 10, 20], size: [5, 20, 5], color: 0x0f3460, metalness: 0.7, roughness: 0.3, emissive: 0xf093fb, emissiveIntensity: 0.15 },
      { type: 'box', position: [20, 7, -20], size: [4, 14, 4], color: 0x16213e, metalness: 0.8, roughness: 0.2, emissive: 0x764ba2, emissiveIntensity: 0.2 },
      { type: 'box', position: [-20, 9, -20], size: [5, 18, 5], color: 0x0f3460, metalness: 0.7, roughness: 0.3, emissive: 0x667eea, emissiveIntensity: 0.15 },
    ],
    decorations: [
      { type: 'particle', position: [0, 0, 0], color: 0xffffff, size: 0.1, count: 100 },
    ],
  },

  'wild-west': {
    name: 'wild-west',
    displayName: 'Wild West Frontier',
    description: 'Desert town at sunset',
    icon: '🤠',
    colors: {
      primary: 0xd4a574, // Sandy brown
      secondary: 0x8b4513, // Saddle brown
      accent1: 0xdaa520, // Goldenrod
      accent2: 0xff6347, // Tomato red
      floor: 0xc19a6b, // Desert sand
      background: 0xff7f50, // Coral sunset
      emissive: 0xffa500,
    },
    lighting: {
      ambientIntensity: 0.6,
      mainLightIntensity: 1.2,
      mainLightColor: 0xffa500,
      pointLights: [
        { position: [0, 5, 0], intensity: 0.4, color: 0xffa500, distance: 25 },
        { position: [15, 3, 15], intensity: 0.3, color: 0xff6347, distance: 15 },
        { position: [-15, 3, -15], intensity: 0.3, color: 0xdaa520, distance: 15 },
      ],
    },
    fog: {
      color: 0xff7f50,
      near: 40,
      far: 100,
    },
    buildings: [
      // Saloon (front left)
      { type: 'box', position: [-18, 3, 10], size: [8, 6, 6], color: 0x8b4513, metalness: 0.1, roughness: 0.9 },
      { type: 'box', position: [-18, 7, 10], size: [9, 1, 0.5], color: 0x654321, metalness: 0, roughness: 1 }, // Sign board

      // General Store (front right)
      { type: 'box', position: [18, 3, 10], size: [8, 6, 6], color: 0xa0522d, metalness: 0.1, roughness: 0.9 },
      { type: 'box', position: [18, 6.5, 10.2], size: [6, 0.8, 0.3], color: 0xffffff, metalness: 0, roughness: 1 },

      // Bank (back left)
      { type: 'box', position: [-18, 4, -15], size: [10, 8, 8], color: 0x8b4513, metalness: 0.2, roughness: 0.8 },

      // Sheriff's Office (back right)
      { type: 'box', position: [18, 2.5, -15], size: [7, 5, 7], color: 0xa0522d, metalness: 0.1, roughness: 0.9 },

      // Water tower
      { type: 'cylinder', position: [25, 8, 0], size: [2, 8, 2], color: 0x8b4513, metalness: 0.2, roughness: 0.8 },
      { type: 'cylinder', position: [25, 12, 0], size: [3, 2, 3], color: 0x654321, metalness: 0.1, roughness: 0.9 },

      // Cacti
      { type: 'cylinder', position: [30, 2, 12], size: [0.8, 4, 0.8], color: 0x2d5016, metalness: 0, roughness: 1 },
      { type: 'cylinder', position: [-25, 1.5, 18], size: [0.6, 3, 0.6], color: 0x2d5016, metalness: 0, roughness: 1 },
      { type: 'cylinder', position: [28, 1.8, -20], size: [0.7, 3.6, 0.7], color: 0x2d5016, metalness: 0, roughness: 1 },

      // Barrels
      { type: 'cylinder', position: [-12, 0.8, 15], size: [0.6, 1.6, 0.6], color: 0x654321, metalness: 0.1, roughness: 0.9 },
      { type: 'cylinder', position: [-13, 0.8, 15], size: [0.6, 1.6, 0.6], color: 0x654321, metalness: 0.1, roughness: 0.9 },
      { type: 'cylinder', position: [12, 0.8, 16], size: [0.6, 1.6, 0.6], color: 0x654321, metalness: 0.1, roughness: 0.9 },
    ],
    decorations: [
      { type: 'particle', position: [0, 2, 0], color: 0xd4a574, size: 0.15, count: 40 }, // Dust particles
    ],
  },

  cityscape: {
    name: 'cityscape',
    displayName: 'Urban Cityscape',
    description: 'Modern city at night',
    icon: '🏙️',
    colors: {
      primary: 0x00bfff, // Deep sky blue
      secondary: 0x2f4f4f, // Dark slate gray
      accent1: 0xff1493, // Deep pink
      accent2: 0x00ff00, // Lime green
      floor: 0x36454f, // Charcoal
      background: 0x000428, // Deep blue-black
      emissive: 0x00bfff,
    },
    lighting: {
      ambientIntensity: 0.3,
      mainLightIntensity: 0.8,
      pointLights: [
        { position: [0, 15, 0], intensity: 0.6, color: 0x00bfff, distance: 30 },
        { position: [20, 10, 20], intensity: 0.5, color: 0xff1493, distance: 20 },
        { position: [-20, 10, -20], intensity: 0.5, color: 0x00ff00, distance: 20 },
        { position: [20, 8, -20], intensity: 0.4, color: 0xffff00, distance: 18 },
        { position: [-20, 8, 20], intensity: 0.4, color: 0xff00ff, distance: 18 },
      ],
    },
    fog: {
      color: 0x000428,
      near: 35,
      far: 90,
    },
    buildings: [
      // Skyscrapers
      { type: 'box', position: [22, 15, 18], size: [6, 30, 6], color: 0x2f4f4f, metalness: 0.9, roughness: 0.1, emissive: 0x00bfff, emissiveIntensity: 0.1 },
      { type: 'box', position: [-25, 18, 20], size: [7, 36, 7], color: 0x36454f, metalness: 0.85, roughness: 0.15, emissive: 0xff1493, emissiveIntensity: 0.12 },
      { type: 'box', position: [20, 12, -22], size: [5, 24, 5], color: 0x2f4f4f, metalness: 0.9, roughness: 0.1, emissive: 0x00ff00, emissiveIntensity: 0.1 },
      { type: 'box', position: [-22, 14, -18], size: [6, 28, 6], color: 0x36454f, metalness: 0.85, roughness: 0.15, emissive: 0xffff00, emissiveIntensity: 0.08 },

      // Mid-rise buildings
      { type: 'box', position: [30, 7, 5], size: [8, 14, 8], color: 0x2f4f4f, metalness: 0.7, roughness: 0.3, emissive: 0x00bfff, emissiveIntensity: 0.15 },
      { type: 'box', position: [-30, 6, -8], size: [7, 12, 7], color: 0x36454f, metalness: 0.7, roughness: 0.3, emissive: 0xff1493, emissiveIntensity: 0.15 },
      { type: 'box', position: [8, 5, 28], size: [6, 10, 6], color: 0x2f4f4f, metalness: 0.7, roughness: 0.3, emissive: 0x00ff00, emissiveIntensity: 0.15 },
      { type: 'box', position: [-10, 5, -30], size: [6, 10, 6], color: 0x36454f, metalness: 0.7, roughness: 0.3, emissive: 0xffff00, emissiveIntensity: 0.15 },

      // Neon signs (thin boxes)
      { type: 'box', position: [22, 25, 21.1], size: [4, 2, 0.2], color: 0xff1493, metalness: 0.9, roughness: 0, emissive: 0xff1493, emissiveIntensity: 0.8 },
      { type: 'box', position: [-25, 28, 23.1], size: [5, 2.5, 0.2], color: 0x00ff00, metalness: 0.9, roughness: 0, emissive: 0x00ff00, emissiveIntensity: 0.8 },
    ],
    decorations: [
      { type: 'particle', position: [0, 0, 0], color: 0xffffff, size: 0.08, count: 150 }, // City lights
    ],
  },

  'snowy-town': {
    name: 'snowy-town',
    displayName: 'Snowy Village',
    description: 'Cozy winter wonderland',
    icon: '❄️',
    colors: {
      primary: 0xe0f7fa, // Ice blue
      secondary: 0x5d4037, // Brown wood
      accent1: 0xff6b6b, // Warm red
      accent2: 0xffd54f, // Golden yellow
      floor: 0xffffff, // Snow white
      background: 0xb0c4de, // Light steel blue
      emissive: 0xffd54f,
    },
    lighting: {
      ambientIntensity: 0.7,
      mainLightIntensity: 1,
      mainLightColor: 0xe0f7fa,
      pointLights: [
        { position: [0, 8, 0], intensity: 0.5, color: 0xffd54f, distance: 25 },
        { position: [15, 5, 15], intensity: 0.4, color: 0xff6b6b, distance: 18 },
        { position: [-15, 5, -15], intensity: 0.4, color: 0xffd54f, distance: 18 },
      ],
    },
    fog: {
      color: 0xd0e8f2,
      near: 25,
      far: 70,
    },
    buildings: [
      // Wooden cabins
      { type: 'box', position: [-18, 2.5, 12], size: [7, 5, 6], color: 0x5d4037, metalness: 0, roughness: 1 },
      { type: 'box', position: [-18, 5.5, 12], size: [8, 1, 7], color: 0xffffff, metalness: 0, roughness: 0.8 }, // Snow on roof

      { type: 'box', position: [18, 2.5, 12], size: [7, 5, 6], color: 0x6d4c41, metalness: 0, roughness: 1 },
      { type: 'box', position: [18, 5.5, 12], size: [8, 1, 7], color: 0xffffff, metalness: 0, roughness: 0.8 },

      { type: 'box', position: [-18, 3, -15], size: [8, 6, 7], color: 0x5d4037, metalness: 0, roughness: 1 },
      { type: 'box', position: [-18, 6.5, -15], size: [9, 1.2, 8], color: 0xffffff, metalness: 0, roughness: 0.8 },

      { type: 'box', position: [18, 3, -15], size: [8, 6, 7], color: 0x6d4c41, metalness: 0, roughness: 1 },
      { type: 'box', position: [18, 6.5, -15], size: [9, 1.2, 8], color: 0xffffff, metalness: 0, roughness: 0.8 },

      // Pine trees
      { type: 'cylinder', position: [25, 3, 8], size: [0.8, 6, 0.8], color: 0x3e2723, metalness: 0, roughness: 1 },
      { type: 'box', position: [25, 6, 8], size: [3, 6, 3], color: 0x1b5e20, metalness: 0, roughness: 1, rotation: [0, Math.PI / 4, 0] },

      { type: 'cylinder', position: [-28, 3.5, -10], size: [0.9, 7, 0.9], color: 0x3e2723, metalness: 0, roughness: 1 },
      { type: 'box', position: [-28, 7, -10], size: [3.5, 7, 3.5], color: 0x1b5e20, metalness: 0, roughness: 1, rotation: [0, Math.PI / 4, 0] },

      { type: 'cylinder', position: [30, 2.8, -18], size: [0.7, 5.6, 0.7], color: 0x3e2723, metalness: 0, roughness: 1 },
      { type: 'box', position: [30, 5.5, -18], size: [2.8, 5.6, 2.8], color: 0x1b5e20, metalness: 0, roughness: 1, rotation: [0, Math.PI / 4, 0] },

      { type: 'cylinder', position: [-25, 3.2, 20], size: [0.8, 6.4, 0.8], color: 0x3e2723, metalness: 0, roughness: 1 },
      { type: 'box', position: [-25, 6.5, 20], size: [3.2, 6.4, 3.2], color: 0x1b5e20, metalness: 0, roughness: 1, rotation: [0, Math.PI / 4, 0] },

      // Snowmen
      { type: 'sphere', position: [10, 1, 18], size: [1.2, 1.2, 1.2], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'sphere', position: [10, 2.5, 18], size: [0.9, 0.9, 0.9], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'sphere', position: [10, 3.6, 18], size: [0.6, 0.6, 0.6], color: 0xffffff, metalness: 0, roughness: 0.8 },

      { type: 'sphere', position: [-12, 1, -20], size: [1.2, 1.2, 1.2], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'sphere', position: [-12, 2.5, -20], size: [0.9, 0.9, 0.9], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'sphere', position: [-12, 3.6, -20], size: [0.6, 0.6, 0.6], color: 0xffffff, metalness: 0, roughness: 0.8 },

      // Street lamps
      { type: 'cylinder', position: [12, 3, 0], size: [0.2, 6, 0.2], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [12, 6.5, 0], size: [0.5, 0.5, 0.5], color: 0xffd54f, metalness: 0.8, roughness: 0.2, emissive: 0xffd54f, emissiveIntensity: 0.8 },

      { type: 'cylinder', position: [-12, 3, 0], size: [0.2, 6, 0.2], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [-12, 6.5, 0], size: [0.5, 0.5, 0.5], color: 0xffd54f, metalness: 0.8, roughness: 0.2, emissive: 0xffd54f, emissiveIntensity: 0.8 },
    ],
    decorations: [
      { type: 'particle', position: [0, 10, 0], color: 0xffffff, size: 0.12, count: 200 }, // Snowflakes
    ],
  },

  holiday: {
    name: 'holiday',
    displayName: 'Holiday Celebration',
    description: 'Festive winter celebration',
    icon: '🎄',
    colors: {
      primary: 0xff0000, // Red
      secondary: 0x228b22, // Forest green
      accent1: 0xffd700, // Gold
      accent2: 0xffffff, // White
      floor: 0xffffff, // Snow
      background: 0x001f3f, // Dark blue night
      emissive: 0xffd700,
    },
    lighting: {
      ambientIntensity: 0.6,
      mainLightIntensity: 0.9,
      mainLightColor: 0xffffff,
      pointLights: [
        { position: [0, 12, 0], intensity: 0.7, color: 0xffd700, distance: 30 },
        { position: [18, 6, 18], intensity: 0.5, color: 0xff0000, distance: 20 },
        { position: [-18, 6, -18], intensity: 0.5, color: 0x00ff00, distance: 20 },
        { position: [18, 6, -18], intensity: 0.4, color: 0x0000ff, distance: 18 },
        { position: [-18, 6, 18], intensity: 0.4, color: 0xffff00, distance: 18 },
      ],
    },
    fog: {
      color: 0x1a3a52,
      near: 30,
      far: 75,
    },
    buildings: [
      // Large Christmas tree (center-back)
      { type: 'cylinder', position: [0, 4, -25], size: [1.5, 8, 1.5], color: 0x3e2723, metalness: 0, roughness: 1 },
      { type: 'box', position: [0, 8, -25], size: [8, 8, 8], color: 0x228b22, metalness: 0, roughness: 0.9, rotation: [0, Math.PI / 4, 0] },
      { type: 'box', position: [0, 13, -25], size: [6, 6, 6], color: 0x2e7d32, metalness: 0, roughness: 0.9, rotation: [0, Math.PI / 4, 0] },
      { type: 'box', position: [0, 17, -25], size: [4, 4, 4], color: 0x1b5e20, metalness: 0, roughness: 0.9, rotation: [0, Math.PI / 4, 0] },
      { type: 'box', position: [0, 19.5, -25], size: [1, 1, 1], color: 0xffd700, metalness: 1, roughness: 0, emissive: 0xffd700, emissiveIntensity: 1 },

      // Gift boxes around tree
      { type: 'box', position: [-3, 0.8, -22], size: [1.6, 1.6, 1.6], color: 0xff0000, metalness: 0.3, roughness: 0.7 },
      { type: 'box', position: [3, 0.7, -23], size: [1.4, 1.4, 1.4], color: 0x00ff00, metalness: 0.3, roughness: 0.7 },
      { type: 'box', position: [-2, 0.9, -27], size: [1.8, 1.8, 1.8], color: 0x0000ff, metalness: 0.3, roughness: 0.7 },
      { type: 'box', position: [2.5, 0.6, -26], size: [1.2, 1.2, 1.2], color: 0xffd700, metalness: 0.5, roughness: 0.5 },

      // Decorated houses
      { type: 'box', position: [-20, 3, 15], size: [8, 6, 7], color: 0x8b4513, metalness: 0, roughness: 1 },
      { type: 'box', position: [-20, 6.5, 15], size: [9, 1.5, 8], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'box', position: [-20, 7.5, 15], size: [1, 1, 1], color: 0xff0000, metalness: 0.8, roughness: 0.2, emissive: 0xff0000, emissiveIntensity: 0.5 },

      { type: 'box', position: [20, 3, 15], size: [8, 6, 7], color: 0xa0522d, metalness: 0, roughness: 1 },
      { type: 'box', position: [20, 6.5, 15], size: [9, 1.5, 8], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'box', position: [20, 7.5, 15], size: [1, 1, 1], color: 0x00ff00, metalness: 0.8, roughness: 0.2, emissive: 0x00ff00, emissiveIntensity: 0.5 },

      { type: 'box', position: [-20, 3.5, -12], size: [9, 7, 8], color: 0x8b4513, metalness: 0, roughness: 1 },
      { type: 'box', position: [-20, 7.5, -12], size: [10, 1.5, 9], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'box', position: [-20, 8.5, -12], size: [1, 1, 1], color: 0x0000ff, metalness: 0.8, roughness: 0.2, emissive: 0x0000ff, emissiveIntensity: 0.5 },

      { type: 'box', position: [20, 3.5, -12], size: [9, 7, 8], color: 0xa0522d, metalness: 0, roughness: 1 },
      { type: 'box', position: [20, 7.5, -12], size: [10, 1.5, 9], color: 0xffffff, metalness: 0, roughness: 0.8 },
      { type: 'box', position: [20, 8.5, -12], size: [1, 1, 1], color: 0xffd700, metalness: 0.8, roughness: 0.2, emissive: 0xffd700, emissiveIntensity: 0.5 },

      // Candy canes
      { type: 'cylinder', position: [15, 2, 0], size: [0.4, 4, 0.4], color: 0xff0000, metalness: 0.5, roughness: 0.5 },
      { type: 'cylinder', position: [-15, 2, 0], size: [0.4, 4, 0.4], color: 0xff0000, metalness: 0.5, roughness: 0.5 },

      // String lights poles
      { type: 'cylinder', position: [12, 4, 12], size: [0.3, 8, 0.3], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [12, 8.5, 12], size: [0.4, 0.4, 0.4], color: 0xff0000, metalness: 0.8, roughness: 0.2, emissive: 0xff0000, emissiveIntensity: 0.8 },

      { type: 'cylinder', position: [-12, 4, 12], size: [0.3, 8, 0.3], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [-12, 8.5, 12], size: [0.4, 0.4, 0.4], color: 0x00ff00, metalness: 0.8, roughness: 0.2, emissive: 0x00ff00, emissiveIntensity: 0.8 },

      { type: 'cylinder', position: [12, 4, -12], size: [0.3, 8, 0.3], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [12, 8.5, -12], size: [0.4, 0.4, 0.4], color: 0x0000ff, metalness: 0.8, roughness: 0.2, emissive: 0x0000ff, emissiveIntensity: 0.8 },

      { type: 'cylinder', position: [-12, 4, -12], size: [0.3, 8, 0.3], color: 0x424242, metalness: 0.5, roughness: 0.5 },
      { type: 'sphere', position: [-12, 8.5, -12], size: [0.4, 0.4, 0.4], color: 0xffd700, metalness: 0.8, roughness: 0.2, emissive: 0xffd700, emissiveIntensity: 0.8 },
    ],
    decorations: [
      { type: 'particle', position: [0, 12, 0], color: 0xffffff, size: 0.1, count: 180 }, // Snow
      { type: 'particle', position: [0, 6, 0], color: 0xffd700, size: 0.08, count: 60 }, // Golden sparkles
    ],
  },
};

export const THEME_NAMES: string[] = Object.keys(THEMES);

export function getTheme(name: string): Theme {
  return THEMES[name] || THEMES.cyberpunk;
}

export function getRandomTheme(): Theme {
  const names = THEME_NAMES;
  const randomName = names[Math.floor(Math.random() * names.length)];
  return THEMES[randomName];
}

export function getNextTheme(currentName: string): Theme {
  const names = THEME_NAMES;
  const currentIndex = names.indexOf(currentName);
  const nextIndex = (currentIndex + 1) % names.length;
  return THEMES[names[nextIndex]];
}
