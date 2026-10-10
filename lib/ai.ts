import type { Cell, Difficulty, Sym } from './types';
import { pick } from './util';

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(b: readonly Cell[]): { who: Sym; line: number[] } | null {
  for (const [x, y, z] of LINES) {
    const v = b[x];
    if (v && v === b[y] && v === b[z]) return { who: v, line: [x, y, z] };
  }
  return null;
}

function emptyCells(b: readonly Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 9; i++) if (!b[i]) out.push(i);
  return out;
}

const other = (s: Sym): Sym => (s === 'X' ? 'O' : 'X');

function findWinningMove(b: Cell[], sym: Sym): number {
  for (const i of emptyCells(b)) {
    b[i] = sym;
    const w = winner(b);
    b[i] = null;
    if (w) return i;
  }
  return -1;
}

function minimax(b: Cell[], turn: Sym, ai: Sym, depth: number, alpha: number, beta: number): number {
  const w = winner(b);
  if (w) return w.who === ai ? 10 - depth : depth - 10;
  const free = emptyCells(b);
  if (!free.length) return 0;
  const human = other(ai);

  if (turn === ai) {
    let best = -Infinity;
    for (const i of free) {
      b[i] = ai;
      best = Math.max(best, minimax(b, human, ai, depth + 1, alpha, beta));
      b[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const i of free) {
    b[i] = human;
    best = Math.min(best, minimax(b, ai, ai, depth + 1, alpha, beta));
    b[i] = null;
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/** Eşit derecede iyi olan tüm hamleleri döndürür (yenilmez seviye bunlardan rastgele seçer). */
export function bestMoves(board: readonly Cell[], ai: Sym): number[] {
  const b = board.slice();
  const human = other(ai);
  let bestScore = -Infinity;
  let moves: number[] = [];
  for (const i of emptyCells(b)) {
    b[i] = ai;
    const s = minimax(b, human, ai, 1, -Infinity, Infinity);
    b[i] = null;
    if (s > bestScore) {
      bestScore = s;
      moves = [i];
    } else if (s === bestScore) moves.push(i);
  }
  return moves;
}

export function aiMove(board: readonly Cell[], ai: Sym, difficulty: Difficulty): number {
  const b = board.slice();
  const human = other(ai);
  const free = emptyCells(b);

  if (difficulty === 'easy') {
    if (Math.random() < 0.25) {
      let m = findWinningMove(b, ai);
      if (m >= 0) return m;
      m = findWinningMove(b, human);
      if (m >= 0) return m;
    }
    return pick(free);
  }

  if (difficulty === 'medium') {
    let m = findWinningMove(b, ai);
    if (m >= 0) return m;
    m = findWinningMove(b, human);
    if (m >= 0) return m;
    if (!b[4] && Math.random() < 0.7) return 4;
    const corners = [0, 2, 6, 8].filter((i) => !b[i]);
    if (corners.length && Math.random() < 0.6) return pick(corners);
    return pick(free);
  }

  if (free.length === 9) return pick([0, 2, 4, 6, 8]);
  return pick(bestMoves(b, ai));
}
