import { Search, RotateCw, Loader2, ChevronLeft, Clock, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SongCard } from "../components/ui/SongCard";
import { ListSongCard } from "../components/ui/ListSongCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { usePlayerStore } from "../store/usePlayerStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { Song } from "../types";

export default function HomePage() {
  const navigate = useNavigate();
  const playSong = usePlayerStore(state => state.playSong);
  const { history, removeFromHistory, clearHistory } = useHistoryStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<{
    trending: Song[];
    lawas: Song[];
    dangdut: Song[];
    malaysia: Song[];
    religi: Song[];
    rock: Song[];
  } | null>(null);

  const [activeCategory, setActiveCategory] = useState<{ title: string; songs: Song[] } | null>(null);

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/home' : '/api/home')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/home?refresh=true' : '/api/home?refresh=true');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal menyegarkan daftar lagu:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Grouping songs for queue Context
  const handlePlaySong = (song: Song, queue: Song[]) => {
    playSong(song, queue);
  };

  if (activeCategory) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0f172a]">
        {/* Category Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 pt-safe px-4 pb-4">
          <div className="flex items-center gap-2 mt-6">
            <button 
              onClick={() => setActiveCategory(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-800 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {activeCategory.title}
            </h1>
          </div>
        </div>
        
        {/* Category List */}
        <div className="px-4 pt-4 pb-24 grid grid-cols-2 gap-4">
          <AnimatePresence>
            {(activeCategory.songs || []).map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, activeCategory.songs || [])} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi,";
    if (hour < 15) return "Selamat Siang,";
    if (hour < 18) return "Selamat Sore,";
    return "Selamat Malam,";
  };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Header Sticky Container */}
      <div className="sticky top-0 z-40 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-xl border-b border-white/10 pt-safe px-6 pb-4 shadow-sm dark:shadow-none">
        <header className="flex justify-between items-center mt-6">
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="text-primary dark:text-secondary font-bold tracking-wider text-[10px] mb-1 uppercase"
            >
              {getGreeting()}
            </motion.h2>
            <motion.h1 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Alfaza Music
            </motion.h1>
          </div>

          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="w-10 h-10 rounded-full glass border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-sm relative active:opacity-75 disabled:opacity-50 transition-opacity"
            title="Segar Ulang Daftar Lagu"
          >
            <RotateCw size={18} className={`${isRefreshing ? 'animate-spin text-primary dark:text-secondary' : 'text-slate-600 dark:text-slate-300'}`} />
          </motion.button>
        </header>

        {/* Search Bar - Fake input that navigates to search tab */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div 
            onClick={() => navigate('/search')}
            className="flex items-center gap-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3.5 shadow-sm text-slate-400 w-full cursor-text hover:border-primary/50 transition-colors"
          >
            <Search size={20} className="text-slate-400 shrink-0" />
            <span className="text-sm font-medium">Cari pop, religi, dangdut, malaysia...</span>
          </div>
        </motion.div>
      </div>

      {/* Main Scrollable Content */}
      <div className="px-6 pb-24 pt-2">
        <AnimatePresence>
          {isLoading ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-20"
            >
              <Loader2 className="animate-spin text-primary w-8 h-8" />
              <span className="ml-3 text-slate-500 font-medium text-sm">Menyiapkan lagu-lagu hits...</span>
            </motion.div>
          ) : data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Riwayat Pemutaran */}
              {history.length > 0 && (
                <div className="mt-2 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-primary" />
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Riwayat Pemutaran</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveCategory({ title: 'Riwayat Pemutaran', songs: history })}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Lihat Semua
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        title="Hapus riwayat"
                      >
                        <Trash2 size={13} className="text-slate-400 hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal scroll riwayat */}
                  <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                    {history.slice(0, 15).map((song, i) => (
                      <motion.div
                        key={song.id + '_hist'}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative snap-start flex-shrink-0 group"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, history)} />
                        {/* Tombol hapus per item */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromHistory(song.id); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Konfirmasi hapus semua */}
                  <AnimatePresence>
                    {showClearConfirm && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Hapus semua riwayat?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="px-3 py-1 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                          >Batal</button>
                          <button
                            onClick={() => { clearHistory(); setShowClearConfirm(false); }}
                            className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold"
                          >Hapus</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Trending Section / Pop Indonesia */}
              {(data.trending && data.trending.length > 0) && (
                <div>
                  <SectionHeader title="Pop Indonesia Hits" onSeeAll={() => setActiveCategory({ title: "Pop Indonesia Hits", songs: data.trending })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.trending.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.trending)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tembang Kenangan / Lawas */}
              {(data.lawas && data.lawas.length > 0) && (
                <div className="mt-2">
                  <SectionHeader title="Nostalgia Lawas 90an" onSeeAll={() => setActiveCategory({ title: "Nostalgia Lawas 90an", songs: data.lawas })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.lawas.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.lawas)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dangdut Koplo */}
              {(data.dangdut && data.dangdut.length > 0) && (
                <div className="mt-8">
                  <SectionHeader title="Dangdut Koplo Terbaru" onSeeAll={() => setActiveCategory({ title: "Dangdut Koplo Terbaru", songs: data.dangdut })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.dangdut.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.dangdut)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lagu Malaysia Area */}
              {(data.malaysia && data.malaysia.length > 0) && (
                <div className="mt-8">
                  <SectionHeader title="Malaysia Populer" onSeeAll={() => setActiveCategory({ title: "Malaysia Populer", songs: data.malaysia })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.malaysia.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.malaysia)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lagu Religi */}
              {(data.religi && data.religi.length > 0) && (
                <div className="mt-4">
                  <SectionHeader title="Religi Penyejuk Hati" onSeeAll={() => setActiveCategory({ title: "Religi Penyejuk Hati", songs: data.religi })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.religi.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.religi)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rock Indonesia */}
              {(data.rock && data.rock.length > 0) && (
                <div className="mt-8">
                  <SectionHeader title="Rock Indonesia" onSeeAll={() => setActiveCategory({ title: "Rock Indonesia", songs: data.rock })} />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                    {data.rock.slice(0, 10).map((song, i) => (
                      <motion.div 
                        key={song.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="snap-start"
                      >
                        <SongCard song={song} onClick={() => handlePlaySong(song, data.rock)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
