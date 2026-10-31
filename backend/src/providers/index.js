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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sirf temporary errors par retry karo (galat key jaise errors par nahi)
function isTemporary(err) {
  return /\b(429|500|502|503|504)\b|high demand|overloaded|unavailable|rate limit/i.test(err.message);
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 20000;

// 1s, 2s, 4s, 8s ... (cap tak), saath mein thodi randomness
function backoffDelay(attempt) {
  const exp = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exp / 2 + Math.random() * (exp / 2);
}

export async function ask(providerName, { system, messages }) {
  const p = providers[providerName];
  if (!p) throw new Error(`Unknown provider: ${providerName}`);

  for (let attempt = 0; ; attempt++) {
    try {
      return await p.send({ apiKey: p.apiKey(), model: p.model(), system, messages });
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isTemporary(err)) throw err;
      const wait = backoffDelay(attempt);
      console.log(
        `${providerName} is busy, retrying in ${Math.round(wait)}ms (${attempt + 1}/${MAX_RETRIES})...`
      );
      await sleep(wait);
    }
  }
}
export const providerNames = Object.keys(providers);