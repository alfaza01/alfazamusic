var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_yt_search = __toESM(require("yt-search"), 1);
var import_vite = require("vite");
var import_stream = require("stream");
var import_fs = __toESM(require("fs"), 1);
var import_child_process = require("child_process");
var import_ytdl_core = __toESM(require("@distube/ytdl-core"), 1);
var import_play_dl = __toESM(require("play-dl"), 1);
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 1e4, ...fetchOptions } = options;
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
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const r = await (0, import_yt_search.default)(query);
      const results = (r.videos || []).slice(0, 25).map((v) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author?.name || "YouTube Artist",
        cover: v.thumbnail || v.image || "",
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
  app.get("/api/youtube-id", async (req, res) => {
    try {
      const q = req.query.q;
      if (!q) {
        return res.status(400).json({ error: "q parameter is required" });
      }
      const r = await (0, import_yt_search.default)(q);
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
    } catch (e) {
      console.error("YouTube Search ID helper error:", e);
      res.status(500).json({ error: e.message || "Failed to search video" });
    }
  });
  async function proxyAudioUrl(url, req, res, videoIdForFallback, isFallback = false) {
    try {
      console.log(`[ProxyAudio] Proxying URL: ${url} (isFallback: ${isFallback})`);
      if (url.includes("api.vevioz.com") || url.includes("t-fest.pl")) {
        console.log(`[ProxyAudio] External web resource detected (${url}). Redirecting client directly.`);
        return res.redirect(302, url);
      }
      const clientRange = req.headers.range;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
      };
      if (clientRange) {
        headers["Range"] = clientRange;
      }
      const remoteRes = await fetchWithTimeout(url, {
        headers,
        timeout: 15e3
      });
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
        import_stream.Readable.fromWeb(remoteRes.body).pipe(res);
      } else {
        res.status(500).json({ error: "Remote source body is empty" });
      }
    } catch (e) {
      console.warn(`[ProxyAudio] Error while proxying URL ${url}:`, e.message || e);
      if (res.headersSent) {
        return;
      }
      const finalFallback = `https://api.vevioz.com/api/button/mp3/${videoIdForFallback}`;
      console.log(`[ProxyAudio] Error recovery Redirect: Redirecting browser directly to ${finalFallback}`);
      return res.redirect(302, finalFallback);
    }
  }
  app.get("/api/stream", async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    try {
      console.log(`[Stream] Stream request initiated for video: ${videoId}`);
      const streamUrl = await resolveYouTubeAudioUrl(videoId);
      console.log(`[Stream] Dynamic stream source resolved. Proxying stream to client: ${streamUrl}`);
      return proxyAudioUrl(streamUrl, req, res, videoId);
    } catch (error) {
      console.error("Stream resolution endpoint error:", error);
      const emergencyFallback = `https://api.vevioz.com/api/button/mp3/${videoId}`;
      console.log(`[Stream] Error fallback triggered. Proxying fallback: ${emergencyFallback}`);
      return proxyAudioUrl(emergencyFallback, req, res, videoId);
    }
  });
  let isYtDlpReady = false;
  const binDir = import_path.default.join(process.cwd(), "bin");
  const ytDlpPath = import_path.default.join(binDir, "yt-dlp");
  async function ensureYtDlp() {
    if (isYtDlpReady && import_fs.default.existsSync(ytDlpPath)) {
      return true;
    }
    try {
      if (!import_fs.default.existsSync(binDir)) {
        import_fs.default.mkdirSync(binDir, { recursive: true });
      }
      if (!import_fs.default.existsSync(ytDlpPath)) {
        console.log("[ensureYtDlp] Downloading yt-dlp binary...");
        (0, import_child_process.execSync)(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${ytDlpPath}"`);
        (0, import_child_process.execSync)(`chmod a+rx "${ytDlpPath}"`);
        console.log("[ensureYtDlp] yt-dlp binary downloaded successfully!");
      }
      isYtDlpReady = true;
      return true;
    } catch (err) {
      console.error("[ensureYtDlp] Failed to download or prepare yt-dlp binary:", err.message || err);
      return false;
    }
  }
  async function resolveWithYtDlp(videoId) {
    const ready = await ensureYtDlp();
    if (!ready) {
      return null;
    }
    try {
      console.log(`[resolveWithYtDlp] Extracting stream with yt-dlp for video: ${videoId}`);
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const cmd = `"${ytDlpPath}" -g -f bestaudio "${targetUrl}"`;
      const resolvedUrl = (0, import_child_process.execSync)(cmd, {
        timeout: 8e3,
        stdio: ["ignore", "pipe", "ignore"]
      }).toString().trim();
      if (resolvedUrl && (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://"))) {
        console.log(`[resolveWithYtDlp] Successfully extracted stream with yt-dlp: ${resolvedUrl.substring(0, 60)}...`);
        return resolvedUrl;
      }
    } catch (err) {
      console.log(`[resolveWithYtDlp] Direct yt-dlp bypass not available for video ${videoId} (IP likely blocked, using proxy fallbacks).`);
    }
    return null;
  }
  async function resolveYouTubeAudioUrl(videoId) {
    console.log(`[AudioResolver] Resolving stream for videoId: ${videoId}`);
    try {
      console.log(`[AudioResolver] Trying Method Y1 (ytdl-core) for ID: ${videoId}`);
      const info = await import_ytdl_core.default.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const format = import_ytdl_core.default.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio"
      });
      if (format && format.url) {
        console.log(`[AudioResolver] Method Y1 (ytdl-core) Succeeded!`);
        return format.url;
      }
    } catch (err) {
      console.log(`[AudioResolver] Method Y1 (ytdl-core) bypassed:`, err.message || err);
    }
    try {
      console.log(`[AudioResolver] Trying Method Y2 (play-dl) for ID: ${videoId}`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await import_play_dl.default.video_info(videoUrl);
      const audioFormats = info.format.filter((f) => f.mimeType && f.mimeType.startsWith("audio/"));
      if (audioFormats.length > 0) {
        const bestAudio = audioFormats.find((f) => f.audioBitrate === 160 || f.audioBitrate === "160") || audioFormats.find((f) => f.container === "m4a") || audioFormats[0];
        if (bestAudio && bestAudio.url) {
          console.log(`[AudioResolver] Method Y2 (play-dl) Succeeded!`);
          return bestAudio.url;
        }
      }
    } catch (err) {
      console.log(`[AudioResolver] Method Y2 (play-dl) bypassed:`, err.message || err);
    }
    try {
      const ytDlpUrl = await resolveWithYtDlp(videoId);
      if (ytDlpUrl) {
        console.log(`[AudioResolver] Method 0 Succeeded using local yt-dlp installer!`);
        return ytDlpUrl;
      }
    } catch (err) {
      console.log(`[AudioResolver] Method 0 yt-dlp extractor bypassed:`, err.message || err);
    }
    const InvidiousInstances = [
      "https://iv.melmac.space",
      // Working & Verified First Candidate
      "https://invidious.nerdvpn.de",
      "https://yewtu.be",
      "https://invidious.no-logs.com"
    ];
    let dynamicInstances = [];
    try {
      console.log(`[AudioResolver] Fetching current healthy Invidious instances dynamically...`);
      const apiRes = await fetchWithTimeout("https://api.invidious.io/instances.json", { timeout: 3500 });
      if (apiRes.ok) {
        const list = await apiRes.json();
        const extracted = list.map((item) => item[1]).filter((inst) => inst.type === "https" && !inst.monitor?.down && inst.uri).sort((a, b) => (b.monitor?.uptime || 0) - (a.monitor?.uptime || 0)).map((inst) => inst.uri);
        dynamicInstances = extracted.slice(0, 5);
        console.log(`[AudioResolver] Dynamically fetched ${dynamicInstances.length} candidates.`);
      }
    } catch (err) {
      console.warn(`[AudioResolver] Failed to fetch dynamic instances:`, err.message || err);
    }
    const allInstances = Array.from(/* @__PURE__ */ new Set([...InvidiousInstances, ...dynamicInstances]));
    for (const inst of allInstances) {
      try {
        console.log(`[AudioResolver] Trying Method A (Invidious) -> ${inst}`);
        const streamRes = await fetchWithTimeout(`${inst}/api/v1/videos/${videoId}`, {
          timeout: 4e3
        });
        if (streamRes.ok) {
          const data = await streamRes.json();
          if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
            const audios = data.adaptiveFormats.filter((f) => f.type && f.type.startsWith("audio/"));
            if (audios.length > 0) {
              const bestAudio = audios.find((f) => f.itag === 140 || f.itag === "140") || audios.find((f) => f.container === "m4a") || audios[0];
              if (bestAudio && bestAudio.url) {
                console.log(`[AudioResolver] Method A Succeeded using ${inst}`);
                return bestAudio.url;
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[AudioResolver] Method A Invidious instance ${inst} failed:`, e.name || e.message || e);
      }
    }
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
          timeout: 6e3
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
      } catch (e) {
        console.warn(`[AudioResolver] Method B Cobalt instance ${api} failed:`, e.name || e.message || e);
      }
    }
    console.log(`[AudioResolver] Server-side extraction methods were not reachable. Returning fast verified fallback redirect URL.`);
    const fallbackUrl = `https://api.vevioz.com/api/button/mp3/${videoId}`;
    return fallbackUrl;
  }
  app.get("/api/proxy-download", async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) {
      return res.status(400).json({ error: "id parameter is required" });
    }
    try {
      console.log(`[Proxy-Download] Resolving audio stream URL for videoId: ${videoId}`);
      const audioUrl = await resolveYouTubeAudioUrl(videoId);
      console.log(`[Proxy-Download] Proxying download stream: ${audioUrl}`);
      return proxyAudioUrl(audioUrl, req, res, videoId);
    } catch (error) {
      console.error("Proxy-Download endpoint error:", error);
      const emergencyFallback = `https://api.vevioz.com/api/button/mp3/${videoId}`;
      console.log(`[Proxy-Download] Error fallback triggered. Proxying: ${emergencyFallback}`);
      return proxyAudioUrl(emergencyFallback, req, res, videoId);
    }
  });
  let homeCache = null;
  let homeCacheTime = 0;
  let homeCacheDateStr = "";
  function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return function() {
      let t = h += 1831565813;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffleWithSeed(array, seed) {
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
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const isForceRefresh = req.query.refresh === "true";
      if (!isForceRefresh && homeCache && homeCacheDateStr === todayStr && Date.now() - homeCacheTime < 144e5) {
        return res.json(homeCache);
      }
      const categories = [
        { key: "trending", query: "lagu pop indonesia terpopuler 2026" },
        { key: "lawas", query: "lagu nostalgia indonesia terpopuler" },
        { key: "dangdut", query: "dangdut koplo terbaru" },
        { key: "malaysia", query: "lagu malaysia populer" },
        { key: "religi", query: "sholawat penyejuk hati" },
        { key: "rock", query: "rock indonesia klasik" }
      ];
      const results = {};
      await Promise.all(categories.map(async (cat) => {
        try {
          const r = await (0, import_yt_search.default)(cat.query);
          const rawVideos = r.videos || [];
          const seededFiltered = shuffleWithSeed(rawVideos, todayStr + cat.key);
          results[cat.key] = seededFiltered.slice(0, 40).map((v) => ({
            id: v.videoId + "_" + cat.key,
            title: v.title,
            artist: v.author?.name || "YouTube Artist",
            cover: v.thumbnail || v.image || "",
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      configFile: import_path.default.resolve(process.cwd(), "vite.config.js")
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
