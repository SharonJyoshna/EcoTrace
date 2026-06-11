/**
 * tests/run-node.js — EcoTrace CI Test Runner (Node.js)
 * Run with: node tests/run-node.js
 */
"use strict";
const fs   = require("fs");
const path = require("path");
const vm   = require("vm");

// Build sandbox with browser polyfills
const _store = {};
const sandbox = Object.assign({}, global, {
  localStorage: {
    getItem:    k => _store.hasOwnProperty(k) ? _store[k] : null,
    setItem:    (k,v) => { _store[k] = String(v); },
    removeItem: k => { delete _store[k]; },
    clear:      () => { Object.keys(_store).forEach(k => delete _store[k]); },
  },
  require, __dirname, __filename,
});
sandbox.window = sandbox;
vm.createContext(sandbox);

function runFile(rel) {
  const code = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(code, sandbox);
}

runFile("src/constants.js");
runFile("src/utils.js");
runFile("tests/utils.test.js");

const { passed, failed, total, results } = sandbox.TestRunner.report();

console.log("\n" + "─".repeat(60));
console.log("  \uD83E\uDDEA  EcoTrace Test Results");
console.log("─".repeat(60));
results.forEach(r => {
  const c = r.passed ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${c}${r.passed?"✓":"✗"}\x1b[0m  [${r.suite}] ${r.name}`);
  if (r.error) console.log(`       \x1b[31m→ ${r.error}\x1b[0m`);
});
console.log("─".repeat(60));
console.log(`  Total: ${total}  ✓ ${passed}  ✗ ${failed}`);
console.log("─".repeat(60) + "\n");

process.exit(failed > 0 ? 1 : 0);