import { DEFAULT_SETTINGS, type Settings } from './types';

const KEY = 'tic-tac-toe:settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const v = JSON.parse(raw) as Partial<Settings>;
    const d = DEFAULT_SETTINGS;
    return {
      mode: v.mode === 'pvp' ? 'pvp' : d.mode,
      difficulty: v.difficulty === 'easy' || v.difficulty === 'hard' ? v.difficulty : d.difficulty,
      side: v.side === 'O' ? 'O' : d.side,
      sound: v.sound !== false,
      name: typeof v.name === 'string' ? v.name.slice(0, 16) : d.name,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* depolama kapalı olabilir */
  }
}
