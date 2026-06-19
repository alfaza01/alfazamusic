import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getSavedSongs } from '../../lib/db';

// List of Invidious instances for rotation fallback
const INVIDIOUS_INSTANCES = [
  "https://iv.melmac.space",
  "https://invidious.jing.rocks",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
  "https://invidious.no-logs.com",
];

/**
 * Resolves a direct audio stream URL for a given YouTube video ID.
 * Tries each Invidious instance in order; stops on first success.
 */
async function resolveAudioUrl(videoId: string): Promise<string> {
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;

      const data = await res.json();
      const audios = (data.adaptiveFormats || []).filter((f: any) =>
        f.type?.startsWith("audio/")
      );

      // Priority: itag 140 (m4a 128kbps) → itag 251 (opus 160kbps) → first available
      const best =
        audios.find((f: any) => f.itag === 140) ||
        audios.find((f: any) => f.itag === 251) ||
        audios[0];

      if (best?.url) {
        console.log(`[AudioPlayer] Resolved from: ${inst}`);
        return best.url;
      }
    } catch {
      console.warn(`[AudioPlayer] Instance failed: ${inst}, trying next...`);
    }
  }
  throw new Error("Semua server audio sedang tidak tersedia.");
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
    isLoadingAudio,
    setLoadingAudio,
    setAudioError
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Track ongoing video ID to avoid race conditions
  const currentVideoIdRef = useRef<string>('');

  // ─── 1. Resolve URL when current song changes ───────────────────────────────
  const resolveUrl = useCallback(async (song: typeof currentSong) => {
    if (!song) {
      setAudioUrl('');
      return;
    }

    setLoadingAudio(true);
    setAudioError(null);

    try {
      // --- Case A: Local / downloaded MP3 stored in IndexedDB ---
      if (
        song.id.startsWith('local_') ||
        song.url === 'local_blob' ||
        song.url?.startsWith('blob:')
      ) {
        const savedSongs = await getSavedSongs();
        const matched = savedSongs.find(s => s.id === song.id);
        if (matched?.blob) {
          const objectUrl = URL.createObjectURL(matched.blob);
          setAudioUrl(objectUrl);
        } else {
          setAudioUrl(song.url || '');
        }
        return;
      }

      // --- Case B: Online YouTube song — resolve via Invidious API ---
      const cleanVideoId = song.id.split('_')[0];
      currentVideoIdRef.current = cleanVideoId;

      const url = await resolveAudioUrl(cleanVideoId);

      // Guard: if song changed while we were fetching, discard old result
      if (currentVideoIdRef.current !== cleanVideoId) return;

      setAudioUrl(url);

    } catch (e: any) {
      console.error('[AudioPlayer] URL resolution failed:', e.message);
      setAudioError('Gagal memuat lagu. Server sedang sibuk, coba beberapa saat lagi.');
      setLoadingAudio(false);
    }
  }, [setLoadingAudio, setAudioError]);

  useEffect(() => {
    resolveUrl(currentSong);
  }, [currentSong]);

  // ─── 2. Play / Pause control ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    if (audioRef.current && !isLoadingAudio && audioUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          if (!active) return;
          if (e.name === 'AbortError') return;
          if (e.name === 'NotAllowedError' && isPlaying) togglePlay();
        });
      } else {
        audioRef.current.pause();
      }
    }
    return () => { active = false; };
  }, [isPlaying, audioUrl, isLoadingAudio]);

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
        if (audioRef.current) audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (d.seekOffset || 10), 0);
      },
      seekforward:    (d: any) => {
        if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (d.seekOffset || 10), audioRef.current.duration || 0);
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

  // ─── 4. Seek requests from UI progress bar ───────────────────────────────────
  useEffect(() => {
    if (seekRequest !== null && audioRef.current) {
      const target = (audioRef.current.duration || 180) * seekRequest;
      if (isFinite(target)) audioRef.current.currentTime = target;
      clearSeekRequest();
    }
  }, [seekRequest, clearSeekRequest]);

  // ─── Event Handlers ──────────────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const current = el.currentTime;
    const duration = isFinite(el.duration) && el.duration > 0 ? el.duration : 180;
    setProgress(current / duration, current, duration);

    if ('mediaSession' in navigator && isFinite(current) && isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: 1.0, position: current });
      } catch {}
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setProgress(0, 0, audioRef.current.duration || 180);
      setLoadingAudio(false);
    }
  };

  /**
   * SMART RECOVERY HANDLER — "Lapis 3" protection.
   *
   * Strategy:
   *   1st attempt (retryCount = 0): wait 3s → try re-resolve fresh URL for the SAME song
   *   2nd attempt (retryCount = 1): wait 4s → skip to NEXT SONG automatically
   *
   * This way:
   * - Expired URLs get refreshed silently (user doesn't notice)
   * - If the server is fully down, we don't hang forever — we move on
   */
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef   = useRef<number>(0); // tracks how many retries for current song

  // Reset retry counter whenever song changes successfully
  useEffect(() => {
    retryCountRef.current = 0;
  }, [currentSong?.id]);

  const handleStalled = () => {
    if (!currentSong || currentSong.id.startsWith('local_')) return;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (retryCountRef.current === 0) {
      // 1st stall: re-resolve URL for same song
      retryTimeoutRef.current = setTimeout(() => {
        console.warn('[AudioPlayer] Stream stalled — attempt 1: re-resolving URL...');
        retryCountRef.current = 1;
        resolveUrl(currentSong);
      }, 3000);
    } else {
      // 2nd stall: skip to next song
      retryTimeoutRef.current = setTimeout(() => {
        console.warn('[AudioPlayer] Stream still broken — skipping to next song...');
        retryCountRef.current = 0;
        nextSong();
      }, 4000);
    }
  };

  const handleError = () => {
    if (audioRef.current?.error?.code === 1) return; // MEDIA_ERR_ABORTED = ignore
    if (!currentSong || currentSong.id.startsWith('local_')) {
      setAudioError("Pemutaran lagu lokal gagal.");
      setLoadingAudio(false);
      return;
    }
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (retryCountRef.current === 0) {
      // 1st error: try re-resolving URL
      console.warn('[AudioPlayer] Audio error — attempt 1: re-resolving URL...');
      retryTimeoutRef.current = setTimeout(() => {
        retryCountRef.current = 1;
        resolveUrl(currentSong);
      }, 2000);
    } else {
      // 2nd error: give up and skip to next song
      console.warn('[AudioPlayer] Audio still broken — skipping to next song...');
      retryTimeoutRef.current = setTimeout(() => {
        retryCountRef.current = 0;
        nextSong();
      }, 3000);
    }
  };

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  if (!currentSong) return null;

  return (
    <>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay={isPlaying && !isLoadingAudio}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={() => setLoadingAudio(false)}
          onEnded={nextSong}
          onStalled={handleStalled}    // ← Re-resolve when stream stalls
          onWaiting={handleStalled}    // ← Re-resolve when stream is waiting
          onError={handleError}        // ← Re-resolve on stream error
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}
    </>
  );
}
