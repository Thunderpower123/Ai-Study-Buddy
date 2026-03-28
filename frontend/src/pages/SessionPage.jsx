import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSession, sendMessage, getChatHistory,
  listDocuments, uploadDocument, deleteDocument,
} from "../utils/api.js";
import Navbar from "../components/dashboard/Navbar.jsx";
import "../styles/SessionPage.css";

const SessionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("grounded");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAll = async () => {
    setLoadingSession(true);
    try {
      const [sessionRes, historyRes, docsRes] = await Promise.all([
        getSession(id),
        getChatHistory(id),
        listDocuments(id),
      ]);
      setSession(sessionRes.data);
      setMessages(historyRes.data);
      setDocuments(docsRes.data);
      setMode(sessionRes.data.lastMode || "grounded");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data } = await sendMessage(id, { content: input, mode });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          confidence: data.confidence,
          mode: data.mode,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", isError: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const { data } = await uploadDocument(id, formData);
      setDocuments((prev) => [...prev, ...data.documents]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  const getConfidenceBadge = (confidence) => {
    if (!confidence) return null;
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f87171";
    return (
      <span className="confidence-badge" style={{ color, borderColor: color + "44", background: color + "11" }}>
        {pct}% confident
      </span>
    );
  };

  if (loadingSession) {
    return (
      <div className="session-root">
        <Navbar mode={mode} onModeChange={setMode} />
        <div className="session-loading">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="session-root">
      <Navbar mode={mode} onModeChange={setMode} />

      <div className="session-layout">
        {/* LEFT PANEL — Documents */}
        <aside className="session-sidebar">
          <div className="sidebar-header">
            <h3>Study Materials</h3>
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "+ Add Files"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
          </div>

          {documents.length === 0 ? (
            <div className="sidebar-empty">
              <p>No documents yet</p>
              <span>Upload PDFs, PPTX, DOCX, or TXT files</span>
            </div>
          ) : (
            <div className="doc-list">
              {documents.map((doc) => (
                <div key={doc._id} className="doc-item">
                  <div className="doc-icon">{getFileIcon(doc.fileType)}</div>
                  <div className="doc-info">
                    <p className="doc-name">{doc.filename}</p>
                    <span className="doc-chunks">{doc.totalChunks} chunks</span>
                  </div>
                  <button
                    className="doc-delete"
                    onClick={() => handleDeleteDoc(doc._id)}
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="sidebar-mode-info">
            {mode === "grounded" ? (
              <p>⚓ <strong>Grounded mode</strong> — answers only from your uploaded documents</p>
            ) : (
              <p>🌐 <strong>Extended mode</strong> — uses your docs + expands with general knowledge</p>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL — Chat */}
        <main className="session-chat">
          {/* Session title */}
          <div className="session-title-bar">
            <button className="back-btn" onClick={() => navigate("/")}>← Sessions</button>
            <h2>{session?.title || "Untitled Session"}</h2>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>Upload documents on the left, then ask anything about them.</p>
                <div className="chat-starters">
                  {["Summarize my notes", "What are the key concepts?", "Quiz me on this topic"].map((q) => (
                    <button key={q} onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  <div className={`msg-bubble ${msg.isError ? "error" : ""}`}>
                    <p>{msg.content}</p>

                    {/* Sources */}
                    {msg.sources?.length > 0 && (
                      <div className="msg-sources">
                        <span className="sources-label">Sources:</span>
                        {msg.sources.map((s, si) => (
                          <span key={si} className="source-chip">{s.filename} p.{s.page}</span>
                        ))}
                      </div>
                    )}

                    {/* Confidence badge */}
                    {msg.confidence && (
                      <div className="msg-meta">
                        {getConfidenceBadge(msg.confidence)}
                        {msg.mode && (
                          <span className="msg-mode-tag">{msg.mode}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {sending && (
              <div className="chat-msg assistant">
                <div className="msg-bubble typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input box */}
          <div className="chat-input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about your ${mode === "grounded" ? "uploaded documents" : "notes (with extended knowledge)"}...`}
              rows={1}
              disabled={sending}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? "..." : "↑"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

const getFileIcon = (type) => {
  if (!type) return "📄";
  if (type.includes("pdf")) return "📕";
  if (type.includes("ppt")) return "📊";
  if (type.includes("word") || type.includes("doc")) return "📘";
  if (type.includes("text") || type.includes("txt") || type.includes("markdown")) return "📝";
  return "📄";
};

export default SessionPage;