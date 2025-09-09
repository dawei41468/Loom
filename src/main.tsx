import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA only in production to avoid HMR issues in dev
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch((registrationError) => {
          console.warn('Service Worker registration failed:', registrationError);
        });
    });
  } else {
    // In development, ensure any previously registered SWs are unregistered to prevent caching stale modules
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
