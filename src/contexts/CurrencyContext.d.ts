import * as React from 'react';

export type CurrencyContextValue = {
  baseCurrencyCode: string;
  displayCurrencyCode: string;
  fxStatus: 'idle' | 'loading' | 'ready' | 'error';
  fxError: string | null;
  rate: number;
  convertFromBase: (baseValue: number) => number;
  convertToBase: (displayValue: number) => number;
  formatFromBase: (baseValue: number, locale?: string) => string;
  refreshRates?: () => Promise<void>;
  setDisplayCurrencyCode?: (code: string) => void;
};

export const CurrencyProvider: React.FC<{ children?: React.ReactNode }>;
export const useCurrency: () => CurrencyContextValue;

