import express from "express";
import yts from "yt-search";

const app = express();

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

async function fetchWithTimeout(url: string, options: any = {}) {
  const { timeout = 8000, ...opts } = options;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function resilientSearch(query: string) {
  // 1. yt-search (cepat jika tidak diblokir)
  try {
    const ytsP = yts(query);
    const timeoutP = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000));
    const r: any = await Promise.race([ytsP, timeoutP]);
    if (r?.videos?.length > 0) {
      return r.videos.map((v: any) => ({
        videoId: v.videoId,
        title: v.title,
        author: v.author?.name || "Artist",
        thumbnail: v.thumbnail || v.image || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        seconds: v.seconds || 240,
        timestamp: v.timestamp || "4:00",
      }));
    }
  } catch {}

  // 2. Invidious fallback
  const instances = [
    "https://iv.melmac.space",
    "https://invidious.jing.rocks",
    "https://yewtu.be",
  ];
  for (const inst of instances) {
    try {
      const res = await fetchWithTimeout(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { timeout: 4000 });
      if (res.ok) {
        const data: any[] = await res.json();
        const videos = data.filter((v) => v.type === "video");
        if (videos.length > 0) {
          return videos.map((v: any) => {
            const secs = v.lengthSeconds || 240;
            return {
              videoId: v.videoId,
              title: v.title,
              author: v.author || "Artist",
              thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              seconds: secs,
              timestamp: `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`,
            };
          });
        }
      }
    } catch {}
  }
  return [];
}

// Seeded shuffle
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return function () {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleWithSeed<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  const rng = seededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let homeCache: any = null;
let homeCacheTime = 0;
let homeCacheDateStr = "";

// HOME API
app.get("/api/home", async (req: any, res: any) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const isForceRefresh = req.query.refresh === "true";

    if (!isForceRefresh && homeCache && homeCacheDateStr === todayStr && Date.now() - homeCacheTime < 14400000) {
      return res.json(homeCache);
    }

    const categories = [
      { key: "trending", query: "lagu pop indonesia terpopuler 2025" },
      { key: "lawas", query: "lagu nostalgia indonesia 90an" },
      { key: "dangdut", query: "dangdut koplo terbaru 2025" },
      { key: "malaysia", query: "lagu malaysia populer" },
      { key: "religi", query: "sholawat merdu terpopuler" },
      { key: "rock", query: "rock indonesia terpopuler" },
    ];

    const results: Record<string, any[]> = {};
    await Promise.all(
      categories.map(async (cat) => {
        try {
          const raw = await resilientSearch(cat.query);
          const shuffled = shuffleWithSeed(raw, todayStr + cat.key);
          results[cat.key] = shuffled.slice(0, 40).map((v: any) => ({
            id: `${v.videoId}_${cat.key}`,
            title: v.title,
            artist: v.author,
            cover: v.thumbnail,
            duration: v.timestamp,
            durationSec: v.seconds,
            url: `/api/stream?id=${v.videoId}`,
          }));
        } catch {
          results[cat.key] = [];
        }
      })
    );

    homeCache = results;
    homeCacheTime = Date.now();
    homeCacheDateStr = todayStr;
    res.json(results);
  } catch (error) {
    console.error("Home API error:", error);
    res.status(500).json({ error: "Failed to load home data" });
  }
});

// SEARCH API
app.get("/api/search", async (req: any, res: any) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "q is required" });
  try {
    const raw = await resilientSearch(query);
    res.json(raw.slice(0, 25).map((v: any) => ({
      id: v.videoId,
      title: v.title,
      artist: v.author,
      cover: v.thumbnail,
      duration: v.timestamp,
      durationSec: v.seconds,
      url: `/api/stream?id=${v.videoId}`,
    })));
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

// (Stream proxy removed. Client resolves streams directly to avoid Vercel timeouts)

// YOUTUBE-ID
app.get("/api/youtube-id", async (req: any, res: any) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const videos = await resilientSearch(q);
    if (videos.length > 0) {
      const v = videos[0];
      return res.json({ videoId: v.videoId, title: v.title, duration: v.timestamp, durationSec: v.seconds, url: `/api/stream?id=${v.videoId}`, cover: v.thumbnail });
    }
    res.status(404).json({ error: "Not found" });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default app;
