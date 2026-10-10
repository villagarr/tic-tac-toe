'use client';

import {
  useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject,
} from 'react';
import { Mark } from './Mark';
import { aiMove, winner } from '@/lib/ai';
import { recordResult } from '@/lib/api';
import { PAL } from '@/lib/fx';
import { Sfx } from '@/lib/sfx';
import { buzz, clamp, cleanName, reduced } from '@/lib/util';
import type { Cell, Effects, Outcome, Settings, Sym, Tone } from '@/lib/types';

/* ---------------- Oyun durumu ---------------- */

interface State {
  board: Cell[];
  turn: Sym;
  starter: Sym;
  round: number;
  outcome: Outcome | null;
  line: number[] | null;
  scores: Record<Outcome, number>;
  last: { i: number; id: number } | null;
  moveId: number;
  resultShown: boolean;
}

type Action = { type: 'move'; i: number } | { type: 'next' } | { type: 'result' };

const emptyBoard = (): Cell[] => Array<Cell>(9).fill(null);

const initial = (): State => ({
  board: emptyBoard(),
  turn: 'X',
  starter: 'X',
  round: 1,
  outcome: null,
  line: null,
  scores: { X: 0, O: 0, D: 0 },
  last: null,
  moveId: 0,
  resultShown: false,
});

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'move': {
      if (s.outcome || s.board[a.i]) return s;
      const board = s.board.slice();
      board[a.i] = s.turn;
      const id = s.moveId + 1;
      const last = { i: a.i, id };
      const w = winner(board);
      if (w) {
        return { ...s, board, outcome: w.who, line: w.line, scores: { ...s.scores, [w.who]: s.scores[w.who] + 1 }, last, moveId: id };
      }
      if (board.every(Boolean)) {
        return { ...s, board, outcome: 'D', line: null, scores: { ...s.scores, D: s.scores.D + 1 }, last, moveId: id };
      }
      return { ...s, board, turn: s.turn === 'X' ? 'O' : 'X', last, moveId: id };
    }
    case 'next': {
      const starter: Sym = s.starter === 'X' ? 'O' : 'X';
      return { ...s, board: emptyBoard(), turn: starter, starter, round: s.round + 1, outcome: null, line: null, last: null, resultShown: false };
    }
    case 'result':
      return s.outcome ? { ...s, resultShown: true } : s;
  }
}

const POS = ['sol üst', 'orta üst', 'sağ üst', 'sol orta', 'orta', 'sağ orta', 'sol alt', 'orta alt', 'sağ alt'];

/* ---------------- Bileşen ---------------- */

interface Props {
  settings: Settings;
  fx: MutableRefObject<Effects | null>;
  onTone: (t: Tone) => void;
  onRound: (n: number) => void;
}

export default function GameScreen({ settings, fx, onTone, onRound }: Props) {
  const [s, dispatch] = useReducer(reducer, null, initial);
  const [winPath, setWinPath] = useState<{ d: string; vb: string } | null>(null);

  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const isAI = settings.mode === 'ai';
  const over = s.outcome !== null;
  const humanTurn = !isAI || s.turn === settings.side;
  const thinking = isAI && !over && s.turn !== settings.side;

  /* Atmosfer ve tur numarası üst bileşene bildirilir */
  useEffect(() => {
    onTone(s.outcome ?? s.turn);
  }, [s.outcome, s.turn, onTone]);
  useEffect(() => () => onTone('D'), [onTone]);
  useEffect(() => {
    onRound(s.round);
  }, [s.round, onRound]);

  /* Oyuncunun hamlesi */
  const play = useCallback(
    (i: number) => {
      if (over || s.board[i] || !humanTurn) return;
      dispatch({ type: 'move', i });
    },
    [over, s.board, humanTurn],
  );

  /* Bilgisayarın hamlesi */
  useEffect(() => {
    if (!isAI || over || s.turn === settings.side) return;
    const t = setTimeout(
      () => dispatch({ type: 'move', i: aiMove(s.board, s.turn, settings.difficulty) }),
      520 + Math.random() * 420,
    );
    return () => clearTimeout(t);
  }, [isAI, over, s.turn, s.board, settings.side, settings.difficulty]);

  /* Her hamlede ses, titreşim ve kıvılcım */
  useEffect(() => {
    if (!s.last) return;
    const sym = s.board[s.last.i];
    if (!sym) return;
    Sfx.place(sym);
    buzz(12);
    const el = cellRefs.current[s.last.i];
    if (el) {
      const r = el.getBoundingClientRect();
      fx.current?.burst(r.left + r.width / 2, r.top + r.height / 2, PAL[sym === 'X' ? 'x' : 'o'], 14, 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.last?.id]);

  /* Tur bitişi: ses, ekran efektleri, sonucu göster, backend'e kaydet */
  useEffect(() => {
    const outcome = s.outcome;
    if (!outcome) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (outcome === 'D') {
      timers.push(setTimeout(() => {
        Sfx.draw();
        fx.current?.flash('180,190,220');
      }, 300));
    } else {
      const key = outcome === 'X' ? 'x' : 'o';
      const humanWon = isAI ? outcome === settings.side : true;
      const rgb = outcome === 'X' ? '255,110,60' : '90,200,255';
      const line = s.line ?? [];
      timers.push(setTimeout(() => {
        fx.current?.flash(rgb);
        fx.current?.shake();
        buzz([20, 40, 30]);
        for (const i of line) {
          const el = cellRefs.current[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          fx.current?.burst(r.left + r.width / 2, r.top + r.height / 2, [...PAL[key], ...PAL.gold], 46, 300);
        }
        if (humanWon) {
          Sfx.win();
          fx.current?.rain([...PAL[key], ...PAL.gold], 90);
        } else Sfx.lose();
      }, 520));
    }
    timers.push(setTimeout(() => dispatch({ type: 'result' }), 1100));

    if (isAI) {
      const player = cleanName(settings.name);
      if (player) {
        void recordResult({
          player,
          difficulty: settings.difficulty,
          side: settings.side,
          outcome: outcome === 'D' ? 'draw' : outcome === settings.side ? 'win' : 'loss',
        });
      }
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.outcome, s.round]);

  /* Kazanan çizgisi: hücre merkezlerinden hesaplanır */
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!s.line || !grid) {
      setWinPath(null);
      return;
    }
    const a = cellRefs.current[s.line[0]];
    const b = cellRefs.current[s.line[2]];
    if (!a || !b) return;
    const ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2;
    const bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ext = a.offsetWidth * 0.28;
    const p = (n: number) => n.toFixed(1);
    setWinPath({
      d: `M${p(ax - (dx / len) * ext)} ${p(ay - (dy / len) * ext)}L${p(bx + (dx / len) * ext)} ${p(by + (dy / len) * ext)}`,
      vb: `0 0 ${grid.clientWidth} ${grid.clientHeight}`,
    });
  }, [s.line]);

  /* Sonuç görününce "Sonraki tur" düğmesine odaklan */
  useEffect(() => {
    if (s.resultShown) nextRef.current?.focus({ preventScroll: true });
  }, [s.resultShown]);

  /* 1–9 tuşlarıyla oynama */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) play(Number(e.key) - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [play]);

  /* Ok tuşlarıyla hücreler arasında gezinme */
  const onGridKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const idx = cellRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    const r = Math.floor(idx / 3), c = idx % 3;
    let n: number;
    switch (e.key) {
      case 'ArrowLeft': n = r * 3 + ((c + 2) % 3); break;
      case 'ArrowRight': n = r * 3 + ((c + 1) % 3); break;
      case 'ArrowUp': n = ((r + 2) % 3) * 3 + c; break;
      case 'ArrowDown': n = ((r + 1) % 3) * 3 + c; break;
      default: return;
    }
    e.preventDefault();
    cellRefs.current[n]?.focus();
  };

  /* Fareyle tahta eğimi ve yansıma */
  useEffect(() => {
    if (typeof matchMedia !== 'function' || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    let raf = 0;
    let ev: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      const wrap = wrapRef.current, board = boardRef.current;
      if (!ev || !wrap || !board || reduced()) return;
      const r = wrap.getBoundingClientRect();
      const px = (ev.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const py = (ev.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      board.style.setProperty('--rx', clamp(-py * 6, -6, 6).toFixed(2) + 'deg');
      board.style.setProperty('--ry', clamp(px * 8, -8, 8).toFixed(2) + 'deg');
      board.style.setProperty('--mx', clamp(((ev.clientX - r.left) / r.width) * 100, -20, 120).toFixed(1) + '%');
      board.style.setProperty('--my', clamp(((ev.clientY - r.top) / r.height) * 100, -20, 120).toFixed(1) + '%');
    };
    const move = (e: PointerEvent) => {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const leave = () => {
      boardRef.current?.style.setProperty('--rx', '0deg');
      boardRef.current?.style.setProperty('--ry', '0deg');
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  /* ---------------- Görünüm ---------------- */

  const nameX = isAI ? (settings.side === 'X' ? 'Sen' : 'Bilgisayar') : 'Oyuncu X';
  const nameO = isAI ? (settings.side === 'O' ? 'Sen' : 'Bilgisayar') : 'Oyuncu O';

  let turnText: string;
  if (isAI) turnText = thinking ? 'Bilgisayar düşünüyor' : 'Senin sıran';
  else turnText = `${s.turn} oyuncusunun sırası`;

  let title = '';
  let sub = '';
  if (s.outcome === 'D') {
    title = 'Berabere';
    sub = isAI && settings.difficulty === 'hard'
      ? 'Yenilmez seviyede berabere kalmak iyi bir sonuç.'
      : 'Kimse üç taşı yan yana getiremedi.';
  } else if (s.outcome && isAI) {
    if (s.outcome === settings.side) { title = 'Kazandın!'; sub = 'Bilgisayarı yendin.'; }
    else { title = 'Bilgisayar kazandı'; sub = 'Bir sonraki turda rövanş alabilirsin.'; }
  } else if (s.outcome) {
    title = `${s.outcome} kazandı!`;
    sub = `Skor ${s.scores.X} – ${s.scores.O}`;
  }

  const num = (v: number) => (
    <span key={v} className={v > 0 ? 'num bump' : 'num'}>{v}</span>
  );

  return (
    <section className="screen" aria-label="Oyun">
      <div className="scores" role="group" aria-label="Skor">
        <div className={'score x' + (s.turn === 'X' && !over ? ' active' : '')}>
          <svg className="glyph" viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26L74 74M74 26L26 74" /></svg>
          <div className="meta"><span className="who">{nameX}</span>{num(s.scores.X)}</div>
        </div>
        <div className="score d">
          <div className="meta"><span className="who">Berabere</span>{num(s.scores.D)}</div>
        </div>
        <div className={'score o' + (s.turn === 'O' && !over ? ' active' : '')}>
          <svg className="glyph" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="27" /></svg>
          <div className="meta"><span className="who">{nameO}</span>{num(s.scores.O)}</div>
        </div>
      </div>

      <div className="board-wrap" ref={wrapRef}>
        <div className="board" ref={boardRef}>
          <div
            ref={gridRef}
            className={'grid' + (thinking ? ' locked' : '') + (over ? ' over' : '')}
            data-turn={s.turn}
            role="group"
            aria-label="Oyun tahtası"
            onKeyDown={onGridKey}
          >
            {s.board.map((v, i) => {
              const win = !!s.line?.includes(i);
              const k = v ? v.toLowerCase() : '';
              const cls = ['cell', v && 'filled', v && `is-${k}`, win && 'win', win && `win-${k}`].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  ref={(el) => { cellRefs.current[i] = el; }}
                  type="button"
                  className={cls}
                  aria-disabled={v ? true : undefined}
                  aria-label={`${POS[i]} kare, ${v ? v + ' işaretli' : 'boş'}`}
                  onClick={() => play(i)}
                >
                  <span className="ghost gx"><Mark sym="X" /></span>
                  <span className="ghost go"><Mark sym="O" /></span>
                  <span className="piece">{v && <Mark sym={v} />}</span>
                  {s.last?.i === i && v && <span key={s.last.id} className={`ring ${k}`} />}
                </button>
              );
            })}
            <svg className="winline" viewBox={winPath?.vb} aria-hidden="true">
              {winPath && s.outcome && s.outcome !== 'D' && (
                <>
                  <path className={`glow ${s.outcome.toLowerCase()}`} pathLength={1} d={winPath.d} />
                  <path className="core" pathLength={1} d={winPath.d} />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      <div className="status" aria-live="polite">
        {!over && (
          <div className={'turn' + (thinking ? ' thinking' : '')}>
            <span className={'orb ' + s.turn.toLowerCase()} />
            <span>{turnText}</span>
            <span className="dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        )}
        {s.resultShown && s.outcome && (
          <div className="result">
            <h2 className={'result-title ' + s.outcome.toLowerCase()}>{title}</h2>
            <p className="result-sub">{sub}</p>
            <div className="actions">
              <button
                ref={nextRef}
                className="btn primary"
                type="button"
                onClick={() => { Sfx.click(); dispatch({ type: 'next' }); }}
              >
                Sonraki tur
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="kbd-hint">Ok tuşları ve Enter ile ya da 1–9 tuşlarıyla da oynayabilirsin.</p>
    </section>
  );
}
