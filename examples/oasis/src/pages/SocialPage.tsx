import { useState } from 'react';
import { useSocialStore } from '@/stores/socialStore';

type Tab = 'friends' | 'parties' | 'chat';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const { friends, parties, notifications } = useSocialStore();

  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-oasis-text">Social Hub</h1>
          <p className="text-oasis-text-muted mt-1">
            Connect with friends and join parties
          </p>
        </div>

        {/* Notifications */}
        <button className="btn-ghost relative">
          <BellIcon className="w-5 h-5" />
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-oasis-error text-white text-xs rounded-full flex items-center justify-center">
              {notifications.filter((n) => !n.read).length}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-oasis-surface-light rounded-lg p-1">
        <TabButton
          active={activeTab === 'friends'}
          onClick={() => setActiveTab('friends')}
          count={onlineFriends.length}
        >
          Friends
        </TabButton>
        <TabButton
          active={activeTab === 'parties'}
          onClick={() => setActiveTab('parties')}
          count={parties.length}
        >
          Parties
        </TabButton>
        <TabButton
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </TabButton>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {activeTab === 'friends' && <FriendsPanel friends={friends} />}
          {activeTab === 'parties' && <PartiesPanel parties={parties} />}
          {activeTab === 'chat' && <ChatPanel />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="card p-4">
            <h3 className="font-semibold text-oasis-text mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn-primary w-full">Add Friend</button>
              <button className="btn-secondary w-full">Create Party</button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="card p-4">
            <h3 className="font-semibold text-oasis-text mb-3">Recent Activity</h3>
            <div className="space-y-3">
              <ActivityItem
                icon={<JoinIcon />}
                text="Alex joined Hololand Central"
                time="2 min ago"
              />
              <ActivityItem
                icon={<PartyIcon />}
                text="Sarah created a party"
                time="5 min ago"
              />
              <ActivityItem
                icon={<FriendIcon />}
                text="Mike sent you a friend request"
                time="10 min ago"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${active
          ? 'bg-oasis-surface text-oasis-text'
          : 'text-oasis-text-muted hover:text-oasis-text'
        }
      `}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-2 text-xs bg-oasis-primary/20 text-oasis-primary px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

function FriendsPanel({ friends }: { friends: ReturnType<typeof useSocialStore>['friends'] }) {
  const onlineFriends = friends.filter((f) => f.status !== 'offline');
  const offlineFriends = friends.filter((f) => f.status === 'offline');

  return (
    <div className="space-y-6">
      {/* Online friends */}
      <div className="card p-4">
        <h3 className="font-semibold text-oasis-text mb-4">
          Online — {onlineFriends.length}
        </h3>
        {onlineFriends.length === 0 ? (
          <p className="text-sm text-oasis-text-muted py-4 text-center">
            No friends online
          </p>
        ) : (
          <div className="space-y-2">
            {onlineFriends.map((friend) => (
              <FriendRow key={friend.id} friend={friend} />
            ))}
          </div>
        )}
      </div>

      {/* Offline friends */}
      {offlineFriends.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-oasis-text mb-4">
            Offline — {offlineFriends.length}
          </h3>
          <div className="space-y-2 opacity-60">
            {offlineFriends.map((friend) => (
              <FriendRow key={friend.id} friend={friend} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FriendRow({ friend }: { friend: ReturnType<typeof useSocialStore>['friends'][0] }) {
  const statusColors = {
    online: 'bg-oasis-success',
    away: 'bg-oasis-warning',
    busy: 'bg-oasis-error',
    offline: 'bg-gray-500',
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-oasis-surface-light transition-colors">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-oasis-primary to-oasis-secondary flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {friend.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-oasis-surface ${statusColors[friend.status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-oasis-text">{friend.displayName}</p>
        <p className="text-xs text-oasis-text-muted">
          {friend.currentWorld ? `In: ${friend.currentWorld.name}` : friend.status}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost p-2" title="Message">
          <ChatIcon className="w-4 h-4" />
        </button>
        {friend.currentWorld && (
          <button className="btn-ghost p-2" title="Join">
            <JoinIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function PartiesPanel({ parties }: { parties: ReturnType<typeof useSocialStore>['parties'] }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-oasis-text mb-4">Your Parties</h3>
      {parties.length === 0 ? (
        <div className="text-center py-8">
          <PartyIcon className="w-12 h-12 text-oasis-text-muted mx-auto mb-3" />
          <p className="text-oasis-text-muted">No active parties</p>
          <button className="btn-primary mt-4">Create Party</button>
        </div>
      ) : (
        <div className="space-y-3">
          {parties.map((party) => (
            <div key={party.id} className="p-3 bg-oasis-surface-light rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-oasis-text">{party.name}</h4>
                <span className="text-xs text-oasis-text-muted">
                  {party.members.length}/{party.maxSize}
                </span>
              </div>
              <div className="flex -space-x-2">
                {party.members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-oasis-primary to-oasis-secondary border-2 border-oasis-surface flex items-center justify-center"
                  >
                    <span className="text-white text-xs">
                      {member.displayName.charAt(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="card h-96 flex flex-col">
      <div className="p-4 border-b border-white/5">
        <h3 className="font-semibold text-oasis-text">Global Chat</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-sm text-oasis-text-muted text-center py-8">
          Chat messages will appear here
        </p>
      </div>
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="input flex-1"
          />
          <button className="btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-oasis-surface-light flex items-center justify-center text-oasis-text-muted">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-oasis-text">{text}</p>
        <p className="text-xs text-oasis-text-muted">{time}</p>
      </div>
    </div>
  );
}

// Icons
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function JoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );
}

function PartyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function FriendIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}
