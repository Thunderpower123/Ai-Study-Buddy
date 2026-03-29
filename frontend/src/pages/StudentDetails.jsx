// frontend/src/pages/StudentDetails.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveStudentDetails } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import "../styles/theme.css";
import "../styles/StudentDetails.css";

const STREAMS   = ["Science","Commerce","Arts","Engineering","Management","Law","Medicine","Design"];
const INTERESTS = ["Machine Learning","Web Dev","Data Science","Cybersecurity","Cloud Computing","Embedded Systems","Blockchain","AI / NLP","Mobile Dev","DevOps","Research","Robotics","Computer Vision","Networking"];
const PILLS = [
  { id:"UG",  emoji:"🎓", title:"Under Graduate",   desc:"Bachelor's degree programme" },
  { id:"PG",  emoji:"📚", title:"Post Graduate",    desc:"Master's degree programme" },
  { id:"PhD", emoji:"🔬", title:"Doctorate / PhD",  desc:"Research & doctoral programme" },
];

export default function StudentDetails() {
  const navigate = useNavigate();
  const { markProfileComplete } = useAuth();

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [dir,     setDir]     = useState("sd-enter");
  const [form,    setForm]    = useState({ education:"", stream:"", yearOfPassing:"", courseBranch:"", interests:[] });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleI = (item) => set("interests", form.interests.includes(item) ? form.interests.filter(i=>i!==item) : [...form.interests,item]);

  const goNext = () => {
    if (!form.education) { setError("Please select your education level."); return; }
    if (!form.stream)    { setError("Please select your stream."); return; }
    setError(""); setDir("sd-enter"); setStep(1);
  };
  const goBack = () => { setError(""); setDir("sd-back"); setStep(0); };

  const submit = async () => {
    if (!form.yearOfPassing || !form.courseBranch) { setError("Please fill all required fields."); return; }
    setLoading(true); setError("");
    try {
      await saveStudentDetails({ ...form, yearOfPassing: Number(form.yearOfPassing) });
      markProfileComplete();
      navigate("/dashboard");
    } catch(e) { setError(e.response?.data?.error || "Something went wrong."); }
    finally { setLoading(false); }
  };

  return (
    <div className="sd-root">
      <div className="sd-blob sd-blob1" />
      <div className="sd-blob sd-blob2" />

      <div className="sd-card anim-scale">
        {/* Header */}
        <div className="sd-head">
          <div className="sd-logo-row">
            <div className="sd-logo-box">A</div>
            AcadAI
          </div>
          <h1 className="sd-title">{step === 0 ? "Set up your profile" : "Interests & details"}</h1>
          <p className="sd-sub">{step === 0 ? "Step 1 of 2 — shapes how your AI tutor responds" : "Step 2 of 2 — optional but makes responses much smarter"}</p>
          <div className="sd-bar">
            <div className="sd-fill" style={{ width: step === 0 ? "50%" : "100%" }} />
          </div>
        </div>

        {/* Step 0 */}
        {step === 0 && (
          <div className={`sd-body ${dir}`}>
            <div className="sd-field">
              <label>Education Level <span className="req">*</span></label>
              <div className="sd-pills">
                {PILLS.map(p => (
                  <button key={p.id} type="button"
                    className={`sd-pill ${form.education === p.id ? "on" : ""}`}
                    onClick={() => set("education", p.id)}
                  >
                    <span className="pill-emoji">{p.emoji}</span>
                    <span className="pill-info">
                      <span className="pill-title">{p.title}</span>
                      <span className="pill-desc">{p.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sd-field">
              <label>Stream / Faculty <span className="req">*</span></label>
              <div className="sd-chips">
                {STREAMS.map(s => (
                  <button key={s} type="button"
                    className={`sd-chip ${form.stream === s ? "on" : ""}`}
                    onClick={() => set("stream", s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {error && <p className="sd-err">{error}</p>}
            <button className="btn-primary" style={{ width:"100%", padding:"0.85rem" }} onClick={goNext}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className={`sd-body ${dir}`}>
            <div className="sd-2col">
              <div className="sd-field">
                <label>Course / Branch <span className="req">*</span></label>
                <input className="sd-input" value={form.courseBranch}
                  onChange={e => set("courseBranch", e.target.value)}
                  placeholder="e.g. Computer Science" />
              </div>
              <div className="sd-field">
                <label>Year of Passing <span className="req">*</span></label>
                <input className="sd-input" type="number" value={form.yearOfPassing}
                  onChange={e => set("yearOfPassing", e.target.value)}
                  placeholder="e.g. 2026" min="2000" max="2035" />
              </div>
            </div>

            <div className="sd-field">
              <label>Interests & Domains</label>
              <p className="sd-hint">Helps Grounded mode personalise answers to your field</p>
              <div className="sd-tags">
                {INTERESTS.map(item => (
                  <button key={item} type="button"
                    className={`sd-tag ${form.interests.includes(item) ? "on" : ""}`}
                    onClick={() => toggleI(item)}
                  >{item}</button>
                ))}
              </div>
            </div>

            {error && <p className="sd-err">{error}</p>}

            <div className="sd-row-actions">
              <button className="sd-ghost" onClick={goBack}>← Back</button>
              <button className="btn-primary" style={{ flex:1, padding:"0.85rem" }} onClick={submit} disabled={loading}>
                {loading ? <span className="spinner" /> : "Get Started 🎉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}