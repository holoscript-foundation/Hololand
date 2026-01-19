import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { OasisPage } from './pages/OasisPage';
import { CentralPage } from './pages/CentralPage';
import { VerifyEmailCallback } from './pages/VerifyEmailCallback';
import './styles.css';

console.log('main.tsx loading...');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Oasis - Planet View */}
          <Route path="/oasis" element={<OasisPage />} />
          
          {/* Central - Buildings Hub */}
          <Route path="/central" element={<CentralPage />} />
          
          {/* Email verification callback */}
          <Route path="/verify-email" element={<VerifyEmailCallback />} />
          
          {/* Hololand Legends (2D Game) */}
          <Route path="/legends" element={
            <div>
              {/* Legends game will be loaded here */}
              <script type="module" src="/legends/index.js"></script>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('React app rendered with router');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color:red;padding:20px;">Error: ${error}</div>`;
}
