import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logoutUser } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from the httpOnly JWT cookie
  useEffect(() => {
    getCurrentUser()
      .then(res => { if (res.data?.success) setUser(res.data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    setUser(null);
  };

  // Called after StudentDetails form is submitted
  const markProfileComplete = () => {
    setUser(prev => prev ? { ...prev, isProfileComplete: true } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, markProfileComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
