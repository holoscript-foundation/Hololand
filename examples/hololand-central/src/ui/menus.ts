// Menu Schema for Hololand Central (Phase 0)
// Typed menu screens/actions per zone, theme-aware.

export type Zone =
  | 'welcome_plaza'
  | 'builder_shop'
  | 'casino'
  | 'green_machine_arcade'
  | 'b2b_hub'
  | 'brians_gym'
  | 'central_park';

export interface UIAction {
  id: string;
  label: string;
  icon?: string;
  intent: 'navigate' | 'start' | 'open' | 'purchase' | 'submit' | 'info';
  payload?: Record<string, any>;
}

export interface UIMenuScreen {
  id: string;
  zone: Zone;
  title: string;
  subtitle?: string;
  layout: 'list' | 'grid' | 'cards';
  actions: UIAction[];
  themeVariants?: Record<string, Partial<UIMenuScreen>>; // override title/subtitle/layout
}

export const MENUS: UIMenuScreen[] = [
  {
    id: 'plaza_orientation',
    zone: 'welcome_plaza',
    title: 'Start Here',
    subtitle: 'Quick links around the strip',
    layout: 'list',
    actions: [
      { id: 'nav_builder_shop', label: 'Builder Shop', intent: 'navigate', payload: { zone: 'builder_shop' } },
      { id: 'nav_arcade', label: 'GREEN MACHINE ARCADE', intent: 'navigate', payload: { zone: 'green_machine_arcade' } },
      { id: 'nav_casino', label: 'Hololand Casino', intent: 'navigate', payload: { zone: 'casino' } },
      { id: 'nav_b2b', label: 'B2B Hub', intent: 'navigate', payload: { zone: 'b2b_hub' } },
      { id: 'nav_gym', label: "$BRIAN's GYM", intent: 'navigate', payload: { zone: 'brians_gym' } },
      { id: 'nav_park', label: 'Central Park', intent: 'navigate', payload: { zone: 'central_park' } },
    ],
  },
  {
    id: 'builder_shop_actions',
    zone: 'builder_shop',
    title: 'Creator Tools',
    subtitle: 'Build, preview, and publish',
    layout: 'grid',
    actions: [
      { id: 'browse_assets', label: 'Browse Assets', intent: 'open', payload: { modal: 'asset_browser' } },
      { id: 'purchase_token', label: 'Purchase', intent: 'purchase', payload: { sku: 'asset_pack_basic' } },
      { id: 'open_portfolio', label: 'Portfolio', intent: 'open', payload: { modal: 'creator_portfolio' } },
      { id: 'preview_templates', label: 'Templates', intent: 'open', payload: { modal: 'template_picker' } },
    ],
  },
  {
    id: 'casino_tournament',
    zone: 'casino',
    title: 'Tournaments',
    subtitle: 'Compete for cosmetic prizes',
    layout: 'cards',
    actions: [
      { id: 'join_tournament', label: 'Join Now', intent: 'start', payload: { game: 'tower_climb' } },
      { id: 'view_rules', label: 'View Rules', intent: 'info' },
    ],
  },
  {
    id: 'arcade_menu',
    zone: 'green_machine_arcade',
    title: 'Arcade Select',
    subtitle: 'Choose your cabinet',
    layout: 'grid',
    actions: [
      { id: 'start_rhythm', label: 'Rhythm Master', intent: 'start', payload: { game: 'rhythm' } },
      { id: 'start_space_invaders', label: 'Space Invaders VR', intent: 'start', payload: { game: 'invaders_vr' } },
      { id: 'leaderboard', label: 'Leaderboard', intent: 'open', payload: { modal: 'leaderboard' } },
    ],
  },
  {
    id: 'b2b_actions',
    zone: 'b2b_hub',
    title: 'Enterprise Hub',
    subtitle: 'Events and partnerships',
    layout: 'list',
    actions: [
      { id: 'book_event', label: 'Book Event', intent: 'submit', payload: { form: 'event_booking' } },
      { id: 'meet_now', label: 'Start Meeting', intent: 'start', payload: { meeting: true } },
      { id: 'sponsorship_inquiry', label: 'Sponsorship Inquiry', intent: 'submit', payload: { form: 'sponsorship' } },
    ],
  },
  {
    id: 'gym_actions',
    zone: 'brians_gym',
    title: "$BRIAN's GYM",
    subtitle: 'VR fitness & meditation',
    layout: 'grid',
    actions: [
      { id: 'start_workout', label: 'Start Workout', intent: 'start', payload: { program: 'starter' } },
      { id: 'start_meditation', label: 'Meditation', intent: 'start', payload: { program: 'meditation' } },
      { id: 'view_leaderboard', label: 'Leaderboard', intent: 'open', payload: { modal: 'leaderboard' } },
    ],
  },
  {
    id: 'park_schedule',
    zone: 'central_park',
    title: 'Central Park',
    subtitle: 'Live events and showcases',
    layout: 'list',
    actions: [
      { id: 'view_schedule', label: 'View Schedule', intent: 'open', payload: { modal: 'schedule' } },
      { id: 'visit_art', label: 'Art Showcase', intent: 'navigate', payload: { area: 'sculpture_gallery' } },
      { id: 'open_portals', label: 'Portals', intent: 'navigate', payload: { area: 'portal_hub' } },
    ],
  },
];

export function getMenuById(id: string): UIMenuScreen | undefined {
  return MENUS.find((m) => m.id === id);
}
