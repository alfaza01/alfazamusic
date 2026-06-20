import { Play, Pause, SkipForward, SkipBack, Share2, Heart, ChevronDown, Repeat, Shuffle, Download, Loader2, Sparkles, Mic2, Tv2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useEffect, useState, useRef } from "react";
import { saveSong, isSongDownloaded } from "../../lib/db";
import { StreamLoadingProgress } from "./StreamLoadingProgress";
import { useMenuStore } from "../../store/useMenuStore";
import { generatePoToken } from "../../lib/poToken";

function parseDuration(durationStr: string) {
  const parts = durationStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FullPlayer() {
  const { 
    currentSong, isPlaying, isPlayerOpen, setPlayerOpen, 
    togglePlay, nextSong, prevSong, 
    currentTimeSec, totalDurationSec, progressPercent,
    requestSeek, playMode, setPlayMode, isLoadingAudio, audioError
  } = usePlayerStore();

  const { openConverter } = useMenuStore();

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [viewMode, setViewMode] = useState<'cover' | 'lyrics' | 'video'>('cover');
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<{time: number, text: string}[]>([]);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll lirik berjalan
  useEffect(() => {
    if (viewMode === 'lyrics' && syncedLyrics.length > 0 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeElement = container.querySelector('.lyric-active');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTimeSec, viewMode, syncedLyrics]);

  useEffect(() => {
    // Reset view mode and lyrics when song changes
    setLyrics(null);
    setSyncedLyrics([]);
    setViewMode('cover');
  }, [currentSong]);

  const loadLyrics = async () => {
    if (lyrics || loadingLyrics) return;
    setLoadingLyrics(true);
    try {
      let foundLyrics: string | null = null;
      let parsedSync: {time: number, text: string}[] = [];

      // ── Helper: parse LRC time-tag ──────────────────────────────────────
      const parseTimeTag = (lines: string[]) => {
        const result: {time: number, text: string}[] = [];
        for (const line of lines) {
          const match = line.match(/^\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/);
          if (match) {
            const mins = parseInt(match[1]);
            const secs = parseFloat(match[2]);
            const time = mins * 60 + secs;
            const text = match[3].replace(/<.*?>/g, '').trim();
            if (text) result.push({ time, text });
          }
        }
        return result;
      };

      // ── Helper: bersihkan noise dari judul ──────────────────────────────
      const cleanSongTitle = (title: string) =>
        title
          .replace(/\(.*?\)|\[.*?\]/g, '')
          .replace(/\b(official|music|video|lyric|audio|hd|hq|vevo|mv|full)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

      // ── Helper: ekstrak Video ID ─────────────────────────────────────────
      const getVideoId = (id: string) => {
        if (id.includes('v=')) return id.split('v=')[1].split('&')[0];
        if (id.includes('youtu.be/')) return id.split('youtu.be/')[1].split('?')[0];
        return id.replace('ytm_', '').split('_')[0];
      };

      const cleanVideoId = getVideoId(currentSong.id);

      // ── Deteksi kompilasi / lagu panjang ────────────────────────────────
      const compilationKeywords = /\b(1\s*jam|2\s*jam|3\s*jam|full\s*album|kumpulan|kompilasi|mixtape|non\s*stop|nonstop|playlist|medley|best\s*of|greatest\s*hits|top\s*\d+)\b/i;
      const isCompilation =
        (currentSong.durationSec != null && currentSong.durationSec > 900) ||
        compilationKeywords.test(currentSong.title);

      // ─── 1. SimpMusic API (YouTube Music — paling akurat) ───────────────
      if (cleanVideoId.length === 11) {
        try {
          const res = await fetch(`https://api-lyrics.simpmusic.org/v1/${cleanVideoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              const track = data.data[0];
              if (track.richSyncLyrics || track.syncedLyrics) {
                const rawSync = track.richSyncLyrics || track.syncedLyrics;
                parsedSync = parseTimeTag(rawSync.split('\n'));
                foundLyrics = track.plainLyrics || parsedSync.map((p: any) => p.text).join('\n');
              } else if (track.plainLyrics) {
                foundLyrics = track.plainLyrics;
              }
            }
          }
        } catch (e) {
          console.log('SimpMusic API gagal, mencoba fallback...');
        }
      }

      // ─── 2. LRCLIB (lirik sinkron — banyak lagu Indonesia) ──────────────
      if (!foundLyrics) {
        let cleanTitle = cleanSongTitle(currentSong.title);
        let queryArtist = currentSong.artist.replace(/\s*-\s*Topic$/i, '').trim();
        if (cleanTitle.includes(' - ')) {
          const parts = cleanTitle.split(' - ');
          queryArtist = parts[0].trim();
          cleanTitle = parts[1].trim();
        }
        try {
          const res = await fetch(
            `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(queryArtist)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const resultTrack = data[0].trackName?.toLowerCase().trim() || '';
              const searchTitleLower = cleanTitle.toLowerCase().trim();
              const resultArtist = data[0].artistName?.toLowerCase().trim() || '';
              const searchArtistLower = queryArtist.toLowerCase().trim();
              const isTitleMatch = resultTrack === searchTitleLower ||
                                   resultTrack.includes(searchTitleLower) ||
                                   searchTitleLower.includes(resultTrack);
              const isArtistMatch = resultArtist.includes(searchArtistLower) ||
                                    searchArtistLower.includes(resultArtist) ||
                                    searchArtistLower === 'youtube artist' ||
                                    searchArtistLower === 'various artists';
              if ((isTitleMatch && isArtistMatch) || resultTrack === searchTitleLower) {
                if (data[0].syncedLyrics) {
                  parsedSync = parseTimeTag(data[0].syncedLyrics.split('\n'));
                }
                foundLyrics = data[0].plainLyrics ||
                              (data[0].syncedLyrics?.replace(/\[.*?\]/g, '') ?? null);
              }
            }
          }
        } catch (e) {
          console.log('LRCLIB gagal, mencoba fallback berikutnya...');
        }
      }

      // ─── 3. Lyrics.ovh (gratis, tanpa auth — database lagu lawas luas) ──
      if (!foundLyrics) {
        let cleanTitle = cleanSongTitle(currentSong.title);
        let queryArtist = currentSong.artist.replace(/\s*-\s*Topic$/i, '').trim();
        if (cleanTitle.includes(' - ')) {
          const parts = cleanTitle.split(' - ');
          queryArtist = parts[0].trim();
          cleanTitle = parts[1].trim();
        }
        try {
          const res = await fetch(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(queryArtist)}/${encodeURIComponent(cleanTitle)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.lyrics && data.lyrics.trim().length > 30) {
              foundLyrics = data.lyrics.trim();
              // lyrics.ovh tidak menyediakan sinkronisasi waktu
              parsedSync = [];
            }
          }
        } catch (e) {
          console.log('Lyrics.ovh gagal...');
        }
      }

      // ── Decode HTML entities & set state ────────────────────────────────
      if (foundLyrics) {
        foundLyrics = foundLyrics
          .replace(/&#x27;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x2F;/g, '/')
          .replace(/&nbsp;/g, ' ');
        setLyrics(foundLyrics);
        setSyncedLyrics(parsedSync);
      } else if (isCompilation) {
        setLyrics(
          `🎶 Lagu Kompilasi / Medley\n\n` +
          `Lagu ini adalah kumpulan beberapa lagu sekaligus, sehingga lirik sinkron tidak tersedia.\n\n` +
          `Gunakan fitur Video 🎬 untuk menonton visualnya!`
        );
      } else {
        setLyrics('😔 Lirik belum tersedia untuk lagu ini.\n\nCoba putar lagu lain atau cek koneksi internet.');
      }
    } catch (e) {
      setLyrics('Gagal memuat lirik. Periksa koneksi internet Anda.');
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handleViewModeChange = (mode: 'cover' | 'lyrics' | 'video') => {
    setViewMode(mode);
    if (mode === 'lyrics') {
      loadLyrics();
    }
  };

  // Check if current song is downloaded already
  useEffect(() => {
    if (currentSong && isPlayerOpen) {
      isSongDownloaded(currentSong.id).then(setIsDownloaded);
    }
  }, [currentSong, isPlayerOpen]);

  if (!currentSong) return null;

  const handleDownload = async () => {
    const cleanVideoId = currentSong.id.replace('ytm_', '').split('_')[0];
    
    let downloadUrl = currentSong.url;
    if (!currentSong.id.startsWith('local_') && !currentSong.url?.startsWith('blob:')) {
      const token = await generatePoToken(cleanVideoId);
      const tokenQuery = token ? `&potoken=${token}` : '';
      downloadUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/proxy-download?id=${cleanVideoId}${tokenQuery}` 
        : `/api/proxy-download?id=${cleanVideoId}${tokenQuery}`;
    }

    if (!downloadUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Save inside internal app IndexedDB
      await saveSong(currentSong, blob, false);
      setIsDownloaded(true);

      // Trigger standard phone / web browser downloader
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${currentSong.title} - ${currentSong.artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Gagal mengunduh lagu, rolling over to Premium Converter:", e);
      // Fallback gracefully to our premium modal
      setTimeout(() => {
        openConverter(currentSong);
      }, 500);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isPlayerOpen && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          {/* Mobile constraint to match layout */}
          <div className="w-full max-w-md h-[100dvh] bg-bg-dark text-white relative flex flex-col p-6 shadow-2xl overflow-hidden">
            
            {/* Background blur from album cover */}
            <div 
              className="absolute inset-0 opacity-40 blur-3xl scale-125 transition-all duration-1000"
              style={{ backgroundImage: `url(${currentSong.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            
            {/* Top Bar */}
            <div className="relative z-10 flex justify-between items-center pt-8 pb-4">
              <button 
                onClick={() => setPlayerOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md flex items-center justify-center"
              >
                <ChevronDown size={24} />
              </button>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-1 mt-1">Mendengarkan</p>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm tracking-wide text-secondary uppercase text-[9px]">
                  {currentSong.id.startsWith('local_') ? '📂 File Lokal' : '⚡ t-fest.pl MP3'}
                </span>
              </div>
              <div className="flex gap-2 bg-white/5 rounded-full p-1 backdrop-blur-sm border border-white/10">
                <button 
                  onClick={() => handleViewModeChange('cover')} 
                  className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${viewMode === 'cover' ? 'bg-primary/90 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <ImageIcon size={18} />
                </button>
                <button 
                  onClick={() => handleViewModeChange('lyrics')} 
                  className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${viewMode === 'lyrics' ? 'bg-primary/90 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <Mic2 size={18} />
                </button>
                <button 
                  onClick={() => handleViewModeChange('video')} 
                  className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${viewMode === 'video' ? 'bg-primary/90 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <Tv2 size={18} />
                </button>
              </div>
            </div>

            {/* Audio Loading Status Overlay */}
            <AnimatePresence>
              {isLoadingAudio && (
                <div className="absolute inset-x-4 top-[130px] z-30 flex justify-center w-[calc(100%-2rem)]">
                  <StreamLoadingProgress isLoading={isLoadingAudio} />
                </div>
              )}
              {downloading && (
                <div className="absolute inset-x-4 top-[130px] z-30 flex justify-center w-[calc(100%-2rem)]">
                  <StreamLoadingProgress isLoading={downloading} isDownload={true} />
                </div>
              )}
            </AnimatePresence>

            {/* Error notifications */}
            {audioError && (
              <div className="absolute inset-x-0 top-36 z-20 flex justify-center">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium text-white shadow-lg text-center"
                >
                  {audioError}
                </motion.div>
              </div>
            )}

            {/* Middle Area: Cover / Lyrics / Video */}
            <motion.div 
              key={currentSong.id} /* force re-animate on change */
              className="relative z-10 flex-1 flex items-center justify-center py-4 overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <AnimatePresence mode="wait">
                {viewMode === 'lyrics' ? (
                  <motion.div
                    key="lyrics"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    ref={lyricsContainerRef}
                    className="w-full h-full max-h-[360px] overflow-y-auto rounded-[24px] bg-black/40 backdrop-blur-md p-6 border border-white/10 no-scrollbar text-center flex flex-col gap-4 py-32"
                  >
                    {loadingLyrics ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-70">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <p className="text-sm">Mencari sinkronisasi lirik...</p>
                      </div>
                    ) : syncedLyrics.length > 0 ? (
                      syncedLyrics.map((line, idx) => {
                         // A line is active if it's the closest one past the current time
                         const nextLineTime = syncedLyrics[idx + 1]?.time || Infinity;
                         const isActive = currentTimeSec >= line.time && currentTimeSec < nextLineTime;
                         return (
                           <p 
                             key={idx}
                             className={`whitespace-pre-line text-lg font-medium leading-relaxed tracking-wide transition-all duration-300 ${isActive ? 'text-primary scale-110 drop-shadow-[0_0_10px_rgba(var(--color-primary),0.8)] lyric-active' : 'text-white/40 scale-100 hover:text-white/70'}`}
                             onClick={() => requestSeek(line.time / (totalDurationSec || 1))}
                           >
                             {line.text}
                           </p>
                         );
                      })
                    ) : (
                      <p className="whitespace-pre-line text-lg font-medium leading-relaxed tracking-wide text-white/90 pb-8 mt-auto mb-auto">
                        {lyrics}
                      </p>
                    )}
                  </motion.div>
                ) : viewMode === 'video' ? (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full aspect-video rounded-[24px] overflow-hidden shadow-2xl bg-black relative"
                  >
                     <div className="absolute inset-0 bg-black flex items-center justify-center">
                       <iframe
                         width="100%"
                         height="100%"
                         src={`https://www.youtube.com/embed/${(currentSong.id.includes('v=') ? currentSong.id.split('v=')[1].split('&')[0] : currentSong.id.includes('youtu.be/') ? currentSong.id.split('youtu.be/')[1].split('?')[0] : currentSong.id.replace('ytm_', '').split('_')[0])}?autoplay=1&mute=0&controls=1&modestbranding=1&showinfo=0&rel=0&playsinline=1`}
                         title="YouTube video player"
                         frameBorder="0"
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         allowFullScreen
                         className="w-full h-full"
                       ></iframe>
                     </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="album"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`w-full max-w-[240px] aspect-square rounded-[36px] overflow-hidden shadow-2xl shadow-primary/30 relative transition-all duration-500 ${isPlaying ? 'scale-100' : 'scale-95'} ${isLoadingAudio ? 'animate-pulse scale-98 border-2 border-primary/50' : ''}`}
                  >
                    <img src={currentSong.cover} alt={currentSong.title} className={`w-full h-full object-cover transition-all duration-300 ${isLoadingAudio ? 'brightness-50 blur-[2px]' : ''}`} />
                    {isLoadingAudio && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 text-center">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                          <div className="absolute w-12 h-12 border-4 border-t-primary rounded-full animate-spin"></div>
                        </div>
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-4 animate-pulse">
                          CONVERTING BY T-FEST.PL...
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div> 
 
            {/* Song Info & Controls */}
            <div className="relative z-10 pb-auto pt-2">
              
              {/* Title & Actions */}
              <div className="flex justify-between items-end mb-6">
                <div className="flex-1 overflow-hidden pr-4">
                  <h2 className="text-2xl font-bold text-white mb-2 leading-tight truncate">
                    {currentSong.title}
                  </h2>
                  <p className="text-white/70 font-medium tracking-wide truncate">
                    {currentSong.artist}
                  </p>
                </div>
                
                {/* Download Button */}
                <div className="flex gap-1 items-center shrink-0">
                  {currentSong.url && !currentSong.id.startsWith('local_') && (
                    <button 
                      onClick={() => openConverter(currentSong)}
                      className="p-3 text-amber-400 hover:text-amber-300 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                      title="Premium MP3/MP4 Converter"
                      id="premium-converter-btn-player"
                    >
                      <Sparkles size={22} className="animate-pulse" />
                    </button>
                  )}
                  {currentSong.url && (
                    <button 
                      onClick={handleDownload}
                      disabled={downloading}
                      className={`p-3 rounded-full transition-colors ${isDownloaded ? 'text-green-400 bg-white/10' : 'text-white/70 hover:bg-white/10'}`}
                      title={isDownloaded ? "Lagu disimpan offline" : "Simpan lagu offline"}
                    >
                      {downloading ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <Download size={22} />
                      )}
                    </button>
                  )}
                  <button className="p-3 text-secondary drop-shadow-md">
                    <Heart size={24} className={currentSong.isFavorite ? "fill-current" : ""} />
                  </button>
                </div>
              </div>

              {/* Interactive Progress */}
              <div className="mb-8 group">
                <div 
                  className="h-1.5 w-full bg-white/20 rounded-full mb-3 cursor-pointer group-hover:h-2 transition-all duration-300 relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                    requestSeek(percent);
                  }}
                >
                  <motion.div 
                    className="h-full bg-primary rounded-full relative" 
                    style={{ width: `${progressPercent}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  >
                    <div className="absolute right-0 top-1/2 -mt-2 -mr-2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </motion.div>
                </div>
                <div className="flex justify-between text-xs text-white/50 font-medium font-mono tracking-wider">
                  <span>{formatDuration(currentTimeSec)}</span>
                  <span>{formatDuration(totalDurationSec || 0)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-between px-2 pb-12">
                <button className="text-white/50 hover:text-white transition">
                  <Shuffle size={20} />
                </button>
                <button onClick={prevSong} className="text-white/80 hover:text-white transition active:scale-90">
                  <SkipBack size={32} fill="currentColor" />
                </button>
                
                <button 
                  onClick={togglePlay}
                  disabled={isLoadingAudio}
                  className={`w-20 h-20 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/40 transform active:scale-95 transition-all ${isLoadingAudio ? 'opacity-90 pointer-events-none' : ''}`}
                >
                  {isLoadingAudio ? (
                    <Loader2 size={32} className="animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-2" />
                  )}
                </button>

                <button onClick={nextSong} className="text-white/80 hover:text-white transition active:scale-90">
                  <SkipForward size={32} fill="currentColor" />
                </button>
                <button className="text-white/50 hover:text-white transition">
                  <Repeat size={20} />
                </button>
              </div>

              {/* Share */}
              <div className="flex justify-center pb-8">
                <button className="flex items-center gap-2 text-white/60 hover:text-white font-medium text-sm transition">
                  <Share2 size={16} />
                  Bagikan
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
