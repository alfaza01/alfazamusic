import { useState } from "react";
import { Settings, Play, Mic2, Shuffle, Repeat, Moon, Sun, ChevronLeft } from "lucide-react";
import { ListSongCard } from "../components/ui/ListSongCard";
import { recentSongs } from "../data/mock";
import { motion, AnimatePresence } from "motion/react";
import { useThemeStore } from "../store/useThemeStore";
import { usePlayerStore } from "../store/usePlayerStore";

export default function ProfilePage() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const playSong = usePlayerStore((state) => state.playSong);
  const [showHistory, setShowHistory] = useState(false);

  const quickSettings = [
    { icon: isDarkMode ? Moon : Sun, label: "Dark Mode", active: isDarkMode, action: toggleDarkMode },
    { icon: Shuffle, label: "Mode Hemat Data", active: false, action: () => {} },
    { icon: Play, label: "Auto Playback", active: true, action: () => {} },
    { icon: Mic2, label: "Kualitas Audio Tinggi", active: true, action: () => {} },
  ];

  if (showHistory) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Category Header */}
        <div className="sticky top-0 z-40 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-xl border-b border-white/10 pt-safe px-4 pb-4">
          <div className="flex items-center gap-2 mt-6">
            <button 
              onClick={() => setShowHistory(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-800 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Riwayat Pemutaran
            </h1>
          </div>
        </div>
        
        {/* Category List */}
        <div className="px-4 pt-4 pb-24 flex flex-col gap-2">
          <AnimatePresence>
            {recentSongs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
    <div className="min-h-screen flex flex-col">
      {/* Profile Header Block */}
      <div className="relative pt-12 pb-6 px-6 bg-gradient-to-br from-primary to-primary-dark text-white rounded-b-[40px] shadow-lg">
        
        {/* Top actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold tracking-tight">Profil</h1>
          <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-md">
            <Settings size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden mb-4 shadow-xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          <h2 className="text-2xl font-bold mb-1">Alfaza User</h2>
          <p className="text-white/70 font-medium text-sm mb-4">Premium Member</p>
          
          {/* Stats */}
          <div className="flex gap-8 text-center bg-black/20 p-4 rounded-2xl backdrop-blur-md">
            <div>
              <p className="text-2xl font-bold">128</p>
              <p className="text-[10px] uppercase tracking-wider text-white/70">Mengikuti</p>
            </div>
            <div className="w-[1px] bg-white/20"></div>
            <div>
              <p className="text-2xl font-bold">45</p>
              <p className="text-[10px] uppercase tracking-wider text-white/70">Playlist</p>
            </div>
            <div className="w-[1px] bg-white/20"></div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-[10px] uppercase tracking-wider text-white/70">Artis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content Area */}
      <div className="px-6 py-6 flex-1">
        
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Pengaturan Cepat</h3>
        
        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {quickSettings.map((item, i) => {
            const Icon = item.icon;
            return (
              <div 
                key={i} 
                onClick={item.action}
                className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-start gap-3 shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.active ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  <Icon size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                <div className={`w-10 h-5 rounded-full relative ${item.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-all ${item.active ? 'left-5' : 'left-1'}`}></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* History Preview */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat Pemutaran</h3>
          <span onClick={() => setShowHistory(true)} className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-primary transition-colors">Lihat Semua</span>
        </div>
        <div className="flex flex-col gap-2">
          {recentSongs.map(song => (
            <ListSongCard key={song.id} song={song} onClick={() => playSong(song, recentSongs)} />
          ))}
        </div>

      </div>

    </div>
  );
}
