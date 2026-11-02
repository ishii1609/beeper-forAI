import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const RETRY_DELAY_MS = 5000;
const RETRY_WINDOW_MS = 120000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkSession = useCallback(async () => {
    const deadline = Date.now() + RETRY_WINDOW_MS;

    setRetrying(true);
    while (true) {
      try {
        const res = await axios.get("/api/auth/me", { timeout: 15000 });
        setUser(res.data.user);
        setBackendUnavailable(false);
        return;
      } catch (error) {
        setUser(null);
        const status = error.response?.status;
        const canRetry = !status || status === 502 || status === 503 || status === 504;

        if (!canRetry) {
          setBackendUnavailable(false);
          return;
        }

        setBackendUnavailable(true);
        if (Date.now() + RETRY_DELAY_MS >= deadline) return;
        await wait(RETRY_DELAY_MS);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const retryConnection = () => {
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
            {retrying
              ? "The server may be waking up. Retrying automatically for up to two minutes..."
              : "The server is still unavailable. Try again when it has had time to wake up."}
          </span>
          {!retrying && (
            <button
              type="button"
              onClick={retryConnection}
              className="rounded-md bg-slate-950 px-3 py-1.5 text-white"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
