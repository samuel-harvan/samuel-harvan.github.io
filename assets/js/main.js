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
  const onScroll = () => topbar.classList.toggle('is-stuck', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── scrollspy ────────────────────────────────────────── */
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navLinks.forEach(a =>
          a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id))
        );
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
  }

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
