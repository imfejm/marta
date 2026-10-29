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

// Tlačítko skryje obsah, aby šlo tahem prstem kreslit do teček (a vrátí ho)
const playBtn = document.getElementById("play");
function setPlay(on) {
  document.documentElement.classList.toggle("play", on);
  updateMenuButton();
}
playBtn.addEventListener("click", () => {
  setPlay(true);
  window.scrollTo(0, 0);
});

// Porovnání před / po: hodnota posuvníku řídí CSS proměnnou --pos
document.querySelectorAll(".compare").forEach((box) => {
  const range = box.querySelector(".compare-range");
  range.addEventListener("input", () => {
    box.style.setProperty("--pos", `${range.value}%`);
  });
});

// Při otevřeném zvětšení (zvlášť při celé obrazovce videa) některá zařízení
// stránku pod ním poposkočí nahoru, proto držíme původní pozici scrollu.
let lockedY = null;
function restoreScroll() {
  if (lockedY !== null && Math.abs(window.scrollY - lockedY) > 1) {
    window.scrollTo({ top: lockedY, behavior: "instant" });
  }
}
window.addEventListener("scroll", restoreScroll, { passive: true });
window.addEventListener("resize", restoreScroll);
document.addEventListener("fullscreenchange", restoreScroll);
document.addEventListener("webkitfullscreenchange", restoreScroll);

// Zvětšení: velké fotky se načtou až při prvním otevření
document.querySelectorAll("[data-open]").forEach((btn) => {
  const dialog = document.getElementById(btn.dataset.open);
  btn.addEventListener("click", () => {
    lockedY = window.scrollY;
    dialog.querySelectorAll("img[data-src], video[data-src]").forEach((el) => {
      el.src = el.dataset.src;
      el.removeAttribute("data-src");
    });
    dialog.showModal();
    const video = dialog.querySelector("video");
    if (video) video.play().catch(() => {});
  });
  // zavření okna zastaví video
  dialog.addEventListener("close", () => {
    restoreScroll();
    lockedY = null;
    const video = dialog.querySelector("video");
    if (video) video.pause();
  });
  dialog
    .querySelector(".lightbox-close")
    .addEventListener("click", () => dialog.close());
  // klik mimo fotku (na pozadí) zavře okno
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
});

// Hamburger tlačítko se objeví, jakmile se doscrolluje na úroveň .portfolio
const menuWrap = document.querySelector(".menu-wrap");
const portfolio = document.querySelector(".portfolio");
function updateMenuButton() {
  // v režimu hraní je portfolio skryté, hamburger je tam jediná cesta zpět
  const visible =
    document.documentElement.classList.contains("play") ||
    portfolio.getBoundingClientRect().top <= 0;
  menuWrap.classList.toggle("visible", visible);
}
window.addEventListener("scroll", updateMenuButton, { passive: true });
window.addEventListener("resize", updateMenuButton);
updateMenuButton();

// Rozbalovací menu: otevře se tlačítkem, zavře klikem na odkaz, mimo menu nebo Esc
const menuToggle = menuWrap.querySelector(".menu-toggle");
const menuPanel = document.getElementById("menu-panel");
function setMenu(open) {
  menuPanel.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
}
// Jedno oběhnutí světla po borderu při kliknutí (CSS jen na mobilu)
function orbit(btn) {
  btn.classList.remove("orbit");
  void btn.offsetWidth; // restart animace
  btn.classList.add("orbit");
}
const ORBIT_MS = 900;
menuToggle.addEventListener("click", () => {
  orbit(menuToggle);
  setMenu(menuPanel.hidden);
});
menuPanel.addEventListener("click", (e) => {
  const btn = e.target.closest(".button");
  if (!btn) return;
  // v režimu hraní je portfolio skryté, odkaz ho musí nejdřív vrátit
  if (btn.matches("a[href^='#']")) setPlay(false);
  orbit(btn);
  // menu se zavře až po doběhnutí animace, ať je vidět
  setTimeout(() => setMenu(false), ORBIT_MS);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap, .menu-panel")) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
// při návratu nahoru (tlačítko zmizí) se menu zavře
window.addEventListener(
  "scroll",
  () => {
    if (!menuWrap.classList.contains("visible")) setMenu(false);
  },
  { passive: true },
);

// Tlačítko "nahoru" v menu vrátí na nadpis h1 (a případně ukončí režim hraní)
document.getElementById("to-top").addEventListener("click", () => {
  setPlay(false);
  document
    .querySelector(".titleMenu h1")
    .scrollIntoView({ behavior: "smooth" });
});

// Nedělitelná mezera za jednopísmennými předložkami a spojkami (k, s, v, z, o, u, a, i) a za „na“,
// aby žádná nezůstala na konci řádku
const ORPHAN = /(?<=^|[\s(„"])([ksvzouai]|na)[ \t\n]+(?=\S)/gi;
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode: (node) =>
    node.parentElement.closest("script, style, textarea, noscript")
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT,
});
for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  node.nodeValue = node.nodeValue.replace(ORPHAN, "$1\u00A0");
}
