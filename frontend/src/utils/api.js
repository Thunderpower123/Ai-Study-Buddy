import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/auth`,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

export const registerUser  = (data) => api.post("/register", data).then(r => r.data);
export const loginUser     = (data) => api.post("/login", data).then(r => r.data);
export const logoutUser    = ()     => api.post("/logout").then(r => r.data);
export const getCurrentUser= ()     => api.get("/me").then(r => r.data);
export const googleLogin   = (idToken) => api.post("/google", { idToken }).then(r => r.data);
