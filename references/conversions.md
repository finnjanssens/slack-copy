# Conversions

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
