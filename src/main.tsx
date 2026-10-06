import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker for background & lock-screen reminders
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW register note:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
