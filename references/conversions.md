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
| tables | `<pre>`, space-aligned columns | code block, space-aligned columns |
| `---` | `────────` | `────────` |
| `<!-- comment -->` | removed | removed |

Neither target has headings or tables, so those degrade rather than convert:
tables become space-aligned text in a code block (cells stripped of pipes,
columns padded to the widest cell, dashed header separator).
Code spans and fences are escaped but never reformatted.

Not handled: reference links (`[text][id]`), setext headings (`===` underlines),
footnotes, code spans inside a link label.
