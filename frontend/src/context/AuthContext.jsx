import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, fetchCurrentUser } from '../services/auth.service.js';

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
    const handleAuthExpired = () => setUser(null);
    window.addEventListener('roomify:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('roomify:auth-expired', handleAuthExpired);
  }, []);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
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
