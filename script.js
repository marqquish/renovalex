/* =========================
   STORYTELLING LOGIC
========================= */

const steps = document.querySelectorAll('.story-step');

const solar = document.getElementById('solarObj');
const battery = document.getElementById('batteryObj');
const charger = document.getElementById('chargerObj');

const objects = { solar, battery, charger };
const all = [solar, battery, charger];

const observer = new IntersectionObserver((entries) => {

  entries.forEach(entry => {

    if (!entry.isIntersecting) return;

    steps.forEach(s => s.classList.remove('active'));
    entry.target.classList.add('active');

    all.forEach(o => o.classList.remove('active-object'));

    const type = entry.target.dataset.object;
    if (objects[type]) objects[type].classList.add('active-object');

  });

}, { threshold: 0.55 });

steps.forEach(s => observer.observe(s));


/* =========================
   🎥 CAMERA (SOLO ESTE TRANSFORM)
========================= */

const camera = document.querySelector('.camera');

let currentX = 0;
let currentY = 0;

window.addEventListener('scroll', () => {

  const y = window.scrollY;

  const targetY = Math.sin(y * 0.002) * 12;
  const targetX = Math.sin(y * 0.0015) * 6;

  // suavizado (IMPORTANTÍSIMO)
  currentY += (targetY - currentY) * 0.08;
  currentX += (targetX - currentX) * 0.08;

  camera.style.transform = `
    rotateX(${currentX}deg)
    rotateY(${currentY}deg)
  `;

});


/* =========================
   ✨ FLOAT ANIMATION (SIN PISAR CSS)
========================= */

setInterval(() => {

  const active = document.querySelector('.active-object');
  if (!active) return;

  const t = Date.now() * 0.001;

  // ⚠️ SOLO usar translate + rotate extra, NO reset completo
  active.style.transform = `
    translateY(${Math.sin(t) * 6}px)
    rotateY(15deg)
    scale(1)
  `;

}, 16);


/* =========================
   🔥 REVEAL ANIMATIONS
========================= */

const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries)=>{

  entries.forEach(entry=>{

    if(entry.isIntersecting){
      entry.target.classList.add('active-reveal');
    }

  });

},{ threshold:0.2 });

reveals.forEach(el=>{
  revealObserver.observe(el);
});