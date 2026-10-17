import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { restoreNewerNativeCopy } from './data/nativeMirror.js';
import { setupAndroidBackButton } from './lib/androidBack.js';
import { isNativeApp } from './lib/platform.js';
import { setupPWA } from './pwa.js';
import './styles/tokens.css';
import './styles/base.css';

setupPWA();

// In the Android app, recover any change newer than LocalStorage before the store loads.
if (isNativeApp) {
  await restoreNewerNativeCopy();
  setupAndroidBackButton();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
