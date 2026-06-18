import { Play, Heart, Loader2 } from "lucide-react";
import { Song } from "../../types";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { usePlayerStore } from "../../store/usePlayerStore";

interface SongCardProps {
  song: Song;
  className?: string;
  onClick?: () => void;
}

export function SongCard({ song, className, onClick }: SongCardProps) {
  const { currentSong, isLoadingAudio } = usePlayerStore();
  const isSelected = currentSong?.id === song.id;

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col w-[140px] flex-shrink-0 cursor-pointer snap-start transition-all",
        isSelected && "opacity-95",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-square rounded-[20px] overflow-hidden mb-3 shadow-md">
        <img
          src={song.cover}
          alt={song.title}
          className={cn(
            "object-cover w-full h-full transition-all duration-500",
            !(isSelected && isLoadingAudio) && "group-hover:scale-110",
            isSelected && isLoadingAudio && "brightness-50 blur-[1px]"
          )}
        />
        
        {/* Soft Shadow / Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button Overlay or Spinner */}
        {isSelected && isLoadingAudio ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <div className="w-10 h-10 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-lg">
              <Loader2 size={18} className="animate-spin text-white" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <Play size={20} fill="currentColor" className="ml-1" />
            </div>
          </div>
        )}

        {/* Badge */}
        {song.badge && (
          <div className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md text-white rounded-lg">
            {song.badge}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex justify-between items-start w-full px-1">
        <div className="flex-1 overflow-hidden">
          <h3 className={cn(
            "text-sm font-semibold truncate w-full transition-colors",
            isSelected ? "text-primary" : "text-slate-800 dark:text-slate-100"
          )}>
            {song.title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full mt-0.5 font-medium">
            {isSelected && isLoadingAudio ? "Memuat stream..." : song.artist}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
