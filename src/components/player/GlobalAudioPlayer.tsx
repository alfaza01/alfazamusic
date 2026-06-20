import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { getSavedSongs } from '../../lib/db';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Helper: dapatkan Video ID bersih dari berbagai format ─────────────────
function extractVideoId(songId: string): string {
  if (songId.startsWith('ytm_')) return songId.replace('ytm_', '').split('_')[0];
  if (songId.includes('v=')) return songId.split('v=')[1].split('&')[0];
  if (songId.includes('youtu.be/')) return songId.split('youtu.be/')[1].split('?')[0];
  // Format: videoId_categorykey — ambil bagian sebelum _ terakhir jika panjang 11
  const parts = songId.split('_');
  if (parts[0].length === 11) return parts[0];
  return songId.split('_')[0];
}

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
    setLoadingAudio,
    setAudioError,
  } = usePlayerStore();

  const addToHistory = useHistoryStore(state => state.addToHistory);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const retryCountRef = useRef(0);

  // ─── Catat ke riwayat pemutaran saat lagu berganti ───────────────────────
  useEffect(() => {
    if (currentSong) {
      addToHistory(currentSong);
    }
  }, [currentSong?.id]);

  // ─── Resolve audio URL berdasarkan jenis lagu ─────────────────────────────
  useEffect(() => {
    if (!currentSong) {
      setAudioSrc('');
      return;
    }

    setLoadingAudio(true);
    setAudioError(null);
    retryCountRef.current = 0;

    const resolveAudio = async () => {
      try {
        // Case 1: SoundCloud
        if (currentSong.id.startsWith('sc_')) {
          const SC_CLIENT_ID = 'iErh0hlIS7lC1NEeRzcimBG8NFFF045C';
          const targetUrl = encodeURIComponent(`${currentSong.url}?client_id=${SC_CLIENT_ID}`);
          const apiUrl = `${API_BASE}/api/soundcloud?url=${targetUrl}`;
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setAudioSrc(data.url);
              return;
            }
          }
          throw new Error('SoundCloud resolve gagal');
        }

        // Case 2: Local / IndexedDB blob
        if (currentSong.id.startsWith('local_') || currentSong.url?.startsWith('blob:')) {
          const savedSongs = await getSavedSongs();
          const matched = savedSongs.find(s => s.id === currentSong.id);
          if (matched?.blob) {
            const objectUrl = URL.createObjectURL(matched.blob);
            setAudioSrc(objectUrl);
            return;
          }
          setAudioSrc(currentSong.url || '');
          return;
        }

        // Case 3: Saavn direct URL
        if (currentSong.id.startsWith('saavn_')) {
          setAudioSrc(currentSong.url || '');
          return;
        }

        // Case 4: YouTube Music (ytm_) atau YouTube biasa — gunakan proxy-download
        const videoId = extractVideoId(currentSong.id);
        if (videoId && videoId.length >= 8) {
          const proxyUrl = `${API_BASE}/api/proxy-download?id=${videoId}`;
          setAudioSrc(proxyUrl);
          return;
        }

        // Fallback: pakai URL lagu langsung
        setAudioSrc(currentSong.url || '');
      } catch (err: any) {
        console.error('[GlobalAudioPlayer] Error resolving audio:', err);
        setAudioError('Gagal memuat audio. Mencoba ulang...');
        setLoadingAudio(false);
      }
    };

    resolveAudio();
  }, [currentSong]);

  // ─── Play / Pause sinkronisasi dengan state ──────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(e => {
          if (e.name === 'NotAllowedError') {
            // Autoplay policy — user interaction required
            togglePlay();
          } else if (e.name !== 'AbortError') {
            console.warn('[GlobalAudioPlayer] play() error:', e.name);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, audioSrc]);

  // ─── Seek dari UI progress bar ────────────────────────────────────────────
  useEffect(() => {
    if (seekRequest !== null && audioRef.current) {
      const target = (audioRef.current.duration || 180) * seekRequest;
      if (isFinite(target)) {
        audioRef.current.currentTime = target;
      }
      clearSeekRequest();
    }
  }, [seekRequest]);

  // ─── Media Session (Kontrol layar kunci Android) ──────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: 'Music Alfaza',
      artwork: [
        { src: currentSong.cover || '', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    const handlers: Record<string, any> = {
      play:          () => { if (!usePlayerStore.getState().isPlaying) togglePlay(); },
      pause:         () => { if (usePlayerStore.getState().isPlaying) togglePlay(); },
      previoustrack: () => prevSong(),
      nexttrack:     () => nextSong(),
      seekbackward:  (d: any) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (d.seekOffset || 10), 0);
        }
      },
      seekforward:   (d: any) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (d.seekOffset || 10), audioRef.current.duration || 0);
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
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // ─── Audio Event Handlers ─────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 180;
    const current = audio.currentTime;
    setProgress(current / duration, current, duration);

    // Update lock screen position
    if ('mediaSession' in navigator && isFinite(current) && isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: 1.0, position: current });
      } catch {}
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(0, 0, audio.duration || 180);
    setLoadingAudio(false);
    // Auto play after metadata loaded
    if (isPlaying) {
      audio.play().catch(e => {
        if (e.name !== 'AbortError') console.warn('[handleLoadedMetadata] play() failed:', e.name);
      });
    }
  }, [isPlaying]);

  const handleCanPlay = useCallback(() => {
    setLoadingAudio(false);
  }, []);

  const handleError = useCallback(() => {
    const audio = audioRef.current;
    const code = audio?.error?.code;
    // Code 1 = MEDIA_ERR_ABORTED (user navigation, normal)
    if (code === 1) return;

    console.error('[GlobalAudioPlayer] Audio error, code:', code);

    // Retry once with invidious fallback
    if (retryCountRef.current === 0 && currentSong) {
      retryCountRef.current = 1;
      const videoId = extractVideoId(currentSong.id);
      const fallback = `https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`;
      console.log('[GlobalAudioPlayer] Retrying with Invidious fallback:', fallback);
      setAudioSrc(fallback);
    } else {
      setAudioError('Gagal memutar lagu. Coba lagi atau pilih lagu lain.');
      setLoadingAudio(false);
    }
  }, [currentSong]);

  const handleEnded = useCallback(() => {
    nextSong();
  }, [nextSong]);

  const handleWaiting = useCallback(() => {
    setLoadingAudio(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setLoadingAudio(false);
    setAudioError(null);
  }, []);

  if (!currentSong) return null;

  return (
    <audio
      ref={audioRef}
      src={audioSrc || undefined}
      autoPlay={false}
      preload="auto"
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onCanPlay={handleCanPlay}
      onPlaying={handlePlaying}
      onWaiting={handleWaiting}
      onEnded={handleEnded}
      onError={handleError}
      style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
    />
  );
}
