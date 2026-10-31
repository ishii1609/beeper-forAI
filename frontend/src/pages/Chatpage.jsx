import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";

// Naya provider jodo toh yahan bhi ek line add karna
const PROVIDERS = [
  { value: "gemini", label: "Gemini" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
];

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const skipNextLoad = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loadChats = () =>
    axios
      .get("/api/conversations")
      .then((res) => setChats(res.data))
      .catch(() => {});

  useEffect(() => {
    loadChats();
  }, []);

  // Chat badalne par uske messages laao
  useEffect(() => {
    setError("");
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    if (!id) {
      setMessages([]);
      return;
    }
    axios
      .get(`/api/conversations/${id}`)
      .then((res) => setMessages(res.data.messages))
      .catch((err) => setError(err.response?.data?.error || "Could not load this chat."));
  }, [id]);

  // Naya message aane par neeche scroll karo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setInput("");

    // Message turant dikhao, server ka jawab baad mein aayega
    const temp = { _id: `tmp-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, temp]);

    try {
      let chatId = id;
      let created = false;
      if (!chatId) {
        const res = await axios.post("/api/conversations");
        chatId = res.data._id;
        created = true;
      }

      const res = await axios.post(`/api/conversations/${chatId}/messages`, {
        content: text,
        provider,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== temp._id),
        res.data.userMessage,
        res.data.assistantMessage,
      ]);

      if (created) {
        skipNextLoad.current = true; // messages abhi state mein hain, dobara mat laao
        navigate(`/chat/${chatId}`, { replace: true });
      }
      loadChats();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      setInput(text); // user ka likha hua wapas daal do
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const providerLabel = (value) => PROVIDERS.find((p) => p.value === value)?.label || value;
//sidebar
  const sidebarContent = (
  <>
    <Link
      to="/"
      className="mb-3 text-sm text-indigo-400 hover:text-indigo-300"
    >
      Back to home
    </Link>
    <button
      onClick={() => {
        navigate("/chat");
        setMenuOpen(false);
      }}
      className="mb-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
    >
      New chat
    </button>
    <div className="flex-1 space-y-1 overflow-y-auto">
      {chats.length === 0 && <p className="text-xs text-slate-500">No chats yet.</p>}
      {chats.map((c) => (
        <Link
          key={c._id}
          to={`/chat/${c._id}`}
          onClick={() => setMenuOpen(false)}
          className={`block truncate rounded-lg px-3 py-2 text-sm ${
            c._id === id
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
          }`}
        >
          {c.title}
        </Link>
      ))}
    </div>
  </>
);


  return (
<div className="flex h-[calc(100dvh-4rem)] gap-4">      {/* Sidebar */}
     {/* Badi screen par hamesha dikhta hai */}
<aside className="hidden w-60 shrink-0 flex-col rounded-xl border border-slate-800 bg-slate-900 p-3 md:flex">
  {sidebarContent}
</aside>

{/* Mobile par button dabane par khulta hai */}
{menuOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => setMenuOpen(false)}
    />
    <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-slate-900 p-3">
      {sidebarContent}
    </aside>
  </div>
)}
      {/* Chat area */}
      <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-800 bg-slate-900">
       <div className="flex items-center border-b border-slate-800 p-3 md:hidden">
  <button
    onClick={() => setMenuOpen(true)}
    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
  >
    Chats
  </button>
</div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !sending && (
            <p className="mt-10 text-center text-sm text-slate-500">
              Start a conversation. You can pick a different model for every message.
            </p>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m._id} className="flex justify-end">
                <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-indigo-600 px-4 py-2 text-sm text-white">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={m._id} className="max-w-[90%]">
                <p className="mb-1 text-xs text-slate-500">{providerLabel(m.provider)}</p>
                <div className="prose prose-sm prose-invert max-w-none rounded-2xl bg-slate-800 px-4 py-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            )
          )}

          {sending && (
            <p className="animate-pulse text-sm text-slate-500">
              {providerLabel(provider)} is thinking...
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="border-t border-slate-800 p-3">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message. Enter to send, Shift+Enter for a new line."
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}