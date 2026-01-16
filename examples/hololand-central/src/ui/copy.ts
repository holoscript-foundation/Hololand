// Copy Registry for Hololand Central (Phase 0)
// Typed definitions for developer/creator-authored copy, theme-aware.

export type ZoneCopyKey =
  | 'welcome_plaza.title'
  | 'welcome_plaza.subtitle'
  | 'builder_shop.tagline'
  | 'casino.disclaimer'
  | 'arcade.cta'
  | 'b2b.welcome'
  | 'gym.slogan'
  | 'park.event_notice';

export interface CopyEntry {
  key: ZoneCopyKey;
  zone:
    | 'welcome_plaza'
    | 'builder_shop'
    | 'casino'
    | 'green_machine_arcade'
    | 'b2b_hub'
    | 'brians_gym'
    | 'central_park';
  defaultText: string;
  description?: string;
  themeVariants?: Record<string, string>; // map theme name -> variant text
  i18nKey?: string; // optional; future translation key
}

export const COPY_REGISTRY: CopyEntry[] = [
  {
    key: 'welcome_plaza.title',
    zone: 'welcome_plaza',
    defaultText: 'Welcome to Hololand Oasis',
    description: 'Main orientation headline in the plaza',
    themeVariants: {
      cyberpunk: 'Welcome to Hololand Oasis — Neon Edition',
      'wild-west': 'Welcome to Hololand Oasis — Frontier Edition',
      cityscape: 'Welcome to Hololand Oasis — Skyline Edition',
      'snowy-town': 'Welcome to Hololand Oasis — Winter Festival',
      'tropical-paradise': 'Welcome to Hololand Oasis — Island Breeze',
    },
  },
  {
    key: 'welcome_plaza.subtitle',
    zone: 'welcome_plaza',
    defaultText: 'Explore the strip, meet creators, and launch your world.',
  },
  {
    key: 'builder_shop.tagline',
    zone: 'builder_shop',
    defaultText: 'Build faster. Sell smarter. Shine brighter.',
  },
  {
    key: 'casino.disclaimer',
    zone: 'casino',
    defaultText: 'All games award cosmetic rewards only in Phase 0.',
  },
  {
    key: 'arcade.cta',
    zone: 'green_machine_arcade',
    defaultText: 'Pick a cabinet and climb the leaderboard.',
  },
  {
    key: 'b2b.welcome',
    zone: 'b2b_hub',
    defaultText: 'Connect with brands, book events, and collaborate.',
  },
  {
    key: 'gym.slogan',
    zone: 'brians_gym',
    defaultText: "Train hard. Glow harder.",
    themeVariants: {
      'snowy-town': 'Warm up and glow — winter gains.',
    },
  },
  {
    key: 'park.event_notice',
    zone: 'central_park',
    defaultText: 'Tonight: Live showcase on the main stage.',
  },
];

export function getCopyByKey(key: ZoneCopyKey, themeName?: string): string {
  const entry = COPY_REGISTRY.find((c) => c.key === key);
  if (!entry) return '';
  if (themeName && entry.themeVariants && entry.themeVariants[themeName]) {
    return entry.themeVariants[themeName];
  }
  return entry.defaultText;
}
