# Tic Tac Toe

Klasik Tic Tac Toe (XOX) oyunu. Kurallar basit, his büyük: canlı atmosfer, sentezlenmiş ses efektleri,
kazanan çizgisi, parçacık efektleri, üç zorluk seviyesi (yenilmez dahil) ve sıralama tablosu.

| Katman | Teknoloji |
| --- | --- |
| Arayüz | Next.js (App Router) + React + TypeScript |
| Backend | Node.js + Express (sıralama ve istatistik API'si) |

## Çalıştırma

```bash
npm install
npm run dev:all        # arayüz http://localhost:3000, API http://localhost:4000
```

Ayrı ayrı çalıştırmak için: `npm run dev` (arayüz) ve `npm run api` (backend).
Production: `npm run build && npm start` (backend'i ayrıca `npm run api` ile başlat).

Arayüz `/api/*` isteklerini `next.config.mjs` içindeki rewrite ile backend'e yönlendirir.
Backend başka bir adreste çalışıyorsa `API_URL` ortam değişkenini ayarla.
Backend kapalıyken oyun normal çalışır; yalnızca sıralama görünmez ve sonuçlar kaydedilmez.

Tip kontrolü: `npm run typecheck`

## Proje yapısı

```
app/                 Next.js sayfası, layout, global stiller
components/
  Game.tsx           ekran geçişleri, ayarlar, atmosfer, ekran efektleri
  Menu.tsx           rakip / zorluk / taraf seçimi, oyuncu adı, sıralama
  GameScreen.tsx     tahta, skor, tur akışı (reducer), yapay zekâ ve efekt tetikleri
  Mark.tsx, Logo.tsx X ve O işaretleri
lib/
  ai.ts              kazanan tespiti, kolay / orta / yenilmez (minimax + alfa-beta)
  sfx.ts             WebAudio ile ses efektleri
  fx.ts              canvas parçacık sistemi
  api.ts             backend istemcisi
server/
  index.js           Express API
  store.js           JSON dosyasına atomik yazan depo
```

## API

| Uç nokta | Açıklama |
| --- | --- |
| `GET /api/health` | Sağlık kontrolü |
| `POST /api/matches` | `{ player, difficulty, side, outcome }` ile tur sonucu kaydeder (`outcome`: `win` / `loss` / `draw`) |
| `GET /api/leaderboard?limit=5` | Puana göre ilk oyuncular |
| `GET /api/stats/:player` | Oyuncunun zorluk bazında kaydı |

Puanlama: galibiyet kolayda 1, ortada 3, yenilmezde 10; beraberlik kolayda 0, ortada 1, yenilmezde 3.

**Not:** Sonuçları istemci bildirdiği için sıralama güvenlik açısından "dürüstlük esaslı"dır.
Gerçek bir yarışma için oyun mantığının sunucuda yürütülmesi ve oyuncu kimlik doğrulaması gerekir.

## Kontroller

Fare ya da dokunma; klavyede ok tuşları + Enter veya 1–9 tuşları (soldan sağa, yukarıdan aşağıya).
Ses düğmesi sağ üstte; `prefers-reduced-motion` açıksa sarsıntı, parlama ve kıvılcımlar kısılır.
