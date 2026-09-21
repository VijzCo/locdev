// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { can } from "../lib/roles.js";
import Loader from "./Loader.jsx";

export default function ProtectedRoute({ children, capability }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader full label="Authenticating…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (capability && !can(user, capability)) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-2xl font-bold text-bad">Access denied</p>
          <p className="mt-2 text-slate-400">
            Your role doesn’t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
