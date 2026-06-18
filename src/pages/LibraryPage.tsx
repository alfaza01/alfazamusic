import React, { useRef, useState, useEffect } from "react";
import { Plus, FolderHeart, Music2, Folder, Upload, Trash2, ArrowDownToLine, Loader2, Play, Info, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { curatedPlaylists, trendingSongs } from "../data/mock";
import { ListSongCard } from "../components/ui/ListSongCard";
import { usePlayerStore } from "../store/usePlayerStore";
import { getSavedSongs, saveSong, deleteSavedSong, LocalSongRecord } from "../lib/db";
import { Song } from "../types";

export default function LibraryPage() {
  const playSong = usePlayerStore((state) => state.playSong);

  // Available library tabs
  const [activeTab, setActiveTab] = useState<'standard' | 'lokal'>('standard');
  
  // Local/Downloaded songs state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localSongs, setLocalSongs] = useState<LocalSongRecord[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [localFilter, setLocalFilter] = useState<'all' | 'imported' | 'downloaded'>('all');

  const fetchLocalSongs = async () => {
    setLoadingLocal(true);
    try {
      const saved = await getSavedSongs();
      setLocalSongs(saved);
    } catch (e) {
      console.error("Gagal mengambil data offline:", e);
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchLocalSongs();
  }, [activeTab]);

  // Handle local MP3/M4A file import
  const handleImportLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Handle basic format validation
        const splitExt = file.name.split('.');
        const ext = splitExt[splitExt.length - 1].toLowerCase();
        if (!['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) {
          alert(`Format .${ext} tidak didukung. Harap pilih file audio MP3/M4A.`);
          continue;
        }

        // Clean name to separate "Artist - Title" or default
        let artist = "Artis Lokal";
        let title = file.name.substring(0, file.name.lastIndexOf('.'));
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          artist = parts[0].trim();
          title = parts[1].trim();
        }

        const fallbackCover = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop";

        const tempSongMetadata: Song = {
          id: `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          title,
          artist,
          cover: fallbackCover,
          duration: "Lokal",
          durationSec: 180, // generic estimated duration
          url: "", // will be fetched from IndexedDB blob at play time
          badge: "📂 HP"
        };

        await saveSong(tempSongMetadata, file, true);
      }
      await fetchLocalSongs();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat mengimpor audio.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteLocalSong = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Hapus file musik ini dari memori aplikasi?")) {
      await deleteSavedSong(id);
      await fetchLocalSongs();
    }
  };

  // Convert offline list to play queue
  const playLocalGroup = (startSong: Song) => {
    const queueList: Song[] = filteredLocalSongs.map((ls) => ({
      id: ls.id,
      title: ls.title,
      artist: ls.artist,
      cover: ls.cover,
      duration: ls.duration,
      durationSec: ls.durationSec,
      url: ls.url || "local_blob",
      badge: ls.isLocalImport ? "📂 HP" : "⬇️ Unduh"
    }));
    const actualStart = queueList.find(q => q.id === startSong.id) || queueList[0];
    playSong(actualStart, queueList);
  };

  // Filter lists based on categories
  const filteredLocalSongs = localSongs.filter((song) => {
    if (localFilter === 'imported') return song.isLocalImport;
    if (localFilter === 'downloaded') return !song.isLocalImport;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col p-6 pb-24">
      
      {/* Header */}
      <header className="pt-6 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-primary dark:text-secondary font-bold tracking-wider text-[10px] mb-1 uppercase">Ruang Musik</h2>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Koleksi Musik</h1>
        </div>
        <button 
          onClick={() => activeTab === 'lokal' ? fileInputRef.current?.click() : alert("Gunakan Tambah di Playlist!")}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-sm"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Hidden native picker to import files from phone folder */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportLocalFile} 
        accept="audio/*"
        multiple
        className="hidden" 
      />

      {/* Primary Navigation Tabs */}
      <div className="flex gap-2 py-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button 
          onClick={() => setActiveTab('standard')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'standard' 
              ? 'bg-primary text-white shadow-sm' 
              : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Music2 size={15} /> Playlists & Online
        </button>
        <button 
          onClick={() => setActiveTab('lokal')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
            activeTab === 'lokal' 
              ? 'bg-primary text-white shadow-sm' 
              : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Folder size={15} /> Folder HP & Unduhan
          {localSongs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-secondary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              {localSongs.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'standard' ? (
          /* Standard View: Playlists and Recommended */
          <motion.div
            key="standard-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FolderHeart size={16} className="text-secondary" /> Playlist Favorit
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Liked Songs Special Card */}
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md transition">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Music2 className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold tracking-wide">Lagu Disukai</h4>
                  <p className="text-white/70 text-[10px] font-medium mt-0.5">142 Lagu</p>
                </div>
              </div>

              {/* Curated Playlist List */}
              {curatedPlaylists.slice(0, 3).map((pl, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  key={pl.id} 
                  className="aspect-square rounded-2xl relative overflow-hidden group border border-slate-200 dark:border-white/5 cursor-pointer"
                >
                  <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                    <div>
                      <h4 className="text-white font-bold leading-tight text-sm">{pl.title}</h4>
                      <p className="text-white/70 text-[10px] font-medium mt-0.5">{pl.songCount} Lagu</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recently Added List */}
            <div className="mt-2 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Rekomendasi Lainnya</h3>
              <div className="flex flex-col gap-2">
                {trendingSongs.slice(0, 4).map((song) => (
                  <ListSongCard key={song.id} song={song} onClick={() => playSong(song, trendingSongs)} />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Offline/Local Storage View */
          <motion.div
            key="local-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Folder Header Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-3xl p-5 mb-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-slate-900 dark:text-white text-md flex items-center justify-center sm:justify-start gap-2">
                  <Folder size={18} className="text-primary" /> Pengelola Lagu Offline
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Simpan file audio MP3 dari memori HP Anda atau download pratinjau. Semua dimainkan secara luring (tanpa internet).
                </p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                {importing ? "Sabar, Mengimpor..." : "Pilih File MP3 HP"}
              </button>
            </div>

            {/* Sub-Filters / Columns */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {[
                  { key: 'all', label: 'Semua Koleksi' },
                  { key: 'imported', label: 'Impor HP' },
                  { key: 'downloaded', label: 'Unduhan' }
                ].map((col) => (
                  <button 
                    key={col.key}
                    onClick={() => setLocalFilter(col.key as any)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                      localFilter === col.key 
                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-mono font-medium text-slate-400">
                Total: {filteredLocalSongs.length} Lagu
              </span>
            </div>

            {/* Offline Song Lists */}
            {loadingLocal ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary mb-3" size={32} />
                <p className="text-xs text-slate-400">Memuat basis data luring...</p>
              </div>
            ) : filteredLocalSongs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Folder size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak ada lagu ditemukan</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                  {localFilter === 'all' 
                    ? "Koleksi luring kosong. Klik tombol di atas untuk mengimpor berkas MP3 dari disk lokal perangkat Anda."
                    : localFilter === 'imported'
                    ? "Belum ada file musik yang diimpor dari memori HP."
                    : "Belum ada lagu yang dionunduh dari pemutar musik."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredLocalSongs.map((ls) => {
                  const songObj: Song = {
                    id: ls.id,
                    title: ls.title,
                    artist: ls.artist,
                    cover: ls.cover,
                    duration: ls.duration,
                    durationSec: ls.durationSec,
                    url: "local_blob",
                    badge: ls.isLocalImport ? "📂 HP" : "⬇️ Unduh"
                  };
                  return (
                    <div 
                      key={ls.id}
                      onClick={() => playLocalGroup(songObj)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                    >
                      {/* Album Cover */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img 
                          src={ls.cover} 
                          alt={ls.title} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Song Title & Artist */}
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-snug">
                          {ls.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md uppercase">
                            {ls.isLocalImport ? '📂 Lokal HP' : '⬇️ Unduhan'}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
                            {ls.artist}
                          </span>
                        </div>
                      </div>

                      {/* Delete Trigger */}
                      <button 
                        onClick={(e) => handleDeleteLocalSong(ls.id, e)}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="Hapus lagu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
