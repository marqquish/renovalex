/* ═══════════════════════════════════════════════════════════════
   HOUSE SCROLL — DIORAMA 2D
   La escena es un plano fijo. El scroll desplaza la CÁMARA
   con zoom (scale) y paneo (translateX / translateY).
   SIN rotaciones. SIN cambios de escena. Coherencia total.
   ═══════════════════════════════════════════════════════════════ */

(function initHouseScroll() {

  /* ── Referencias ── */
  const section     = document.querySelector('.house-scroll');
  if (!section) return;

  const camera      = document.getElementById('houseScrollCamera');
  const progressBar = document.getElementById('houseScrollProgress');
  const intro       = section.querySelector('.house-scroll__intro');
  const cards       = section.querySelectorAll('.house-scroll__card');
  const dots        = section.querySelectorAll('.house-scroll__dot');

  if (!camera) return;
  const KEYFRAMES = [
    /* Vista general inicial */
    { at: 0.00, scale: 1.00, tx:   0, ty:   0 },
    { at: 0.06, scale: 1.00, tx:   0, ty:   0 },

    /* ── Etapa 1: MANTENIMIENTO ──
       Zoom al tejado central para ver las placas solares.
       tx: 0 (centro), ty: -90px (sube hacia el tejado) */
    { at: 0.18, scale: 3.20, tx:   250, ty: 100 },
    { at: 0.28, scale: 5, tx:   250, ty: 105 },

    /* ── Etapa 2: INSTALACIONES ──
       Retrocede un poco y enfoca la fachada completa de la casa.
       tx: 60px (se centra más en la casa, que está ligeramente a la derecha del centro) */
    { at: 0.38, scale: 5, tx:  50, ty: 100 },
    { at: 0.48, scale: 1.70, tx:  65, ty: -32 },

    /* ── Etapa 3: INSTALACIONES ENERGÉTICAS ──
       Pan a la derecha hacia el vehículo elevador (left: 1060px).
       El diorama es 1400px; el vehículo está a ~1175px del centro.
       tx negativo = cámara va a la derecha del diorama. */
    { at: 0.58, scale: 1.50, tx: 200, ty:  0 },
    { at: 0.67, scale: 1.50, tx: 200, ty:  0 },

    /* ── Etapa 4: BATERÍAS ──
       Pan a la izquierda hacia el sistema de baterías (left: 176px).
       tx positivo = cámara va a la izquierda del diorama. */
    { at: 0.77, scale: 3.10, tx:  450, ty:  -90 },
    { at: 0.84, scale: 5.00, tx:  500, ty:  -100 },

    /* Retorno a vista general */
    { at: 1.00, scale: 1.00, tx:    0, ty:   0 }
  ];

  /* ════════════════════════════════════════════════════════════
     ETAPAS — rangos de progreso que activan tarjeta y glow
  ════════════════════════════════════════════════════════════ */
  const STAGES = [
    { id: 'mantenimiento', start: 0.06, end: 0.30, focus: 'solar'     },
    { id: 'instalaciones', start: 0.50, end: 0.68, focus: 'facade'    },
    { id: 'energeticas',   start: 0.30, end: 0.50, focus: 'lift'      },
    { id: 'baterias',      start: 0.68, end: 0.85, focus: 'batteries' }
  ];

  /* ── Estado interpolado actual (suavizado con lerp) ── */
  const current = { scale: 1, tx: 0, ty: 0 };
  let   target  = { scale: 1, tx: 0, ty: 0 };
  let   scrollTicking = false;

  /* ════════════════════════════════════════════════════════════
     HELPERS MATEMÁTICOS
  ════════════════════════════════════════════════════════════ */

  /** Interpolación lineal */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /**
   * Easing suave: evita arranques/frenadas bruscas.
   * Equivalente a cubic-bezier(0.4, 0, 0.2, 1) pero en JS puro.
   */
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  /* ════════════════════════════════════════════════════════════
     INTERPOLACIÓN DE KEYFRAMES
     Dado un progreso p (0–1), encuentra los dos keyframes
     adyacentes y los interpola con easing suave.
  ════════════════════════════════════════════════════════════ */
  function interpolateKeyframes(p) {
    let i = 0;
    while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].at <= p) i++;

    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];

    if (a.at === b.at) return { scale: a.scale, tx: a.tx, ty: a.ty };

    const t = smoothstep(Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at))));

    return {
      scale: lerp(a.scale, b.scale, t),
      tx:    lerp(a.tx,    b.tx,    t),
      ty:    lerp(a.ty,    b.ty,    t)
    };
  }

  /* ════════════════════════════════════════════════════════════
     PROGRESO DE SCROLL
     Valor 0–1 basado en cuánto se ha scrolleado la sección.
     Lee getBoundingClientRect una sola vez por frame.
  ════════════════════════════════════════════════════════════ */
  function getProgress() {
    const scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    const scrolled = -section.getBoundingClientRect().top;
    return Math.max(0, Math.min(1, scrolled / scrollable));
  }

  /* ════════════════════════════════════════════════════════════
     FOCUS CLASSES
     Añade una clase al section para que el CSS active el glow
     del elemento que corresponde a la etapa activa.
  ════════════════════════════════════════════════════════════ */
  const FOCUS_CLASSES = ['is-focus-solar','is-focus-facade','is-focus-lift','is-focus-batteries'];

  function updateFocusClasses(progress) {
    section.classList.remove(...FOCUS_CLASSES);
    for (const stage of STAGES) {
      if (progress >= stage.start && progress < stage.end) {
        section.classList.add('is-focus-' + stage.focus);
        break;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════
     TARJETAS Y DOTS
  ════════════════════════════════════════════════════════════ */
  function updateCards(progress) {
    const margin = 0.012;
    cards.forEach((card) => {
      const stage = STAGES.find(s => s.id === card.dataset.stage);
      if (!stage) return;
      card.classList.toggle('is-active',
        progress >= stage.start + margin && progress <= stage.end - margin
      );
    });
  }

  function updateDots(progress) {
    let activeIdx = -1;
    STAGES.forEach((s, i) => { if (progress >= s.start && progress < s.end) activeIdx = i; });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeIdx));
  }

  /* ════════════════════════════════════════════════════════════
     UPDATE TARGET
     Lee el scroll, calcula todos los estados derivados y
     actualiza el target de la cámara.
     Se llama una sola vez por evento de scroll (throttled por RAF).
  ════════════════════════════════════════════════════════════ */
  function updateTarget() {
    const progress = getProgress();

    target = interpolateKeyframes(progress);

    if (progressBar) {
      progressBar.style.width = (progress * 100).toFixed(1) + '%';
    }

    if (intro) {
      intro.classList.toggle('is-hidden', progress > 0.05);
    }

    updateFocusClasses(progress);
    updateCards(progress);
    updateDots(progress);
  }

  /* ════════════════════════════════════════════════════════════
     RENDER CAMERA — RAF LOOP
     Aplica lerp entre current y target para suavizar el movimiento.
     Separa lectura (updateTarget) de escritura (aquí) → evita
     layout thrashing.

     IMPORTANTE: el transform solo usa scale + translate.
     NO hay rotateY. El diorama es siempre frontal.

     ease = 0.09 → suave, con ligero lag cinematográfico.
       Subir a 0.15 para respuesta más rápida.
  ════════════════════════════════════════════════════════════ */
  function renderCamera() {
    const ease = 0.09;

    current.scale = lerp(current.scale, target.scale, ease);
    current.tx    = lerp(current.tx,    target.tx,    ease);
    current.ty    = lerp(current.ty,    target.ty,    ease);

    /* Un único string de transform — evita múltiples reflows */
    camera.style.transform =
      'scale(' + current.scale.toFixed(4) + ') ' +
      'translate(' + current.tx.toFixed(2) + 'px, ' + current.ty.toFixed(2) + 'px)';

    requestAnimationFrame(renderCamera);
  }

  /* ════════════════════════════════════════════════════════════
     SCROLL HANDLER — throttled
  ════════════════════════════════════════════════════════════ */
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateTarget();
      scrollTicking = false;
    });
  }

  /* ════════════════════════════════════════════════════════════
     DOTS — click navega al centro de la etapa
  ════════════════════════════════════════════════════════════ */
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const stage = STAGES[i];
      if (!stage) return;
      const targetProgress = (stage.start + stage.end) / 2;
      const scrollable  = section.offsetHeight - window.innerHeight;
      const sectionTop  = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: sectionTop + targetProgress * scrollable, behavior: 'smooth' });
    });
  });

  /* ── Arranque ── */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  updateTarget();   /* estado inicial */
  renderCamera();   /* arranca el loop */

})();


/* ═══════════════════════════════════════════════════════════════
   REVEAL ANIMATIONS — sin cambios
   ═══════════════════════════════════════════════════════════════ */

const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('active-reveal');
  });
}, { threshold: 0.2 });

reveals.forEach((el) => revealObserver.observe(el));