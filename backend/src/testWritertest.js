import "dotenv/config";
import { writeTests } from "./services/testWriter.js";
import { runInSandbox } from "./services/sandbox.js";

const spec =
  "Write a JavaScript function removeDuplicates(arr) that removes duplicates and keeps the original order.";

const tests = await writeTests(spec);
if (!tests) {
  console.log("No tests were produced for this spec.");
  process.exit(0);
}
console.log("TESTS:\n" + tests + "\n");

const solutions = {
  "correct code (should PASS)": `function removeDuplicates(arr) { return [...new Set(arr)]; }
module.exports = { removeDuplicates };`,
  "does not remove duplicates (should FAIL)": `function removeDuplicates(arr) { return arr; }
module.exports = { removeDuplicates };`,
  "loses the original order (should FAIL)": `function removeDuplicates(arr) { return [...new Set(arr)].sort(); }
module.exports = { removeDuplicates };`,
};

for (const [name, code] of Object.entries(solutions)) {
  console.log(`--- ${name} ---`);
  console.log(await runInSandbox(code, tests), "\n");
}