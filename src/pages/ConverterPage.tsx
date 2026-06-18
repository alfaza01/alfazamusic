import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { motion } from 'motion/react';
import { Copy, Check, ExternalLink, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

export default function ConverterPage() {
  const { currentSong } = usePlayerStore();
  const [iframeLoading, setIframeLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Derive video URL
  const videoId = currentSong?.id ? currentSong.id.split('_')[0] : '';
  const youtubeUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  // Auto-copy the link once the page page matches a song
  useEffect(() => {
    if (youtubeUrl) {
      navigator.clipboard.writeText(youtubeUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {});
    }
  }, [youtubeUrl]);

  const handleCopy = () => {
    if (youtubeUrl) {
      navigator.clipboard.writeText(youtubeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenTfest = () => {
    if (youtubeUrl) {
      navigator.clipboard.writeText(youtubeUrl).catch(() => {});
    }
    window.open("https://t-fest.pl/", "_blank");
  };

  return (
    <div className="p-5 space-y-5 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="text-primary dark:text-secondary animate-pulse" size={24} />
          Ubah Musik MP3 murni
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
          Ubah video YouTube jadi MP3 murni (No Video), hemat kuota, dan putar offline di latar belakang!
        </p>
      </div>

      {/* Song Status Card */}
      {currentSong ? (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm space-y-3.5">
          <div className="flex items-center gap-3">
            <img 
              src={currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=150&auto=format&fit=crop'} 
              alt={currentSong.title}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200/30 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-primary dark:text-secondary uppercase tracking-widest block mb-0.5">Lagu yang Dipilih</span>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">{currentSong.title}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{currentSong.artist}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 px-3 bg-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 hover:opacity-90 active:scale-95 transition-all"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Berhasil Disalin!" : "Salin Ulang Tautan"}
            </button>
            <button
              onClick={handleOpenTfest}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <ExternalLink size={14} />
              Buka di Tab Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-200/50 dark:border-yellow-500/10 rounded-2xl flex items-start gap-3">
          <HelpCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Belum ada lagu yang dipilih</h3>
            <p className="text-[11px] text-yellow-700/80 dark:text-yellow-400/80 leading-relaxed font-semibold">
              Cari lagu favorit Anda di menu <strong>Search</strong>, mainkan lagunya, lalu kembali ke sini untuk mengonversi ke MP3 murni.
            </p>
          </div>
        </div>
      )}

      {/* Manual conversion instructions */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-3.5 rounded-2xl text-xs space-y-1.5 leading-relaxed font-semibold text-emerald-800 dark:text-emerald-400">
        <p className="flex items-center gap-1.5 font-extrabold text-emerald-900 dark:text-emerald-300">
          <Check size={16} className="text-emerald-500" />
          Tautan YouTube otomatis disalin!
        </p>
        <ul className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 font-medium">
          <li>Tahan kolom input di situs converter di bawah lalu pilih <strong className="text-emerald-600 dark:text-emerald-400">Tempel / Paste</strong>.</li>
          <li>Klik tombol konversi di situs, dan simpan/download file MP3-nya.</li>
          <li>Putar offline murni lewat menu <strong className="text-primary dark:text-secondary">Library &rarr; Impor Lagu Offline</strong>.</li>
        </ul>
      </div>

      {/* The Embed IFrame */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-400">
          <span>Situs Konverter Uptime Tinggi</span>
          <span className="text-emerald-500 flex items-center gap-1">🟢 Online & Aktif</span>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/5 h-[420px] relative flex flex-col shadow-inner">
          {iframeLoading && (
            <div className="absolute inset-0 z-20 bg-slate-100 dark:bg-slate-950 flex items-center justify-center flex-col gap-2">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">MENGHUBUNGKAN KE t-fest.pl...</span>
            </div>
          )}
          <iframe 
            src="https://t-fest.pl/"
            className="relative z-10 w-full h-[415px]" 
            style={{ border: 'none' }}
            onLoad={() => setIframeLoading(false)}
            id="converter-iframe"
          />
        </div>

        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-semibold leading-relaxed px-2">
          Note: Beberapa situs memiliki iklan bawaan (pop-up). Jika situs tidak merespon, cukup klik tombol <strong>Buka di Tab Baru</strong> di atas untuk memproses konversi dengan lancar.
        </p>
      </div>
    </div>
  );
}
