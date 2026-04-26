/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} locale - The locale to use (default: 'en-US')
 * @param {string} currency - The currency to use (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, locale = 'en-US', currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Get a currency symbol for a given ISO currency code (e.g. USD -> $, INR -> ₹)
 * @param {string} currency - ISO currency code (e.g. "USD")
 * @param {string} locale - The locale to use (default: 'en-US')
 * @returns {string} Currency symbol (falls back to currency code if not detected)
 */
export const getCurrencySymbol = (currency, locale = 'en-US') => {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
    const sym = parts.find((p) => p.type === 'currency')?.value;
    return sym || currency;
  } catch {
    return currency || '¤';
  }
};

/**
 * Format a date string to a more readable format
 * @param {string} dateString - ISO date string
 * @param {string} format - Format to use (default: 'medium')
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, format = 'medium') => {
  const date = new Date(dateString);
  
  const options = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
  };
  
  return date.toLocaleDateString('en-IN', options[format] || options.medium);
};

/**
 * Get a relative time description (e.g., "2 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time description
 */
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

/**
 * Format a "HH:mm" (24-hour) time string into 12-hour with AM/PM.
 * @param {string} timeString - "HH:mm" (e.g., "14:05")
 * @returns {string} (e.g., "2:05 PM")
 */
export const formatTime12h = (timeString) => {
  const s = typeof timeString === 'string' ? timeString.trim() : '';
  if (!s) return '';

  // Already looks like 12-hour time with AM/PM
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(s)) return s.toUpperCase();

  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return s;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return s;

  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
};
