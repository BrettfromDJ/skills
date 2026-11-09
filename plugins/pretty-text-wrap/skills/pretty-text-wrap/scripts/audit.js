/**
 * Pretty Text Wrap: runtime audit
 *
 * Measures the actual rendered lines of every text block on the page and
 * reports:
 *   - widow            a single word alone on the last line
 *   - short-last-line  last line much shorter than the longest line
 *   - unbalanced       a short heading-like block with very uneven lines
 * plus coverage: which headings and paragraphs already use balance/pretty.
 *
 * Console:     paste this file, then
 *                textWrapAudit.run()                    // outline issues + log table
 *                textWrapAudit.run({ highlight: false }) // log only
 *                textWrapAudit.focus(0)                  // scroll to issue #0
 *                textWrapAudit.clear()                   // remove outlines
 * Playwright:  see audit-pages.mjs (evaluates this file, then run()).
 *
 * Mark anything to skip with data-text-wrap-audit="ignore".
 * Limitations: does not enter shadow DOM or iframes; content not yet laid out
 * (content-visibility: auto, lazy sections) can't be measured until rendered.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    root: null,                 // defaults to document.body
    widowWords: 1,              // last line with this many words or fewer = widow
    shortLastLineRatio: 0.2,    // last line narrower than 20% of the longest line
    unbalancedRatio: 0.6,       // heading-like: shortest line under 60% of longest
    maxBalanceLines: 6,         // only judge balance for blocks up to this many lines
    maxBlocks: 5000,            // safety cap for huge pages
    highlight: true,
    log: true
  };

  var HEADING_LIKE = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]', 'figcaption', 'caption',
    'legend', 'dt', 'summary', 'th', '[data-text-wrap="balance"]'
  ].join(',');

  var PARAGRAPH_LIKE = ['p', 'li', 'dd', 'td', 'label', 'blockquote'].join(',');

  var SKIP = [
    'script', 'style', 'noscript', 'template', 'pre', 'code', 'kbd', 'samp',
    'textarea', 'input', 'select', 'option', 'svg', 'math', 'canvas',
    '[contenteditable=""]', '[contenteditable="true"]', '[aria-hidden="true"]',
    '[data-text-wrap-audit="ignore"]', '[data-text-wrap-audit-overlay]'
  ].join(',');

  var INLINE_DISPLAYS = { inline: true, contents: true };
  var COLORS = { 'widow': '#e5484d', 'short-last-line': '#f5a524', 'unbalanced': '#8e4ec6' };

  var lastResults = [];

  function wrapStyleOf(cs) {
    return cs.textWrapStyle ||
      cs.getPropertyValue('text-wrap-style') ||
      cs.getPropertyValue('text-wrap') ||
      'unsupported';
  }

  function collectBlocks(root, opts) {
    var styleCache = new Map();
    function style(el) {
      var s = styleCache.get(el);
      if (!s) { s = getComputedStyle(el); styleCache.set(el, s); }
      return s;
    }

    var blocks = new Map(); // block element -> text nodes it lays out
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) {
      // The block that lays out this text is the nearest non-inline ancestor.
      var el = node.parentElement, block = null;
      while (el) {
        if (!INLINE_DISPLAYS[style(el).display]) { block = el; break; }
        el = el.parentElement;
      }
      if (!block) continue;
      if (!blocks.has(block)) {
        if (blocks.size >= opts.maxBlocks) break;
        blocks.set(block, []);
      }
      blocks.get(block).push(node);
    }
    return { blocks: blocks, style: style };
  }

  function measureLines(textNodes) {
    var range = document.createRange();
    var boxes = [];
    for (var i = 0; i < textNodes.length; i++) {
      var tn = textNodes[i], text = tn.nodeValue, re = /\S+/g, m;
      while ((m = re.exec(text))) {
        range.setStart(tn, m.index);
        range.setEnd(tn, m.index + m[0].length);
        var rects = range.getClientRects();
        for (var j = 0; j < rects.length; j++) {
          var r = rects[j];
          if (r.width === 0 || r.height === 0) continue;
          boxes.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, word: m[0] });
        }
      }
    }
    if (!boxes.length) return [];

    boxes.sort(function (a, b) { return (a.top - b.top) || (a.left - b.left); });

    // Group word boxes into lines by vertical overlap.
    var lines = [];
    for (var k = 0; k < boxes.length; k++) {
      var b = boxes[k], line = lines[lines.length - 1], mid = (b.top + b.bottom) / 2;
      if (line && mid > line.top && mid < line.bottom) {
        line.left = Math.min(line.left, b.left);
        line.right = Math.max(line.right, b.right);
        line.top = Math.min(line.top, b.top);
        line.bottom = Math.max(line.bottom, b.bottom);
        line.words.push(b);
      } else {
        lines.push({ top: b.top, bottom: b.bottom, left: b.left, right: b.right, words: [b] });
      }
    }

    return lines.map(function (l) {
      l.words.sort(function (a, b) { return a.left - b.left; });
      return {
        width: l.right - l.left,
        words: l.words.length,
        text: l.words.map(function (w) { return w.word; }).join(' ')
      };
    });
  }

  function selectorFor(el) {
    var parts = [], cur = el;
    for (var depth = 0; cur && cur.nodeType === 1 && cur !== document.documentElement && depth < 4; depth++) {
      var part = cur.tagName.toLowerCase();
      if (cur.id) { parts.unshift(part + '#' + CSS.escape(cur.id)); break; }
      var cls = Array.prototype.filter.call(cur.classList, function (c) {
        return !/^(css|sc|jsx|svelte|emotion|astro)-|^_|__[a-z0-9]{5,}$/i.test(c);
      }).slice(0, 2);
      if (cls.length) part += '.' + cls.map(function (c) { return CSS.escape(c); }).join('.');
      var parent = cur.parentElement;
      if (parent) {
        var tag = cur.tagName;
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === tag; });
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(' > ');
  }

  function snippet(text, max) {
    text = text.replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  function evaluate(el, lines, cs, opts) {
    var widths = lines.map(function (l) { return l.width; });
    var longest = Math.max.apply(null, widths);
    var shortest = Math.min.apply(null, widths);
    var last = lines[lines.length - 1];
    var lastRatio = longest > 0 ? last.width / longest : 1;
    var headingLike = el.matches(HEADING_LIKE);
    var wrapStyle = wrapStyleOf(cs);
    var issues = [];

    if (last.words <= opts.widowWords) issues.push('widow');
    else if (lastRatio < opts.shortLastLineRatio) issues.push('short-last-line');

    if (headingLike && lines.length <= opts.maxBalanceLines && longest > 0 &&
        shortest / longest < opts.unbalancedRatio && issues.indexOf('widow') === -1) {
      issues.push('unbalanced');
    }
    if (!issues.length) return null;

    var recommended = headingLike || (lines.length <= 3 && cs.textAlign === 'center') ? 'balance' : 'pretty';
    var suggestion;
    if (wrapStyle === recommended) {
      suggestion = 'Already ' + wrapStyle + '. Consider a non-breaking space between the last two words, ' +
        'adjusting max-width, or accepting it.';
    } else if (wrapStyle === 'unsupported') {
      suggestion = 'This browser lacks text-wrap support; test in a current Chromium or Safari.';
    } else {
      suggestion = 'Apply text-wrap-style: ' + recommended + '.';
    }

    return {
      element: el,
      selector: selectorFor(el),
      tag: el.tagName.toLowerCase(),
      text: snippet(el.textContent || '', 90),
      issues: issues,
      lines: lines.length,
      lastLine: snippet(last.text, 40),
      lastLineWords: last.words,
      lastLineRatio: Math.round(lastRatio * 100) / 100,
      balanceRatio: longest > 0 ? Math.round((shortest / longest) * 100) / 100 : 1,
      wrapStyle: wrapStyle,
      recommended: recommended,
      suggestion: suggestion
    };
  }

  function clear() {
    var old = document.querySelectorAll('[data-text-wrap-audit-overlay]');
    for (var i = 0; i < old.length; i++) old[i].remove();
  }

  function highlight(results) {
    clear();
    var layer = document.createElement('div');
    layer.setAttribute('data-text-wrap-audit-overlay', '');
    layer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    results.forEach(function (r, i) {
      var box = r.element.getBoundingClientRect();
      var color = COLORS[r.issues[0]] || '#e5484d';
      var o = document.createElement('div');
      o.style.cssText = 'position:absolute;box-sizing:border-box;' +
        'left:' + (box.left + window.scrollX) + 'px;top:' + (box.top + window.scrollY) + 'px;' +
        'width:' + box.width + 'px;height:' + box.height + 'px;' +
        'outline:2px solid ' + color + ';outline-offset:2px;';
      var label = document.createElement('span');
      label.textContent = '#' + i + ' ' + r.issues.join(' + ') + ' · ' + r.wrapStyle;
      label.style.cssText = 'position:absolute;left:-2px;top:-22px;font:600 11px/16px system-ui,sans-serif;' +
        'background:' + color + ';color:#fff;padding:1px 6px;border-radius:3px;white-space:nowrap;';
      o.appendChild(label);
      layer.appendChild(o);
    });
    document.body.appendChild(layer);
  }

  function run(options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    var root = opts.root || document.body;
    clear();

    if (document.fonts && document.fonts.status !== 'loaded') {
      console.warn('[text-wrap-audit] Web fonts are still loading; results may not match what users see. ' +
        'Run again after `await document.fonts.ready`.');
    }

    var collected = collectBlocks(root, opts);
    var results = [];
    var coverage = {
      headings: { total: 0, balance: 0, pretty: 0, other: 0 },
      paragraphs: { total: 0, balance: 0, pretty: 0, other: 0 }
    };
    var gaps = [];
    var measured = 0, multiLine = 0;

    collected.blocks.forEach(function (nodes, el) {
      var cs = collected.style(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      var lines = measureLines(nodes);
      if (!lines.length) return;
      measured++;

      var wrapStyle = wrapStyleOf(cs);
      var bucket = el.matches(HEADING_LIKE) ? 'headings' : el.matches(PARAGRAPH_LIKE) ? 'paragraphs' : null;
      if (bucket) {
        var c = coverage[bucket];
        c.total++;
        if (wrapStyle === 'balance') c.balance++;
        else if (wrapStyle === 'pretty') c.pretty++;
        else {
          c.other++;
          if (gaps.length < 100) {
            gaps.push({ selector: selectorFor(el), tag: el.tagName.toLowerCase(), wrapStyle: wrapStyle,
              expected: bucket === 'headings' ? 'balance' : 'pretty', text: snippet(el.textContent || '', 60) });
          }
        }
      }

      if (lines.length < 2) return;
      multiLine++;
      var r = evaluate(el, lines, cs, opts);
      if (r) results.push(r);
    });

    var byType = {};
    results.forEach(function (r) {
      r.issues.forEach(function (t) { byType[t] = (byType[t] || 0) + 1; });
    });

    lastResults = results;

    var report = {
      url: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      fontsLoaded: !document.fonts || document.fonts.status === 'loaded',
      blocksMeasured: measured,
      multiLineBlocks: multiLine,
      issueCount: results.length,
      byType: byType,
      coverage: coverage,
      coverageGaps: gaps,
      results: results.map(function (r, i) {
        var copy = Object.assign({ index: i }, r);
        delete copy.element;
        return copy;
      })
    };

    if (opts.log) {
      console.log('%cText wrap audit', 'font-weight:bold;font-size:14px',
        '\n' + results.length + ' issue(s) in ' + multiLine + ' multi-line blocks (' + measured + ' measured) at ' +
        window.innerWidth + 'px', byType);
      if (results.length) {
        console.table(report.results.map(function (r) {
          return { '#': r.index, issues: r.issues.join(' + '), tag: r.tag, lines: r.lines,
            lastLine: r.lastLine, wrapStyle: r.wrapStyle, suggestion: r.suggestion, selector: r.selector };
        }));
      }
      console.log('Coverage', coverage);
      if (gaps.length) console.table(gaps);
    }
    if (opts.highlight) highlight(results);
    return report;
  }

  function focus(index) {
    var r = lastResults[index];
    if (!r) return console.warn('[text-wrap-audit] No result #' + index + '. Run textWrapAudit.run() first.');
    r.element.scrollIntoView({ block: 'center' });
    console.log(r.element, r);
    return r.element;
  }

  window.textWrapAudit = { run: run, clear: clear, focus: focus, defaults: DEFAULTS };
})();
