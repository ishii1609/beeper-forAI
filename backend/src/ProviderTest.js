import "dotenv/config";
import { ask } from "./providers/index.js";

for (const name of ["gemini", "groq", "openrouter"]) {
  try {
    const text = await ask(name, {
      system: "You are a concise assistant.",
      messages: [{ role: "user", content: "Say hello in one short sentence." }],
    });
    console.log(`${name}: ${text}`);
  } catch (err) {
    console.error(`${name} failed: ${err.message}`);
  }
}

