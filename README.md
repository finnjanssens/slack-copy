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

No dependencies. mrkdwn is a flat, line-oriented format, so a block pass plus an
inline pass covers it in one file.

Conversions:

| Markdown | Slack |
| --- | --- |
| `**bold**`, `__bold__` | `*bold*` |
| `*italic*` | `_italic_` |
| `***both***` | `*_both_*` |
| `~~strike~~` | `~strike~` |
| `# Heading` | `*Heading*` (mrkdwn has no headings) |
| `[text](url)`, `![alt](url)` | `<url\|text>`, title dropped |
| `&`, `<`, `>` | `&amp;`, `&lt;`, `&gt;` |
| lists | `•` bullets, original indent kept |
| `1.` lists | numbers verbatim, Slack does not renumber |
| ` ```js ` | ` ``` `, mrkdwn fences take no language |
| tables | code block, separator row dropped |
| `---` | a rule of box-drawing characters |
| `<!-- comment -->` | removed |

Code spans and fences are escaped but never reformatted.

Not handled: reference links (`[text][id]`), setext headings (`===`
underlines), footnotes.

## Test

```bash
npm test
```
