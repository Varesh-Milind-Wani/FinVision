import React from 'react';

type IconProps = {
  className?: string;
};

export const ChatIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.5h9m-9 3.5h6.5" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 18.2V6.8A2.8 2.8 0 0 1 7.3 4h9.4a2.8 2.8 0 0 1 2.8 2.8v7.1a2.8 2.8 0 0 1-2.8 2.8H9.2l-3.2 2.5c-.7.5-1.5 0-1.5-.9Z"
    />
  </svg>
);

export const BellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 21Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 8.7a6 6 0 1 0-12 0c0 7-2.5 7-2.5 7h17S18 15.7 18 8.7Z"
    />
  </svg>
);

export const SearchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.6-3.6" />
  </svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
  </svg>
);

export const CopyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h10v10H9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

