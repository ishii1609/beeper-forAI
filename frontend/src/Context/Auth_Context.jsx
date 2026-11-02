import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const BACKEND_WAKE_URL = "https://beeper-forai.onrender.com/api/auth/me";
const WAKE_RETRY_MS = 5000;
const WAKE_TIMEOUT_MS = 120000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function wakeBackend() {
  const deadline = Date.now() + WAKE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(BACKEND_WAKE_URL, {
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status < 500) return;
    } catch {
      // Retry while Render is starting.
    } finally {
      clearTimeout(timeout);
    }

    await wait(WAKE_RETRY_MS);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkSession = useCallback(async () => {
    setRetrying(true);
    setBackendUnavailable(true);

    try {
      // Wake Render without its auth cookie; keep session traffic on Vercel.
      await wakeBackend();
      const res = await axios.get("/api/auth/me", { timeout: 15000 });
      setUser(res.data.user);
      setBackendUnavailable(false);
    } catch (error) {
      setUser(null);
      const status = error.response?.status;
      setBackendUnavailable(!status || status === 502 || status === 503 || status === 504);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const retryConnection = () => {
    setLoading(true);
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
              ? "Waking the server, then reconnecting through the app..."
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
