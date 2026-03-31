// frontend/src/pages/SessionPage.jsx
// Route: /session/:id
// Split layout: left = documents panel, right = chat window

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import Navbar from "../components/dashboard/Navbar";
import {
  getSession, getChatHistory, listDocuments,
  sendMessage, uploadDocument, deleteDocument,
} from "../utils/api";
import "../styles/theme.css";
import "../styles/SessionPage.css";

/* ── tiny icons ──────────────────────────────── */
const Ico = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const SendIco   = () => <Ico s={15} d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill="none"/></>} />;
const UpIco     = () => <Ico s={14} d={<><polyline points="16,16 12,12 8,16" fill="none"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" fill="none"/></>} />;
const XIcon     = () => <Ico s={12} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const BackIco   = () => <Ico s={14} d="M15 18l-6-6 6-6" />;

const fBadge = (t = "") => {
  if (t.includes("pdf")) return "PDF";
  if (t.includes("ppt")) return "PPT";
  if (t.includes("doc")) return "DOC";
  return "TXT";
};

export default function SessionPage() {
  const { id } = useParams();
  const nav    = useNavigate();
  const { user } = useAuth();

  const [session,   setSession]   = useState(null);
  const [msgs,      setMsgs]      = useState([]);
  const [docs,      setDocs]      = useState([]);
  const [input,     setInput]     = useState("");
  const [mode,      setMode]      = useState("grounded");
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [mobDocs,   setMobDocs]   = useState(false);

  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const taRef     = useRef(null);

  useEffect(() => { init(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, sending]);
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
  }, [input]);

  const init = async () => {
    setLoading(true);
    try {
      const [sRes, hRes, dRes] = await Promise.all([
        getSession(id), getChatHistory(id), listDocuments(id),
      ]);
      // Backend wraps all responses in ApiResponse → payload is in .data.data
      const session = sRes.data?.data ?? sRes.data;
      const msgs    = hRes.data?.data ?? hRes.data;
      const docs    = dRes.data?.data ?? dRes.data;
      setSession(session);
      setMsgs(Array.isArray(msgs) ? msgs : []);
      setDocs(Array.isArray(docs) ? docs : []);
      setMode(session?.lastMode || "grounded");
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setMsgs(p => [...p, { role: "user", content }]);
    setSending(true);
    try {
      const { data } = await sendMessage(id, { content, mode });
      // Backend wraps in ApiResponse → payload is in data.data
      const payload = data?.data ?? data;
      setMsgs(p => [...p, {
        role: "assistant",
        content: payload.answer,
        sources: payload.sources,
        confidence: payload.confidence,
        mode: payload.mode,
      }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", content: "⚠️ Couldn't get a response. Try again.", isError: true }]);
    } finally { setSending(false); }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const { data } = await uploadDocument(id, fd);
      // Backend wraps in ApiResponse → payload is in data.data → { documents, errors }
      const payload = data?.data ?? data;
      const newDocs = payload.documents ?? (Array.isArray(payload) ? payload : []);
      setDocs(p => [...p, ...newDocs]);
    } catch (e) { console.error(e); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const delDoc = async (docId) => {
    try { await deleteDocument(docId); setDocs(p => p.filter(d => d._id !== docId)); }
    catch (e) { console.error(e); }
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "2.5px solid var(--bd)", borderTopColor: "var(--ac)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div className="sp-root">
      <Navbar
        mode={mode}
        onModeChange={setMode}
        docCount={docs.length}
        onFilesClick={() => setMobDocs(p => !p)}
        filesActive={mobDocs}
        sessionTitle={session?.title}
        onSidebarToggle={() => nav("/dashboard")}
      />

      <div className="sp-body">
        {/* ── Left: Documents ── */}
        <aside className={`sp-docs ${mobDocs ? "mobile-open" : ""}`}>
          <div className="sp-docs-head">
            <h3>Study Materials</h3>
            <button
              className="sp-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <UpIco /> {uploading ? "Uploading…" : "Upload Files"}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
              onChange={upload}
            />
          </div>

          <div className="sp-docs-list">
            {docs.length === 0 ? (
              <div className="sp-docs-empty">
                <div className="sp-docs-empty-icon">📄</div>
                <p>No files yet</p>
                <span>Upload PDFs, PPTX, DOCX or TXT to start chatting with your notes</span>
              </div>
            ) : (
              docs.map((d, i) => (
                <div key={d._id} className="sp-doc-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <span className="sp-doc-badge">{fBadge(d.fileType)}</span>
                  <div className="sp-doc-info">
                    <p className="sp-doc-name">{d.filename}</p>
                    <span className="sp-doc-meta">{d.totalChunks} chunks indexed</span>
                  </div>
                  <button className="sp-doc-del" onClick={() => delDoc(d._id)}>
                    <XIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Right: Chat ── */}
        <div className="sp-chat">
          {/* Chat header */}
          <div className="sp-chat-head">
            <button className="sp-back-btn" onClick={() => nav("/dashboard")}>
              <BackIco /> Sessions
            </button>
            <span className="sp-chat-title">{session?.title || "Chat"}</span>
            <span className={`sp-mode-badge ${mode}`}>
              {mode === "grounded" ? "⚓ Grounded" : "🌐 General"}
            </span>
          </div>

          {/* Messages */}
          <div className="sp-msgs">
            {msgs.length === 0 && (
              <div className="sp-msgs-empty">
                <div className="sp-msgs-empty-icon">✨</div>
                <h3>Ready to study</h3>
                <p>Upload your notes on the left, then ask anything about them.</p>
                <div className="sp-starters">
                  {["Summarise these notes", "What are the key concepts?", "Quiz me", "Explain this topic simply"].map(q => (
                    <button key={q} className="sp-starter" onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`sp-msg ${m.role}`} style={{ animationDelay: `${i * 0.02}s` }}>
                {m.role === "assistant" && <div className="sp-avatar">AI</div>}
                <div className={`sp-bubble ${m.isError ? "err" : ""}`}>
                  <p>{m.content}</p>
                  {m.sources?.length > 0 && (
                    <div className="sp-sources">
                      <span className="sp-src-label">Sources</span>
                      {m.sources.map((s, si) => (
                        <span key={si} className="sp-src">{s.filename} · p.{s.page}</span>
                      ))}
                    </div>
                  )}
                  {m.confidence && (
                    <div className="sp-conf">
                      <span className="sp-conf-dot" style={{
                        background: m.confidence >= 0.8 ? "var(--ok)" : m.confidence >= 0.5 ? "var(--warn)" : "var(--err)"
                      }} />
                      {Math.round(m.confidence * 100)}% confident · {m.mode}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="sp-avatar user">{initials}</div>
                )}
              </div>
            ))}

            {sending && (
              <div className="sp-msg assistant">
                <div className="sp-avatar">AI</div>
                <div className="sp-bubble">
                  <div className="sp-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="sp-input-area">
            <div className="sp-input-box">
              <textarea
                ref={taRef}
                className="sp-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={
                  mode === "grounded"
                    ? "Ask about your uploaded documents…"
                    : "Ask anything — I'll combine your notes with general knowledge…"
                }
                rows={1}
                disabled={sending}
              />
              <div className="sp-input-btns">
                <button className="sp-attach-btn" onClick={() => fileRef.current?.click()} title="Attach files">
                  <UpIco />
                </button>
                <button
                  className="sp-send-btn"
                  onClick={send}
                  disabled={!input.trim() || sending}
                >
                  <SendIco />
                </button>
              </div>
            </div>
            <p className="sp-input-hint">
              {mode === "grounded"
                ? "⚓ Grounded — answers strictly from your uploaded documents"
                : "🌐 General — extends your notes with broader knowledge"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}