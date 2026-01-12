/**
 * Hololand Hybrid Dashboard Example
 *
 * Demonstrates the universal platform capabilities:
 * - 2D UI controls (left sidebar)
 * - 3D VR data visualization (center)
 * - Seamless integration between 2D and 3D
 *
 * This works on:
 * - Desktop browsers (keyboard/mouse)
 * - Mobile devices (touch)
 * - VR headsets (WebXR)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
