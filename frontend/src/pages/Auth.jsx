// frontend/src/pages/Auth.jsx

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

  const [tab,     setTab]     = useState("login");
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm,   setRegForm]   = useState({ name: "", email: "", age: "", password: "", confirm: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await loginUser(loginForm);
      // backend wraps response in ApiResponse — user is in data.data
      const u = data.data ?? data.user ?? data;
      setUser(u);
      navigate(u.isProfileComplete ? "/dashboard" : "/student-details");
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
      const { data } = await registerUser({
        name: regForm.name,
        email: regForm.email,
        age: Number(regForm.age),
        password: regForm.password,
      });
      const u = data.data ?? data.user ?? data;
      setUser(u);
      navigate("/student-details");
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  // FIX: GoogleLogin onSuccess gives { credential } — pass credential string directly
  // api.js googleLogin() wraps it as { idToken: credential } before sending to backend
  const handleGoogle = async (credentialResponse) => {
    setLoading(true); setError("");
    try {
      const { data } = await googleLogin(credentialResponse.credential);
      const u = data.data ?? data.user ?? data;
      setUser(u);
      navigate(u.isProfileComplete ? "/dashboard" : "/student-details");
    } catch (e) {
      setError("Google sign-in failed. Please try again.");
    } finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setError(""); };

  return (
    <div className="auth-root">

      {/* ── LEFT PANEL ─────────────────────────── */}
      <div className="auth-left">
        <div className="auth-ring auth-ring-1" />
        <div className="auth-ring auth-ring-2" />
        <div className="auth-ring auth-ring-3" />

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

        <div className="auth-logo">
          <div className="auth-logo-box">A</div>
          <span className="auth-logo-text">AcadAI</span>
        </div>

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

          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => switchTab("login")}>Sign In</button>
            <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => switchTab("register")}>Create Account</button>
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

                <div className="auth-google-wrap">
                  <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => setError("Google sign-in failed.")}
                    useOneTap={false}
                    width="100%"
                    text="continue_with"
                    shape="rectangular"
                    theme="outline"
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

                <div className="auth-google-wrap">
                  <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => setError("Google sign-in failed.")}
                    useOneTap={false}
                    width="100%"
                    text="continue_with"
                    shape="rectangular"
                    theme="outline"
                  />
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
