import assert from "node:assert/strict";
import { toSlack } from "./index.js";

const out = toSlack(
  "# Heading\n\nSome **bold** and *italic* with a [link](https://example.com).\n\n- one\n  - nested\n",
);

assert.equal(out.includes("​"), false, "zero-width spaces must be stripped");
assert.match(out, /^\*Heading\*$/m, "heading becomes bold");
assert.match(out, /\*bold\*/);
assert.match(out, /_italic_/);
assert.match(out, /<https:\/\/example\.com\|link>/);
assert.match(out, /^• one$/m, "list marker followed by a single space");
assert.match(out, /^ {4}• nested$/m, "nested marker keeps indent, single space");
assert.equal(out.endsWith("\n"), true);
assert.equal(out.endsWith("\n\n"), false, "exactly one trailing newline");

console.log("ok");
