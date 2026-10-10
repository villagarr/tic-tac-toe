export const rand = (n: number) => Math.floor(Math.random() * n);
export const pick = <T>(a: readonly T[]): T => a[rand(a.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const reduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* titreşim desteklenmiyor */
  }
};

/** Sıralamada kullanılacak oyuncu adını temizler (sunucudaki kuralla aynı). */
export const cleanName = (raw: string) =>
  raw.replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
