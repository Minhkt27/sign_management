import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress known camera cleanup errors from html5-qrcode library
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? String(event.reason ?? '');
  if (
    msg.includes('Scanner is not running') ||
    msg.includes('Camera') ||
    msg.includes('HTMLVideoElement') ||
    msg.includes('getUserMedia')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
