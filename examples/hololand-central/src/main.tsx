import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { VerifyEmailCallback } from './pages/VerifyEmailCallback';

console.log('main.tsx loading...');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          {/* Email verification callback */}
          <Route path="/verify-email" element={<VerifyEmailCallback />} />
          
          {/* Hololand Legends (2D Game) */}
          <Route path="/legends" element={
            <div>
              {/* Legends game will be loaded here */}
              <script type="module" src="/legends/index.js"></script>
            </div>
          } />
          
          {/* Main Oasis app */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('React app rendered with router');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color:red;padding:20px;">Error: ${error}</div>`;
}
