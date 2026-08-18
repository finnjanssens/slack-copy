#!/usr/bin/env node
// slack-copy: Markdown -> Slack mrkdwn, on the clipboard.
//
// Slack only renders pasted Markdown when the composer's "format as Markdown"
// option is on. This converts to Slack's own mrkdwn instead, so a plain paste
// looks right with that option off.
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { slackifyMarkdown } from "slackify-markdown";

export function toSlack(markdown) {
  return (
    slackifyMarkdown(markdown)
      // slackify wraps emphasis in zero-width spaces so it renders next to
      // punctuation. Slack does not need them and they survive a copy/paste as
      // invisible junk that breaks search and diffing.
      .replaceAll("​", "")
      // slackify pads list markers to a 4-char cell; Slack renders that as a
      // visible gap.
      .replace(/^(\s*)([•◦▪])\s+/gm, "$1$2 ")
      .trimEnd() + "\n"
  );
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

// realpath both sides: npx runs the bin through a node_modules/.bin symlink,
// so a plain argv[1] comparison never matches and the CLI silently does nothing.
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  process.exit(main(process.argv));
}
