/**
 * HoloShellPage
 *
 * Route: /holoshell
 *
 * The "OS for everyone" surface of Hololand.
 * Renders the HoloShellRouter which manages natural-phenomena scene navigation.
 * Default scene: UnderwaterScene (most universally legible, bubbles invite first touch).
 *
 * Design authority: D.045 (two-surface product) / D.049-D.051 (natural phenomena UX)
 */

import React from 'react';
import { HoloShellRouter } from '../../components/holoshell';

const HoloShellPage: React.FC = () => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#05070f',
      }}
    >
      <HoloShellRouter
        initialScene="UnderwaterScene"
        className="holoshell-root"
      />
    </div>
  );
};

export default HoloShellPage;
