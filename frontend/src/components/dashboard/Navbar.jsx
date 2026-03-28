import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext.jsx";
import "../../styles/Navbar.css";

const Navbar = ({ mode, onModeChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">✦ AcadAI</span>
      </div>

      <div className="navbar-center">
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "general" ? "active" : ""}`}
            onClick={() => onModeChange("general")}
          >
            General
          </button>
          <button
            className={`mode-btn ${mode === "grounded" ? "active" : ""}`}
            onClick={() => onModeChange("grounded")}
          >
            ⚓ Grounded
          </button>
        </div>
      </div>

      <div className="navbar-right" ref={dropRef}>
        <button className="pfp-btn" onClick={() => setDropOpen((p) => !p)}>
          {user?.profilePicture
            ? <img src={user.profilePicture} alt="pfp" className="pfp-img" />
            : <span className="pfp-initials">{initials}</span>
          }
        </button>

        {dropOpen && (
          <div className="pfp-dropdown">
            <div className="pfp-dropdown-header">
              <p className="pfp-name">{user?.name}</p>
              <p className="pfp-email">{user?.email}</p>
            </div>
            <button onClick={() => { navigate("/profile"); setDropOpen(false); }}>
              👤 Profile
            </button>
            <button onClick={() => { navigate("/profile#settings"); setDropOpen(false); }}>
              ⚙️ Settings
            </button>
            <hr />
            <button className="logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;