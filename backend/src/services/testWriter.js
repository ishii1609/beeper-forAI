import { ask } from "../providers/index.js";
//llm that could read the spec
const PLAN_PROMPT = `You read a user's request and decide how it can be tested.
Reply with ONLY valid JSON, no other text:
{"testable": true | false, "language": "javascript" | "python" | "other", "functionName": "camelCaseName", "signature": "functionName(arg1, arg2)"}
Rules:
- testable is true only if the request is for a pure function or small algorithm that can be checked with inputs and outputs. It is false for user interfaces, web pages, servers, databases, file or network access.
- If the user did not name a language, use "javascript".
- If the user did not name a function, choose a clear camelCase name.
- signature must list the arguments the function takes.`;

// Returns { testable, language, functionName, signature } or null if it could not be worked out
export async function planInterface(spec) {
  const provider = process.env.TEST_WRITER_PROVIDER || "groq";
  try {
    const raw = await ask(provider, {
      system: PLAN_PROMPT,
      messages: [{ role: "user", content: `Request:\n${spec}` }],
    });
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (typeof parsed.testable !== "boolean") return null;

    if (parsed.testable) {
      const validName = /^[A-Za-z_$][\w$]*$/.test(String(parsed.functionName || ""));
      if (!validName || typeof parsed.signature !== "string") return null;
    }
    return {
      testable: parsed.testable,
      language: String(parsed.language || "").toLowerCase(),
      functionName: parsed.functionName,
      signature: parsed.signature,
    };
  } catch (err) {
    console.error("Interface step failed:", err.message);
    return null;
  }
}
const TEST_WRITER_PROMPT = `You write tests for a JavaScript function based ONLY on a specification. You never see the implementation.
Rules:
- Use only Node's built-in "assert" module. No other packages.
- Load the code with: const { fnName } = require("./solution.js"); (replace fnName with the function named in the spec).
- Write 5 to 8 small, independent test cases: normal input, edge cases (empty input, boundaries), and invalid input only if the spec mentions it.
- Test only behavior the spec states. Do not invent requirements.
- Run each test inside its own try/catch. Print "PASS: <name>" or "FAIL: <name> - <reason>" for each one.
- At the end, if any test failed call process.exit(1), otherwise print "all tests passed".
- Output ONLY the test code in one code block. No explanation.
- If the spec is not about JavaScript, or does not name the function to test, output exactly: NO_TESTS
- If the spec mentions order, include at least one test where the correct output order is NOT sorted (for example a descending or shuffled input).
- If the spec does not clearly say how a case should behave (for example how different types are compared), do not write a test for that case.`;

function extractCode(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

// Returns the test code as a string, or null if tests could not be written
export async function writeTests(spec) {
  const provider = process.env.TEST_WRITER_PROVIDER || "groq";
  const raw = await ask(provider, {
    system: TEST_WRITER_PROMPT,
    messages: [{ role: "user", content: `Spec:\n${spec}` }],
  });

  if (raw.trim() === "NO_TESTS") return null;

  const tests = extractCode(raw);
  return tests.includes("require(") ? tests : null; // jaanch: kam se kam solution load karta ho
}