/**
 * HoloScript Playground - Browser Entry Point
 * 
 * The vision: Build 3D worlds through the browser in real-time using HoloScript.
 * Write code → See world update instantly.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
