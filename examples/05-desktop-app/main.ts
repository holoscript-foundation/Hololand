/**
 * Hololand Desktop App Example
 *
 * Demonstrates @hololand/ui for building desktop applications
 * Features: Theme system, layout containers, interactive components
 */

import {
  UICanvas,
  Button,
  Panel,
  Text,
  TextInput,
  Slider,
  Toggle,
  List,
  TabView,
  FlexContainer,
  themeContext,
  darkTheme,
  lightTheme,
} from '@hololand/ui';
import type { ListItem, Tab } from '@hololand/ui';

// Get canvas element
const canvas = document.getElementById('ui-canvas') as HTMLCanvasElement;

// Create UI Canvas with dark theme colors
const uiCanvas = new UICanvas(canvas, {
  width: 1000,
  height: 700,
  transparent: false,
});
uiCanvas.backgroundColor = darkTheme.colors.background;

// ============================================================================
// Header Panel
// ============================================================================
const header = new Panel({
  position: { x: 0, y: 0 },
  size: { width: 1000, height: 60 },
  backgroundColor: darkTheme.colors.surface,
  borderRadius: 0,
});

const title = new Text({
  position: { x: 20, y: 20 },
  content: 'Hololand Desktop App',
  fontSize: 20,
  color: darkTheme.colors.textPrimary,
  fontWeight: '600',
});
header.addChild(title);

// Theme toggle
const themeToggle = new Toggle({
  position: { x: 880, y: 18 },
  checked: true,
  label: 'Dark Mode',
  labelPosition: 'left',
  trackColorOn: darkTheme.colors.primary,
  labelColor: darkTheme.colors.textSecondary,
  onChange: (checked) => {
    const theme = checked ? darkTheme : lightTheme;
    uiCanvas.backgroundColor = theme.colors.background;
    // In a real app, you'd update all component colors here
    console.log('Theme changed to:', checked ? 'dark' : 'light');
  },
});
header.addChild(themeToggle);

uiCanvas.add(header);

// ============================================================================
// Sidebar
// ============================================================================
const sidebar = new Panel({
  position: { x: 0, y: 60 },
  size: { width: 250, height: 640 },
  backgroundColor: darkTheme.colors.surfaceVariant,
  borderRadius: 0,
});

const sidebarTitle = new Text({
  position: { x: 20, y: 20 },
  content: 'Navigation',
  fontSize: 14,
  color: darkTheme.colors.textSecondary,
  fontWeight: '500',
});
sidebar.addChild(sidebarTitle);

// Navigation buttons
const navItems = ['Dashboard', 'Projects', 'Settings', 'Help'];
navItems.forEach((item, index) => {
  const btn = new Button({
    position: { x: 15, y: 50 + index * 50 },
    size: { width: 220, height: 40 },
    text: item,
    backgroundColor: 'transparent',
    textColor: darkTheme.colors.textPrimary,
    hoverColor: darkTheme.colors.surface,
    borderRadius: 8,
    onClick: () => {
      console.log(`Navigated to: ${item}`);
    },
  });
  sidebar.addChild(btn);
});

uiCanvas.add(sidebar);

// ============================================================================
// Main Content Area with Tabs
// ============================================================================
const mainContent = new Panel({
  position: { x: 250, y: 60 },
  size: { width: 750, height: 640 },
  backgroundColor: darkTheme.colors.background,
  borderRadius: 0,
});

// Tab content panels
const dashboardContent = new Panel({
  position: { x: 0, y: 0 },
  size: { width: 730, height: 550 },
  backgroundColor: 'transparent',
});

// Dashboard stats
const statsContainer = new FlexContainer({
  position: { x: 20, y: 20 },
  size: { width: 710, height: 100 },
  direction: 'row',
  gap: 20,
  backgroundColor: 'transparent',
});

const stats = [
  { label: 'Total Users', value: '12,345' },
  { label: 'Active Sessions', value: '1,234' },
  { label: 'Revenue', value: '$45,678' },
];

stats.forEach((stat, index) => {
  const statPanel = new Panel({
    position: { x: 0, y: 0 },
    size: { width: 220, height: 80 },
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
  });

  const valueText = new Text({
    position: { x: 20, y: 20 },
    content: stat.value,
    fontSize: 24,
    color: darkTheme.colors.primary,
    fontWeight: '600',
  });
  statPanel.addChild(valueText);

  const labelText = new Text({
    position: { x: 20, y: 50 },
    content: stat.label,
    fontSize: 12,
    color: darkTheme.colors.textSecondary,
  });
  statPanel.addChild(labelText);

  statsContainer.addChild(statPanel);
});

dashboardContent.addChild(statsContainer);

// Activity list
const activityTitle = new Text({
  position: { x: 20, y: 140 },
  content: 'Recent Activity',
  fontSize: 16,
  color: darkTheme.colors.textPrimary,
  fontWeight: '600',
});
dashboardContent.addChild(activityTitle);

const activityList = new List({
  position: { x: 20, y: 170 },
  size: { width: 710, height: 300 },
  backgroundColor: darkTheme.colors.surface,
  itemBackgroundColor: 'transparent',
  itemHoverColor: darkTheme.colors.surfaceVariant,
  textColor: darkTheme.colors.textPrimary,
  subtextColor: darkTheme.colors.textSecondary,
  borderRadius: 8,
  items: [
    { id: '1', text: 'New user registered', subtext: '2 minutes ago' },
    { id: '2', text: 'Project "VR World" created', subtext: '15 minutes ago' },
    { id: '3', text: 'Payment received', subtext: '1 hour ago' },
    { id: '4', text: 'Server update completed', subtext: '3 hours ago' },
    { id: '5', text: 'New feature deployed', subtext: '5 hours ago' },
  ] as ListItem[],
  onItemClick: (item, index) => {
    console.log('Activity clicked:', item.text);
  },
});
dashboardContent.addChild(activityList);

// Settings content
const settingsContent = new Panel({
  position: { x: 0, y: 0 },
  size: { width: 730, height: 550 },
  backgroundColor: 'transparent',
});

const settingsTitle = new Text({
  position: { x: 20, y: 20 },
  content: 'Application Settings',
  fontSize: 18,
  color: darkTheme.colors.textPrimary,
  fontWeight: '600',
});
settingsContent.addChild(settingsTitle);

// Volume slider
const volumeLabel = new Text({
  position: { x: 20, y: 80 },
  content: 'Volume',
  fontSize: 14,
  color: darkTheme.colors.textSecondary,
});
settingsContent.addChild(volumeLabel);

const volumeSlider = new Slider({
  position: { x: 20, y: 105 },
  size: { width: 300, height: 30 },
  min: 0,
  max: 100,
  value: 75,
  showValue: true,
  activeTrackColor: darkTheme.colors.primary,
  onChange: (value) => {
    console.log('Volume:', value);
  },
});
settingsContent.addChild(volumeSlider);

// Notifications toggle
const notifLabel = new Text({
  position: { x: 20, y: 160 },
  content: 'Notifications',
  fontSize: 14,
  color: darkTheme.colors.textSecondary,
});
settingsContent.addChild(notifLabel);

const notifToggle = new Toggle({
  position: { x: 20, y: 185 },
  checked: true,
  label: 'Enable push notifications',
  trackColorOn: darkTheme.colors.success,
  labelColor: darkTheme.colors.textPrimary,
});
settingsContent.addChild(notifToggle);

// Username input
const usernameLabel = new Text({
  position: { x: 20, y: 250 },
  content: 'Username',
  fontSize: 14,
  color: darkTheme.colors.textSecondary,
});
settingsContent.addChild(usernameLabel);

const usernameInput = new TextInput({
  position: { x: 20, y: 275 },
  size: { width: 300, height: 40 },
  placeholder: 'Enter username...',
  value: 'hololand_user',
  backgroundColor: darkTheme.colors.surface,
  textColor: darkTheme.colors.textPrimary,
  borderColor: darkTheme.colors.border,
  borderRadius: 8,
});
settingsContent.addChild(usernameInput);

// Save button
const saveBtn = new Button({
  position: { x: 20, y: 340 },
  size: { width: 120, height: 40 },
  text: 'Save Settings',
  backgroundColor: darkTheme.colors.primary,
  textColor: '#ffffff',
  borderRadius: 8,
  onClick: () => {
    console.log('Settings saved!');
  },
});
settingsContent.addChild(saveBtn);

// Create tabs
const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', content: dashboardContent },
  { id: 'settings', label: 'Settings', content: settingsContent },
];

const tabView = new TabView({
  position: { x: 10, y: 10 },
  size: { width: 730, height: 620 },
  tabs,
  activeTabId: 'dashboard',
  backgroundColor: 'transparent',
  tabBackgroundColor: 'transparent',
  activeTabColor: darkTheme.colors.surface,
  textColor: darkTheme.colors.textSecondary,
  activeTextColor: darkTheme.colors.textPrimary,
  indicatorColor: darkTheme.colors.primary,
  onTabChange: (tabId) => {
    console.log('Tab changed to:', tabId);
  },
});

mainContent.addChild(tabView);
uiCanvas.add(mainContent);

// Start render loop
uiCanvas.start();

console.log('Hololand Desktop App started!');
console.log('Features demonstrated:');
console.log('- Dark/Light theme toggle');
console.log('- Sidebar navigation');
console.log('- Tabbed content');
console.log('- Stats dashboard');
console.log('- Activity list');
console.log('- Settings with sliders, toggles, inputs');
