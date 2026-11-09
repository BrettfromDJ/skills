---
name: pretty-text-wrap
description: 'Audit and fix text wrapping across an entire website, web app, or product so every heading, paragraph, label, and UI string wraps beautifully — no widows (a lone word on the last line), no stubby last lines, no lopsided multi-line headings, no awkward splits like 10 / GB. Applies CSS text-wrap: balance and text-wrap: pretty (plus native-platform equivalents) systematically, handles every conflict and edge case, and verifies the result with a runtime audit at multiple screen widths. Use this skill whenever the user mentions widows, orphans, text wrap, text-wrap balance or pretty, rag, line breaks, headings breaking awkwardly, "one word on its own line", typographic polish, typography QA, or wants their product''s text to look more professional or designed — even if they never say "text-wrap".'
---

# Pretty Text Wrap

The goal: every piece of text in the product wraps the way a good typesetter would set it, at every screen width, in every language, without anyone having to think about it again.

"Pretty" means four things:

1. **No widows.** A paragraph or heading never ends with a single word alone on its last line.
2. **No stubby last lines.** The last line isn't a tiny fragment hanging under long lines.
3. **Balanced short text.** Headings, titles, captions, and other short multi-line text break into lines of similar length instead of one long line and one short one.
4. **No bad splits.** Things that belong together stay together: numbers and units, names, short phrases, icons and their labels.

Browsers now do most of this natively with two CSS values. The work is applying them everywhere they belong, keeping them away from the places they cause harm, and proving the result.

## The two tools

| | `balance` | `pretty` |
|---|---|---|
| What it does | Evens out all line lengths in a block | Adjusts the last few lines to avoid widows and short endings, leaves the rest alone |
| Best for | Short text: headings, titles, captions, quotes, labels | Running text: paragraphs, list items, descriptions, helper text |
| Limit | Only applies to short blocks (about 6 lines in Chromium, 10 in Firefox); longer text wraps normally | Slightly more layout work; Chromium only reconsiders the last ~4 lines, Safari evaluates the whole paragraph |
| If unsupported | Wraps normally (safe) | Wraps normally (safe) |

Both are pure progressive enhancement: a browser that doesn't understand them just wraps text the old way. There is no downside risk in older browsers, so apply them broadly.

Read `references/css-reference.md` before writing CSS. It covers the shorthand vs longhand choice (this matters: the `text-wrap` shorthand can silently undo `white-space: nowrap` and break truncation), browser support, and every interaction with other properties.

## Workflow

Work through these steps in order. Don't skip the audit: the before/after numbers are what make the work trustworthy and reviewable.

### 1. Map the product

Find out what you're working with before changing anything.

- **Stack and styling system.** Tailwind (which version), CSS Modules, Sass, CSS-in-JS (styled-components, Emotion, vanilla-extract), a component library (MUI, Chakra, Mantine, shadcn/ui, Radix), plain CSS, or a site builder (Webflow, Framer, WordPress, Shopify). Check `package.json`, config files, and the main stylesheet.
- **Every surface that renders text.** Marketing site, app UI, docs, blog/CMS content, transactional emails, native iOS/Android apps, generated images (OG/social cards), PDFs. Ask the user which surfaces are in scope if it's unclear; default to all of them that live in the repo.
- **Where global styles live.** The single place a baseline rule can go so it reaches everything.

`references/frameworks.md` has exact instructions per stack and per native platform. Read the sections that apply.

Useful searches (adapt the globs to the repo):

```bash
# Existing wrap control, and things that will conflict with it
rg -n "text-wrap|text-balance|text-pretty|textWrap|text-wrap-style" --glob '!node_modules'
rg -n "white-space:\s*nowrap|whitespace-nowrap|truncate|line-clamp|text-ellipsis|noWrap" --glob '!node_modules'

# Old JavaScript balancers that native CSS now replaces
rg -n "react-wrap-balancer|balance-text|Balancer|textBalancer" --glob '!node_modules'

# Hard line breaks inside headings and titles (breaks at other widths)
rg -n "<br\s*/?>" --glob '*.{tsx,jsx,vue,svelte,html,astro,liquid,php,md,mdx}' --glob '!node_modules'

# Manual non-breaking spaces already in copy
rg -n "&nbsp;|\\\\u00A0|\\\\xa0" --glob '!node_modules'
```

### 2. Audit the current state

Get a baseline so improvement is measurable.

**Runtime audit (the main one).** `scripts/audit.js` scans a live page, measures every rendered line of every text block, and reports widows, short last lines, unbalanced headings, and coverage (how many headings and paragraphs already have balance/pretty). Two ways to run it:

- **In a browser console:** paste the file's contents, then call `textWrapAudit.run()`. Problem blocks get outlined on the page and a table is logged. `textWrapAudit.focus(n)` scrolls to result `n`; `textWrapAudit.clear()` removes the outlines.
- **Across many pages and widths (preferred):** `node scripts/audit-pages.mjs <url> [more urls] --widths=375,768,1280,1920 --browsers=chromium,webkit --out=before.json --screenshots=wrap-shots-before`. Needs Playwright (`npm i -D playwright && npx playwright install chromium webkit`). Run it against the local dev server. Include the key routes: home, a long content page, a dense app screen, settings, pricing, an empty state, a modal, an error page.

Test both Chromium and WebKit when possible. Their `pretty` algorithms differ, so a fix that looks clean in one can still leave a widow in the other.

If neither option is possible (no browser available), do the static review in steps 3–5 carefully and tell the user the runtime audit is the step that confirms the result, with the exact command to run.

### 3. Classify every kind of text

Every text element in the product falls into one of these buckets. When unsure, ask: "Is this short and meant to be scanned as a unit (balance), or is it something people read through (pretty)?"

**Balance** — short, prominent, often centered:
headings (`h1`–`h6`, `[role="heading"]`), page and hero titles, section eyebrows that wrap, card/tile titles, modal and dialog titles, toast and alert titles, empty-state headlines, pricing plan names and taglines, testimonial and pull quotes (short), `figcaption`, table `caption`, `th`, `legend`, `dt`, `summary`, tooltip text, onboarding/coach-mark text, feature-grid titles, CTA headlines, banner text, 404/error headlines, OG image titles.

**Pretty** — running text people read:
`p`, `li`, `dd`, body text in articles, docs and blog posts, CMS rich text, descriptions under titles, card body text, form helper and error text, `label` text that wraps, alert/toast body text, empty-state descriptions, modal body copy, table cells with prose, footer text, legal and fine print, onboarding descriptions, notification text, changelog entries, longer `blockquote`s, comments and user-generated text.

**Leave alone** (or explicitly opt out):
- Code: `pre`, `code`, `kbd`, `samp`, code editors, terminals.
- Editable text: `input`, `textarea`, `contenteditable`, rich text editors. Lines jumping around under the cursor while someone types is worse than a widow.
- **Text that is still arriving:** streaming AI responses, live transcripts, typewriter animations. `pretty` re-breaks the last lines on every new word, which looks like jitter. Apply it once the text is complete (toggle a class when streaming ends) or not at all.
- Rapidly changing text: live counters, timers, tickers, stock prices.
- Text that must stay on one line: anything with `white-space: nowrap`, `truncate`/ellipsis, nav items, tabs, badges, chips, single-line buttons. These don't wrap, so wrap style is irrelevant, but the shorthand can break them (see the CSS reference).
- Line-clamped previews (`line-clamp`): leave on normal wrapping; balancing before a clamp can hide more text than expected.
- Shrink-wrapped boxes with visible backgrounds or borders (chat bubbles, tag pills, tooltips sized to content, `width: fit-content` callouts): `balance` narrows the lines but not the box, which leaves an empty strip on one side. Use `pretty` there, or balance only if the box is a fixed width.
- Tabular numbers and data grids: harmless but pointless; skip for clarity.

### 4. Apply the global baseline

One baseline rule catches the vast majority of text, including content added in the future and translated strings. Put it in the global stylesheet, as early as possible so it acts as a default.

```css
/* Pretty text wrap: global baseline.
   :where() keeps specificity at zero, so any component style can override it.
   The longhand text-wrap-style changes only how lines break, never whether
   text wraps, so it can't undo white-space: nowrap or truncation. */
:where(h1, h2, h3, h4, h5, h6, [role="heading"], figcaption, caption,
       legend, dt, summary, th, [data-text-wrap="balance"]) {
  text-wrap-style: balance;
}

:where(p, li, dd, td, label, blockquote, [data-text-wrap="pretty"]) {
  text-wrap-style: pretty;
}

/* Opt out: put data-text-wrap="off" on any element to restore normal
   wrapping for it and everything inside it (editors, streaming text, code). */
:where([data-text-wrap="off"], [data-text-wrap="off"] *) {
  text-wrap-style: auto;
}

/* Older engines that know only the shorthand (Chromium 114–129).
   The shorthand also resets wrapping to on, so it skips anything that
   is meant to stay on one line. */
@supports (text-wrap: balance) and (not (text-wrap-style: balance)) {
  :where(:is(h1, h2, h3, h4, h5, h6, [role="heading"], figcaption, caption,
             legend, dt, summary, th):not([class*="truncate"], [class*="nowrap"],
                                          [class*="ellipsis"])) {
    text-wrap: balance;
  }
}
```

Adapt the opt-out and class names to the project's conventions (for example, a Tailwind project may prefer `text-wrap` utility classes over data attributes). Don't add `pretty` to the legacy block: browsers without the longhand mostly don't support `pretty` either.

If the project uses CSS cascade layers, put the baseline in the lowest-priority layer the project already declares (often `base` or `reset`). Don't invent a new layer: a newly declared layer can end up with higher priority than existing ones.

### 5. Component-by-component pass

The baseline catches semantic HTML. A lot of real UI text isn't semantic: a card title that's a `div`, a modal title that's a `span` with a class, a hero headline built from a `motion.div`. Go through the component library and every screen and make sure each text surface from step 3 gets the right treatment.

For each component that renders text:

1. Identify which bucket each text slot belongs to.
2. If the element isn't caught by the baseline, add balance/pretty at the component level (a class, utility, or style prop: see `references/frameworks.md`).
3. Check for conflicts: `nowrap`/truncation on the same element, line clamping, shrink-wrapped containers, streaming content.
4. Prefer fixing the shared component over patching each usage, so every instance benefits.

`references/surface-checklist.md` is an exhaustive list of UI surfaces to walk through. Use it so nothing gets missed: the things people forget are toasts, tooltips, empty states, error pages, form validation messages, emails, and OG images.

Also handle these, which CSS alone won't fix:

- **Hard `<br>` in headings.** Designers often force a break at one width; at other widths it creates exactly the ragged wrap this skill removes. Remove it and let `balance` do the work. If a break is genuinely intentional (for meaning or a specific lockup), keep it only at the widths where it holds, for example `<br class="hidden md:inline">`.
- **JavaScript balancers** (`react-wrap-balancer`, `balance-text`, custom resize observers). Native `balance` replaces them with no JavaScript, no layout shift, and no hydration cost. Swap them for the CSS and remove the dependency, but confirm with the user before removing packages.
- **`max-width` on headings.** Balance works best when the heading's box is wider than its balanced lines need. If a heading has a tight `max-width` that was there to fake balance, it can often be loosened or removed. Measure before and after.

### 6. Content-level fixes (non-breaking spaces)

Some pairs should never be split across lines, regardless of browser support. Use a non-breaking space (`&nbsp;` in HTML, `\u00A0` in JS/JSX strings, `{"\u00A0"}` inline in JSX) between:

- A number and its unit or symbol: `10 GB`, `48 hours`, `$1 million`, `5 min`, `100 %` (where a space is used).
- Short names and titles: `Dr. Smith`, `iOS 18`, `Figma Make`, brand names that read as one unit.
- An icon or arrow and its label: `Read more →`, `← Back`.
- Dates: `Nov 9`, `9 November`.

For the most important marketing headlines and email headlines, a non-breaking space between the last two words is a reliable widow fix in every renderer, including email clients and browsers without `pretty`. Use it sparingly: on long phrases it can force overflow on narrow screens. Never put more than two short words together this way.

Editing copy is editing the user's content. Make the CSS changes freely, but list proposed copy edits and get approval before applying them across many strings. For CMS-managed content, suggest a small helper (for example a `noWidow(text)` function or a template filter) rather than editing database content.

### 7. Native and non-browser surfaces

If the product includes iOS, Android, React Native, Flutter, emails, or generated images, apply the platform equivalents from `references/frameworks.md`. Those APIs vary by OS version, so check the platform's current docs before relying on a specific one, and fall back to non-breaking spaces where no API exists.

### 8. Verify

Re-run the same audit with the same pages, widths, and browsers. Write the results to `after.json` (and screenshots to a separate folder) so you can compare them.

The work is done when:

- Every heading and heading-like element in the coverage report shows `balance` (or a deliberate exception).
- Every paragraph-like block shows `pretty` (or a deliberate exception).
- Widows and short last lines are down to near zero across all widths. Anything remaining has been looked at and is either fixed with copy (non-breaking space), accepted with a reason, or a known engine limitation (for example, a paragraph whose widow sits outside the lines Chromium reconsiders).
- Nothing that used to truncate or stay on one line now wraps. Spot check navigation, tabs, buttons, badges, table cells, and anything with an ellipsis at the narrowest width.
- No visible jitter in streaming or live-updating text.
- Rendering was checked after web fonts loaded (the scripts wait for `document.fonts.ready`; if checking by hand, wait for fonts). Fallback-font wrapping is not what users see.

If you can't run the audit in this environment, say so plainly and give the user the exact commands to run it themselves.

### 9. Report back

Keep the report short and scannable. Use this structure:

```
## Text wrap: done

**Result:** X issues before → Y after, across N pages × W widths × B browsers.

**What changed**
- Global baseline added in <file>
- <N> components updated: <short list>
- Removed <library> (replaced by native CSS)
- <N> hard line breaks removed from headings

**Deliberate exceptions**
- <surface>: <reason> (e.g. chat bubbles use pretty, not balance, because they're shrink-wrapped)

**Needs your call**
- <proposed copy edits / non-breaking spaces / remaining issues with screenshots>

**How to keep it this way**
- New text gets the baseline automatically. Opt out with data-text-wrap="off".
- Re-run: node scripts/audit-pages.mjs <urls>
```

## Judgment calls

- **Left-aligned large headlines.** `balance` can make a left-aligned headline look too narrow beside a full-width body column. If it reads as a narrow block floating in space, use `pretty` on that headline instead. Centered text almost always looks better balanced.
- **Very short widows that read fine.** A last line of two short words ("of it.") is technically fine. Don't chase every short line; chase the ones that look like mistakes.
- **Performance.** Both values are cheap for normal UI. Applying `pretty` to every paragraph of an enormous document, or to thousands of rows in a virtualized list, is the one place to measure. Scope it to the readable content area if layout time shows up in profiling.
- **Don't fight the design system.** If a team has a typography scale or text components, put the wrap style there (one change, applied everywhere) rather than scattering utilities across screens.
