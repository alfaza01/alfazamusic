import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
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
  const playerRef = useRef<ReactPlayer>(null);
  
  const [localAudioUrl, setLocalAudioUrl] = useState<string>('');
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [ytVideoId, setYtVideoId] = useState<string>('');

  // ─── 1. Determine Local vs YouTube ───────────────────────────────
  useEffect(() => {
    if (!currentSong) {
      setLocalAudioUrl('');
      setYtVideoId('');
      return;
    }

    setLoadingAudio(true);
    setAudioError(null);

    const checkSongSource = async () => {
      // Case A: Local / downloaded MP3 stored in IndexedDB or direct Saavn stream
      if (
        currentSong.id.startsWith('local_') ||
        currentSong.id.startsWith('saavn_') ||
        currentSong.id.startsWith('ytm_') ||
        currentSong.url === 'local_blob' ||
        currentSong.url?.startsWith('blob:')
      ) {
        setIsLocal(true);
        try {
          if (currentSong.id.startsWith('saavn_')) {
            setLocalAudioUrl(currentSong.url || '');
            return;
          }

          if (currentSong.id.startsWith('ytm_')) {
            const cleanVideoId = currentSong.id.replace('ytm_', '');
            const proxyUrl = import.meta.env.VITE_API_URL 
              ? `${import.meta.env.VITE_API_URL}/api/proxy-download?id=${cleanVideoId}`
              : `/api/proxy-download?id=${cleanVideoId}`;
            setLocalAudioUrl(proxyUrl);
            return;
          }
          
          const savedSongs = await getSavedSongs();
          const matched = savedSongs.find(s => s.id === currentSong.id);
          if (matched?.blob) {
            const objectUrl = URL.createObjectURL(matched.blob);
            setLocalAudioUrl(objectUrl);
          } else {
            setLocalAudioUrl(currentSong.url || '');
          }
        } catch (e) {
          setAudioError("Gagal memuat lagu offline.");
          setLoadingAudio(false);
        }
      }  
      // Case B: SoundCloud Song (Native Audio)
      else if (currentSong.id.startsWith('sc_')) {
        setIsLocal(true); // Treat as native audio element
        try {
          const scClientId = "iErh0hlIS7lC1NEeRzcimBG8NFFF045C";
          const targetUrl = encodeURIComponent(`${currentSong.url}?client_id=${scClientId}`);
          const resolveRes = await fetch(`/api/soundcloud?url=${targetUrl}`);
          if (resolveRes.ok) {
            const data = await resolveRes.json();
            if (data.url) {
              setLocalAudioUrl(data.url);
              return;
            }
          }
          throw new Error("Gagal resolusi SoundCloud");
        } catch (e) {
          console.error("SC resolve error:", e);
          setAudioError("Gagal memuat lagu SoundCloud.");
          setLoadingAudio(false);
        }
      } 
      // Case C: Online YouTube song — proxy download bypass to fix embed blocks
      else {
        setIsLocal(true);
        const cleanVideoId = currentSong.id.replace('ytm_', '').split('_')[0];
        const proxyUrl = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL}/api/proxy-download?id=${cleanVideoId}`
          : `/api/proxy-download?id=${cleanVideoId}`;
        setLocalAudioUrl(proxyUrl);
      }
    };

    checkSongSource();
  }, [currentSong]);

  // ─── 2. Local Audio Element Play/Pause Control ─────────────────────────
  useEffect(() => {
    if (isLocal && audioRef.current && !isLoadingAudio && localAudioUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          if (e.name === 'NotAllowedError' && isPlaying) togglePlay();
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, localAudioUrl, isLoadingAudio, isLocal]);

  // ─── 3. Media Session (Lock Screen & Notification controls) ──────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: 'Music Alfaza',
      artwork: [
        { src: currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300', sizes: '96x96', type: 'image/jpeg' },
        { src: currentSong.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300', sizes: '512x512', type: 'image/jpeg' },
      ]
    });
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    const handlers: Record<string, any> = {
      play:           () => { if (!usePlayerStore.getState().isPlaying) togglePlay(); },
      pause:          () => { if (usePlayerStore.getState().isPlaying) togglePlay(); },
      previoustrack:  () => prevSong(),
      nexttrack:      () => nextSong(),
      seekbackward:   (d: any) => {
        const offset = d.seekOffset || 10;
        if (isLocal && audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        } else if (!isLocal && playerRef.current) {
          const current = playerRef.current.getCurrentTime();
          playerRef.current.seekTo(Math.max(current - offset, 0));
        }
      },
      seekforward:    (d: any) => {
        const offset = d.seekOffset || 10;
        if (isLocal && audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration || 0);
        } else if (!isLocal && playerRef.current) {
          const current = playerRef.current.getCurrentTime();
          playerRef.current.seekTo(current + offset);
        }
      },
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action as any, handler); } catch {}
    });

    return () => {
      Object.keys(handlers).forEach(action => {
        try { navigator.mediaSession.setActionHandler(action as any, null); } catch {}
      });
    };
  }, [currentSong, isLocal]);

  // ─── 4. Seek requests from UI progress bar ───────────────────────────────────
  useEffect(() => {
    if (seekRequest !== null) {
      if (isLocal && audioRef.current) {
        const target = (audioRef.current.duration || 180) * seekRequest;
        if (isFinite(target)) audioRef.current.currentTime = target;
      } else if (!isLocal && playerRef.current) {
        const duration = playerRef.current.getDuration() || 180;
        playerRef.current.seekTo(duration * seekRequest);
      }
      clearSeekRequest();
    }
  }, [seekRequest, clearSeekRequest, isLocal]);

  // ─── Local Audio Handlers ────────────────────────────────────────────────────────
  const handleLocalTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const current = el.currentTime;
    const duration = isFinite(el.duration) && el.duration > 0 ? el.duration : 180;
    setProgress(current / duration, current, duration);
    updateMediaSessionPosition(current, duration);
  };

  const handleLocalLoadedMetadata = () => {
    if (audioRef.current) {
      setProgress(0, 0, audioRef.current.duration || 180);
      setLoadingAudio(false);
    }
  };

  // ─── YouTube Player Handlers ─────────────────────────────────────────────────────
  const handleYtProgress = (state: { playedSeconds: number, loadedSeconds: number }) => {
    if (!playerRef.current) return;
    const duration = playerRef.current.getDuration() || 180;
    setProgress(state.playedSeconds / duration, state.playedSeconds, duration);
    updateMediaSessionPosition(state.playedSeconds, duration);
  };

  const handleYtReady = () => {
    setLoadingAudio(false);
  };

  const handleYtError = (e: any) => {
    console.error('[AudioPlayer] YouTube Error:', e);
    setAudioError("Gagal memuat dari YouTube. Sedang melewati...");
    setLoadingAudio(false);
    setTimeout(() => nextSong(), 2000);
  };

  // ─── Helper for Lock Screen Sync ─────────────────────────────────────────────────
  const updateMediaSessionPosition = (current: number, duration: number) => {
    if ('mediaSession' in navigator && isFinite(current) && isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: 1.0, position: current });
      } catch {}
    }
  };

  if (!currentSong) return null;

  return (
    <>
      {isLocal ? (
        localAudioUrl && (
          <audio
            ref={audioRef}
            src={localAudioUrl}
            autoPlay={isPlaying && !isLoadingAudio}
            onTimeUpdate={handleLocalTimeUpdate}
            onLoadedMetadata={handleLocalLoadedMetadata}
            onCanPlay={() => setLoadingAudio(false)}
            onEnded={nextSong}
            onError={() => {
              if (audioRef.current?.error?.code !== 1) {
                setAudioError("Pemutaran lagu lokal gagal.");
                setLoadingAudio(false);
              }
            }}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          />
        )
      ) : (
        ytVideoId && (
          <div style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <ReactPlayer
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${ytVideoId}`}
              playing={isPlaying}
              width="0"
              height="0"
              config={{
                youtube: {
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    playsinline: 1,
                    // Force minimum quality to save battery and data
                    vq: 'small'
                  }
                }
              }}
              onReady={handleYtReady}
              onProgress={handleYtProgress}
              onEnded={nextSong}
              onError={handleYtError}
            />
          </div>
        )
      )}
    </>
  );
}
