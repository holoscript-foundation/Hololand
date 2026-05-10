import { createElement, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

type EntryMode = 'singleplayer' | 'multiplayer';

// Temporary React host for the current Vite app.
// Canonical product source lives in Landing.holo; remove this in the no-TSX migration.
export function LandingPage() {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState<EntryMode | null>(null);

  useEffect(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
      }, 500);
    }
  }, []);

  const launch = (mode: EntryMode) => {
    setLaunching(mode);
    window.sessionStorage.setItem('hololand_entry_mode', mode);
    window.setTimeout(() => {
      navigate(mode === 'singleplayer' ? '/oasis?mode=singleplayer' : '/central?mode=multiplayer');
    }, 420);
  };

  return createElement(
    'main',
    { style: styles.shell },
    createElement('img', {
      src: '/assets/hololand-plaza-mockup.jpg',
      alt: 'HoloLand plaza mockup',
      style: styles.background,
    }),
    createElement('div', { style: styles.atmosphere }),
    createElement(
      'section',
      { style: styles.menu, 'aria-label': 'HoloLand start' },
      createElement('h1', { style: styles.title }, 'HoloLand'),
      createElement(
        'div',
        { style: styles.actions },
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => launch('singleplayer'),
            disabled: !!launching,
            style: { ...styles.primaryButton, opacity: launching ? 0.72 : 1 },
          },
          'Singleplayer',
        ),
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => launch('multiplayer'),
            disabled: !!launching,
            style: { ...styles.secondaryButton, opacity: launching ? 0.72 : 1 },
          },
          'Online Multiplayer',
        ),
      ),
      launching
        ? createElement(
            'div',
            { style: styles.launching, role: 'status' },
            `Opening ${launching === 'singleplayer' ? 'Oasis' : 'Central'}`,
          )
        : null,
    ),
    createElement(
      'section',
      { style: styles.objectives, 'aria-label': 'starter objectives' },
      createElement(Objective, { checked: !!launching, label: 'Enter the plaza' }),
      createElement(Objective, { checked: false, label: 'Meet a local' }),
      createElement(Objective, { checked: false, label: 'Open a portal' }),
    ),
  );
}

function Objective({ checked, label }: { checked: boolean; label: string }) {
  return createElement(
    'div',
    { style: styles.objective },
    createElement('span', { style: checked ? styles.objectiveDotDone : styles.objectiveDot }),
    createElement('span', null, label),
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#71def2',
    color: 'white',
  },
  background: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center',
  },
  atmosphere: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(9, 96, 130, 0.05) 0%, rgba(4, 15, 22, 0.1) 44%, rgba(4, 12, 19, 0.42) 100%)',
  },
  menu: {
    position: 'absolute',
    left: '50%',
    top: '47%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
    width: 'min(620px, calc(100vw - 32px))',
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(56px, 11vw, 128px)',
    lineHeight: 0.88,
    fontWeight: 900,
    letterSpacing: 0,
    color: '#fffef5',
    textShadow: '0 6px 0 rgba(24, 114, 130, 0.35), 0 18px 45px rgba(0, 40, 56, 0.4)',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButton: {
    minWidth: 190,
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    padding: '14px 20px',
    background: 'linear-gradient(180deg, #fffef6 0%, #ffe58a 100%)',
    color: '#173f49',
    fontSize: 17,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 14px 34px rgba(27, 89, 102, 0.28)',
  },
  secondaryButton: {
    minWidth: 210,
    border: '1px solid rgba(255, 255, 255, 0.78)',
    borderRadius: 8,
    padding: '14px 20px',
    background: 'rgba(10, 95, 120, 0.66)',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 800,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  launching: {
    minHeight: 24,
    color: '#fffef6',
    fontSize: 14,
    fontWeight: 700,
    textShadow: '0 2px 10px rgba(0, 39, 54, 0.55)',
  },
  objectives: {
    position: 'absolute',
    top: 24,
    left: 24,
    display: 'grid',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    background: 'rgba(255, 254, 246, 0.8)',
    border: '1px solid rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
    fontSize: 14,
    fontWeight: 700,
    color: '#173f49',
    boxShadow: '0 10px 26px rgba(20, 70, 76, 0.12)',
  },
  objective: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  objectiveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    border: '1px solid rgba(23, 63, 73, 0.55)',
    background: 'transparent',
  },
  objectiveDotDone: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#00a7c7',
    boxShadow: '0 0 12px rgba(0, 167, 199, 0.8)',
  },
};
