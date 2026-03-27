import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/auth`,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// Return backend's error data instead of throwing, so callers can read res.message
const safe = (promise) =>
    promise.then(r => r.data).catch(err => {
        if (err.response?.data) return err.response.data;  // backend error JSON
        throw err;                                          // network / unknown error
    });

export const registerUser  = (data)    => safe(api.post("/register", data));
export const loginUser     = (data)    => safe(api.post("/login", data));
export const logoutUser    = ()        => safe(api.post("/logout"));
export const getCurrentUser= ()        => safe(api.get("/me"));
export const googleLogin   = (idToken) => safe(api.post("/google", { idToken }));
