import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { 
  Plus, Heart, Send, Volume2, VolumeX, 
  Play, Pause, MessageCircle, Share2, X,
  MoreHorizontal, Bookmark, Flag, Trash2,
  ChevronUp, ChevronDown, Music2, Video, AlertTriangle, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shotsApi, userApi, notificationApi, streamingApi } from "@/lib/gateway-api";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Hls from "hls.js";

// Types
interface ShotUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  parentCommentId?: string;
  replies?: Comment[];
}

interface Shot {
  id: string;
  userId: string;
  mediaId?: string;       // Media service file ID (preferred)
  videoUrl: string;       // Direct URL (fallback)
  thumbnailUrl?: string;
  caption?: string;
  musicId?: string;
  musicTitle?: string;
  duration?: number;
  visibility?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  user?: ShotUser;
  isLiked?: boolean;
  isSaved?: boolean;
}

// Helper to enrich shot with user data
const enrichShotWithUser = async (shot: Shot): Promise<Shot> => {
  const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
  const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
  
  try {
    const user = await userApi.getUser(shot.userId);
    return {
      ...shot,
      user: {
        id: user.id,
        username: user.username || 'unknown',
        name: user.name || 'Unknown User',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        isVerified: user.isVerified || false,
        isFollowing: false,
      },
      likesCount: shot.likesCount || 0,
      commentsCount: shot.commentsCount || 0,
      viewsCount: shot.viewsCount || 0,
      sharesCount: shot.sharesCount || 0,
      isLiked: likedShots.includes(shot.id),
      isSaved: savedShots.includes(shot.id),
    };
  } catch (error) {
    return {
      ...shot,
      user: {
        id: shot.userId,
        username: 'unknown',
        name: 'Unknown User',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${shot.userId}`,
        isVerified: false,
        isFollowing: false,
      },
      likesCount: shot.likesCount || 0,
      commentsCount: shot.commentsCount || 0,
      viewsCount: shot.viewsCount || 0,
      sharesCount: shot.sharesCount || 0,
      isLiked: likedShots.includes(shot.id),
      isSaved: savedShots.includes(shot.id),
    };
  }
};

// Format number for display (1.2K, 1.5M, etc.)
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

// Time ago helper
const getTimeAgo = (date: string) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};

// Single Shot Component - TikTok/Reels style with inline HLS support
const ShotReel = memo(function ShotReel({
  shot,
  isActive,
  shouldPreload = false,
  onLike,
  onOpenComments,
  onShare,
  onUserClick,
  onSave,
}: {
  shot: Shot;
  isActive: boolean;
  shouldPreload?: boolean;
  onLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onUserClick: () => void;
  onSave: () => void;
}) {
  const [isLiked, setIsLiked] = useState(shot.isLiked);
  const [likesCount, setLikesCount] = useState(shot.likesCount);
  const [isSaved, setIsSaved] = useState(shot.isSaved);
  const [showHeart, setShowHeart] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [hlsUrl, setHlsUrl] = useState<string | undefined>(undefined);
  const [effectiveVideoUrl, setEffectiveVideoUrl] = useState<string>(shot.videoUrl);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // 40% visibility tracking
  const [useFallback, setUseFallback] = useState(false); // Track if using MP4 fallback
  const [mp4FallbackUrl, setMp4FallbackUrl] = useState<string | undefined>(undefined);
  const [mp4Urls, setMp4Urls] = useState<Record<string, string> | undefined>(undefined);
  const [transcodeStatus, setTranscodeStatus] = useState<'UPLOADED' | 'TRANSCODING' | 'READY' | 'FAILED' | undefined>(undefined);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(shot.thumbnailUrl);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if video URL is valid
  const isValidVideoUrl = effectiveVideoUrl && 
    !effectiveVideoUrl.startsWith('blob:') && 
    (effectiveVideoUrl.startsWith('http://') || effectiveVideoUrl.startsWith('https://'));

  // IntersectionObserver for scroll-based pause
  // If user scrolls more than 40% away (less than 60% visible), pause the video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Video should play if at least 60% is visible (scrolled less than 40% away)
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
          setIsVisible(visible);
          
          // Auto-pause when scrolled more than 40% out of view (less than 60% visible)
          if (!visible && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: "0px",
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fetch video info using mediaId (preferred) or shot.id (fallback)
  // Gets HLS URL for primary playback and MP4 fallbacks for Safari/legacy
  useEffect(() => {
    const mediaIdentifier = shot.mediaId || shot.id;
    if (mediaIdentifier && (isActive || shouldPreload)) {
      streamingApi.getVideoInfo(mediaIdentifier)
        .then(info => {
          // HLS for adaptive streaming (primary)
          if (info.hlsUrl) {
            setHlsUrl(info.hlsUrl);
          }
          // MP4 fallbacks for Safari and legacy browsers
          if (info.mp4Urls) {
            setMp4Urls(info.mp4Urls);
          }
          if (info.mp4Url) {
            setMp4FallbackUrl(info.mp4Url);
          }
          // Direct URL
          if (info.url) {
            setEffectiveVideoUrl(info.url);
          }
          // Transcode status for showing processing state
          if (info.transcodeStatus) {
            setTranscodeStatus(info.transcodeStatus);
          }
          // Thumbnail URL (may be null if thumbnail generation failed)
          if (info.thumbnailUrl) {
            setThumbnailUrl(info.thumbnailUrl);
          }
        })
        .catch(() => {
          // Fallback to direct URL - this is fine
          setEffectiveVideoUrl(shot.videoUrl);
        });
    }
  }, [shot.id, shot.mediaId, shot.videoUrl, isActive, shouldPreload]);

  // Helper to get best MP4 fallback URL
  const getBestMp4Url = useCallback((): string => {
    if (mp4FallbackUrl) return mp4FallbackUrl;
    if (mp4Urls) {
      if (mp4Urls['1080p']) return mp4Urls['1080p'];
      if (mp4Urls['720p']) return mp4Urls['720p'];
      const keys = Object.keys(mp4Urls);
      if (keys.length > 0) return mp4Urls[keys[0]];
    }
    return effectiveVideoUrl;
  }, [mp4FallbackUrl, mp4Urls, effectiveVideoUrl]);

  // Initialize HLS or native video with automatic MP4 fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isValidVideoUrl) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check for native HLS support (Safari)
    const hasNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    const useHlsJs = hlsUrl && Hls.isSupported() && !useFallback;

    if (useHlsJs && hlsUrl) {
      // Use HLS.js for adaptive streaming (Chrome, Firefox, etc.)
      const hls = new Hls({
        maxBufferLength: isActive ? 30 : (shouldPreload ? 4 : 0),
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        lowLatencyMode: false,
        backBufferLength: 30,
        startLevel: -1,
        progressive: true,
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
          console.log("[HLS] Falling back to MP4 after HLS failure");
          setUseFallback(true);
        }
      });

      hlsRef.current = hls;
    } else if (hasNativeHls && hlsUrl && !useFallback) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
    } else {
      // Use MP4 fallback (Safari without HLS support, or after HLS failure)
      const mp4Url = getBestMp4Url();
      console.log("[VIDEO] Using MP4 fallback:", mp4Url);
      video.src = mp4Url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, effectiveVideoUrl, isValidVideoUrl, shouldPreload, isActive, isPaused, isVisible, useFallback, getBestMp4Url]);

  // Handle active state changes - play/pause based on scroll position
  // Only plays if active, at least 60% visible, and not manually paused
  useEffect(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    // Only play if active, visible (>=60%), and not manually paused
    if (isActive && isVisible && !isPaused) {
      video.play().catch((err) => {
        console.log("[SHOT] Autoplay blocked:", err.name);
      });
      setIsPlaying(true);

      if (hls && !hls.media) {
        hls.startLoad();
      }
    } else {
      video.pause();
      setIsPlaying(false);

      if (hls && !shouldPreload) {
        hls.stopLoad();
      }
    }
  }, [isActive, isVisible, isPaused, shouldPreload]);

  // Handle preloading for upcoming shots
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (shouldPreload && !isActive) {
      // Pre-load first 2 segments (4 seconds) for instant playback
      hls.startLoad(0);
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

    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('progress', updateBuffered);
    
    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('progress', updateBuffered);
    };
  }, []);

  // Track view when shot becomes active
  useEffect(() => {
    if (isActive && shot.id && !hasViewed) {
      setHasViewed(true);
      shotsApi.viewShot(shot.id).catch(() => {});
    }
  }, [isActive, shot.id, hasViewed]);

  // Video event handlers
  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleVideoError = useCallback(() => {
    // If we haven't tried MP4 fallback yet, try it
    if (!useFallback && (mp4FallbackUrl || mp4Urls)) {
      console.log("[SHOT] Video error - attempting MP4 fallback");
      setUseFallback(true);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    // All fallbacks exhausted
    setHasError(true);
    setIsLoading(false);
  }, [useFallback, mp4FallbackUrl, mp4Urls]);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      if (isActive) {
        video.play().catch(() => {});
      }
    }
  }, [isActive]);

  // Handle tap/double-tap
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected - like
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      handleDoubleTap();
    } else {
      // Single tap - toggle play/pause
      tapTimeoutRef.current = setTimeout(() => {
        togglePlayPause();
      }, 300);
    }

    lastTapRef.current = now;
  }, []);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      if (!likedShots.includes(shot.id)) {
        likedShots.push(shot.id);
        localStorage.setItem('nearly_liked_shots', JSON.stringify(likedShots));
      }
      
      onLike();
    }
  }, [isLiked, onLike, shot.id]);

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

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      const filtered = likedShots.filter((id: string) => id !== shot.id);
      localStorage.setItem('nearly_liked_shots', JSON.stringify(filtered));
    } else {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      if (!likedShots.includes(shot.id)) {
        likedShots.push(shot.id);
        localStorage.setItem('nearly_liked_shots', JSON.stringify(likedShots));
      }
      onLike();
    }
  };

  const handleSave = () => {
    if (isSaved) {
      setIsSaved(false);
      const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
      const filtered = savedShots.filter((id: string) => id !== shot.id);
      localStorage.setItem('nearly_saved_shots', JSON.stringify(filtered));
    } else {
      setIsSaved(true);
      const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
      if (!savedShots.includes(shot.id)) {
        savedShots.push(shot.id);
        localStorage.setItem('nearly_saved_shots', JSON.stringify(savedShots));
      }
      onSave();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // Transcode state helpers
  const isTranscoding = transcodeStatus === 'UPLOADED' || transcodeStatus === 'TRANSCODING';
  const transcodeFailed = transcodeStatus === 'FAILED';

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black snap-start flex-shrink-0">
      {/* Placeholder gradient background when no thumbnail */}
      {!thumbnailUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
      )}

      {/* Video Player */}
      {isValidVideoUrl ? (
        <div className="absolute inset-0" onClick={handleTap}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted={isMuted}
            loop
            poster={thumbnailUrl || undefined}
            preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
            onLoadedData={handleLoadedData}
            onError={handleVideoError}
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
            <div 
              className="absolute h-full bg-white/30 transition-all duration-300"
              style={{ width: `${buffered}%` }}
            />
            <div 
              className="absolute h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Transcoding State */}
          {isTranscoding && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-25 pointer-events-none">
              <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
              <p className="text-white/90 text-lg font-medium">Processing video...</p>
              <p className="text-white/60 text-sm mt-1">This may take a moment</p>
            </div>
          )}

          {/* Transcode Failed State */}
          {transcodeFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-25 pointer-events-none">
              <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
              <p className="text-white/80 text-lg font-medium mb-2">Processing failed</p>
              <p className="text-white/50 text-sm">Video could not be processed</p>
            </div>
          )}

          {/* Loading Spinner (only show when not transcoding) */}
          {isLoading && !hasError && !isTranscoding && !transcodeFailed && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
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
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-white/80 text-lg font-medium mb-2">Video unavailable</p>
          <p className="text-white/50 text-sm text-center px-8">Invalid video URL</p>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-white/80 text-lg font-medium mb-2">Video unavailable</p>
          <p className="text-white/50 text-sm mb-4">Failed to load video</p>
          <button
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              const video = videoRef.current;
              if (video) video.load();
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Double tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-white fill-white animate-ping" />
        </div>
      )}

      {/* Right Side Actions - TikTok style */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        {/* User Avatar */}
        <button onClick={onUserClick} className="relative mb-2">
          <Avatar className="w-12 h-12 ring-2 ring-white">
            <AvatarImage src={shot.user?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white font-bold">
              {shot.user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-black">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </button>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isLiked ? "bg-rose-500/20" : "bg-black/30"
          )}>
            <Heart className={cn(
              "w-7 h-7 transition-all",
              isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(likesCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={onOpenComments} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(shot.commentsCount)}</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleSave} className="flex flex-col items-center">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isSaved ? "bg-amber-500/20" : "bg-black/30"
          )}>
            <Bookmark className={cn(
              "w-7 h-7 transition-all",
              isSaved ? "fill-amber-500 text-amber-500" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-semibold mt-1">Save</span>
        </button>

        {/* Share */}
        <button onClick={onShare} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <Share2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(shot.sharesCount)}</span>
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-20 left-0 right-20 p-4 z-20">
        {/* User Info */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onUserClick} className="flex items-center gap-2">
            <span className="text-white font-bold text-base">@{shot.user?.username}</span>
            {shot.user?.isVerified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
          </button>
        </div>

        {/* Caption */}
        {shot.caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-2 mb-3">
            {shot.caption}
          </p>
        )}

        {/* Music/Sound */}
        {shot.musicTitle && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Music2 className="w-3 h-3 text-white animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-white text-xs truncate max-w-[150px]">
                {shot.musicTitle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation spacer */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent z-10" />
    </div>
  );
});

// Comments Sheet Component
function CommentsSheet({
  open,
  onOpenChange,
  shot,
  comments,
  onAddComment,
  isAddingComment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shot: Shot | null;
  comments: Comment[];
  onAddComment: (content: string, parentCommentId?: string) => void;
  isAddingComment: boolean;
}) {
  const [, setLocation] = useLocation();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment, replyingTo?.commentId);
    setNewComment("");
    setReplyingTo(null);
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  // Group comments into parent and replies
  const parentComments = comments.filter(c => !c.parentCommentId);
  const repliesMap = comments.reduce((acc, comment) => {
    if (comment.parentCommentId) {
      if (!acc[comment.parentCommentId]) {
        acc[comment.parentCommentId] = [];
      }
      acc[comment.parentCommentId].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 bg-background rounded-t-3xl">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="w-8" />
            <DialogTitle className="text-center font-bold">
              {comments.length} Comments
            </DialogTitle>
            <button onClick={() => onOpenChange(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {parentComments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No comments yet</p>
              <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
            </div>
          ) : (
            parentComments.map((comment) => {
              const replies = repliesMap[comment.id] || [];
              const isExpanded = expandedReplies.has(comment.id);
              
              return (
                <div key={comment.id} className="space-y-3">
                  {/* Parent comment */}
                  <div className="flex gap-3">
                    <Avatar 
                      className="w-10 h-10 flex-shrink-0 cursor-pointer"
                      onClick={() => setLocation(`/profile/${comment.userId}`)}
                    >
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-semibold text-sm cursor-pointer hover:underline"
                          onClick={() => setLocation(`/profile/${comment.userId}`)}
                        >
                          {comment.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Heart className={cn(
                            "w-4 h-4",
                            comment.isLiked && "fill-rose-500 text-rose-500"
                          )} />
                          {comment.likesCount > 0 && comment.likesCount}
                        </button>
                        <button 
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, comment.userName)}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="ml-12 space-y-3">
                      {/* Show/hide replies button */}
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-2 text-xs font-medium text-primary"
                      >
                        <div className="w-6 h-[1px] bg-muted-foreground/30" />
                        {isExpanded ? (
                          <>Hide replies <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>View {replies.length} replies <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>

                      {/* Replies list */}
                      {isExpanded && replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar 
                            className="w-8 h-8 flex-shrink-0 cursor-pointer"
                            onClick={() => setLocation(`/profile/${reply.userId}`)}
                          >
                            <AvatarImage src={reply.userAvatar} />
                            <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-semibold text-sm cursor-pointer hover:underline"
                                onClick={() => setLocation(`/profile/${reply.userId}`)}
                              >
                                {reply.userName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{reply.content}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <Heart className={cn(
                                  "w-3 h-3",
                                  reply.isLiked && "fill-rose-500 text-rose-500"
                                )} />
                                {reply.likesCount > 0 && reply.likesCount}
                              </button>
                              <button 
                                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                onClick={() => handleReply(comment.id, reply.userName)}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Comment input */}
        <div className="border-t border-border p-3 bg-background">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-3 py-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span>
              </span>
              <button onClick={() => {
                setReplyingTo(null);
                setNewComment("");
              }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
              <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4">
              <Input
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || isAddingComment}
                className="text-primary font-semibold text-sm disabled:opacity-50"
              >
                {isAddingComment ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Share Dialog Component
function ShareDialog({
  open,
  onOpenChange,
  shot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shot: Shot | null;
}) {
  const { toast } = useToast();

  const shareUrl = shot ? `${window.location.origin}/shot/${shot.id}` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard!" });
    onOpenChange(false);
    if (shot) {
      shotsApi.shareShot(shot.id).catch(() => {});
    }
  };

  const shareToSocial = (platform: string) => {
    if (!shot) return;
    
    let url = '';
    const text = shot.caption || 'Check out this shot!';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        break;
    }
    
    window.open(url, '_blank');
    onOpenChange(false);
    shotsApi.shareShot(shot.id).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Share Shot</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 py-4">
          <button 
            onClick={() => shareToSocial('whatsapp')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs">WhatsApp</span>
          </button>
          <button 
            onClick={() => shareToSocial('twitter')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">𝕏</span>
            </div>
            <span className="text-xs">Twitter</span>
          </button>
          <button 
            onClick={() => shareToSocial('facebook')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">f</span>
            </div>
            <span className="text-xs">Facebook</span>
          </button>
          <button 
            onClick={copyLink}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs">Copy Link</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Shots Page
export default function Shots() {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id || localStorage.getItem('nearly_user_id') || '';

  // Helper to check if video URL is valid
  const isValidVideoUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    if (url.startsWith('blob:')) return false; // Blob URLs expire
    if (url.startsWith('http://') || url.startsWith('https://')) return true;
    return false;
  };

  // Fetch shots
  const { data: shotsData, isLoading, error, refetch } = useQuery({
    queryKey: ['shots'],
    queryFn: async () => {
      const shots = await shotsApi.getShots(50);
      const enrichedShots = await Promise.all(
        shots.map(shot => enrichShotWithUser(shot))
      );
      // Filter out shots with invalid video URLs
      const validShots = enrichedShots.filter(shot => isValidVideoUrl(shot.videoUrl));
      console.log(`Loaded ${shots.length} shots, ${validShots.length} have valid URLs`);
      return validShots;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const shots = shotsData || [];

  // Handle scroll with IntersectionObserver-like behavior
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      setCurrentIndex(newIndex);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Like mutation with notification
  const likeMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const shot = shots.find(s => s.id === shotId);
      await shotsApi.likeShot(shotId);
      
      // Send notification to shot owner
      if (shot && shot.userId !== userId) {
        await notificationApi.createNotification({
          userId: shot.userId,
          type: 'shot_like',
          title: 'New Like',
          description: 'liked your shot',
          relatedId: userId,
          entityId: shotId,
          actionUrl: '/shots',
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to like", variant: "destructive" });
    },
  });

  // Comment mutation with notification
  const commentMutation = useMutation({
    mutationFn: async ({ shotId, content, parentCommentId }: { shotId: string; content: string; parentCommentId?: string }) => {
      const result = await shotsApi.addComment(shotId, content, parentCommentId);
      const shot = shots.find(s => s.id === shotId);
      
      // Send notification to shot owner
      if (shot && shot.userId !== userId) {
        await notificationApi.createNotification({
          userId: shot.userId,
          type: parentCommentId ? 'comment_reply' : 'shot_comment',
          title: 'New Comment',
          description: content.substring(0, 100),
          relatedId: userId,
          entityId: shotId,
          actionUrl: '/shots',
        });
      }
      
      // If replying, also notify the parent comment owner
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId !== userId) {
          await notificationApi.createNotification({
            userId: parentComment.userId,
            type: 'comment_reply',
            title: 'New Reply',
            description: content.substring(0, 100),
            relatedId: userId,
            entityId: shotId,
            actionUrl: '/shots',
          });
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      // Add comment to local state
      if (result && result.id) {
        const newComment: Comment = {
          id: result.id,
          userId: userId,
          userName: user?.name || user?.username || 'You',
          userAvatar: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          content: result.content,
          createdAt: result.createdAt || new Date().toISOString(),
          likesCount: 0,
          parentCommentId: result.parentCommentId,
        };
        setComments(prev => [...prev, newComment]);
      }
      toast({ title: "Comment posted!" });
      queryClient.invalidateQueries({ queryKey: ['shots'] });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  // Open comments
  const openComments = async (shot: Shot) => {
    setSelectedShot(shot);
    setShowComments(true);
    
    try {
      const fetchedComments = await shotsApi.getComments(shot.id);
      const mappedComments: Comment[] = await Promise.all(
        fetchedComments.map(async (c: any) => {
          let userName = c.userName || 'User';
          let userAvatar = c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`;
          
          // Fetch user data if not provided
          if (!c.userName) {
            try {
              const userData = await userApi.getUser(c.userId);
              userName = userData.name || userData.username || 'User';
              userAvatar = userData.avatarUrl || userAvatar;
            } catch {}
          }
          
          return {
            id: c.id,
            userId: c.userId,
            userName,
            userAvatar,
            content: c.content,
            createdAt: c.createdAt,
            likesCount: c.likesCount || 0,
            isLiked: false,
            parentCommentId: c.parentCommentId,
          };
        })
      );
      setComments(mappedComments);
    } catch {
      setComments([]);
    }
  };

  // Open share
  const openShare = (shot: Shot) => {
    setSelectedShot(shot);
    setShowShare(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading shots...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-white text-lg font-bold mb-2">Failed to Load</h2>
          <p className="text-white/60 text-sm mb-4">Something went wrong</p>
          <Button onClick={() => refetch()} variant="outline" className="text-white border-white/30">
            Try Again
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Empty state
  if (shots.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8">
        <div className="text-center">
          {/* Video icon */}
          <div className="w-28 h-28 rounded-full bg-rose-500 flex items-center justify-center mx-auto mb-8">
            <Video className="w-14 h-14 text-white" />
          </div>
          
          <h2 className="text-white text-2xl font-bold mb-3">No Shots Yet</h2>
          <p className="text-white/60 text-base mb-2">Share short videos with your community.</p>
          <p className="text-white/60 text-base mb-8">Only video files are supported.</p>
          
          {/* Upload button with gradient ring */}
          <button
            onClick={() => setLocation('/create-shot')}
            className="relative w-20 h-20 mx-auto mb-4"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[3px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Plus className="w-8 h-8 text-white" />
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => setLocation('/create-shot')}
            className="text-primary font-medium text-lg hover:underline"
          >
            Upload your first video
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Shots</h1>
            <button
              onClick={() => setLocation('/create-shot')}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Shots Feed with HLS Pre-loading */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {shots.map((shot, index) => {
            // Pre-load next 2 and previous 1 shots for instant playback
            const shouldPreload = Math.abs(index - currentIndex) <= 2 && index !== currentIndex;
            
            return (
              <div key={shot.id} className="h-full w-full snap-start">
                <ShotReel
                  shot={shot}
                  isActive={index === currentIndex}
                  shouldPreload={shouldPreload}
                  onLike={() => likeMutation.mutate(shot.id)}
                  onOpenComments={() => openComments(shot)}
                  onShare={() => openShare(shot)}
                  onUserClick={() => setLocation(`/profile/${shot.user?.username || shot.userId}`)}
                  onSave={() => {}}
                />
              </div>
            );
          })}
        </div>

        {/* Current index indicator */}
        {shots.length > 1 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
            {shots.slice(0, 8).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-1 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "h-5 bg-white"
                    : "h-1.5 bg-white/30"
                )}
              />
            ))}
            {shots.length > 8 && (
              <div className="w-1 h-1 rounded-full bg-white/20" />
            )}
          </div>
        )}

        <BottomNav />
      </div>

      {/* Comments Sheet */}
      <CommentsSheet
        open={showComments}
        onOpenChange={setShowComments}
        shot={selectedShot}
        comments={comments}
        onAddComment={(content, parentId) => {
          if (selectedShot) {
            commentMutation.mutate({
              shotId: selectedShot.id,
              content,
              parentCommentId: parentId,
            });
          }
        }}
        isAddingComment={commentMutation.isPending}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        shot={selectedShot}
      />
    </>
  );
}
