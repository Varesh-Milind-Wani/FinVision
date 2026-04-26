import React from 'react';
import ReactDOM from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { applyTheme } from './theme/theme';

setupIonicReact();

// Force light-only UI (prevents any dark flash on refresh).
applyTheme('light');

// Fix iOS "100vh" / address-bar resize issues that can cause blank gaps or cut-off content while scrolling.
// We store the current visual viewport height in a CSS variable and use it in the app shell.
const syncAppHeight = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const h = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight || 0);
  if (h > 0) document.documentElement.style.setProperty('--app-height', `${h}px`);
};

syncAppHeight();
window.addEventListener('resize', syncAppHeight);
window.addEventListener('orientationchange', syncAppHeight);
window.addEventListener('load', syncAppHeight);
window.addEventListener('pageshow', syncAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncAppHeight);
  window.visualViewport.addEventListener('scroll', syncAppHeight);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
