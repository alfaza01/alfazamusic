import { useState, useEffect } from "react";
import { Settings, Play, Mic2, Shuffle, Moon, Sun, ChevronLeft, Trash2, Info, Bell, ShieldCheck, ChevronRight, LogOut } from "lucide-react";
import { ListSongCard } from "../components/ui/ListSongCard";
import { recentSongs } from "../data/mock";
import { motion, AnimatePresence } from "motion/react";
import { useThemeStore } from "../store/useThemeStore";
import { usePlayerStore } from "../store/usePlayerStore";

export default function ProfilePage() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const playSong = usePlayerStore((state) => state.playSong);
  
  const [showHistory, setShowHistory] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [highQuality, setHighQuality] = useState(true);
  const [cacheSize, setCacheSize] = useState("124 MB");

  const clearCache = () => {
    setCacheSize("0 MB");
    alert("Cache berhasil dibersihkan!");
  };

  if (showHistory) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-black">
        {/* Category Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 pt-safe px-4 pb-4">
          <div className="flex items-center gap-3 mt-6">
            <button 
              onClick={() => setShowHistory(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={22} className="text-slate-800 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Riwayat Lengkap
            </h1>
          </div>
        </div>
        
        {/* Category List */}
        <div className="px-4 pt-4 pb-24 flex flex-col gap-2">
          <AnimatePresence>
            {recentSongs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              >
                <ListSongCard song={song} onClick={() => playSong(song, recentSongs)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-black">
      {/* Profile Header Block */}
      <div className="relative pt-12 pb-8 px-6 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-primary to-purple-600 dark:from-indigo-900 dark:via-primary-dark dark:to-purple-900 rounded-b-[48px] shadow-2xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
        
        {/* Top actions */}
        <div className="relative z-10 flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">Profil Saya</h1>
          <button className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all backdrop-blur-md shadow-lg active:scale-95">
            <Settings size={22} className="text-white" />
          </button>
        </div>

        {/* User Info */}
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="relative mb-4"
          >
            <div className="absolute inset-0 bg-white/30 rounded-full blur animate-pulse"></div>
            <div className="w-28 h-28 rounded-full border-[4px] border-white/40 overflow-hidden shadow-2xl relative z-10 bg-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-7 h-7 bg-green-500 border-2 border-white rounded-full z-20 flex items-center justify-center shadow-lg">
              <ShieldCheck size={14} className="text-white" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-1 tracking-wide drop-shadow-md">Alfaza Premium</h2>
          <p className="text-white/80 font-semibold text-sm mb-6 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Member Aktif
          </p>
          
          {/* Stats Glassmorphism */}
          <div className="flex gap-4 w-full max-w-sm">
            <div className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-center shadow-xl">
              <p className="text-2xl font-black text-white">128</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">Mengikuti</p>
            </div>
            <div className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-center shadow-xl">
              <p className="text-2xl font-black text-white">45</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">Playlist</p>
            </div>
            <div className="flex-1 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-center shadow-xl">
              <p className="text-2xl font-black text-white">12</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">Artis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content Area */}
      <div className="px-5 py-6 flex-1 space-y-8">
        
        {/* Settings Section */}
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 tracking-wide uppercase px-1">Pengaturan Cepat</h3>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
            
            {/* Dark Mode */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer" onClick={toggleDarkMode}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</h4>
                  <p className="text-xs text-slate-500 font-medium">Tema gelap untuk kenyamanan mata</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isDarkMode ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Data Saver */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer" onClick={() => setDataSaver(!dataSaver)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                  <Shuffle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mode Hemat Data</h4>
                  <p className="text-xs text-slate-500 font-medium">Kurangi kualitas cover album</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${dataSaver ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full shadow-sm transition-all duration-300 ${dataSaver ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>

            {/* Auto Play */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer" onClick={() => setAutoPlay(!autoPlay)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Play size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Auto Playback</h4>
                  <p className="text-xs text-slate-500 font-medium">Putar otomatis lagu berikutnya</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${autoPlay ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full shadow-sm transition-all duration-300 ${autoPlay ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>

            {/* High Quality Audio */}
            <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer" onClick={() => setHighQuality(!highQuality)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Mic2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Kualitas Audio Tinggi</h4>
                  <p className="text-xs text-slate-500 font-medium">Gunakan bitrate terbaik (128kbps+)</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${highQuality ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full shadow-sm transition-all duration-300 ${highQuality ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>

          </div>
        </div>

        {/* Actions Section */}
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 tracking-wide uppercase px-1">Lainnya</h3>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
            
            <div onClick={clearCache} className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bersihkan Cache</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{cacheSize}</span>
                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                  <Info size={18} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tentang Aplikasi</h4>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
            </div>
            
            <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <h4 className="text-sm font-bold text-red-500">Keluar Akun</h4>
              </div>
            </div>

          </div>
        </div>

        {/* History Preview */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Riwayat Pemutaran</h3>
            <button onClick={() => setShowHistory(true)} className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1">
              Lihat Semua <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {recentSongs.slice(0, 3).map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ListSongCard song={song} onClick={() => playSong(song, recentSongs)} />
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
