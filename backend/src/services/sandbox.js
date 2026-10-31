import { Sandbox } from "e2b";

const SANDBOX_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 1500;

function trim(text = "") {
  return text.length > MAX_OUTPUT_CHARS
    ? text.slice(0, MAX_OUTPUT_CHARS) + "\n...(truncated)"
    : text;
}

// Returns { status: "passed" | "failed" | "unavailable", output }
export async function runInSandbox(code, tests) {
  if (!process.env.E2B_API_KEY) {
    return { status: "unavailable", output: "The sandbox is not configured." };
  }

  let sandbox;
  try {
    sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
    await sandbox.files.write("/home/user/solution.js", code);
    await sandbox.files.write("/home/user/test.js", tests);

const result = await sandbox.commands.run("timeout 10 node /home/user/test.js");    return { status: "passed", output: trim(result.stdout) };
  } catch (err) {
    // Test ya code fail hua: exit code ke saath result aata hai
   if (err?.result && typeof err.result.exitCode === "number") {
  if (err.result.exitCode === 124) {
    return {
      status: "failed",
      output: "Timed out: the code ran for more than 10 seconds. It may contain an infinite loop.",
    };
  }
  const combined = [err.result.stdout, err.result.stderr].filter(Boolean).join("\n");
return { status: "failed", output: trim(combined) };
}
    // Sandbox hi nahi chala
    console.error("Sandbox error:", err.message);
    return { status: "unavailable", output: "The sandbox could not run the tests." };
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {
        // timeout ke baad sandbox pehle hi band ho chuka ho sakta hai
      }
    }
  }
}
