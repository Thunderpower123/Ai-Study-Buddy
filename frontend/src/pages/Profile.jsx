import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile, changePassword } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import "../styles/Profile.css";

const INTERESTS = [
  "Machine Learning","Web Development","Data Science","Cybersecurity",
  "Cloud Computing","Embedded Systems","Blockchain","AI / NLP",
  "Mobile Dev","DevOps","Research","Robotics","Computer Vision","Networking",
];

const EDUCATION_LEVELS = ["UG","PG","PhD"];
const STREAMS = ["Science","Commerce","Arts","Engineering","Management","Law","Medicine","Design"];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab]       = useState("academic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    education: "", stream: "", yearOfPassing: "", courseBranch: "",
    branch: "", year: "", university: "", bio: "",
    interests: [], domains: [], linkedinUrl: "", githubUrl: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => { fetchProfile(); }, []);

  const flashMsg = (text, type = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };

  const fetchProfile = async () => {
    try {
      const { data } = await getProfile();
      const p = data.userProfile || {};
      const s = data.studentDetails || {};
      setForm({
        education: s.education || "",
        stream: s.stream || "",
        yearOfPassing: s.yearOfPassing || "",
        courseBranch: s.courseBranch || "",
        branch: p.branch || "",
        year: p.year || "",
        university: p.university || "",
        bio: p.bio || "",
        interests: [...(s.interests || []), ...(p.interests || [])].filter((v,i,a)=>a.indexOf(v)===i),
        domains: p.domains || [],
        linkedinUrl: p.linkedinUrl || "",
        githubUrl: p.githubUrl || "",
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleInterest = (item) =>
    set("interests", form.interests.includes(item)
      ? form.interests.filter(i => i !== item)
      : [...form.interests, item]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      flashMsg("Profile saved successfully!", "ok");
    } catch (e) { flashMsg("Failed to save. Please try again.", "err"); }
    finally { setSaving(false); }
  };

  const handlePwChange = async () => {
    if (pw.next !== pw.confirm) { flashMsg("Passwords do not match.", "err"); return; }
    if (pw.next.length < 8) { flashMsg("New password must be at least 8 characters.", "err"); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next });
      flashMsg("Password changed!", "ok");
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) { flashMsg(e.response?.data?.message || "Incorrect current password.", "err"); }
    finally { setSaving(false); }
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "?";

  if (loading) return (
    <div className="pf-root pf-loading">
      <div className="pf-spinner" />
    </div>
  );

  return (
    <div className="pf-root">
      <div className="pf-bg-orb pf-orb1" />
      <div className="pf-bg-orb pf-orb2" />

      <div className="pf-layout">
        {/* ── LEFT SIDEBAR ─────── */}
        <aside className="pf-aside">
          <button className="pf-back" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>

          <div className="pf-avatar-block">
            <div className="pf-avatar">
              {user?.profilePicture
                ? <img src={user.profilePicture} alt="pfp" />
                : <span>{initials}</span>
              }
              <div className="pf-avatar-ring" />
            </div>
            <h2 className="pf-user-name">{user?.name}</h2>
            <p className="pf-user-email">{user?.email}</p>
            {form.university && <p className="pf-user-uni">🏛 {form.university}</p>}
          </div>

          <nav className="pf-tabs">
            {[
              { id: "academic", label: "Academic Profile", icon: "🎓" },
              { id: "settings", label: "Settings", icon: "⚙️" },
            ].map(t => (
              <button key={t.id}
                className={`pf-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>

          <button className="pf-logout-btn" onClick={() => { logout(); navigate("/auth"); }}>
            Sign out
          </button>
        </aside>

        {/* ── RIGHT CONTENT ─────── */}
        <div className="pf-content">
          {/* Flash message */}
          {msg.text && (
            <div className={`pf-flash pf-flash-${msg.type}`}>{msg.text}</div>
          )}

          {/* ACADEMIC TAB */}
          {tab === "academic" && (
            <div className="pf-panel pf-panel-enter">
              <div className="pf-section">
                <h3 className="pf-section-title">Education</h3>
                <div className="pf-field">
                  <label>Level</label>
                  <div className="pf-radio-row">
                    {EDUCATION_LEVELS.map(l => (
                      <button key={l} type="button"
                        className={`pf-radio ${form.education === l ? "on" : ""}`}
                        onClick={() => set("education", l)}
                      >{l}</button>
                    ))}
                  </div>
                </div>
                <div className="pf-grid2">
                  <div className="pf-field">
                    <label>Stream / Faculty</label>
                    <div className="pf-chip-row">
                      {STREAMS.map(s => (
                        <button key={s} type="button"
                          className={`pf-chip ${form.stream === s ? "on" : ""}`}
                          onClick={() => set("stream", s)}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-field">
                    <label>Course / Branch</label>
                    <input className="pf-input" value={form.courseBranch}
                      onChange={e => set("courseBranch", e.target.value)}
                      placeholder="e.g. Computer Science" />
                  </div>
                </div>
                <div className="pf-grid3">
                  <div className="pf-field">
                    <label>Year of Passing</label>
                    <input className="pf-input" type="number" value={form.yearOfPassing}
                      onChange={e => set("yearOfPassing", e.target.value)}
                      placeholder="2025" min="2000" max="2035" />
                  </div>
                  <div className="pf-field">
                    <label>Current Year</label>
                    <input className="pf-input" value={form.year}
                      onChange={e => set("year", e.target.value)}
                      placeholder="e.g. 3rd Year" />
                  </div>
                  <div className="pf-field">
                    <label>University</label>
                    <input className="pf-input" value={form.university}
                      onChange={e => set("university", e.target.value)}
                      placeholder="e.g. IIT Delhi" />
                  </div>
                </div>
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Bio</h3>
                <textarea className="pf-input pf-textarea" rows={3}
                  value={form.bio}
                  onChange={e => set("bio", e.target.value)}
                  placeholder="A short academic background and goals…"
                />
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Interests & Domains</h3>
                <p className="pf-section-sub">Selected interests personalise your AI responses in Grounded mode</p>
                <div className="pf-tags">
                  {INTERESTS.map(item => (
                    <button key={item} type="button"
                      className={`pf-tag ${form.interests.includes(item) ? "on" : ""}`}
                      onClick={() => toggleInterest(item)}
                    >{item}</button>
                  ))}
                </div>
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Social</h3>
                <div className="pf-grid2">
                  <div className="pf-field">
                    <label>LinkedIn</label>
                    <input className="pf-input" value={form.linkedinUrl}
                      onChange={e => set("linkedinUrl", e.target.value)}
                      placeholder="https://linkedin.com/in/…" />
                  </div>
                  <div className="pf-field">
                    <label>GitHub</label>
                    <input className="pf-input" value={form.githubUrl}
                      onChange={e => set("githubUrl", e.target.value)}
                      placeholder="https://github.com/…" />
                  </div>
                </div>
              </div>

              <div className="pf-actions">
                <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="btn-spin" /> : "Save Profile"}
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div className="pf-panel pf-panel-enter">
              <div className="pf-section">
                <h3 className="pf-section-title">Change Password</h3>
                <div className="pf-field">
                  <label>Current Password</label>
                  <input className="pf-input" type="password" value={pw.current}
                    onChange={e => setPw(p => ({...p, current: e.target.value}))}
                    placeholder="Enter current password" />
                </div>
                <div className="pf-grid2">
                  <div className="pf-field">
                    <label>New Password</label>
                    <input className="pf-input" type="password" value={pw.next}
                      onChange={e => setPw(p => ({...p, next: e.target.value}))}
                      placeholder="At least 8 characters" />
                  </div>
                  <div className="pf-field">
                    <label>Confirm New Password</label>
                    <input className="pf-input" type="password" value={pw.confirm}
                      onChange={e => setPw(p => ({...p, confirm: e.target.value}))}
                      placeholder="Repeat new password" />
                  </div>
                </div>
                <button className="pf-save-btn" onClick={handlePwChange} disabled={saving}>
                  {saving ? <span className="btn-spin" /> : "Update Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}