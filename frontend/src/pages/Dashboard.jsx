import { useAuth } from '../utils/AuthContext';
import { logoutUser } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate('/auth');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome, {user?.name || 'Student'} 👋</h1>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout} style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  );
}
