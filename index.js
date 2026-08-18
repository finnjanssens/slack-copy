#!/usr/bin/env node
// slack-copy: Markdown -> Slack mrkdwn, on the clipboard.
//
// Slack only renders pasted Markdown when the composer's "format as Markdown"
// option is on. This converts to Slack's own mrkdwn instead, so a plain paste
// looks right with that option off.
//
// Hand-rolled rather than parsed: mrkdwn is a flat, line-oriented format with no
// nesting to speak of, so a block pass plus an inline pass covers it.
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BOLD = "\x00";
const ITALIC = "\x01";

// Slack requires these three escaped everywhere, including inside code spans and
// fences. It unescapes them when rendering.
const escapeEntities = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const isTableSeparator = (line) => /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/.test(line ?? "");

const isTableRow = (line) => /^\s*\|/.test(line);

// Inline formatting for one run of non-code text.
function formatRun(text) {
  let out = escapeEntities(text);

  // Autolinks were written as <url>, so undo the escaping we just applied.
  out = out.replace(/&lt;((?:https?|mailto):[^\s|>]+)&gt;/g, "<$1>");

  // Links before emphasis, so emphasis inside the link label still converts.
  // Titles are dropped, mrkdwn has nowhere to put them.
  const link = (_, label, url) => (label ? `<${url}|${label}>` : `<${url}>`);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, link);
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, link);

  // Emphasis markers are emitted as sentinels and swapped for real ones at the
  // end. Writing "*" directly would let the *italic* rule re-match the "*bold*"
  // the ** rule just produced and turn it into _bold_.
  // Longest marker first: *** would otherwise be eaten by the ** rule.
  out = out.replace(/(\*\*\*|___)(?=\S)([\s\S]*?\S)\1/g, `${BOLD}${ITALIC}$2${ITALIC}${BOLD}`);
  out = out.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, `${BOLD}$2${BOLD}`);
  // *italic* -> _italic_. Word-boundary guards keep a*b and 2*3 alone; single
  // _italic_ needs no rule, mrkdwn already spells it that way.
  out = out.replace(/(?<![\w*])\*(?=\S)([^*\n]*\S)\*(?![\w*])/g, `${ITALIC}$1${ITALIC}`);
  out = out.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "~$1~");

  return out.replaceAll(BOLD, "*").replaceAll(ITALIC, "_");
}

// Split code spans out so their contents are escaped but never reformatted.
const formatInline = (text) =>
  text
    .split(/(`+[^`\n]+`+)/g)
    .map((part, i) => (i % 2 ? escapeEntities(part) : formatRun(part)))
    .join("");

export function toSlack(markdown) {
  const lines = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n");

  const out = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      // mrkdwn fences take no language.
      out.push("```");
      continue;
    }
    if (inFence) {
      out.push(escapeEntities(line));
      continue;
    }

    // Tables have no mrkdwn equivalent; a fence at least keeps them aligned.
    if (isTableRow(line) && isTableSeparator(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isTableSeparator(lines[i])) rows.push(escapeEntities(lines[i]));
        i++;
      }
      i--;
      out.push("```", ...rows, "```");
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*$/);
    if (heading) {
      // The whole heading is already bold, so bold inside it would only add
      // stray asterisks.
      out.push(`*${formatInline(heading[1].replace(/\*\*|__/g, ""))}*`);
      continue;
    }

    // Horizontal rule: --- / *** / ___
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      out.push("────────");
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bullet) {
      out.push(`${bullet[1]}• ${formatInline(bullet[2])}`);
      continue;
    }

    // Slack does not renumber, so the author's numbers are kept verbatim.
    const ordered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      out.push(`${ordered[1]}${ordered[2]}. ${formatInline(ordered[3])}`);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      out.push(`> ${formatInline(quote[1])}`);
      continue;
    }

    out.push(formatInline(line));
  }

  return out.join("\n").trimEnd() + "\n";
}

function main(argv) {
  const args = argv.slice(2);
  const noCopy = args.includes("--no-copy");
  const rest = args.filter((a) => a !== "--no-copy");

  if (rest.includes("-h") || rest.includes("--help")) {
    process.stdout.write(
      "usage: slack-copy [--no-copy] [file]\n\n" +
        "Reads Markdown from <file> or stdin, prints Slack mrkdwn on stdout\n" +
        "and copies it to the clipboard.\n",
    );
    return 0;
  }

  const file = rest[0];
  if (!file && process.stdin.isTTY) {
    process.stderr.write("slack-copy: no input (pass a file or pipe stdin)\n");
    return 2;
  }

  const markdown = readFileSync(file && file !== "-" ? file : 0, "utf8");
  const slack = toSlack(markdown);

  // Copy before printing: if pbcopy fails we exit non-zero without having
  // claimed success on stdout.
  if (!noCopy) execFileSync("pbcopy", { input: slack });
  process.stdout.write(slack);
  return 0;
}

// realpath both sides: npx runs the bin through a node_modules/.bin symlink, so
// a plain argv[1] comparison never matches and the CLI silently does nothing.
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  process.exit(main(process.argv));
}
