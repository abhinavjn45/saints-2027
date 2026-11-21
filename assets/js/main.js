/* ============================================================
   SAINTS 2027 — Main JavaScript
   File: assets/js/main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  if (location.pathname === '/' && location.hash === '#hero') {
    history.replaceState(history.state, '', '/' + location.search);
  }

  const root      = document.documentElement;
  const header    = document.getElementById('main-header');
  const headerTop = document.getElementById('header-top');
  const navbar    = document.getElementById('navbar');
  const hero      = document.getElementById('hero') || document.getElementById('page-hero');
  const progress  = document.getElementById('scroll-progress');


  /* ── 1. Measure header — NEVER during scroll ─────────────
     --collapse-y : distance the top block slides up
     hero padding : full (expanded) header height            */
  function measure() {
    const collapse = headerTop.offsetHeight;
    root.style.setProperty('--collapse-y', collapse + 'px');
    if (hero) hero.style.paddingTop = (collapse + navbar.offsetHeight) + 'px';
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(headerTop);


  /* ── 2. Scroll: one rAF-batched, transform-only update ───
     Hysteresis stops the header flickering around thresholds. */
  const COLLAPSE_AT   = 16;   // px scrolled before it may collapse (first wheel notch triggers it)
  const DOWN_DISTANCE = 3;    // px of continuous down-scroll to collapse
  const UP_DISTANCE   = 28;   // px of continuous up-scroll to restore

  let lastY = window.scrollY;
  let travelled = 0;
  let collapsed = false;
  let ticking = false;
  let maxScroll = 1;

  const calcMax = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  calcMax();
  window.addEventListener('resize', calcMax);
  window.addEventListener('load', calcMax);

  function setCollapsed(v) {
    if (v === collapsed) return;
    collapsed = v;
    header.classList.toggle('is-collapsed', v);
  }

  function frame() {
    ticking = false;
    const y  = Math.max(0, window.scrollY);
    const dy = y - lastY;

    if (progress) progress.style.transform = 'scaleX(' + Math.min(1, y / maxScroll) + ')';

    if (y <= 8) {
      setCollapsed(false);
      travelled = 0;
    } else if (dy !== 0) {
      // reset accumulator whenever direction flips
      if ((dy > 0) !== (travelled > 0)) travelled = 0;
      travelled += dy;

      if (travelled > DOWN_DISTANCE && y > COLLAPSE_AT) setCollapsed(true);
      else if (travelled < -UP_DISTANCE) setCollapsed(false);
    }
    lastY = y;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();


  /* ── 3. Topbar dismiss ───────────────────────────────── */
  const topbar = document.getElementById('topbar');
  const closeBtn = document.getElementById('topbar-close');
  if (topbar && closeBtn) {
    closeBtn.addEventListener('click', () => {
      topbar.style.height = topbar.offsetHeight + 'px';
      void topbar.offsetHeight;
      topbar.classList.add('is-closed');
      topbar.style.height = '0px';
      topbar.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'height') { topbar.style.display = 'none'; measure(); }
      });
    });
  }


  /* ── 4. Active nav link via IntersectionObserver ───────── */
  const navLinks = document.querySelectorAll('a.nav-link');
  const sections = document.querySelectorAll('section[id]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        const href = id === 'hero' ? '/' : '#' + id;
        const match = document.querySelector('a.nav-link[href="' + href + '"]');
        if (!match) return;
        navLinks.forEach(l => l.classList.remove('active'));
        match.classList.add('active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => io.observe(s));
  }


  /* ── 4b. Desktop dropdowns close once a link is chosen ────
     They open on hover or keyboard focus. After a click the pointer is
     still over the menu and the link keeps focus, so close it explicitly
     and let it open again the next time the pointer comes back. */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-menu a')) return;
      item.classList.add('is-closed');
      if (document.activeElement && item.contains(document.activeElement)) document.activeElement.blur();
    });
    item.addEventListener('mouseleave', () => {
      item.classList.remove('is-closed');
      if (document.activeElement && item.contains(document.activeElement)) document.activeElement.blur();
    });
  });


  /* ── 5. Mobile menu ────────────────────────────────────── */
  const mobileBtn  = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  function setMenu(open) {
    mobileMenu.classList.toggle('open', open);
    mobileBtn.setAttribute('aria-expanded', String(open));
    if (open) setCollapsed(collapsed); // no-op, keeps state stable
  }
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  }


  /* ── 6. Mobile accordion ───────────────────────────────── */
  document.querySelectorAll('.mobile-accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      const open = !target.classList.contains('open');
      document.querySelectorAll('.mobile-submenu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.mobile-accordion-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (open) {
        target.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });


  /* ── 7. Reveal-on-scroll for page sections ─────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => ro.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }


  /* ── 8. Countdown to conference start ──────────────────── */
  const cd = document.getElementById('countdown');
  if (cd) {
    const FALLBACK = '2027-01-06T09:00:00+05:30';   // overridden by backend.js from the sheet (data-target)
    const parts = {
      d: cd.querySelector('[data-cd="d"]'), h: cd.querySelector('[data-cd="h"]'),
      m: cd.querySelector('[data-cd="m"]'), s: cd.querySelector('[data-cd="s"]'),
    };
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const diff = Math.max(0, new Date(cd.dataset.target || FALLBACK).getTime() - Date.now());
      parts.d.textContent = pad(Math.floor(diff / 864e5));
      parts.h.textContent = pad(Math.floor(diff / 36e5) % 24);
      parts.m.textContent = pad(Math.floor(diff / 6e4) % 60);
      parts.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

});

/* Academic partners: show ~3 rows, expand/collapse with a smooth height transition */
(function () {
  var grid = document.getElementById('pub-academic-grid');
  var btn = document.querySelector('.pub-more');
  if (!grid || !btn) return;
  var total = grid.children.length;
  var COLLAPSED = 364;          /* keep in sync with .pub-academic.is-collapsed */
  var MARGIN_SHIFT = 38;        /* button margin-top: 20px (open) -> -18px (closed) */
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  grid.classList.add('is-anim', 'is-collapsed');
  btn.hidden = false;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* Animate grid height + button margin together (same timing both ways). */
  function animate(h0, h1, m0, m1, endTop, startTop) {
    var t0 = null;
    grid.style.transitionProperty = '--pub-fade'; btn.style.transition = 'none';
    grid.style.maxHeight = h0 + 'px'; btn.style.marginTop = m0 + 'px';
    function done() {
      grid.style.maxHeight = grid.classList.contains('is-collapsed') ? '' : 'none';
      btn.style.marginTop = ''; btn.style.transition = ''; grid.style.transitionProperty = '';
    }
    if (still) { done(); return; }
    requestAnimationFrame(function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 550, 1), e = ease(p);
      grid.style.maxHeight = (h0 + (h1 - h0) * e) + 'px';
      btn.style.marginTop = (m0 + (m1 - m0) * e) + 'px';
      if (endTop !== null) {  /* keep the button gliding to a fixed spot; page has scroll-behavior:smooth, so force instant */
        window.scrollBy({ top: btn.getBoundingClientRect().top - (startTop + (endTop - startTop) * e), behavior: 'instant' });
      }
      if (p < 1) requestAnimationFrame(frame); else done();
    });
  }

  btn.addEventListener('click', function () {
    var opening = grid.classList.contains('is-collapsed');
    btn.setAttribute('aria-expanded', opening);
    btn.textContent = opening ? 'Show fewer' : 'Show all partners';
    var h0 = grid.offsetHeight, m0 = parseFloat(getComputedStyle(btn).marginTop);
    if (opening) {
      var full = grid.scrollHeight;
      /* pin size first so toggling the class doesn't change the layout before frame 1 */
      grid.style.maxHeight = h0 + 'px';
      grid.classList.remove('is-collapsed');
      animate(h0, full, m0, 20, null, 0);
      return;
    }
    var startTop = btn.getBoundingClientRect().top;
    var finishTop = startTop - (h0 - COLLAPSED) - (m0 + 18);
    /* keep the button's spot if it would still be on screen, otherwise bring it to ~60% down */
    var want = window.innerHeight * 0.6;
    var endTop = (finishTop > 40 && finishTop < window.innerHeight - 60) ? finishTop : want;
    grid.style.maxHeight = h0 + 'px'; btn.style.marginTop = m0 + 'px';
    grid.classList.add('is-collapsed');
    if (still) window.scrollBy({ top: finishTop - want, behavior: 'instant' });
    animate(h0, COLLAPSED, m0, -18, endTop, startTop);
  });
})();
