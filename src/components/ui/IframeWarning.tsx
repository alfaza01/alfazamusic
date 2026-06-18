import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function IframeWarning() {
  const [isInIframe, setIsInIframe] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.self !== window.top) {
        setIsInIframe(true);
      }
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  if (!isInIframe || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-2 left-2 right-2 z-[999] bg-blue-600/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl flex items-start gap-3 border border-white/20"
      >
        <div className="bg-white/20 p-2 rounded-full shrink-0 mt-0.5">
          <Smartphone size={18} />
        </div>
        <div className="flex-1 pr-6">
          <h4 className="font-bold text-sm leading-tight mb-1">
            Mode Background Mati
          </h4>
          <p className="text-[11px] text-blue-50 leading-relaxed font-medium">
            Musik akan otomatis berhenti jika Anda menggunakan aplikasi dari dalam bingkai (iframe) ini saat HP layar mati / diminimize. <br />
            <strong>Solusi: Buka di Tab Baru agar musik bisa terus berjalan!</strong>
          </p>
          <div className="mt-2.5">
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm"
              onClick={() => setDismissed(true)}
            >
              <ExternalLink size={12} />
              Buka di Layar Penuh
            </a>
          </div>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
