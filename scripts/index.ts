#!/usr/bin/env node
// slack-copy: Markdown -> Slack, on the clipboard.
//
// Slack's default composer is rich text (the B/I/U toolbar). It does not
// interpret mrkdwn at all: pasted *bold* stays literally *bold* and <url|label>
// shows its pipe and brackets. mrkdwn is only interpreted for messages sent
// through the API, or when the "format messages with markup" preference is on.
//
// So the clipboard gets two flavours:
//
//   text/html  what the rich composer actually reads. Pasting it produces real
//              bold, lists and links with no Slack setting involved.
//   plain text mrkdwn, as a fallback for markup mode and for API posting.
//
// Hand-rolled rather than parsed: neither target needs more than a block pass
// plus an inline pass.
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BOLD = "\x00";
const ITALIC = "\x01";

// Slack requires these three escaped everywhere, including inside code spans and
// fences. It unescapes them when rendering.
const escapeEntities = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const isTableSeparator = (line: string | undefined) => /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/.test(line ?? "");

const isTableRow = (line: string) => /^\s*\|/.test(line);

// Inline formatting for one run of non-code text.
function formatRun(text: string) {
  let out = escapeEntities(text);

  // Autolinks were written as <url>, so undo the escaping we just applied.
  out = out.replace(/&lt;((?:https?|mailto):[^\s|>]+)&gt;/g, "<$1>");

  // Links before emphasis, so emphasis inside the link label still converts.
  // Titles are dropped, mrkdwn has nowhere to put them.
  const link = (_: string, label: string, url: string) => (label ? `<${url}|${label}>` : `<${url}>`);
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
const formatInline = (text: string) =>
  text
    .split(/(`+[^`\n]+`+)/g)
    .map((part: string, i: number) => (i % 2 ? escapeEntities(part) : formatRun(part)))
    .join("");

export function toSlack(markdown: string) {
  const lines = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n");

  const out = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

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
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        if (!isTableSeparator(lines[i]!)) rows.push(escapeEntities(lines[i]!));
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
      out.push(`*${formatInline(heading[1]!.replace(/\*\*|__/g, ""))}*`);
      continue;
    }

    // Horizontal rule: --- / *** / ___
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      out.push("────────");
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bullet) {
      out.push(`${bullet[1]!}• ${formatInline(bullet[2]!)}`);
      continue;
    }

    // Slack does not renumber, so the author's numbers are kept verbatim.
    const ordered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      out.push(`${ordered[1]!}${ordered[2]!}. ${formatInline(ordered[3]!)}`);
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      out.push(`> ${formatInline(quote[1]!)}`);
      continue;
    }

    out.push(formatInline(line));
  }

  // Trim both ends: a multi-line comment at the top would otherwise leave a
  // blank first line in the pasted message.
  return out.join("\n").trim() + "\n";
}

// ---------------------------------------------------------------- HTML output

const escapeHtml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function inlineHtmlRun(text: string) {
  let out = escapeHtml(text);
  // Bare autolinks were written as <url>.
  out = out.replace(/&lt;((?:https?|mailto):[^\s|>]+)&gt;/g, '<a href="$1">$1</a>');
  const link = (_: string, label: string, url: string) => `<a href="${url}">${label || url}</a>`;
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, link);
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, link);
  out = out.replace(/(\*\*\*|___)(?=\S)([\s\S]*?\S)\1/g, "<b><i>$2</i></b>");
  out = out.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<b>$2</b>");
  out = out.replace(/(?<![\w*])\*(?=\S)([^*\n]*\S)\*(?![\w*])/g, "<i>$1</i>");
  out = out.replace(/(?<![\w_])_(?=\S)([^_\n]*\S)_(?![\w_])/g, "<i>$1</i>");
  out = out.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<s>$1</s>");
  return out;
}

const inlineHtml = (text: string) =>
  text
    .split(/(`+[^`\n]+`+)/g)
    .map((part: string, i: number) =>
      i % 2 ? `<code>${escapeHtml(part.replace(/^`+|`+$/g, ""))}</code>` : inlineHtmlRun(part),
    )
    .join("");

// Items are pre-collected as {indent, ordered, text}; nesting comes from indent,
// and a deeper list is emitted inside the <li> that precedes it so Slack shows it
// as a sub-bullet rather than a new list.
function listHtml(items: {indent: number; ordered: boolean; text: string}[], cursor: {i: number}, indent: number) {
  const ordered = items[cursor.i]!.ordered;
  let html = ordered ? "<ol>" : "<ul>";
  while (cursor.i < items.length) {
    const item = items[cursor.i]!;
    if (item.indent < indent || (item.indent === indent && item.ordered !== ordered)) break;
    cursor.i++;
    html += `<li>${inlineHtml(item.text)}`;
    const next = items[cursor.i];
    if (next && next.indent > indent) html += listHtml(items, cursor, next.indent);
    html += "</li>";
  }
  return html + (ordered ? "</ol>" : "</ul>");
}

export function toHtml(markdown: string) {
  const lines = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n");

  const out = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inlineHtml).join("<br>")}</p>`);
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (!line.trim()) {
      flush();
      continue;
    }

    if (/^\s*(```|~~~)/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*(```|~~~)/.test(lines[i]!)) code.push(lines[i++]!);
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (isTableRow(line) && isTableSeparator(lines[i + 1])) {
      flush();
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        if (!isTableSeparator(lines[i]!)) rows.push(lines[i]!);
        i++;
      }
      i--;
      // Slack's composer has no table, but a code block keeps the columns lined up.
      out.push(`<pre><code>${escapeHtml(rows.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*$/);
    if (heading) {
      flush();
      // Slack has no headings, so a bold paragraph is as close as it gets.
      out.push(`<p><b>${inlineHtml(heading[1]!.replace(/\*\*|__/g, ""))}</b></p>`);
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flush();
      out.push("<p>────────</p>");
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      flush();
      const start = i;
      const items: {indent: number; ordered: boolean; text: string}[] = [];
      while (i < lines.length) {
        const item = lines[i]!.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!item) break;
        items.push({
          indent: item[1]!.length,
          ordered: /\d/.test(item[2]!),
          text: item[3]!,
        });
        i++;
      }
      // listHtml may stop before the end: a type change at the same indent
      // starts a new list, so the unconsumed lines must be re-examined
      // instead of being skipped by a plain i--. cursor.i is relative to the
      // line the list started on, hence the offset from `start`.
      const cursor = { i: 0 };
      out.push(listHtml(items, cursor, items[0]!.indent));
      i = start + cursor.i - 1;
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flush();
      const quoted = [quote[1]!];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1]!)) {
        quoted.push(lines[++i]!.replace(/^\s*>\s?/, ""));
      }
      out.push(`<blockquote>${quoted.map(inlineHtml).join("<br>")}</blockquote>`);
      continue;
    }

    paragraph.push(line);
  }
  flush();

  return out.join("");
}

// Set both clipboard flavours in one shot. pbcopy is plain text only, so this
// goes through AppleScript; both payloads are hex so nothing needs escaping for
// AppleScript's string syntax.
function copyRich(html: string, plain: string) {
  const hex = (s: string) => Buffer.from(s, "utf8").toString("hex");
  execFileSync("osascript", [
    "-e",
    `set the clipboard to {«class HTML»:«data HTML${hex(html)}», ` +
      `«class utf8»:«data utf8${hex(plain)}»}`,
  ]);
}

function main(argv: string[]) {
  const args = argv.slice(2);
  const noCopy = args.includes("--no-copy");
  const rest = args.filter((a: string) => !a.startsWith("--"));

  if (rest.includes("-h") || rest.includes("--help")) {
    process.stdout.write(
      "usage: slack-copy [--no-copy|--html] [file]\n\n" +
        "Reads Markdown from <file> or stdin and copies it to the clipboard as\n" +
        "rich text, ready to paste into Slack's composer. Prints the mrkdwn\n" +
        "equivalent on stdout.\n\n" +
        "  --no-copy  print only, leave the clipboard alone\n" +
        "  --html     print the HTML that goes on the clipboard\n",
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

  // Copy before printing: if the copy fails we exit non-zero without having
  // claimed success on stdout.
  if (!noCopy) copyRich(toHtml(markdown), slack);
  process.stdout.write(args.includes("--html") ? toHtml(markdown) + "\n" : slack);
  return 0;
}

// realpath both sides: npx runs the bin through a node_modules/.bin symlink, so
// a plain argv[1] comparison never matches and the CLI silently does nothing.
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  process.exit(main(process.argv));
}
