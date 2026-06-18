import React, { useEffect, useState } from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { usePlayerStore } from "../../store/usePlayerStore";
import { motion, AnimatePresence } from "motion/react";

export function PipPlayer() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, isLoadingAudio } = usePlayerStore();
  const [isPipMode, setIsPipMode] = useState(false);

  useEffect(() => {
    // Detect PIP mode by checking if the window height is unusually small
    const checkPip = () => {
      // In PIP mode, the aspect ratio is 21:9 or similar, and height is usually < 350px
      setIsPipMode(window.innerHeight < 350);
    };

    checkPip();
    window.addEventListener("resize", checkPip);
    return () => window.removeEventListener("resize", checkPip);
  }, []);

  if (!isPipMode || !currentSong) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-2"
        style={{
          // Use the cover image as a blurred background
          backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(15,23,42,0.95)), url(${currentSong.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="flex w-full items-center justify-between gap-3 px-2">
          {/* Cover Art Mini */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-xl border border-white/10 flex-shrink-0">
            <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
            {isLoadingAudio && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {/* Song Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
            <h3 className="text-white font-bold text-sm truncate leading-tight drop-shadow-md">
              {currentSong.title}
            </h3>
            <p className="text-white/70 text-xs truncate drop-shadow-md mt-0.5">
              {currentSong.artist}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); prevSong(); }}
              className="p-2 text-white/80 hover:text-white transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextSong(); }}
              className="p-2 text-white/80 hover:text-white transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
