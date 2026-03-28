import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { loginUser, googleLogin } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';

const BrandLogo = () => (
  <div className="auth-logo-row">
    <div className="auth-logo-icon">
      <svg viewBox="0 0 24 24">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
    </div>
    <span className="auth-logo-name">AI Study Buddy</span>
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Login({ onSwitchToRegister }) {
  const navigate    = useNavigate();
  const { setUser } = useAuth();
  const [isLoading,     setIsLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState('');
  const [form,          setForm]          = useState({ email: '', password: '' });

  const googleBtnRef = useRef(null);

  // ---------------- GOOGLE ----------------
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      setError('');
      // googleLogin wraps credential in { idToken } automatically
      const res = await googleLogin(credentialResponse.credential);
      if (res.data?.success) {
        setUser(res.data.user);
        navigate('/dashboard');
      } else {
        setError(res.data?.message || 'Google login failed');
      }
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
    setGoogleLoading(false);
  };

  const triggerGooglePopup = () => {
    setError('');
    const btn = googleBtnRef.current?.querySelector('div[role="button"]');
    if (btn) btn.click();
  };

  // ---------------- FORM ----------------
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
      if (res.data?.success) {
        setUser(res.data.user);
        navigate('/dashboard');
      } else {
        setError(res.data?.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div className="auth-header">
        <BrandLogo />
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Don't have an account?
          <span className="auth-switch-link" onClick={onSwitchToRegister}> Sign up</span>
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" name="email" placeholder="name@example.com" value={form.email} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
        </div>

        <button className="btn-auth-primary" type="submit" disabled={isLoading || googleLoading}>
          {isLoading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="auth-divider">or continue with</div>

      <button
        className="btn-google"
        type="button"
        onClick={triggerGooglePopup}
        disabled={isLoading || googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? 'Connecting…' : 'Continue with Google'}
      </button>

      {/* Hidden GoogleLogin — handles the real OAuth, invisible to the user */}
      <div
        ref={googleBtnRef}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}
        aria-hidden="true"
      >
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
        />
      </div>
    </div>
  );
}
