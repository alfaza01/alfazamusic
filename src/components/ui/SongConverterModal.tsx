import { X, Copy, ExternalLink, Music, Video, Sparkles, HelpCircle, Check, Share2, Play, Pause, Loader2, Download, AlertCircle, CheckCircle, Minimize2, Maximize2, SkipBack, SkipForward } from "lucide-react";
import { useMenuStore } from "../../store/useMenuStore";
import { usePlayerStore } from "../../store/usePlayerStore";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { saveSong, isSongDownloaded } from "../../lib/db";
import { cn } from "../../lib/utils";

async function fetchWithTimeoutClient(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 4000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
  } finally {
    clearTimeout(id);
  }
}

async function resolveDirectClientAudioUrl(videoId: string): Promise<string> {
  const invidiousInstances = [
    "https://iv.melmac.space",
    "https://invidious.jing.rocks",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de",
    "https://invidious.no-logs.com"
  ];

  for (const inst of invidiousInstances) {
    try {
      console.log(`[ClientAudioResolver] Mengambil dari Invidious: ${inst}`);
      const res = await fetchWithTimeoutClient(`${inst}/api/v1/videos/${videoId}`, {
        timeout: 5000
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.adaptiveFormats && data.adaptiveFormats.length > 0) {
          const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
          if (audios.length > 0) {
            // Prioritize reliable itags (140 = m4a 128kbps, 251 = opus 160kbps)
            const bestAudio = audios.find((f: any) => f.itag === 140 || f.itag === "140") || 
                              audios.find((f: any) => f.itag === 251 || f.itag === "251") || 
                              audios[0];
            if (bestAudio && bestAudio.url) {
              console.log(`[ClientAudioResolver] Berhasil lewat Invidious: ${inst}`);
              return bestAudio.url;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[ClientAudioResolver] Invidious gagal: ${inst}`, err);
    }
  }

  throw new Error("Semua server converter offline. Silakan coba tab Manual t-fest.pl.");
}

export function SongConverterModal() {
  const { 
    converterModalSong, 
    closeConverter,
    isConverterMinimized,
    minimizeConverter,
    restoreConverter
  } = useMenuStore();
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playSong,
    nextSong,
    prevSong,
    currentTimeSec,
    totalDurationSec,
    progressPercent,
    requestSeek,
    isPlayerOpen
  } = usePlayerStore();

  const [activeTab, setActiveTab ] = useState<'instant' | 'tfest' | 'vevioz'>('instant');
  const [copied, setCopied] = useState(false);
  const [autoCopiedAlert, setAutoCopiedAlert] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Instant Downloader States
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'resolving' | 'downloading' | 'saving' | 'success' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [isAlreadyOffline, setIsAlreadyOffline] = useState(false);

  const videoId = converterModalSong ? converterModalSong.id.split('_')[0] : '';
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Check offset state of downloaded song on mount
  useEffect(() => {
    if (converterModalSong) {
      isSongDownloaded(converterModalSong.id).then(setIsAlreadyOffline);
    }
  }, [converterModalSong]);

  // Automatically copy the YouTube Link as backup
  useEffect(() => {
    if (converterModalSong) {
      setIframeLoading(true);
      const url = `https://www.youtube.com/watch?v=${converterModalSong.id.split('_')[0]}`;
      
      const timer = setTimeout(() => {
        navigator.clipboard.writeText(url)
          .then(() => {
            setCopied(true);
            setAutoCopiedAlert(true);
            setTimeout(() => {
              setCopied(false);
              setAutoCopiedAlert(false);
            }, 3000);
          })
          .catch((err) => {
            console.warn("Auto copy backup failed:", err);
          });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [converterModalSong]);

  // Reset loading status when tabs switch
  useEffect(() => {
    setIframeLoading(true);
  }, [activeTab]);

  if (!converterModalSong) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(youtubeUrl);
      setCopied(true);
      setAutoCopiedAlert(true);
      setTimeout(() => {
        setCopied(false);
        setAutoCopiedAlert(false);
      }, 3000);
    } catch (err) {
      console.error("Gagal menyalin teks", err);
    }
  };

  const handleOpenTfest = () => {
    navigator.clipboard.writeText(youtubeUrl).catch(() => {});
    window.open("https://t-fest.pl/", "_blank");
  };

  const handleNativeBrowserDownload = async () => {
    if (!converterModalSong) return;
    setConversionStatus('resolving');
    setConversionError(null);

    try {
      const vidId = converterModalSong.id.split('_')[0];
      const directUrl = await resolveDirectClientAudioUrl(vidId);
      
      // Menggunakan browser OS Native Download sehingga bisa jalan di-background/di luar aplikasi
      window.open(directUrl, '_blank');
      setConversionStatus('success');
    } catch (err: any) {
      console.error("Native download error:", err);
      setConversionError(err.message || "Koneksi terputus. Silakan coba metode lain.");
      setConversionStatus('error');
    }
  };

  const handleInstantDownload = async () => {
    if (!converterModalSong) return;
    setConversionStatus('resolving');
    setDownloadProgress(0);
    setConversionError(null);

    try {
      const vidId = converterModalSong.id.split('_')[0];
      // 1. Resolve direct MP3 link
      const directUrl = await resolveDirectClientAudioUrl(vidId);
      
      setConversionStatus('downloading');

      // 2. Fetch the audio as a blob with streaming progress
      const response = await fetch(directUrl);
      if (!response.ok) throw new Error("Gagal mengunduh file audio dari server direct. Silakan coba t-fest.pl");

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Browser Anda tidak mendukung progress tracking stream.");

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        if (totalBytes > 0) {
          const percent = Math.round((receivedBytes / totalBytes) * 100);
          setDownloadProgress(percent);
        } else {
          // Fallback if no content-length header
          setDownloadProgress((prev) => Math.min(prev + 1, 99));
        }
      }

      setConversionStatus('saving');
      const blob = new Blob(chunks, { type: 'audio/mp3' });

      // Save inside internal app IndexedDB
      await saveSong(converterModalSong, blob, false);
      setIsAlreadyOffline(true);

      // Trigger standard phone / PC browser save dialogue
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${converterModalSong.title} - ${converterModalSong.artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      setConversionStatus('success');
    } catch (err: any) {
      console.error("Instant converter error:", err);
      setConversionError(err.message || "Koneksi terputus. Silakan gunakan tab t-fest.pl.");
      setConversionStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {converterModalSong && (
        <div className={cn(
          "fixed inset-0 z-[110] transition-colors duration-300",
          isConverterMinimized ? "pointer-events-none bg-transparent" : "flex items-center justify-center p-4 sm:p-0"
        )}>
          {/* Backdrop overlay (only when NOT minimized) */}
          {!isConverterMinimized && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeConverter}
              className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
              id="converter-backdrop"
            />
          )}

          {/* Modal Window (keeps mounted so internal downloads / iframe states stay active, but hidden visually) */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={isConverterMinimized 
              ? { scale: 0.85, opacity: 0, y: 40, transition: { duration: 0.25 } }
              : { scale: 1, opacity: 1, y: 0 }
            }
            className={cn(
              "relative w-full max-w-md md:max-w-xl bg-white dark:bg-bg-dark rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90dvh] transition-all duration-300 pointer-events-auto",
              isConverterMinimized ? "absolute opacity-0 pointer-events-none invisible w-0 h-0 overflow-hidden" : ""
            )}
            id="converter-modal"
          >
          {/* Header */}
          <div className="relative p-6 pb-2 shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Premium MP3 Converter
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Murni MP3 Tanpa Putar Video
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={minimizeConverter} 
                className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-full text-slate-700 dark:text-slate-200 transition-colors"
                id="minimize-converter-btn"
                title="Sembunyikan (Minimize)"
              >
                <Minimize2 size={18} />
              </button>

              <button 
                onClick={closeConverter} 
                className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-full text-slate-700 dark:text-slate-200 transition-colors"
                id="close-converter-btn"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tab Control */}
          <div className="px-6 pt-4 shrink-0">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl flex gap-1">
              <button 
                onClick={() => setActiveTab('instant')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs tracking-wide transition-all ${
                  activeTab === 'instant' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                id="tab-instant"
              >
                🚀 Konversi Instan
              </button>
              <button 
                onClick={() => setActiveTab('tfest')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs tracking-wide transition-all ${
                  activeTab === 'tfest' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                id="tab-tfest"
              >
                ⚡ t-fest.pl (Manual)
              </button>
              <button 
                onClick={() => setActiveTab('vevioz')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs tracking-wide transition-all ${
                  activeTab === 'vevioz' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                id="tab-vevioz"
              >
                🤖 Widget Iframe
              </button>
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar min-h-0">
            {/* Song Meta Widget */}
            {(() => {
              const formatTime = (seconds: number) => {
                if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
              };

              const isCurrentLocalPlay = currentSong && converterModalSong && currentSong.id.split('_')[0] === converterModalSong.id.split('_')[0];

              const handleMetaSeek = (e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                requestSeek(percentage);
              };

              return (
                <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4 border border-slate-100 dark:border-white/5 mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                      <img src={converterModalSong.cover} alt="Cover" className="w-full h-full object-cover" />
                      {isCurrentLocalPlay && isPlaying && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-0.5 h-3 bg-white/90 animate-pulse mx-0.5 rounded-full"></div>
                          <div className="w-0.5 h-4 bg-white/90 animate-pulse delay-75 mx-0.5 rounded-full"></div>
                          <div className="w-0.5 h-2 bg-white/90 animate-pulse delay-150 mx-0.5 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{converterModalSong.title}</h4>
                        {isAlreadyOffline && (
                          <span className="text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 px-1 py-0.5 rounded-md shrink-0 font-bold">OFFLINE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{converterModalSong.artist}</p>
                    </div>
                    
                    {/* Control Trigger */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { if (isCurrentLocalPlay) prevSong(); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCurrentLocalPlay ? 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                        disabled={!isCurrentLocalPlay}
                        title="Lagu Sebelumnya"
                      >
                        <SkipBack size={16} fill="currentColor" />
                      </button>

                      <button 
                        onClick={() => {
                          if (isCurrentLocalPlay) {
                            togglePlay();
                          } else {
                            playSong(converterModalSong);
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all shadow-md shadow-primary/25"
                        id="modal-play-toggle"
                        title="Putar / Jeda"
                      >
                        {isCurrentLocalPlay && isPlaying ? (
                          <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                      </button>

                      <button 
                        onClick={() => { if (isCurrentLocalPlay) nextSong(); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCurrentLocalPlay ? 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                        disabled={!isCurrentLocalPlay}
                        title="Lagu Berikutnya"
                      >
                        <SkipForward size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  {/* Progress track if this song is currently played/loaded */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
                      {isCurrentLocalPlay ? formatTime(currentTimeSec) : "0:00"}
                    </span>
                    <div 
                      onClick={isCurrentLocalPlay ? handleMetaSeek : undefined}
                      className={`flex-1 h-1.5 rounded-full overflow-hidden relative ${isCurrentLocalPlay ? 'bg-slate-200 dark:bg-slate-850 cursor-pointer' : 'bg-slate-200/50 dark:bg-slate-800/50 cursor-not-allowed'}`}
                      title={isCurrentLocalPlay ? "Klik untuk melompat" : "Putar lagu untuk mengaktifkan linimasa"}
                    >
                      <div 
                        className={`h-full bg-primary rounded-full transition-all duration-100`}
                        style={{ width: `${isCurrentLocalPlay ? progressPercent : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
                      {isCurrentLocalPlay ? formatTime(totalDurationSec) : "--:--"}
                    </span>
                  </div>
                </div>
              );
            })()}

            <AnimatePresence mode="wait">
              {activeTab === 'instant' ? (
                <motion.div 
                  key="instant-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 text-center">
                    <div className="flex justify-center">
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Sparkles size={28} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Konverter Premium Instant</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Proses otomatis, bebas video, murni MP3, aman untuk putar latar belakang (Background Play).</p>
                    </div>

                    {conversionStatus === 'idle' && (
                      <div className="space-y-3">
                        <button
                          onClick={handleInstantDownload}
                          className="w-full py-3.5 px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                          id="start-instant-btn"
                        >
                          <Download size={18} />
                          Simpan & Putar di Aplikasi (Offline)
                        </button>
                        <button
                          onClick={handleNativeBrowserDownload}
                          className="w-full py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
                          id="start-native-btn"
                          title="Gunakan manager unduhan bawaan HP/PC sehingga dapat berjalan di latar belakang meski aplikasi ditutup."
                        >
                          <ExternalLink size={16} />
                          Download Asli di Luar Aplikasi (Background)
                        </button>
                      </div>
                    )}

                    {conversionStatus === 'resolving' && (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
                          <Loader2 size={18} className="animate-spin" />
                          <span>Mencari server direct tercepat...</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/50 w-2/5 animate-pulse rounded-full"></div>
                        </div>
                      </div>
                    )}

                    {conversionStatus === 'downloading' && (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin text-primary" />
                            Mengunduh Audio MP3...
                          </span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-150"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {conversionStatus === 'saving' && (
                      <div className="space-y-2 py-2">
                        <div className="flex items-center justify-center gap-2 text-green-500 font-bold text-sm">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Menyimpan ke Koleksi Musik HP...</span>
                        </div>
                      </div>
                    )}

                    {conversionStatus === 'success' && (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-center gap-2 text-green-500 font-bold text-sm">
                          <CheckCircle size={20} />
                          <span>Selesai! MP3 Disimpan</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                          Lagu telah otomatis di-import ke Koleksi Musik Anda! File audio juga berhasil disimpan ke penyimpanan HP Anda secara lokal.
                        </p>
                        <button
                          onClick={() => setConversionStatus('idle')}
                          className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors"
                        >
                          Konversi Lagi
                        </button>
                      </div>
                    )}

                    {conversionStatus === 'error' && (
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-center gap-2 text-red-500 font-bold text-sm">
                          <AlertCircle size={20} />
                          <span>Konversi Otomatis Gagal</span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-center font-medium">
                          {conversionError}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleInstantDownload}
                            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs"
                          >
                            Ulangi Coba
                          </button>
                          <button
                            onClick={() => setActiveTab('tfest')}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
                          >
                            Gunakan t-fest.pl
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === 'tfest' ? (
                <motion.div 
                  key="tfest-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Automatic Copy Status Badge */}
                  <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-2xl border border-green-200/50 dark:border-green-500/20 text-xs font-semibold leading-relaxed">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-[10px]">✓</span>
                    <span>
                      <strong>Tautan YouTube otomatis disalin ke HP Anda!</strong> Tinggal klik tahan pada kotak input di bawah dan pilih <strong>Tempel / Paste</strong>.
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-100 dark:border-white/5 rounded-2xl">
                    <p className="mb-2">
                      💡 <strong className="text-primary dark:text-secondary font-bold">Langkah Mudah Konversi & Putar:</strong>
                    </p>
                    <ul className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                      <li>Tempel (Paste) tautan otomatis di kolom t-fest.pl (Iframe).</li>
                      <li>Klik konversi (convert), unduh file MP3 hasil konversinya.</li>
                      <li>Impor file MP3 di menu <strong className="text-primary dark:text-secondary">Koleksi Musik &rarr; Folder HP</strong> untuk diputar lgsg di aplikasi!</li>
                    </ul>
                  </div>

                  {/* The IFrame Widget itself */}
                  <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/5 h-[340px] relative flex flex-col shadow-inner mt-2">
                    {iframeLoading && (
                      <div className="absolute inset-0 z-20 bg-slate-100 dark:bg-slate-950 flex items-center justify-center flex-col gap-2">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">MEMBUAT KONEKSI IFRAME KE t-fest.pl...</span>
                      </div>
                    )}
                    <iframe 
                      src="https://t-fest.pl/"
                      className="relative z-10 w-full h-[335px]" 
                      style={{ border: 'none' }}
                      onLoad={() => setIframeLoading(false)}
                      id="tfest-iframe"
                    />
                  </div>

                  {/* Backup Open t-fest.pl action if blocked */}
                  <div className="flex items-center justify-between text-xs font-semibold px-1 mt-1">
                    <span className="text-slate-400">Website tidak muncul?</span>
                    <button 
                      onClick={handleOpenTfest}
                      className="text-primary hover:text-primary-dark flex items-center gap-1 font-bold"
                      id="open-tfest-backup-btn"
                    >
                      Buka t-fest.pl di Tab Baru <ExternalLink size={12} />
                    </button>
                  </div>

                </motion.div>
              ) : (
                <motion.div 
                  key="vevioz-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Automatic Copy Status Badge */}
                  <div className="flex items-center gap-2.5 p-3.5 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-2xl border border-green-200/50 dark:border-green-500/20 text-xs font-semibold leading-relaxed">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-[10px]">✓</span>
                    <span>
                      <strong>Tautan YouTube otomatis siap!</strong> Audio diproses khusus dalam bentuk MP3 saja agar bebas dari pemutaran video.
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Widget Fast YouTube Downloader API ini dikonfigurasi khusus hanya untuk format MP3 (No Video & Audio Only) sehingga ramah bagi pemutaran latar belakang.
                  </p>

                  {/* The IFrame Widget itself */}
                  <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/5 h-[160px] relative flex items-center justify-center shadow-inner">
                    {iframeLoading && (
                      <div className="absolute inset-0 z-20 bg-slate-100 dark:bg-slate-950 flex items-center justify-center flex-col gap-2">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider">LOADING WIDGET...</span>
                      </div>
                    )}
                    <iframe 
                      src={`https://api.vevioz.com/api/widget/mp3/${videoId}`}
                      className="relative z-10 w-full h-[155px]" 
                      style={{ border: 'none' }}
                      scrolling="no"
                      onLoad={() => setIframeLoading(false)}
                      id="vevioz-iframe"
                    />
                  </div>

                  {/* Sandbox helper explanation */}
                  <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20 p-3.5 rounded-2xl text-[11px] text-yellow-800 dark:text-yellow-400 font-semibold leading-relaxed">
                    ⚙️ Pilih bitrate MP3 kualitas tinggi yang Anda inginkan (misalnya <strong className="text-primary dark:text-secondary font-bold">320 kbps</strong>) lalu tekan tombol <strong className="text-primary font-bold">Download</strong> pada widget di atas.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Footer Safe Button */}
          <div className="p-4 border-t border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-slate-800/10 flex gap-3">
            <button 
              onClick={closeConverter}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-sm transition-colors text-center"
              id="back-converter-btn"
            >
              Kembali
            </button>
            <button 
              onClick={copyToClipboard}
              className="py-3 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
              id="footer-copy-btn"
            >
              <Copy size={16} />
              {copied ? "Tersalin!" : "Salin Link Manual"}
            </button>
          </div>
        </motion.div>

        {/* Minimized Floating Widget */}
        {isConverterMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            className="absolute left-4 right-4 sm:left-auto sm:right-4 sm:w-[280px] z-[115] pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col p-3 gap-2.5 backdrop-blur-xl dark:text-white transition-all duration-300"
            style={{
              bottom: (currentSong && !isPlayerOpen) ? "152px" : "80px"
            }}
            id="converter-minimized-widget"
          >
            {/* Header inside widget */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase text-primary tracking-widest">
                <Sparkles size={12} className="animate-pulse text-primary shrink-0" />
                <span>Converter Diminimalkan</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={restoreConverter}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                  title="Perbesar / Restore"
                >
                  <Maximize2 size={13} />
                </button>
                <button 
                  onClick={closeConverter}
                  className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 dark:text-slate-400 rounded-lg transition-colors"
                  title="Tutup / Batalkan"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Body inside widget */}
            <div 
              onClick={restoreConverter}
              className="flex items-center gap-2.5 cursor-pointer bg-slate-50/50 dark:bg-white/[0.02] p-2 rounded-xl border border-slate-100/50 dark:border-white/[0.03] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors"
            >
              <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm">
                <img src={converterModalSong.cover} alt="Cover" className="w-full h-full object-cover" />
                {(conversionStatus === 'resolving' || conversionStatus === 'downloading' || conversionStatus === 'saving') && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate leading-tight">
                  {converterModalSong.title}
                </h4>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 truncate max-w-[125px] font-bold">
                    {converterModalSong.artist}
                  </span>
                  
                  {/* Live status bubble */}
                  <span className={cn(
                    "text-[8px] font-black px-1 py-0.5 rounded ml-1 tracking-wide shrink-0",
                    conversionStatus === 'idle' && "bg-slate-100 dark:bg-white/5 text-slate-500",
                    conversionStatus === 'resolving' && "bg-primary/15 text-primary animate-pulse",
                    conversionStatus === 'downloading' && "bg-primary text-white font-black",
                    conversionStatus === 'saving' && "bg-amber-500/15 text-amber-500 animate-pulse",
                    conversionStatus === 'success' && "bg-green-500/15 text-green-500 font-extrabold",
                    conversionStatus === 'error' && "bg-red-500/15 text-red-500 font-extrabold"
                  )}>
                    {conversionStatus === 'idle' && "READY"}
                    {conversionStatus === 'resolving' && "MENCARI..."}
                    {conversionStatus === 'downloading' && `${downloadProgress}%`}
                    {conversionStatus === 'saving' && "MENYIMPAN..."}
                    {conversionStatus === 'success' && "SUKSES ✓"}
                    {conversionStatus === 'error' && "GAGAL ⚠️"}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress line indicator (active only during work) */}
            {(conversionStatus === 'resolving' || conversionStatus === 'downloading' || conversionStatus === 'saving') && (
              <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shrink-0 mt-0.5">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-150", 
                    conversionStatus === 'resolving' ? 'w-1/3 bg-primary/45 animate-pulse' :
                    conversionStatus === 'saving' ? 'w-4/5 bg-amber-500 animate-pulse' : 'bg-primary'
                  )}
                  style={conversionStatus === 'downloading' ? { width: `${downloadProgress}%` } : undefined}
                />
              </div>
            )}
          </motion.div>
        )}
      </div>
    )}
  </AnimatePresence>
);
}
