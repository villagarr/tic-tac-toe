import type { Difficulty, Sym } from './types';

export interface LeaderRow {
  player: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

export interface ResultPayload {
  player: string;
  difficulty: Difficulty;
  side: Sym;
  outcome: 'win' | 'loss' | 'draw';
}

const timeout = () => AbortSignal.timeout(4000);

/** Tur sonucunu backend'e yollar. Backend kapalıysa oyun bozulmasın diye sessizce yutulur. */
export async function recordResult(payload: ResultPayload): Promise<void> {
  try {
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout(),
    });
  } catch {
    /* backend'e ulaşılamadı */
  }
}

/** Sıralamayı getirir. Backend'e ulaşılamazsa null döner. */
export async function fetchLeaderboard(limit = 5): Promise<LeaderRow[] | null> {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`, { signal: timeout(), cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { rows?: LeaderRow[] };
    return Array.isArray(data.rows) ? data.rows : null;
  } catch {
    return null;
  }
}
