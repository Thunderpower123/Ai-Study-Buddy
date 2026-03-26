import React, { useState, useEffect } from 'react';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import '../styles/auth.css';

export default function Auth() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [animClass, setAnimClass]     = useState('auth-view-in');
  const [isDark, setIsDark]           = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const switchTo = (loginView) => {
    // 1. fade out current content
    setAnimClass('auth-view-out');

    setTimeout(() => {
      // 2. swap — card is invisible so height reflow is hidden
      setIsLoginView(loginView);
      setAnimClass('auth-view-in');
    }, 210);
  };

  return (
    <div className="auth-container">

      <button
        className="auth-theme-toggle"
        onClick={() => setIsDark(d => !d)}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀' : '☾'}
      </button>

      <div className="auth-card">
        <div className={animClass}>
          {isLoginView
            ? <Login    onSwitchToRegister={() => switchTo(false)} />
            : <Register onSwitchToLogin={() => switchTo(true)} />
          }
        </div>
      </div>

    </div>
  );
}
