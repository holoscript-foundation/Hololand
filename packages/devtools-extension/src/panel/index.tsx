/**
 * Panel Entry Point
 *
 * Renders the Brittney React component into the panel.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrittneyPanel } from './Panel';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrittneyPanel />
    </React.StrictMode>
  );
}
