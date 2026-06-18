import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mt-8 mb-4 px-1">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
      {onSeeAll && (
        <button 
          onClick={onSeeAll}
          className="text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors flex items-center gap-0.5"
        >
          Lihat Semua
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
