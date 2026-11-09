# Applying pretty wrapping per stack

Read only the sections that match the project. Each section says where the global baseline goes and how to apply wrap styles at the component level.

Contents
- Plain CSS, Sass, Less, PostCSS
- Tailwind CSS (v3.4+ and v4)
- Tailwind Typography (`prose`)
- CSS Modules, scoped styles (Vue, Svelte, Astro, Angular)
- CSS-in-JS (styled-components, Emotion, vanilla-extract, Stitches/Panda)
- Component libraries (MUI, Chakra, Mantine, shadcn/ui, Radix Themes)
- Inline styles in React/JSX
- Next.js, Remix, Nuxt, SvelteKit, Astro (where the global file lives)
- MDX / Markdown content and docs sites
- CMS and site builders (Webflow, Framer, WordPress, Shopify, Squarespace, Ghost)
- Email (HTML email)
- Generated images (OG / social cards)
- iOS (UIKit, SwiftUI)
- Android (Views, Jetpack Compose)
- React Native
- Flutter
- Electron, Tauri, desktop web views

---

## Plain CSS, Sass, Less, PostCSS

Put the baseline from SKILL.md in the global stylesheet that loads on every page (often `global.css`, `base.css`, `main.scss`, `_base.scss`, `reset.css`). Place it after any reset or normalize file so the reset doesn't clear it.

Component level: add `text-wrap-style: balance;` or `text-wrap-style: pretty;` to the component's class. Sass/Less need nothing special; the property passes through. Some older Stylelint configs flag unknown properties: update `stylelint` or add the property to `property-no-unknown`'s `ignoreProperties`.

## Tailwind CSS

Built-in utilities (v3.4+ and v4): `text-balance`, `text-pretty`, `text-wrap`, `text-nowrap`. They use the `text-wrap` *shorthand* (see css-reference.md section 2): never combine them with `truncate`, `whitespace-nowrap`, or `text-ellipsis` on the same element.

**Tailwind v4** (CSS-first config, `@import "tailwindcss";` in a CSS file): add the baseline to that file in the base layer:

```css
@import "tailwindcss";

@layer base {
  :where(h1, h2, h3, h4, h5, h6, [role="heading"], figcaption, caption,
         legend, dt, summary, th) {
    text-wrap-style: balance;
  }
  :where(p, li, dd, td, label, blockquote) {
    text-wrap-style: pretty;
  }
}
```

Optional longhand utilities that are safe with `truncate`:

```css
@utility wrap-balance { text-wrap-style: balance; }
@utility wrap-pretty  { text-wrap-style: pretty; }
@utility wrap-auto    { text-wrap-style: auto; }
```

**Tailwind v3.4** (`tailwind.config.js`): put the same rules in `@layer base { ... }` inside the CSS file that has `@tailwind base;`. To add safe longhand utilities, use a plugin:

```js
// tailwind.config.js
const plugin = require('tailwindcss/plugin');
module.exports = {
  plugins: [
    plugin(({ addUtilities }) => addUtilities({
      '.wrap-balance': { 'text-wrap-style': 'balance' },
      '.wrap-pretty':  { 'text-wrap-style': 'pretty' },
      '.wrap-auto':    { 'text-wrap-style': 'auto' },
    })),
  ],
};
```

**Tailwind below 3.4**: no built-in utilities. Use the base-layer CSS, or upgrade.

When auditing a Tailwind codebase, search for class strings that contain both a wrap utility and a nowrap utility:

```bash
rg -n "text-(balance|pretty)[^\"'\`]*(truncate|whitespace-nowrap|text-ellipsis)|(truncate|whitespace-nowrap|text-ellipsis)[^\"'\`]*text-(balance|pretty)" --glob '!node_modules'
```

## Tailwind Typography (`prose`)

The plugin styles rich content but doesn't set wrap styles. The base-layer rules already apply inside `prose` because they target elements. To be explicit, or if the base layer isn't used:

```html
<article class="prose prose-headings:text-balance prose-p:text-pretty prose-li:text-pretty">
```

## CSS Modules and scoped styles (Vue, Svelte, Astro, Angular)

Scoped styles can't reach the whole app, so the baseline goes in the global stylesheet:

- Vue/Nuxt: `assets/css/main.css` registered in `nuxt.config` `css: []`, or imported in `main.ts`.
- Svelte/SvelteKit: `src/app.css` imported in the root `+layout.svelte`.
- Astro: a global CSS file imported in the base layout, or `<style is:global>`.
- Angular: `src/styles.css` / `styles.scss` (listed in `angular.json`). Component styles use emulated encapsulation; put component-level wrap styles in the component's own stylesheet.
- CSS Modules (React, Next): the global `.css` imported once at the app root. Component level: add the property to the module class.

## CSS-in-JS

The property is `textWrap` / `textWrapStyle` in object syntax, `text-wrap-style` in template literals.

- **styled-components:** baseline in `createGlobalStyle`, rendered once at the root. Component: `` const Title = styled.h2` text-wrap-style: balance; ` ``
- **Emotion:** `<Global styles={css` ... `} />` at the root. Component: `css={{ textWrapStyle: 'balance' }}`.
- **vanilla-extract:** `globalStyle(':where(h1, h2, h3, h4, h5, h6)', { textWrapStyle: 'balance' })`. If the type definitions reject the property, update `csstype` or use `vars`/`selectors` with a string cast.
- **Stitches / Panda:** add to `globalCss`. In Panda, `textWrap` is supported in recent versions; otherwise use a raw CSS layer.

TypeScript: older `csstype` / `@types/react` versions don't include `textWrap` or `textWrapStyle`. Update them, or cast: `{ textWrapStyle: 'balance' } as React.CSSProperties`.

## Component libraries

Put the wrap style in the library's typography configuration, so every `Typography`/`Text`/`Heading` gets it.

- **MUI:** in `createTheme`, add to typography variants:
  ```js
  typography: {
    h1: { textWrap: 'balance' }, h2: { textWrap: 'balance' }, /* ...h6, subtitle1/2 */
    body1: { textWrap: 'pretty' }, body2: { textWrap: 'pretty' },
  }
  ```
  MUI's `noWrap` prop sets `white-space: nowrap` via a class; check that it still wins (variant styles and `noWrap` are applied in a fixed order; test a long `noWrap` title). Prefer `textWrapStyle` if the project's MUI and browser targets allow it. Also cover `DialogTitle`, `CardHeader`, `Alert`, `Snackbar`, `Tooltip`, which may not use the variants you expect.
- **Chakra UI:** `theme.styles.global` for the baseline; `Heading` and `Text` component theme `baseStyle` for component level.
- **Mantine:** `theme.components.Title.styles` / `Text.styles`, or the global CSS file.
- **shadcn/ui:** components are copied into the repo; edit them directly. Common spots: `card.tsx` (`CardTitle`, `CardDescription`), `dialog.tsx`/`alert-dialog.tsx`/`sheet.tsx`/`drawer.tsx` (titles and descriptions), `alert.tsx`, `toast`/`sonner`, `tooltip.tsx`, `empty` states, `form.tsx` (`FormDescription`, `FormMessage`). Many shadcn titles are `div`s, so the element-based baseline misses them.
- **Radix Themes:** `Heading` and `Text` accept a `wrap` prop in recent versions (`"balance"`, `"pretty"`); otherwise use the global CSS.

## Inline styles in React/JSX

`style={{ textWrapStyle: 'balance' }}`. Use sparingly; it's harder to override and audit than a class. Fine for one-off marketing sections.

## Framework entry points (where the global stylesheet usually is)

- **Next.js App Router:** `app/globals.css`, imported in `app/layout.tsx`. Pages Router: `styles/globals.css` imported in `pages/_app.tsx`.
- **Remix / React Router:** the root stylesheet linked in `app/root.tsx`.
- **Vite + React:** `src/index.css` imported in `main.tsx`.
- **Nuxt:** `css: ['~/assets/css/main.css']` in `nuxt.config`.
- **SvelteKit:** `src/app.css` imported in `src/routes/+layout.svelte`.
- **Astro:** global CSS imported in `src/layouts/*.astro`.
- **Gatsby:** `gatsby-browser.js` import.
- **Eleventy / Hugo / Jekyll:** the main stylesheet in the base layout/template.

## MDX, Markdown, and docs sites

Element selectors in the baseline cover rendered Markdown. Also check:

- **Docusaurus:** `src/css/custom.css`.
- **Nextra / Fumadocs / Mintlify:** the theme's global CSS hook (custom CSS file in config). Mintlify: a `style.css` in the docs root.
- **VitePress:** `.vitepress/theme/custom.css` via `theme/index.ts`.
- **Starlight:** `customCss` in `astro.config`.
- **GitBook / Notion-based sites:** usually no CSS control; skip and note it in the report.

Docs often have long code blocks and API tables: make sure the baseline doesn't touch `pre`/`code` (it doesn't target them) and that table cells with identifiers have `overflow-wrap: anywhere` if they overflow.

## CMS and site builders

- **Webflow:** Site settings → Custom code → Head code, add `<style>` with the baseline. Rich text: the baseline's element selectors reach inside `.w-richtext`. For non-semantic elements (a Text Block used as a heading), either switch the element to the correct tag in the Designer, use the Designer's text wrap setting where available in the Typography panel, or add a class with the rule in custom code. Published-site only: custom code doesn't render in the Designer canvas, so verify on the staging domain.
- **Framer:** Site settings → General → Custom Code → Start of `<head>`, add a `<style>` block. Framer text layers render as `h1`–`h6`/`p` based on the tag set in the text properties; set tags correctly so the baseline applies.
- **WordPress:** block themes: `theme.json` → `styles.css`, or Appearance → Editor → Styles → Additional CSS. Classic themes: the child theme's `style.css` or Customizer → Additional CSS. Page builders (Elementor, Divi): their global custom CSS setting.
- **Shopify:** the theme's base stylesheet (often `assets/base.css`), or a `<style>` in `layout/theme.liquid`. Product descriptions are merchant-entered HTML; the element baseline covers them.
- **Squarespace:** Design → Custom CSS.
- **Ghost:** Code injection → Site header, or the theme's CSS.

For CMS content where widows matter for specific headlines, add a template-level helper instead of editing stored content, for example a Liquid/Nunjucks filter or a React `noWidow()` that replaces the last regular space with `\u00A0` when the final two words are short.

## Email (HTML email)

Most email clients ignore `text-wrap`. Apple Mail and other WebKit-based clients may honor it, so include it inline on headings (`style="text-wrap: balance;"`): it's harmless elsewhere. For widows that matter (the headline, the main CTA sentence), use a non-breaking space between the last two words in the template. For React Email / MJML, add the inline style to the `Heading`/`mj-text` components and use `\u00A0` in strings.

## Generated images (OG / social cards)

- **Satori / `next/og` / `@vercel/og`:** Satori supports `textWrap: 'balance'` in its style objects in recent versions. Add it to the title element. If the installed version ignores it, use a non-breaking space between the last two words or set a `maxWidth` that balances typical titles.
- **Headless Chrome screenshots (Puppeteer/Playwright):** normal CSS applies.
- **Canvas / server-side image libraries / SVG `<text>`:** no automatic wrapping at all. Line breaking is done in code; implement a simple balance (try candidate widths, pick the narrowest that keeps the line count) or at minimum avoid a single-word last line.

## iOS (UIKit and SwiftUI)

Verify these against the current Apple documentation; behavior varies by OS version.

- **UIKit:** `NSParagraphStyle.lineBreakStrategy` controls this. `.pushOut` (iOS 14+) pushes words down from earlier lines to avoid a single-word last line. `UILabel` uses a standard strategy by default that includes push-out behavior in many cases, but `NSAttributedString`s built with a custom `NSMutableParagraphStyle` start from that style's settings. Set `paragraphStyle.lineBreakStrategy = .standard` (or `.pushOut`) explicitly on custom attributed strings, and `label.lineBreakStrategy` on labels.
- **SwiftUI:** `Text` uses the system's standard line breaking. Check whether the current SDK exposes a line-break strategy or balance modifier before building workarounds. Where there isn't one and a specific headline matters, use a non-breaking space between the last two words (`"Ship faster\u{00A0}today"`), or host a `UILabel` via `UIViewRepresentable` for full control. `.multilineTextAlignment(.center)` + a reasonable `.frame(maxWidth:)` gives the most balanced-looking result for centered titles.
- Dynamic Type changes wrapping a lot. Check every fix at the default size, at large accessibility sizes, and at the smallest supported size.

## Android (Views and Jetpack Compose)

Verify against current Android docs; some options depend on API level.

- **Views:** `android:breakStrategy="high_quality"` (API 23+) uses a paragraph-optimizing line breaker; pair with `android:hyphenationFrequency="normal"` for body text. For headings, `balanced` break strategy evens out lines. For CJK, `android:lineBreakWordStyle="phrase"` (API 33+) keeps phrases together.
- **Jetpack Compose:** `TextStyle(lineBreak = LineBreak.Heading)` for balanced headings and short text, `LineBreak.Paragraph` for body text (higher-quality breaking), `LineBreak.Simple` for fast/editable text. Put these in the app's `Typography` so every `Text` with `style = MaterialTheme.typography.headlineMedium` etc. inherits them:
  ```kotlin
  val AppTypography = Typography(
    headlineLarge = Typography().headlineLarge.copy(lineBreak = LineBreak.Heading),
    titleMedium   = Typography().titleMedium.copy(lineBreak = LineBreak.Heading),
    bodyLarge     = Typography().bodyLarge.copy(lineBreak = LineBreak.Paragraph),
    bodyMedium    = Typography().bodyMedium.copy(lineBreak = LineBreak.Paragraph),
  )
  ```
- Check with large font scale settings.

## React Native

- iOS: `lineBreakStrategyIOS="push-out"` (or `"standard"`) on `Text` to avoid single-word last lines.
- Android: `textBreakStrategy="highQuality"` (default in most versions) or `"balanced"` for headings.
- Put them in shared `Heading`/`Body` text components rather than on every `Text`.
- No balance on iOS: use `\u00A0` between the last two words for key headings.

## Flutter

No built-in balance or widow control in `Text` at the time of writing; check the current API. Options: non-breaking spaces (`\u00A0`) in important headings; a small helper that, using `TextPainter`, measures the text at decreasing widths to find the narrowest width that keeps the same line count, then constrains the `Text` to it (a manual balance) for hero titles only.

## Electron, Tauri, and desktop web views

Electron is Chromium (check the bundled version for support). Tauri uses the system web view: WebKit on macOS, WebView2 (Chromium) on Windows, WebKitGTK on Linux. Behavior differs by OS, so audit on each target platform. CSS is applied the same way as on the web.
