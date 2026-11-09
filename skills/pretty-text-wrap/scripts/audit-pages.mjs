#!/usr/bin/env node
/**
 * Pretty Text Wrap: multi-page audit runner
 *
 * Runs audit.js on every URL at every width in every browser and writes a JSON
 * report, plus a summary of the elements that misbehave most often.
 *
 * Usage:
 *   node audit-pages.mjs <url> [url...] [options]
 *
 * Options:
 *   --widths=375,768,1280,1920     viewport widths to test (default shown)
 *   --browsers=chromium,webkit     any of chromium, webkit, firefox (default shown)
 *   --out=text-wrap-report.json    where to write the full report
 *   --screenshots=<dir>            also save full-page screenshots with issues outlined
 *   --wait=<ms>                    extra wait after load, for animations (default 300)
 *
 * Setup (once):
 *   npm i -D playwright && npx playwright install chromium webkit
 *
 * Compare runs: write --out=before.json, make changes, write --out=after.json.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=')];
  })
);
const urls = args.filter((a) => !a.startsWith('--'));

if (!urls.length || 'help' in flags) {
  console.log('Usage: node audit-pages.mjs <url> [url...] [--widths=375,768,1280,1920] ' +
    '[--browsers=chromium,webkit] [--out=text-wrap-report.json] [--screenshots=dir] [--wait=300]');
  process.exit(urls.length ? 0 : 1);
}

const widths = (flags.widths || '375,768,1280,1920').split(',').map(Number).filter(Boolean);
const browsers = (flags.browsers || 'chromium,webkit').split(',').map((s) => s.trim()).filter(Boolean);
const out = flags.out || 'text-wrap-report.json';
const shotsDir = flags.screenshots || '';
const extraWait = Number(flags.wait ?? 300);

const here = path.dirname(fileURLToPath(import.meta.url));
const auditSource = await readFile(path.join(here, 'audit.js'), 'utf8');

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.error('Playwright is not installed. Run:\n  npm i -D playwright && npx playwright install chromium webkit');
  process.exit(1);
}

if (shotsDir) await mkdir(shotsDir, { recursive: true });

const runs = [];
for (const name of browsers) {
  if (!playwright[name]) {
    console.error(`Unknown browser "${name}". Use chromium, webkit, or firefox.`);
    continue;
  }
  let browser;
  try {
    browser = await playwright[name].launch();
  } catch (e) {
    console.error(`Could not launch ${name}: ${e.message.split('\n')[0]}\n  Try: npx playwright install ${name}`);
    continue;
  }

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        if (extraWait) await page.waitForTimeout(extraWait);

        // page.evaluate isn't subject to the page's Content Security Policy.
        await page.evaluate(auditSource);
        const report = await page.evaluate((hl) => window.textWrapAudit.run({ highlight: hl, log: false }),
          Boolean(shotsDir));

        if (shotsDir) {
          const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page';
          await page.screenshot({ path: path.join(shotsDir, `${slug}__${name}__${width}.png`), fullPage: true });
        }

        runs.push({ browser: name, width, ...report });
        const types = Object.entries(report.byType).map(([k, v]) => `${k}:${v}`).join(' ') || 'clean';
        console.log(`${name.padEnd(9)}${String(width).padStart(5)}px  ${String(report.issueCount).padStart(3)} issue(s)  ${types.padEnd(40)} ${url}`);
      } catch (e) {
        console.error(`${name} ${width}px ${url}: ${e.message.split('\n')[0]}`);
        runs.push({ browser: name, width, url, error: e.message.split('\n')[0] });
      }
    }
    await context.close();
  }
  await browser.close();
}

// Elements that misbehave across several widths/browsers are usually the
// highest-value fixes (one component, many instances).
const recurring = new Map();
for (const run of runs) {
  for (const r of run.results || []) {
    const key = `${new URL(run.url).pathname} :: ${r.selector}`;
    const entry = recurring.get(key) || { page: new URL(run.url).pathname, selector: r.selector, text: r.text,
      hits: 0, where: new Set(), issues: new Set(), wrapStyle: r.wrapStyle, suggestion: r.suggestion };
    entry.hits++;
    entry.where.add(`${run.browser}@${run.width}`);
    r.issues.forEach((i) => entry.issues.add(i));
    recurring.set(key, entry);
  }
}
const top = [...recurring.values()]
  .sort((a, b) => b.hits - a.hits)
  .map((e) => ({ ...e, where: [...e.where], issues: [...e.issues] }));

const totals = runs.reduce((acc, r) => {
  acc.issues += r.issueCount || 0;
  for (const k of ['headings', 'paragraphs']) {
    const c = r.coverage?.[k];
    if (!c) continue;
    acc[k].total += c.total;
    acc[k].covered += k === 'headings' ? c.balance : c.pretty;
  }
  return acc;
}, { issues: 0, headings: { total: 0, covered: 0 }, paragraphs: { total: 0, covered: 0 } });

const pct = (c) => (c.total ? Math.round((c.covered / c.total) * 100) : 100);
const summary = {
  generatedAt: new Date().toISOString(),
  pages: urls.length,
  widths,
  browsers,
  totalIssues: totals.issues,
  headingBalanceCoverage: `${pct(totals.headings)}%`,
  paragraphPrettyCoverage: `${pct(totals.paragraphs)}%`,
};

await writeFile(out, JSON.stringify({ summary, recurring: top, runs }, null, 2));

console.log('\n── Summary ──');
console.log(`Total issues: ${summary.totalIssues} across ${runs.length} page renders`);
console.log(`Headings using balance:   ${summary.headingBalanceCoverage}`);
console.log(`Paragraphs using pretty:  ${summary.paragraphPrettyCoverage}`);
if (top.length) {
  console.log('\nMost frequent problem elements:');
  for (const e of top.slice(0, 15)) {
    console.log(`  ${String(e.hits).padStart(3)}×  ${e.issues.join('+').padEnd(26)} ${e.page}  ${e.selector}\n` +
      `        "${e.text}"  [${e.wrapStyle}] ${e.suggestion}`);
  }
}
console.log(`\nFull report: ${out}${shotsDir ? `\nScreenshots: ${shotsDir}/` : ''}`);
