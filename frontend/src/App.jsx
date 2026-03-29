import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudentDetails from "./pages/StudentDetails";
import Session from "./pages/SessionPage";   // ✅ ADD
import Profile from "./pages/Profile";   // ✅ ADD

import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* default */}
      <Route path="/" element={<Navigate to="/auth" replace />} />

      {/* public */}
      <Route path="/auth" element={<Auth />} />

      {/* protected */}
      <Route
        path="/student-details"
        element={
          <ProtectedRoute>
            <StudentDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* NEW */}
      <Route
        path="/session/:id"
        element={
          <ProtectedRoute>
            <Session />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default App;