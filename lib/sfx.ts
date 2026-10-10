/**
 * Tüm sesler WebAudio ile üretilir; ses dosyası gerekmez.
 * Tarayıcılar sesi ancak kullanıcı etkileşiminden sonra açtığı için
 * `Sfx.unlock()` ilk tıklama / tuşta çağrılmalıdır.
 */

interface ToneOpts {
  freq?: number; type?: OscillatorType; dur?: number; vol?: number; attack?: number;
  slide?: number; when?: number; send?: number; filter?: number; bus?: GainNode | null;
}
interface NoiseOpts {
  dur?: number; vol?: number; type?: BiquadFilterType; freq?: number; when?: number; q?: number;
}

let ctx: AudioContext | null = null;
let sfxBus!: GainNode;
let delayIn!: GainNode;
let noiseBuf!: AudioBuffer;
let muted = false;
let visibilityBound = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
    return null;
  }
  const c = ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(c.destination);
  const master = c.createGain();
  master.gain.value = 0.9;
  master.connect(comp);

  sfxBus = c.createGain();
  sfxBus.gain.value = muted ? 0 : 1;
  sfxBus.connect(master);

  // Hafif yankı: efektlere "mekân" hissi verir
  delayIn = c.createGain();
  const dly = c.createDelay(1);
  dly.delayTime.value = 0.23;
  const fb = c.createGain();
  fb.gain.value = 0.32;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const wet = c.createGain();
  wet.gain.value = 0.5;
  delayIn.connect(dly);
  dly.connect(lp);
  lp.connect(fb);
  fb.connect(dly);
  lp.connect(wet);
  wet.connect(master);

  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }
  return ctx;
}

const ok = () => !muted && !!ensure();

function tone(o: ToneOpts) {
  const c = ctx!;
  const { freq = 440, type = 'sine', dur = 0.2, vol = 0.1, attack = 0.004, slide = 0, when = 0, send = 0, filter = 0, bus = null } = o;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    f.connect(g);
  } else osc.connect(g);
  g.connect(bus || sfxBus);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(delayIn);
  }
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise({ dur = 0.1, vol = 0.2, type = 'lowpass', freq = 1000, when = 0, q = 1 }: NoiseOpts) {
  const c = ctx!;
  const t = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const Sfx = {
  /** İlk kullanıcı etkileşiminde çağır. */
  unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') void c.resume();
  },
  setSound(on: boolean) {
    muted = !on;
    if (sfxBus) sfxBus.gain.value = on ? 1 : 0;
  },
  click() {
    if (!ok()) return;
    tone({ freq: 1300, type: 'square', dur: 0.035, vol: 0.035, filter: 3000 });
  },
  start() {
    if (!ok()) return;
    tone({ freq: 220, type: 'sawtooth', dur: 0.5, vol: 0.08, slide: 3, filter: 1200, send: 0.4 });
    tone({ freq: 660, type: 'triangle', dur: 0.4, vol: 0.06, when: 0.1, send: 0.5 });
  },
  place(sym: 'X' | 'O') {
    if (!ok()) return;
    if (sym === 'X') {
      noise({ dur: 0.09, vol: 0.35, type: 'lowpass', freq: 900 });
      tone({ freq: 170, type: 'sawtooth', dur: 0.22, vol: 0.16, slide: 0.5, filter: 700 });
      tone({ freq: 880, type: 'triangle', dur: 0.25, vol: 0.05, when: 0.04, send: 0.4 });
    } else {
      tone({ freq: 740, type: 'sine', dur: 0.42, vol: 0.16, send: 0.5 });
      tone({ freq: 1480, type: 'sine', dur: 0.3, vol: 0.05, when: 0.01, send: 0.5 });
      noise({ dur: 0.14, vol: 0.06, type: 'bandpass', freq: 3000 });
    }
  },
  win() {
    if (!ok()) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.7, vol: 0.13, when: i * 0.09, send: 0.5 }),
    );
    tone({ freq: 130.81, type: 'sawtooth', dur: 1.4, vol: 0.07, filter: 500 });
    tone({ freq: 196, type: 'sawtooth', dur: 1.4, vol: 0.05, filter: 500 });
  },
  lose() {
    if (!ok()) return;
    [392, 349.23, 311.13, 261.63].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.12, when: i * 0.16, slide: 0.96, send: 0.35, filter: 1400 }),
    );
  },
  draw() {
    if (!ok()) return;
    tone({ freq: 440, type: 'sine', dur: 0.3, vol: 0.12, send: 0.3 });
    tone({ freq: 392, type: 'sine', dur: 0.5, vol: 0.12, when: 0.16, send: 0.4 });
  },
};
