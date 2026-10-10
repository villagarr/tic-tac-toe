'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GameScreen from './GameScreen';
import Menu from './Menu';
import { createFx } from '@/lib/fx';
import { Sfx } from '@/lib/sfx';
import { loadSettings, saveSettings } from '@/lib/storage';
import { reduced } from '@/lib/util';
import { DEFAULT_SETTINGS, type Effects, type Settings, type Tone } from '@/lib/types';

export default function Game() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');
  const [tone, setTone] = useState<Tone>('D');
  const [round, setRound] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const toneRef = useRef<Tone>('D');
  const fx = useRef<Effects | null>(null);

  useEffect(() => {
    toneRef.current = tone;
  }, [tone]);

  /* Kayıtlı ayarları yükle (sunucu çıktısıyla uyuşmazlık olmasın diye mount'tan sonra) */
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  /* Tarayıcılar sesi ilk etkileşimden sonra açar */
  useEffect(() => {
    const on = () => Sfx.unlock();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);
  useEffect(() => {
    Sfx.setSound(settings.sound);
  }, [settings.sound]);

  /* Parçacıklar, parlama ve ekran sarsıntısı */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const particles = createFx(cv, () => toneRef.current);
    fx.current = {
      burst: particles.burst,
      rain: particles.rain,
      flash: (rgb) => {
        const el = flashRef.current;
        if (!el || reduced() || !el.animate) return;
        el.style.setProperty('--fc', rgb);
        el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
      },
      shake: () => {
        const el = stageRef.current;
        if (!el || reduced() || !el.animate) return;
        el.animate(
          [
            { transform: 'translate(0,0)' },
            { transform: 'translate(-7px,3px)', offset: 0.15 },
            { transform: 'translate(6px,-4px)', offset: 0.3 },
            { transform: 'translate(-5px,-2px)', offset: 0.45 },
            { transform: 'translate(4px,3px)', offset: 0.6 },
            { transform: 'translate(-2px,1px)', offset: 0.8 },
            { transform: 'translate(0,0)' },
          ],
          { duration: 450, easing: 'cubic-bezier(.36,.07,.19,.97)' },
        );
      },
    };
    return () => {
      particles.destroy();
      fx.current = null;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const start = () => {
    Sfx.start();
    setRound(1);
    setScreen('game');
  };
  const back = () => {
    Sfx.click();
    setTone('D');
    setScreen('menu');
  };
  const toggleSound = () => {
    const sound = !settings.sound;
    Sfx.setSound(sound);
    update({ sound });
    Sfx.click();
  };
  return (
    <div className="root" data-screen={screen} data-turn={tone}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="gX" gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="80" y2="80">
            <stop offset="0" stopColor="#ffd479" />
            <stop offset="1" stopColor="#ff4d2e" />
          </linearGradient>
          <linearGradient id="gO" gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="80" y2="80">
            <stop offset="0" stopColor="#b8f4ff" />
            <stop offset="1" stopColor="#4f7bff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="atmos" aria-hidden="true" />

      <div className="app">
        <header className="topbar">
          <button className="back" type="button" onClick={back} aria-label="Menüye dön">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" /></svg>
            Menü
          </button>
          <div className="round">Tur {round}</div>
          <div className="tools">
            <button className="icon-btn" type="button" aria-pressed={settings.sound} aria-label="Ses efektleri" title="Ses efektleri" onClick={toggleSound}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4z" />
                <path className="on" d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
                <path className="off" d="M16 9.5l5 5M21 9.5l-5 5" />
              </svg>
            </button>
          </div>
        </header>

        <div className="stage" ref={stageRef}>
          {screen === 'menu' ? (
            <Menu settings={settings} onChange={update} onStart={start} />
          ) : (
            <GameScreen settings={settings} fx={fx} onTone={setTone} onRound={setRound} />
          )}
        </div>
      </div>

      <canvas ref={canvasRef} id="fx" aria-hidden="true" />
      <div className="flash" ref={flashRef} aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </div>
  );
}
