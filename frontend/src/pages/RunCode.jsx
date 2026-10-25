import { useState, useEffect } from "react";
const API_URL = "http://localhost:5000/api/code-review-loop";

const STATUS_INFO = {
  approved: {
    label: "Approved",
    description: "No blocking issues remain.",
    style: "border-green-500/30 bg-green-500/10 text-green-300",
  },
  unresolved: {
    label: "Unresolved",
    description: "Blocking issues remain after the maximum number of rounds.",
    style: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  stuck: {
    label: "Stuck",
    description: "The same issues repeated across rounds.",
    style: "border-red-500/30 bg-red-500/10 text-red-300",
  },
};

const SEVERITY_STYLES = {
  high: "bg-red-500/15 text-red-300",
  medium: "bg-amber-500/15 text-amber-300",
  low: "bg-slate-700/60 text-slate-300",
};

const CHARS_PER_TICK = 3;
const TICK_MS = 10;

function CodeBlock({ code }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
      <code>{code}</code>
    </pre>
  );
}

// Code ko dheere dheere type karta hai. delay = kitni der baad shuru kare.
function TypingCode({ code, delay = 0 }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setShown((n) => {
          if (n >= code.length) {
            clearInterval(interval);
            return n;
          }
          return n + CHARS_PER_TICK;
        });
      }, TICK_MS);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [code, delay]);

  const typing = shown < code.length;

  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
      <code>{code.slice(0, shown)}</code>
      {typing && <span className="animate-pulse text-indigo-400">▍</span>}
    </pre>
  );
}

export default function RunCode() {
  const [spec, setSpec] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleRun() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Har round tabhi type hona shuru kare jab pichhla round khatam ho jaye
  function startDelays(rounds) {
    const delays = [];
    let total = 0;
    for (const r of rounds) {
      delays.push(total);
      total += Math.ceil(r.code.length / CHARS_PER_TICK) * TICK_MS + 300;
    }
    return delays;
  }

  const statusInfo = result ? STATUS_INFO[result.status] : null;
  const delays = result ? startDelays(result.rounds) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-white">AI Hub</h1>
        <p className="mt-1 text-sm text-slate-400">
          A code generator and a code reviewer work in a loop of up to 3 rounds
          to produce and refine code from your specification.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <label htmlFor="spec" className="text-sm font-medium text-slate-300">
            Specification
          </label>
          <textarea
            id="spec"
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="e.g. Write a JavaScript function debounce(fn, delay) that supports cancel()."
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
          />
          <button
            onClick={handleRun}
            disabled={loading || !spec.trim()}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Running (this can take 10 to 30 seconds)" : "Run"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-lg border p-3 text-sm ${
                statusInfo ? statusInfo.style : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              <span className="font-semibold">
                {statusInfo ? statusInfo.label : result.status}
              </span>
              {" · "}
              {result.roundsUsed} {result.roundsUsed === 1 ? "round" : "rounds"}
              {statusInfo && (
                <span className="mt-1 block opacity-80">{statusInfo.description}</span>
              )}
            </div>

            {result.warning && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                {result.warning}
              </p>
            )}

            {result.rounds.map((r, idx) => (
              <div
                key={r.round}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <h3 className="mb-2 font-semibold text-slate-200">
                  Round {r.round}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {r.issues.length === 0
                      ? "No issues"
                      : `${r.issues.length} ${r.issues.length === 1 ? "issue" : "issues"}`}
                  </span>
                </h3>

                <TypingCode code={r.code} delay={delays[idx]} />

                {r.issues.length === 0 ? (
                  <p className="mt-3 text-sm text-green-400">No issues found.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {r.issues.map((i, k) => (
                      <li key={`${i.id}-${k}`} className="flex items-start gap-2 text-sm">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                            SEVERITY_STYLES[i.severity] || SEVERITY_STYLES.low
                          }`}
                        >
                          {i.severity}
                        </span>
                        {i.line && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            Line {i.line}
                          </span>
                        )}
                        <span className="text-slate-300">{i.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div>
              <h3 className="mb-2 font-semibold text-slate-200">Final code</h3>
              <CodeBlock code={result.finalCode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}