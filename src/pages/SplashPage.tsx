import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Music } from "lucide-react";

export default function SplashPage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Navigate to home after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => navigate('/home'), 500); // give time for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-bg-dark to-slate-800 text-white"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* Logo */}
            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-primary to-secondary p-1 mb-6 shadow-2xl shadow-primary/30">
              <div className="w-full h-full rounded-[28px] bg-bg-dark flex items-center justify-center">
                <Music size={48} className="text-white drop-shadow-md" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              <span className="text-white">Alfaza</span>{" "}
              <span className="text-secondary">Music</span>
            </h1>
            
            <p className="text-slate-400 font-medium tracking-widest text-sm uppercase">
              Music Everywhere
            </p>
          </motion.div>

          {/* Slogan at bottom */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-12 flex space-x-2 text-sm text-slate-400/80 font-medium"
          >
            <span>Simple.</span>
            <span className="w-1 h-1 rounded-full bg-secondary/50 self-center"></span>
            <span>Modern.</span>
            <span className="w-1 h-1 rounded-full bg-secondary/50 self-center"></span>
            <span>Unlimited.</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
