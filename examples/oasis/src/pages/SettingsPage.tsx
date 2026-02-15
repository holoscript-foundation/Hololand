import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', label: 'General', icon: <SettingsIcon /> },
    { id: 'audio', label: 'Audio & Video', icon: <AudioIcon /> },
    { id: 'graphics', label: 'Graphics', icon: <GraphicsIcon /> },
    { id: 'controls', label: 'Controls', icon: <ControlsIcon /> },
    { id: 'privacy', label: 'Privacy', icon: <PrivacyIcon /> },
    { id: 'account', label: 'Account', icon: <AccountIcon /> },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold text-oasis-text mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${activeSection === section.id
                    ? 'bg-oasis-surface-light text-oasis-text'
                    : 'text-oasis-text-muted hover:text-oasis-text'
                  }
                `}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card p-6">
          {activeSection === 'general' && (
            <GeneralSettings theme={theme} setTheme={setTheme} />
          )}
          {activeSection === 'audio' && <AudioSettings />}
          {activeSection === 'graphics' && <GraphicsSettings />}
          {activeSection === 'controls' && <ControlsSettings />}
          {activeSection === 'privacy' && <PrivacySettings />}
          {activeSection === 'account' && (
            <AccountSettings user={user} logout={logout} />
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">General Settings</h2>

      <SettingRow
        label="Theme"
        description="Choose your preferred color scheme"
      >
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="input w-40"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Language"
        description="Select your preferred language"
      >
        <select className="input w-40">
          <option>English</option>
          <option>Spanish</option>
          <option>Japanese</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Notifications"
        description="Receive push notifications"
      >
        <Toggle defaultChecked />
      </SettingRow>

      <SettingRow
        label="Sound Effects"
        description="Play UI sound effects"
      >
        <Toggle defaultChecked />
      </SettingRow>
    </div>
  );
}

function AudioSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">Audio & Video</h2>

      <SettingRow
        label="Master Volume"
        description="Overall volume level"
      >
        <input type="range" min="0" max="100" defaultValue="80" className="w-40" />
      </SettingRow>

      <SettingRow
        label="Voice Chat"
        description="Enable voice chat"
      >
        <Toggle defaultChecked />
      </SettingRow>

      <SettingRow
        label="Microphone"
        description="Select input device"
      >
        <select className="input w-48">
          <option>Default Microphone</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Push to Talk"
        description="Hold key to transmit voice"
      >
        <Toggle />
      </SettingRow>
    </div>
  );
}

function GraphicsSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">Graphics</h2>

      <SettingRow
        label="Quality Preset"
        description="Overall graphics quality"
      >
        <select className="input w-40">
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Ultra</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Resolution Scale"
        description="Render resolution multiplier"
      >
        <select className="input w-40">
          <option>50%</option>
          <option>75%</option>
          <option>100%</option>
          <option>125%</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Anti-Aliasing"
        description="Smooth jagged edges"
      >
        <select className="input w-40">
          <option>Off</option>
          <option>FXAA</option>
          <option>TAA</option>
        </select>
      </SettingRow>

      <SettingRow
        label="V-Sync"
        description="Synchronize with display refresh rate"
      >
        <Toggle defaultChecked />
      </SettingRow>
    </div>
  );
}

function ControlsSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">Controls</h2>

      <SettingRow
        label="Mouse Sensitivity"
        description="Look speed with mouse"
      >
        <input type="range" min="1" max="10" defaultValue="5" className="w-40" />
      </SettingRow>

      <SettingRow
        label="Invert Y-Axis"
        description="Invert vertical look direction"
      >
        <Toggle />
      </SettingRow>

      <SettingRow
        label="VR Comfort Mode"
        description="Reduce motion sickness in VR"
      >
        <Toggle defaultChecked />
      </SettingRow>

      <div className="pt-4">
        <button className="btn-secondary">Configure Key Bindings</button>
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">Privacy</h2>

      <SettingRow
        label="Online Status"
        description="Show when you're online"
      >
        <Toggle defaultChecked />
      </SettingRow>

      <SettingRow
        label="Activity Status"
        description="Show what world you're in"
      >
        <Toggle defaultChecked />
      </SettingRow>

      <SettingRow
        label="Friend Requests"
        description="Who can send you friend requests"
      >
        <select className="input w-40">
          <option>Everyone</option>
          <option>Friends of Friends</option>
          <option>Nobody</option>
        </select>
      </SettingRow>

      <SettingRow
        label="Party Invites"
        description="Who can invite you to parties"
      >
        <select className="input w-40">
          <option>Everyone</option>
          <option>Friends Only</option>
          <option>Nobody</option>
        </select>
      </SettingRow>
    </div>
  );
}

function AccountSettings({ user, logout }: { user: ReturnType<typeof useAuthStore>['user']; logout: () => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-oasis-text">Account</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-oasis-text-muted">Email</label>
          <p className="text-oasis-text">{user?.email || 'Not set'}</p>
        </div>

        <div>
          <label className="text-sm text-oasis-text-muted">Username</label>
          <p className="text-oasis-text">@{user?.username || 'unknown'}</p>
        </div>

        <div>
          <label className="text-sm text-oasis-text-muted">Member since</label>
          <p className="text-oasis-text">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
      </div>

      <hr className="border-white/10" />

      <div className="space-y-3">
        <button className="btn-secondary w-full">Change Password</button>
        <button className="btn-secondary w-full">Link Wallet</button>
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-oasis-error/20 text-oasis-error rounded-lg hover:bg-oasis-error/30 transition-colors"
        >
          Log Out
        </button>
      </div>

      <hr className="border-white/10" />

      <div>
        <button className="text-sm text-oasis-error hover:underline">
          Delete Account
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm font-medium text-oasis-text">{label}</p>
        <p className="text-xs text-oasis-text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`
        w-11 h-6 rounded-full transition-colors relative
        ${checked ? 'bg-oasis-primary' : 'bg-oasis-surface-light'}
      `}
    >
      <span
        className={`
          absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// Icons
function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function GraphicsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ControlsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
