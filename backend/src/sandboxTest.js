import "dotenv/config";
import { runInSandbox } from "./services/sandbox.js";

const tests = `const assert = require("assert");
const { add } = require("./solution.js");
assert.strictEqual(add(2, 3), 5);
console.log("all tests passed");`;

const cases = {
  "correct code": `function add(a, b) { return a + b; }
module.exports = { add };`,
  "wrong code": `function add(a, b) { return a - b; }
module.exports = { add };`,
  "syntax error": `function add(a, b) { return a +; }
module.exports = { add };`,
  "infinite loop (takes about 30 seconds)": `while (true) {}
module.exports = {};`,
};

for (const [name, code] of Object.entries(cases)) {
  console.log(`\n--- ${name} ---`);
  console.log(await runInSandbox(code, tests));
}