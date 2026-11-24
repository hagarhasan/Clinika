import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getToken } from '../api/client.js';
import { getMe, login as loginRequest, updateMe } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const nextUser = await getMe();
      setUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const response = await loginRequest(credentials);
    const nextToken = response.access_token || response.token;
    if (!nextToken) throw new Error('The server did not return an access token.');
    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    const nextUser = await getMe();
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken('');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (body) => {
    const nextUser = await updateMe(body);
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    role: user?.role || '',
    loading,
    login,
    logout,
    refreshUser,
    updateProfile,
  }), [token, user, loading, login, logout, refreshUser, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
