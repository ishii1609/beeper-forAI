import { sendMessage as geminiSend } from "./gemini.js";
import { sendMessage as groqSend } from "./groq.js";
import { sendMessage as openrouterSend } from "./openrouter.js";
const providers = {
  gemini: {
    send: geminiSend,
    apiKey: () => process.env.GEMINI_API_KEY,
    model: () => process.env.GEMINI_MODEL,
  },
  groq: {
    send: groqSend,
    apiKey: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL,
  },
    openrouter: {
    send: openrouterSend,
    apiKey: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL,
  },
};

export function ask(providerName, { system, messages }) {
  const p = providers[providerName];
  if (!p) throw new Error(`Unknown provider: ${providerName}`);
  return p.send({ apiKey: p.apiKey(), model: p.model(), system, messages });
}
export const providerNames = Object.keys(providers);