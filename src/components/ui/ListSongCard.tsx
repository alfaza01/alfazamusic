import { Play, MoreVertical, Heart, Loader2 } from "lucide-react";
import { Song } from "../../types";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { useMenuStore } from "../../store/useMenuStore";
import { usePlayerStore } from "../../store/usePlayerStore";

interface ListSongCardProps {
  song: Song;
  index?: number;
  className?: string;
  onClick?: () => void;
}

export function ListSongCard({ song, index, className, onClick }: ListSongCardProps) {
  const openMenu = useMenuStore((state) => state.openMenu);
  const { currentSong, isLoadingAudio } = usePlayerStore();
  const isSelected = currentSong?.id === song.id;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-2 rounded-[20px] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group",
        isSelected && "bg-slate-100/50 dark:bg-white/5",
        className
      )}
    >
      {/* Index (Optional) */}
      {index !== undefined && (
        <span className={cn(
          "w-4 text-center text-xs font-bold transition-colors",
          isSelected ? "text-primary" : "text-slate-400 group-hover:text-primary"
        )}>
          {index + 1}
        </span>
      )}

      {/* Cover */}
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
        <img
          src={song.cover}
          alt={song.title}
          className={cn(
            "object-cover w-full h-full transition-all duration-300",
            isSelected && isLoadingAudio && "brightness-50 blur-[1px]"
          )}
        />
        {isSelected && isLoadingAudio ? (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-white" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={20} fill="currentColor" className="text-white ml-0.5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-hidden flex flex-col justify-center">
        <h3 className={cn(
          "text-sm font-semibold truncate leading-tight mb-0.5",
          isSelected ? "text-primary font-bold" : "text-slate-800 dark:text-slate-100"
        )}>
          {song.title}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium flex items-center gap-1">
          {isSelected && isLoadingAudio && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
          <span>{isSelected && isLoadingAudio ? "Menghubungkan stream..." : song.artist}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pr-2">
        {song.isFavorite ? (
          <Heart size={18} className="text-secondary fill-secondary" />
        ) : (
          <Heart size={18} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            openMenu(song);
          }}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </motion.div>
  );
}
