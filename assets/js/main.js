/* ============================================================
   SAINTS 2027 — interface behaviour
   Menus, sticky nav state, scroll reveal, countdown, count-up,
   the speaker rail and the photo lightbox.
   Content is filled in by backend.js.
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Dropdowns: open on click, or on hover with a mouse ── */
  const items = $$('.nav-item');
  const setOpen = (item, open) => {
    item.classList.toggle('open', open);
    const btn = $('button.nav-link', item);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  };
  const closeAll = except => items.forEach(i => { if (i !== except) setOpen(i, false); });
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  items.forEach(item => {
    const btn = $('button.nav-link', item);
    if (!btn) return;
    btn.addEventListener('click', () => { const open = !item.classList.contains('open'); closeAll(item); setOpen(item, open); });
    if (canHover) {
      item.addEventListener('mouseenter', () => { closeAll(item); setOpen(item, true); });
      item.addEventListener('mouseleave', () => setOpen(item, false));
    }
    // A chosen link closes the menu (links are re-rendered by backend.js, so delegate)
    item.addEventListener('click', e => { if (e.target.closest('.dropdown-menu a')) setOpen(item, false); });
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) setOpen(item, false); });
    item.addEventListener('keydown', e => { if (e.key === 'Escape' && item.classList.contains('open')) { setOpen(item, false); btn.focus(); } });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeAll(); });

  /* ── Mobile menu ─────────────────────────────────────── */
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('mobile-menu');
  const setMenu = open => {
    if (!toggle || !panel) return;
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    // keep the whole panel on screen: bring the sticky bar to the top first
    if (open && nav && nav.getBoundingClientRect().top > 1) nav.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  if (toggle && panel) {
    toggle.addEventListener('click', () => setMenu(!panel.classList.contains('open')));
    panel.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ── Sticky nav: shadow and compact logo once it is stuck ── */
  if (nav && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;margin-bottom:-1px;';
    nav.parentNode.insertBefore(sentinel, nav);
    new IntersectionObserver(([en]) => nav.classList.toggle('is-stuck', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(sentinel);
  }

  /* ── Mark the nav link for the section in view ───────── */
  const links = $$('a.nav-link[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const match = links.find(l => l.getAttribute('href') === '#' + en.target.id);
        if (!match) return;
        links.forEach(l => l.classList.toggle('active', l === match));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  /* ── Reveal on scroll (static markup; backend.js reveals what it renders) ── */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(n => ro.observe(n));
  } else {
    revealEls.forEach(n => n.classList.add('is-in'));
  }

  /* ── Countdown to 9:00 IST on the first day (backend.js updates data-start/end) ── */
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    $$('[data-countdown]').forEach(box => {
      const start = new Date(box.dataset.start + 'T09:00:00+05:30');
      const end = new Date((box.dataset.end || box.dataset.start) + 'T23:59:59+05:30');
      if (isNaN(start)) return;
      const now = Date.now();
      const label = $('[data-cd-label]', box.parentNode);
      const diff = Math.max(0, start - now);
      const set = (k, v) => { const n = $('[data-cd="' + k + '"]', box); if (n) n.textContent = v; };
      set('d', pad(Math.floor(diff / 864e5)));
      set('h', pad(Math.floor(diff / 36e5) % 24));
      set('m', pad(Math.floor(diff / 6e4) % 60));
      set('s', pad(Math.floor(diff / 1e3) % 60));
      if (label) label.textContent = diff > 0 ? 'Conference opens in' : now <= end ? 'The conference is under way' : 'The conference has concluded';
      box.hidden = diff <= 0;
    });
  }
  if ($('[data-countdown]')) { tick(); setInterval(tick, 1000); }

  /* ── Count-up for the figures band ───────────────────── */
  function countUp(n) {
    const target = parseInt(n.textContent, 10);
    const suffix = n.dataset.suffix || '';
    if (!target || reduced) return;
    const t0 = performance.now(), dur = 1100;
    n.dataset.counting = '1';
    (function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const final = parseInt(n.dataset.final || target, 10);   // backend.js may raise the figure mid-count
      n.textContent = Math.round(final * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(frame); else { n.textContent = final + suffix; delete n.dataset.counting; }
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(n => co.observe(n));
  }

  /* ── Speaker rail: arrow buttons scroll one "page" ───── */
  function rail() {
    const track = $('.spk-rail');
    const prev = $('[data-rail="prev"]'), next = $('[data-rail="next"]');
    if (!track || !prev || !next) return;
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    if (!track.dataset.wired) {
      track.dataset.wired = '1';
      const step = dir => track.scrollBy({ left: dir * Math.max(240, track.clientWidth * 0.8), behavior: reduced ? 'auto' : 'smooth' });
      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      track.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
    }
    sync();
  }

  /* ── Lightbox for gallery photos ─────────────────────── */
  const box = document.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    const img = $('img', box), cap = $('p', box);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[data-lightbox]');
      if (!a) return;
      e.preventDefault();
      img.src = a.href; img.alt = a.dataset.caption || '';
      cap.textContent = a.dataset.caption || '';
      box.showModal();
    });
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lightbox-close')) box.close(); });
    box.addEventListener('close', () => { img.removeAttribute('src'); });
  }

  window.SAINTS = { rail };
  rail();
})();
