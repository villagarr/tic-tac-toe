'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Zorluğa göre puanlar: yenilmez bilgisayarı yenmek (ya da ondan beraberlik almak) daha değerli.
const WIN_POINTS = { easy: 1, medium: 3, hard: 10 };
const DRAW_POINTS = { easy: 0, medium: 1, hard: 3 };

const emptyRecord = () => ({ w: 0, l: 0, d: 0 });

/**
 * Basit dosya tabanlı depo. Bellekte tutar, değişiklikleri kısa bir gecikmeyle
 * geçici dosyaya yazıp yeniden adlandırarak kaydeder (yarım yazılmış dosya kalmaz).
 */
class Store {
  constructor(file) {
    this.file = file || path.join(__dirname, 'data', 'db.json');
    this.db = { players: {} };
    this.timer = null;
    this._load();
  }

  _load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (raw && typeof raw.players === 'object' && raw.players) this.db = raw;
    } catch {
      /* dosya yok ya da bozuk: boş veriyle başla */
    }
  }

  _scheduleSave() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 200);
    this.timer.unref?.();
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.db));
    fs.renameSync(tmp, this.file);
  }

  /** outcome: 'win' | 'loss' | 'draw' (oyuncunun bakış açısından) */
  record({ player, difficulty, outcome }) {
    const key = player.toLocaleLowerCase('tr');
    const entry =
      this.db.players[key] ||
      (this.db.players[key] = {
        name: player,
        easy: emptyRecord(),
        medium: emptyRecord(),
        hard: emptyRecord(),
        updatedAt: 0,
      });
    const rec = entry[difficulty];
    if (outcome === 'win') rec.w++;
    else if (outcome === 'loss') rec.l++;
    else rec.d++;
    entry.updatedAt = Date.now();
    this._scheduleSave();
    return this._summary(entry);
  }

  _summary(entry) {
    let wins = 0, losses = 0, draws = 0, points = 0;
    for (const d of DIFFICULTIES) {
      const r = entry[d];
      wins += r.w;
      losses += r.l;
      draws += r.d;
      points += r.w * WIN_POINTS[d] + r.d * DRAW_POINTS[d];
    }
    return { player: entry.name, wins, losses, draws, points };
  }

  leaderboard(limit = 5) {
    return Object.values(this.db.players)
      .map((e) => ({ ...this._summary(e), updatedAt: e.updatedAt }))
      .filter((r) => r.points > 0)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.updatedAt - b.updatedAt)
      .slice(0, limit)
      .map(({ updatedAt, ...row }) => row);
  }

  stats(player) {
    const entry = this.db.players[player.toLocaleLowerCase('tr')];
    if (!entry) return null;
    return {
      ...this._summary(entry),
      byDifficulty: Object.fromEntries(DIFFICULTIES.map((d) => [d, { ...entry[d] }])),
    };
  }
}

module.exports = { Store, DIFFICULTIES, WIN_POINTS, DRAW_POINTS };
