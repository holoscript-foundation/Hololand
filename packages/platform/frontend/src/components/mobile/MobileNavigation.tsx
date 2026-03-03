/**
 * MobileNavigation
 *
 * Bottom tab bar navigation for mobile viewports (hidden on desktop >= 768px).
 *
 * Features:
 *   - 5 primary tabs: Home, Explore, Create, Market, Profile
 *   - Active tab highlighted with indigo-600 accent colour
 *   - Badge counts on relevant tabs (e.g. notifications on Profile)
 *   - Smooth page transition animation on tab switch
 *   - Hamburger overflow menu: Settings, Help, Voice, Admin
 *   - Swipe gesture support for tab switching (50px threshold)
 *
 * @module components/mobile/MobileNavigation
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile, usePrefersReducedMotion } from '../../hooks/useResponsive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unique identifier for each primary tab. */
export type TabId = 'home' | 'explore' | 'create' | 'market' | 'profile';

/** Overflow menu item identifier. */
export type OverflowId = 'settings' | 'help' | 'voice' | 'admin';

export interface TabBadges {
  home?: number;
  explore?: number;
  create?: number;
  market?: number;
  profile?: number;
}

export interface MobileNavigationProps {
  /** Currently active tab. */
  activeTab: TabId;
  /** Callback invoked when the user selects a tab. */
  onTabChange: (tab: TabId) => void;
  /** Callback invoked when an overflow menu item is selected. */
  onOverflowSelect?: (item: OverflowId) => void;
  /** Badge counts keyed by tab id. Only non-zero values are rendered. */
  badges?: TabBadges;
  /** Children rendered as the page body between header and nav bar. */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Tab metadata
// ---------------------------------------------------------------------------

interface TabMeta {
  id: TabId;
  label: string;
  /** SVG path data for a 24x24 icon. */
  iconPath: string;
}

const TABS: TabMeta[] = [
  {
    id: 'home',
    label: 'Home',
    // House icon
    iconPath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  },
  {
    id: 'explore',
    label: 'Explore',
    // Compass icon
    iconPath:
      'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15.75h.008v.008H12v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  },
  {
    id: 'create',
    label: 'Create',
    // Plus-circle icon
    iconPath: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'market',
    label: 'Market',
    // Shopping bag icon
    iconPath:
      'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z',
  },
  {
    id: 'profile',
    label: 'Profile',
    // User-circle icon
    iconPath:
      'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

const OVERFLOW_ITEMS: { id: OverflowId; label: string; iconPath: string }[] = [
  {
    id: 'settings',
    label: 'Settings',
    iconPath:
      'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87a6.975 6.975 0 011.084.626c.312.216.677.29 1.038.174l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 1.255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.361-.116-.726-.042-1.038.174a6.975 6.975 0 01-1.084.626c-.332.184-.582.496-.644.869l-.214 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.975 6.975 0 01-1.084-.626c-.312-.216-.677-.29-1.038-.174l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-1.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.361.116.726.042 1.038-.174a6.975 6.975 0 011.084-.626c.332-.183.582-.495.644-.869l.214-1.28z',
  },
  {
    id: 'help',
    label: 'Help',
    iconPath:
      'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  },
  {
    id: 'voice',
    label: 'Voice',
    iconPath:
      'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
  },
  {
    id: 'admin',
    label: 'Admin',
    iconPath:
      'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
  },
];

const TAB_IDS = TABS.map((t) => t.id);
const SWIPE_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MobileNavigation({
  activeTab,
  onTabChange,
  onOverflowSelect,
  badges = {},
  children,
}: MobileNavigationProps) {
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  // Swipe tracking refs (avoid re-renders during gesture).
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);

  // Page transition direction for CSS animation.
  const [transitionDir, setTransitionDir] = useState<'left' | 'right' | null>(null);

  // Close overflow menu on outside click.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // -------------------------------------------------------------------------
  // Tab switching helpers
  // -------------------------------------------------------------------------

  const switchTab = useCallback(
    (newTab: TabId) => {
      if (newTab === activeTab) return;
      const oldIdx = TAB_IDS.indexOf(activeTab);
      const newIdx = TAB_IDS.indexOf(newTab);
      setTransitionDir(newIdx > oldIdx ? 'left' : 'right');
      onTabChange(newTab);
      // Clear the transition direction after animation completes.
      setTimeout(() => setTransitionDir(null), reducedMotion ? 0 : 300);
    },
    [activeTab, onTabChange, reducedMotion],
  );

  // -------------------------------------------------------------------------
  // Swipe gesture handlers
  // -------------------------------------------------------------------------

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwiping.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    // Lock into horizontal swipe once threshold met and angle is shallow.
    if (!isSwiping.current && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwiping.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;

      const currentIdx = TAB_IDS.indexOf(activeTab);
      if (deltaX < 0 && currentIdx < TAB_IDS.length - 1) {
        // Swipe left -> next tab
        switchTab(TAB_IDS[currentIdx + 1]);
      } else if (deltaX > 0 && currentIdx > 0) {
        // Swipe right -> previous tab
        switchTab(TAB_IDS[currentIdx - 1]);
      }
    },
    [activeTab, switchTab],
  );

  // -------------------------------------------------------------------------
  // Render nothing on desktop
  // -------------------------------------------------------------------------

  if (!isMobile) return <>{children}</>;

  // -------------------------------------------------------------------------
  // Animations
  // -------------------------------------------------------------------------

  const transitionClass = (() => {
    if (reducedMotion || !transitionDir) return '';
    return transitionDir === 'left'
      ? 'animate-slide-in-left'
      : 'animate-slide-in-right';
  })();

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Page body */}
      <div
        className={`flex-1 overflow-y-auto pb-16 ${transitionClass}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 safe-area-bottom"
        role="navigation"
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-around h-16">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = badges[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${tab.label}${badge ? `, ${badge} notifications` : ''}`}
                onClick={() => switchTab(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center w-full h-full
                  transition-colors duration-200
                  ${isActive ? 'text-indigo-500' : 'text-gray-400 active:text-gray-200'}
                `}
              >
                {/* Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={isActive ? 2 : 1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.iconPath} />
                </svg>

                {/* Label */}
                <span className="text-[10px] mt-0.5 font-medium leading-none">{tab.label}</span>

                {/* Badge */}
                {badge != null && badge > 0 && (
                  <span
                    className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 flex items-center justify-center
                               rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
                    aria-hidden="true"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Hamburger overflow */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More navigation options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex flex-col items-center justify-center w-full h-16 text-gray-400 active:text-gray-200"
            >
              {/* Hamburger icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
              <span className="text-[10px] mt-0.5 font-medium leading-none">More</span>
            </button>

            {/* Overflow dropdown */}
            {menuOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-gray-800 border border-gray-700
                           shadow-xl py-1 z-50"
                role="menu"
              >
                {OVERFLOW_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200
                               hover:bg-gray-700 active:bg-gray-600 transition-colors"
                    onClick={() => {
                      onOverflowSelect?.(item.id);
                      setMenuOpen(false);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-gray-400"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Inline keyframe styles for slide transitions */}
      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(30px); opacity: 0.7; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(-30px); opacity: 0.7; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slide-in-left 300ms ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 300ms ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
