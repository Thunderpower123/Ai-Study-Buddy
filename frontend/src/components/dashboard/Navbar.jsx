// frontend/src/components/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import "../../styles/Navbar.css";

const Ico = ({ d, s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const Anchor = () => <Ico s={13} d={<><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0020 0h-3"/></>} />;
const Globe  = () => <Ico s={13} d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>} />;
const FileIc = () => <Ico s={13} d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></>} />;
const UserIc = () => <Ico s={14} d={<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />;
const OutIc  = () => <Ico s={14} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />;
const MenuIc = () => <Ico s={18} d={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>} />;

export default function Navbar({
  mode, onModeChange,
  docCount, onFilesClick, filesActive,
  sessionTitle, onSidebarToggle,
  showModeToggle = true,
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <nav className="navbar">
      <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
        {onSidebarToggle && (
          <button className="nav-menu-btn" onClick={onSidebarToggle} style={{ display:"flex" }}>
            <MenuIc />
          </button>
        )}
        <a href="/dashboard" className="nav-brand">
          <div className="nav-brand-box">A</div>
          <span>AcadAI</span>
        </a>
        {sessionTitle && <span className="nav-session-title">{sessionTitle}</span>}
      </div>

      {showModeToggle && (
        <div className="nav-center">
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === "grounded" ? "active" : ""}`} onClick={() => onModeChange?.("grounded")}>
              <Anchor /> <span>Grounded</span>
            </button>
            <button className={`mode-btn ext ${mode === "general" ? "active" : ""}`} onClick={() => onModeChange?.("general")}>
              <Globe /> <span>General</span>
            </button>
          </div>
        </div>
      )}

      <div className="nav-right">
        {onFilesClick && (
          <button className={`nav-files-pill ${filesActive ? "on" : ""}`} onClick={onFilesClick}>
            <FileIc />
            <span>{docCount ?? 0} file{docCount !== 1 ? "s" : ""}</span>
          </button>
        )}
        <div className="nav-pfp-wrap" ref={ref}>
          <button className="nav-pfp-btn" onClick={() => setOpen(p => !p)}>
            {user?.profilePicture ? <img src={user.profilePicture} alt="pfp" /> : initials}
          </button>
          {open && (
            <div className="pfp-drop">
              <div className="pfp-drop-head">
                <p className="pfp-drop-name">{user?.name}</p>
                <p className="pfp-drop-email">{user?.email}</p>
              </div>
              <div className="pfp-drop-items">
                <button className="pfp-drop-item" onClick={() => { nav("/profile"); setOpen(false); }}>
                  <UserIc /> Profile & Settings
                </button>
                <div className="pfp-drop-hr" />
                <button className="pfp-drop-item danger" onClick={() => { logout(); nav("/auth"); }}>
                  <OutIc /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}