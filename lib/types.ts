import type { RGB } from './fx';

export type Sym = 'X' | 'O';
export type Cell = Sym | null;
export type Outcome = Sym | 'D';
export type Mode = 'ai' | 'pvp';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Tone = 'X' | 'O' | 'D';

export interface Settings {
  mode: Mode;
  difficulty: Difficulty;
  side: Sym;
  sound: boolean;
  name: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'ai',
  difficulty: 'medium',
  side: 'X',
  sound: true,
  name: '',
};

/** Ekran efektleri: Game bileşeni oluşturur, GameScreen kullanır. */
export interface Effects {
  burst: (x: number, y: number, palette: RGB[], n: number, speed: number) => void;
  rain: (palette: RGB[], n: number) => void;
  flash: (rgb: string) => void;
  shake: () => void;
}
