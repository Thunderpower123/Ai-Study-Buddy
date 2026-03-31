// frontend/src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import Navbar from "../components/dashboard/Navbar";
import {
  getAllSessions, createSession, deleteSession,
  sendMessage, getChatHistory,
  uploadDocument, listDocuments, deleteDocument,
} from "../utils/api";
import "../styles/theme.css";
import "../styles/Dashboard.css";

/* ── Icons ─────────────────────────────────────── */
const Ico = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const IcoPlus  = () => <Ico d={<><path d="M12 5v14M5 12h14"/></>} />;
const IcoChat  = () => <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />;
const IcoTrash = () => <Ico s={13} d={<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none"/></>} />;
const IcoGear  = () => <Ico s={15} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>} />;
const IcoSend  = () => <Ico s={15} d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill="none"/></>} />;
const IcoX     = () => <Ico s={12} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const IcoBook  = () => <Ico s={56} d={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />;

/* Cloud upload icon — bigger, more visible */
const IcoUploadCloud = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const ago = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
};
const fIcon = (t = "") => {
  if (t.includes("pdf")) return "PDF";
  if (t.includes("ppt")) return "PPT";
  if (t.includes("doc")) return "DOC";
  return "TXT";
};

const getSuggestions = (mode) => mode === "grounded"
  ? ["Summarise these notes", "List key definitions", "What are the main topics?", "Explain this concept"]
  : ["Explain quantum mechanics", "Give me study tips", "Create a quiz on this topic", "Simplify this for me"];

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [sessions,  setSessions]  = useState([]);
  const [active,    setActive]    = useState(null);
  const [msgs,      setMsgs]      = useState([]);
  const [docs,      setDocs]      = useState([]);
  const [input,     setInput]     = useState("");
  const [mode,      setMode]      = useState("grounded");
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen,   setMobOpen]   = useState(false);

  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const taRef     = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, sending]);
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const load = async () => {
    try {
      const { data } = await getAllSessions();
      const list = data.data ?? data;
      setSessions(Array.isArray(list) ? list : []);
      if (list.length > 0) openSession(list[0]);
    } catch(e) { console.error(e); }
  };

  const openSession = async (s) => {
    setActive(s); setMode(s.lastMode || "grounded");
    setMobOpen(false);
    try {
      const [h, d] = await Promise.all([getChatHistory(s._id), listDocuments(s._id)]);
      setMsgs(Array.isArray(h.data?.data) ? h.data.data : (h.data?.data ?? []));
      setDocs(Array.isArray(d.data?.data) ? d.data.data : (d.data?.data ?? []));
    } catch { setMsgs([]); setDocs([]); }
  };

  const newSession = async () => {
    try {
      const { data } = await createSession();
      const session = data.data ?? data;
      setSessions(p => [session, ...p]);
      openSession(session);
    } catch(e) { console.error(e); }
  };

  const delSession = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      const rest = sessions.filter(s => s._id !== id);
      setSessions(rest);
      if (active?._id === id) {
        rest.length > 0 ? openSession(rest[0]) : (setActive(null), setMsgs([]), setDocs([]));
      }
    } catch(e) { console.error(e); }
  };

  const send = async () => {
    if (!input.trim() || sending || !active) return;
    const content = input.trim();
    setInput("");
    setMsgs(p => [...p, { role:"user", content }]);
    setSending(true);
    try {
      const { data } = await sendMessage(active._id, { content, mode });
      const payload = data.data ?? data;
      setMsgs(p => [...p, {
        role:"assistant", content:payload.answer,
        sources:payload.sources, confidence:payload.confidence, mode:payload.mode,
      }]);
    } catch {
      setMsgs(p => [...p, { role:"assistant", content:"Could not get a response. Please try again.", isError:true }]);
    } finally { setSending(false); }
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const upload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !active) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const { data } = await uploadDocument(active._id, fd);
      const payload = data.data ?? data;
      const newDocs = payload.documents ?? (Array.isArray(payload) ? payload : []);
      setDocs(p => [...p, ...newDocs]);
    } catch(e) { console.error(e); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const delDoc = async (id) => {
    try { await deleteDocument(id); setDocs(p => p.filter(d => d._id !== id)); }
    catch(e) { console.error(e); }
  };

  const handleSidebarToggle = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) { setMobOpen(p => !p); }
    else { setCollapsed(p => !p); }
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "?";
  const suggestions = getSuggestions(mode);

  return (
    <div className="db-root">
      {mobOpen && <div className="sb-overlay" onClick={() => setMobOpen(false)} />}

      {/* ── Sidebar — NO chevron arrow ───────── */}
      <aside className={`db-sidebar ${collapsed ? "collapsed" : ""} ${mobOpen ? "mob-open" : ""}`}>
        {/* top: just brand, no arrow button */}
        <div className="sb-top">
          <div className="sb-brand">
            <div className="sb-brand-box">A</div>
            <span className="sb-brand-name">AcadAI</span>
          </div>
        </div>

        <button className="sb-new" onClick={newSession}><IcoPlus /> New Session</button>
        <div className="sb-sec-label">Sessions</div>

        <div className="sb-list">
          {sessions.length === 0
            ? <div className="sb-empty">No sessions yet.<br />Create one to start studying.</div>
            : sessions.map((s, i) => (
              <div key={s._id} className={`sb-item ${active?._id === s._id ? "on" : ""}`}
                style={{ animationDelay:`${i * 0.04}s` }}
                onClick={() => openSession(s)}
              >
                <IcoChat />
                <span className="sb-item-title">{s.title || "Untitled"}</span>
                <span className="sb-item-time">{ago(s.updatedAt)}</span>
                <button className="sb-item-del" onClick={(e) => delSession(s._id, e)}><IcoTrash /></button>
              </div>
            ))
          }
        </div>

        <div className="sb-foot">
          <button className="sb-foot-btn" onClick={() => nav("/profile")}>
            <IcoGear /> Profile & Settings
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────── */}
      <div className="db-main">
        {/* Navbar — no files pill, no top upload button */}
        <Navbar
          mode={mode} onModeChange={setMode}
          sessionTitle={active?.title}
          onSidebarToggle={handleSidebarToggle}
        />

        {/* Chat */}
        <div className="db-chat">
          {!active ? (
            /* ── Welcome / no session selected ── */
            <div className="chat-welcome">
              <div className="welcome-icon-wrap"><IcoBook /></div>
              <h2 className="anim-up">Welcome back, {user?.name?.split(" ")[0] || "Scholar"}</h2>
              <p className="anim-up d1">Create a session, upload your study materials, and chat with AI about them.</p>
              <div className="welcome-btn-wrap">
                <button className="btn-primary" onClick={newSession}><IcoPlus /> New Session</button>
              </div>
              <div className="welcome-starters">
                {suggestions.map(q => (
                  <button key={q} className="starter" onClick={() => { newSession(); setInput(q); }}>{q}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="chat-msgs">
                {msgs.length === 0 && (
                  <div className="chat-empty-state">
                    <p>Ask anything about your documents once you upload them below.</p>
                    <div className="welcome-starters">
                      {suggestions.map(q => (
                        <button key={q} className="starter" onClick={() => setInput(q)}>{q}</button>
                      ))}
                    </div>

                    {/* ── Upload zone — below suggestions ── */}
                    <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                      <div className="upload-zone-icon">
                        <IcoUploadCloud />
                      </div>
                      <div className="upload-zone-text">
                        <span className="upload-zone-label">
                          {uploading ? "Uploading…" : "Upload"}
                        </span>
                        <span className="upload-zone-sub">PDF, PPTX, DOCX, TXT — click or drag to upload</span>
                      </div>
                      {docs.length > 0 && (
                        <span className="upload-zone-count">{docs.length} file{docs.length !== 1 ? "s" : ""} added</span>
                      )}
                    </div>

                    {/* Show uploaded docs */}
                    {docs.length > 0 && (
                      <div className="doc-chips-row">
                        {docs.map(d => (
                          <div key={d._id} className="doc-chip">
                            <span className="doc-chip-badge">{fIcon(d.fileType)}</span>
                            <span className="doc-chip-name">{d.filename}</span>
                            <button className="doc-chip-del" onClick={(e) => { e.stopPropagation(); delDoc(d._id); }}><IcoX /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input ref={fileRef} type="file" multiple hidden
                      accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md" onChange={upload} />
                  </div>
                )}

                {/* Once there are messages, show a compact doc upload bar at top of msgs */}
                {msgs.length > 0 && (
                  <div className="msgs-doc-bar">
                    <button className="msgs-doc-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <IcoUploadCloud />
                      <span>{uploading ? "Uploading…" : "Upload"}</span>
                      {docs.length > 0 && <span className="msgs-doc-count">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>}
                    </button>
                    {docs.map(d => (
                      <div key={d._id} className="doc-chip small">
                        <span className="doc-chip-badge">{fIcon(d.fileType)}</span>
                        <span className="doc-chip-name">{d.filename}</span>
                        <button className="doc-chip-del" onClick={() => delDoc(d._id)}><IcoX /></button>
                      </div>
                    ))}
                    <input ref={fileRef} type="file" multiple hidden
                      accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md" onChange={upload} />
                  </div>
                )}

                {msgs.map((m, i) => (
                  <div key={i} className={`msg-row ${m.role}`} style={{ animationDelay:`${i * 0.02}s` }}>
                    {m.role === "assistant" && <div className="msg-av">AI</div>}
                    <div className={`msg-bub ${m.isError ? "err" : ""}`}>
                      <p>{m.content}</p>
                      {m.sources?.length > 0 && (
                        <div className="msg-sources">
                          <span className="src-lbl">Sources</span>
                          {m.sources.map((s, si) => <span key={si} className="src-chip">{s.filename} · {s.section}</span>)}
                        </div>
                      )}
                      {m.confidence && (
                        <div className="msg-conf">
                          <span className="conf-dot" style={{ background: m.confidence === "high" ? "var(--ok)" : m.confidence === "medium" ? "var(--warn)" : "var(--err)" }} />
                          {m.confidence} confidence · {m.mode}
                        </div>
                      )}
                    </div>
                    {m.role === "user" && <div className="msg-av user">{initials}</div>}
                  </div>
                ))}

                {sending && (
                  <div className="msg-row assistant">
                    <div className="msg-av">AI</div>
                    <div className="msg-bub">
                      <div className="typing-bub"><span/><span/><span/></div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="chat-input-wrap">
                <div className="chat-input-box">
                  <textarea ref={taRef} className="chat-ta"
                    value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                    placeholder={mode === "grounded" ? "Ask about your documents…" : "Ask anything…"}
                    rows={1} disabled={sending}
                  />
                  <div className="input-btns">
                    <button className="send-btn" onClick={send} disabled={!input.trim() || sending}><IcoSend /></button>
                  </div>
                </div>
                <p className="input-hint">
                  {mode === "grounded" ? "Grounded — answers only from your uploaded documents" : "General — extends your notes with broader knowledge"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
