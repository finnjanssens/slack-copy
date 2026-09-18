#!/usr/bin/env node
// evals/check.js — runs every row in cases.json against the converter.
// Data-driven so a new behaviour is one new row, not new code.
import { readFileSync } from "node:fs";
import { toSlack, toHtml } from "../scripts/index.js";

const file = new URL("./cases.json", import.meta.url);
const { cases } = JSON.parse(readFileSync(file, "utf8"));

let failed = 0;
for (const c of cases) {
  if (c.mrkdwn !== undefined) check(c, "mrkdwn", toSlack(c.markdown), c.mrkdwn + "\n");
  if (c.html !== undefined) check(c, "html", toHtml(c.markdown), c.html);
}

if (failed) {
  console.error(`evals: ${failed} of ${cases.length} rows failed`);
  process.exit(1);
}
console.log(`ok: ${cases.length} eval rows passed`);

function check(c, kind, actual, expected) {
  if (actual === expected) return;
  failed++;
  console.error(`FAIL ${c.id} (${kind})${c.comment ? ` — ${c.comment}` : ""}`);
  console.error(`  input:    ${JSON.stringify(c.markdown)}`);
  console.error(`  expected: ${JSON.stringify(expected)}`);
  console.error(`  actual:   ${JSON.stringify(actual)}`);
}
