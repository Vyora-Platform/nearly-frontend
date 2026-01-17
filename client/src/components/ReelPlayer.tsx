import { useState, useEffect, useRef, useCallback, memo } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelPlayerProps {
  /** Direct video URL (MP4) - used as fallback when HLS is not supported */
  videoUrl: string;
  /** HLS playlist URL (.m3u8) - preferred for adaptive streaming */
  hlsUrl?: string;
  /** MP4 fallback URLs for different qualities (Safari/legacy support) */
  mp4Urls?: Record<string, string>;
  /** Best quality MP4 URL (convenient single fallback) */
  mp4FallbackUrl?: string;
  /** Thumbnail/poster image (optional - shows placeholder if not available) */
  poster?: string | null;
  /** Whether this reel is currently visible/active */
  isActive: boolean;
  /** Whether to preload (for upcoming reels) */
  shouldPreload?: boolean;
  /** Visibility threshold (0-1) - pause if less visible (default: 0.6 = 60% visible, pauses when scrolled 40% away) */
  visibilityThreshold?: number;
  /** Transcode status for showing appropriate loading state */
  transcodeStatus?: 'UPLOADED' | 'TRANSCODING' | 'READY' | 'FAILED';
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback when video errors */
  onError?: (error: string) => void;
  /** Callback when double-tapped */
  onDoubleTap?: () => void;
  /** Callback when single-tapped */
  onTap?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * High-performance video player component for Reels/Shots.
 * 
 * YouTube/Instagram-style playback with:
 * - Adaptive HLS streaming (primary) via hls.js
 * - MP4 fallback for Safari/legacy browsers
 * - Smart pre-loading with IntersectionObserver
 * - Double-tap detection for likes
 * - Mute/unmute toggle
 * - Progress bar
 * - Error handling with automatic fallback
 */
const ReelPlayer = memo(function ReelPlayer({
  videoUrl,
  hlsUrl,
  mp4Urls,
  mp4FallbackUrl,
  poster,
  isActive,
  shouldPreload = false,
  visibilityThreshold = 0.6,
  transcodeStatus,
  onEnded,
  onError,
  onDoubleTap,
  onTap,
  className,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Visibility tracking for 40% threshold
  const [useFallback, setUseFallback] = useState(false); // Track if we've fallen back to MP4
  
  // Double tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if video is still being transcoded
  const isTranscoding = transcodeStatus === 'UPLOADED' || transcodeStatus === 'TRANSCODING';
  const transcodeFailed = transcodeStatus === 'FAILED';

  // Determine best fallback MP4 URL
  const getBestMp4Url = useCallback((): string => {
    if (mp4FallbackUrl) return mp4FallbackUrl;
    if (mp4Urls) {
      // Return in quality priority order
      if (mp4Urls['1080p']) return mp4Urls['1080p'];
      if (mp4Urls['720p']) return mp4Urls['720p'];
      // Return first available
      const keys = Object.keys(mp4Urls);
      if (keys.length > 0) return mp4Urls[keys[0]];
    }
    return videoUrl;
  }, [mp4FallbackUrl, mp4Urls, videoUrl]);

  // Check Safari/native HLS support
  const hasNativeHls = typeof document !== 'undefined' && 
    document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';

  // Determine if we should use HLS.js (Chrome, Firefox, etc.)
  const useHlsJs = hlsUrl && Hls.isSupported() && !useFallback;
  
  // Determine effective URL based on browser capabilities
  const effectiveUrl = useFallback 
    ? getBestMp4Url()
    : (useHlsJs ? hlsUrl : (hasNativeHls && hlsUrl ? hlsUrl : getBestMp4Url()));

  // IntersectionObserver for scroll-based pause
  // Default: pause when scrolled more than 40% away (less than 60% visible)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Generate threshold array for smooth tracking
    const thresholds = Array.from({ length: 11 }, (_, i) => i / 10);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Video should play if visible ratio >= threshold (default 60% visible)
          const visible = entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold;
          setIsVisible(visible);
          
          // Auto-pause when scrolled more than 40% out of view
          if (!visible && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: thresholds,
        rootMargin: "0px",
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [visibilityThreshold]);

  // Initialize HLS or native video with automatic MP4 fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveUrl) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reset error state when URL changes
    setHasError(false);
    setErrorMessage("");

    if (useHlsJs && hlsUrl) {
      // Use HLS.js for adaptive streaming (Chrome, Firefox, etc.)
      const hls = new Hls({
        // Pre-load optimization settings
        maxBufferLength: isActive ? 30 : (shouldPreload ? 4 : 0), // Buffer 30s when active, 4s for preload
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60MB buffer
        maxBufferHole: 0.5,
        // Low latency settings
        lowLatencyMode: false,
        backBufferLength: 30,
        // Start with auto quality selection
        startLevel: -1, // Auto
        // Enable progressive loading
        progressive: true,
        // Pre-load settings
        autoStartLoad: isActive || shouldPreload,
        // Add auth headers to all XHR requests
        xhrSetup: (xhr: XMLHttpRequest) => {
          const accessToken = localStorage.getItem('nearly_access_token');
          if (accessToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          }
          const userId = localStorage.getItem('nearly_user_id');
          if (userId) {
            xhr.setRequestHeader('X-User-Id', userId);
          }
        },
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (isActive && isVisible && !isPaused) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("[HLS] Fatal error:", data.type, data.details);
          
          // Auto-fallback to MP4 on HLS failure
          if (retryCount < 2) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              hls.startLoad();
            }, 1000 * (retryCount + 1));
          } else {
            // HLS failed after retries - fallback to MP4
            console.log("[HLS] Falling back to MP4 after HLS failure");
            setUseFallback(true);
            setRetryCount(0);
          }
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        updateBuffered();
      });

      hlsRef.current = hls;
    } else if (hasNativeHls && hlsUrl && !useFallback) {
      // Native HLS support (Safari) - use HLS directly
      video.src = hlsUrl;
      setIsLoading(true);
    } else {
      // Use MP4 fallback (Safari without HLS, or after HLS failure)
      const mp4Url = getBestMp4Url();
      console.log("[VIDEO] Using MP4 fallback:", mp4Url);
      video.src = mp4Url;
      setIsLoading(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveUrl, useHlsJs, hlsUrl, hasNativeHls, useFallback, getBestMp4Url, shouldPreload, isActive, isPaused, isVisible]);

  // Handle active state changes - play/pause based on scroll position
  // Only plays if active, at least 60% visible, and not manually paused
  useEffect(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    // Only play if active, visible (>=60%), and not manually paused
    if (isActive && isVisible && !isPaused) {
      // Start playback when active and visible
      video.play().catch((err) => {
        // Autoplay blocked - that's OK, user can tap to play
        console.log("[REEL] Autoplay blocked:", err.name);
      });
      setIsPlaying(true);

      // Start loading if HLS and not already loading
      if (hls && !hls.media) {
        hls.startLoad();
      }
    } else {
      video.pause();
      setIsPlaying(false);

      // Stop loading if not active and not preloading
      if (hls && !shouldPreload) {
        hls.stopLoad();
      }
    }
  }, [isActive, isVisible, isPaused, shouldPreload]);

  // Handle preloading for upcoming reels
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (shouldPreload && !isActive) {
      // Pre-load first 2 segments (4 seconds) for instant playback
      hls.startLoad(0);
      // Stop after preloading initial segments
      setTimeout(() => {
        if (!isActive && hls) {
          hls.stopLoad();
        }
      }, 2000);
    }
  }, [shouldPreload, isActive]);

  // Update progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;

    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const duration = video.duration || 1;
    setBuffered((bufferedEnd / duration) * 100);
  }, []);

  // Handle video events
  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    const error = video?.error;
    
    // Ignore non-fatal errors
    if (!error) return;
    
    console.error("[REEL] Video error:", error.code, error.message);
    
    // If we haven't tried MP4 fallback yet, try it
    if (!useFallback && (mp4FallbackUrl || mp4Urls || videoUrl)) {
      console.log("[REEL] Video error - attempting MP4 fallback");
      setUseFallback(true);
      setRetryCount(0);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    
    // All fallbacks exhausted
    setHasError(true);
    setErrorMessage(error.message || "Video playback error");
    setIsLoading(false);
    onError?.(error.message || "Video error");
  }, [onError, useFallback, mp4FallbackUrl, mp4Urls, videoUrl]);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      // Loop for Reels
      video.currentTime = 0;
      if (isActive) {
        video.play().catch(() => {});
      }
    }
    onEnded?.();
  }, [isActive, onEnded]);

  // Handle tap/double-tap
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      onDoubleTap?.();
    } else {
      // Potential single tap - wait to see if another tap comes
      tapTimeoutRef.current = setTimeout(() => {
        onTap?.();
        togglePlayPause();
      }, 300);
    }

    lastTapRef.current = now;
  }, [onDoubleTap, onTap]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  // Retry loading on error - start fresh with HLS if available
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    setUseFallback(false); // Reset to try HLS again

    const video = videoRef.current;
    const hls = hlsRef.current;

    if (hls) {
      hls.startLoad();
    } else if (video) {
      video.load();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full bg-black overflow-hidden", className)}
      onClick={handleTap}
    >
      {/* Placeholder gradient background when no poster */}
      {!poster && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        loop
        poster={poster || undefined}
        preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onEnded={handleEnded}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-30">
        {/* Buffered progress */}
        <div 
          className="absolute h-full bg-white/30 transition-all duration-300"
          style={{ width: `${buffered}%` }}
        />
        {/* Playback progress */}
        <div 
          className="absolute h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Transcoding State */}
      {isTranscoding && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-25">
          <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
          <p className="text-white/90 text-lg font-medium">Processing video...</p>
          <p className="text-white/60 text-sm mt-1">This may take a moment</p>
        </div>
      )}

      {/* Transcode Failed State */}
      {transcodeFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-25">
          <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
          <p className="text-white/80 text-lg font-medium mb-2">Processing failed</p>
          <p className="text-white/50 text-sm">Video could not be processed</p>
        </div>
      )}

      {/* Loading Spinner (only show if not transcoding) */}
      {isLoading && !hasError && !isTranscoding && !transcodeFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && !transcodeFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-white/80 text-lg font-medium mb-2">Video unavailable</p>
          <p className="text-white/50 text-sm mb-4">{errorMessage || "Failed to load video"}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Play/Pause Indicator */}
      {isPaused && !isLoading && !hasError && !isTranscoding && !transcodeFailed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Mute Button (hide when transcoding/failed) */}
      {!isTranscoding && !transcodeFailed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="absolute bottom-24 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center z-20 hover:bg-black/70 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}
    </div>
  );
});

export default ReelPlayer;

/**
 * Hook for managing a list of reels with smart pre-loading.
 */
export function useReelPreloader(currentIndex: number, totalReels: number) {
  // Pre-load next 2 reels, unload reels more than 3 away
  const shouldPreload = useCallback((index: number) => {
    const distance = Math.abs(index - currentIndex);
    return distance <= 2 && index !== currentIndex;
  }, [currentIndex]);

  const shouldUnload = useCallback((index: number) => {
    const distance = Math.abs(index - currentIndex);
    return distance > 3;
  }, [currentIndex]);

  return { shouldPreload, shouldUnload };
}
