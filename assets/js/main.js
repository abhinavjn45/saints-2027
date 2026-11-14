/* ============================================================
   SAINTS 2027 — Main JavaScript
   File: assets/js/main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const header    = document.getElementById('main-header');
  const headerTop = document.getElementById('header-top');
  const hero      = document.getElementById('hero');


  /* ── 1. Set hero padding-top to full header height ───────
     Called only on load and window resize — NEVER on scroll  */
  function syncHeroPadding() {
    if (hero) hero.style.paddingTop = header.offsetHeight + 'px';
  }
  syncHeroPadding();
  window.addEventListener('resize', syncHeroPadding);


  /* ── 2. Smart scroll — collapse on down, restore on up ───
     Uses requestAnimationFrame to batch scroll events.
     Hero padding is NOT touched here (avoids layout reflow). */
  const COLLAPSE_THRESHOLD = 80;  // px before collapsing
  let lastScrollY = window.scrollY;
  let ticking     = false;

  function onScrollFrame() {
    const currentY = window.scrollY;

    if (currentY <= 10) {
      // Always fully open at the very top
      headerTop.classList.remove('collapsed');
    } else if (currentY > lastScrollY) {
      // Scrolling DOWN
      if (currentY > COLLAPSE_THRESHOLD) {
        headerTop.classList.add('collapsed');
      }
    } else {
      // Scrolling UP — restore immediately
      headerTop.classList.remove('collapsed');
    }

    lastScrollY = currentY;
    ticking     = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScrollFrame);
      ticking = true;
    }
  }, { passive: true });


  /* ── 3. Topbar dismiss ───────────────────────────────── */
  const topbarCloseBtn = document.getElementById('topbar-close');
  if (topbarCloseBtn) {
    topbarCloseBtn.addEventListener('click', () => {
      const tb = document.getElementById('topbar');
      tb.style.maxHeight     = tb.offsetHeight + 'px';
      tb.offsetHeight; // force reflow
      tb.style.transition    = 'max-height 0.4s ease, opacity 0.3s ease, padding 0.4s ease';
      tb.style.maxHeight     = '0';
      tb.style.opacity       = '0';
      tb.style.overflow      = 'hidden';
      tb.style.paddingTop    = '0';
      tb.style.paddingBottom = '0';
      // Sync hero padding after topbar closes
      setTimeout(syncHeroPadding, 420);
    });
  }


  /* ── 4. Active nav link via IntersectionObserver ───────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('a.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`a.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => sectionObserver.observe(s));


  /* ── 5. Mobile menu toggle + hamburger ─────────────────── */
  const mobileBtn  = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const lines      = mobileBtn ? mobileBtn.querySelectorAll('.hamburger-line') : [];
  let menuOpen = false;

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      mobileMenu.classList.toggle('open', menuOpen);
      if (menuOpen) {
        lines[0].style.transform = 'translateY(8px) rotate(45deg)';
        lines[1].style.transform = 'rotate(-45deg)';
        lines[2].style.opacity   = '0';
        lines[2].style.width     = '0';
      } else {
        lines[0].style.transform = '';
        lines[1].style.transform = '';
        lines[2].style.opacity   = '1';
        lines[2].style.width     = '';
      }
    });
  }


  /* ── 6. Mobile accordion ───────────────────────────────── */
  document.querySelectorAll('.mobile-accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      const icon   = btn.querySelector('i');
      const isOpen = target.classList.contains('open');
      document.querySelectorAll('.mobile-submenu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.mobile-accordion-btn i').forEach(i => (i.style.transform = ''));
      if (!isOpen) {
        target.classList.add('open');
        icon.style.transform = 'rotate(180deg)';
      }
    });
  });


  /* ── 7. Close mobile menu on link click ────────────────── */
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuOpen = false;
        mobileMenu.classList.remove('open');
        lines[0].style.transform = '';
        lines[1].style.transform = '';
        lines[2].style.opacity   = '1';
        lines[2].style.width     = '';
      });
    });
  }


  /* ── 8. Rotate dropdown chevrons on desktop hover ───────── */
  document.querySelectorAll('.nav-item').forEach(item => {
    const chevron = item.querySelector('.fa-chevron-down');
    if (!chevron) return;
    item.addEventListener('mouseenter', () => (chevron.style.transform = 'rotate(180deg)'));
    item.addEventListener('mouseleave', () => (chevron.style.transform = ''));
  });

});
