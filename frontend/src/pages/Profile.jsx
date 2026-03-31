// frontend/src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import Navbar from "../components/dashboard/Navbar";
import { getProfile, updateProfile, changePassword } from "../utils/api";
import "../styles/theme.css";
import "../styles/Profile.css";

/* ── Deep stream-aware interests ─────────────────────
   Mirrors the expanded map in StudentDetails.jsx
──────────────────────────────────────────────────── */
const INTERESTS_BY_STREAM = {
  Science: [
    "Atomic Physics","Nuclear Physics","Quantum Mechanics","Classical Mechanics",
    "Thermodynamics","Electromagnetism","Optics","Relativity","Astrophysics",
    "Organic Chemistry","Inorganic Chemistry","Physical Chemistry",
    "Chemical Equilibrium","Chemical Kinetics","Electrochemistry",
    "Analytical Chemistry","Spectroscopy",
    "Cell Biology","Genetics","Evolution","Ecology","Microbiology",
    "Molecular Biology","Biotechnology","Zoology","Botany",
    "Calculus","Linear Algebra","Differential Equations","Probability",
    "Statistics","Number Theory","Discrete Mathematics",
    "Environmental Science","Geology","Astronomy","Meteorology","Oceanography",
  ],
  Commerce: [
    "Financial Accounting","Cost Accounting","Management Accounting",
    "Auditing","Taxation (Direct)","Taxation (Indirect / GST)",
    "Corporate Finance","Investment Analysis","Financial Markets",
    "Banking Operations","Insurance","Capital Markets","Portfolio Management",
    "Microeconomics","Macroeconomics","International Trade",
    "Development Economics","Public Finance","Monetary Policy",
    "Business Law","Business Communication","Marketing Management",
    "Retail Management","E-Commerce","Entrepreneurship","Business Analytics",
  ],
  Arts: [
    "English Literature","Hindi Literature","Comparative Literature",
    "Creative Writing","Journalism","Mass Communication",
    "Indian History","World History","Ancient Civilisations",
    "Indian Polity","International Relations","Public Administration",
    "Political Theory","Human Geography","Urban Studies",
    "Social Psychology","Cognitive Psychology","Abnormal Psychology",
    "Ethics","Logic","Existentialism","Eastern Philosophy",
    "Social Stratification","Gender Studies","Anthropology",
    "Culture & Society","Rural Sociology",
    "Visual Arts","Music Theory","Film Studies","Advertising & PR",
  ],
  Engineering: [
    "Data Structures & Algorithms","Operating Systems","Computer Networks",
    "Database Management","Software Engineering","Web Development",
    "Mobile App Development","Cloud Computing","DevOps","Cybersecurity",
    "Machine Learning","Deep Learning","Natural Language Processing",
    "Computer Vision","Data Science","Big Data","Blockchain",
    "Artificial Intelligence","IoT","Compiler Design",
    "Digital Electronics","Analog Circuits","VLSI Design",
    "Embedded Systems","Signal Processing","Control Systems",
    "Power Systems","Power Electronics","Microprocessors",
    "Communication Systems","Wireless Networks","Antenna Design",
    "Thermodynamics (Engg)","Fluid Mechanics","Heat Transfer",
    "Manufacturing Processes","Machine Design","Robotics",
    "CAD / CAM","Automotive Engineering","Aerospace Engineering",
    "Industrial Engineering","Operations Research",
    "Structural Engineering","Geotechnical Engineering",
    "Transportation Engineering","Environmental Engineering",
    "Construction Management","Hydraulics","Surveying",
    "Chemical Reaction Engineering","Process Control",
    "Mass Transfer","Heat Transfer (Chemical)","Polymer Science",
  ],
  Management: [
    "Operations Management","Human Resource Management",
    "Marketing Strategy","Digital Marketing","Consumer Behaviour",
    "Financial Management","Corporate Strategy","Business Analytics",
    "Supply Chain Management","Project Management","Entrepreneurship",
    "Organisational Behaviour","Business Ethics","International Business",
    "Change Management","Leadership","Consulting","Risk Management",
    "Retail Management","Brand Management",
  ],
  Law: [
    "Constitutional Law","Criminal Law","Civil Procedure",
    "Contract Law","Tort Law","Company Law","Corporate Law",
    "International Law","Human Rights Law","Environmental Law",
    "Intellectual Property (Patents)","Intellectual Property (Copyright)",
    "Taxation Law","Labour Law","Family Law",
    "Banking & Finance Law","Cyber Law","Alternative Dispute Resolution",
    "Legal Research & Writing","Jurisprudence",
  ],
  Medicine: [
    "Anatomy","Physiology","Biochemistry","Pathology","Microbiology",
    "Pharmacology","Forensic Medicine",
    "Internal Medicine","Surgery","Obstetrics & Gynaecology",
    "Pediatrics","Psychiatry","Orthopaedics","Ophthalmology",
    "ENT","Dermatology","Radiology","Anaesthesiology",
    "Cardiology","Neurology","Nephrology","Gastroenterology",
    "Oncology","Pulmonology","Endocrinology","Immunology",
    "Community Medicine","Medical Research","Clinical Trials",
    "Public Health","Nutrition & Dietetics",
  ],
  Design: [
    "UI / UX Design","Interaction Design","User Research",
    "Figma & Prototyping","Web Design","App Design",
    "Graphic Design","Typography","Branding & Identity",
    "Motion Graphics","Illustration","Photography","Video Editing",
    "Product Design","Industrial Design","Ergonomics",
    "Packaging Design","3D Modelling","Sustainable Design",
    "Architecture","Interior Design","Urban Planning",
    "Landscape Design","Construction Technology",
    "Fashion Design","Textile Design","Costume Design",
  ],
};

const DEFAULT_INTERESTS = [
  "Machine Learning","Web Development","Data Science","Cybersecurity",
  "Cloud Computing","AI / NLP","Networking","Research",
];

const STREAMS = ["Science","Commerce","Arts","Engineering","Management","Law","Medicine","Design"];

/* ── Icons ──────────────────────────────────────── */
const AcadIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const SettIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const OutIco = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const TABS = [
  { id:"academic", label:"Academic Profile", Icon: AcadIco },
  { id:"settings", label:"Settings",         Icon: SettIco },
];

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
      const payload = data.data ?? data;
      const p = payload.userProfile    || {};
      const s = payload.studentDetails || {};
      setForm({
        education:     s.education     || "",
        stream:        s.stream        || "",
        yearOfPassing: s.yearOfPassing || "",
        courseBranch:  s.courseBranch  || "",
        branch:        p.branch        || "",
        year:          p.year          || "",
        university:    p.university    || "",
        bio:           p.bio           || "",
        interests:     [...(s.interests||[]),...(p.interests||[])].filter((v,i,a)=>a.indexOf(v)===i),
        domains:       p.domains       || [],
        linkedinUrl:   p.linkedinUrl   || "",
        githubUrl:     p.githubUrl     || "",
      });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When stream changes keep only interests valid in the new stream
  const setStream = (s) => {
    const newPool = INTERESTS_BY_STREAM[s] || [];
    setForm(p => ({
      ...p,
      stream: s,
      interests: p.interests.filter(i => newPool.includes(i)),
    }));
  };

  const toggleI = (item) => set("interests",
    form.interests.includes(item)
      ? form.interests.filter(i => i !== item)
      : [...form.interests, item]
  );

  const save = async () => {
    setSaving(true);
    try { await updateProfile(form); toast("Profile saved successfully.", "ok"); }
    catch { toast("Failed to save. Please try again.", "err"); }
    finally { setSaving(false); }
  };

  const savePw = async () => {
    if (pw.next !== pw.confirm) { toast("Passwords do not match.", "err"); return; }
    if (pw.next.length < 8)    { toast("At least 8 characters required.", "err"); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next });
      toast("Password changed successfully.", "ok");
      setPw({ current:"", next:"", confirm:"" });
    } catch(e) { toast(e.response?.data?.message || "Incorrect current password.", "err"); }
    finally { setSaving(false); }
  };

  const initials = user?.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "?";
  const availableInterests = INTERESTS_BY_STREAM[form.stream] || DEFAULT_INTERESTS;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:32, height:32, border:"2.5px solid var(--bd)", borderTopColor:"var(--ac)", borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
    </div>
  );

  return (
    <div className="pf-root">
      <Navbar showModeToggle={false} />

      <div className="pf-body">
        <aside className="pf-aside">
          <div className="pf-av-block">
            <div className="pf-av">
              {user?.profilePicture ? <img src={user.profilePicture} alt="pfp" /> : initials}
            </div>
            <p className="pf-av-name">{user?.name}</p>
            <p className="pf-av-email">{user?.email}</p>
            {form.university && <p className="pf-av-uni">{form.university}</p>}
          </div>

          <nav className="pf-nav">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id}
                className={`pf-nav-btn ${tab === id ? "on" : ""}`}
                onClick={() => setTab(id)}
              >
                <Icon /> {label}
              </button>
            ))}
          </nav>

          <button className="pf-nav-btn pf-logout" onClick={() => { logout(); nav("/auth"); }}>
            <OutIco /> Sign out
          </button>
        </aside>

        <div className="pf-content">
          {flash.text && <div className={`pf-flash ${flash.type}`}>{flash.text}</div>}

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
                        onClick={() => setStream(s)}
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
                <h3 className="pf-section-title">
                  Interests{form.stream ? ` in ${form.stream}` : ""}
                </h3>
                <p className="pf-section-sub">
                  {form.stream
                    ? `Specific topics within ${form.stream} — the AI focuses Grounded mode answers on these`
                    : "Select a stream above to see relevant interest options"}
                </p>
                <div className="pf-tags">
                  {availableInterests.map(item => (
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
