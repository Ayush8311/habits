import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { setupPWA } from './pwa.js';
import './styles/tokens.css';
import './styles/base.css';

setupPWA();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
