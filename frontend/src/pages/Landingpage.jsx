import { Link } from "react-router-dom";
import { useAuth } from "../Context/Auth_Context";

const FEATURES = [
  {
    to: "/chat",
    title: "Unified Chat",
    text: "Chat with any connected model, switch models between messages, and keep your history.",
  },
  {
    to: "/compare",
    title: "Compare Models",
    text: "Send one prompt to every model and read the answers side by side.",
  },
  {
    to: "/review",
    title: "Code Reviewer",
    text: "A generator model and a reviewer model refine code in up to 3 rounds, with clear stopping rules.",
  },
];

export default function LandingPage() {
  const { user, loading, logout } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-white">AI Hub</span>
        {!loading && user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user.name}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <div className="py-12 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          One place for all your AI models
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Compare answers from different models, or let one model write code and
          another review it.
        </p>

        {!loading && !user && (
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.to}
            to={f.to}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500/60"
          >
            <h2 className="text-lg font-semibold text-white">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{f.text}</p>
            <span className="mt-4 inline-block text-sm text-indigo-400">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}