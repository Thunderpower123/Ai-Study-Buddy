// frontend/src/pages/AuthPage.jsx
// REPLACE your existing auth page with this file

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../utils/AuthContext";
import { loginUser, registerUser, googleLogin } from "../utils/api";
import "../styles/theme.css";
import "../styles/auth.css";

/* ── SVG icons ─────────────────────────────── */
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const EyeIcon = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// Floating particles config
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  size: Math.random() * 16 + 6,
  left: Math.random() * 100,
  delay: Math.random() * 12,
  duration: Math.random() * 10 + 10,
}));

const FEATURES = [
  { icon: "📄", text: "Upload PDFs, PPTX, DOCX — up to 2000 pages" },
  { icon: "🧠", text: "RAG-powered AI answers from your own notes" },
  { icon: "⚓", text: "Grounded mode — strictly your documents" },
  { icon: "🌐", text: "Extended mode — notes + general knowledge" },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [tab,      setTab]      = useState("login");   // "login" | "register"
  const [showPw,   setShowPw]   = useState(false);
  const [showPw2,  setShowPw2]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm,   setRegForm]   = useState({ name: "", email: "", age: "", password: "", confirm: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await loginUser(loginForm);
      setUser(data.data);
      navigate(data.data.isProfileComplete ? "/dashboard" : "/student-details");
    } catch (e) {
      setError(e.response?.data?.message || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.password) { setError("Please fill all required fields."); return; }
    if (regForm.password !== regForm.confirm) { setError("Passwords do not match."); return; }
    if (regForm.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await registerUser({ name: regForm.name, email: regForm.email, age: Number(regForm.age), password: regForm.password });
      setUser(data.data);
      navigate("/student-details");
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  const handleGoogle = async (credentialResponse) => {
    setLoading(true); setError("");
    try {
      const { data } = await googleLogin({ idToken: credentialResponse.credential });
      setUser(data.data);
      navigate(data.data.isProfileComplete ? "/dashboard" : "/student-details");
    } catch (e) {
      setError("Google sign-in failed. Please try again.");
    } finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setError(""); };

  return (
    <div className="auth-root">

      {/* ── LEFT PANEL ─────────────────────────── */}
      <div className="auth-left">
        {/* Decorative rings */}
        <div className="auth-ring auth-ring-1" />
        <div className="auth-ring auth-ring-2" />
        <div className="auth-ring auth-ring-3" />

        {/* Floating particles */}
        <div className="auth-particles">
          {PARTICLES.map((p, i) => (
            <div key={i} className="auth-p" style={{
              width: p.size, height: p.size,
              left: `${p.left}%`,
              bottom: "-20px",
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }} />
          ))}
        </div>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-box">A</div>
          <span className="auth-logo-text">AcadAI</span>
        </div>

        {/* Hero */}
        <div className="auth-hero">
          <div className="auth-tag">
            <span className="auth-tag-dot" />
            AI Study Buddy
          </div>
          <h1 className="auth-hero-title">
            Study smarter,<br />
            not <em>harder</em>
          </h1>
          <p className="auth-hero-subtitle">
            Upload your notes, PDFs, and slides. Get instant AI-powered answers — straight from your own study materials.
          </p>
        </div>

        {/* Features */}
        <div className="auth-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="auth-feat">
              <div className="auth-feat-icon">{f.icon}</div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* Tab toggle */}
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => switchTab("login")}>
              Sign In
            </button>
            <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => switchTab("register")}>
              Create Account
            </button>
          </div>

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <>
              <div className="auth-form-head">
                <h2>Welcome back 👋</h2>
                <p>Don't have an account? <span onClick={() => switchTab("register")}>Sign up free</span></p>
              </div>

              <form className="auth-form" onSubmit={handleLogin}>
                <div className="auth-field">
                  <label>Email Address</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><MailIcon /></span>
                    <input className="auth-input" type="email" placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm(p => ({...p, email: e.target.value}))}
                      autoComplete="email" required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Password</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><LockIcon /></span>
                    <input className="auth-input" type={showPw ? "text" : "password"} placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={e => setLoginForm(p => ({...p, password: e.target.value}))}
                      autoComplete="current-password" required
                    />
                    <button type="button" className="auth-pw-eye" onClick={() => setShowPw(p => !p)}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                {error && <div className="auth-err">{error}</div>}

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <span className="spinner" /> : "Sign In →"}
                </button>

                <div className="auth-divider">or continue with</div>

                <div className="auth-google">
                  <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => setError("Google sign-in failed.")}
                    useOneTap={false}
                    render={({ onClick }) => (
                      <button type="button" className="auth-google" onClick={onClick}>
                        <GoogleSVG />
                        Continue with Google
                      </button>
                    )}
                  />
                </div>
              </form>
            </>
          )}

          {/* ── REGISTER ── */}
          {tab === "register" && (
            <>
              <div className="auth-form-head">
                <h2>Create account ✨</h2>
                <p>Already have one? <span onClick={() => switchTab("login")}>Sign in</span></p>
              </div>

              <form className="auth-form" onSubmit={handleRegister}>
                <div className="auth-field">
                  <label>Full Name</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><UserIcon /></span>
                    <input className="auth-input" type="text" placeholder="Mayank Gupta"
                      value={regForm.name}
                      onChange={e => setRegForm(p => ({...p, name: e.target.value}))}
                      autoComplete="name" required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Email Address</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><MailIcon /></span>
                    <input className="auth-input" type="email" placeholder="you@example.com"
                      value={regForm.email}
                      onChange={e => setRegForm(p => ({...p, email: e.target.value}))}
                      autoComplete="email" required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Age</label>
                  <input className="auth-input no-ico" type="number" placeholder="e.g. 20"
                    value={regForm.age}
                    onChange={e => setRegForm(p => ({...p, age: e.target.value}))}
                    min="10" max="100"
                  />
                </div>

                <div className="auth-field">
                  <label>Password</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><LockIcon /></span>
                    <input className="auth-input" type={showPw ? "text" : "password"} placeholder="At least 8 characters"
                      value={regForm.password}
                      onChange={e => setRegForm(p => ({...p, password: e.target.value}))}
                      autoComplete="new-password" required
                    />
                    <button type="button" className="auth-pw-eye" onClick={() => setShowPw(p => !p)}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label>Confirm Password</label>
                  <div className="auth-input-row">
                    <span className="auth-input-ico"><LockIcon /></span>
                    <input className="auth-input" type={showPw2 ? "text" : "password"} placeholder="Repeat password"
                      value={regForm.confirm}
                      onChange={e => setRegForm(p => ({...p, confirm: e.target.value}))}
                      autoComplete="new-password" required
                    />
                    <button type="button" className="auth-pw-eye" onClick={() => setShowPw2(p => !p)}>
                      <EyeIcon open={showPw2} />
                    </button>
                  </div>
                </div>

                {error && <div className="auth-err">{error}</div>}

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? <span className="spinner" /> : "Create Account →"}
                </button>

                <div className="auth-divider">or continue with</div>

                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => setError("Google sign-in failed.")}
                  width="100%"
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                />
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Google SVG icon */
function GoogleSVG() {
  return (
    <svg className="goog-ico" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}