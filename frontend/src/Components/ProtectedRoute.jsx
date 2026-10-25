import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/Auth_Context";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Refresh par pehle cookie check hoti hai. Tab tak redirect mat karo.
  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading...</p>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}