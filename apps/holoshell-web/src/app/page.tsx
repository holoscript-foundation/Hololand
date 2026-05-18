'use client';

import dynamic from 'next/dynamic';

// CRITICAL: R3F / Three.js cannot run on the server. Dynamic import with ssr:false is mandatory.
const HoloShellRouter = dynamic(
  () => import('@hololand/renderer').then((m) => ({ default: m.HoloShellRouter })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#05070f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#88aacc',
          fontSize: 13,
          letterSpacing: '0.5px',
        }}
      >
        Entering the world…
      </div>
    ),
  }
);

export default function HoloShellPage() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#05070f',
      }}
    >
      <HoloShellRouter initialScene="UnderwaterScene" />
    </main>
  );
}
