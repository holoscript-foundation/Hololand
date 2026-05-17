import { Link } from 'react-router-dom';
import type { Friend } from '@/stores/socialStore';

interface FriendsOnlineProps {
  friends: Friend[];
}

export default function FriendsOnline({ friends }: FriendsOnlineProps) {
  if (friends.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-meadow-text mb-4 text-lg">Friends Online</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-meadow-cream-dark mx-auto mb-4 flex items-center justify-center">
            <OfflineIcon className="w-8 h-8 text-meadow-text-muted" />
          </div>
          <p className="text-sm text-meadow-text-muted mb-3">No friends online right now</p>
          <Link
            to="/social"
            className="text-sm text-meadow-grass hover:text-meadow-grass-dark font-medium inline-flex items-center gap-1"
          >
            Find friends
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-meadow-text text-lg">Friends Online</h3>
        <span className="badge-grass">{friends.length} online</span>
      </div>

      <div className="space-y-2">
        {friends.slice(0, 5).map((friend) => (
          <FriendItem key={friend.id} friend={friend} />
        ))}
      </div>

      {friends.length > 5 && (
        <Link
          to="/social"
          className="flex items-center justify-center gap-1 text-sm text-meadow-grass hover:text-meadow-grass-dark font-medium mt-4 pt-4 border-t border-meadow-text/10"
        >
          See all {friends.length} online
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function FriendItem({ friend }: { friend: Friend }) {
  const statusColors = {
    online: 'status-online',
    away: 'status-away',
    busy: 'status-busy',
    offline: 'status-offline',
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-meadow-cream-dark/50 transition-colors">
      {/* Avatar */}
      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-meadow-grass to-meadow-sky flex items-center justify-center shadow-sm">
          {friend.avatarUrl ? (
            <img
              src={friend.avatarUrl}
              alt={friend.displayName}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {friend.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {/* Status indicator */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${statusColors[friend.status]} border-2 border-meadow-cream`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-meadow-text truncate">{friend.displayName}</p>
        {friend.currentWorld ? (
          <p className="text-xs text-meadow-text-muted truncate flex items-center gap-1">
            <GlobeIcon className="w-3 h-3" />
            {friend.currentWorld.name}
          </p>
        ) : (
          <p className="text-xs text-meadow-text-muted">
            {friend.status === 'online' ? 'In lobby' : capitalizeFirst(friend.status)}
          </p>
        )}
      </div>

      {/* Action */}
      {friend.currentWorld && (
        <Link to={`/world/${friend.currentWorld.id}`} className="btn-primary text-xs px-3 py-1.5">
          Join
        </Link>
      )}
    </div>
  );
}

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}
