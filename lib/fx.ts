import { pick, reduced } from './util';

export type RGB = [number, number, number];

export const PAL: { x: RGB[]; o: RGB[]; gold: RGB[] } = {
  x: [[255, 150, 70], [255, 196, 100], [255, 96, 54]],
  o: [[110, 225, 255], [170, 190, 255], [214, 244, 255]],
  gold: [[255, 214, 125], [255, 240, 190]],
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  g: number; drag: number;
  sway: number; swayF: number; ph: number;
  life: number; age: number; size: number;
  c: RGB; amb: boolean; tw: number;
}

export interface FxApi {
  burst(x: number, y: number, palette: RGB[], n: number, speed: number, grav?: number): void;
  rain(palette: RGB[], n: number): void;
  destroy(): void;
}

/**
 * Tam ekran canvas üzerinde çalışır. `getTone` o anki atmosferi verir:
 * 'X' iken turuncu közler yükselir, 'O' iken mavi zerrecikler süzülür, 'D' iken ikisi birden.
 */
export function createFx(cv: HTMLCanvasElement, getTone: () => string): FxApi {
  const c = cv.getContext('2d');
  if (!c) return { burst() {}, rain() {}, destroy() {} };

  const parts: Particle[] = [];
  let W = 0, H = 0, ambCount = 0, ambBudget = 0, raf = 0, dead = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  function ambient(dt: number) {
    if (reduced()) return;
    ambBudget += dt * 6;
    while (ambBudget >= 1) {
      ambBudget -= 1;
      if (ambCount >= 70) break;
      const t = getTone();
      const isX = t === 'X' ? true : t === 'O' ? false : Math.random() < 0.5;
      if (isX) {
        parts.push({
          x: Math.random() * W, y: H + 8, vx: (Math.random() - 0.5) * 12, vy: -(28 + Math.random() * 46),
          g: 0, drag: 0, sway: 14 + Math.random() * 16, swayF: 0.8 + Math.random() * 1.2, ph: Math.random() * 6.28,
          life: 6 + Math.random() * 5, age: 0, size: 1 + Math.random() * 2.2, c: pick(PAL.x), amb: true, tw: 0,
        });
      } else {
        parts.push({
          x: Math.random() * W, y: -8, vx: (Math.random() - 0.5) * 8, vy: 14 + Math.random() * 24,
          g: 0, drag: 0, sway: 10 + Math.random() * 12, swayF: 0.5 + Math.random(), ph: Math.random() * 6.28,
          life: 8 + Math.random() * 5, age: 0, size: 0.9 + Math.random() * 1.8, c: pick(PAL.o), amb: true, tw: 3 + Math.random() * 3,
        });
      }
      ambCount++;
    }
  }

  function burst(x: number, y: number, palette: RGB[], n: number, speed: number, grav = 260) {
    if (reduced()) n = Math.ceil(n / 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * (0.25 + Math.random() * 0.75);
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.15,
        g: grav, drag: 1.6, sway: 0, swayF: 0, ph: 0,
        life: 0.5 + Math.random() * 0.8, age: 0, size: 1.2 + Math.random() * 2.4, c: pick(palette), amb: false, tw: 0,
      });
    }
  }

  function rain(palette: RGB[], n: number) {
    if (reduced()) return;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: -10 - Math.random() * H * 0.3, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 180,
        g: 60, drag: 0.2, sway: 20, swayF: 2 + Math.random() * 2, ph: Math.random() * 6.28,
        life: 2 + Math.random() * 1.6, age: 0, size: 1.4 + Math.random() * 2.4, c: pick(palette), amb: false, tw: 8,
      });
    }
  }

  let last = performance.now();
  function frame(now: number) {
    if (dead) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    c!.clearRect(0, 0, W, H);
    c!.globalCompositeOperation = 'lighter';
    ambient(dt);

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        if (p.amb) ambCount--;
        parts.splice(i, 1);
        continue;
      }
      const k = p.age / p.life;
      p.vy += p.g * dt;
      if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f; p.vy *= f;
      }
      if (p.sway) p.x += Math.sin(p.age * p.swayF + p.ph) * p.sway * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;

      let a = p.amb ? Math.sin(Math.PI * k) * 0.6 : 1 - k;
      if (p.tw) a *= 0.65 + 0.35 * Math.sin(p.age * p.tw + p.ph);
      const [r, g, b] = p.c;
      c!.fillStyle = `rgba(${r},${g},${b},${a * 0.18})`;
      c!.beginPath(); c!.arc(p.x, p.y, p.size * 3.2, 0, 6.283); c!.fill();
      c!.fillStyle = `rgba(${r},${g},${b},${a})`;
      c!.beginPath(); c!.arc(p.x, p.y, p.size, 0, 6.283); c!.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    burst,
    rain,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}
