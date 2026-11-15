/* Hotel Boutique Bordeluz — interacciones (sin librerías) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- MODO DEMO ----------
     true  = versión de prueba para la propuesta: solo abren/cierran Menú y Reservar, nada más funciona.
     false = versión final: todos los botones funcionan y Reservar lleva al motor de reservas (ENGINE). */
  const DEMO = true;

  const ALLOWED = '#burger, .header__book, .bbar a, [data-close-panel], #veil';
  const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [data-full], [data-filter], .ph, [tabindex]';
  const block = e => {
    const el = e.target.closest && e.target.closest(INTERACTIVE);
    if (!el || el.closest(ALLOWED)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  if (DEMO) ['click', 'mousedown', 'keydown', 'submit'].forEach(t => addEventListener(t, e => {
    if (t === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    block(e);
  }, true));

  /* ---------- Header: sombra y logo más chico al bajar ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-solid', scrollY > 120);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Paneles laterales: menú y reservas ---------- */
  const burger = $('#burger'), veil = $('#veil'), heroText = $('.hero__content');
  const panels = { menu: $('#menu'), book: $('#reservas') };
  let current = null;

  $$('#menu .menu__list li, #menu .menu__foot').forEach((el, i) => { el.dataset.stagger = ''; el.style.setProperty('--i', i); });
  $$('#reservas .panel__body > *, #reservas .bform > *').forEach((el, i) => { el.dataset.stagger = ''; el.style.setProperty('--i', i); });

  // la portada se corre a la izquierda para dar espacio al panel
  const shiftHero = on => {
    if (!heroText) return;
    if (!on || innerWidth <= 720 || heroText.getBoundingClientRect().bottom < 0) { heroText.style.transform = ''; return; }
    const pw = panels.menu.getBoundingClientRect().width;
    const avail = innerWidth - pw - 64;
    const s = Math.min(1, avail / heroText.offsetWidth);
    heroText.style.transform = `translateX(${-pw / 2}px) scale(${s.toFixed(3)})`;
  };

  const openPanel = name => {
    if (current === name) return closePanel();
    if (current) { panels[current].classList.remove('is-open'); panels[current].setAttribute('aria-hidden', 'true'); }
    current = name;
    const el = panels[name];
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    body.classList.add('panel-open', 'is-locked');
    burger.setAttribute('aria-expanded', name === 'menu');
    shiftHero(true);
    setTimeout(() => (el.querySelector('.menu__list a, input, select') || el).focus({ preventScroll: true }), 650);
  };
  const closePanel = () => {
    if (!current) return;
    const el = panels[current];
    el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
    body.classList.remove('panel-open', 'is-locked');
    burger.setAttribute('aria-expanded', 'false');
    shiftHero(false);
    const was = current; current = null;
    (was === 'menu' ? burger : $('.header__book')).focus({ preventScroll: true });
  };

  burger.addEventListener('click', () => openPanel('menu'));
  veil.addEventListener('click', closePanel);
  $$('[data-close-panel]').forEach(b => b.addEventListener('click', closePanel));
  addEventListener('keydown', e => { if (e.key === 'Escape' && current) closePanel(); });
  addEventListener('resize', () => { if (current) shiftHero(true); });

  // Todo "Reservar" (header, barra de la portada, habitaciones) abre el panel de reservas
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="#reservas"]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.room) {
      const sel = $('#reservas select[name=room]');
      if (sel) { sel.value = a.dataset.room; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    openPanel('book');
  });

  // Links de secciones del menú lateral: cierran el panel y bajan a la sección (desactivado en la demo)
  $$('#menu a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (DEMO) return;
    const target = a.hash.length > 1 ? $(a.hash) : null;
    if (!target) return;
    closePanel();
    setTimeout(() => target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 450);
  }));

  /* ---------- Portada: fotos con fundido ---------- */
  const slides = $$('.hero__slide'), dots = $$('.hero__dots i');
  let si = 0, timer;
  const goSlide = n => {
    slides[si].classList.remove('is-active'); dots[si]?.classList.remove('is-active');
    si = (n + slides.length) % slides.length;
    const img = slides[si];
    const show = () => { img.classList.add('is-active'); dots[si]?.classList.add('is-active'); };
    img.complete ? show() : img.addEventListener('load', show, { once: true });
  };
  const auto = () => { clearInterval(timer); if (!reduce && slides.length > 1) timer = setInterval(() => goSlide(si + 1), 6500); };
  $('[data-hero-prev]')?.addEventListener('click', () => { goSlide(si - 1); auto(); });
  $('[data-hero-next]')?.addEventListener('click', () => { goSlide(si + 1); auto(); });
  // las otras fotos de la portada se piden cuando la página ya cargó (no compiten con la primera)
  const loadRest = () => { slides.slice(1).forEach(s => { if (s.dataset.src) { s.srcset = s.dataset.srcset; s.src = s.dataset.src; } }); auto(); };
  document.readyState === 'complete' ? loadRest() : addEventListener('load', loadRest);

  /* ---------- Revelado al hacer scroll ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Contadores ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = reduce ? 1 : 1600;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * k) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countIO.unobserve(el);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Galería ---------- */
  const photos = [
    ['vista-volcan', 'entorno', 'Vista al lago y el volcán Villarrica'],
    ['fachada-noche', 'hotel', 'El hotel de noche'],
    ['hab-doble-jacuzzi', 'habitaciones', 'Doble con Jacuzzi'],
    ['piscina-noche', 'piscina', 'Piscina temperada'],
    ['desayuno-vista', 'desayuno', 'Desayuno con vista al lago'],
    ['playa-volcan', 'entorno', 'Playa Calfurray'],
    ['tinaja-noche', 'piscina', 'Tinajas de agua caliente'],
    ['living-chimenea', 'hotel', 'Living con chimenea'],
    ['hab-doble-terraza-lago', 'habitaciones', 'Doble Terraza Vista Lago'],
    ['terraza-lago', 'hotel', 'Terraza con vista al lago'],
    ['buffet-frutas', 'desayuno', 'Desayuno buffet'],
    ['piscina-exterior', 'piscina', 'Piscina exterior'],
    ['atardecer-lago', 'entorno', 'Atardecer en el lago'],
    ['fachada', 'hotel', 'El hotel'],
    ['hab-triple-terraza-lago', 'habitaciones', 'Triple con Terraza Vista al Lago'],
    ['piscina-interior', 'piscina', 'Piscina temperada'],
    ['comedor', 'desayuno', 'Comedor con vista al lago'],
    ['lago-reflejo', 'entorno', 'Lago Villarrica'],
    ['chimenea', 'hotel', 'Chimenea'],
    ['hab-doble-piscina', 'habitaciones', 'Doble Vista Piscina'],
    ['piscina-cascada', 'piscina', 'Piscina'],
    ['buffet-panes', 'desayuno', 'Panes del desayuno'],
    ['volcan', 'entorno', 'Volcán Villarrica'],
    ['sala-estar', 'hotel', 'Sala de estar'],
    ['hab-cuadruple-terraza-lago', 'habitaciones', 'Cuádruple Terraza Vista al Lago'],
    ['piscina-luces', 'piscina', 'Piscina de noche'],
    ['playa-calfurray', 'entorno', 'Playa Calfurray'],
    ['acceso', 'hotel', 'Acceso al hotel'],
    ['hab-single-doble-jardin', 'habitaciones', 'Single Doble Vista Jardín'],
    ['piscina-toldo', 'piscina', 'Piscina'],
    ['buffet', 'desayuno', 'Desayuno'],
    ['muelle', 'entorno', 'Muelle en el lago'],
    ['living-lago', 'hotel', 'Living con vista al lago'],
    ['hab-triple-parcial-lago', 'habitaciones', 'Triple Vista Parcial Lago'],
    ['piscina-jardin', 'piscina', 'Piscina y jardín'],
    ['playa-familia', 'entorno', 'Día de playa'],
    ['vinos', 'hotel', 'Detalles'],
    ['hab-doble-sin-vista', 'habitaciones', 'Doble Sin Vista'],
    ['vista-aerea', 'entorno', 'Vista aérea'],
    ['fogon', 'hotel', 'Fogón'],
    ['embarcadero', 'entorno', 'Embarcadero'],
    ['lago-calma', 'entorno', 'Lago en calma'],
  ];
  const masonry = $('#masonry');
  masonry.innerHTML = photos.map(([f, cat, cap], k) =>
    `<figure class="ph" data-cat="${cat}" data-i="${k}"><img src="img/${f}-800.webp" data-full="img/${f}-1600.webp" alt="${cap}" loading="lazy" decoding="async"></figure>`).join('');
  $$('.ph img', masonry).forEach(img => {
    const done = () => img.classList.add('is-loaded');
    img.complete ? done() : img.addEventListener('load', done, { once: true });
  });

  const applyFilter = f => {
    $$('.filter').forEach(b => b.classList.toggle('is-active', b.dataset.filter === f));
    $$('.ph', masonry).forEach((ph, k) => {
      const showIt = f === 'all' || ph.dataset.cat === f;
      if (showIt && ph.classList.contains('is-hidden')) {
        ph.classList.remove('is-hidden'); ph.classList.add('is-entering');
        requestAnimationFrame(() => requestAnimationFrame(() => { ph.style.transitionDelay = (k % 6) * 40 + 'ms'; ph.classList.remove('is-entering'); }));
      } else if (!showIt) { ph.classList.add('is-hidden'); ph.style.transitionDelay = ''; }
    });
  };
  $$('.filter').forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)));

  /* Visor de fotos */
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
  let lbList = [], lbI = 0;
  const show = n => {
    lbI = (n + lbList.length) % lbList.length;
    const im = $('img', lbList[lbI]);
    lbImg.classList.remove('is-loaded');
    setTimeout(() => {
      lbImg.src = im.dataset.full || im.src; lbImg.alt = im.alt; lbCap.textContent = im.alt;
      lbImg.decode ? lbImg.decode().then(() => lbImg.classList.add('is-loaded')).catch(() => lbImg.classList.add('is-loaded')) : lbImg.classList.add('is-loaded');
    }, 180);
  };
  const openLb = ph => {
    lbList = $$('.ph:not(.is-hidden)', masonry);
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); body.classList.add('is-locked');
    show(lbList.indexOf(ph));
  };
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); body.classList.remove('is-locked'); };
  masonry.addEventListener('click', e => { const ph = e.target.closest('.ph'); if (ph) openLb(ph); });
  $('[data-lb-close]').addEventListener('click', closeLb);
  $('[data-lb-prev]').addEventListener('click', () => show(lbI - 1));
  $('[data-lb-next]').addEventListener('click', () => show(lbI + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(lbI - 1);
    if (e.key === 'ArrowRight') show(lbI + 1);
  });
  let lx = null;
  lb.addEventListener('touchstart', e => lx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (lx === null) return; const dx = e.changedTouches[0].clientX - lx; if (Math.abs(dx) > 40) show(lbI + (dx < 0 ? 1 : -1)); lx = null; });

  /* ---------- Reservas ---------- */
  const iso = d => d.toISOString().slice(0, 10);
  const today = new Date(); today.setHours(12);
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const short = s => new Date(s + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');

  $$('form[data-booking]').forEach(form => {
    const fin = form.elements.in, fout = form.elements.out;
    fin.min = iso(today); fin.value = iso(plus(today, 14));
    fout.min = iso(plus(today, 1)); fout.value = iso(plus(today, 16));
    const summary = $('[data-nights]', form);
    const update = () => {
      if (fin.value) { fout.min = iso(plus(new Date(fin.value + 'T12:00'), 1)); if (fout.value <= fin.value) fout.value = fout.min; }
      // la barra de la portada muestra las mismas fechas
      $('[data-bar-in]') && ($('[data-bar-in]').textContent = short(fin.value));
      $('[data-bar-out]') && ($('[data-bar-out]').textContent = short(fout.value));
      const n = Math.round((new Date(fout.value) - new Date(fin.value)) / 864e5);
      const fmt = s => new Date(s + 'T12:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
      const a = +form.elements.adults.value, c = +(form.elements.children?.value || 0);
      summary.parentElement.classList.remove('is-error');
      summary.textContent = n > 0
        ? `${n} ${n === 1 ? 'noche' : 'noches'} · ${fmt(fin.value)} → ${fmt(fout.value)} · ${a} ${a === 1 ? 'adulto' : 'adultos'}${c ? ` y ${c} ${c === 1 ? 'niño' : 'niños'}` : ''}`
        : 'Selecciona tus fechas';
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    $$('[data-step]', form).forEach(b => b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      inp.value = Math.min(+inp.max, Math.max(+inp.min, +inp.value + +b.dataset.step));
      update();
    }));
    update();

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!fin.value || !fout.value || fout.value <= fin.value) {
        summary.parentElement.classList.add('is-error'); summary.textContent = 'La salida debe ser posterior a la llegada';
        return;
      }
      if (DEMO) return; // demo: sin conexión al motor de reservas
      // Versión final: abre el motor de reservas que ya usa el hotel (Pxsol), con fechas y personas cargadas.
      const ENGINE = 'https://www.hotelbordeluz.cl/lp.html'; // [confirmar parámetros del motor con Pxsol]
      const p = new URLSearchParams({
        checkin: fin.value, checkout: fout.value,
        adults: form.elements.adults.value, children: form.elements.children.value,
        currency: form.elements.currency.value, promo: form.elements.promo.value
      });
      window.open(`${ENGINE}?${p}`, '_blank', 'noopener');
    });
  });

  /* ---------- Mapa bajo demanda ---------- */
  const mapBtn = $('[data-map]');
  mapBtn?.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=-39.302279,-72.091502&z=15&output=embed';
    f.loading = 'lazy'; f.title = 'Mapa Hotel Boutique Bordeluz'; f.referrerPolicy = 'no-referrer-when-downgrade';
    mapBtn.replaceWith(f);
  });
})();
