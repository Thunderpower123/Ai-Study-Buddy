import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, googleLogin } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const BrandLogo = () => (
  <div className="auth-logo-row">
    <div className="auth-logo-icon">
      <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
    </div>
    <span className="auth-logo-name">AI Study Buddy</span>
  </div>
);

export default function Login({ onSwitchToRegister }) {
  const navigate    = useNavigate();
  const { setUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setIsLoading(true);
      const res = await loginUser(form);
      if (res.success) {
        setUser(res.user);
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed. Please try again.');
      }
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google: for now show coming-soon alert — will wire up after basic auth works
  const handleGoogleLogin = () => {
    alert('Google login coming soon! Please use email & password for now.');
  };

  return (
    <>
      <BrandLogo />

      <div className="auth-header">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Don't have an account?
          <span className="auth-switch-link" onClick={onSwitchToRegister}> Sign up</span>
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>

        {error && (
          <div className="auth-error" role="alert">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input type="email" name="email" className="form-input"
            placeholder="you@example.com" value={form.email}
            onChange={handleChange} required autoComplete="email" />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" name="password" className="form-input"
            placeholder="••••••••" value={form.password}
            onChange={handleChange} required autoComplete="current-password" />
          <div className="forgot-row">
            <span className="forgot-link">Forgot password?</span>
          </div>
        </div>

        <button type="submit" className="btn-auth-primary" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="auth-divider">or continue with</div>

        <button type="button" className="btn-google" onClick={handleGoogleLogin}>
          <GoogleIcon />
          Continue with Google
        </button>

      </form>
    </>
  );
}
