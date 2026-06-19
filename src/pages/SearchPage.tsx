import { Search as SearchIcon, History, TrendingUp, X, Loader2, Music, Mic2, Radio, Disc3, Flame, Music2, CloudLightning } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ListSongCard } from "../components/ui/ListSongCard";
import { Song } from "../types";
import { usePlayerStore } from "../store/usePlayerStore";

const SC_CLIENT_ID = "iErh0hlIS7lC1NEeRzcimBG8NFFF045C";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const playSong = usePlayerStore(state => state.playSong);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${SC_CLIENT_ID}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          // Map SoundCloud API response to our Song interface
          const mappedSongs: Song[] = data.collection
            .filter((t: any) => t.media && t.media.transcodings && t.media.transcodings.length > 0)
            .map((t: any) => {
              // Get progressive mp3 stream if available, else fallback
              const transcoding = t.media.transcodings.find((x: any) => x.format.protocol === 'progressive') || t.media.transcodings[0];
              
              return {
                id: `sc_${t.id}`,
                title: t.title,
                artist: t.user?.username || "SoundCloud Artist",
                // Get highest quality artwork
                cover: t.artwork_url ? t.artwork_url.replace('large', 't500x500') : (t.user?.avatar_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300"),
                url: transcoding.url // We store the API URL here to resolve the actual MP3 later
              };
            });
          setSearchResults(mappedSongs);
        }
      } catch (err) {
        console.error("SoundCloud search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const genres = [
    { name: "DJ Remix", icon: Disc3, color: "from-orange-500 via-red-500 to-rose-600", shadow: "shadow-orange-500/20" },
    { name: "Acoustic Cover", icon: Music2, color: "from-blue-400 via-indigo-500 to-purple-600", shadow: "shadow-blue-500/20" },
    { name: "Lofi Beats", icon: Music, color: "from-pink-400 via-fuchsia-500 to-purple-600", shadow: "shadow-pink-500/20" },
    { name: "Sholawat", icon: Mic2, color: "from-emerald-400 via-teal-500 to-cyan-600", shadow: "shadow-emerald-500/20" },
    { name: "Podcast Indo", icon: Radio, color: "from-amber-400 via-orange-500 to-red-500", shadow: "shadow-amber-500/20" },
    { name: "EDM", icon: CloudLightning, color: "from-slate-700 via-slate-800 to-slate-900", shadow: "shadow-slate-500/20" }
  ];

  const history = ["Alan Walker", "Dj Tiktok Viral", "Mahalini Cover", "Lagu Galau", "Ncs Release", "Lofi Girl"];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      
      {/* Search Header - Glassmorphism */}
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-[#0f172a]/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/5 px-6 pt-safe pb-4 transition-all duration-300">
        
        <div className="mt-6 flex flex-col gap-5">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500"
          >
            SoundCloud
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`flex items-center gap-3 bg-white dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 transition-all duration-300 ${isFocused ? 'border-orange-500 ring-4 ring-orange-500/10 shadow-lg shadow-orange-500/5 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700/50 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            <SearchIcon size={20} className={`transition-colors duration-300 ${isFocused ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'}`} />
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Cari lagu, remix, atau artis SoundCloud..."
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
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 pt-6 pb-32 overflow-y-auto w-full">
        
        <AnimatePresence mode="wait">
          {query === "" ? (
            <motion.div 
              key="default-view"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              
              {/* History Category */}
              <div>
                <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History size={16} /> Pencarian Populer SC
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {history.map((item, idx) => (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={item} 
                      onClick={() => setQuery(item)} 
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl text-[13px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm hover:shadow hover:border-orange-500/30 hover:text-orange-500 dark:hover:text-orange-500 transition-all"
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Trending Searches Grid */}
              <div>
                <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={16} /> Genre Eksklusif SC
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  {genres.map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      key={item.name} 
                      onClick={() => setQuery(item.name)}
                      className={`h-28 rounded-2xl bg-gradient-to-br ${item.color} ${item.shadow} shadow-lg p-4 relative overflow-hidden cursor-pointer group`}
                    >
                      <span className="text-white font-bold tracking-wide text-sm z-10 relative drop-shadow-md">{item.name}</span>
                      
                      <div className="absolute right-3 bottom-3 text-white/30 group-hover:text-white/50 transition-colors z-10">
                        <item.icon size={36} strokeWidth={1.5} className="transform -rotate-12 group-hover:rotate-0 transition-transform duration-300" />
                      </div>

                      {/* Decorative abstract shapes */}
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors"></div>
                      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-black/10 rounded-full blur-xl"></div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div 
              key="search-view"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col gap-2"
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
              
              {/* Results Container */}
              <div className="flex flex-col gap-2">
                {isSearching && searchResults.length === 0 ? (
                  // Skeleton Loading
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
