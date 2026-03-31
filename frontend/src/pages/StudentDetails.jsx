// frontend/src/pages/StudentDetails.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveStudentDetails } from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import "../styles/theme.css";
import "../styles/StudentDetails.css";

/* ── Deep stream-aware interests ─────────────────────
   Each stream has broad areas + specific sub-topics
   so students in any branch see relevant options.
──────────────────────────────────────────────────── */
const INTERESTS_BY_STREAM = {
  Science: [
    // Physics
    "Atomic Physics","Nuclear Physics","Quantum Mechanics","Classical Mechanics",
    "Thermodynamics","Electromagnetism","Optics","Relativity","Astrophysics",
    // Chemistry
    "Organic Chemistry","Inorganic Chemistry","Physical Chemistry",
    "Chemical Equilibrium","Chemical Kinetics","Electrochemistry",
    "Analytical Chemistry","Spectroscopy",
    // Biology
    "Cell Biology","Genetics","Evolution","Ecology","Microbiology",
    "Molecular Biology","Biotechnology","Zoology","Botany",
    // Maths
    "Calculus","Linear Algebra","Differential Equations","Probability",
    "Statistics","Number Theory","Discrete Mathematics",
    // Other
    "Environmental Science","Geology","Astronomy","Meteorology","Oceanography",
  ],
  Commerce: [
    // Accounting & Finance
    "Financial Accounting","Cost Accounting","Management Accounting",
    "Auditing","Taxation (Direct)","Taxation (Indirect / GST)",
    "Corporate Finance","Investment Analysis","Financial Markets",
    "Banking Operations","Insurance","Capital Markets","Portfolio Management",
    // Economics
    "Microeconomics","Macroeconomics","International Trade",
    "Development Economics","Public Finance","Monetary Policy",
    // Business
    "Business Law","Business Communication","Marketing Management",
    "Retail Management","E-Commerce","Entrepreneurship","Business Analytics",
  ],
  Arts: [
    // Literature & Languages
    "English Literature","Hindi Literature","Comparative Literature",
    "Creative Writing","Journalism","Mass Communication",
    // Social Sciences
    "Indian History","World History","Ancient Civilisations",
    "Indian Polity","International Relations","Public Administration",
    "Political Theory","Human Geography","Urban Studies",
    // Psychology & Philosophy
    "Social Psychology","Cognitive Psychology","Abnormal Psychology",
    "Ethics","Logic","Existentialism","Eastern Philosophy",
    // Sociology
    "Social Stratification","Gender Studies","Anthropology",
    "Culture & Society","Rural Sociology",
    // Fine Arts & Media
    "Visual Arts","Music Theory","Film Studies","Advertising & PR",
  ],
  Engineering: [
    // Computer Science & IT
    "Data Structures & Algorithms","Operating Systems","Computer Networks",
    "Database Management","Software Engineering","Web Development",
    "Mobile App Development","Cloud Computing","DevOps","Cybersecurity",
    "Machine Learning","Deep Learning","Natural Language Processing",
    "Computer Vision","Data Science","Big Data","Blockchain",
    "Artificial Intelligence","IoT","Compiler Design",
    // Electronics & Electrical
    "Digital Electronics","Analog Circuits","VLSI Design",
    "Embedded Systems","Signal Processing","Control Systems",
    "Power Systems","Power Electronics","Microprocessors",
    "Communication Systems","Wireless Networks","Antenna Design",
    // Mechanical
    "Thermodynamics (Engg)","Fluid Mechanics","Heat Transfer",
    "Manufacturing Processes","Machine Design","Robotics",
    "CAD / CAM","Automotive Engineering","Aerospace Engineering",
    "Industrial Engineering","Operations Research",
    // Civil
    "Structural Engineering","Geotechnical Engineering",
    "Transportation Engineering","Environmental Engineering",
    "Construction Management","Hydraulics","Surveying",
    // Chemical
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
    // Basic Sciences
    "Anatomy","Physiology","Biochemistry","Pathology","Microbiology",
    "Pharmacology","Forensic Medicine",
    // Clinical
    "Internal Medicine","Surgery","Obstetrics & Gynaecology",
    "Pediatrics","Psychiatry","Orthopaedics","Ophthalmology",
    "ENT","Dermatology","Radiology","Anaesthesiology",
    // Specialties
    "Cardiology","Neurology","Nephrology","Gastroenterology",
    "Oncology","Pulmonology","Endocrinology","Immunology",
    // Community & Research
    "Community Medicine","Medical Research","Clinical Trials",
    "Public Health","Nutrition & Dietetics",
  ],
  Design: [
    // Digital Design
    "UI / UX Design","Interaction Design","User Research",
    "Figma & Prototyping","Web Design","App Design",
    // Visual & Graphic
    "Graphic Design","Typography","Branding & Identity",
    "Motion Graphics","Illustration","Photography","Video Editing",
    // Product & Industrial
    "Product Design","Industrial Design","Ergonomics",
    "Packaging Design","3D Modelling","Sustainable Design",
    // Architecture & Spatial
    "Architecture","Interior Design","Urban Planning",
    "Landscape Design","Construction Technology",
    // Fashion & Textile
    "Fashion Design","Textile Design","Costume Design",
  ],
};

const STREAMS = ["Science","Commerce","Arts","Engineering","Management","Law","Medicine","Design"];

const PILLS = [
  {
    id:"UG",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
    title:"Under Graduate", desc:"Bachelor's degree programme",
  },
  {
    id:"PG",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
    title:"Post Graduate", desc:"Master's degree programme",
  },
  {
    id:"PhD",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    title:"Doctorate / PhD", desc:"Research & doctoral programme",
  },
];

export default function StudentDetails() {
  const navigate = useNavigate();
  const { markProfileComplete } = useAuth();

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [dir,     setDir]     = useState("sd-enter");
  const [form,    setForm]    = useState({
    education:"", stream:"", yearOfPassing:"", courseBranch:"", interests:[],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Switching stream resets interests to avoid stale cross-stream tags
  const setStream = (s) => setForm(p => ({ ...p, stream: s, interests: [] }));

  const toggleI = (item) => set("interests",
    form.interests.includes(item)
      ? form.interests.filter(i => i !== item)
      : [...form.interests, item]
  );

  const goNext = () => {
    if (!form.education) { setError("Please select your education level."); return; }
    if (!form.stream)    { setError("Please select your stream."); return; }
    setError(""); setDir("sd-enter"); setStep(1);
  };
  const goBack = () => { setError(""); setDir("sd-back"); setStep(0); };

  const submit = async () => {
    if (!form.yearOfPassing || !form.courseBranch) {
      setError("Please fill all required fields."); return;
    }
    setLoading(true); setError("");
    try {
      await saveStudentDetails({ ...form, yearOfPassing: Number(form.yearOfPassing) });
      markProfileComplete();
      navigate("/dashboard");
    } catch(e) { setError(e.response?.data?.error || "Something went wrong."); }
    finally { setLoading(false); }
  };

  const availableInterests = INTERESTS_BY_STREAM[form.stream] || [];

  return (
    <div className="sd-root">
      <div className="sd-blob sd-blob1" />
      <div className="sd-blob sd-blob2" />

      <div className="sd-card anim-scale">
        <div className="sd-head">
          <div className="sd-logo-row">
            <div className="sd-logo-box">A</div>
            AcadAI
          </div>
          <h1 className="sd-title">
            {step === 0 ? "Set up your profile" : "Interests & details"}
          </h1>
          <p className="sd-sub">
            {step === 0
              ? "Step 1 of 2 — shapes how your AI tutor responds"
              : "Step 2 of 2 — optional but makes responses much smarter"}
          </p>
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
                    <span className="pill-svg-icon">{p.icon}</span>
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
                    onClick={() => setStream(s)}
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
                  placeholder="e.g. Computer Science, B.Com" />
              </div>
              <div className="sd-field">
                <label>Year of Passing <span className="req">*</span></label>
                <input className="sd-input" type="number" value={form.yearOfPassing}
                  onChange={e => set("yearOfPassing", e.target.value)}
                  placeholder="e.g. 2026" min="2000" max="2035" />
              </div>
            </div>

            <div className="sd-field">
              <label>Interests in {form.stream}</label>
              <p className="sd-hint">
                Pick specific topics within your field — the AI uses these to focus Grounded mode answers
              </p>
              {availableInterests.length > 0 ? (
                <div className="sd-tags">
                  {availableInterests.map(item => (
                    <button key={item} type="button"
                      className={`sd-tag ${form.interests.includes(item) ? "on" : ""}`}
                      onClick={() => toggleI(item)}
                    >{item}</button>
                  ))}
                </div>
              ) : (
                <p className="sd-hint" style={{ fontStyle:"italic" }}>
                  Go back and select a stream to see relevant interests.
                </p>
              )}
            </div>

            {error && <p className="sd-err">{error}</p>}

            <div className="sd-row-actions">
              <button className="sd-ghost" onClick={goBack}>← Back</button>
              <button className="btn-primary" style={{ flex:1, padding:"0.85rem" }} onClick={submit} disabled={loading}>
                {loading ? <span className="spinner" /> : "Get Started"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
