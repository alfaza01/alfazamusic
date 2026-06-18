import { X, PlayCircle, FolderPlus, Info, Share2, Heart, Download, Loader2, Sparkles } from "lucide-react";
import { useMenuStore } from "../../store/useMenuStore";
import { motion, AnimatePresence } from "motion/react";
import { downloadSongAsMp3 } from "../../lib/downloader";
import { useState } from "react";

export function SongContextMenu() {
  const { activeSongMenu, closeMenu, openDetail, openConverter } = useMenuStore();
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'completed' | 'failed'>('idle');

  const handleDownload = async () => {
    if (!activeSongMenu) return;
    try {
      await downloadSongAsMp3(activeSongMenu, (status) => {
        setDownloadStatus(status);
        if (status === 'completed' || status === 'failed') {
          setTimeout(() => {
            setDownloadStatus('idle');
            closeMenu();
          }, 1500);
        }
      });
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh berkas lagu.");
    }
  };

  return (
    <AnimatePresence>
      {activeSongMenu && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Menu Drawer */}
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white dark:bg-bg-dark rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl p-6 pb-safe border-t border-slate-200 dark:border-white/10"
          >
            {/* Header info */}
            <div className="flex items-center gap-4 mb-6 relative">
              <img src={activeSongMenu.cover} alt="Cover" className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{activeSongMenu.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{activeSongMenu.artist}</p>
              </div>
              <button onClick={closeMenu} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 absolute top-0 right-0">
                <X size={18} />
              </button>
            </div>

            <div className="w-full h-px bg-slate-200 dark:bg-white/10 mb-4"></div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              {activeSongMenu.url && !activeSongMenu.id.startsWith('local_') && (
                <MenuOption 
                  icon={downloadStatus === 'loading' ? Loader2 : Download} 
                  iconClassName={downloadStatus === 'loading' ? 'animate-spin text-primary' : downloadStatus === 'completed' ? 'text-green-500' : ''}
                  label={
                    downloadStatus === 'loading' ? "Mengunduh..." : 
                    downloadStatus === 'completed' ? "Unduhan Selesai!" : 
                    downloadStatus === 'failed' ? "Unduhan Gagal" : 
                    "Unduh MP3 ke HP"
                  } 
                  onClick={handleDownload} 
                />
              )}
              {activeSongMenu && !activeSongMenu.id.startsWith('local_') && (
                <MenuOption 
                  icon={Sparkles} 
                  iconClassName="text-amber-500 animate-pulse"
                  label="Premium Converter (t-fest & Vevioz)" 
                  onClick={() => openConverter(activeSongMenu)} 
                />
              )}
              <MenuOption icon={PlayCircle} label="Putar Selanjutnya" onClick={() => { closeMenu(); }} />
              <MenuOption icon={FolderPlus} label="Tambahkan ke Playlist" onClick={() => { closeMenu(); }} />
              <MenuOption icon={Heart} label="Simpan ke Favorit" iconClassName={activeSongMenu.isFavorite ? "text-secondary fill-secondary" : ""} onClick={() => { closeMenu(); }} />
              <MenuOption icon={Info} label="Detail Lagu" onClick={() => { openDetail(activeSongMenu); }} />
              <MenuOption icon={Share2} label="Bagikan Lagu" onClick={() => { closeMenu(); }} />
            </div>
            
            {/* Safe bottom spacing for mobile */}
            <div className="h-4"></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MenuOption({ icon: Icon, label, onClick, iconClassName }: { icon: any, label: string, onClick: () => void, iconClassName?: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
    >
      <Icon size={20} className={iconClassName || "text-slate-600 dark:text-slate-400"} />
      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label}</span>
    </button>
  );
}
