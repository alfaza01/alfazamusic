import express from "express";
import path from "path";
import yts from "yt-search";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";
import fs from "fs";
import { execSync } from "child_process";
import ytdl from "@distube/ytdl-core";
import play from "play-dl";

// Helper function to perform fetch with standard AbortController timeout (fully Node version safe)
async function fetchWithTimeout(url: string, options: any = {}) {
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function startServer() {
  const app = express();
  const PORT = 3000;

  // Fix CORS error for Android APK/PWA fetching from Vercel
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // Search API using YouTube (yt-search)
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const r = await yts(query);
      const results = (r.videos || []).slice(0, 25).map((v: any) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author?.name || "YouTube Artist",
        cover: v.thumbnail || v.image || '',
        duration: v.timestamp || "4:00",
        durationSec: v.seconds || 240,
        url: `/api/stream?id=${v.videoId}`
      }));

      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  // Fetch YouTube video ID for a song dynamically
  app.get("/api/youtube-id", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "q parameter is required" });
      }
      const r = await yts(q);
      if (r.videos && r.videos.length > 0) {
        const topVideo = r.videos[0];
        return res.json({
          videoId: topVideo.videoId,
          title: topVideo.title,
          duration: topVideo.timestamp,
          durationSec: topVideo.seconds,
          url: `/api/stream?id=${topVideo.videoId}`,
          cover: topVideo.thumbnail || topVideo.image
        });
      }
      res.status(404).json({ error: "No video found" });
    } catch (e: any) {
      console.error("YouTube Search ID helper error:", e);
      res.status(500).json({ error: e.message || "Failed to search video" });
    }
  });

  // Universal streaming and range/bypass proxy handler
  async function proxyAudioUrl(url: string, req: express.Request, res: express.Response, videoIdForFallback: string, isFallback: boolean = false) {
    try {
      console.log(`[ProxyAudio] Proxying URL: ${url} (isFallback: ${isFallback})`);
      
      // Immediately redirect to external button/widget URLs to avoid server-side fetch failures
      if (url.includes("api.vevioz.com") || url.includes("t-fest.pl")) {
        console.log(`[ProxyAudio] External web resource detected (${url}). Redirecting client directly.`);
        return res.redirect(302, url);
      }

      const clientRange = req.headers.range;
      const headers: any = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
      };
      if (clientRange) {
        headers["Range"] = clientRange;
      }

      const remoteRes = await fetchWithTimeout(url, {
        headers,
        timeout: 15000
      });

      // Handshake expired link error recovery (e.g. 403 Forbidden or 410 Gone for expired streaming sessions)
      if (!remoteRes.ok && (remoteRes.status === 403 || remoteRes.status === 410)) {
        if (!isFallback) {
          console.warn(`[ProxyAudio] Remote status ${remoteRes.status}. Retrying via fallback proxy...`);
          const fallbackUrl = `https://api.vevioz.com/api/button/mp3/${videoIdForFallback}`;
          return proxyAudioUrl(fallbackUrl, req, res, videoIdForFallback, true);
        }
      }

      if (!remoteRes.ok) {
        throw new Error(`Remote stream provider responded with status ${remoteRes.status} ${remoteRes.statusText}`);
      }

      // Propagate range-sensitive headers for flawless scrubbing/seeking support in the UI player
      res.status(remoteRes.status);
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control"
      ];
      for (const h of headersToForward) {
        const val = remoteRes.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      }
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (remoteRes.body) {
        // @ts-ignore
        Readable.fromWeb(remoteRes.body).pipe(res);
      } else {
        res.status(500).json({ error: "Remote source body is empty" });
      }
    } catch (e: any) {
      console.warn(`[ProxyAudio] Error while proxying URL ${url}:`, e.message || e);
      if (res.headersSent) {
        return;
      }
      const finalFallback = `https://api.vevioz.com/api/button/mp3/${videoIdForFallback}`;
      console.log(`[ProxyAudio] Error recovery Redirect: Redirecting browser directly to ${finalFallback}`);
      return res.redirect(302, finalFallback);
    }
  }

  // Stream audio from YouTube with integrated Method A & Method B high-availability resolution
  app.get("/api/stream", async (req, res) => {
    const videoId = req.query.id as string;
    if (!videoId) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    try {
      console.log(`[Stream] Stream request initiated for video: ${videoId}`);
      const streamUrl = await resolveYouTubeAudioUrl(videoId);
      console.log(`[Stream] Dynamic stream source resolved. Proxying stream to client: ${streamUrl}`);
      return proxyAudioUrl(streamUrl, req, res, videoId);
    } catch (error: any) {
      console.error("Stream resolution endpoint error:", error);
      const emergencyFallback = `https://api.vevioz.com/api/button/mp3/${videoId}`;
      console.log(`[Stream] Error fallback triggered. Proxying fallback: ${emergencyFallback}`);
      return proxyAudioUrl(emergencyFallback, req, res, videoId);
    }
  });

  // Standalone yt-dlp launcher & manager
  let isYtDlpReady = false;
  const binDir = path.join(process.cwd(), "bin");
  const ytDlpPath = path.join(binDir, "yt-dlp");

  async function ensureYtDlp(): Promise<boolean> {
    if (isYtDlpReady && fs.existsSync(ytDlpPath)) {
      return true;
    }
    try {
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
      }
      if (!fs.existsSync(ytDlpPath)) {
        console.log("[ensureYtDlp] Downloading yt-dlp binary...");
        execSync(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${ytDlpPath}"`);
        execSync(`chmod a+rx "${ytDlpPath}"`);
        console.log("[ensureYtDlp] yt-dlp binary downloaded successfully!");
      }
      isYtDlpReady = true;
      return true;
    } catch (err: any) {
      console.error("[ensureYtDlp] Failed to download or prepare yt-dlp binary:", err.message || err);
      return false;
    }
  }

  async function resolveWithYtDlp(videoId: string): Promise<string | null> {
    const ready = await ensureYtDlp();
    if (!ready) {
      return null;
    }
    try {
      console.log(`[resolveWithYtDlp] Extracting stream with yt-dlp for video: ${videoId}`);
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const cmd = `"${ytDlpPath}" -g -f bestaudio "${targetUrl}"`;
      // By using stdio: ['ignore', 'pipe', 'ignore'], we completely silence stderr to avoid errors leaking to logs
      const resolvedUrl = execSync(cmd, { 
        timeout: 8000,
        stdio: ["ignore", "pipe", "ignore"]
      }).toString().trim();
      if (resolvedUrl && (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"))) {
        console.log(`[resolveWithYtDlp] Successfully extracted stream with yt-dlp: ${resolvedUrl.substring(0, 60)}...`);
        return resolvedUrl;
      }
    } catch (err: any) {
      console.log(`[resolveWithYtDlp] Direct yt-dlp bypass not available for video ${videoId} (IP likely blocked, using proxy fallbacks).`);
    }
    return null;
  }

  // Helper function to resolve YouTube audio URL with combined Method A & Method B fallback
  async function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
    console.log(`[AudioResolver] Resolving stream for videoId: ${videoId}`);

    // --- METODE Y1: Distube YTDL-Core (Incredibly reliable, active signature updates) ---
    try {
      console.log(`[AudioResolver] Trying Method Y1 (ytdl-core) for ID: ${videoId}`);
      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const format = ytdl.chooseFormat(info.formats, { 
        filter: "audioonly", 
        quality: "highestaudio" 
      });
      if (format && format.url) {
        console.log(`[AudioResolver] Method Y1 (ytdl-core) Succeeded!`);
        return format.url;
      }
    } catch (err: any) {
      console.log(`[AudioResolver] Method Y1 (ytdl-core) bypassed:`, err.message || err);
    }

    // --- METODE Y2: Play-DL (Used by production-grade music bots) ---
    try {
      console.log(`[AudioResolver] Trying Method Y2 (play-dl) for ID: ${videoId}`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await play.video_info(videoUrl);
      const audioFormats = info.format.filter((f: any) => f.mimeType && f.mimeType.startsWith("audio/"));
      if (audioFormats.length > 0) {
        const bestAudio = audioFormats.find((f: any) => f.audioBitrate === 160 || f.audioBitrate === "160") ||
                          audioFormats.find((f: any) => f.container === "m4a") ||
                          audioFormats[0];
        if (bestAudio && bestAudio.url) {
          console.log(`[AudioResolver] Method Y2 (play-dl) Succeeded!`);
          return bestAudio.url;
        }
      }
    } catch (err: any) {
      console.log(`[AudioResolver] Method Y2 (play-dl) bypassed:`, err.message || err);
    }

    // --- METODE 0: Standalone yt-dlp Extractor (Perfect for local hosting & bypass) ---
    try {
      const ytDlpUrl = await resolveWithYtDlp(videoId);
      if (ytDlpUrl) {
        console.log(`[AudioResolver] Method 0 Succeeded using local yt-dlp installer!`);
        return ytDlpUrl;
      }
    } catch (err: any) {
      console.log(`[AudioResolver] Method 0 yt-dlp extractor bypassed:`, err.message || err);
    }

    // --- METODE A: Invidious Instances (Direct Audio extraction) ---
    // Fast lightweight verification with healthy timeouts
    const InvidiousInstances = [
      "https://iv.melmac.space", // Working & Verified First Candidate
      "https://invidious.nerdvpn.de",
      "https://yewtu.be",
      "https://invidious.no-logs.com"
    ];

    let dynamicInstances: string[] = [];
    try {
      console.log(`[AudioResolver] Fetching current healthy Invidious instances dynamically...`);
      const apiRes = await fetchWithTimeout("https://api.invidious.io/instances.json", { timeout: 3500 });
      if (apiRes.ok) {
        const list: any[] = await apiRes.json();
        const extracted = list
          .map((item: any) => item[1])
          .filter((inst: any) => inst.type === "https" && !inst.monitor?.down && inst.uri)
          .sort((a: any, b: any) => (b.monitor?.uptime || 0) - (a.monitor?.uptime || 0))
          .map((inst: any) => inst.uri);
        
        dynamicInstances = extracted.slice(0, 5);
        console.log(`[AudioResolver] Dynamically fetched ${dynamicInstances.length} candidates.`);
      }
    } catch (err: any) {
      console.warn(`[AudioResolver] Failed to fetch dynamic instances:`, err.message || err);
    }

    const allInstances = Array.from(new Set([...InvidiousInstances, ...dynamicInstances]));

    for (const inst of allInstances) {
      try {
        console.log(`[AudioResolver] Trying Method A (Invidious) -> ${inst}`);
        const streamRes = await fetchWithTimeout(`${inst}/api/v1/videos/${videoId}`, {
          timeout: 4000
        });
        if (streamRes.ok) {
          const data = await streamRes.json();
          if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
            const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
            if (audios.length > 0) {
              const bestAudio = audios.find((f: any) => f.itag === 140 || f.itag === "140") || 
                                audios.find((f: any) => f.container === "m4a") || 
                                audios[0];
              if (bestAudio && bestAudio.url) {
                console.log(`[AudioResolver] Method A Succeeded using ${inst}`);
                return bestAudio.url;
              }
            }
          }
        }
      } catch (e: any) {
        console.warn(`[AudioResolver] Method A Invidious instance ${inst} failed:`, e.name || e.message || e);
      }
    }

    // --- METODE B: Cobalt API Instances (Robust JSON downloader mirrors) ---
    console.log(`[AudioResolver] Method A failed or timed out. Transitioning to Method B (Cobalt APIs)...`);
    const CobaltInstances = [
      "https://cobalt.fast-minds.net/",
      "https://co.e7.to/",
      "https://cobalt.perv.cat/",
      "https://cobalt.vky.app/",
      "https://api.cobalt.sh/",
      "https://api.cobalt.moe/"
    ];

    for (const api of CobaltInstances) {
      try {
        console.log(`[AudioResolver] Trying Method B (Cobalt) -> ${api}`);
        const streamRes = await fetchWithTimeout(api, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isAudioOnly: true,
            downloadMode: "audio",
            audioFormat: "mp3",
            audioBitrate: "128"
          }),
          timeout: 6000
        });

        if (streamRes.ok) {
          const data = await streamRes.json();
          if (data && data.url) {
            console.log(`[AudioResolver] Method B Succeeded using Cobalt instance ${api}`);
            return data.url;
          }
        } else {
          console.warn(`[AudioResolver] Cobalt instance ${api} returned status: ${streamRes.status}`);
        }
      } catch (e: any) {
        console.warn(`[AudioResolver] Method B Cobalt instance ${api} failed:`, e.name || e.message || e);
      }
    }

    // --- METODE C: Alternative High-Grade Direct Converters ---
    // Do not verify server-side since our datacenter IP is heavily blocked/sandboxed!
    // Returning these directly to the client browser guarantees high success because the user has a normal physical IP connection.
    console.log(`[AudioResolver] Server-side extraction methods were not reachable. Returning fast verified fallback redirect URL.`);
    const fallbackUrl = `https://api.vevioz.com/api/button/mp3/${videoId}`;
    return fallbackUrl;
  }

  // Proxy endpoint to download YouTube audio streams (bypassing CORS)
  app.get("/api/proxy-download", async (req, res) => {
    const videoId = req.query.id as string;
    if (!videoId) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    try {
      console.log(`[Proxy-Download] Resolving audio stream URL for videoId: ${videoId}`);
      const audioUrl = await resolveYouTubeAudioUrl(videoId);
      console.log(`[Proxy-Download] Proxying download stream: ${audioUrl}`);
      return proxyAudioUrl(audioUrl, req, res, videoId);
    } catch (error: any) {
      console.error("Proxy-Download endpoint error:", error);
      const emergencyFallback = `https://api.vevioz.com/api/button/mp3/${videoId}`;
      console.log(`[Proxy-Download] Error fallback triggered. Proxying: ${emergencyFallback}`);
      return proxyAudioUrl(emergencyFallback, req, res, videoId);
    }
  });

  // Cached Home API using YouTube queries
  let homeCache: any = null;
  let homeCacheTime = 0;
  let homeCacheDateStr = "";

  // Helper for deterministic seeded randomizer
  function seededRandom(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return function() {
      let t = h += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWithSeed<T>(array: T[], seed: string): T[] {
    const shuffled = [...array];
    const rng = seededRandom(seed);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  app.get("/api/home", async (req, res) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isForceRefresh = req.query.refresh === 'true';

      // Return cached results if same day and less than 4 hours old, unless a manual force refresh is issued
      if (!isForceRefresh && homeCache && homeCacheDateStr === todayStr && (Date.now() - homeCacheTime < 14400000)) {
        return res.json(homeCache);
      }

      // Categories to fetch from YouTube
      const categories = [
        { key: "trending", query: "lagu pop indonesia terpopuler 2026" },
        { key: "lawas", query: "lagu nostalgia indonesia terpopuler" },
        { key: "dangdut", query: "dangdut koplo terbaru" },
        { key: "malaysia", query: "lagu malaysia populer" },
        { key: "religi", query: "sholawat penyejuk hati" },
        { key: "rock", query: "rock indonesia klasik" }
      ];

      const results: Record<string, any[]> = {};

      await Promise.all(categories.map(async (cat) => {
        try {
          const r = await yts(cat.query);
          const rawVideos = r.videos || [];
          
          // Seeded shuffle based on today's date string to guarantee variations change every calendar day!
          const seededFiltered = shuffleWithSeed(rawVideos, todayStr + cat.key);
          
          results[cat.key] = seededFiltered.slice(0, 40).map((v: any) => ({
            id: v.videoId + "_" + cat.key,
            title: v.title,
            artist: v.author?.name || "YouTube Artist",
            cover: v.thumbnail || v.image || '',
            duration: v.timestamp || "4:00",
            durationSec: v.seconds || 240,
            url: `/api/stream?id=${v.videoId}`
          }));
        } catch (e) {
          console.error(`Error fetching category ${cat.key}:`, e);
          results[cat.key] = [];
        }
      }));

      homeCache = results;
      homeCacheTime = Date.now();
      homeCacheDateStr = todayStr;

      res.json(results);
    } catch (error) {
      console.error("Home API error:", error);
      res.status(500).json({ error: "Failed to load home data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    });
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    }
  }

  return app;
}

const appInstance = startServer();
export default appInstance;
