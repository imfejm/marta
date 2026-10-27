// Čtvercová síť teček na černém pozadí, rozteč 1 cm.
// Tečka pod kurzorem zežloutne (#b9ae50) a pomalu zase zešedne.
const canvas = document.getElementById("dots");
const ctx = canvas.getContext("2d");

const SPACING = 96 / 2.54; // 1 cm v CSS pixelech (≈ 37,8 px)
const RADIUS = 1.5;
const FADE_MS = 800;
const BASE = [58, 58, 58]; // jemně světlejší než černá
const HOVER = [185, 174, 80]; // #b9ae50

let cols = 0;
let rows = 0;
let dpr = 1;
const lit = new Map(); // index tečky -> čas posledního přejetí

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.ceil(window.innerWidth * dpr);
  canvas.height = Math.ceil(window.innerHeight * dpr);
  cols = Math.ceil(window.innerWidth / SPACING) + 1;
  rows = Math.ceil(window.innerHeight / SPACING) + 1;
  draw(performance.now());
}

function color(t) {
  const mix = BASE.map((b, i) => Math.round(b + (HOVER[i] - b) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const [key, time] of lit) {
    if (now - time > FADE_MS) lit.delete(key);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = r * cols + c;
      const time = lit.get(key);
      const t = time === undefined ? 0 : 1 - (now - time) / FADE_MS;
      ctx.fillStyle = color(Math.max(0, t));
      ctx.beginPath();
      ctx.arc(c * SPACING, r * SPACING, RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (lit.size) requestAnimationFrame(draw);
}

function light(e) {
  // Čtyři rohy buňky, ve které je kurzor (nebo prst), se rozsvítí vždy.
  const c0 = Math.floor(e.clientX / SPACING);
  const r0 = Math.floor(e.clientY / SPACING);
  const now = performance.now();
  const wasIdle = lit.size === 0;

  for (let r = r0; r <= r0 + 1; r++) {
    for (let c = c0; c <= c0 + 1; c++) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      lit.set(r * cols + c, now);
    }
  }
  if (wasIdle) requestAnimationFrame(draw);
}

// Myš. Pointer události při dotyku zruší prohlížeč, jakmile převezme gesto
// (scroll), proto má dotyk vlastní touch události, které chodí dál.
document.addEventListener("mousemove", light);

function lightTouch(e) {
  for (const t of e.touches) light(t);
}
document.addEventListener("touchstart", lightTouch, { passive: true });
document.addEventListener("touchmove", lightTouch, { passive: true });

window.addEventListener("resize", resize);
resize();

// Porovnání před / po: hodnota posuvníku řídí CSS proměnnou --pos
document.querySelectorAll(".compare").forEach((box) => {
  const range = box.querySelector(".compare-range");
  range.addEventListener("input", () => {
    box.style.setProperty("--pos", `${range.value}%`);
  });
});

// Zvětšení: velké fotky se načtou až při prvním otevření
document.querySelectorAll("[data-open]").forEach((btn) => {
  const dialog = document.getElementById(btn.dataset.open);
  btn.addEventListener("click", () => {
    dialog.querySelectorAll("img[data-src]").forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
    dialog.showModal();
  });
  dialog
    .querySelector(".lightbox-close")
    .addEventListener("click", () => dialog.close());
  // klik mimo fotku (na pozadí) zavře okno
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
});
