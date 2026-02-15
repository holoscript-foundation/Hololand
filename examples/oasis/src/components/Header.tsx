import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated } = useAuthStore();

  return (
    <header className="h-16 glass border-b border-meadow-text/5 flex items-center px-6 gap-4 relative z-10">
      {/* Search bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-meadow-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search worlds, users, or content..."
            className="input pl-11 bg-white/80"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        {/* VR Mode button */}
        <button className="btn-sky flex items-center gap-2">
          <VRIcon className="w-5 h-5" />
          <span className="hidden lg:inline">Enter VR</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-full hover:bg-meadow-cream-dark transition-colors group">
          <BellIcon className="w-5 h-5 text-meadow-text-muted group-hover:text-meadow-text" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-meadow-error rounded-full border-2 border-meadow-cream" />
        </button>
      </div>

      {/* User section */}
      {isAuthenticated && user ? (
        <Link
          to="/profile"
          className="flex items-center gap-3 hover:bg-meadow-cream-dark rounded-xl px-3 py-2 transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-meadow-grass to-meadow-sky flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <span className="text-white text-sm font-semibold">
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-meadow-text">{user.displayName}</p>
            <div className="flex items-center gap-1.5">
              <span className="status-online w-2 h-2" />
              <p className="text-xs text-meadow-text-muted">Online</p>
            </div>
          </div>
        </Link>
      ) : (
        <Link to="/auth/login" className="btn-primary">
          Sign In
        </Link>
      )}
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function VRIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}
