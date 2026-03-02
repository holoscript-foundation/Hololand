'use client';

import type { StudioTab } from '@/lib/types';

interface TabBarProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
}

const TABS: { id: StudioTab; label: string; shortLabel: string }[] = [
  { id: 'body', label: 'Body', shortLabel: 'Body' },
  { id: 'face', label: 'Face', shortLabel: 'Face' },
  { id: 'hair', label: 'Hair', shortLabel: 'Hair' },
  { id: 'clothing', label: 'Clothing', shortLabel: 'Cloth' },
  { id: 'accessories', label: 'Accessories', shortLabel: 'Acc.' },
  { id: 'expressions', label: 'Expressions', shortLabel: 'Expr.' },
  { id: 'export', label: 'Export', shortLabel: 'Exp.' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="flex border-b border-studio-border overflow-x-auto scrollbar-none">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`studio-tab whitespace-nowrap flex-shrink-0 ${
            activeTab === tab.id ? 'studio-tab-active' : ''
          }`}
        >
          <span className="hidden sm:inline">{tab.label}</span>
          <span className="sm:hidden">{tab.shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}
