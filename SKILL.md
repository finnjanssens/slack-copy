---
name: slack-copy
description: Convert Markdown to Slack mrkdwn and copy it to the clipboard, so it pastes correctly into Slack without turning on Slack's "format as Markdown" option. Use when the user says "slack-copy", "copy this for Slack", "make this Slack-ready", "paste-ready for Slack", or asks to hand off a message, summary, or announcement to Slack.
license: MIT
compatibility: Requires macOS (the clipboard write goes through osascript) and Node.js 18+
---

# slack-copy

Slack's rich-text composer (the one with the B/I/U toolbar) does not interpret
mrkdwn, so pasting `*bold*` or `<url|label>` leaves the markup visible. The
converter puts HTML on the clipboard instead, which the composer reads
natively, with mrkdwn as a plain-text fallback.

## Usage

Run the converter from this skill's directory (`index.js` sits at the skill
root). It reads a file argument or stdin, copies both clipboard flavours and
prints the mrkdwn on stdout:

```bash
npx github:finnjanssens/slack-copy msg.md     # from anywhere
node <skill-dir>/index.js msg.md              # when installed as a skill
cat msg.md | npx github:finnjanssens/slack-copy
```

It copies before printing, so if it prints, the clipboard is loaded. Add
`--no-copy` to preview without touching the clipboard, or `--html` to see the
HTML it copies.

## Installing as a skill

```bash
git clone https://github.com/finnjanssens/slack-copy.git
ln -s "$(pwd)/slack-copy" ~/.claude/skills/slack-copy
```

Any agent that follows the Agent Skills standard loads it the same way: a
symlink (or clone) named `slack-copy` in the agent's skills directory.

## Steps

1. Get the Markdown. If the user asked to convert text from the conversation,
   write that text verbatim to a scratch file first with the Write tool
   (heredocs mangle backticks and `$`).
2. Run the command above. If it errors, say so, do not report a copy that did
   not happen.
3. Show the converted output so the user can eyeball it, and confirm it is on
   the clipboard.

## What changes

Bold, italic, strikethrough, inline code, code blocks, links, nested lists and
blockquotes all survive as real Slack formatting. Headings become bold
paragraphs and tables become code blocks, because Slack has neither. See the
[README](README.md) for the full conversion table.

## Notes

- Paste with plain `cmd+v`. Slack takes the HTML flavour and formats it; no
  Slack preference needs changing.
- If the message is going out through Slack API or MCP tools instead of a
  paste, those take mrkdwn, so use the stdout text rather than the clipboard.
- macOS only: the clipboard write goes through `osascript`, because `pbcopy`
  can only carry plain text. With `--no-copy` it prints on any platform.
