import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface Props {
  videoId: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

export function YouTubeIframeAudioPlayer({ videoId }: Props) {
  const {
    isPlaying,
    nextSong,
    setProgress,
    setLoadingAudio,
    setAudioError,
    seekRequest,
    clearSeekRequest,
    togglePlay,
    currentSong,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const cleanVideoId = videoId.split('_')[0];

  // Resolve stream URL from Client (Bypass Vercel entirely)
  useEffect(() => {
    if (!cleanVideoId) return;
    setLoadingAudio(true);
    setAudioError(null);
    setResolvedUrl('');

    const resolveStreamClientSide = async () => {
      const instances = [
        "https://iv.melmac.space",
        "https://invidious.jing.rocks",
        "https://yewtu.be",
        "https://invidious.nerdvpn.de",
        "https://invidious.no-logs.com",
      ];

      for (const inst of instances) {
        try {
          // fetch directly from phone (bypasses CORS on Android via CapacitorHttp)
          const apiUrl = `${inst}/api/v1/videos/${cleanVideoId}`;
          const res = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
          
          if (res.ok) {
            const data = await res.json();
            const audios = (data.adaptiveFormats || []).filter((f: any) => f.type?.startsWith("audio/"));
            // Prioritize reliable itags
            const best = audios.find((f: any) => f.itag === 140) || audios.find((f: any) => f.itag === 251) || audios[0];
            
            if (best?.url) {
              console.log("Successfully resolved stream from:", inst);
              setResolvedUrl(best.url);
              return;
            }
          }
        } catch (e) {
          // ignore error and try next instance
        }
      }

      // If all instances fail, set error
      console.warn("All stream servers failed for video:", cleanVideoId);
      setAudioError("Lagu tidak tersedia saat ini. Server sibuk.");
      setLoadingAudio(false);
    };

    resolveStreamClientSide();
  }, [cleanVideoId]);

  // Play / Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    if (isPlaying) {
      audio.play().catch((e) => {
        if (e.name === 'AbortError') return;
        console.warn('Play error:', e);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, resolvedUrl]);

  // Seek
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekRequest === null) return;
    const target = (audio.duration || 0) * seekRequest;
    if (isFinite(target)) audio.currentTime = target;
    clearSeekRequest();
  }, [seekRequest, clearSeekRequest]);

  // Media Session (Lock Screen Controls)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: 'Music Alfaza',
      artwork: [
        { src: currentSong.cover || '', sizes: '256x256', type: 'image/jpeg' },
        { src: currentSong.cover || '', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (!usePlayerStore.getState().isPlaying) togglePlay();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (usePlayerStore.getState().isPlaying) togglePlay();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      usePlayerStore.getState().prevSong()
    );
    navigator.mediaSession.setActionHandler('nexttrack', () =>
      usePlayerStore.getState().nextSong()
    );

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack'].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a as any, null); } catch {}
      });
    };
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const cur = audio.currentTime;
    const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (dur > 0) setProgress(cur / dur, cur, dur);

    // Update lock screen position
    if ('mediaSession' in navigator && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: cur });
      } catch {}
    }
  };

  if (!resolvedUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={resolvedUrl}
      autoPlay={isPlaying}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={() => {
        setLoadingAudio(false);
        if (audioRef.current && isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }}
      onCanPlay={() => setLoadingAudio(false)}
      onEnded={nextSong}
      onError={() => {
        setAudioError('Gagal memutar lagu. Coba lagu lain.');
        setLoadingAudio(false);
      }}
      onWaiting={() => setLoadingAudio(true)}
      onPlaying={() => setLoadingAudio(false)}
      style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
    />
  );
}
