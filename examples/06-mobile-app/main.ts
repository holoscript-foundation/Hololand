/**
 * Hololand Mobile App Example
 *
 * Demonstrates @hololand/ui for touch-optimized mobile applications
 * Features: Responsive layout, large touch targets, swipe gestures
 */

import {
  UICanvas,
  Button,
  Panel,
  Text,
  Image,
  Slider,
  Toggle,
  List,
  Modal,
  ScrollView,
  darkTheme,
} from '@hololand/ui';
import type { ListItem } from '@hololand/ui';

// Get canvas and set mobile dimensions
const canvas = document.getElementById('ui-canvas') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;

// Responsive sizing
const width = Math.min(400, window.innerWidth);
const height = Math.min(800, window.innerHeight);

canvas.width = width;
canvas.height = height;

// Create UI Canvas
const uiCanvas = new UICanvas(canvas, {
  width,
  height,
  transparent: false,
  pixelRatio: window.devicePixelRatio,
});
uiCanvas.backgroundColor = '#0f0f1a';

// Mobile theme colors
const colors = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  cardHover: '#252542',
  primary: '#6366f1',
  primaryLight: '#818cf8',
  text: '#e0e0e0',
  textSecondary: '#9ca3af',
  success: '#10b981',
  border: '#2d2d44',
};

// ============================================================================
// Status Bar
// ============================================================================
const statusBar = new Panel({
  position: { x: 0, y: 0 },
  size: { width, height: 44 },
  backgroundColor: colors.bg,
});

const timeText = new Text({
  position: { x: width / 2 - 20, y: 14 },
  content: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  fontSize: 14,
  color: colors.text,
  fontWeight: '600',
});
statusBar.addChild(timeText);

uiCanvas.add(statusBar);

// ============================================================================
// Header
// ============================================================================
const header = new Panel({
  position: { x: 0, y: 44 },
  size: { width, height: 60 },
  backgroundColor: colors.bg,
});

const greeting = new Text({
  position: { x: 20, y: 10 },
  content: 'Good evening',
  fontSize: 14,
  color: colors.textSecondary,
});
header.addChild(greeting);

const userName = new Text({
  position: { x: 20, y: 30 },
  content: 'Alex Chen',
  fontSize: 22,
  color: colors.text,
  fontWeight: '600',
});
header.addChild(userName);

// Profile button (touch target: 44x44 minimum)
const profileBtn = new Button({
  position: { x: width - 64, y: 8 },
  size: { width: 44, height: 44 },
  text: 'AC',
  backgroundColor: colors.primary,
  textColor: '#ffffff',
  borderRadius: 22,
  fontSize: 14,
});
header.addChild(profileBtn);

uiCanvas.add(header);

// ============================================================================
// Quick Actions (large touch targets)
// ============================================================================
const actionsPanel = new Panel({
  position: { x: 0, y: 104 },
  size: { width, height: 120 },
  backgroundColor: 'transparent',
});

const actions = [
  { icon: 'VR', label: 'Enter VR', color: colors.primary },
  { icon: 'AR', label: 'AR Mode', color: '#ec4899' },
  { icon: '+', label: 'Create', color: colors.success },
];

const actionWidth = (width - 60) / 3;
actions.forEach((action, index) => {
  const btn = new Button({
    position: { x: 20 + index * (actionWidth + 10), y: 10 },
    size: { width: actionWidth, height: 70 },
    text: action.icon,
    backgroundColor: action.color,
    textColor: '#ffffff',
    borderRadius: 16,
    fontSize: 20,
    fontWeight: '700',
  });
  actionsPanel.addChild(btn);

  const label = new Text({
    position: { x: 20 + index * (actionWidth + 10) + actionWidth / 2 - 25, y: 88 },
    content: action.label,
    fontSize: 12,
    color: colors.textSecondary,
  });
  actionsPanel.addChild(label);
});

uiCanvas.add(actionsPanel);

// ============================================================================
// Recent Worlds Section
// ============================================================================
const sectionTitle = new Text({
  position: { x: 20, y: 234 },
  content: 'Recent Worlds',
  fontSize: 18,
  color: colors.text,
  fontWeight: '600',
});
uiCanvas.add(sectionTitle);

// World cards (horizontal scroll would be ideal, using list for now)
const worlds = [
  { id: '1', text: 'My VR Home', subtext: 'Last visited 2h ago' },
  { id: '2', text: 'Team Workspace', subtext: 'Last visited yesterday' },
  { id: '3', text: 'Game Arena', subtext: 'Last visited 3 days ago' },
  { id: '4', text: 'Art Gallery', subtext: 'Last visited last week' },
];

const worldsList = new List({
  position: { x: 20, y: 264 },
  size: { width: width - 40, height: 200 },
  items: worlds as ListItem[],
  itemHeight: 56,
  backgroundColor: colors.card,
  itemBackgroundColor: 'transparent',
  itemHoverColor: colors.cardHover,
  selectedColor: colors.primary + '30',
  textColor: colors.text,
  subtextColor: colors.textSecondary,
  borderRadius: 16,
  borderColor: colors.border,
  selectable: true,
  onItemClick: (item) => {
    console.log('Opening world:', item.text);
    showModal(`Entering ${item.text}...`);
  },
});
uiCanvas.add(worldsList);

// ============================================================================
// Settings Quick Access
// ============================================================================
const settingsPanel = new Panel({
  position: { x: 20, y: 484 },
  size: { width: width - 40, height: 120 },
  backgroundColor: colors.card,
  borderRadius: 16,
});

const settingsTitle = new Text({
  position: { x: 16, y: 16 },
  content: 'Quick Settings',
  fontSize: 14,
  color: colors.textSecondary,
});
settingsPanel.addChild(settingsTitle);

// Haptics toggle
const hapticsToggle = new Toggle({
  position: { x: 16, y: 50 },
  checked: true,
  label: 'Haptic Feedback',
  trackColorOn: colors.primary,
  labelColor: colors.text,
  onChange: (checked) => {
    console.log('Haptics:', checked);
  },
});
settingsPanel.addChild(hapticsToggle);

// Sound slider
const soundLabel = new Text({
  position: { x: 16, y: 90 },
  content: 'Sound',
  fontSize: 12,
  color: colors.textSecondary,
});
settingsPanel.addChild(soundLabel);

const soundSlider = new Slider({
  position: { x: 80, y: 82 },
  size: { width: width - 140, height: 24 },
  min: 0,
  max: 100,
  value: 80,
  activeTrackColor: colors.primary,
  thumbSize: 20,
});
settingsPanel.addChild(soundSlider);

uiCanvas.add(settingsPanel);

// ============================================================================
// Bottom Navigation
// ============================================================================
const bottomNav = new Panel({
  position: { x: 0, y: height - 80 },
  size: { width, height: 80 },
  backgroundColor: colors.card,
  borderRadius: 0,
});

const navItems = ['Home', 'Explore', 'Create', 'Profile'];
const navWidth = width / navItems.length;

navItems.forEach((item, index) => {
  const isActive = index === 0;
  const btn = new Button({
    position: { x: index * navWidth + (navWidth - 60) / 2, y: 8 },
    size: { width: 60, height: 50 },
    text: item.charAt(0),
    backgroundColor: 'transparent',
    textColor: isActive ? colors.primary : colors.textSecondary,
    fontSize: 20,
    fontWeight: isActive ? '600' : '400',
    onClick: () => {
      console.log('Navigate to:', item);
    },
  });
  bottomNav.addChild(btn);

  const label = new Text({
    position: { x: index * navWidth + (navWidth - 40) / 2, y: 54 },
    content: item,
    fontSize: 10,
    color: isActive ? colors.primary : colors.textSecondary,
  });
  bottomNav.addChild(label);
});

uiCanvas.add(bottomNav);

// ============================================================================
// Modal for actions
// ============================================================================
const modal = new Modal({
  position: { x: (width - 300) / 2, y: (height - 200) / 2 },
  size: { width: 300, height: 200 },
  title: 'Action',
  content: '',
  visible: false,
  backgroundColor: colors.card,
  headerColor: colors.cardHover,
  titleColor: colors.text,
  contentColor: colors.textSecondary,
  borderRadius: 20,
  overlayColor: 'rgba(0, 0, 0, 0.7)',
  onClose: () => {
    modal.close();
  },
});
modal.setCanvasSize(width, height);
uiCanvas.add(modal);

function showModal(message: string) {
  modal.content = message;
  modal.open();
  setTimeout(() => modal.close(), 2000);
}

// Start render loop
uiCanvas.start();

// Update time every minute
setInterval(() => {
  timeText.content = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 60000);

console.log('Hololand Mobile App started!');
console.log('Touch-optimized features:');
console.log('- Large 44px+ touch targets');
console.log('- High contrast colors');
console.log('- Bottom navigation');
console.log('- Haptic feedback toggle');
