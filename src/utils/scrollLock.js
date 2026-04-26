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

  const body = document.body;
  lockedScrollY = window.scrollY || window.pageYOffset || 0;

  prevBodyStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  const scrollbarWidth = getScrollbarWidth();
  body.style.position = 'fixed';
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarWidth) body.style.paddingRight = `${scrollbarWidth}px`;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0) return;

    const nextBody = document.body;
    if (prevBodyStyles) {
      nextBody.style.position = prevBodyStyles.position;
      nextBody.style.top = prevBodyStyles.top;
      nextBody.style.left = prevBodyStyles.left;
      nextBody.style.right = prevBodyStyles.right;
      nextBody.style.width = prevBodyStyles.width;
      nextBody.style.overflow = prevBodyStyles.overflow;
      nextBody.style.paddingRight = prevBodyStyles.paddingRight;
    } else {
      nextBody.style.position = '';
      nextBody.style.top = '';
      nextBody.style.left = '';
      nextBody.style.right = '';
      nextBody.style.width = '';
      nextBody.style.overflow = '';
      nextBody.style.paddingRight = '';
    }

    prevBodyStyles = null;
    window.scrollTo(0, lockedScrollY);
  };
};

export const forceUnlockBodyScroll = () => {
  if (typeof window === 'undefined') return;

  lockCount = 0;

  const body = document.body;
  let y = lockedScrollY || window.scrollY || window.pageYOffset || 0;

  try {
    const top = body.style.top || '';
    const n = parseInt(top, 10);
    if (Number.isFinite(n) && n !== 0) y = Math.abs(n);
  } catch {
    // ignore
  }

  if (prevBodyStyles) {
    body.style.position = prevBodyStyles.position;
    body.style.top = prevBodyStyles.top;
    body.style.left = prevBodyStyles.left;
    body.style.right = prevBodyStyles.right;
    body.style.width = prevBodyStyles.width;
    body.style.overflow = prevBodyStyles.overflow;
    body.style.paddingRight = prevBodyStyles.paddingRight;
  } else {
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    body.style.paddingRight = '';
  }

  prevBodyStyles = null;

  try {
    window.scrollTo(0, y);
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
