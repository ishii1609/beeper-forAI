import { ask } from "../providers/index.js";

const MAX_ROUNDS = 3;

const GENERATOR_PROMPT = `You write code that satisfies the spec.
Output ONLY the code inside one code block. No explanation.
When you are given a list of issues, fix ONLY those issues. Do not change anything else.`;

const REVIEWER_PROMPT = `You review code against this fixed checklist:
1) Does it meet the spec? 2) Does it handle edge cases? 3) Any clear security problem? 4) Is it readable?
Reply with ONLY valid JSON, no other text:
{"issues": [{"id": "short-stable-id", "severity": "high" | "medium" | "low", "text": "what is wrong"}]}
Use an empty issues list if nothing is wrong.
Do not nitpick style. Do not repeat issues that were already fixed.
Keep the same id for the same issue across rounds.`;


function extractCode(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

async function getReview(provider,spec, code) {
  const input = `Spec:\n${spec}\n\nCode:\n${code}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
     const raw = await ask(provider, {
      system: REVIEWER_PROMPT,
      messages: [{ role: "user", content: input }],
    });
    try {
      const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.issues)) return parsed.issues;
    } catch {
      // neeche retry hoga
    }
  }
  throw new Error("The reviewer did not return valid JSON.");
}

export async function runCodeReviewLoop(spec) {
   const generator = process.env.GENERATOR_PROVIDER || "gemini";
  const reviewer = process.env.REVIEWER_PROVIDER || "groq";

const generate = async (content) =>
    extractCode(
      await ask(generator, {
        system: GENERATOR_PROMPT,
        messages: [{ role: "user", content }],
      })
    );

  const rounds = [];
  let code = await generate(`Spec:\n${spec}`);
  let status = "unresolved";
  let blocking = [];
  let lowIssues = [];
  let prevIds = null;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const issues = await getReview(reviewer,spec, code);
    blocking = issues.filter((i) => i.severity !== "low");
    lowIssues = issues.filter((i) => i.severity === "low");
    rounds.push({ round, code, issues });

    // Rule 1: koi high/medium nahi bacha -> approved
    if (blocking.length === 0) {
      status = "approved";
      break;
    }

    // Rule 2: wahi issue ids repeat -> stuck
    const ids = blocking.map((i) => i.id).sort().join(",");
    if (ids === prevIds) {
      status = "stuck";
      break;
    }
    prevIds = ids;

    // Rule 3: max rounds
    if (round === MAX_ROUNDS) {
      status = "unresolved";
      break;
    }

    const fixInput = `Spec:\n${spec}\n\nCurrent code:\n${code}\n\nFix ONLY these issues:\n${JSON.stringify(blocking, null, 2)}`;
code = await generate(fixInput);

  }
  const result = {
    status,
    generator,
    reviewer,
    roundsUsed: rounds.length,
    finalCode: code,
    remainingIssues: status === "approved" ? [] : blocking,
    lowIssues,
    rounds,
  };
  
  if (status !== "approved") {
    result.warning =
      "The reviewer still reports unresolved issues. The reviewer is also an LLM, so please verify this code yourself before using it.";
  }
  return result;
 }