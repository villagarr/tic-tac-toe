'use strict';

const express = require('express');
const { Store, DIFFICULTIES } = require('./store');

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const NAME_RE = /^[\p{L}\p{N} _.\-]{1,16}$/u;
const OUTCOMES = ['win', 'loss', 'draw'];
const SIDES = ['X', 'O'];

function createApp(store) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2kb' }));

  // Next.js /api isteklerini proxy'lediği için normalde CORS gerekmez;
  // API'ye doğrudan erişilirse yalnızca izin verilen origin kabul edilir.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // IP başına dakikada en fazla 120 istek
  const hits = new Map();
  const sweep = setInterval(() => hits.clear(), 60_000);
  sweep.unref();
  app.use('/api', (req, res, next) => {
    const n = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, n);
    if (n > 120) return res.status(429).json({ error: 'Çok fazla istek. Biraz bekle.' });
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/matches', (req, res) => {
    const { player, difficulty, side, outcome } = req.body || {};
    if (typeof player !== 'string' || !NAME_RE.test(player.trim())) {
      return res.status(400).json({ error: 'Geçersiz oyuncu adı (en fazla 16 harf, rakam, boşluk, _ . -).' });
    }
    if (!DIFFICULTIES.includes(difficulty)) return res.status(400).json({ error: 'Geçersiz zorluk.' });
    if (!SIDES.includes(side)) return res.status(400).json({ error: 'Geçersiz taraf.' });
    if (!OUTCOMES.includes(outcome)) return res.status(400).json({ error: 'Geçersiz sonuç.' });

    const summary = store.record({ player: player.trim(), difficulty, outcome });
    res.status(201).json(summary);
  });

  app.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
    res.json({ rows: store.leaderboard(limit) });
  });

  app.get('/api/stats/:player', (req, res) => {
    const stats = store.stats(req.params.player);
    if (!stats) return res.status(404).json({ error: 'Oyuncu bulunamadı.' });
    res.json(stats);
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Bulunamadı.' }));

  // Beklenmeyen hatalar (ör. bozuk JSON, çok büyük gövde)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: status === 413 ? 'İstek çok büyük.' : status < 500 ? 'Geçersiz istek.' : 'Sunucu hatası.' });
  });

  return app;
}

if (require.main === module) {
  const store = new Store(process.env.DATA_FILE);
  const server = createApp(store).listen(PORT, () => {
    console.log(`Tic Tac Toe API hazır: http://localhost:${PORT}`);
  });
  const shutdown = () => {
    store.flush();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
