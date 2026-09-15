/* ════════════════════════════════════════════════════════════
   Samuel Harvan — portfolio behaviour
   Motion: GSAP + ScrollTrigger, one shared timing system.
   ════════════════════════════════════════════════════════════ */
(() => {
  const root = document.documentElement;
  const hasGSAP = typeof gsap !== 'undefined';

  /* If the GSAP CDN is blocked, drop the pre-paint hidden states so the
     page renders as plain static content rather than staying invisible. */
  if (!hasGSAP) root.classList.remove('motion-ready');

  /* ════ MOTION SYSTEM ══════════════════════════════════════
     Every entry sequence, cascade, curtain and hover shares these
     numbers. They mirror --ease / --dur / --stagger in the CSS, so
     JS tweens and CSS transitions feel like one system.          */
  const MOTION = {
    dur: 0.4,        // baseline window
    fast: 0.25,      // exits, ~60% of baseline
    stagger: 0.05,   // indexed cascade step
    ease: 'editorial'
  };

  if (hasGSAP) {
    /* cubic-bezier(0.16, 1, 0.3, 1) as a GSAP ease — Newton's method
       on the x-curve, then read y. Exact, and avoids loading a plugin. */
    const cubicBezier = (x1, y1, x2, y2) => {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
      const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      const xAt = t => ((ax * t + bx) * t + cx) * t;
      const dxAt = t => (3 * ax * t + 2 * bx) * t + cx;
      return x => {
        let t = x;
        for (let i = 0; i < 8; i++) {
          const err = xAt(t) - x;
          if (Math.abs(err) < 1e-5) break;
          const d = dxAt(t);
          if (Math.abs(d) < 1e-6) break;
          t -= err / d;
        }
        return ((ay * t + by) * t + cy) * t;
      };
    };
    gsap.registerEase(MOTION.ease, cubicBezier(0.16, 1, 0.3, 1));
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ duration: MOTION.dur, ease: MOTION.ease });

    /* Lenis drives scrolling; GSAP's ticker drives Lenis, and ScrollTrigger
       reads Lenis' position. One clock, so the section stack never desyncs
       from the scrubbed transitions. */
    if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      lenis.on('scroll', () => window.ScrollTrigger && ScrollTrigger.update());
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      window.__lenis = lenis;
    }
  }

  /* ── wrap header typography in overflow-hidden line masks ──
     Titles already break their own lines with <br>, so split on that
     and give each line its own mask. Returns the inner line spans. */
  const maskLines = el => {
    if (!el || el.dataset.masked) return [];
    el.dataset.masked = '1';
    el.innerHTML = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map(line => `<span class="mask"><span class="mask-line">${line}</span></span>`)
      .join('');
    return [...el.querySelectorAll('.mask-line')];
  };

  /* Lists that should peel in with an indexed stagger. */
  const CASCADE = [
    '.hud > div', '.facts li', '.about-grid > *',
    '.projects .proj',
    '.marquees .mq-row', '.domains > div', '.links li'
  ].join(', ');

  /* ════ ENTRY SEQUENCES ════════════════════════════════════ */
  if (hasGSAP) {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* — hero: masks up, then the supporting furniture — */
      const hero = document.querySelector('.hero');
      if (hero) {
        const heroLines = [
          ...maskLines(hero.querySelector('.hero-greet')),
          ...maskLines(hero.querySelector('.hero-love'))
        ];
        gsap.timeline({ delay: 0.15 })
          .set(hero.querySelector('[data-reveal]'), { opacity: 1 })
          .fromTo(heroLines,
            { yPercent: 100, y: 0 },
            { yPercent: 0, y: 0, stagger: MOTION.stagger * 2 })
          .fromTo(hero.querySelectorAll('.hud > div'),
            { yPercent: 12, opacity: 0 },
            { yPercent: 0, opacity: 1, stagger: MOTION.stagger }, '-=0.2')
          .fromTo(hero.querySelector('.scrollcue'),
            { opacity: 0 }, { opacity: 1 }, '-=0.25');
      }

      /* — each section: index → title masks → cascaded content — */
      document.querySelectorAll('.sec[data-reveal]').forEach(sec => {
        const idx = sec.querySelector('.idx');
        const title = sec.querySelector('.sec-title, .contact-type');
        const lines = maskLines(title);
        const items = [...sec.querySelectorAll(CASCADE)];
        const body = [...sec.querySelectorAll('.lead, .contact-lead')];

        const tl = gsap.timeline({
          scrollTrigger: { trigger: sec, start: 'top 78%', once: true }
        });

        tl.set(sec, { opacity: 1 });
        if (idx) tl.fromTo(idx,
          { yPercent: 40, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: MOTION.fast }, 0);
        if (lines.length) tl.fromTo(lines,
          { yPercent: 100, y: 0 },
          { yPercent: 0, y: 0, stagger: MOTION.stagger * 2 }, 0.05);
        if (body.length) tl.fromTo(body,
          { y: 18, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.25');

        /* indexed stagger — item i enters at i * 0.05s */
        if (items.length) {
          tl.fromTo(items,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, stagger: MOTION.stagger }, '-=0.2');
        }
      });

      /* ── full section transitions ──────────────────────────
         Each panel is opaque and overlaps the previous one, so the
         incoming section physically covers the outgoing one. As it
         does, the outgoing panel recedes: scaled back, dimmed and
         pushed up, which reads as depth rather than a crossfade. */
      const panels = [...document.querySelectorAll('.hero, .sec')];

      panels.forEach((panel, i) => {
        const next = panels[i + 1];
        if (!next) return;

        /* The hero is pinned at top:0, so if it only dimmed it would show
           through every later panel as those scale back. autoAlpha takes it
           to visibility:hidden instead. Mid-stack panels keep a little
           opacity so the recede reads as depth. */
        const isHero = panel.classList.contains('hero');

        gsap.fromTo(panel,
          { scale: 1, autoAlpha: 1, yPercent: 0 },
          {
            scale: 0.93,
            autoAlpha: isHero ? 0 : 0.25,
            yPercent: -4,
            ease: 'none',
            scrollTrigger: {
              trigger: next,
              /* Start the recede once the incoming panel is well into
                 view, not the instant it appears — otherwise the
                 outgoing section (and its sticky rail) is already
                 scaling away while its last row is still being read. */
              start: 'top 72%',
              end: 'top top',        // it has fully taken over
              scrub: true
            }
          }
        );
      });


      /* ── About: the headshot takes on colour as it passes ──
         Scrubbed across the image's own travel through the
         viewport. Driven through a custom property so it
         composes with the contrast tweak instead of two rules
         fighting over `filter`.                              */
      const aboutMedia = document.querySelector('.about-media');
      if (aboutMedia) {
        const shot = aboutMedia.querySelector('img');
        gsap.fromTo(shot,
          { '--gray': 1 },
          {
            '--gray': 0,
            ease: 'none',
            scrollTrigger: {
              trigger: aboutMedia,
              start: 'top 88%',   // colour starts as it enters
              end: 'bottom 40%',  // fully saturated on the way out
              scrub: 0.8
            }
          }
        );
      }

      /* ── "My Journey" scatters as you scroll into the timeline ──
         Each letter gets its own random vector, resolved once per
         refresh so the break-up is stable while scrubbing. */
      const intro = document.querySelector('.journey-intro');
      if (intro) {
        const chars = gsap.utils.toArray('.jw-c', intro);
        const rand = gsap.utils.random;

        gsap.to(chars, {
          x: () => rand(-0.75, 0.75) * innerWidth,
          y: () => rand(-0.7, 0.7) * innerHeight,
          rotation: () => rand(-140, 140),
          scale: () => rand(0.35, 1.7),
          opacity: 0,
          ease: 'none',
          stagger: { amount: 0.25, from: 'random' },
          scrollTrigger: {
            trigger: intro,
            start: '14% top',      // a bit more scroll before it breaks up
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true
          }
        });
      }

      /* ══ JOURNEY PATH ═════════════════════════════════════
         A drawn line the reader walks down. Experiences sit dim
         ahead of them and light up as the path reaches each node,
         so the list is uncovered by scrolling rather than shown
         all at once. Rows stay lit once passed.               */
      const track = document.querySelector('.journey-track');
      if (track) {
        const jobs = gsap.utils.toArray('.journey .job', track);
        const fill = track.querySelector('.path-fill');
        const now = document.querySelector('.jc-now');
        const total = document.querySelector('.jc-total');
        const pad = n => String(n).padStart(2, '0');

        if (total) total.textContent = pad(jobs.length);


        /* A dot counts as reached when the drawn line has actually
           passed it. Reading the rendered scaleY (not raw scroll
           progress) means the scrub's lag is included, so the dot
           lights at the moment the red edge crosses it. */
        const pathEl = track.querySelector('.path');
        let nodeAt = [];

        /* Use layout offsets, not rects: unreached rows are held at
           y:42 by GSAP, so a rect would read every node 42px low and
           the counter would lag a step behind the line. offsetTop is
           unaffected by transforms. */
        const measure = () => {
          const pathH = pathEl.offsetHeight;
          if (!pathH) return;
          nodeAt = jobs.map(job => {
            const node = job.querySelector('.job-node');
            const y = job.offsetTop + node.offsetTop + node.offsetHeight / 2;
            return (y - pathEl.offsetTop) / pathH;
          });
        };

        const syncCount = () => {
          if (now) now.textContent = pad(jobs.filter(j => j.classList.contains('is-open')).length || 1);
        };

        jobs.forEach(job => gsap.set(job, { opacity: 0.16, y: 42 }));

        const setReached = (job, reached) => {
          if (reached === job.classList.contains('is-open')) return;
          job.classList.toggle('is-open', reached);
          gsap.to(job, {
            opacity: reached ? 1 : 0.16,
            y: reached ? 0 : 42,
            overwrite: 'auto'
          });
        };

        gsap.fromTo(fill, { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: {
            trigger: pathEl,
            start: 'top 55%',
            end: 'bottom 40%',
            scrub: 0.8,
            onRefresh: measure,
            onUpdate: () => {
              if (!nodeAt.length) measure();
              const drawn = gsap.getProperty(fill, 'scaleY');
              jobs.forEach((job, i) => setReached(job, drawn >= nodeAt[i]));
              syncCount();
            }
          }
        });

        jobs.forEach(job => {
          /* whichever row you are standing on reads brightest */
          ScrollTrigger.create({
            trigger: job, start: 'top 52%', end: 'bottom 52%',
            toggleClass: { targets: job, className: 'is-live' }
          });
        });
      }

      /* — anything left over reveals on its own — */
      document.querySelectorAll('[data-reveal]').forEach(el => {
        if (el.closest('.hero') || el.matches('.sec[data-reveal]')) return;
        gsap.to(el, {
          opacity: 1,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });

      /* fonts and images settle after first paint and shift every
         trigger's start/end; recalculate once everything has loaded */
      addEventListener('load', () => ScrollTrigger.refresh());

      return () => ScrollTrigger.getAll().forEach(t => t.kill());
    });

    /* reduced motion: show everything, animate nothing */
    mm.add('(prefers-reduced-motion: reduce)', () => {
      root.classList.remove('motion-ready');
    });
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── hero: type / hold / backspace through the verbs ──── */
  const typedText = document.getElementById('typedText');
  const VERBS = ['code.', 'learn.', 'build.', 'solve.', 'travel.', 'exercise.'];

  if (typedText) {
    if (reduced) {
      // no motion: state the whole list instead of animating through it
      typedText.textContent = VERBS.map(v => v.replace('.', '')).slice(0, -1).join(', ') +
        ' and ' + VERBS.at(-1);
    } else {
      const slot = typedText.closest('.typed');
      const TYPE = 85, ERASE = 40, HOLD = 1500, GAP = 400;
      let w = 0, i = 0, erasing = false;

      const tick = () => {
        const word = VERBS[w];
        typedText.textContent = word.slice(0, i);

        if (!erasing && i === word.length) {
          erasing = true;
          slot.classList.remove('is-busy');
          return setTimeout(tick, HOLD);
        }
        if (erasing && i === 0) {
          erasing = false;
          w = (w + 1) % VERBS.length;
          slot.classList.remove('is-busy');
          return setTimeout(tick, GAP);
        }

        slot.classList.add('is-busy');
        i += erasing ? -1 : 1;
        setTimeout(tick, erasing ? ERASE : TYPE);
      };
      // start after the hero masks have landed
      setTimeout(tick, 1100);
    }
  }

  /* ── active section drives the nav highlight ──────────────
     One deterministic pass: whichever section covers the middle of
     the viewport owns the highlight. (An IntersectionObserver misses
     this when the user jumps between sections via a hash link.)   */
  const topbar = document.querySelector('.topbar');
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const sections = [...document.querySelectorAll('[data-section]')];

  let current = null;

  const syncSection = () => {
    topbar.classList.toggle('is-stuck', scrollY > 40);
    if (!sections.length) return;

    const mid = scrollY + innerHeight / 2;
    let active = sections[0];
    for (const sec of sections) {
      if (mid >= sec.offsetTop) active = sec;
    }
    // the last section can never reach mid-viewport at max scroll
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) {
      active = sections[sections.length - 1];
    }
    if (active.id === current) return;
    current = active.id;

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

  /* ── in-page links go through Lenis ───────────────────────
     A bare hash link does a native jump that Lenis immediately
     overrides, which is why the first click appeared to do
     nothing and a second was needed. Drive the scroll directly. */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();
      const top = hash === '#top' ? 0 : target;

      if (window.__lenis) window.__lenis.scrollTo(top, { offset: -80 });
      else if (typeof top === 'number') scrollTo({ top, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });

      if (history.replaceState) history.replaceState(null, '', hash);
    });
  });

  /* ── mobile menu: curtain drop on the shared timing ─────── */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobilemenu');
  const menuLinks = menu.querySelectorAll('a');

  let curtain = null;
  if (hasGSAP && !reduced) {
    curtain = gsap.timeline({ paused: true })
      .fromTo(menu, { yPercent: -100 }, { yPercent: 0, duration: MOTION.dur })
      .fromTo(menuLinks,
        { yPercent: 60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: MOTION.dur, stagger: MOTION.stagger },
        '-=0.2');
  }

  const setMenu = open => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';

    if (!curtain) {           // reduced motion / no GSAP
      menu.hidden = !open;
      if (open) menuLinks[0].focus();
      return;
    }

    if (open) {
      menu.hidden = false;
      curtain.timeScale(1).play();
      menuLinks[0].focus();
    } else {
      // exits run faster than entries
      curtain.timeScale(MOTION.dur / MOTION.fast).reverse();
      curtain.eventCallback('onReverseComplete', () => { menu.hidden = true; });
    }
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
    track.style.setProperty('--mq-dur', row.dataset.speed + 's');
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
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
