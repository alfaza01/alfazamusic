import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getSavedSongs } from '../../lib/db';
import { YouTubeIframeAudioPlayer } from './YouTubeIframeAudioPlayer';

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
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);

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
          setIsLocalMode(true);
          const savedSongs = await getSavedSongs();
          const matched = savedSongs.find(s => s.id === currentSong.id);
          if (matched && matched.blob) {
            const objectUrl = URL.createObjectURL(matched.blob);
            setLocalUrl(objectUrl);
          } else {
            setLocalUrl(currentSong.url || '');
          }
        } else {
          // Case 2: Online song using the robust YouTube iframe wrapper!
          // Setting mode to external lets the YouTubeIframeAudioPlayer take over.
          setIsLocalMode(false);
          setLocalUrl('');
          
          // Still auto copy to clipboard as convenience for user
          try {
            const vidId = currentSong.id.split('_')[0];
            const ytUrl = `https://www.youtube.com/watch?v=${vidId}`;
            navigator.clipboard.writeText(ytUrl).catch(() => {});
          } catch(e) {}
        }
      } catch (e: any) {
        console.warn('Playback resolution failed:', e.message || e);
        setAudioError('Gagal memuat track.');
        setLoadingAudio(false);
      }
    };

    loadAndResolve();
  }, [currentSong]);

  // 2. Play/Pause control based on store state (Local Audio Element Only)
  useEffect(() => {
    if (!isLocalMode) return;
    
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
  }, [isPlaying, localUrl, isLoadingAudio, isLocalMode]);

  // 3. Setup PWA Media Session API for Lock Screen & Notification widget controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: 'Pemutar Musik Pribadi',
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
        if (isLocalMode && audioRef.current) {
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        } else {
          // Send backward seek to store to be handled by YouTube iframe
          const state = usePlayerStore.getState();
          const target = Math.max(0, state.currentTimeSec - (details.seekOffset || 10));
          usePlayerStore.getState().requestSeek(target / Math.max(1, state.totalDurationSec));
        }
      },
      seekforward: (details: any) => {
        if (isLocalMode && audioRef.current) {
          const offset = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration || 0);
        } else {
          // Send forward seek to store
          const state = usePlayerStore.getState();
          const target = Math.min(state.totalDurationSec, state.currentTimeSec + (details.seekOffset || 10));
          usePlayerStore.getState().requestSeek(target / Math.max(1, state.totalDurationSec));
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
  }, [currentSong, isLocalMode]);

  // 4. Seek request from UI Progress Bar (Local Audio Element Only)
  useEffect(() => {
    if (isLocalMode && seekRequest !== null && audioRef.current) {
      const targetTime = (audioRef.current.duration || 180) * seekRequest;
      if (isFinite(targetTime)) {
        audioRef.current.currentTime = targetTime;
      }
      clearSeekRequest();
    }
  }, [seekRequest, isLocalMode, clearSeekRequest]);

  const handleTimeUpdate = () => {
    if (audioRef.current && isLocalMode) {
      const current = audioRef.current.currentTime;
      const duration = isFinite(audioRef.current.duration) && audioRef.current.duration > 0 ? audioRef.current.duration : 180;
      setProgress(current / duration, current, duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isLocalMode) {
      setProgress(0, 0, audioRef.current.duration || 180);
      setLoadingAudio(false);
    }
  };

  if (!currentSong) return null;

  return (
    <>
      {isLocalMode && localUrl && (
        <audio
          ref={audioRef}
          src={localUrl}
          autoPlay={isPlaying && !isLoadingAudio}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={() => setLoadingAudio(false)}
          onEnded={nextSong}
          onError={(e) => {
            if (audioRef.current?.error?.code === 1) return;
            setAudioError("Pemutaran lagu lokal gagal.");
            setLoadingAudio(false);
          }}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}
      
      {!isLocalMode && currentSong.id && (
        <YouTubeIframeAudioPlayer videoId={currentSong.id.split('_')[0]} />
      )}
    </>
  );
}
