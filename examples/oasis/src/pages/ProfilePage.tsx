import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
  const { user, updateProfile, setStatus } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-oasis-text-muted">Please log in to view your profile</p>
      </div>
    );
  }

  const handleSave = async () => {
    await updateProfile(formData);
    setIsEditing(false);
  };

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-oasis-success' },
    { value: 'away', label: 'Away', color: 'bg-oasis-warning' },
    { value: 'busy', label: 'Busy', color: 'bg-oasis-error' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-oasis-primary to-oasis-secondary flex items-center justify-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-bold">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-oasis-surface-light rounded-full flex items-center justify-center border-2 border-oasis-surface hover:bg-oasis-primary transition-colors">
              <CameraIcon className="w-4 h-4 text-oasis-text" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-oasis-text-muted block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-sm text-oasis-text-muted block mb-1">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="input min-h-[80px] resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="btn-primary">
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-oasis-text">{user.displayName}</h1>
                  <button onClick={() => setIsEditing(true)} className="btn-ghost p-1">
                    <EditIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-oasis-text-muted">@{user.username}</p>
                {user.bio && <p className="text-oasis-text mt-2">{user.bio}</p>}
              </>
            )}
          </div>

          {/* Status selector */}
          <div>
            <label className="text-sm text-oasis-text-muted block mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors
                    ${
                      user.status === option.value
                        ? 'bg-oasis-surface-light text-oasis-text'
                        : 'text-oasis-text-muted hover:text-oasis-text'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${option.color}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Worlds Created" value="12" icon={<WorldIcon />} />
        <StatCard label="Friends" value="48" icon={<FriendsIcon />} />
        <StatCard label="Time in VR" value="156h" icon={<VRIcon />} />
        <StatCard label="Achievements" value="23" icon={<TrophyIcon />} />
      </div>

      {/* My Worlds */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-oasis-text">My Worlds</h2>
          <button className="btn-primary text-sm">Create New</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorldPreviewCard name="Chill Lounge" players={3} status="public" />
          <WorldPreviewCard name="Test World" players={0} status="private" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-oasis-text mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <ActivityItem action="Visited" target="Hololand Central" time="2 hours ago" />
          <ActivityItem action="Created" target="Chill Lounge" time="1 day ago" />
          <ActivityItem action="Joined party with" target="Alex, Sarah" time="2 days ago" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-oasis-primary/20 flex items-center justify-center text-oasis-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-oasis-text">{value}</p>
        <p className="text-sm text-oasis-text-muted">{label}</p>
      </div>
    </div>
  );
}

function WorldPreviewCard({
  name,
  players,
  status,
}: {
  name: string;
  players: number;
  status: 'public' | 'private';
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-oasis-surface-light rounded-lg">
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-oasis-primary/20 to-oasis-secondary/20 flex items-center justify-center">
        <WorldIcon className="w-8 h-8 text-oasis-text-muted" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-oasis-text">{name}</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-oasis-text-muted">
            {players} {players === 1 ? 'player' : 'players'}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'public'
                ? 'bg-oasis-success/20 text-oasis-success'
                : 'bg-oasis-warning/20 text-oasis-warning'
            }`}
          >
            {status}
          </span>
        </div>
      </div>
      <button className="btn-ghost p-2">
        <EditIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function ActivityItem({ action, target, time }: { action: string; target: string; time: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-oasis-primary" />
      <p className="text-oasis-text">
        {action} <span className="font-medium">{target}</span>
      </p>
      <span className="text-oasis-text-muted ml-auto">{time}</span>
    </div>
  );
}

// Icons
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function WorldIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function VRIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}
