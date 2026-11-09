# Skills

Claude skills for designers and builders.

| Skill | What it does |
|---|---|
| [pretty-text-wrap](plugins/pretty-text-wrap/skills/pretty-text-wrap/SKILL.md) | Finds and fixes bad line breaks across your entire product |

---

## pretty-text-wrap

<!-- Drag your demo video into this spot while editing the README on GitHub. -->

Widows, stubby last lines and lopsided headings make a product look unfinished. This skill goes through your whole site or app and fixes them, everywhere, for good.

**What it does**

- **Maps every surface that shows text**: marketing pages, app UI, docs, CMS content, emails, OG images, and native iOS or Android screens.
- **Measures the real rendered lines** in Chrome and Safari, at several screen widths, so you get a before/after count.
- **Adds one global CSS baseline**: `text-wrap: balance` for headings and other short text, `text-wrap: pretty` for paragraphs.
- **Goes component by component** for the text the baseline can't reach: card titles, modals, toasts, empty states, error pages and form messages.
- **Avoids the classic traps.** For example, the `text-wrap` shorthand quietly undoes `white-space: nowrap` and breaks truncated titles. It also leaves streaming AI text, editors and code blocks alone.
- **Fixes what CSS can't**: keeps "10 GB" together, removes hard `<br>` tags in headings, and replaces old JavaScript balancing libraries. It asks you before changing any copy.

Works with plain CSS, Tailwind, CSS Modules, CSS-in-JS, MUI, shadcn/ui, Webflow, Framer, WordPress, Shopify, SwiftUI, UIKit, Jetpack Compose, React Native and Flutter.

### Install

**Claude Code**

```
/plugin marketplace add BrettfromDJ/skills
/plugin install pretty-text-wrap@designjoy
```

To get updates later:

```
/plugin marketplace update designjoy
```

**Manual (Claude Code)**

Copy the skill folder into your personal skills directory:

```
git clone https://github.com/BrettfromDJ/skills
cp -r skills/plugins/pretty-text-wrap/skills/pretty-text-wrap ~/.claude/skills/
```

Or into one project, so everyone working on it gets the skill: copy it to `.claude/skills/` in that repo and commit it.

**Claude.ai**

Download `pretty-text-wrap.skill` from the [latest release](https://github.com/BrettfromDJ/skills/releases/latest) and upload it as a custom skill in Claude's settings.

### Use it

Just ask:

> Make the text wrap nicely across the whole site.

> Fix the widows on our marketing pages.

> Audit our app for ugly line breaks.

To run the audit yourself on any page, paste [`audit.js`](plugins/pretty-text-wrap/skills/pretty-text-wrap/scripts/audit.js) into the browser console and run `textWrapAudit.run()`. To check many pages at several widths:

```
npm i -D playwright && npx playwright install chromium webkit
node plugins/pretty-text-wrap/skills/pretty-text-wrap/scripts/audit-pages.mjs http://localhost:3000 http://localhost:3000/pricing
```

### Demo

[`demos/pretty-text-wrap.html`](demos/pretty-text-wrap.html) is the before/after animation from the launch video. Open it in a browser. Press H to hide the controls, T to switch theme, R to restart.

## License

MIT
