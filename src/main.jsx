import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Small runtime fix: hide any remaining visible "Ações Rápidas" elements
function initHideQuickActions() {
  try {
    const hideOnce = () => {
      document.querySelectorAll('body *').forEach((el) => {
        if (el.children.length === 0) {
          const txt = (el.textContent || '').trim();
          if (/Ações Rápidas/i.test(txt)) {
            const container = el.closest('div') || el.parentElement || el;
            if (container) container.style.display = 'none';
          }
        }
      });
    };

    const observer = new MutationObserver(() => hideOnce());
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.addEventListener('load', hideOnce);
      // run once after short delay to catch client renders
      setTimeout(hideOnce, 800);
    }
  } catch (e) {
    // fail silently
  }
}

initHideQuickActions();

// Temporarily disable initial animations to avoid page entrance effects on reload
try {
  document.documentElement.classList.add('disable-initial-anim');
  // Remove the class shortly after mount to allow normal interactions/animations afterwards
  setTimeout(() => document.documentElement.classList.remove('disable-initial-anim'), 800);
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);