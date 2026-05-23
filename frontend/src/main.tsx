import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent html5-qrcode camera cleanup errors from crashing the React tree
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
