import assert from "node:assert/strict";
import { toSlack, toHtml } from "./index.js";

const eq = (md, expected, msg) => assert.equal(toSlack(md), expected + "\n", msg);
const html = (md, expected, msg) => assert.equal(toHtml(md), expected, msg);

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

// ------------------------------------------------- HTML, what Slack actually reads

html("**bold**", "<p><b>bold</b></p>");
html("*italic*", "<p><i>italic</i></p>");
html("_italic_", "<p><i>italic</i></p>");
html("***both***", "<p><b><i>both</i></b></p>");
html("~~gone~~", "<p><s>gone</s></p>");
html("snake_case_name", "<p>snake_case_name</p>", "intra-word underscores are not emphasis");
html("# Heading", "<p><b>Heading</b></p>");
html("plain text", "<p>plain text</p>");
html("one\ntwo", "<p>one<br>two</p>", "soft wrap inside a paragraph");
html("one\n\ntwo", "<p>one</p><p>two</p>", "blank line splits paragraphs");

html("[label](https://x.dev)", '<p><a href="https://x.dev">label</a></p>');
html("<https://x.dev>", '<p><a href="https://x.dev">https://x.dev</a></p>');
html("![alt](https://x.dev/a.png)", '<p><a href="https://x.dev/a.png">alt</a></p>');

html("`code`", "<p><code>code</code></p>", "backticks are stripped, tag carries it");
html("`**x**`", "<p><code>**x**</code></p>", "no formatting inside code");
html("5 < 6 & 7", "<p>5 &lt; 6 &amp; 7</p>");

html("- one\n- two", "<ul><li>one</li><li>two</li></ul>");
html("1. one\n2. two", "<ol><li>one</li><li>two</li></ol>");
html("- top\n  - nested", "<ul><li>top<ul><li>nested</li></ul></li></ul>", "nested inside the li");
html(
  "- a\n  - b\n    - c\n- d",
  "<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li><li>d</li></ul>",
  "three levels, then back to the top",
);
html("- a\n  1. b", "<ul><li>a<ol><li>b</li></ol></li></ul>", "ordered list nested in unordered");
html("- **bold** item", "<ul><li><b>bold</b> item</li></ul>");

html("> quoted", "<blockquote>quoted</blockquote>");
html("> one\n> two", "<blockquote>one<br>two</blockquote>", "quote lines joined");
html("```js\nx < 1;\n```", "<pre><code>x &lt; 1;</code></pre>", "language dropped, contents escaped");
html("```\n**literal**\n```", "<pre><code>**literal**</code></pre>");
html("| a | b |\n| --- | --- |\n| 1 | 2 |", "<pre><code>| a | b |\n| 1 | 2 |</code></pre>");
html("---", "<p>────────</p>");
html("a <!-- x --> b", "<p>a  b</p>");
html("", "", "empty input produces no markup");

// A paragraph, a list and a fence in sequence must not bleed into each other.
html(
  "Intro:\n\n- one\n- two\n\n```\ncode\n```\n\nOutro",
  "<p>Intro:</p><ul><li>one</li><li>two</li></ul><pre><code>code</code></pre><p>Outro</p>",
);

console.log("ok");
