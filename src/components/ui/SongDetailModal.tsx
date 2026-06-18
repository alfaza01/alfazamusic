import { X, Calendar, Clock, Disc3, Mic2, Tag } from "lucide-react";
import { useMenuStore } from "../../store/useMenuStore";
import { motion, AnimatePresence } from "motion/react";

export function SongDetailModal() {
  const { detailModalSong, closeDetail } = useMenuStore();

  return (
    <AnimatePresence>
      {detailModalSong && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDetail}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-bg-dark rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
          >
            {/* Header Image Extends */}
            <div className="relative h-48 sm:h-56 w-full shrink-0">
              <img src={detailModalSong.cover} alt="Background" className="w-full h-full object-cover blur-xl opacity-50 scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-bg-dark to-transparent"></div>
              
              <button onClick={closeDetail} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
                <X size={20} />
              </button>

              <div className="absolute -bottom-8 left-6">
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-bg-dark">
                  <img src={detailModalSong.cover} alt="Cover" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Scrollable Context */}
            <div className="px-6 pt-12 pb-6 overflow-y-auto no-scrollbar">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-1">
                {detailModalSong.title}
              </h2>
              <p className="text-primary font-bold text-sm tracking-wide mb-6">
                {detailModalSong.artist}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoChip icon={Disc3} label="Album" value="The Best Collection" />
                <InfoChip icon={Tag} label="Genre" value="Pop / Electronic" />
                <InfoChip icon={Calendar} label="Rilis" value="12 Oktober 2023" />
                <InfoChip icon={Clock} label="Durasi" value={detailModalSong.duration} />
              </div>

              <div>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
                  <Mic2 size={16} className="text-secondary" />
                  Deskripsi Singkat
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {detailModalSong.title} adalah lagu mahakarya oleh {detailModalSong.artist} yang dirilis dengan nuansa modern dan instrumen yang mendalam. Cocok untuk menemani perjalanan jauh dan saat-saat santai.
                </p>
              </div>

            </div>

            {/* Fixed Action Button */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0">
              <button 
                onClick={closeDetail}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-full font-bold shadow-lg shadow-primary/30 transition-transform active:scale-95"
              >
                Kembali
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
        <Icon size={14} />
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{value}</p>
    </div>
  );
}
