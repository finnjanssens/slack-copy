import assert from "node:assert/strict";
import { toSlack } from "./index.js";

const eq = (md, expected, msg) => assert.equal(toSlack(md), expected + "\n", msg);

// Emphasis
eq("**bold**", "*bold*");
eq("__bold__", "*bold*");
eq("*italic*", "_italic_");
eq("_italic_", "_italic_", "already mrkdwn, left alone");
eq("***both***", "*_both_*");
eq("~~gone~~", "~gone~");
eq("**bold** and *italic*", "*bold* and _italic_");
eq("snake_case_name stays", "snake_case_name stays");
eq("2 * 3 * 4", "2 * 3 * 4", "bare asterisks are not emphasis");

// Headings
eq("# One", "*One*");
eq("###### Six", "*Six*");
eq("## Closed ##", "*Closed*");
eq("## With **bold**", "*With bold*", "bold inside a heading is redundant");
eq("## With `code`", "*With `code`*", "other heading contents still convert");

// Links
eq("[text](https://x.dev)", "<https://x.dev|text>");
eq('[text](https://x.dev "title")', "<https://x.dev|text>", "titles dropped");
eq("![alt](https://x.dev/a.png)", "<https://x.dev/a.png|alt>");
eq("<https://x.dev>", "<https://x.dev>", "autolink survives escaping");
eq("[**bold link**](https://x.dev)", "<https://x.dev|*bold link*>");
eq("see [a](https://x.dev/a) and [b](https://x.dev/b)", "see <https://x.dev/a|a> and <https://x.dev/b|b>");

// Escaping
eq("5 < 6 & 7 > 2", "5 &lt; 6 &amp; 7 &gt; 2");
eq("`a < b`", "`a &lt; b`", "code spans are escaped but not reformatted");
eq("`**not bold**`", "`**not bold**`");
eq("a `**x**` b **y**", "a `**x**` b *y*", "formatting resumes after a code span");

// Lists
eq("- one\n- two", "• one\n• two");
eq("* star", "• star");
eq("- top\n  - nested", "• top\n  • nested", "indent preserved");
eq("1. first\n2. second", "1. first\n2. second", "numbers kept verbatim");
eq("- **bold** item", "• *bold* item");

// Blocks
eq("> quoted", "> quoted");
eq("---", "────────");
eq("```js\nconst x = 1;\n```", "```\nconst x = 1;\n```", "fence language dropped");
eq("```\n**literal**\n```", "```\n**literal**\n```", "fence contents untouched");
eq("| a | b |\n| --- | --- |\n| 1 | 2 |", "```\n| a | b |\n| 1 | 2 |\n```", "table fenced, separator dropped");
eq("before <!-- hide me --> after", "before  after", "html comments removed");

// Structure
eq("# H\n\npara\n\n- item", "*H*\n\npara\n\n• item", "blank lines preserved");
assert.equal(toSlack("x\n\n\n"), "x\n", "exactly one trailing newline");
assert.equal(toSlack("").endsWith("\n"), true, "empty input still ends in a newline");
assert.equal(toSlack("a\r\nb"), "a\nb\n", "CRLF normalised");

console.log("ok");
