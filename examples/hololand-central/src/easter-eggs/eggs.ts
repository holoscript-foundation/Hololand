// Hololand Central - Easter Eggs Data Model (Phase 0)
// Lightweight schema + seeded entries for the 7 downtown zones.

// Zones in Phase 0 central strip
export type ZoneName =
  | 'welcome_plaza'
  | 'builder_shop'
  | 'casino'
  | 'green_machine_arcade'
  | 'b2b_hub'
  | 'brians_gym'
  | 'central_park';

export type TriggerType =
  | 'proximity' // Enter a small radius
  | 'sequence' // Perform an ordered interaction
  | 'time_of_day' // Only at certain times
  | 'multi_user' // Requires >1 player nearby
  | 'theme_variant'; // Depends on current rotating skin

export type RewardType = 'cosmetic' | 'title' | 'sticker' | 'emote' | 'badge';

export interface TriggerConfig {
  type: TriggerType;
  radius?: number; // for proximity (meters)
  position?: [number, number, number]; // world coordinates for proximity
  sequence?: string[]; // for sequence triggers (ids of interactables)
  timeWindow?: { start: string; end: string }; // HH:MM 24h
  minPlayers?: number; // for multi_user
  themeNames?: string[]; // for theme_variant (e.g. ['wild-west','snowy-town'])
}

export interface RewardConfig {
  type: RewardType;
  id: string; // reward identifier (cosmetic id, title code, etc.)
  displayName: string;
  description?: string;
}

export interface EasterEgg {
  id: string;
  zone: ZoneName;
  name: string;
  description: string;
  enabled: boolean;
  cooldownSec?: number; // minimum time before re-trigger
  sponsored?: boolean; // for brand-sponsored eggs
  themeVariants?: string[]; // themes that alter text/visuals
  triggers: TriggerConfig[];
  rewards: RewardConfig[];
}

// Seeded Easter Eggs matching the design document
export const EASTER_EGGS: EasterEgg[] = [
  // Welcome Plaza
  {
    id: 'welcome_concierge_hidden_npc',
    zone: 'welcome_plaza',
    name: 'Hidden Concierge NPC',
    description:
      'A concierge avatar tucked behind the fountain offers a cryptic greeting and a lore hint.',
    enabled: true,
    cooldownSec: 120,
    themeVariants: ['cyberpunk', 'wild-west', 'cityscape', 'snowy-town', 'tropical-paradise'],
    triggers: [{ type: 'proximity', radius: 2.5, position: [1, 0, 3] }],
    rewards: [
      { type: 'sticker', id: 'sticker_concierge', displayName: 'Concierge Sticker' },
      { type: 'badge', id: 'badge_first_discovery', displayName: 'First Discovery' },
    ],
  },
  {
    id: 'welcome_fountain_code_plaque',
    zone: 'welcome_plaza',
    name: 'Encoded City Origin Plaque',
    description:
      'A small plaque near the fountain contains an encoded message about the city origin.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['tap_plaque', 'inspect_runes', 'submit_code'] }],
    rewards: [
      { type: 'title', id: 'title_lore_reader', displayName: 'Lore Reader' },
      { type: 'cosmetic', id: 'cosmetic_plaque_glow', displayName: 'Plaque Glow' },
    ],
  },
  {
    id: 'welcome_sky_walk_unlock',
    zone: 'welcome_plaza',
    name: 'Secret Sky Walk',
    description:
      'Tap the floating cube thrice to reveal a temporary sky walkway above the plaza.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['cube_tap', 'cube_tap', 'cube_tap'] }],
    rewards: [
      { type: 'emote', id: 'emote_air_walk', displayName: 'Air Walk Emote' },
    ],
  },

  // Builder Shop
  {
    id: 'builder_dev_terminal_prototype_skin',
    zone: 'builder_shop',
    name: 'Prototype Tool Skin',
    description:
      'Solve a back-office dev terminal puzzle to unlock a prototype builder tool cosmetic.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['login_terminal', 'solve_puzzle', 'apply_skin'] }],
    rewards: [
      { type: 'cosmetic', id: 'cosmetic_builder_prototype', displayName: 'Prototype Tool Skin' },
    ],
  },
  {
    id: 'builder_blueprint_scavenger',
    zone: 'builder_shop',
    name: 'Blueprint Scavenger Hunt',
    description:
      'Collect hidden blueprint markers across displays to assemble a secret schema.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['bp_1', 'bp_2', 'bp_3', 'bp_4'] }],
    rewards: [
      { type: 'badge', id: 'badge_blueprint_architect', displayName: 'Blueprint Architect' },
    ],
  },

  // Hololand Casino
  {
    id: 'casino_vip_light_sequence',
    zone: 'casino',
    name: 'VIP Door Light Sequence',
    description:
      'A four-light pattern opens the VIP door to a hidden lounge.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['light_1', 'light_3', 'light_2', 'light_4'] }],
    rewards: [
      { type: 'cosmetic', id: 'cosmetic_vip_pin', displayName: 'VIP Pin' },
      { type: 'title', id: 'title_high_roller', displayName: 'High Roller' },
    ],
  },
  {
    id: 'casino_trivia_lucky_charm',
    zone: 'casino',
    name: 'Trivia Lucky Charm',
    description: 'Answer Hololand trivia to earn a lucky charm cosmetic.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['start_trivia', 'answer_qs', 'claim_reward'] }],
    rewards: [
      { type: 'cosmetic', id: 'cosmetic_lucky_charm', displayName: 'Lucky Charm' },
    ],
  },

  // GREEN MACHINE ARCADE
  {
    id: 'arcade_rhythm_perfect_run',
    zone: 'green_machine_arcade',
    name: 'Retro Rhythm Perfect Run',
    description:
      'Achieve a perfect run on the rhythm cabinet to unlock a retro glow cosmetic.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['start_rhythm', 'perfect_run', 'submit_score'] }],
    rewards: [
      { type: 'cosmetic', id: 'cosmetic_retro_glow', displayName: 'Retro Glow' },
      { type: 'badge', id: 'badge_arcade_master', displayName: 'Arcade Master' },
    ],
  },
  {
    id: 'arcade_secret_cabinets',
    zone: 'green_machine_arcade',
    name: 'Secret Cabinets Tribute',
    description: 'Find the tribute cabinets tucked in corners for classic nods.',
    enabled: true,
    triggers: [{ type: 'proximity', radius: 1.5, position: [-5, 0, 5] }],
    rewards: [
      { type: 'sticker', id: 'sticker_classic_arcade', displayName: 'Classic Arcade Sticker' },
    ],
  },

  // B2B Hub
  {
    id: 'b2b_hidden_meeting_pod',
    zone: 'b2b_hub',
    name: 'Hidden Meeting Pod',
    description: 'Discover an unmarked pod with an audio log of a past pitch.',
    enabled: true,
    triggers: [{ type: 'proximity', radius: 2, position: [3, 0, -2] }],
    rewards: [
      { type: 'sticker', id: 'sticker_pitch_deck', displayName: 'Pitch Deck Sticker' },
    ],
  },
  {
    id: 'b2b_bookshelf_secret_panel',
    zone: 'b2b_hub',
    name: 'Bookshelf Secret Panel',
    description: 'Slide a hidden bookshelf panel to reveal a negotiation mini-puzzle.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['tap_book_1', 'tap_book_2', 'slide_panel'] }],
    rewards: [
      { type: 'title', id: 'title_dealmaker', displayName: 'Dealmaker' },
    ],
  },

  // $BRIAN's GYM
  {
    id: 'gym_form_perfect_set',
    zone: 'brians_gym',
    name: 'Form-Perfect Set',
    description: 'Execute a form-perfect set to earn an athlete aura cosmetic.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['warmup', 'rep_form', 'cooldown'] }],
    rewards: [
      { type: 'cosmetic', id: 'cosmetic_athlete_aura', displayName: 'Athlete Aura' },
    ],
  },
  {
    id: 'gym_meditation_forest_vignette',
    zone: 'brians_gym',
    name: 'Meditation Forest Vignette',
    description: 'Complete meditation to reveal a calming forest vignette scene.',
    enabled: true,
    triggers: [{ type: 'time_of_day', timeWindow: { start: '20:00', end: '23:59' } }],
    rewards: [
      { type: 'emote', id: 'emote_calm_breath', displayName: 'Calm Breath' },
    ],
  },

  // Central Park
  {
    id: 'park_fireflies_path',
    zone: 'central_park',
    name: 'Fireflies Path',
    description: 'At night, follow the fireflies to a stage basement entrance.',
    enabled: true,
    triggers: [
      { type: 'time_of_day', timeWindow: { start: '19:00', end: '05:00' } },
      { type: 'proximity', radius: 3, position: [0, 0, -8] },
    ],
    rewards: [
      { type: 'badge', id: 'badge_night_walker', displayName: 'Night Walker' },
    ],
  },
  {
    id: 'park_sculpture_tap_sequence',
    zone: 'central_park',
    name: 'Sculpture Lore Panel',
    description: 'Tap a series of sculptures to reveal an art lore panel.',
    enabled: true,
    triggers: [{ type: 'sequence', sequence: ['sculpt_1', 'sculpt_3', 'sculpt_2'] }],
    rewards: [
      { type: 'title', id: 'title_art_patron', displayName: 'Art Patron' },
    ],
  },
];

// Utilities
export const getAllEggs = (): EasterEgg[] => EASTER_EGGS;
export const getEggsByZone = (zone: ZoneName): EasterEgg[] =>
  EASTER_EGGS.filter((e) => e.zone === zone && e.enabled);
export const getEnabledEggs = (): EasterEgg[] => EASTER_EGGS.filter((e) => e.enabled);
export const getThemeVariantEggs = (themeName: string): EasterEgg[] =>
  EASTER_EGGS.filter((e) => e.themeVariants?.includes(themeName));

// Placeholder logging function (to be wired to backend API later)
export async function registerEggDiscovery(eggId: string, userId: string): Promise<void> {
  // TODO: POST to discovery log API
  // For now, simple console trace
  // eslint-disable-next-line no-console
  console.info(`[easter-egg] discovered`, { eggId, userId, at: new Date().toISOString() });
}
