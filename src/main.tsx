import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA service worker safely (bypassed inside iframe sandboxes to prevent SecurityError / Script error)
if (typeof window !== 'undefined' && ('serviceWorker' in navigator) && window.self === window.top) {
  try {
    registerSW({ 
      immediate: true,
      onRegisterError(error) {
        console.warn('PWA registration error bypassed in this context:', error);
      }
    });
  } catch (e) {
    console.warn('PWA registration failed gracefully:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
