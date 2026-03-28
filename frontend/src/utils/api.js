// frontend/src/utils/api.js
// Replace your EXISTING api.js with this file

import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,         // sends JWT httpOnly cookie automatically
});

// ── Auth ─────────────────────────────────────────────────────────────────
export const registerUser    = (data) => API.post("/users/register", data);
export const loginUser       = (data) => API.post("/users/login", data);
export const googleLogin     = (data) => API.post("/users/google", data);
export const logoutUser      = ()     => API.post("/users/logout");
export const getCurrentUser  = ()     => API.get("/users/me");

// ── Student Details (first-time onboarding) ───────────────────────────────
export const saveStudentDetails = (data) => API.post("/student-details", data);
export const getStudentDetails  = ()     => API.get("/student-details");

// ── Sessions ──────────────────────────────────────────────────────────────
export const createSession   = ()    => API.post("/sessions");
export const getAllSessions   = ()    => API.get("/sessions");
export const getSession      = (id)  => API.get(`/sessions/${id}`);
export const deleteSession   = (id)  => API.delete(`/sessions/${id}`);

// ── Documents ─────────────────────────────────────────────────────────────
export const uploadDocument  = (sessionId, formData) =>
  API.post(`/sessions/${sessionId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const listDocuments   = (sessionId) => API.get(`/sessions/${sessionId}/documents`);
export const deleteDocument  = (docId)     => API.delete(`/documents/${docId}`);

// ── Chat ──────────────────────────────────────────────────────────────────
export const sendMessage     = (sessionId, data) => API.post(`/chat/${sessionId}`, data);
export const getChatHistory  = (sessionId)       => API.get(`/chat/${sessionId}`);

// ── Profile ───────────────────────────────────────────────────────────────
export const getProfile      = ()     => API.get("/profile");
export const updateProfile   = (data) => API.put("/profile", data);
export const changePassword  = (data) => API.put("/users/change-password", data);

export default API;