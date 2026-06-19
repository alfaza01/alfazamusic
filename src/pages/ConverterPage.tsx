import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { motion } from 'motion/react';
import { Copy, Check, ExternalLink, ShieldAlert, Sparkles, HelpCircle, Download } from 'lucide-react';

export default function ConverterPage() {
  const { currentSong } = usePlayerStore();
  const [copied, setCopied] = useState(false);

  // Derive video URL
  const isSc = currentSong?.id?.startsWith('sc_');
  const videoId = currentSong?.id ? currentSong.id.split('_')[0] : '';
  const youtubeUrl = !isSc && videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  const apiUrl = import.meta.env.VITE_API_URL || '';
  
  // The direct download URL
  let downloadUrl = '';
  if (currentSong) {
    if (isSc) {
      downloadUrl = `${currentSong.url}&client_id=iErh0hlIS7lC1NEeRzcimBG8NFFF045C`; 
    } else {
      downloadUrl = `${apiUrl}/api/download?id=${videoId}&title=${encodeURIComponent(currentSong.title)}`;
    }
  }

  const handleCopy = () => {
    if (youtubeUrl) {
      navigator.clipboard.writeText(youtubeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="p-5 space-y-5 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="text-primary dark:text-secondary animate-pulse" size={24} />
          Download Latar Belakang
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
          Simpan lagu ke MP3 murni. Proses download akan <strong>tetap berjalan meskipun aplikasi ditutup</strong>, sehingga Anda bisa terus mendengarkan musik!
        </p>
      </div>

      {/* Song Status Card */}
      {currentSong ? (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src={currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=150&auto=format&fit=crop'} 
              alt={currentSong.title}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200/30 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-primary dark:text-secondary uppercase tracking-widest block mb-0.5">Lagu yang Dipilih</span>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">{currentSong.title}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{currentSong.artist}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <a
              href={downloadUrl}
              download={currentSong.title + ".mp3"}
              className="w-full py-3.5 px-4 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              <Download size={18} />
              Download MP3 Sekarang
            </a>
            
            {!isSc && (
              <button
                onClick={handleCopy}
                className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Tautan Disalin!" : "Salin Tautan Original"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-200/50 dark:border-yellow-500/10 rounded-2xl flex items-start gap-3">
          <HelpCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Belum ada lagu yang dipilih</h3>
            <p className="text-[11px] text-yellow-700/80 dark:text-yellow-400/80 leading-relaxed font-semibold">
              Cari lagu favorit Anda, mainkan lagunya, lalu kembali ke sini untuk menyimpannya sebagai MP3 murni yang bisa diputar offline.
            </p>
          </div>
        </div>
      )}

      {/* Manual conversion instructions */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-4 rounded-2xl text-xs space-y-2 leading-relaxed font-semibold text-emerald-800 dark:text-emerald-400">
        <p className="flex items-center gap-1.5 font-extrabold text-emerald-900 dark:text-emerald-300">
          <Check size={16} className="text-emerald-500" />
          Proses Download Anti-Gagal!
        </p>
        <ul className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 font-medium">
          <li>Klik tombol <strong>Download MP3 Sekarang</strong> di atas.</li>
          <li>Proses pengunduhan akan dikelola oleh sistem bawaan HP Anda.</li>
          <li><strong>Anda boleh menutup aplikasi ini</strong>. Download akan tetap berjalan di latar belakang!</li>
          <li>Setelah selesai, buka menu <strong className="text-primary dark:text-secondary">Library &rarr; Impor Lagu Offline</strong> untuk memutarnya.</li>
        </ul>
      </div>

    </div>
  );
}
