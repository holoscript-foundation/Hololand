import React from 'react';

export interface HoloShellSurfaceProps {
  endpoint?: string;
  className?: string;
}

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8747';

export const HoloShellSurface: React.FC<HoloShellSurfaceProps> = ({
  endpoint = DEFAULT_ENDPOINT,
  className,
}) => {
  const chatEndpoint = `${endpoint.replace(/\/$/, '')}/api/brittney/chat`;

  return (
    <main className={className} style={styles.shell}>
      <section style={styles.header}>
        <p style={styles.kicker}>HoloShell</p>
        <h1 style={styles.title}>Brittney desktop control</h1>
        <p style={styles.copy}>
          Brittney stays the operator surface while Fara grounds screen, window,
          and click plans. Guarded actions require explicit approval before the
          desktop route can execute anything.
        </p>
      </section>

      <section style={styles.panel} aria-label="Desktop app route">
        <div style={styles.row}>
          <span style={styles.label}>Chat route</span>
          <code style={styles.code}>{chatEndpoint}</code>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>GUI lane</span>
          <strong style={styles.value}>fara_gui_grounding</strong>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Execution posture</span>
          <strong style={styles.value}>plan first, guarded execute later</strong>
        </div>
        <a href={endpoint} target="_blank" rel="noreferrer" style={styles.link}>
          Open desktop HoloShell
        </a>
      </section>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    padding: '48px 24px',
    color: '#d8dee9',
    background: '#101418',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    maxWidth: 820,
    margin: '0 auto 28px',
  },
  kicker: {
    margin: '0 0 8px',
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: 40,
    lineHeight: 1.08,
  },
  copy: {
    margin: '16px 0 0',
    maxWidth: 720,
    color: '#a7b0bd',
    fontSize: 16,
    lineHeight: 1.6,
  },
  panel: {
    maxWidth: 820,
    margin: '0 auto',
    padding: 20,
    border: '1px solid #2c3642',
    borderRadius: 8,
    background: '#151b21',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '150px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #25303a',
  },
  label: {
    color: '#8b98a8',
    fontSize: 13,
  },
  code: {
    overflowWrap: 'anywhere',
    color: '#e5e7eb',
    fontSize: 13,
  },
  value: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  link: {
    display: 'inline-flex',
    marginTop: 18,
    padding: '10px 14px',
    borderRadius: 6,
    color: '#071016',
    background: '#7dd3fc',
    fontWeight: 700,
    textDecoration: 'none',
  },
};

export default HoloShellSurface;
