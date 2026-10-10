import type { CSSProperties } from 'react';
import type { Sym } from '@/lib/types';

/** X ve O işaretleri. `delays` çizim animasyonu için her çizgiye gecikme verir. */
export function Mark({ sym, delays }: { sym: Sym; delays?: string[] }) {
  const style = (i: number): CSSProperties | undefined =>
    delays?.[i] ? ({ '--d': delays[i] } as CSSProperties) : undefined;

  if (sym === 'X') {
    return (
      <svg className="mark x" viewBox="0 0 100 100" aria-hidden="true">
        <path pathLength={1} d="M26 26L74 74" style={style(0)} />
        <path pathLength={1} d="M74 26L26 74" style={style(1)} />
      </svg>
    );
  }
  return (
    <svg className="mark o" viewBox="0 0 100 100" aria-hidden="true">
      <circle pathLength={1} cx={50} cy={50} r={27} style={style(0)} />
    </svg>
  );
}
