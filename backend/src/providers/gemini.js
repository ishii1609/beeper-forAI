// Ye file Gemini ke API format ko chhupati hai.
// Bahar se sirf: sendMessage(...) -> text
export async function sendMessage({ apiKey, model, system, messages }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Gemini "assistant" ko "model" bolta hai, isliye role badalna padta hai
  const body = {
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  }; 
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  // await = jawab aane tak ruko (ye async/await hai)
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}