import { Search, RotateCw, Loader2, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SongCard } from "../components/ui/SongCard";
import { ListSongCard } from "../components/ui/ListSongCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { usePlayerStore } from "../store/usePlayerStore";
import { Song } from "../types";

export default function HomePage() {
  const navigate = useNavigate();
  const playSong = usePlayerStore(state => state.playSong);

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
      <div className="flex flex-col min-h-screen">
        {/* Category Header */}
        <div className="sticky top-0 z-40 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-xl border-b border-white/10 pt-safe px-4 pb-4">
          <div className="flex items-center gap-2 mt-6">
            <button 
              onClick={() => setActiveCategory(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-800 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {activeCategory.title}
            </h1>
          </div>
        </div>
        
        {/* Category List */}
        <div className="px-4 pt-4 pb-24 flex flex-col gap-2">
          <AnimatePresence>
            {activeCategory.songs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ListSongCard song={song} onClick={() => handlePlaySong(song, activeCategory.songs)} />
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
              {/* Trending Section / Pop Indonesia */}
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

              {/* Tembang Kenangan / Lawas */}
              <div className="mt-2">
                <SectionHeader title="Nostalgia Lawas 90an" onSeeAll={() => setActiveCategory({ title: "Nostalgia Lawas 90an", songs: data.lawas })} />
                <div className="grid grid-cols-2 gap-4">
                  {data.lawas.slice(0, 4).map((song, i) => (
                    <motion.div 
                      key={song.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, data.lawas)} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Dangdut Koplo */}
              <div className="mt-8">
                <SectionHeader title="Dangdut Koplo Terbaru" onSeeAll={() => setActiveCategory({ title: "Dangdut Koplo Terbaru", songs: data.dangdut })} />
                <div className="flex flex-col gap-2">
                  {data.dangdut.slice(0, 5).map((song, i) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <ListSongCard song={song} onClick={() => handlePlaySong(song, data.dangdut)} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Lagu Malaysia Area */}
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

              {/* Lagu Religi */}
              <div className="mt-4">
                <SectionHeader title="Religi Penyejuk Hati" onSeeAll={() => setActiveCategory({ title: "Religi Penyejuk Hati", songs: data.religi })} />
                <div className="flex flex-col gap-2">
                  {data.religi.slice(0, 5).map((song, i) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <ListSongCard song={song} onClick={() => handlePlaySong(song, data.religi)} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Rock Indonesia */}
              <div className="mt-8">
                <SectionHeader title="Rock Indonesia" onSeeAll={() => setActiveCategory({ title: "Rock Indonesia", songs: data.rock })} />
                <div className="grid grid-cols-2 gap-4">
                  {data.rock.slice(0, 4).map((song, i) => (
                    <motion.div 
                      key={song.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, data.rock)} />
                    </motion.div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
