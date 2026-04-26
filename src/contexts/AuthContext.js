import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearLegacyExpenseState,
  createStoredUser,
  readLegacyExpenseState,
  readStoredSession,
  readStoredUsers,
  sanitizeUser,
  validateAuthProfileInput,
  writeStoredSession,
  writeStoredUsers,
  getExpenseStorageKeyForUser,
} from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(() => readStoredUsers());
  const [session, setSession] = useState(() => readStoredSession());
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    writeStoredUsers(users);
  }, [users]);

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  const currentUserRecord = useMemo(() => {
    const sessionUserId = typeof session?.userId === 'string' ? session.userId : '';
    return users.find((user) => user?.id === sessionUserId) || null;
  }, [session, users]);

  const currentUser = useMemo(() => sanitizeUser(currentUserRecord), [currentUserRecord]);

  const migrateLegacyDataIfNeeded = useCallback((user) => {
    if (typeof window === 'undefined' || !window.localStorage || !user?.id) return;
    const scopedKey = getExpenseStorageKeyForUser(user.id);
    const existing = window.localStorage.getItem(scopedKey);
    if (existing) return;
    const legacy = readLegacyExpenseState();
    if (!legacy) return;
    try {
      window.localStorage.setItem(scopedKey, JSON.stringify(legacy));
      clearLegacyExpenseState();
    } catch {
      // ignore migration failures
    }
  }, []);

  const register = useCallback(
    (input) => {
      const message = validateAuthProfileInput(input, { requirePassword: true });
      if (message) {
        setAuthError(message);
        return { ok: false, error: message };
      }

      const nextUser = createStoredUser(input);
      if (users.some((u) => String(u?.email || '').toLowerCase() === nextUser.email)) {
        const error = 'An account with this email already exists.';
        setAuthError(error);
        return { ok: false, error };
      }

      const nextUsers = [...users, nextUser];
      setUsers(nextUsers);
      setSession({ userId: nextUser.id, loggedInAt: new Date().toISOString() });
      setAuthError('');
      migrateLegacyDataIfNeeded(nextUser);
      return { ok: true, user: sanitizeUser(nextUser) };
    },
    [migrateLegacyDataIfNeeded, users]
  );

  const login = useCallback(
    ({ email, password }) => {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedPassword = String(password || '');
      const match = users.find((user) => user?.email === normalizedEmail && user?.password === normalizedPassword);
      if (!match) {
        const error = 'Invalid email or password.';
        setAuthError(error);
        return { ok: false, error };
      }
      setSession({ userId: match.id, loggedInAt: new Date().toISOString() });
      setAuthError('');
      migrateLegacyDataIfNeeded(match);
      return { ok: true, user: sanitizeUser(match) };
    },
    [migrateLegacyDataIfNeeded, users]
  );

  const logout = useCallback(() => {
    setSession(null);
    setAuthError('');
  }, []);

  const updateProfile = useCallback(
    (changes) => {
      if (!currentUserRecord) return { ok: false, error: 'No active session.' };
      const candidate = {
        ...currentUserRecord,
        ...changes,
        email: currentUserRecord.email,
        password: currentUserRecord.password,
      };
      const message = validateAuthProfileInput(candidate, { requirePassword: false });
      if (message) {
        setAuthError(message);
        return { ok: false, error: message };
      }
      const updated = {
        ...currentUserRecord,
        name: String(candidate.name).trim(),
        phone: String(candidate.phone).trim(),
        age: Number(candidate.age),
        address: String(candidate.address).trim(),
        occupation: String(candidate.occupation).trim(),
        accountType: candidate.accountType === 'business' ? 'business' : 'individual',
        income: Number(candidate.income) || 0,
        updatedAt: new Date().toISOString(),
      };
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setAuthError('');
      return { ok: true, user: sanitizeUser(updated) };
    },
    [currentUserRecord]
  );

  const clearAuthError = useCallback(() => setAuthError(''), []);

  const value = useMemo(
    () => ({
      users: users.map((user) => sanitizeUser(user)).filter(Boolean),
      currentUser,
      isAuthenticated: !!currentUser,
      authError,
      register,
      login,
      logout,
      updateProfile,
      clearAuthError,
    }),
    [authError, clearAuthError, currentUser, login, logout, register, updateProfile, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
