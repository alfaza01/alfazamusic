import { Search as SearchIcon, Settings2, X, Loader2, RotateCw, ChevronLeft, Flame, Music2, CheckCircle2, Circle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListSongCard } from "../components/ui/ListSongCard";
import { SongCard } from "../components/ui/SongCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Song } from "../types";
import { usePlayerStore } from "../store/usePlayerStore";

const ALL_CATEGORIES = [
  { id: 'trending', label: 'Trending Global', type: 'horizontal' },
  { id: 'pop_indo', label: 'Pop Indonesia', type: 'vertical' },
  { id: 'dangdut', label: 'Dangdut & Koplo', type: 'vertical' },
  { id: 'malaysia', label: 'Lagu Malaysia', type: 'vertical' },
  { id: 'english_pop', label: 'English Pop', type: 'vertical' },
  { id: 'bollywood', label: 'Bollywood Hits', type: 'horizontal' },
  { id: 'kpop', label: 'K-Pop Trending', type: 'vertical' }
];

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  
  const [homeData, setHomeData] = useState<Record<string, Song[]> | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{ title: string; songs: Song[] } | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(() => {
    const saved = localStorage.getItem('ytm_categories');
    if (saved) return JSON.parse(saved);
    return ['trending', 'pop_indo', 'dangdut', 'malaysia', 'english_pop'];
  });

  const playSong = usePlayerStore(state => state.playSong);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/ytmusic/home' : '/api/ytmusic/home')
      .then(res => res.json())
      .then(json => {
        setHomeData(json);
        setIsLoadingHome(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoadingHome(false);
      });
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing || isLoadingHome) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/ytmusic/home?refresh=true' : '/api/ytmusic/home?refresh=true');
      if (res.ok) {
        const json = await res.json();
        setHomeData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/ytmusic/search?q=${encodeURIComponent(query)}` : `/api/ytmusic/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("YTMusic search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 800); 

    return () => clearTimeout(timer);
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handlePlaySong = (song: Song, queue: Song[]) => {
    playSong(song, queue);
  };

  const toggleCategory = (catId: string) => {
    const next = selectedCats.includes(catId) 
      ? selectedCats.filter(id => id !== catId)
      : [...selectedCats, catId];
    setSelectedCats(next);
    localStorage.setItem('ytm_categories', JSON.stringify(next));
  };

  if (activeCategory) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0f172a]">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 pt-safe px-4 pb-4">
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0f172a] relative">
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Pilih Kategori Lagu</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {ALL_CATEGORIES.map(cat => {
                  const isSelected = selectedCats.includes(cat.id);
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-transparent'}`}
                    >
                      <span className={`font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{cat.label}</span>
                      {isSelected ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Circle size={22} className="text-slate-300 dark:text-slate-600" />}
                    </div>
                  )
                })}
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Selesai & Simpan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Search */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 px-6 pt-safe pb-4 transition-all duration-300">
        <header className="flex justify-between items-center mt-6">
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="text-emerald-500 font-bold tracking-wider text-[10px] mb-1 uppercase"
            >
              Studio Quality Engine
            </motion.h2>
            <motion.h1 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
            >
              YouTube Music
            </motion.h1>
          </div>

          <div className="flex items-center gap-2">
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm transition-all"
            >
              <Settings2 size={18} />
            </motion.button>
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingHome}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 transition-all"
            >
              <RotateCw size={18} className={`${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            </motion.button>
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-6 flex items-center gap-3 bg-white dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 transition-all duration-300 ${isFocused ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/5 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700/50 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'}`}
        >
          <SearchIcon size={20} className={`transition-colors duration-300 ${isFocused ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Cari di YouTube Music..."
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {query.length > 0 && (
            <button 
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-slate-700 p-1 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {query.length > 0 ? (
          <div className="px-6 py-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <SearchIcon size={16} className="text-emerald-500" />
              Hasil Pencarian "{query}"
            </h3>
            
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Mencari di YouTube Music...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {searchResults.map((song) => (
                  <ListSongCard key={song.id} song={song} onClick={() => handlePlaySong(song, searchResults)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <Music2 size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                <h4 className="text-slate-600 dark:text-slate-300 font-bold mb-1">Tidak Ditemukan</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">Coba gunakan kata kunci artis atau lagu lain.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-8 animate-fade-in">
            {selectedCats.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <Settings2 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h4 className="text-slate-600 dark:text-slate-300 font-bold mb-1">Kategori Disembunyikan</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">Silakan klik ikon pengaturan di pojok kanan atas untuk memunculkan daftar lagu.</p>
              </div>
            ) : (
              ALL_CATEGORIES.map(cat => {
                if (!selectedCats.includes(cat.id)) return null;
                const songs = homeData?.[cat.id] || [];
                
                if (isLoadingHome) {
                  return (
                    <div key={cat.id}>
                      <SectionHeader title={cat.label} />
                      {cat.type === 'horizontal' ? (
                        <div className="flex overflow-x-auto hide-scrollbar px-6 gap-4 pb-4">
                          {[...Array(4)].map((_, i) => <div key={i} className="min-w-[140px] aspect-[4/5] bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl"></div>)}
                        </div>
                      ) : (
                        <div className="px-6 flex flex-col gap-2">
                          {[...Array(3)].map((_, i) => <div key={i} className="h-16 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl"></div>)}
                        </div>
                      )}
                    </div>
                  )
                }

                if (songs.length === 0) return null;

                return (
                  <div key={cat.id}>
                    <SectionHeader 
                      icon={cat.id === 'trending' ? <Flame className="text-emerald-500" /> : undefined}
                      title={cat.label} 
                      onSeeAll={() => setActiveCategory({ title: cat.label, songs })} 
                    />
                    {cat.type === 'horizontal' ? (
                      <div className="flex overflow-x-auto hide-scrollbar px-6 gap-4 pb-4 snap-x">
                        {songs.slice(0, 10).map((song) => (
                          <div key={song.id} className="snap-start shrink-0">
                            <SongCard song={song} onClick={() => handlePlaySong(song, songs)} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 flex flex-col gap-2">
                        {songs.slice(0, 4).map((song) => (
                          <ListSongCard key={song.id} song={song} onClick={() => handlePlaySong(song, songs)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
