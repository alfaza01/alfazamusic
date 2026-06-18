import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getSavedSongs } from '../../lib/db';

export function GlobalAudioPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    setProgress, 
    nextSong, 
    prevSong,
    seekRequest, 
    clearSeekRequest, 
    togglePlay,
    isLoadingAudio,
    setLoadingAudio,
    setAudioError
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [localUrl, setLocalUrl] = useState<string>('');

  // 1. Resolve Audio URL when currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setLocalUrl('');
      return;
    }

    const loadAndResolve = async () => {
      setLoadingAudio(true);
      setAudioError(null);

      try {
        // Case 1: Local / Imported / Downloaded Song in IndexedDB
        if (currentSong.id.startsWith('local_') || currentSong.url === 'local_blob' || currentSong.url?.startsWith('blob:')) {
          const savedSongs = await getSavedSongs();
          const matched = savedSongs.find(s => s.id === currentSong.id);
          if (matched && matched.blob) {
            const objectUrl = URL.createObjectURL(matched.blob);
            setLocalUrl(objectUrl);
          } else {
            setLocalUrl(currentSong.url || '');
          }
          return;
        }

        // Case 2: Online song - Client-side Invidious Rotation
        const cleanVideoId = currentSong.id.split('_')[0];
        
        // Coba server satu per satu (Anti-Error Rotation System)
        const instances = [
          "https://iv.melmac.space",
          "https://invidious.jing.rocks",
          "https://yewtu.be",
          "https://invidious.nerdvpn.de",
          "https://invidious.no-logs.com",
        ];

        let successUrl = '';

        for (const inst of instances) {
          try {
            // fetch directly from phone (bypasses CORS on Android via CapacitorHttp)
            const apiUrl = `${inst}/api/v1/videos/${cleanVideoId}`;
            const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
            
            if (res.ok) {
              const data = await res.json();
              const audios = (data.adaptiveFormats || []).filter((f: any) => f.type?.startsWith("audio/"));
              
              // Prioritize reliable itags (140 = m4a 128kbps, 251 = opus 160kbps)
              const best = audios.find((f: any) => f.itag === 140) || audios.find((f: any) => f.itag === 251) || audios[0];
              
              if (best?.url) {
                console.log("Berhasil memuat dari server:", inst);
                successUrl = best.url;
                break; // Stop loop if successful
              }
            }
          } catch (e) {
            console.warn(`Server ${inst} sibuk/gagal, mencoba server berikutnya...`);
          }
        }

        if (successUrl) {
          setLocalUrl(successUrl);
        } else {
          // If all instances fail
          throw new Error("Semua server streaming sedang sibuk.");
        }

        // Copy original YouTube URL to clipboard silently for convenience
        try {
          const ytUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;
          navigator.clipboard.writeText(ytUrl).catch(() => {});
        } catch(e) {}

      } catch (e: any) {
        console.error('Playback resolution failed:', e.message || e);
        setAudioError('Gagal memuat lagu. Server sedang sibuk.');
        setLoadingAudio(false);
      }
    };

    loadAndResolve();
  }, [currentSong]);

  // 2. Play/Pause control based on store state
  useEffect(() => {
    let active = true;
    if (audioRef.current && !isLoadingAudio && localUrl) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (!active) return;
            if (e.name === 'AbortError') return;
            if (e.name === 'NotAllowedError') {
              if (isPlaying) togglePlay();
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
    return () => { active = false; };
  }, [isPlaying, localUrl, isLoadingAudio]);

  // 3. Setup PWA Media Session API for Lock Screen & Notification widget controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: 'Music Alfaza',
        artwork: [
          { src: currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', sizes: '96x96', type: 'image/jpeg' },
          { src: currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    const handlers: { [key: string]: any } = {
      play: () => { if (!usePlayerStore.getState().isPlaying) togglePlay(); },
      pause: () => { if (usePlayerStore.getState().isPlaying) togglePlay(); },
      previoustrack: () => prevSong(),
      nexttrack: () => nextSong(),
      seekbackward: (details: any) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        }
      },
      seekforward: (details: any) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration || 0);
        }
      }
    };

    Object.keys(handlers).forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action as any, handlers[action]); } catch (e: any) {}
    });

    return () => {
      Object.keys(handlers).forEach((action) => {
        try { navigator.mediaSession.setActionHandler(action as any, null); } catch (e) {}
      });
    };
  }, [currentSong]);

  // 4. Seek request from UI Progress Bar
  useEffect(() => {
    if (seekRequest !== null && audioRef.current) {
      const targetTime = (audioRef.current.duration || 180) * seekRequest;
      if (isFinite(targetTime)) {
        audioRef.current.currentTime = targetTime;
      }
      clearSeekRequest();
    }
  }, [seekRequest, clearSeekRequest]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = isFinite(audioRef.current.duration) && audioRef.current.duration > 0 ? audioRef.current.duration : 180;
      setProgress(current / duration, current, duration);
      
      // Update Lock Screen progress
      if ('mediaSession' in navigator && isFinite(current) && isFinite(duration) && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1.0,
            position: current
          });
        } catch (e) {}
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setProgress(0, 0, audioRef.current.duration || 180);
      setLoadingAudio(false);
    }
  };

  if (!currentSong) return null;

  return (
    <>
      {localUrl && (
        <audio
          ref={audioRef}
          src={localUrl}
          autoPlay={isPlaying && !isLoadingAudio}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={() => setLoadingAudio(false)}
          onEnded={nextSong}
          onError={(e) => {
            if (audioRef.current?.error?.code === 1) return; // AbortError
            setAudioError("Pemutaran lagu gagal (Server terputus).");
            setLoadingAudio(false);
          }}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}
    </>
  );
}
