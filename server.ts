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

  // Resilient Search Helper (Bypasses Vercel IP Blocks)
  async function resilientSearch(query: string) {
    // 1. Try yt-search (works on Localhost)
    try {
      const ytsPromise = yts(query);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
      const r: any = await Promise.race([ytsPromise, timeoutPromise]);
      if (r && r.videos && r.videos.length > 0) {
        return r.videos.map((v: any) => ({
          videoId: v.videoId,
          title: v.title,
          author: v.author?.name || "YouTube Artist",
          thumbnail: v.thumbnail || v.image || '',
          seconds: v.seconds || 240,
          timestamp: v.timestamp || "4:00"
        }));
      }
    } catch (e) {
      console.log("yt-search blocked or timed out, falling back to Invidious APIs...");
    }

    // 2. Try Invidious APIs (Works on Vercel)
    const instances = [
      "https://iv.melmac.space",
      "https://invidious.jing.rocks",
      "https://invidious.nerdvpn.de"
    ];

    for (const inst of instances) {
      try {
        const res = await fetchWithTimeout(`${inst}/api/v1/search?q=${encodeURIComponent(query)}`, { timeout: 3500 });
        if (res.ok) {
          const data = await res.json();
          const videos = data.filter((v: any) => v.type === "video");
          if (videos.length > 0) {
            return videos.map((v: any) => {
              const secs = v.lengthSeconds || 240;
              const mins = Math.floor(secs / 60);
              const rsecs = secs % 60;
              return {
                videoId: v.videoId,
                title: v.title,
                author: v.author || "Artist",
                thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                seconds: secs,
                timestamp: `${mins}:${rsecs.toString().padStart(2, '0')}`
              };
            });
          }
        }
      } catch (e) {
        console.log(`Invidious ${inst} failed.`);
      }
    }
    return [];
  }

  // Search API
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const rawVideos = await resilientSearch(query);
      const results = rawVideos.slice(0, 25).map((v: any) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author,
        cover: v.thumbnail,
        duration: v.timestamp,
        durationSec: v.seconds,
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
      const videos = await resilientSearch(q);
      if (videos && videos.length > 0) {
        const topVideo = videos[0];
        return res.json({
          videoId: topVideo.videoId,
          title: topVideo.title,
          duration: topVideo.timestamp,
          durationSec: topVideo.seconds,
          url: `/api/stream?id=${topVideo.videoId}`,
          cover: topVideo.thumbnail
        });
      }
      res.status(404).json({ error: "No video found" });
    } catch (e: any) {
      console.error("YouTube Search ID helper error:", e);
      res.status(500).json({ error: e.message || "Failed to search video" });
    }
  });

  // Direct Download Endpoint for Converter Page
  app.get("/api/download", (req, res) => {
    const videoId = req.query.id as string;
    const title = (req.query.title as string) || "Alfaza_Music";
    
    if (!videoId) {
      return res.status(400).send("Missing video ID");
    }

    try {
      res.setHeader("Content-Type", "audio/mpeg");
      // Sanitize title for filename
      const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
      
      const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { 
        filter: "audioonly", 
        quality: "highestaudio" 
      });
      
      stream.on('error', (err) => {
        console.error("[Download Error]", err);
        if (!res.headersSent) {
          res.status(500).send("Download failed");
        }
      });
      
      stream.pipe(res);
    } catch (err: any) {
      console.error(err);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  });

  // --- YTMUSIC ENDPOINTS ---
  const YTMusic = require('ytmusic-api');
  const ytm = new YTMusic();
  let ytmInitialized = false;
  async function getYtm() {
    if (!ytmInitialized) {
      await ytm.initialize();
      ytmInitialized = true;
    }
    return ytm;
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function mapYtSong(song: any) {
    return {
      id: `ytm_${song.videoId}`,
      title: song.name,
      artist: song.artist?.name || 'Unknown',
      duration: song.duration ? formatTime(song.duration) : '0:00',
      cover: song.thumbnails?.[song.thumbnails.length - 1]?.url || song.thumbnails?.[0]?.url || '',
      url: `https://music.youtube.com/watch?v=${song.videoId}`,
      audioUrl: ''
    };
  }

  app.get("/api/ytmusic/home", async (req, res) => {
    const categories = [
      { key: "trending", query: "trending indonesia" },
      { key: "pop_indo", query: "mahalini" },
      { key: "dangdut", query: "happy asmara" },
      { key: "malaysia", query: "iklim suci dalam debu" },
      { key: "english_pop", query: "ed sheeran" },
      { key: "bollywood", query: "arijit singh" },
      { key: "kpop", query: "blackpink" }
    ];

    try {
      const api = await getYtm();
      const results: Record<string, any[]> = {};
      await Promise.all(
        categories.map(async (cat) => {
          const searchRes = await api.searchSongs(cat.query);
          results[cat.key] = searchRes.slice(0, 10).map(mapYtSong);
        })
      );
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/ytmusic/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.json([]);
      const api = await getYtm();
      const searchRes = await api.searchSongs(q);
      const formatted = searchRes.map(mapYtSong);
      res.json(formatted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Standalone yt-dlp launcher & manager
  let isYtDlpReady = false;
  const binDir = path.join(process.cwd(), "bin");
  const isWin = process.platform === "win32";
  const ytDlpPath = path.join(binDir, isWin ? "yt-dlp.exe" : "yt-dlp");

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
        const downloadUrl = isWin 
          ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" 
          : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
        execSync(`curl -L ${downloadUrl} -o "${ytDlpPath}"`);
        if (!isWin) execSync(`chmod a+rx "${ytDlpPath}"`);
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
        timeout: 25000, // INCREASED TIMEOUT to 25s because yt-dlp can be slow to boot
        stdio: ["ignore", "pipe", "ignore"]
      }).toString().trim();
      if (resolvedUrl && (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"))) {
        console.log(`[resolveWithYtDlp] Successfully extracted stream with yt-dlp: ${resolvedUrl.substring(0, 60)}...`);
        return resolvedUrl;
      }
    } catch (err: any) {
      console.log(`[resolveWithYtDlp] Direct yt-dlp bypass not available for video ${videoId}. Timeout or error.`);
    }
    return null;
  }

  // --- METODE BARU: AuraMusic (MusicCuba) InnerTube Native Logic ---
  // Meniru sama persis request ke youtubei/v1/player menggunakan PoToken
  async function resolveWithInnerTube(videoId: string, poToken?: string): Promise<string | null> {
    console.log(`[InnerTube] Executing native AuraMusic logic for: ${videoId}`);
    try {
      const payload = {
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20230725.01.00",
            hl: "id",
            gl: "ID"
          }
        },
        videoId: videoId,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: 19740 // Atau hasil fetch dinamis
          }
        },
        serviceIntegrityDimensions: poToken ? {
          poToken: poToken
        } : undefined
      };

      const res = await fetchWithTimeout("https://music.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Origin": "https://music.youtube.com",
          "X-YouTube-Client-Name": "67",
          "X-YouTube-Client-Version": "1.20230725.01.00",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(payload),
        timeout: 8000
      });

      if (res.ok) {
        const data = await res.json();
        if (data.playabilityStatus?.status === 'OK' && data.streamingData?.adaptiveFormats) {
          const formats = data.streamingData.adaptiveFormats;
          const audio = formats.find((f: any) => f.mimeType && f.mimeType.includes("audio/mp4")) ||
                        formats.find((f: any) => f.mimeType && f.mimeType.includes("audio/"));
          if (audio && audio.url) {
             console.log(`[InnerTube] BERHASIL! Mendapatkan URL Stream Native Google.`);
             return audio.url;
          }
        } else {
           console.log(`[InnerTube] Status tidak OK atau tidak ada stream:`, data.playabilityStatus?.status);
        }
      }
    } catch (e: any) {
      console.error(`[InnerTube] Gagal mengeksekusi request:`, e.message);
    }
    return null;
  }

  async function resolveYouTubeAudioUrl(videoId: string, poToken?: string): Promise<string> {
    console.log(`[AudioResolver] Resolving stream for videoId: ${videoId} with poToken: ${poToken ? "YES" : "NO"}`);

    // --- METODE BARU: AuraMusic Native InnerTube Player ---
    if (poToken) {
      const innerTubeUrl = await resolveWithInnerTube(videoId, poToken);
      if (innerTubeUrl) return innerTubeUrl;
    }

    // --- METODE Y1 (ytdl-core) is disabled to prevent Node socket crash ---
    console.log(`[AudioResolver] Skipping Y1 to prevent node crash.`);

    // --- METODE Y2: Play-DL (Highly reliable for extracting direct googlevideo links) ---
    try {
      console.log(`[AudioResolver] Trying Method Y2 (play-dl) for ID: ${videoId}`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await play.video_info(videoUrl);
      const audioFormats = info.format.filter((f: any) => f.mimeType && f.mimeType.startsWith("audio/mp4"));
      if (audioFormats.length > 0) {
        // play-dl sometimes has `url` property on the format object.
        const bestAudio = audioFormats.find((f: any) => f.url);
        if (bestAudio && bestAudio.url) {
          console.log(`[AudioResolver] Method Y2 (play-dl) Succeeded!`);
          return bestAudio.url;
        }
      }
      
      // If .url is not directly present, we can use stream() function
      const stream = await play.stream(videoUrl);
      if (stream && stream.url) {
         console.log(`[AudioResolver] Method Y2 (play.stream) Succeeded!`);
         return stream.url;
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
            aFormat: "mp3"
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
    console.log(`[AudioResolver] Server-side extraction methods were not reachable. Returning fast verified fallback redirect URL.`);
    // Using an alternative fallback since Vevioz is dead
    const fallbackUrl = `https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`;
    return fallbackUrl;
  }

  const https = require('https');
  const http = require('http');

  function proxyAudioUrl(audioUrl: string, req: any, res: any, videoId: string) {
    if (!audioUrl) return res.status(500).send("No audio URL");
    if (audioUrl.includes('vevioz.com')) {
      return res.redirect(`https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`); 
    }
    const client = audioUrl.startsWith('https') ? https : http;
    client.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    }, (proxyRes: any) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        return proxyAudioUrl(proxyRes.headers.location, req, res, videoId);
      }
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }).on('error', (err: any) => {
      console.error("[proxyAudioUrl] Error:", err.message);
      if (!res.headersSent) res.redirect(`https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`);
    });
  }

  // Proxy endpoint to download YouTube audio streams (bypassing CORS)
  app.get("/api/proxy-download", async (req, res) => {
    const videoId = req.query.id as string;
    const poToken = req.query.potoken as string | undefined;

    if (!videoId) {
      return res.status(400).json({ error: "id parameter is required" });
    }

    try {
      console.log(`[Proxy-Download] Resolving audio stream URL for videoId: ${videoId}`);
      const audioUrl = await resolveYouTubeAudioUrl(videoId, poToken);
      console.log(`[Proxy-Download] Proxying download stream: ${audioUrl}`);
      return proxyAudioUrl(audioUrl, req, res, videoId);
    } catch (error: any) {
      console.error("Proxy-Download endpoint error:", error);
      const emergencyFallback = `https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`;
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

      // Fetch sequentially to avoid YouTube rate limiting (429 Too Many Requests)
      for (const cat of categories) {
        try {
          const rawVideos = await resilientSearch(cat.query);
          
          // Seeded shuffle based on today's date string to guarantee variations change every calendar day!
          const seededFiltered = shuffleWithSeed(rawVideos, todayStr + cat.key);
          
          results[cat.key] = seededFiltered.slice(0, 40).map((v: any) => ({
            id: v.videoId + "_" + cat.key,
            title: v.title,
            artist: v.author,
            cover: v.thumbnail,
            duration: v.timestamp,
            durationSec: v.seconds,
            url: `/api/stream?id=${v.videoId}`
          }));
        } catch (e) {
          console.error(`Error fetching category ${cat.key}:`, e);
          results[cat.key] = [];
        }
        
        // Add a small delay between requests to further prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      homeCache = results;
      homeCacheTime = Date.now();
      homeCacheDateStr = todayStr;

      res.json(results);
    } catch (error) {
      console.error("Home API error:", error);
      res.status(500).json({ error: "Failed to load home data" });
    }
  });

  let scHomeCache: any = null;
  let scHomeCacheTime = 0;
  let scHomeCacheDateStr = "";

  app.get("/api/scloud/home", async (req, res) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isForceRefresh = req.query.refresh === 'true';

      if (!isForceRefresh && scHomeCache && scHomeCacheDateStr === todayStr && (Date.now() - scHomeCacheTime < 14400000)) {
        return res.json(scHomeCache);
      }

      const categories = [
        { key: "trending", query: "dj remix viral" },
        { key: "pop_indo", query: "pop indonesia hits" },
        { key: "dangdut", query: "dangdut koplo terbaru" },
        { key: "malaysia", query: "lagu malaysia cover" },
        { key: "religi", query: "sholawat merdu" },
        { key: "acoustic", query: "acoustic cover lofi" },
        { key: "mix_hits", query: "lagu hits indonesia full album 1 jam" },
        { key: "mix_dj", query: "dj remix full 1 jam" },
        { key: "mix_indo", query: "pop indonesia full album 1 jam" },
        { key: "mix_malaysia", query: "lagu malaysia full album 1 jam" }
      ];

      const results: Record<string, any[]> = {};
      const scClientId = "iErh0hlIS7lC1NEeRzcimBG8NFFF045C";

      await Promise.all(categories.map(async (cat) => {
        try {
          const fetchRes = await fetchWithTimeout(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cat.query)}&client_id=${scClientId}&limit=25`, { timeout: 10000 });
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            const mappedSongs = data.collection
              .filter((t: any) => t.media && t.media.transcodings && t.media.transcodings.length > 0)
              .map((t: any) => {
                const transcoding = t.media.transcodings.find((x: any) => x.format.protocol === 'progressive') || t.media.transcodings[0];
                return {
                  id: `sc_${t.id}_${cat.key}`,
                  title: t.title,
                  artist: t.user?.username || "SoundCloud Artist",
                  cover: t.artwork_url ? t.artwork_url.replace('large', 't500x500') : (t.user?.avatar_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300"),
                  url: transcoding.url
                };
              });
            // Shuffle
            const seededFiltered = shuffleWithSeed(mappedSongs, todayStr + cat.key);
            results[cat.key] = seededFiltered.slice(0, 10);
          } else {
            results[cat.key] = [];
          }
        } catch (e) {
          console.error(`Error fetching SC category ${cat.key}:`, e);
          results[cat.key] = [];
        }
      }));

      scHomeCache = results;
      scHomeCacheTime = Date.now();
      scHomeCacheDateStr = todayStr;

      res.json(results);
    } catch (error) {
      console.error("Scloud Home API error:", error);
      res.status(500).json({ error: "Failed to load scloud home data" });
    }
  });

  // SOUNDCLOUD CORS PROXY
  app.get("/api/soundcloud", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || !targetUrl.startsWith('https://api-v2.soundcloud.com')) {
        return res.status(400).json({ error: "Invalid SoundCloud URL" });
      }
      const fetchRes = await fetchWithTimeout(targetUrl, { timeout: 10000 });
      if (!fetchRes.ok) {
        return res.status(fetchRes.status).json({ error: "SoundCloud API error" });
      }
      const data = await fetchRes.json();
      res.json(data);
    } catch (e: any) {
      console.error("[SC Proxy] Error:", e.message);
      res.status(500).json({ error: "Proxy failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      configFile: path.resolve(process.cwd(), 'vite.config.js'),
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
