import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  async function handleCompare() {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await axios.post("/api/compare", { prompt });
      setResults(res.data.results);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Compare models</h1>
      <p className="mt-1 text-sm text-slate-400">
        Send one prompt to every available model and compare the answers.
      </p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <textarea
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder="Ask anything..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          onClick={handleCompare}
          disabled={loading || !prompt.trim()}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Asking all models..." : "Compare"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {results && (
       <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <div key={r.provider} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold capitalize text-slate-200">{r.provider}</h3>
                <span className="text-xs text-slate-500">{(r.ms / 1000).toFixed(1)}s</span>
              </div>
              {r.ok ? (
                <div className="prose prose-sm prose-invert max-w-none">
                     <ReactMarkdown>{r.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-red-300">{r.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}