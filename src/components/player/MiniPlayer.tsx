import { Play, Pause, SkipForward, Loader2 } from "lucide-react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

export function MiniPlayer() {
  const { 
    currentSong, isPlaying, togglePlay, setPlayerOpen, 
    isPlayerOpen, nextSong, progressPercent, isLoadingAudio,
    currentTimeSec, totalDurationSec, requestSeek
  } = usePlayerStore();

  if (!currentSong || isPlayerOpen) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoadingAudio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    requestSeek(percentage);
  };

  const handleTouchSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLoadingAudio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    const percentage = clickX / rect.width;
    requestSeek(percentage);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="absolute bottom-[72px] left-2 right-2 sm:left-4 sm:right-4 z-[120]"
      >
        <div 
          onClick={() => setPlayerOpen(true)}
          className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[16px] shadow-xl border cursor-pointer overflow-hidden relative transition-all duration-300 ${
            isLoadingAudio 
              ? "border-primary/50 ring-1 ring-primary/25 shadow-primary/10 animate-pulse-slow" 
              : "border-slate-200/60 dark:border-white/10"
          }`}
        >
          {/* Progress Bar Top Edge - Interactive Slider */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleTouchSeek(e);
            }}
            className="absolute top-0 left-0 w-full h-[6px] bg-slate-100 dark:bg-slate-850 cursor-pointer group/progress transition-all hover:h-[8px] z-10"
            title="Sapu durasi lagu"
          >
            <motion.div 
              className={`h-full relative ${isLoadingAudio ? 'bg-primary/50' : 'bg-primary'}`} 
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            >
              {/* Slider thumb/knob indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border border-white dark:border-slate-900 opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </motion.div>
          </div>

          <div className="flex items-center p-2 gap-3 w-full pt-3">
            {/* Cover Art */}
            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm">
              <img src={currentSong.cover} alt={currentSong.title} className="object-cover w-full h-full" />
              {isLoadingAudio ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              ) : isPlaying ? (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-white/80 animate-pulse mx-0.5 rounded-full"></div>
                  <div className="w-0.5 h-4 bg-white/80 animate-pulse delay-75 mx-0.5 rounded-full"></div>
                  <div className="w-0.5 h-2 bg-white/80 animate-pulse delay-150 mx-0.5 rounded-full"></div>
                </div>
              ) : null}
            </div>

            <div className="flex-1 overflow-hidden pr-2">
              <h4 className="text-slate-900 dark:text-white font-bold text-sm truncate leading-tight mb-0.5 flex items-center gap-1.5">
                {isLoadingAudio && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping inline-block flex-shrink-0" />}
                <span className="truncate">{currentSong.title}</span>
              </h4>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                <span className="truncate flex-1 min-w-0 mr-2">
                  {isLoadingAudio ? "Menghubungkan ke YouTube..." : currentSong.artist}
                </span>
                <span className="font-mono text-[10px] tabular-nums shrink-0 opacity-80">
                  {formatTime(currentTimeSec)} / {formatTime(totalDurationSec)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 pr-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                disabled={isLoadingAudio}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isLoadingAudio 
                    ? "text-primary dark:text-primary-light" 
                    : "text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isLoadingAudio ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={22} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" className="ml-1" />
                )}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  nextSong();
                }}
                className="w-10 h-10 rounded-full text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <SkipForward size={22} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
