import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';

interface YouTubeIframeAudioPlayerProps {
  videoId: string;
}

export function YouTubeIframeAudioPlayer({ videoId }: YouTubeIframeAudioPlayerProps) {
  const {
    isPlaying,
    togglePlay,
    nextSong,
    setProgress,
    setLoadingAudio,
    setAudioError,
    seekRequest,
    clearSeekRequest
  } = usePlayerStore();

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize YouTube IFrame API
  useEffect(() => {
    // Load YouTube API script if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setLoadingAudio(false);
            if (isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setLoadingAudio(false);
            } else if (event.data === (window as any).YT.PlayerState.ENDED) {
              nextSong();
            }
          },
          onError: (event: any) => {
            console.error("YouTube Player Error:", event.data);
            setAudioError(`YouTube playback failed (Error ${event.data})`);
            setLoadingAudio(false);
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]); // Re-initialize when videoId changes

  // Control Play/Pause from Store
  useEffect(() => {
    if (isReady && playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, isReady]);

  // Handle Seek Requests
  useEffect(() => {
    if (isReady && playerRef.current && seekRequest !== null) {
      const duration = playerRef.current.getDuration() || 0;
      const targetTime = duration * seekRequest;
      playerRef.current.seekTo(targetTime, true);
      clearSeekRequest();
    }
  }, [seekRequest, isReady, clearSeekRequest]);

  // Sync Progress to Store
  useEffect(() => {
    let interval: number;
    if (isReady && isPlaying) {
      interval = window.setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const current = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration() || 180;
          const percentage = duration > 0 ? (current / duration) : 0;
          setProgress(percentage, current, duration);
          
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
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReady, isPlaying, setProgress]);

  // We hide the iframe completely to treat it as an invisible "audio only" player.
  return (
    <div 
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}

