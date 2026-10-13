/* Isabella Moreno — native animations and true scroll-based parallax.
   Works from file:// and on ordinary hosting; no external libraries. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menu = $('.mobile-menu');
  const menuButton = $('.menu-button');
  const header = $('.site-header');
  const progress = $('.scroll-progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setMenu(open) {
    if (!menu || !menuButton) return;
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.inert = !open;
  }
  menuButton?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu || document.createElement('nav')).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  document.addEventListener('click', event => {
    if (menu?.classList.contains('open') && !menu.contains(event.target) && !menuButton?.contains(event.target)) setMenu(false);
  });

  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px 25px 0px' });
    reveals.forEach(el => revealObserver.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  const parallaxImages = $$('img[data-parallax]');
  const tracked = parallaxImages.map(image => ({ image, active: true }));
  if ('IntersectionObserver' in window) {
    const activeObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = tracked.find(item => item.image === entry.target);
        if (target) target.active = entry.isIntersecting;
      }
    }, { rootMargin: '75% 0px 75% 0px', threshold: 0 });
    tracked.forEach(item => activeObserver.observe(item.image));
  }
  let ticking = false;
  function paint() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1,y/maxScroll).toFixed(5)})`;
    header?.classList.toggle('scrolled', y > 40);
    if (reducedMotion.matches) {
      for (const item of tracked) item.image.style.removeProperty('--parallax-y');
      return;
    }
    const vh = window.innerHeight || 800;
    for (const item of tracked) {
      if (!item.active) continue;
      const image = item.image;
      const frame = image.parentElement;
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < -vh * .75 || rect.top > vh * 1.75) continue;
      const center = (rect.top + rect.bottom) / 2;
      const normalized = Math.max(-1,Math.min(1,(center - vh / 2) / ((vh + rect.height) / 2)));
      // Overscanned image has 10% extra space above and below. Stay safely within it.
      const range = Math.min(vh * .065, rect.height * .065, 70);
      image.style.setProperty('--parallax-y', `${(-normalized * range).toFixed(1)}px`);
    }
  }
  function requestPaint() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
  }
  window.addEventListener('scroll', requestPaint, { passive:true });
  window.addEventListener('resize', requestPaint, { passive:true });
  reducedMotion.addEventListener?.('change', requestPaint);
  window.addEventListener('load', requestPaint, { once:true });
  requestPaint();
})();
