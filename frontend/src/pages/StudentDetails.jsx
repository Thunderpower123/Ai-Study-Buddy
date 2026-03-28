import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveStudentDetails } from "../utils/api.js";
import { useAuth } from "../utils/AuthContext.jsx";
import "../styles/StudentDetails.css";

const INTERESTS = [
  "Machine Learning", "Web Development", "Data Science", "Cybersecurity",
  "Cloud Computing", "Embedded Systems", "Blockchain", "AI/NLP",
  "Mobile Development", "DevOps", "Research", "Robotics",
];

const StudentDetails = () => {
  const navigate = useNavigate();
  const { markProfileComplete } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    education: "",
    stream: "",
    yearOfPassing: "",
    courseBranch: "",
    interests: [],
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (!form.education || !form.stream || !form.yearOfPassing || !form.courseBranch) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await saveStudentDetails({ ...form, yearOfPassing: Number(form.yearOfPassing) });
      markProfileComplete();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sd-root">
      <div className="sd-card">
        {/* Header */}
        <div className="sd-header">
          <div className="sd-logo">✦</div>
          <h1>Tell us about yourself</h1>
          <p>We'll personalise your experience based on your academic background</p>
          <div className="sd-steps">
            {[1, 2].map((s) => (
              <div key={s} className={`sd-step ${step >= s ? "active" : ""}`} />
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="sd-body">
            <div className="sd-field">
              <label>Education Level <span>*</span></label>
              <div className="sd-radio-group">
                {["UG", "PG", "PhD"].map((level) => (
                  <button
                    key={level}
                    className={`sd-radio-btn ${form.education === level ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, education: level })}
                    type="button"
                  >
                    {level === "UG" ? "🎓 Under Graduate" : level === "PG" ? "📚 Post Graduate" : "🔬 PhD"}
                  </button>
                ))}
              </div>
            </div>

            <div className="sd-field">
              <label>Stream / Faculty <span>*</span></label>
              <input
                name="stream"
                value={form.stream}
                onChange={handleChange}
                placeholder="e.g. Science, Commerce, Arts, Engineering"
              />
            </div>

            <div className="sd-row">
              <div className="sd-field">
                <label>Course / Branch <span>*</span></label>
                <input
                  name="courseBranch"
                  value={form.courseBranch}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science, MBA, Physics"
                />
              </div>
              <div className="sd-field">
                <label>Year of Passing <span>*</span></label>
                <input
                  name="yearOfPassing"
                  type="number"
                  value={form.yearOfPassing}
                  onChange={handleChange}
                  placeholder="e.g. 2025"
                  min="2000"
                  max="2035"
                />
              </div>
            </div>

            <button className="sd-next" onClick={() => setStep(2)} type="button">
              Next → Choose Interests
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="sd-body">
            <div className="sd-field">
              <label>Interests & Domains</label>
              <p className="sd-hint">Select all that apply — this helps ground your AI responses</p>
              <div className="sd-tags">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`sd-tag ${form.interests.includes(interest) ? "selected" : ""}`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="sd-error">{error}</p>}

            <div className="sd-actions">
              <button className="sd-back" onClick={() => setStep(1)} type="button">← Back</button>
              <button className="sd-submit" onClick={handleSubmit} disabled={loading} type="button">
                {loading ? "Saving..." : "Get Started ✦"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Background decoration */}
      <div className="sd-bg-circle sd-bg-circle--1" />
      <div className="sd-bg-circle sd-bg-circle--2" />
    </div>
  );
};

export default StudentDetails;