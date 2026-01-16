import React from 'react';
import { UIMenuScreen } from './menus';
import { getCopyByKey } from './copy';

interface MenuOverlayProps {
  menu: UIMenuScreen;
  themeName?: string;
}

// Minimal overlay component for Phase 0; can be replaced by design system later
export const MenuOverlay: React.FC<MenuOverlayProps> = ({ menu, themeName }) => {
  const title = menu.title;
  const subtitle = menu.subtitle;

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: 24,
        padding: 16,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        maxWidth: 420,
        backdropFilter: 'blur(6px)',
      }}
      aria-live="polite"
    >
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>{subtitle}</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {menu.actions.map((a) => (
          <li key={a.id}>
            <button
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
              }}
              aria-label={a.label}
              onClick={() => {
                // TODO: Wire intents to app commands/routes/modals
                // eslint-disable-next-line no-console
                console.info('[menu] action', a);
              }}
            >
              {a.icon ? `${a.icon} ` : ''}{a.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Example of copy usage by zone key */}
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
        {getCopyByKey('welcome_plaza.subtitle', themeName)}
      </div>
    </div>
  );
};
