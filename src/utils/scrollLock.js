import { useEffect } from 'react';

let lockCount = 0;
let lockedScrollY = 0;
let prevBodyStyles = null;

const getScrollbarWidth = () => {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
};

export const lockBodyScroll = () => {
  if (typeof window === 'undefined') return () => {};

  lockCount += 1;
  if (lockCount > 1) {
    return () => {
      lockCount = Math.max(0, lockCount - 1);
    };
  }

  const root = document.getElementById('root');
  if (!root) return () => {};
  
  lockedScrollY = root.scrollTop || 0;

  prevBodyStyles = {
    overflow: root.style.overflow,
    paddingRight: root.style.paddingRight,
  };

  const scrollbarWidth = getScrollbarWidth();
  root.style.overflow = 'hidden';
  if (scrollbarWidth) root.style.paddingRight = `${scrollbarWidth}px`;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0) return;

    if (prevBodyStyles) {
      root.style.overflow = prevBodyStyles.overflow;
      root.style.paddingRight = prevBodyStyles.paddingRight;
    } else {
      root.style.overflow = '';
      root.style.paddingRight = '';
    }

    prevBodyStyles = null;
    root.scrollTop = lockedScrollY;
  };
};

export const forceUnlockBodyScroll = () => {
  if (typeof window === 'undefined') return;

  lockCount = 0;

  const root = document.getElementById('root');
  if (!root) return;
  
  let y = lockedScrollY || root.scrollTop || 0;

  if (prevBodyStyles) {
    root.style.overflow = prevBodyStyles.overflow;
    root.style.paddingRight = prevBodyStyles.paddingRight;
  } else {
    root.style.overflow = '';
    root.style.paddingRight = '';
  }

  prevBodyStyles = null;

  try {
    root.scrollTop = y;
  } catch {
    // ignore
  }
};

export const useBodyScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return undefined;
    const unlock = lockBodyScroll();
    return () => unlock();
  }, [locked]);
};
