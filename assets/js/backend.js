/* ============================================================
   SAINTS 2027 — Backend loader
   File: assets/js/backend.js

   The Google Sheet is the backend. Each tab is read as CSV and
   rendered into the page. Static markup in the HTML is the
   fallback: if the sheet can't be reached, the page keeps it.

   Rules
   - Tabs with a *_status column only show rows where status = "active".
   - `footer_right_text` is deliberately ignored (the footer credit stays as written in the HTML).
   - Plain values are inserted as text; the few cells that hold HTML
     (messages, steps, FAQ answers) go through sanitize() first.
   ============================================================ */
(function () {
  'use strict';

  const SHEET_ID = '1T8OY51wObS-MhN7tSpAHnSGPJ143aYBVnnUFK51E2jU';
  const CACHE_MS = 5 * 60 * 1000;
  const IGNORED_OPTIONS = ['footer_right_text'];

  /* ── CSV ───────────────────────────────────────────────── */
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function toObjects(csv) {
    const rows = parseCSV(csv);
    if (!rows.length) return [];
    const head = rows[0].map(h => h.trim());
    return rows.slice(1)
      .map(r => { const o = {}; head.forEach((h, i) => { if (h) o[h] = (r[i] || '').trim(); }); return o; })
      .filter(o => Object.values(o).some(v => v !== ''));
  }

  /* ── Fetch with a short session cache ──────────────────── */
  async function tab(name) {
    const key = 'saints:' + name;
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (hit && Date.now() - hit.t < CACHE_MS) return hit.rows;
    } catch (e) { /* storage unavailable */ }

    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(name);
    const res = await fetch(url);
    if (!res.ok) throw new Error(name + ': HTTP ' + res.status);
    let rows = toObjects(await res.text());

    // honour *_status columns
    const statusKey = rows[0] && Object.keys(rows[0]).find(k => /_status$/.test(k));
    if (statusKey) rows = rows.filter(r => r[statusKey].toLowerCase() === 'active');

    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), rows })); } catch (e) { /* ignore */ }
    return rows;
  }

  const safe = name => tab(name).catch(err => { console.warn('[backend]', err.message); return null; });

  /* ── Helpers ───────────────────────────────────────────── */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const isHttp = u => /^https?:\/\//i.test(u || '');

  // Allow only a small set of inline tags; links must be http(s).
  const ALLOWED = { A: 1, STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, U: 1 };
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    (function walk(node) {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 8) { ch.remove(); return; }
        if (ch.nodeType !== 1) return;
        if (!ALLOWED[ch.tagName]) { ch.replaceWith(...Array.from(ch.childNodes)); return; }
        Array.from(ch.attributes).forEach(a => {
          const keep = ch.tagName === 'A' && (a.name === 'href' || a.name === 'target');
          if (!keep) ch.removeAttribute(a.name);
        });
        if (ch.tagName === 'A') {
          if (!isHttp(ch.getAttribute('href'))) ch.removeAttribute('href');
          ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener');
          ch.classList.add('inline-link');
        }
        walk(ch);
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  // **bold** (used in some FAQ answers) → <strong>, then sanitise
  const richText = s => sanitize(s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function parseDate(s) {
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);          // M/D/YYYY (sheet format)
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  function formatRange(a, b) {
    const s = parseDate(a), e = b ? parseDate(b) : null;
    if (!s) return a;
    const f = d => d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (!e) return f(s);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
      return s.getDate() + '–' + f(e);
    return f(s) + ' – ' + f(e);
  }
  const money = (v, fallback) => {
    if (v === '' || v == null) return fallback;
    const n = Number(String(v).replace(/,/g, ''));
    return isNaN(n) ? v : '₹' + n.toLocaleString('en-IN');
  };

  function reveal(node) { // keep the page's scroll-reveal working for injected nodes
    $$('[data-reveal]', node).forEach(n => n.classList.add('is-in'));
    if (node.hasAttribute && node.hasAttribute('data-reveal')) node.classList.add('is-in');
  }
  function show(section) {
    if (!section) return;
    section.hidden = false;
    $$('[data-needs="' + section.id + '"]').forEach(a => { a.hidden = false; });
  }

  /* ── 1. site_options ───────────────────────────────────── */
  function applySiteOptions(rows) {
    const o = {};
    rows.forEach(r => { if (IGNORED_OPTIONS.indexOf(r.option_key) < 0) o[r.option_key] = r.option_value; });
    const fill = s => (s || '').replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
    const usable = v => v && isHttp(v) ? true : false;
    const real = v => v && !/^YOUR_|will be updated/i.test(v);

    const meta = (attr, name, value) => {
      if (!real(value)) return;
      let m = $('meta[' + attr + '="' + name + '"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); }
      m.setAttribute('content', value);
    };
    const link = (rel, value, extra) => {
      if (!usable(value)) return;
      let l = $('link[rel="' + rel + '"]' + (extra && extra.sizes ? '[sizes="' + extra.sizes + '"]' : ''));
      if (!l) { l = document.createElement('link'); l.rel = rel; if (extra && extra.sizes) l.sizes = extra.sizes; document.head.appendChild(l); }
      l.href = value; if (extra && extra.type) l.type = extra.type;
    };

    if (real(o.seo_title)) document.title = fill(o.seo_title);
    meta('name', 'description', o.seo_description);
    meta('name', 'keywords', o.seo_keywords);
    meta('name', 'author', o.seo_author);
    meta('name', 'robots', o.seo_robots);
    meta('property', 'og:title', fill(o.og_title));
    meta('property', 'og:description', fill(o.og_description));
    meta('property', 'og:type', o.og_type);
    meta('property', 'og:site_name', o.og_site_name);
    meta('property', 'og:locale', o.og_locale);
    if (usable(o.og_image)) meta('property', 'og:image', o.og_image);
    meta('name', 'twitter:card', o.twitter_card);
    meta('name', 'twitter:title', fill(o.twitter_title));
    meta('name', 'twitter:description', fill(o.twitter_description));
    if (usable(o.twitter_image)) meta('name', 'twitter:image', o.twitter_image);
    meta('name', 'twitter:site', o.twitter_site);
    meta('name', 'twitter:creator', o.twitter_creator);
    meta('name', 'google-site-verification', o.google_site_verification);
    meta('name', 'msvalidate.01', o.bing_site_verification);
    if (usable(o.canonical_url)) link('canonical', o.canonical_url);
    link('icon', o.favicon);
    link('icon', o.favicon_16x16, { sizes: '16x16', type: 'image/png' });
    link('icon', o.favicon_32x32, { sizes: '32x32', type: 'image/png' });
    link('apple-touch-icon', o.apple_touch_icon);
    link('manifest', o.favicon_manifest);

    // Logos
    $$('[data-site-img]').forEach(img => {
      const v = o[img.dataset.siteImg];
      if (usable(v)) { img.src = v; if (o.site_fullname) img.alt = o.site_fullname; }
    });
    // Text
    $$('[data-site-text]').forEach(n => {
      const v = o[n.dataset.siteText];
      if (v) n.innerHTML = sanitize(fill(v));
    });
  }

  /* ── 2. important_dates → Key dates ────────────────────── */
  function renderDates(rows) {
    const list = $('[data-sheet="important_dates"]');
    if (!list || !rows.length) return;
    list.innerHTML = '';
    rows.forEach((r, i) => {
      const li = el('li', 'date-item');
      li.setAttribute('data-reveal', ''); li.style.setProperty('--d', (i % 2) * 100 + 'ms');
      li.append(el('p', 'date-label', r.imp_date_title),
                el('p', 'date-value', formatRange(r.imp_date_start_display, r.imp_date_end_display)));
      list.appendChild(li);
    });
    reveal(list);
  }

  /* ── 3. speakers → per track ───────────────────────────── */
  function renderSpeakers(rows) {
    if (!rows.length) return;
    const byTrack = {};
    rows.forEach(r => (byTrack[r.speaker_track] = byTrack[r.speaker_track] || []).push(r));
    $$('[data-speakers-track]').forEach(box => {
      const list = byTrack[box.dataset.speakersTrack] || [];
      if (!list.length) return;
      box.innerHTML = '';
      list.forEach(s => {
        const card = el('article', 'speaker');
        const ph = el('div', 'speaker-photo');
        if (isHttp(s.speaker_image)) {
          const img = el('img'); img.src = s.speaker_image; img.alt = s.speaker_fullname; img.loading = 'lazy';
          ph.appendChild(img);
        }
        const txt = el('div', 'speaker-text');
        if (s.speaker_category) txt.appendChild(el('p', 'speaker-cat', s.speaker_category));
        txt.append(el('h4', 'speaker-name', s.speaker_fullname), el('p', 'speaker-aff', s.speaker_affiliation));
        card.append(ph, txt);
        box.appendChild(card);
      });
    });
    $$('[data-hide-when="speakers"]').forEach(n => { n.hidden = true; });
  }

  /* ── 4. schedule → embeds per track ────────────────────── */
  function renderSchedule(rows) {
    const box = $('[data-sheet="schedule"]');
    const embeds = rows.filter(r => isHttp(r.schedule_embed_url));
    if (!box || !embeds.length) return;
    box.innerHTML = '';
    embeds.forEach(r => {
      const wrap = el('div', 'schedule-embed');
      wrap.appendChild(el('h3', 'schedule-embed-title', 'Track ' + r.schedule_for_track));
      const f = el('iframe'); f.src = r.schedule_embed_url; f.loading = 'lazy';
      f.title = 'Schedule, Track ' + r.schedule_for_track;
      wrap.appendChild(f); box.appendChild(wrap);
    });
    $$('[data-hide-when="schedule"]').forEach(n => { n.hidden = true; });
  }

  /* ── 5. gallery_images ─────────────────────────────────── */
  function renderGallery(rows) {
    const box = $('[data-sheet="gallery_images"]');
    const items = rows.filter(r => isHttp(r.image_url));
    if (!box || !items.length) return;
    box.innerHTML = '';
    items.forEach(r => {
      const fig = el('figure', 'gal');
      const img = el('img'); img.src = r.image_url; img.alt = r.image_title; img.loading = 'lazy';
      fig.append(img);
      if (r.image_title) fig.appendChild(el('figcaption', null, r.image_title));
      box.appendChild(fig);
    });
    $$('[data-hide-when="gallery_images"]').forEach(n => { n.hidden = true; });
  }

  /* ── 6. welcome_messages ───────────────────────────────── */
  function renderWelcome(rows) {
    const box = $('[data-sheet="welcome_messages"]');
    if (!box || !rows.length) return;
    box.innerHTML = '';
    rows.forEach((r, i) => {
      const card = el('article', 'msg'); card.setAttribute('data-reveal', ''); card.style.setProperty('--d', i * 100 + 'ms');
      const body = el('div', 'msg-body'); body.innerHTML = sanitize(r.welcome_message_text);
      const by = el('footer', 'msg-by');
      if (isHttp(r.welcome_message_image)) {
        const img = el('img'); img.src = r.welcome_message_image; img.alt = r.welcome_message_by; img.loading = 'lazy';
        by.appendChild(img);
      }
      const who = el('div');
      who.append(el('p', 'msg-name', r.welcome_message_by));
      const sub = [r.welcome_message_role, r.welcome_message_designation, r.welcome_message_institute].filter(Boolean).join(' · ');
      who.appendChild(el('p', 'msg-role', sub));
      by.appendChild(who); card.append(body, by); box.appendChild(card);
    });
    reveal(box); show(box.closest('section'));
  }

  /* ── 7. organizing_committee (grouped by role, sheet order) ─ */
  function renderCommittee(rows) {
    const box = $('[data-sheet="organizing_committee"]');
    if (!box || !rows.length) return;
    box.innerHTML = '';
    const groups = new Map();
    rows.forEach(r => { const k = r.member_role || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    groups.forEach((members, role) => {
      const g = el('div', 'cm-group'); g.setAttribute('data-reveal', '');
      if (role) g.appendChild(el('h3', 'cm-role', role));
      const ul = el('ul', 'cm-list');
      members.forEach(m => {
        const li = el('li', 'cm-member' + (isHttp(m.member_image) ? ' cm-with-photo' : ''));
        if (isHttp(m.member_image)) {
          const img = el('img'); img.src = m.member_image; img.alt = m.member_fullname; img.loading = 'lazy'; li.appendChild(img);
        }
        const t = el('div');
        t.appendChild(el('p', 'cm-name', m.member_fullname));
        if (m.member_designation) t.appendChild(el('p', 'cm-desig', m.member_designation));
        li.appendChild(t); ul.appendChild(li);
      });
      g.appendChild(ul); box.appendChild(g);
    });
    reveal(box); show(box.closest('section'));
  }

  /* ── 8. places_to_visit ────────────────────────────────── */
  function renderPlaces(rows) {
    const box = $('[data-sheet="places_to_visit"]');
    if (!box || !rows.length) return;
    box.innerHTML = '';
    rows.forEach((r, i) => {
      const a = el(isHttp(r.ptv_link) ? 'a' : 'div', 'place');
      if (isHttp(r.ptv_link)) { a.href = r.ptv_link; a.target = '_blank'; a.rel = 'noopener'; }
      a.setAttribute('data-reveal', ''); a.style.setProperty('--d', (i % 4) * 70 + 'ms');
      if (isHttp(r.ptv_image)) { const img = el('img'); img.src = r.ptv_image; img.alt = ''; img.loading = 'lazy'; a.appendChild(img); }
      const cap = el('div', 'place-cap'); cap.appendChild(el('h3', null, r.ptv_title));
      if (r.ptv_desc) cap.appendChild(el('p', null, r.ptv_desc));
      a.appendChild(cap); box.appendChild(a);
    });
    reveal(box); show(box.closest('section'));
  }

  /* ── 9. faqs (rows without a question are skipped) ─────── */
  function renderFaqs(rows) {
    const box = $('[data-sheet="faqs"]');
    const items = rows.filter(r => r.faq_question);
    if (!box || !items.length) return;
    box.innerHTML = '';
    items.forEach((r, i) => {
      const d = el('details', 'faq'); d.setAttribute('data-reveal', '');
      if (i === 0) d.open = true;
      d.appendChild(el('summary', null, r.faq_question));
      const a = el('div', 'faq-a'); a.innerHTML = richText(r.faq_answer); d.appendChild(a);
      box.appendChild(d);
    });
    reveal(box); show(box.closest('section'));
  }

  /* ── 10. registration_fee ──────────────────────────────── */
  function renderFees(rows) {
    const box = $('[data-sheet="registration_fee"]');
    if (!box || !rows.length) return;
    box.innerHTML = '';
    rows.forEach((r, i) => {
      const f = el('div', 'fee'); f.setAttribute('data-reveal', ''); f.style.setProperty('--d', (i % 4) * 70 + 'ms');
      f.appendChild(el('h3', null, r.reg_category));
      const dl = el('dl');
      [['Early bird', r.reg_fee_early_bird], ['Regular', r.reg_fee_regular]].forEach(([k, v]) => {
        const row = el('div'); row.append(el('dt', null, k), el('dd', null, money(v, 'TBA'))); dl.appendChild(row);
      });
      f.appendChild(dl); box.appendChild(f);
    });
    reveal(box);
  }

  /* ── 11. registration_steps ────────────────────────────── */
  function renderSteps(rows) {
    const box = $('[data-sheet="registration_steps"]');
    if (!box || !rows.length) return;
    box.innerHTML = '';
    rows.forEach((r, i) => {
      const li = el('li', 'step'); li.setAttribute('data-reveal', '');
      li.appendChild(el('span', 'step-n', String(i + 1)));
      const body = el('div', 'step-body');
      const t = el('p', 'step-title'); t.innerHTML = sanitize(r.reg_step_title); body.appendChild(t);
      if (r.reg_step_description) { const d = el('p', 'step-desc'); d.innerHTML = sanitize(r.reg_step_description); body.appendChild(d); }
      if (isHttp(r.reg_step_screenshot)) {
        const img = el('img', 'step-shot'); img.src = r.reg_step_screenshot; img.alt = 'Step ' + (i + 1) + ' screenshot'; img.loading = 'lazy'; body.appendChild(img);
      }
      li.appendChild(body); box.appendChild(li);
    });
    reveal(box); show(box.closest('section'));
  }

  /* ── Boot ──────────────────────────────────────────────── */
  const jobs = [
    ['site_options', applySiteOptions], ['important_dates', renderDates], ['speakers', renderSpeakers],
    ['schedule', renderSchedule], ['gallery_images', renderGallery], ['welcome_messages', renderWelcome],
    ['organizing_committee', renderCommittee], ['places_to_visit', renderPlaces], ['faqs', renderFaqs],
    ['registration_fee', renderFees], ['registration_steps', renderSteps],
  ];

  function boot() {
    jobs.forEach(([name, render]) => {
      // only fetch tabs this page can show
      const used = name === 'site_options' || document.querySelector('[data-sheet="' + name + '"]') ||
        (name === 'speakers' && document.querySelector('[data-speakers-track]'));
      if (!used) return;
      safe(name).then(rows => { if (rows) { try { render(rows); } catch (e) { console.warn('[backend]', name, e); } } });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
