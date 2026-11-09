# Surface checklist

Walk through every item that exists in the product. For each, note: which bucket (balance / pretty / leave alone), whether the baseline already covers it (semantic tag?) or it needs a component-level fix, and any conflict (nowrap, clamp, shrink-wrapped box, streaming).

B = balance, P = pretty, — = leave alone / opt out.

## Global layout
- [ ] Top nav items: — (single line)
- [ ] Announcement / promo banner text: B
- [ ] Mega-menu item titles: B; descriptions: P
- [ ] Sidebar section headers: B; nav labels: — (usually truncate)
- [ ] Breadcrumbs: —
- [ ] Footer column headings: B; footer blurbs and legal text: P
- [ ] Cookie / consent banner: title B, body P

## Marketing pages
- [ ] Hero headline: B (check for `<br>` and tight `max-width`)
- [ ] Hero subheadline: B if ≤3 lines and centered, else P
- [ ] Eyebrow / kicker text above headings: B (often a `span` or `p`: needs a class)
- [ ] Section headings and intros: B / P
- [ ] Feature grid titles: B; feature descriptions: P
- [ ] Logo-wall captions: B
- [ ] Testimonial quotes: B if short, P if long; author name + role: B
- [ ] Stats / metric labels: B (keep number + unit together)
- [ ] Pricing: plan names B, taglines B, feature list items P, footnotes P
- [ ] Comparison tables: header cells B, prose cells P
- [ ] FAQ: questions (`summary` or button text) B, answers P
- [ ] CTA sections: headline B, supporting text P, button labels —
- [ ] Blog index: post titles B, excerpts P (check clamping)
- [ ] Article pages: title B, dek/subtitle B, body P, captions B, pull quotes B, author bio P
- [ ] Case studies, changelog, careers, about, legal pages

## App UI
- [ ] Page titles and screen headers: B (truncate on mobile? then —)
- [ ] Section and panel headers: B
- [ ] Card titles: B (frequently `div`s); card descriptions: P
- [ ] List item primary text: usually — (truncate); secondary/description text: P if it wraps
- [ ] Table headers: B; cells: P only for prose cells
- [ ] Dashboard widget titles and descriptions: B / P
- [ ] Charts: titles B, annotations B, axis labels — (rendered in SVG/canvas; check library options)
- [ ] Settings: section titles B, setting labels P, setting descriptions P
- [ ] Onboarding / setup steps: titles B, body P
- [ ] Empty states: headline B, description P
- [ ] Loading / skeleton copy, progress messages: P
- [ ] Error pages (404, 500, offline): headline B, body P
- [ ] Permission / upgrade / paywall screens: headline B, body P
- [ ] Search results: titles B or —, snippets P
- [ ] Notifications / activity feed items: P
- [ ] Comments, chat, user-generated content: P plus `overflow-wrap: anywhere`
- [ ] AI chat / streaming responses: — while streaming, P when complete
- [ ] Profile / account headers and bios: B / P
- [ ] Command palette: — (single line)

## Overlays and feedback
- [ ] Modal / dialog / alert dialog titles: B; body: P
- [ ] Sheets, drawers, popovers: titles B, body P
- [ ] Toasts / snackbars: title B, body P (often shrink-wrapped: prefer P if the box hugs the text)
- [ ] Tooltips: P if shrink-wrapped (hug content), B if fixed width
- [ ] Inline alerts / callouts / banners: title B, body P
- [ ] Coach marks / product tours: title B, body P
- [ ] Confirmation and destructive-action copy: P

## Forms
- [ ] Field labels: P (or — if single-line by design)
- [ ] Helper / hint text: P
- [ ] Validation and error messages: P
- [ ] Checkbox / radio / switch labels: P
- [ ] Fieldset legends: B
- [ ] Inputs, textareas, rich text editors: — (or `stable` for editors)
- [ ] Placeholder text: — (can't be styled for wrap meaningfully)
- [ ] Multi-step form step titles: B

## Buttons and controls
- [ ] Button labels: — when single line; B if a button is designed to wrap (large CTA cards)
- [ ] Tabs, segmented controls, chips, badges, tags, pills: —
- [ ] Menu items, dropdown options: —

## Media and content blocks
- [ ] `figcaption`, image captions, video captions: B
- [ ] Blockquotes: P (B for short pull quotes)
- [ ] Definition lists: `dt` B, `dd` P
- [ ] Callout boxes in docs (note/warning): title B, body P
- [ ] Code blocks, inline code, terminal output: —
- [ ] Embeds (tweets, iframes): out of scope (can't style)

## Off-product surfaces
- [ ] Transactional emails: headline and key sentence get `&nbsp;` between the last two words; inline `text-wrap: balance` on headings
- [ ] Marketing emails: same
- [ ] OG / social share images: balance in Satori or manual
- [ ] PDF exports / invoices / reports: CSS applies if rendered with a browser engine
- [ ] App Store / Play Store screenshots with text: manual check
- [ ] Push notification copy: no control; keep copy short
- [ ] Native iOS / Android screens: platform APIs (see frameworks.md)

## Cross-cutting checks
- [ ] Every breakpoint, including between breakpoints (widows hide in narrow width bands)
- [ ] Narrowest supported width (320–375 px)
- [ ] Largest text / zoom 200% / Dynamic Type / Android font scale
- [ ] Every supported language, especially long-word (German, Finnish) and CJK (Japanese, Chinese, Korean)
- [ ] Right-to-left languages (Arabic, Hebrew): balance and pretty work the same; check visually
- [ ] Dark mode doesn't matter for wrapping, but screenshots should cover it if visual review is in light mode only
- [ ] Logged-out vs logged-in variants, and long user names / long data
- [ ] Number + unit pairs, prices, dates, names, and icon + label pairs never split
