import React, { useEffect, useState } from 'react';
import { Loader2, Zap, Hourglass, Radio, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StreamLoadingProgressProps {
  isLoading: boolean;
  isDownload?: boolean;
}

export function StreamLoadingProgress({ isLoading, isDownload = false }: StreamLoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [statusText, setStatusText] = useState('Menginisialisasi...');

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setElapsed(0);
      setStatusText('Menunggu...');
      return;
    }

    setElapsed(0);
    setProgress(0);

    // Initial message
    setStatusText(isDownload ? 'Menyiapkan unduhan MP3...' : 'Mencari jalur koneksi audio...');

    // 1. Elapsed timer incrementing every 0.1 seconds for high-precision progress updates
    const start = Date.now();
    const interval = setInterval(() => {
      const timePassedSec = (Date.now() - start) / 1000;
      setElapsed(timePassedSec);

      // 2. Compute smooth progressive estimated buffer percentage
      let currentProgress = 0;
      if (timePassedSec < 1.5) {
        // Step 1: Querying Invidious / analyzing video parameters
        currentProgress = (timePassedSec / 1.5) * 35;
        setStatusText(isDownload ? 'Menganalisis video YouTube...' : 'Mencari server tercepat...');
      } else if (timePassedSec < 3.5) {
        // Step 2: Extracting audio stream details / Method A
        currentProgress = 35 + ((timePassedSec - 1.5) / 2.0) * 30;
        setStatusText(isDownload ? 'Mengekstrak berkas MP3...' : 'Menghubungkan jalur musik...');
      } else if (timePassedSec < 6.0) {
        // Step 3: Trying Cobalt API servers (Method B)
        currentProgress = 65 + ((timePassedSec - 3.5) / 2.5) * 20;
        setStatusText(isDownload ? 'Mengunduh data biner audio...' : 'Beralih ke jalur cadangan...');
      } else if (timePassedSec < 10.0) {
        // Step 4: Final buffering stage
        currentProgress = 85 + ((timePassedSec - 6.0) / 4.0) * 12;
        setStatusText(isDownload ? 'Menyelesaikan konversi frekuensi...' : 'Menyiapkan buffer lagu...');
      } else {
        // Creeping up to the finished state
        currentProgress = Math.min(99, 97 + ((timePassedSec - 10.0) / 10.0) * 2);
        setStatusText(isDownload ? 'Menyimpan ke memori perangkat...' : 'Menstabilkan sinyal stream...');
      }

      setProgress(Math.round(currentProgress));
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [isLoading, isDownload]);

  if (!isLoading) return null;

  // Render different designs for small screen widgets vs main overlays
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="w-full bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl text-white font-sans max-w-sm mx-auto"
    >
      <div className="flex items-start gap-3">
        {/* Animated pulsating circular stage progress */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-ping" />
          <div className="relative w-10 h-10 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center text-primary">
            {elapsed < 1.5 ? (
              <Zap size={18} className="animate-pulse" />
            ) : elapsed < 3.5 ? (
              <Radio size={18} className="animate-pulse" />
            ) : (
              <Hourglass size={18} className="animate-spin duration-3000" />
            )}
          </div>
        </div>

        {/* Status updates & detail labels */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary truncate">
              {isDownload ? 'MENYIAPKAN MP3' : 'MENGHUBUNGKAN'}
            </span>
            <span className="text-xs font-mono font-bold text-white/50 shrink-0">
              {progress}%
            </span>
          </div>
          
          <p className="text-xs text-white/90 font-medium truncate mb-2">
            {statusText}
          </p>

          {/* Precision progress indicator strip */}
          <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/80 to-secondary rounded-full"
              style={{ width: `${progress}%` }}
              layoutId="steamProgressBar"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Time logs & estimation text helper */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] font-mono text-white/40">
              Waktu: {elapsed.toFixed(1)}s
            </span>
            <span className="text-[10px] text-primary/80 font-medium">
              Estimasi: {elapsed < 3 ? '~3-6s selesai' : 'Hampir siap...'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
