import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Library, User, Sparkles, Cloud, Globe } from "lucide-react";
import { cn } from "../../lib/utils";
import { FullPlayer } from "../player/FullPlayer";
import { MiniPlayer } from "../player/MiniPlayer";
import { GlobalAudioPlayer } from "../player/GlobalAudioPlayer";
import { SongContextMenu } from "../ui/SongContextMenu";
import { SongDetailModal } from "../ui/SongDetailModal";
import { SongConverterModal } from "../ui/SongConverterModal";
import { IframeWarning } from "../ui/IframeWarning";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/scloud", icon: Cloud, label: "Scloud" },
    { path: "/library", icon: Globe, label: "YT Music" },
    { path: "/converter", icon: Sparkles, label: "Converter" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="flex justify-center min-h-screen bg-black w-full overflow-hidden">
      {/* Mobile-first container constraint */}
      <div className="w-full max-w-md bg-bg-light dark:bg-bg-dark h-[100dvh] relative shadow-2xl flex flex-col">
        <IframeWarning />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <Outlet />
        </main>

        {/* Global Mini Player */}
        <MiniPlayer />
        
        {/* Bottom Navigation */}
        <nav className="absolute z-40 bottom-0 w-full glass dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 pb-4">
          <div className="flex justify-between items-center">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-xl transition-all duration-300",
                    isActive 
                      ? "text-primary dark:text-primary drop-shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  <span className={cn(
                    "text-[10px] mt-1 font-bold transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-0 h-0"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Global Full Player Modal overlay */}
        <FullPlayer />
        
        {/* Global Modals/Menus */}
        <SongContextMenu />
        <SongDetailModal />
        <SongConverterModal />

        <GlobalAudioPlayer />
        


      </div>
    </div>
  );
}
