import { Navigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Checking authentication…</p>;
  if (!user)   return <Navigate to="/auth" replace />;
  return children;
}
