# slack-copy

Markdown on the clipboard, ready to paste into Slack.

## Requirements

- macOS (the clipboard write goes through `osascript`; with `--no-copy` the
  converter prints on any platform)
- Node.js 18+

## Install

As a plain CLI, run it straight from GitHub:

```bash
npx github:finnjanssens/slack-copy message.md
```

Or as an [Agent Skill](https://agentskills.io) for Claude Code, Cursor, Codex,
opencode, or any other agent the [skills CLI](https://github.com/vercel-labs/skills)
supports:

```bash
npx skills add finnjanssens/slack-copy -g        # every detected agent
npx skills add finnjanssens/slack-copy -g -a claude-code   # one agent
```

Or manually:

```bash
git clone https://github.com/finnjanssens/slack-copy.git
ln -s "$(pwd)/slack-copy" ~/.claude/skills/slack-copy
```

See [SKILL.md](SKILL.md) for the skill instructions.

Slack's default composer is rich text: the one with the **B** *I* U toolbar. It
does not interpret mrkdwn, so pasting `*bold*` or `<url|label>` into it leaves
the asterisks, pipes and brackets sitting there literally. mrkdwn is only
interpreted for messages sent through the API, or when you turn on the "format
messages with markup" preference, which replaces the rich composer entirely.

So this puts two clipboard flavours down at once:

- **`text/html`** — what the rich composer actually reads. Pasting produces real
  bold, lists, code and links, with no Slack setting involved.
- **plain text** — mrkdwn, as a fallback for markup mode and for API posting.

## Usage

```bash
npx ~/Personal/slack-copy message.md          # convert and copy
cat message.md | npx ~/Personal/slack-copy
npx ~/Personal/slack-copy --no-copy msg.md    # print only
npx ~/Personal/slack-copy --html msg.md       # print the HTML it copies
```

Reads a file argument or stdin. Prints the mrkdwn on stdout, since it is the
readable one to eyeball. macOS only: the clipboard write goes through
`osascript`, because `pbcopy` can only carry plain text.

## Conversions

| Markdown | HTML flavour | plain flavour |
| --- | --- | --- |
| `**bold**`, `__bold__` | `<b>` | `*bold*` |
| `*italic*`, `_italic_` | `<i>` | `_italic_` |
| `***both***` | `<b><i>` | `*_both_*` |
| `~~strike~~` | `<s>` | `~strike~` |
| `# Heading` | bold paragraph | `*Heading*` |
| `[text](url)` | `<a href>` | `<url\|text>` |
| `` `code` `` | `<code>` | unchanged |
| ` ```js ` | `<pre><code>` | ` ``` `, language dropped |
| lists, nested | `<ul>`/`<ol>`, nested in the `<li>` | `•`, indent kept |
| `> quote` | `<blockquote>` | `> quote` |
| tables | `<pre>`, columns kept aligned | code block |
| `---` | `────────` | `────────` |
| `<!-- comment -->` | removed | removed |

Neither target has headings or tables, so those degrade rather than convert.
Code spans and fences are escaped but never reformatted.

Not handled: reference links (`[text][id]`), setext headings (`===` underlines),
footnotes.

## Test

```bash
npm test
```
