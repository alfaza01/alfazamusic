import { Search as SearchIcon, History, TrendingUp, X, Loader2, RotateCw, ChevronLeft, Flame } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListSongCard } from "../components/ui/ListSongCard";
import { SongCard } from "../components/ui/SongCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Song } from "../types";
import { usePlayerStore } from "../store/usePlayerStore";

const SC_CLIENT_ID = "iErh0hlIS7lC1NEeRzcimBG8NFFF045C";

export default function ScloudPage() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  
  const [homeData, setHomeData] = useState<{
    trending: Song[];
    pop_indo: Song[];
    dangdut: Song[];
    malaysia: Song[];
    religi: Song[];
    acoustic: Song[];
    mix_hits: Song[];
    mix_dj: Song[];
    mix_indo: Song[];
    mix_malaysia: Song[];
  } | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{ title: string; songs: Song[] } | null>(null);

  const playSong = usePlayerStore(state => state.playSong);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch home data on mount
  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/scloud/home' : '/api/scloud/home')
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
      const res = await fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/scloud/home?refresh=true' : '/api/scloud/home?refresh=true');
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

  // Handle Search Input
  useEffect(() => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const targetUrl = encodeURIComponent(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${SC_CLIENT_ID}&limit=20`);
        const res = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/soundcloud?url=${targetUrl}` : `/api/soundcloud?url=${targetUrl}`);
        if (res.ok) {
          const data = await res.json();
          const mappedSongs: Song[] = data.collection
            .filter((t: any) => t.media && t.media.transcodings && t.media.transcodings.length > 0)
            .map((t: any) => {
              const transcoding = t.media.transcodings.find((x: any) => x.format.protocol === 'progressive') || t.media.transcodings[0];
              return {
                id: `sc_${t.id}`,
                title: t.title,
                artist: t.user?.username || "SoundCloud Artist",
                cover: t.artwork_url ? t.artwork_url.replace('large', 't500x500') : (t.user?.avatar_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300"),
                url: transcoding.url 
              };
            });
          setSearchResults(mappedSongs);
        }
      } catch (err) {
        console.error("SoundCloud search failed", err);
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
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      
      {/* Header & Search */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 px-6 pt-safe pb-4 transition-all duration-300">
        <header className="flex justify-between items-center mt-6">
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="text-orange-500 font-bold tracking-wider text-[10px] mb-1 uppercase"
            >
              Cloud Engine
            </motion.h2>
            <motion.h1 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
            >
              SoundCloud
            </motion.h1>
          </div>

          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingHome}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 transition-all"
          >
            <RotateCw size={18} className={`${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
          </motion.button>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-6 flex items-center gap-3 bg-white dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 transition-all duration-300 ${isFocused ? 'border-orange-500 ring-4 ring-orange-500/10 shadow-lg shadow-orange-500/5 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700/50 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'}`}
        >
          <SearchIcon size={20} className={`transition-colors duration-300 ${isFocused ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`} />
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Cari di SoundCloud..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 w-full"
          />
          <AnimatePresence>
            {query.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                onClick={clearSearch}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors rounded-full p-1.5 text-slate-600 dark:text-slate-300 flex-shrink-0"
              >
                <X size={14} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 px-6 pt-2 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {query === "" ? (
            <motion.div 
              key="default-view"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              {isLoadingHome ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                  <span className="ml-3 text-slate-500 font-medium text-sm">Menyiapkan cloud engine...</span>
                </div>
              ) : homeData && (
                <div className="flex flex-col gap-2">
                  
                  {/* Trending / DJ Remix */}
                  {homeData.trending && homeData.trending.length > 0 && (
                    <>
                      <SectionHeader title="DJ Remix Viral" onSeeAll={() => setActiveCategory({ title: "DJ Remix Viral", songs: homeData.trending })} />
                      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                        {homeData.trending.slice(0, 10).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="snap-start">
                            <SongCard song={song} onClick={() => handlePlaySong(song, homeData.trending)} />
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Pop Indo */}
                  {homeData.pop_indo && homeData.pop_indo.length > 0 && (
                    <div className="mt-2">
                      <SectionHeader title="Pop Indonesia Hits" onSeeAll={() => setActiveCategory({ title: "Pop Indonesia Hits", songs: homeData.pop_indo })} />
                      <div className="grid grid-cols-2 gap-4">
                        {homeData.pop_indo.slice(0, 4).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, homeData.pop_indo)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dangdut */}
                  {homeData.dangdut && homeData.dangdut.length > 0 && (
                    <div className="mt-8">
                      <SectionHeader title="Dangdut Koplo Terbaru" onSeeAll={() => setActiveCategory({ title: "Dangdut Koplo Terbaru", songs: homeData.dangdut })} />
                      <div className="flex flex-col gap-2">
                        {homeData.dangdut.slice(0, 5).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <ListSongCard song={song} onClick={() => handlePlaySong(song, homeData.dangdut)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Malaysia */}
                  {homeData.malaysia && homeData.malaysia.length > 0 && (
                    <div className="mt-8">
                      <SectionHeader title="Malaysia Populer" onSeeAll={() => setActiveCategory({ title: "Malaysia Populer", songs: homeData.malaysia })} />
                      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                        {homeData.malaysia.slice(0, 10).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="snap-start">
                            <SongCard song={song} onClick={() => handlePlaySong(song, homeData.malaysia)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Religi */}
                  {homeData.religi && homeData.religi.length > 0 && (
                    <div className="mt-4">
                      <SectionHeader title="Religi Penyejuk Hati" onSeeAll={() => setActiveCategory({ title: "Religi Penyejuk Hati", songs: homeData.religi })} />
                      <div className="flex flex-col gap-2">
                        {homeData.religi.slice(0, 5).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <ListSongCard song={song} onClick={() => handlePlaySong(song, homeData.religi)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acoustic */}
                  {homeData.acoustic && homeData.acoustic.length > 0 && (
                    <div className="mt-8 mb-4">
                      <SectionHeader title="Acoustic & Lofi Cover" onSeeAll={() => setActiveCategory({ title: "Acoustic & Lofi Cover", songs: homeData.acoustic })} />
                      <div className="grid grid-cols-2 gap-4">
                        {homeData.acoustic.slice(0, 4).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, homeData.acoustic)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kumpulan Hits 1 Jam */}
                  {homeData.mix_hits && homeData.mix_hits.length > 0 && (
                    <div className="mt-8">
                      <SectionHeader title="Kumpulan Lagu Hits 1 Jam+" onSeeAll={() => setActiveCategory({ title: "Kumpulan Lagu Hits 1 Jam+", songs: homeData.mix_hits })} />
                      <div className="flex flex-col gap-2">
                        {homeData.mix_hits.slice(0, 5).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <ListSongCard song={song} onClick={() => handlePlaySong(song, homeData.mix_hits)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DJ Remix 1 Jam */}
                  {homeData.mix_dj && homeData.mix_dj.length > 0 && (
                    <div className="mt-8">
                      <SectionHeader title="DJ Remix Full 1 Jam" onSeeAll={() => setActiveCategory({ title: "DJ Remix Full 1 Jam", songs: homeData.mix_dj })} />
                      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 pb-4">
                        {homeData.mix_dj.slice(0, 10).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="snap-start">
                            <SongCard song={song} onClick={() => handlePlaySong(song, homeData.mix_dj)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pop Indo 1 Jam */}
                  {homeData.mix_indo && homeData.mix_indo.length > 0 && (
                    <div className="mt-4">
                      <SectionHeader title="Pop Indonesia Full Album" onSeeAll={() => setActiveCategory({ title: "Pop Indonesia Full Album", songs: homeData.mix_indo })} />
                      <div className="flex flex-col gap-2">
                        {homeData.mix_indo.slice(0, 5).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <ListSongCard song={song} onClick={() => handlePlaySong(song, homeData.mix_indo)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Malaysia 1 Jam */}
                  {homeData.mix_malaysia && homeData.mix_malaysia.length > 0 && (
                    <div className="mt-8 mb-4">
                      <SectionHeader title="Lagu Malaysia Full Album" onSeeAll={() => setActiveCategory({ title: "Lagu Malaysia Full Album", songs: homeData.mix_malaysia })} />
                      <div className="grid grid-cols-2 gap-4">
                        {homeData.mix_malaysia.slice(0, 4).map((song, i) => (
                          <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                            <SongCard song={song} className="w-full" onClick={() => handlePlaySong(song, homeData.mix_malaysia)} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="search-view"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col gap-2 mt-4"
            >
              <div className="flex items-center justify-between mb-4 ml-1">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span>Hasil SoundCloud</span>
                </h3>
                <AnimatePresence>
                  {isSearching && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      <Loader2 size={12} className="animate-spin" />
                      Mencari...
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex flex-col gap-2">
                {isSearching && searchResults.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-2 rounded-xl animate-pulse">
                      <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                      </div>
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0"></div>
                    </div>
                  ))
                ) : searchResults.length > 0 ? (
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                    }}
                    className="flex flex-col"
                  >
                    {searchResults.map((song) => (
                      <motion.div
                        key={song.id}
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                      >
                        <ListSongCard song={song} onClick={() => playSong(song, searchResults)} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : !isSearching ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-16 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 shadow-inner">
                      <SearchIcon size={32} className="text-orange-500" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Tidak Ditemukan</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                      Maaf, kami tidak dapat menemukan lagu atau remix "{query}" di SoundCloud.
                    </p>
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
