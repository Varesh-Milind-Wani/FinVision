const LOCATION_PREF_KEY = 'finvision.location.attach.v1';
const LOCATION_CACHE_KEY = 'finvision.location.reverseCache.v1';

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const readLocationAttachPref = () => {
  try {
    const raw = window?.localStorage?.getItem?.(LOCATION_PREF_KEY);
    if (raw == null) return true; // default on (user will still be prompted by the browser)
    const v = safeJsonParse(raw);
    return typeof v === 'boolean' ? v : true;
  } catch {
    return true;
  }
};

export const writeLocationAttachPref = (value) => {
  try {
    window?.localStorage?.setItem?.(LOCATION_PREF_KEY, JSON.stringify(Boolean(value)));
  } catch {
    // ignore
  }
};

export const queryGeolocationPermission = async () => {
  try {
    if (!navigator?.permissions?.query) return null;
    // Some browsers require the exact string type.
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status?.state || null; // 'granted' | 'prompt' | 'denied'
  } catch {
    return null;
  }
};

export const getCurrentPosition = ({ timeoutMs = 12000, enableHighAccuracy = true, maximumAgeMs = 15000 } = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator?.geolocation?.getCurrentPosition) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      }
    );
  });

const readReverseCache = () => {
  try {
    const raw = window?.localStorage?.getItem?.(LOCATION_CACHE_KEY);
    const parsed = safeJsonParse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeReverseCache = (cache) => {
  try {
    window?.localStorage?.setItem?.(LOCATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

const cacheKeyForCoords = (lat, lng) => {
  // Round to ~110m at equator (3 decimals) to keep cache small and avoid overfetching.
  const r = (n) => Math.round(Number(n) * 1000) / 1000;
  return `${r(lat)},${r(lng)}`;
};

export const reverseGeocodeNominatim = async ({ lat, lng, signal } = {}) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { ok: false, error: 'Missing coordinates' };

  const cache = readReverseCache();
  const key = cacheKeyForCoords(latitude, longitude);
  const cached = cache?.[key];
  if (cached && typeof cached === 'object' && typeof cached.address === 'string' && typeof cached.ts === 'number') {
    // 30 day cache to reduce rate-limit risk.
    if (Date.now() - cached.ts < 30 * 24 * 60 * 60 * 1000) return { ok: true, address: cached.address, cached: true };
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
    if (!res.ok) return { ok: false, error: `Reverse geocoding failed (${res.status})` };
    const data = await res.json();
    const address = typeof data?.display_name === 'string' ? data.display_name : '';
    if (!address) return { ok: false, error: 'No address found' };

    const next = { ...cache, [key]: { address, ts: Date.now() } };
    // Keep the cache bounded.
    const keys = Object.keys(next);
    if (keys.length > 60) {
      keys
        .sort((a, b) => (next?.[a]?.ts || 0) - (next?.[b]?.ts || 0))
        .slice(0, Math.max(0, keys.length - 60))
        .forEach((k) => delete next[k]);
    }
    writeReverseCache(next);
    return { ok: true, address, cached: false };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Cancelled' };
    return { ok: false, error: 'Reverse geocoding failed' };
  }
};

export const buildOsmEmbedUrl = ({ lat, lng, accuracyMeters } = {}) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const accuracy = Number(accuracyMeters);
  const meters = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 200;
  const clamped = Math.max(60, Math.min(2000, meters));
  // Rough conversion: 1 deg lat ~= 111km.
  const delta = clamped / 111000;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set('bbox', `${left},${bottom},${right},${top}`);
  url.searchParams.set('layer', 'mapnik');
  url.searchParams.set('marker', `${latitude},${longitude}`);
  return url.toString();
};

