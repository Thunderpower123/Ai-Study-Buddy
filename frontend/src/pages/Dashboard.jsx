import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import {
  getAllSessions, createSession, deleteSession,
  sendMessage, getChatHistory, getSession,
  uploadDocument, listDocuments, deleteDocument,
} from "../utils/api";
import "../styles/Dashboard.css";

// ─── Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus:    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    trash:   <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    chat:    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>,
    file:    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" fill="none"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" fill="none"/></>,
    send:    <><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polygon points="22,2 15,22 11,13 2,9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"/></>,
    upload:  <><polyline points="16,16 12,12 8,16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></>,
    user:    <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" fill="none"/></>,
    logout:  <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    anchor:  <><circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" fill="none"/><line x1="12" y1="8" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 12H2a10 10 0 0020 0h-3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></>,
    globe:   <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" fill="none"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="1.8" fill="none"/></>,
    close:   <><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    settings:<><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8" fill="none"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {icons[name]}
    </svg>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
};

const fileIcon = (type="") => {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("ppt")) return "PPT";
  if (type.includes("doc")) return "DOC";
  return "TXT";
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sidebar state
  const [sessions, setSessions]           = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [pfpOpen, setPfpOpen]             = useState(false);

  // Chat state
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [mode, setMode]           = useState("grounded"); // grounded | general

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docPanelOpen, setDocPanelOpen] = useState(false);

  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const pfpRef      = useRef(null);
  const textareaRef = useRef(null);

  // Load all sessions on mount
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  // Close pfp dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (pfpRef.current && !pfpRef.current.contains(e.target)) setPfpOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const loadSessions = async () => {
    try {
      const { data } = await getAllSessions();
      setSessions(data);
      if (data.length > 0 && !activeSession) openSession(data[0]);
    } catch (e) { console.error(e); }
  };

  const openSession = async (session) => {
    setActiveSession(session);
    setMode(session.lastMode || "grounded");
    setDocPanelOpen(false);
    try {
      const [histRes, docsRes] = await Promise.all([
        getChatHistory(session._id),
        listDocuments(session._id),
      ]);
      setMessages(histRes.data);
      setDocuments(docsRes.data);
    } catch (e) { setMessages([]); setDocuments([]); }
  };

  const handleNewSession = async () => {
    try {
      const { data } = await createSession();
      setSessions(p => [data, ...p]);
      openSession(data);
    } catch (e) { console.error(e); }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      setSessions(p => p.filter(s => s._id !== id));
      if (activeSession?._id === id) {
        const rest = sessions.filter(s => s._id !== id);
        rest.length > 0 ? openSession(rest[0]) : setActiveSession(null);
        setMessages([]); setDocuments([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !activeSession) return;
    const content = input.trim();
    setInput("");
    setMessages(p => [...p, { role: "user", content }]);
    setSending(true);
    try {
      const { data } = await sendMessage(activeSession._id, { content, mode });
      setMessages(p => [...p, {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        confidence: data.confidence,
        mode: data.mode,
      }]);
      // Update session title in sidebar if it changed
      setSessions(p => p.map(s => s._id === activeSession._id ? { ...s, title: data.sessionTitle || s.title } : s));
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", content: "⚠️ Error getting response. Please try again.", isError: true }]);
    } finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeSession) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const { data } = await uploadDocument(activeSession._id, fd);
      setDocuments(p => [...p, ...(data.documents || [data])]);
    } catch (e) { console.error(e); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleDeleteDoc = async (docId) => {
    try { await deleteDocument(docId); setDocuments(p => p.filter(d => d._id !== docId)); }
    catch (e) { console.error(e); }
  };

  const handleLogout = () => { logout(); navigate("/auth"); };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "?";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="db-root">

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`db-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sb-top">
          <div className="sb-brand">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="#a594f9" strokeWidth="1.5" fill="none"/>
              <circle cx="16" cy="16" r="4" fill="#a594f9" opacity="0.6"/>
            </svg>
            <span className="sb-name">AcadAI</span>
          </div>
          <button className="sb-collapse" onClick={() => setSidebarOpen(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d={sidebarOpen ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <button className="sb-new-btn" onClick={handleNewSession}>
          <Icon name="plus" size={15} />
          <span>New Session</span>
        </button>

        <div className="sb-sessions-label">Sessions</div>

        <div className="sb-sessions">
          {sessions.length === 0 ? (
            <div className="sb-empty">No sessions yet. Create one above.</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s._id}
                className={`sb-session ${activeSession?._id === s._id ? "active" : ""}`}
                onClick={() => openSession(s)}
              >
                <Icon name="chat" size={14} />
                <span className="sb-session-title">{s.title || "Untitled"}</span>
                <span className="sb-session-time">{timeAgo(s.updatedAt)}</span>
                <button className="sb-del" onClick={(e) => handleDeleteSession(s._id, e)}>
                  <Icon name="close" size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom nav */}
        <div className="sb-bottom">
          <button className="sb-nav-item" onClick={() => navigate("/profile")}>
            <Icon name="settings" size={15} />
            <span>Profile & Settings</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ───────────────────────────────────────────────── */}
      <main className="db-main">

        {/* TOP NAV */}
        <nav className="db-nav">
          <div className="nav-left">
            {!sidebarOpen && (
              <button className="nav-open-sb" onClick={() => setSidebarOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <span className="nav-session-title">
              {activeSession?.title || "AI Study Buddy"}
            </span>
          </div>

          <div className="nav-center">
            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === "grounded" ? "active" : ""}`}
                onClick={() => setMode("grounded")}
              >
                <Icon name="anchor" size={13} />
                Grounded
              </button>
              <button
                className={`mode-btn ${mode === "general" ? "active" : ""}`}
                onClick={() => setMode("general")}
              >
                <Icon name="globe" size={13} />
                General
              </button>
            </div>
          </div>

          <div className="nav-right">
            {/* Files button */}
            {activeSession && (
              <button
                className={`nav-files-btn ${docPanelOpen ? "active" : ""}`}
                onClick={() => setDocPanelOpen(p => !p)}
              >
                <Icon name="file" size={15} />
                <span>{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
              </button>
            )}

            {/* PFP */}
            <div className="pfp-wrap" ref={pfpRef}>
              <button className="pfp-btn" onClick={() => setPfpOpen(p => !p)}>
                {user?.profilePicture
                  ? <img src={user.profilePicture} alt="pfp" />
                  : <span className="pfp-initials">{initials}</span>
                }
                <span className="pfp-ring" />
              </button>

              {pfpOpen && (
                <div className="pfp-drop">
                  <div className="pfp-drop-header">
                    <div className="pfp-drop-avatar">{initials}</div>
                    <div>
                      <p className="pfp-drop-name">{user?.name}</p>
                      <p className="pfp-drop-email">{user?.email}</p>
                    </div>
                  </div>
                  <div className="pfp-drop-items">
                    <button onClick={() => { navigate("/profile"); setPfpOpen(false); }}>
                      <Icon name="user" size={14} /> Profile
                    </button>
                    <button onClick={() => { navigate("/profile#settings"); setPfpOpen(false); }}>
                      <Icon name="settings" size={14} /> Settings
                    </button>
                    <div className="pfp-drop-divider" />
                    <button className="pfp-drop-logout" onClick={handleLogout}>
                      <Icon name="logout" size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* DOCUMENTS PANEL (slide-down) */}
        {docPanelOpen && activeSession && (
          <div className="doc-panel">
            <div className="doc-panel-head">
              <span>Study Materials</span>
              <button className="doc-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Icon name="upload" size={14} />
                {uploading ? "Uploading…" : "Add Files"}
              </button>
              <input ref={fileRef} type="file" multiple hidden
                accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
                onChange={handleUpload}
              />
            </div>
            <div className="doc-list">
              {documents.length === 0
                ? <span className="doc-empty">No files yet — upload PDFs, PPTX, DOCX or TXT</span>
                : documents.map(doc => (
                  <div key={doc._id} className="doc-item">
                    <span className="doc-badge">{fileIcon(doc.fileType)}</span>
                    <span className="doc-name">{doc.filename}</span>
                    <span className="doc-chunks">{doc.totalChunks} chunks</span>
                    <button className="doc-del" onClick={() => handleDeleteDoc(doc._id)}>
                      <Icon name="close" size={11} />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* CHAT AREA */}
        <div className="db-chat">
          {!activeSession ? (
            <div className="chat-welcome">
              <div className="welcome-hex">
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <path d="M36 4L64 20V52L36 68L8 52V20L36 4Z" stroke="#a594f9" strokeWidth="1.5" fill="none"/>
                  <path d="M36 16L52 25V43L36 52L20 43V25L36 16Z" stroke="#a594f9" strokeWidth="1" fill="none" opacity="0.4"/>
                  <circle cx="36" cy="36" r="8" fill="#a594f9" opacity="0.2"/>
                  <circle cx="36" cy="36" r="3" fill="#a594f9"/>
                </svg>
              </div>
              <h2>Welcome back, {user?.name?.split(" ")[0]}</h2>
              <p>Create a new session or select one from the sidebar to start studying</p>
              <button className="welcome-cta" onClick={handleNewSession}>
                <Icon name="plus" size={15} /> New Session
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="chat-msgs">
                {messages.length === 0 && (
                  <div className="chat-hints">
                    <p>Upload your notes, then ask anything about them.</p>
                    <div className="hint-chips">
                      {["Summarise my notes","Explain key concepts","Quiz me on this topic","Create a study plan"].map(q => (
                        <button key={q} className="hint-chip" onClick={() => setInput(q)}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`msg msg-${msg.role}`} style={{ animationDelay: `${i * 0.03}s` }}>
                    {msg.role === "assistant" && (
                      <div className="msg-avatar">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                          <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="#a594f9" strokeWidth="1.5" fill="none"/>
                          <circle cx="16" cy="16" r="4" fill="#a594f9"/>
                        </svg>
                      </div>
                    )}
                    <div className={`msg-bubble ${msg.isError ? "err" : ""}`}>
                      <p>{msg.content}</p>
                      {msg.sources?.length > 0 && (
                        <div className="msg-sources">
                          <span className="src-label">Sources</span>
                          {msg.sources.map((s, si) => (
                            <span key={si} className="src-chip">{s.filename} · p.{s.page}</span>
                          ))}
                        </div>
                      )}
                      {msg.confidence && (
                        <div className="msg-conf">
                          <span className="conf-dot" style={{
                            background: msg.confidence >= 0.8 ? "#22d3a5" : msg.confidence >= 0.5 ? "#f4a944" : "#f87171"
                          }} />
                          {Math.round(msg.confidence * 100)}% confident · {msg.mode}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="msg msg-assistant">
                    <div className="msg-avatar">
                      <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                        <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="#a594f9" strokeWidth="1.5" fill="none"/>
                        <circle cx="16" cy="16" r="4" fill="#a594f9"/>
                      </svg>
                    </div>
                    <div className="msg-bubble typing">
                      <span/><span/><span/>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="chat-input-wrap">
                <div className="chat-input-box">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={mode === "grounded"
                      ? "Ask about your uploaded documents…"
                      : "Ask anything — I'll combine your notes with general knowledge…"
                    }
                    rows={1}
                    disabled={sending}
                  />
                  <div className="chat-input-actions">
                    <button
                      className="input-upload-btn"
                      onClick={() => fileRef.current?.click()}
                      title="Attach files"
                    >
                      <Icon name="upload" size={16} />
                    </button>
                    <button
                      className="input-send-btn"
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                    >
                      <Icon name="send" size={15} />
                    </button>
                  </div>
                </div>
                <p className="chat-input-hint">
                  {mode === "grounded"
                    ? "⚓ Grounded — answers only from your uploaded documents"
                    : "🌐 General — extends your notes with broader knowledge"
                  }
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}