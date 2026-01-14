import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('main.tsx loading...');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React app rendered');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color:red;padding:20px;">Error: ${error}</div>`;
}
