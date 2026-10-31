const STATUS_STYLES = {
  passed: "bg-green-500/15 text-green-300",
  failed: "bg-red-500/15 text-red-300",
  unavailable: "bg-amber-500/15 text-amber-300",
  skipped: "bg-slate-700/60 text-slate-300",
};

const STATUS_LABELS = {
  passed: "Tests passed",
  failed: "Tests failed",
  unavailable: "Tests unavailable",
  skipped: "No tests",
};

export default function TestsPanel({ tests }) {
  if (!tests?.status) return null;

  return (
    <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-300">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            STATUS_STYLES[tests.status] || STATUS_STYLES.skipped
          }`}
        >
          {STATUS_LABELS[tests.status] || tests.status}
        </span>
        {tests.output && <span className="text-xs text-slate-500">Show output</span>}
      </summary>
      {tests.output && (
        <pre className="overflow-x-auto border-t border-slate-800 p-3 text-xs text-slate-300">
          {tests.output}
        </pre>
      )}
    </details>
  );
}