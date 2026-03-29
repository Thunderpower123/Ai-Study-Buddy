// frontend/src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import Navbar from "../components/dashboard/Navbar";
import { getProfile, updateProfile, changePassword } from "../utils/api";
import "../styles/theme.css";
import "../styles/Profile.css";

const INTERESTS = ["Machine Learning","Web Dev","Data Science","Cybersecurity","Cloud Computing","Embedded Systems","Blockchain","AI / NLP","Mobile Dev","DevOps","Research","Robotics","Computer Vision","Networking"];
const STREAMS   = ["Science","Commerce","Arts","Engineering","Management","Law","Medicine","Design"];

export default function Profile() {
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const [tab,     setTab]     = useState("academic");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [flash,   setFlash]   = useState({ text:"", type:"" });

  const [form, setForm] = useState({
    education:"", stream:"", yearOfPassing:"", courseBranch:"",
    branch:"", year:"", university:"", bio:"",
    interests:[], domains:[], linkedinUrl:"", githubUrl:"",
  });
  const [pw, setPw] = useState({ current:"", next:"", confirm:"" });

  useEffect(() => { load(); }, []);

  const toast = (text, type = "ok") => {
    setFlash({ text, type });
    setTimeout(() => setFlash({ text:"", type:"" }), 3500);
  };

  const load = async () => {
    try {
      const { data } = await getProfile();
      const p = data.userProfile   || {};
      const s = data.studentDetails || {};
      setForm({
        education:    s.education    || "",
        stream:       s.stream       || "",
        yearOfPassing:s.yearOfPassing|| "",
        courseBranch: s.courseBranch || "",
        branch:       p.branch       || "",
        year:         p.year         || "",
        university:   p.university   || "",
        bio:          p.bio          || "",
        interests:    [...(s.interests||[]),...(p.interests||[])].filter((v,i,a)=>a.indexOf(v)===i),
        domains:      p.domains      || [],
        linkedinUrl:  p.linkedinUrl  || "",
        githubUrl:    p.githubUrl    || "",
      });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleI = (item) => set("interests", form.interests.includes(item) ? form.interests.filter(i=>i!==item) : [...form.interests,item]);

  const save = async () => {
    setSaving(true);
    try { await updateProfile(form); toast("Profile saved!", "ok"); }
    catch { toast("Failed to save.", "err"); }
    finally { setSaving(false); }
  };

  const savePw = async () => {
    if (pw.next !== pw.confirm) { toast("Passwords do not match.", "err"); return; }
    if (pw.next.length < 8)    { toast("At least 8 characters required.", "err"); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next });
      toast("Password changed!", "ok");
      setPw({ current:"", next:"", confirm:"" });
    } catch(e) { toast(e.response?.data?.message || "Incorrect current password.", "err"); }
    finally { setSaving(false); }
  };

  const initials = user?.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "?";

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="spinner" style={{ border:"2px solid var(--bd)", borderTopColor:"var(--ac)", width:32, height:32 }} />
    </div>
  );

  return (
    <div className="pf-root">
      <Navbar showModeToggle={false} />

      <div className="pf-body">
        {/* Aside */}
        <aside className="pf-aside">
          <div className="pf-av-block">
            <div className="pf-av">
              {user?.profilePicture ? <img src={user.profilePicture} alt="pfp" /> : initials}
            </div>
            <p className="pf-av-name">{user?.name}</p>
            <p className="pf-av-email">{user?.email}</p>
            {form.university && <p className="pf-av-uni">🏛 {form.university}</p>}
          </div>

          <nav className="pf-nav">
            {[
              { id:"academic", label:"🎓 Academic Profile" },
              { id:"settings", label:"⚙️ Settings" },
            ].map(t => (
              <button key={t.id}
                className={`pf-nav-btn ${tab === t.id ? "on" : ""}`}
                onClick={() => setTab(t.id)}
              >{t.label}</button>
            ))}
          </nav>

          <button className="pf-nav-btn pf-logout" onClick={() => { logout(); nav("/auth"); }}>
            🚪 Sign out
          </button>
        </aside>

        {/* Content */}
        <div className="pf-content">
          {flash.text && <div className={`pf-flash ${flash.type}`}>{flash.text}</div>}

          {/* Academic tab */}
          {tab === "academic" && (
            <div className="pf-panel">
              <div className="pf-section">
                <h3 className="pf-section-title">Education</h3>
                <div className="pf-field">
                  <label>Level</label>
                  <div className="pf-radios">
                    {["UG","PG","PhD"].map(l => (
                      <button key={l} type="button"
                        className={`pf-radio ${form.education === l ? "on" : ""}`}
                        onClick={() => set("education", l)}
                      >{l}</button>
                    ))}
                  </div>
                </div>
                <div className="pf-field">
                  <label>Stream / Faculty</label>
                  <div className="pf-chips">
                    {STREAMS.map(s => (
                      <button key={s} type="button"
                        className={`pf-chip ${form.stream === s ? "on" : ""}`}
                        onClick={() => set("stream", s)}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="pf-3col">
                  <div className="pf-field">
                    <label>Year of Passing</label>
                    <input className="pf-input" type="number" value={form.yearOfPassing}
                      onChange={e => set("yearOfPassing", e.target.value)} placeholder="2025" />
                  </div>
                  <div className="pf-field">
                    <label>Current Year</label>
                    <input className="pf-input" value={form.year}
                      onChange={e => set("year", e.target.value)} placeholder="3rd Year" />
                  </div>
                  <div className="pf-field">
                    <label>University</label>
                    <input className="pf-input" value={form.university}
                      onChange={e => set("university", e.target.value)} placeholder="IIT Delhi" />
                  </div>
                </div>
                <div className="pf-field">
                  <label>Course / Branch</label>
                  <input className="pf-input" value={form.courseBranch}
                    onChange={e => set("courseBranch", e.target.value)} placeholder="Computer Science" />
                </div>
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Bio</h3>
                <textarea className="pf-input pf-textarea" rows={3}
                  value={form.bio} onChange={e => set("bio", e.target.value)}
                  placeholder="Your academic background and goals…" />
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Interests & Domains</h3>
                <p className="pf-section-sub">Personalises AI responses in Grounded mode</p>
                <div className="pf-tags">
                  {INTERESTS.map(item => (
                    <button key={item} type="button"
                      className={`pf-tag ${form.interests.includes(item) ? "on" : ""}`}
                      onClick={() => toggleI(item)}
                    >{item}</button>
                  ))}
                </div>
              </div>

              <div className="pf-section">
                <h3 className="pf-section-title">Social Links</h3>
                <div className="pf-2col">
                  <div className="pf-field">
                    <label>LinkedIn</label>
                    <input className="pf-input" value={form.linkedinUrl}
                      onChange={e => set("linkedinUrl", e.target.value)} placeholder="linkedin.com/in/…" />
                  </div>
                  <div className="pf-field">
                    <label>GitHub</label>
                    <input className="pf-input" value={form.githubUrl}
                      onChange={e => set("githubUrl", e.target.value)} placeholder="github.com/…" />
                  </div>
                </div>
              </div>

              <div className="pf-actions">
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving ? <span className="spinner" /> : "Save Profile"}
                </button>
              </div>
            </div>
          )}

          {/* Settings tab */}
          {tab === "settings" && (
            <div className="pf-panel">
              <div className="pf-section">
                <h3 className="pf-section-title">Change Password</h3>
                <div className="pf-field">
                  <label>Current Password</label>
                  <input className="pf-input" type="password" value={pw.current}
                    onChange={e => setPw(p=>({...p,current:e.target.value}))} placeholder="Enter current password" />
                </div>
                <div className="pf-2col">
                  <div className="pf-field">
                    <label>New Password</label>
                    <input className="pf-input" type="password" value={pw.next}
                      onChange={e => setPw(p=>({...p,next:e.target.value}))} placeholder="At least 8 characters" />
                  </div>
                  <div className="pf-field">
                    <label>Confirm Password</label>
                    <input className="pf-input" type="password" value={pw.confirm}
                      onChange={e => setPw(p=>({...p,confirm:e.target.value}))} placeholder="Repeat new password" />
                  </div>
                </div>
                <div className="pf-actions">
                  <button className="btn-primary" onClick={savePw} disabled={saving}>
                    {saving ? <span className="spinner" /> : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}