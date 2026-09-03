import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, fetchCurrentUser } from '../services/auth.service.js';
import { queryClient } from '../lib/queryClient.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, ask the backend who we are — the httpOnly cookie
  // (if valid) is sent automatically, so this restores the session
  // without storing anything in localStorage
  useEffect(() => {
    fetchCurrentUser()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      // Drop every cached response from the previous session so the next
      // user on a shared device cannot see it.
      queryClient.clear();
    };
    window.addEventListener('roomify:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('roomify:auth-expired', handleAuthExpired);
  }, []);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    // Clear anything cached before this login (e.g. a previous session on
    // this device whose logout was missed) so keys can't collide.
    queryClient.clear();
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
