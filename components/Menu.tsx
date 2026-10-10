'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { Sfx } from '@/lib/sfx';
import { fetchLeaderboard, type LeaderRow } from '@/lib/api';
import { cleanName } from '@/lib/util';
import type { Settings } from '@/lib/types';

interface SegProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onPick: (v: T) => void;
  children?: ReactNode;
}

function Seg<T extends string>({ id, label, value, options, onPick, children }: SegProps<T>) {
  return (
    <div className="opt">
      <span className="opt-label" id={id}>{label}</span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            data-value={o.value}
            onClick={() => onPick(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

interface MenuProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onStart: () => void;
}

export default function Menu({ settings, onChange, onStart }: MenuProps) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchLeaderboard(5).then((r) => {
      if (alive) setRows(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  const set = (patch: Partial<Settings>) => {
    Sfx.click();
    onChange(patch);
  };
  const me = cleanName(settings.name).toLocaleLowerCase('tr');

  return (
    <section className="screen" aria-label="Ana menü">
      <Logo />
      <p className="tagline">Üç taşı yan yana getiren kazanır.</p>

      <div className="opts">
        <Seg
          id="lblMode"
          label="Rakip"
          value={settings.mode}
          options={[
            { value: 'ai', label: 'Bilgisayar' },
            { value: 'pvp', label: 'İkinci oyuncu' },
          ]}
          onPick={(mode) => set({ mode })}
        />

        {settings.mode === 'ai' && (
          <div className="opts nested">
            <Seg
              id="lblDiff"
              label="Zorluk"
              value={settings.difficulty}
              options={[
                { value: 'easy', label: 'Kolay' },
                { value: 'medium', label: 'Orta' },
                { value: 'hard', label: 'Yenilmez' },
              ]}
              onPick={(difficulty) => set({ difficulty })}
            />
            <Seg
              id="lblSide"
              label="Tarafın"
              value={settings.side}
              options={[
                { value: 'X', label: 'X' },
                { value: 'O', label: 'O' },
              ]}
              onPick={(side) => set({ side })}
            >
              <p className="hint">İlk turu X başlatır, sonraki turlarda başlama sırası değişir.</p>
            </Seg>
            <div className="opt">
              <label className="opt-label" htmlFor="playerName">Adın</label>
              <input
                id="playerName"
                className="text-input"
                type="text"
                value={settings.name}
                maxLength={16}
                autoComplete="nickname"
                placeholder="Sıralama için bir ad yaz"
                onChange={(e) => onChange({ name: e.target.value })}
              />
              <p className="hint">Boş bırakırsan sonuçların sıralamaya kaydedilmez.</p>
            </div>
          </div>
        )}
      </div>

      <button className="btn primary big" type="button" onClick={onStart}>
        Oyuna başla
      </button>

      {rows && rows.length > 0 && (
        <div className="lb">
          <h2>Sıralama</h2>
          <ol>
            {rows.map((r, i) => (
              <li key={r.player} className={r.player.toLocaleLowerCase('tr') === me ? 'me' : undefined}>
                <span className="rank">{i + 1}</span>
                <span className="name">
                  {r.player}
                  <small>{r.wins} galibiyet</small>
                </span>
                <span className="pts">{r.points}</span>
              </li>
            ))}
          </ol>
          <p className="hint">Puan, zorluğa göre galibiyet ve beraberliklerden gelir.</p>
        </div>
      )}
    </section>
  );
}
