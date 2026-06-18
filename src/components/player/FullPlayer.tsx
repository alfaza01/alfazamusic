import { Play, Pause, SkipForward, SkipBack, Share2, Heart, ListMusic, ChevronDown, Repeat, Shuffle, Download, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useEffect, useState } from "react";
import { saveSong, isSongDownloaded } from "../../lib/db";
import { StreamLoadingProgress } from "./StreamLoadingProgress";
import { useMenuStore } from "../../store/useMenuStore";

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

  // Check if current song is downloaded already
  useEffect(() => {
    if (currentSong && isPlayerOpen) {
      isSongDownloaded(currentSong.id).then(setIsDownloaded);
    }
  }, [currentSong, isPlayerOpen]);

  if (!currentSong) return null;

  const handleDownload = async () => {
    const videoId = currentSong.id.split('_')[0];
    const downloadUrl = (currentSong.id.startsWith('local_') || currentSong.url?.startsWith('blob:'))
      ? currentSong.url
      : import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/proxy-download?id=${videoId}` : `/api/proxy-download?id=${videoId}`;

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
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ListMusic size={20} />
              </button>
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

            {/* Album Cover */}
            <motion.div 
              key={currentSong.id} /* force re-animate on change */
              className="relative z-10 flex-1 flex items-center justify-center py-4"
              initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className={`w-full max-w-[240px] aspect-square rounded-[36px] overflow-hidden shadow-2xl shadow-primary/30 relative transition-all duration-500 ${isPlaying ? 'scale-100' : 'scale-95'} ${isLoadingAudio ? 'animate-pulse scale-98 border-2 border-primary/50' : ''}`}>
                <img src={currentSong.cover} alt={currentSong.title} className={`w-full h-full object-cover transition-all duration-300 ${isLoadingAudio ? 'brightness-50 blur-[2px]' : ''}`} />
                {isLoadingAudio && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 text-center">
                    <div className="relative flex items-center justify-center">
                      {/* Concentric spinning rings */}
                      <div className="absolute w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute w-12 h-12 border-4 border-t-primary rounded-full animate-spin"></div>
                    </div>
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-4 animate-pulse">
                      CONVERTING BY T-FEST.PL...
                    </span>
                  </div>
                )}
              </div>
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
