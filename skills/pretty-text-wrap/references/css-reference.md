# CSS reference for pretty text wrapping

Contents
1. The properties
2. Shorthand vs longhand (read this one)
3. Browser support
4. How the algorithms behave
5. Interactions with other properties
6. Related tools: hyphenation, long words, CJK
7. Debugging tips

---

## 1. The properties

`text-wrap` is a shorthand for two longhands:

| Property | Controls | Values |
|---|---|---|
| `text-wrap-mode` | *Whether* text wraps | `wrap` (default), `nowrap` |
| `text-wrap-style` | *How* lines are chosen when it wraps | `auto` (default), `balance`, `pretty`, `stable` |

So `text-wrap: balance` means "wrap, and balance the lines", and `text-wrap: nowrap` means "don't wrap".

Values of `text-wrap-style`:

- **`auto`**: the browser's normal fast, greedy line breaking: fill each line as full as possible, then move on.
- **`balance`**: make all lines roughly equal length. Only applied to blocks under a line-count limit; longer blocks fall back to `auto`.
- **`pretty`**: favor better typography over speed. In practice this mainly means avoiding a single word (or very short fragment) on the last line, and in some engines also improving the overall rag and hyphenation.
- **`stable`**: when editable text changes, keep earlier lines from re-wrapping. Useful for `textarea` and `contenteditable`; not a beautification tool.

`white-space` is also a shorthand. It sets `white-space-collapse` *and* `text-wrap-mode`. `white-space: nowrap` is equivalent to collapsing whitespace plus `text-wrap-mode: nowrap`.

## 2. Shorthand vs longhand (read this one)

Because both `white-space` and `text-wrap` set `text-wrap-mode`, they can override each other.

```css
.truncate    { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-title  { text-wrap: balance; }   /* same specificity, declared later */
```

An element with both classes now **wraps**, because `text-wrap: balance` reset `text-wrap-mode` to `wrap`. The ellipsis disappears and the title spills onto multiple lines. This is the most common way adding pretty wrapping breaks a UI, and it's easy to miss because it only shows up on long titles.

Rules of thumb:

- **Write the longhand `text-wrap-style: balance | pretty` in hand-written CSS.** It only changes how lines break and can never turn wrapping back on.
- Use the shorthand only where an element is guaranteed to never need `nowrap`, or inside an `@supports` fallback for old engines (see the baseline in SKILL.md).
- **Tailwind's `text-balance` and `text-pretty` utilities use the shorthand.** Never put them on the same element as `truncate`, `whitespace-nowrap`, or `text-ellipsis`. Search for elements with both and resolve them (usually by removing the wrap utility, since a single-line element has nothing to balance).
- Component libraries with a `noWrap` prop (MUI `Typography`, Mantine `Text`, etc.) set `white-space: nowrap`. Check the order in which a theme's `textWrap` and `noWrap` styles apply.

## 3. Browser support

Check https://caniuse.com/css-text-wrap-balance and https://caniuse.com/css-text-wrap-pretty for current numbers; support keeps expanding. As a guide:

| Feature | Chromium (Chrome, Edge, Opera, Arc) | Safari / WebKit | Firefox |
|---|---|---|---|
| `text-wrap: balance` | 114+ | 17.5+ | 121+ |
| `text-wrap: pretty` | 117+ | 26+ | Check current support |
| `text-wrap-style` longhand | 130+ | 17.5+ | 124+ |

Unsupported values are ignored and text wraps normally, so every one of these is safe to ship to every browser. Nothing needs a polyfill. JavaScript balancers (`react-wrap-balancer`, `balance-text`) are no longer worth their cost for most products.

Android WebView and in-app browsers follow Chromium versions. iOS in-app browsers and every browser on iOS use WebKit, so iOS users get WebKit's behavior regardless of browser.

## 4. How the algorithms behave

**`balance`**
- Finds the narrowest width at which the text still takes the same number of lines, then sets every line to roughly that width. The number of lines does not change; only where the breaks fall.
- The *element's box does not shrink.* It stays as wide as it was, with the balanced lines inside it. Left-aligned balanced text therefore leaves empty space on the right; centered text looks centered.
- Has a line-count limit for performance (about 6 lines in Chromium, 10 in Firefox). A block over the limit is wrapped normally, so `balance` on long paragraphs does nothing useful. Use `pretty` there.
- Each block is balanced independently. Two side-by-side card titles are not balanced *with each other*.

**`pretty`**
- Chromium: looks at the last few lines (around 4) and adjusts breaks to avoid a lone word on the last line. Earlier lines are unchanged, so a long paragraph mostly looks the same except for its ending.
- WebKit (Safari 26+): evaluates the whole paragraph, aiming to avoid short last lines, improve the overall rag (fewer very uneven line lengths), and make better hyphenation decisions.
- Because engines differ, the same paragraph can end differently in Chrome and Safari. Test both.
- It's a preference, not a guarantee. If every alternative is worse (for example, a very long final word in a narrow column), the engine may still leave a short last line.

**`stable`**
- For editable text: as the user types, lines above the cursor don't reflow. Consider it for `textarea` and editors where you'd otherwise opt out of wrap styles entirely.

## 5. Interactions with other properties

| Combined with | What happens | Recommendation |
|---|---|---|
| `white-space: nowrap`, `truncate`, `text-overflow: ellipsis` | Shorthand `text-wrap` undoes `nowrap` (see section 2) | Use the longhand; never combine shorthand with nowrap |
| `line-clamp` / `-webkit-line-clamp` | Balancing redistributes words before clamping; can move more text past the cutoff | Leave clamped text on `auto`, or test carefully |
| `width: fit-content`, `inline-block`, flex/grid items sized to content, absolutely positioned boxes without width | Box width is computed from the unbalanced text; balancing narrows the lines afterward, leaving a gap inside the box | Use `pretty` for shrink-wrapped boxes with visible backgrounds/borders, or give the box a definite width |
| `text-align: center` | Balance looks best here | Strongly prefer `balance` for centered multi-line text |
| `text-align: justify` | `pretty` can help reduce loose last-line issues; `balance` makes justified text look odd | Prefer `pretty` |
| `max-width` in `ch` on headings | Often added to fake balance; can conflict by making lines too narrow | Loosen or remove once `balance` is in place; check visually |
| `hyphens: auto` | Works with both; WebKit `pretty` also tries to avoid poor hyphenation | Fine to combine; requires a correct `lang` attribute |
| `contain`, `content-visibility: auto` | Off-screen sections may not be laid out; audits can't measure them until scrolled into view | Scroll the page (the audit script does not) or temporarily disable for auditing |
| Animated text (typewriter, streaming, counters) | Lines re-break as content changes, which reads as jitter | Opt out while animating; apply when final |
| CSS transitions on width (sidebars opening, accordions) | Balanced text re-balances during the transition | Usually fine; if it looks busy, apply after the transition ends |
| `display: contents` | No box of its own; wrap style must be on the real block ancestor | Put the property on the block element |

## 6. Related tools

These aren't strictly about widows but belong in a comprehensive wrap pass.

- **Non-breaking space** (`&nbsp;`, `\u00A0`): glue two words together. Number+unit, short names, last two words of critical headlines. Works everywhere, including email. Overuse can cause horizontal overflow on narrow screens.
- **Narrow no-break space** (`\u202F`): for thin-space conventions like French punctuation (`Bonjour !`) and some number formats.
- **Word joiner** (`\u2060`): prevents a break without adding space, for example between an icon character and text.
- **`<wbr>`**: suggests a break opportunity inside long tokens (URLs, file paths, compound identifiers) without adding a hyphen.
- **Soft hyphen** (`&shy;`): a break opportunity that shows a hyphen only if used.
- **`hyphens: auto`**: dictionary hyphenation. Needs `lang` on `<html>` or the element. Good for narrow columns and long-word languages (German, Finnish, Dutch). Usually leave headings unhyphenated: `h1, h2, h3 { hyphens: manual; }`.
- **`overflow-wrap: anywhere`** (or `break-word`): stop long unbreakable strings (URLs, hashes, user input) from overflowing their container. Belongs on user-generated content and narrow cards. Not a substitute for hyphenation on normal text.
- **`word-break: keep-all`**: for Korean, keeps words intact instead of breaking between any characters.
- **`word-break: auto-phrase`** (Chromium): for Japanese, breaks at natural phrase boundaries instead of between any characters. Combine with `text-wrap: balance` on Japanese headings for a large improvement. Needs `lang="ja"`.
- **`hanging-punctuation`** (WebKit): hang opening quotes outside the text block for cleaner left edges in quotes.

## 7. Debugging tips

- DevTools → Elements → Computed: search `text-wrap` to see both longhands and which rule won.
- To see whether `balance` is doing anything, toggle it in DevTools while watching the heading at a narrow width. If nothing changes, the block is probably over the line limit, already balanced, or the property is overridden.
- Resize slowly through breakpoints. Widows often appear only in a narrow band of widths between your design's breakpoints.
- Make sure web fonts have loaded before judging wraps. Fallback fonts have different widths.
- If a widow persists with `pretty` applied in Chromium, check how many lines the paragraph has. In very long paragraphs, it may be a case where no alternative within the last few lines is better. A non-breaking space between the last two words fixes it deterministically.
