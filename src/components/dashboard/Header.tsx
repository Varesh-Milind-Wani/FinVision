import React, { useEffect, useMemo, useState } from 'react';
import mark from '../../assets/finvision-mark.svg';
import { ChevronDownIcon } from './icons';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const raw = window.localStorage?.getItem?.('finvision.activeTab');
      return typeof raw === 'string' && raw ? raw : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    const onNavigateEvent = (e: any) => {
      const tab = e?.detail?.tab;
      if (typeof tab === 'string' && tab) setActiveTab(tab);
    };
    window.addEventListener('finvision:navigate', onNavigateEvent as any);
    return () => window.removeEventListener('finvision:navigate', onNavigateEvent as any);
  }, []);

  useEffect(() => {
    // Keep in sync if tab changes via other UI pieces that only update localStorage.
    const t = window.setInterval(() => {
      try {
        const raw = window.localStorage?.getItem?.('finvision.activeTab');
        if (typeof raw === 'string' && raw && raw !== activeTab) setActiveTab(raw);
      } catch {
        // ignore
      }
    }, 600);
    return () => window.clearInterval(t);
  }, [activeTab]);

  const navItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'networth', label: 'Net Worth' },
      { id: 'goals', label: 'Goals' },
    ],
    []
  );

  const navigate = (tab: string) => {
    try {
      window.localStorage?.setItem?.('finvision.activeTab', tab);
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(new CustomEvent('finvision:navigate', { detail: { tab } }));
    } catch {
      // ignore
    }
  };

  const goToSettings = () => {
    navigate('settings');
  };

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-profile-menu-root="1"]')) return;
      setProfileMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [profileMenuOpen]);

  const profile = useMemo(() => {
    const name =
      typeof currentUser?.name === 'string' && currentUser.name.trim() ? currentUser.name.trim() : 'Varesh Milind Wani';
    const email = typeof currentUser?.email === 'string' && currentUser.email.trim() ? currentUser.email.trim() : 'er.vmwani2022@example.com';
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'U';
    const handle = email && email.includes('@') ? `@${email.split('@')[0]}` : '@user';
    return { name, email, initials, handle };
  }, [currentUser?.email, currentUser?.name]);

  return (
    <header className="sticky top-0 z-40 bg-white/60 supports-[backdrop-filter]:bg-white/35 backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150 border-b border-black/5 ring-1 ring-black/5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="h-[64.8px] sm:h-[68.4px] px-[14.4px] sm:px-[18px] md:px-[21.6px] flex items-center gap-[14.4px]">
        <div className="flex items-center gap-[10.8px] min-w-0">
          <div className="h-9 w-9 sm:h-[39.6px] sm:w-[39.6px] rounded-full bg-emerald-50 grid place-items-center ring-1 ring-emerald-100 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.45)]">
            <img src={mark} alt="" className="h-[18px] w-[18px] sm:h-[21.6px] sm:w-[21.6px]" />
          </div>
          <div className="min-w-0 hidden sm:flex items-center gap-[7.2px] text-[11.7px] text-slate-600 whitespace-nowrap">
            <span className="font-semibold text-slate-800">Personal account</span>
          </div>
        </div>

        <nav className="flex-1 flex justify-center">
          <div className="flex items-center gap-[7.2px] overflow-x-auto scrollbar-hide px-[3.6px]">
            {navItems.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={[
                    'shrink-0 h-[39.6px] px-[21.6px] rounded-full text-[11.7px] sm:text-[12.6px] font-semibold tracking-[-0.01em] ring-1 ring-slate-200/80 hover:ring-slate-300/80 dark:ring-white/10 dark:hover:ring-white/20 transition-[background-color,box-shadow,transform] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-emerald-500/35 active:translate-y-[0.5px]',
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-500/20 shadow-[0_12px_26px_-18px_rgba(16,185,129,0.40)]'
                      : 'bg-slate-50/60 text-slate-800 hover:bg-white/80 shadow-[0_8px_20px_-22px_rgba(15,23,42,0.10)]',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-[7.2px] sm:gap-[10.8px]">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="relative flex items-center gap-[7.2px] rounded-full pl-[5.4px] pr-[7.2px] h-9 sm:h-[39.6px] ring-1 ring-black/[0.10] hover:bg-slate-50 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.18)]"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            data-profile-menu-root="1"
          >
            <div className="h-[25.2px] w-[25.2px] rounded-full bg-gradient-to-br from-rose-200 to-amber-200 ring-1 ring-black/[0.08] grid place-items-center">
              <span className="text-[9.9px] font-bold text-slate-700">{profile.initials}</span>
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-[10.8px] font-semibold text-slate-700">{profile.name}</div>
              <div className="text-[9.9px] text-slate-400 -mt-0.5">{profile.handle}</div>
            </div>
            <ChevronDownIcon className={`h-[14.4px] w-[14.4px] text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />

            {profileMenuOpen ? (
              <div
                role="menu"
                aria-label="Profile options"
                className="absolute right-0 top-[calc(100%+10px)] w-48 rounded-2xl bg-white ring-1 ring-black/[0.10] shadow-[0_18px_46px_-30px_rgba(15,23,42,0.55)] p-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    goToSettings();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('profile');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Profile
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('finvision:logout'));
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
