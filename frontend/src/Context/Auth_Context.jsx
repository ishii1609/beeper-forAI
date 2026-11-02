import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await axios.get("/api/auth/me", { timeout: 65000 });
      setUser(res.data.user);
      setBackendUnavailable(false);
    } catch (error) {
      setUser(null);
      const status = error.response?.status;
      setBackendUnavailable(
        !status || status === 502 || status === 503 || status === 504
      );
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const retryConnection = () => {
    setRetrying(true);
    checkSession();
  };

  const login = async (identifier, password) => {
    const res = await axios.post("/api/auth/login", { identifier, password });
    setUser(res.data.user);
    setBackendUnavailable(false);
  };

  const signup = async (name, username, email, password) => {
    const res = await axios.post("/api/auth/register", { name, username, email, password });
    setUser(res.data.user);
    setBackendUnavailable(false);
  };

  const logout = async () => {
    await axios.post("/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {backendUnavailable && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-amber-300 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg"
        >
          <span>
            The server may be waking up. This can take up to a minute. Try again shortly.
          </span>
          <button
            type="button"
            onClick={retryConnection}
            disabled={retrying}
            className="rounded-md bg-slate-950 px-3 py-1.5 text-white disabled:opacity-60"
          >
            {retrying ? "Checking..." : "Retry"}
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
