/* Samuel Harvan — portfolio behaviour. No dependencies. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── hero word cycler ─────────────────────────────────── */
  const words = document.querySelectorAll('#cycler .word');
  if (words.length > 1 && !reduced) {
    let i = 0;
    setInterval(() => {
      words[i].classList.remove('is-on');
      i = (i + 1) % words.length;
      words[i].classList.add('is-on');
    }, 2600);
  }

  /* ── scroll reveal ────────────────────────────────────── */
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  }

  /* ── sticky topbar ────────────────────────────────────── */
  const topbar = document.querySelector('.topbar');

  /* ── active section drives the nav + the ambient wash ───── */
  /* One deterministic pass: whichever section covers the middle
     of the viewport owns the background and the nav highlight.
     (An IntersectionObserver misses this when the user jumps
     between sections via the nav or a hash link.)              */
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const ambLayers = [...document.querySelectorAll('.ambience span')];
  const sections = [...document.querySelectorAll('[data-amb-trigger]')];

  let current = null;

  const syncSection = () => {
    topbar.classList.toggle('is-stuck', scrollY > 40);
    if (!sections.length) return;

    const mid = scrollY + innerHeight / 2;
    let active = sections[0];
    for (const sec of sections) {
      const top = sec.offsetTop;
      if (mid >= top) active = sec;
    }
    // the last section can never reach mid-viewport at max scroll
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) {
      active = sections[sections.length - 1];
    }
    if (active.id === current) return;
    current = active.id;

    ambLayers.forEach(l => l.classList.toggle('is-on', l.dataset.amb === current));
    navLinks.forEach(a =>
      a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current))
    );
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { syncSection(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', syncSection, { passive: true });
  syncSection();

  /* ── mobile menu ──────────────────────────────────────── */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobilemenu');

  const setMenu = open => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector('a').focus();
  };

  burger.addEventListener('click', () =>
    setMenu(burger.getAttribute('aria-expanded') !== 'true')
  );
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });

  /* ── skills marquee ───────────────────────────────────── */
  const marquees = document.getElementById('marquees');
  const toggle = document.getElementById('marqueeToggle');

  marquees.querySelectorAll('.mq-row').forEach(row => {
    const track = row.querySelector('.mq-track');
    track.style.setProperty('--dur', row.dataset.speed + 's');
    // duplicate the set so translateX(-50%) loops seamlessly
    const clone = track.firstElementChild.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.append(clone);
  });

  toggle.addEventListener('click', () => {
    const paused = marquees.classList.toggle('is-paused');
    toggle.toggleAttribute('data-paused', paused);
    toggle.querySelector('.mt-text').textContent = paused ? 'Play' : 'Pause';
  });

  /* ── footer year ──────────────────────────────────────── */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
