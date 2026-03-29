import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logoutUser } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from the httpOnly JWT cookie
  useEffect(() => {
    getCurrentUser()
      .then(res => {
        // /me returns { success, user } directly (not wrapped in ApiResponse)
        const u = res.data?.user ?? res.data?.data?.user ?? res.data?.data ?? null;
        if (u) setUser(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    setUser(null);
  };

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
