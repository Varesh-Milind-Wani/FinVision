import React, { useEffect, useState } from 'react';
import { IonApp } from '@ionic/react';
import AuthScreen from './components/AuthScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AmountsVisibilityProvider } from './contexts/AmountsVisibilityContext';
import MainLayout from './components/MainLayout';
import LandingPage from './components/LandingPage';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState(() => {
    try {
      return window.localStorage?.getItem('finvision.entryMode') === 'app' ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  });

  useEffect(() => {
    // Force light-only UI (prevents any dark flash on refresh).
    try {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#ffffff');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-app-boot', '1');
    root.removeAttribute('data-app-ready');

    let raf1 = 0;
    let raf2 = 0;
    let t = 0;
    let idle = 0;

    const markReady = () => {
      root.setAttribute('data-app-ready', '1');
    };

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        // After the first paint, wait for an idle slice (or a short timeout) before enabling
        // expensive effects. This reduces refresh jank and keeps KPI counters smooth.
        if (typeof window.requestIdleCallback === 'function') {
          idle = window.requestIdleCallback(markReady, { timeout: 1400 });
        } else {
          t = window.setTimeout(markReady, 850);
        }
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (t) window.clearTimeout(t);
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
    };
  }, []);
  
  if (mode !== 'app') {
    return (
      <LandingPage
        onGetStarted={() => {
          try {
            window.localStorage?.setItem('finvision.entryMode', 'app');
            window.localStorage?.setItem('finvision.activeTab', 'dashboard');
          } catch {
            // ignore
          }
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'dashboard');
            window.history.replaceState({ tab: 'dashboard' }, '', url.toString());
          } catch {
            // ignore
          }
          setMode('app');
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <MainLayout />;
};

function App() {
  return (
    <IonApp>
      <AuthProvider>
        <ExpenseProvider>
          <CurrencyProvider>
            <AmountsVisibilityProvider>
              <AppContent />
            </AmountsVisibilityProvider>
          </CurrencyProvider>
        </ExpenseProvider>
      </AuthProvider>
    </IonApp>
  );
}

export default App;
