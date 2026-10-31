import { ask } from "../providers/index.js";
import { writeTests,planInterface } from "./testWriter.js";
import { runInSandbox } from "./sandbox.js";

const MAX_ROUNDS = 3;

const GENERATOR_PROMPT = `You write code that satisfies the spec.
Output ONLY the code inside one code block. No explanation.
If the code is JavaScript, end it with: module.exports = { functionName }; using the function name from the spec.
When you are given a list of issues, fix ONLY those issues. Do not change anything else.`;

const REVIEWER_PROMPT = `You review code against this fixed checklist:
1) Does it meet the spec? 2) Does it handle edge cases? 3) Any clear security problem? 4) Is it readable?
You may also be given real test results from running the code. Test failures are reported separately by the system, so do not list them again as issues. Use the results only as evidence for your own review.
Reply with ONLY valid JSON, no other text:
{"issues": [{"id": "short-stable-id", "severity": "high" | "medium" | "low", "text": "what is wrong"}]}
Use an empty issues list if nothing is wrong.
Do not nitpick style. Do not repeat issues that were already fixed.
Keep the same id for the same issue across rounds.`;

function extractCode(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}
 
async function getReview(provider, spec, code, testResult) {
  const testNote =
    testResult.status === "passed" || testResult.status === "failed"
      ? `\n\nTest results (${testResult.status}):\n${testResult.output}`
      : "";
  const input = `Spec:\n${spec}\n\nCode:\n${code}${testNote}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await ask(provider, {
      system: REVIEWER_PROMPT,
      messages: [{ role: "user", content: input }],
    });
    try {
      const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.issues)) {
        return parsed.issues.map((i) => ({
          ...i,
          severity: String(i.severity || "low").toLowerCase(),
        }));
      }
    } catch {
      // neeche retry hoga
    }
  }
  throw new Error("The reviewer did not return valid JSON.");
}

// Test failure ko ek asli issue bana do, taaki loop ke rules usse bhi dekhein
function testIssues(testResult) {
  if (testResult.status !== "failed") return [];

  const failing = testResult.output
    .split("\n")
    .filter((line) => line.startsWith("FAIL: "))
    .map((line) => line.slice(6).split(" - ")[0].trim());

  if (failing.length === 0) {
    // Syntax error, timeout jaisi cheezein: koi FAIL line nahi aati
    return [
      {
        id: "tests-crash",
        severity: "high",
        line: null,
        text: `The code could not run the tests: ${testResult.output.trim().slice(0, 300)}`,
      },
    ];
  }

  return failing.map((name) => ({
    id: `test:${name}`,
    severity: "high",
    line: null,
    text: `Test failed: ${name}`,
  }));
}

export  async function runCodeReviewLoop(userSpec) {
  const generator = process.env.GENERATOR_PROVIDER || "gemini";
  const reviewer = process.env.REVIEWER_PROVIDER || "groq";

  const generate = async (content) =>
    extractCode(
      await ask(generator, {
        system: GENERATOR_PROMPT,
        messages: [{ role: "user", content }],
      })
    );

  // Tests ek baar likhe jaate hain, aur har round mein wahi chalte hain


    // Step 1: spec se interface nikaalo. User ko naam ya language likhna zaroori nahi.
  const plan = await planInterface(userSpec);
  const canTest = Boolean(plan && plan.testable && plan.language === "javascript");

  const spec = canTest
    ? `${userSpec}\n\nImplement this in JavaScript as a function with this signature: ${plan.signature}`
    : userSpec;

  let skipReason = "";
  if (!canTest) {
    skipReason = !plan
      ? "The request could not be analyzed for testing."
      : !plan.testable
        ? "This request is not a function that can be checked with inputs and outputs."
        : "Tests are only supported for JavaScript right now.";
  }

  // Tests ek baar likhe jaate hain, aur har round mein wahi chalte hain
  let tests = null;
  if (canTest) {
    try {
      tests = await writeTests(spec);
    } catch (err) {
      console.error("Test writer failed:", err.message);
    }
  }

  const rounds = [];
  let code = await generate(`Spec:\n${spec}`);
  let status = "unresolved";
  let blocking = [];
  let lowIssues = [];
  let prevIds = null;
  let lastTests = { status: "skipped", output: "" };

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const testResult = tests
      ? await runInSandbox(code, tests)
      : { status: "skipped", output: "" };
    lastTests = testResult;

    const reviewed = await getReview(reviewer, spec, code, testResult);
    const issues = [...testIssues(testResult), ...reviewed];

    blocking = issues.filter((i) => i.severity !== "low");
    lowIssues = issues.filter((i) => i.severity === "low");
    rounds.push({
      round,
      code,
      issues,
      tests: { status: testResult.status, output: testResult.output },
    });

    // Rule 1: koi high/medium nahi bacha (tests bhi pass) -> approved
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

    const testNote =
      testResult.status === "failed" ? `\n\nTest output:\n${testResult.output}` : "";
    code = await generate(
      `Spec:\n${spec}\n\nCurrent code:\n${code}\n\nFix ONLY these issues:\n${JSON.stringify(blocking, null, 2)}${testNote}`
    );
  }

  const result = {
    status,
    generator,
    reviewer,
    roundsUsed: rounds.length,
    finalCode: code,
    testCode: tests,
    testsStatus: lastTests.status, // passed / failed / unavailable / skipped
    remainingIssues: status === "approved" ? [] : blocking,
    lowIssues,
    rounds,
  };

  if (status !== "approved") {
    result.warning =
      "The reviewer or the tests still report unresolved issues. The reviewer is also an LLM, so please verify this code yourself before using it.";
  } else if (lastTests.status === "unavailable") {
    result.warning = "Approved by the reviewer only. The tests could not be run.";
  } else if (lastTests.status === "skipped") {
       result.warning = `Approved by the reviewer only. ${skipReason || "No tests were written."}`;
  }
  return result;
}