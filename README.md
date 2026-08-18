# slack-copy

Markdown to Slack mrkdwn, on the clipboard.

Slack only renders pasted Markdown when the composer's "format as Markdown"
option is on. With that option off, this converts to Slack's own mrkdwn first so
a plain paste comes out formatted.

## Usage

```bash
npx ~/Personal/slack-copy message.md     # convert, print, copy
cat message.md | npx ~/Personal/slack-copy
npx ~/Personal/slack-copy --no-copy msg.md   # print only
```

Reads a file argument or stdin, prints the result on stdout and copies it to the
clipboard with `pbcopy` (macOS).

## What it does

Built on [slackify-markdown](https://github.com/jsarafajr/slackify-markdown),
plus two fixes to its output:

- strips the zero-width spaces it wraps emphasis in, which otherwise ride along
  into Slack as invisible characters
- collapses the 4-column list marker padding to a single space

Conversions:

| Markdown | Slack |
| --- | --- |
| `**bold**` | `*bold*` |
| `*italic*` | `_italic_` |
| `# Heading` | `*Heading*` (mrkdwn has no headings) |
| `[text](url)` | `<url\|text>` |
| nested lists | indented `•` bullets |
| tables | code block |

## Test

```bash
npm test
```
