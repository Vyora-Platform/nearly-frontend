import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { 
  Plus, Heart, Send, Volume2, VolumeX, 
  Globe, Users, Eye, Play, Lock, Camera, X, Loader2, Pause
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { momentsApi, streamingApi } from "@/lib/gateway-api";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import Hls from "hls.js";

// Instagram-style comment icon SVG
const CommentIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Comment"
    className={className}
    fill="none"
    height="28"
    role="img"
    viewBox="0 0 24 24"
    width="28"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" strokeLinejoin="round"></path>
  </svg>
);

// Instagram-style share icon SVG (Paper plane)
const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Share"
    className={className}
    fill="none"
    height="28"
    role="img"
    viewBox="0 0 24 24"
    width="28"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="22" x2="9.218" y1="3" y2="10.083"></line>
    <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"></polygon>
  </svg>
);

// Types for moments
interface MomentUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  isVerified?: boolean;
  isFriend?: boolean;
  isFollowing?: boolean;
  isPrivate?: boolean;
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
  replies?: Comment[];
}

interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  textOverlays?: string;
  filter?: string;
  visibility: "global" | "friends" | "private";
  viewsCount: number;
  likesCount: number;
  createdAt: string;
  expiresAt: string;
  user?: MomentUser;
  commentsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  mediaId?: string; // For HLS streaming
}

// Helper function to enrich moment data with user information
const enrichMomentWithUser = async (moment: Moment): Promise<Moment> => {
  // Check localStorage for liked/saved state
  const likedMoments = JSON.parse(localStorage.getItem('nearly_liked_moments') || '[]');
  const savedMoments = JSON.parse(localStorage.getItem('nearly_saved_moments') || '[]');
  
  try {
    const user = await api.getUser(moment.userId);
    return {
      ...moment,
      user: {
        id: user.id,
        username: user.username || 'unknown',
        name: user.name || 'Unknown User',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        isVerified: user.isVerified || false,
        isFriend: false,
        isFollowing: false,
        isPrivate: user.isPrivate || false,
      },
      // Preserve counts from API, default to 0 if not present
      likesCount: moment.likesCount || 0,
      commentsCount: moment.commentsCount || 0,
      viewsCount: moment.viewsCount || 0,
      isLiked: likedMoments.includes(moment.id),
      isSaved: savedMoments.includes(moment.id),
    };
  } catch (error) {
    return {
      ...moment,
      user: {
        id: moment.userId,
        username: 'unknown',
        name: 'Unknown User',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${moment.userId}`,
        isVerified: false,
        isFriend: false,
        isFollowing: false,
        isPrivate: false,
      },
      // Preserve counts from API, default to 0 if not present
      likesCount: moment.likesCount || 0,
      commentsCount: moment.commentsCount || 0,
      viewsCount: moment.viewsCount || 0,
      isLiked: likedMoments.includes(moment.id),
      isSaved: savedMoments.includes(moment.id),
    };
  }
};

// Check if user has posted today
const hasPostedToday = (): boolean => {
  const lastPostDate = localStorage.getItem('nearly_last_moment_date');
  if (!lastPostDate) return false;
  
  const today = new Date().toDateString();
  return lastPostDate === today;
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
  return `${days}d`;
};

// Instagram Reels-style single moment view component with HLS support
const MomentReel = memo(function MomentReel({
  moment,
  isActive,
  shouldPreload = false,
  onLike,
  onOpenComments,
  onShare,
  onUserClick,
}: {
  moment: Moment;
  isActive: boolean;
  shouldPreload?: boolean;
  onLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onUserClick: () => void;
}) {
  const [isLiked, setIsLiked] = useState(moment.isLiked);
  const [likesCount, setLikesCount] = useState(moment.likesCount);
  const [showHeart, setShowHeart] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(true); // Start as paused, let autoplay handle it
  const [hasViewed, setHasViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(moment.mediaType === "video");
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [hlsUrl, setHlsUrl] = useState<string | undefined>(undefined);
  const [effectiveMediaUrl, setEffectiveMediaUrl] = useState<string>(moment.mediaUrl);
  const [isVisible, setIsVisible] = useState(false); // 40% visibility tracking
  const [useFallback, setUseFallback] = useState(false); // Track if using MP4 fallback
  const [mp4FallbackUrl, setMp4FallbackUrl] = useState<string | undefined>(undefined);
  const [mp4Urls, setMp4Urls] = useState<Record<string, string> | undefined>(undefined);
  const [transcodeStatus, setTranscodeStatus] = useState<'UPLOADED' | 'TRANSCODING' | 'READY' | 'FAILED' | undefined>(undefined);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if video URL is valid
  const isValidVideoUrl = effectiveMediaUrl && 
    !effectiveMediaUrl.startsWith('blob:') && 
    (effectiveMediaUrl.startsWith('http://') || effectiveMediaUrl.startsWith('https://'));

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
          
          // Auto-pause when scrolled more than 40% out of view (for videos)
          if (!visible && moment.mediaType === "video" && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
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
  }, [moment.mediaType]);

  // Fetch video info including HLS and MP4 fallback URLs
  useEffect(() => {
    const mediaIdentifier = moment.mediaId || moment.id;
    if (moment.mediaType === "video" && mediaIdentifier && (isActive || shouldPreload)) {
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
            setEffectiveMediaUrl(info.url);
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
          setEffectiveMediaUrl(moment.mediaUrl);
        });
    }
  }, [moment.id, moment.mediaId, moment.mediaUrl, moment.mediaType, isActive, shouldPreload]);

  // Helper to get best MP4 fallback URL
  const getBestMp4Url = useCallback((): string => {
    if (mp4FallbackUrl) return mp4FallbackUrl;
    if (mp4Urls) {
      if (mp4Urls['1080p']) return mp4Urls['1080p'];
      if (mp4Urls['720p']) return mp4Urls['720p'];
      const keys = Object.keys(mp4Urls);
      if (keys.length > 0) return mp4Urls[keys[0]];
    }
    return effectiveMediaUrl;
  }, [mp4FallbackUrl, mp4Urls, effectiveMediaUrl]);

  // Initialize HLS or native video for video moments with MP4 fallback
  useEffect(() => {
    if (moment.mediaType !== "video") return;
    
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
          console.error("[HLS-MOMENT] Fatal error:", data.type, data.details);
          // Auto-fallback to MP4 on HLS failure
          console.log("[HLS-MOMENT] Falling back to MP4 after HLS failure");
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
      console.log("[MOMENT-VIDEO] Using MP4 fallback:", mp4Url);
      video.src = mp4Url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, effectiveMediaUrl, moment.mediaType, isValidVideoUrl, shouldPreload, isActive, isPaused, isVisible, useFallback, getBestMp4Url]);

  // Track view when moment becomes active
  useEffect(() => {
    if (isActive && moment.id && !hasViewed) {
      setHasViewed(true);
      api.viewMoment(moment.id).catch(() => {});
    }
  }, [isActive, moment.id, hasViewed]);

  // Auto-play/pause video based on active state and scroll position
  // Only plays if active, at least 60% visible (scrolled less than 40% away), and not manually paused
  useEffect(() => {
    if (moment.mediaType !== "video") return;
    
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    // Only play if active, visible (>=60%), and not manually paused
    if (isActive && isVisible && !isPaused) {
      video.play().catch((err) => {
        console.log("[MOMENT] Autoplay blocked:", err.name);
      });

      if (hls && !hls.media) {
        hls.startLoad();
      }
    } else {
      video.pause();

      if (hls && !shouldPreload) {
        hls.stopLoad();
      }
    }
  }, [isActive, isVisible, isPaused, shouldPreload, moment.mediaType]);

  // Handle preloading for upcoming moments
  useEffect(() => {
    if (moment.mediaType !== "video") return;
    
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
  }, [shouldPreload, isActive, moment.mediaType]);

  // Update progress bar and sync play/pause state for video
  useEffect(() => {
    if (moment.mediaType !== "video") return;

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

    const syncPlayState = () => {
      setIsPaused(video.paused);
    };

    const handleVideoPlay = () => {
      setIsPaused(false);
      setIsLoading(false);
    };

    const handleVideoPause = () => {
      setIsPaused(true);
    };

    const handleVideoError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const handleVideoWaiting = () => {
      setIsLoading(true);
    };

    const handleVideoCanPlay = () => {
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('progress', updateBuffered);
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('waiting', handleVideoWaiting);
    video.addEventListener('canplay', handleVideoCanPlay);

    // Initial state sync
    syncPlayState();

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('progress', updateBuffered);
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('waiting', handleVideoWaiting);
      video.removeEventListener('canplay', handleVideoCanPlay);
    };
  }, [moment.mediaType]);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (isPaused) {
        // Only try to play if we're actually paused and the video is active/visible
        if (isActive && isVisible) {
          await videoRef.current.play();
          // State will be updated by the play event listener
        }
      } else {
        videoRef.current.pause();
        // State will be updated by the pause event listener
      }
    } catch (error) {
      console.log('[VIDEO] Play failed (likely autoplay blocked):', error);
      // If autoplay fails, manually set paused state
      if (isPaused) {
        setIsPaused(false);
      }
    }
  }, [isPaused, isActive, isVisible]);

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
      // Single tap - toggle play/pause for video
      if (moment.mediaType === "video") {
        tapTimeoutRef.current = setTimeout(() => {
          togglePlayPause();
        }, 300);
      }
    }

    lastTapRef.current = now;
  }, [moment.mediaType, togglePlayPause]);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      
      // Persist to localStorage
      const likedMoments = JSON.parse(localStorage.getItem('nearly_liked_moments') || '[]');
      if (!likedMoments.includes(moment.id)) {
        likedMoments.push(moment.id);
        localStorage.setItem('nearly_liked_moments', JSON.stringify(likedMoments));
      }
      
      onLike();
    }
  }, [isLiked, onLike, moment.id]);

  const handleLike = () => {
    // Only allow liking once (no unlike)
    if (isLiked) return;
    
    setIsLiked(true);
    setLikesCount(prev => prev + 1);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
    
    // Persist to localStorage
    const likedMoments = JSON.parse(localStorage.getItem('nearly_liked_moments') || '[]');
    if (!likedMoments.includes(moment.id)) {
      likedMoments.push(moment.id);
      localStorage.setItem('nearly_liked_moments', JSON.stringify(likedMoments));
    }
    
    onLike();
  };

  // Check if sharing is allowed (Instagram logic)
  const canShare = () => {
    if (moment.visibility === "global") return true;
    if (moment.visibility === "friends") {
      return moment.user?.isFriend || false;
    }
    return false;
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

  // Get effective poster URL (from API or generate fallback from video URL)
  const effectivePoster = thumbnailUrl || (moment.mediaType === "video" 
    ? moment.mediaUrl.replace(/\.(mp4|webm|mov)$/i, '.jpg') 
    : undefined);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black snap-start flex-shrink-0">
      {/* Placeholder gradient background when no thumbnail */}
      {moment.mediaType === "video" && !effectivePoster && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
      )}

      {/* Media Content */}
      <div
        className="absolute inset-0"
        onClick={handleTap}
      >
        {moment.mediaType === "video" ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
              poster={effectivePoster || undefined}
              preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
              onLoadedData={() => setIsLoading(false)}
              onError={() => setHasError(true)}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => setIsLoading(false)}
            />

            {/* Progress Bar for video */}
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
                <Lock className="w-16 h-16 text-amber-400 mb-4" />
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

            {/* Play/Pause indicator */}
            {isPaused && !isLoading && !hasError && !isTranscoding && !transcodeFailed && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={effectiveMediaUrl}
            alt="Moment"
            className="w-full h-full object-cover"
          />
        )}

        {/* Gradient overlays - Instagram style */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* Error State */}
      {hasError && moment.mediaType === "video" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <Camera className="w-16 h-16 text-white/40 mb-4" />
          <p className="text-white/80 text-lg font-medium mb-2">Video unavailable</p>
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
          <Heart className="w-28 h-28 text-white fill-white animate-ping" />
        </div>
      )}

      {/* Right Side Actions - Instagram Reels style */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-20">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center">
          <Heart className={cn(
            "w-7 h-7 transition-all",
            isLiked ? "fill-red-500 text-red-500" : "text-white"
          )} />
          <span className="text-white text-xs font-semibold mt-1">{likesCount}</span>
        </button>

        {/* Comment */}
        <button onClick={onOpenComments} className="flex flex-col items-center">
          <CommentIcon className="text-white" />
          <span className="text-white text-xs font-semibold mt-1">{moment.commentsCount || 0}</span>
        </button>

        {/* Share - Only show if allowed (Instagram logic) */}
        {canShare() && (
          <button onClick={onShare} className="flex flex-col items-center">
            <ShareIcon className="text-white" />
            <span className="text-white text-xs font-semibold mt-1">Share</span>
          </button>
        )}

        {/* Mute/Unmute for video */}
        {moment.mediaType === "video" && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
              }
            }}
            className="flex flex-col items-center"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Content - Instagram Reels style */}
      <div className="absolute bottom-20 left-0 right-16 p-4 z-20">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onUserClick} className="flex items-center gap-2">
            <Avatar className="w-9 h-9 ring-2 ring-white">
              <AvatarImage src={moment.user?.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                {moment.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-semibold text-sm">{moment.user?.username}</span>
            {moment.user?.isVerified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
          </button>
          <span className="text-white/60 text-xs">• {getTimeAgo(moment.createdAt)}</span>
        </div>

        {/* Caption */}
        {moment.caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-2">
            {moment.caption}
          </p>
        )}

        {/* Views */}
        <div className="flex items-center gap-2 mt-2 text-white/60 text-xs">
          <Eye className="w-3 h-3" />
          <span>{moment.viewsCount?.toLocaleString() || 0} views</span>
        </div>
      </div>
    </div>
  );
});

// Locked Moments Screen - Beautiful UI when user hasn't posted today
function LockedMomentsScreen({ onCreateMoment }: { onCreateMoment: () => void }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Lock Icon */}
      <div className="relative z-10 mb-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/10 backdrop-blur-sm">
          <Lock className="w-16 h-16 text-white/80" />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
          <span className="text-white text-xs font-bold">LOCKED</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-white text-2xl font-bold text-center mb-3 relative z-10">
        Post to View Moments
      </h1>
      
      <p className="text-white/60 text-center text-sm mb-8 max-w-xs relative z-10">
        Share your moment today to unlock and see what your friends are up to!
      </p>

      {/* CTA Button */}
      <Button
        onClick={onCreateMoment}
        className="relative z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-6 rounded-2xl font-semibold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105"
      >
        <Camera className="w-6 h-6 mr-3" />
        Create Your Moment
      </Button>

      {/* Info */}
      <div className="relative z-10 mt-8 flex items-center gap-2 text-white/40 text-xs">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Moments disappear after 24 hours</span>
      </div>

      <BottomNav />
    </div>
  );
}

export default function Moments() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"global" | "friends">("friends");
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has posted today
  const [canViewMoments, setCanViewMoments] = useState(hasPostedToday());

  // Get current user
  const userId = localStorage.getItem('nearly_user_id');
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!userId,
  });

  // Fetch moments based on active tab
  const { data: momentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['moments', activeTab],
    queryFn: async () => {
      const visibility = activeTab === 'global' ? 'global' : 'friends';
      const moments = await api.getMoments(visibility, 50);
      const enrichedMoments = await Promise.all(
        moments.map(moment => enrichMomentWithUser(moment))
      );
      return enrichedMoments;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: canViewMoments,
  });

  const moments = momentsData || [];

  // Handle scroll to update current moment index and header visibility
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      setCurrentMomentIndex(newIndex);
      
      const now = Date.now();
      const timeDiff = now - lastScrollTime.current;
      
      if (timeDiff > 50) {
        if (scrollTop > lastScrollTop.current && scrollTop > 50) {
          setHeaderVisible(false);
        } else if (scrollTop < lastScrollTop.current) {
          setHeaderVisible(true);
        }
        lastScrollTime.current = now;
      }
      lastScrollTop.current = scrollTop;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleLike = async (momentId: string) => {
    try {
      await api.likeMoment(momentId);
      refetch();
    } catch (error) {
      console.error("Failed to like moment:", error);
    }
  };

  const openCommentsDialog = async (moment: Moment) => {
    setSelectedMoment(moment);
    setShowComments(true);
    // Fetch comments for this moment from the API
    try {
      const fetchedComments = await api.getMomentComments(moment.id);
      setComments(fetchedComments.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName || 'User',
        userAvatar: c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`,
        content: c.content,
        createdAt: c.createdAt,
        likesCount: c.likesCount || 0,
        replies: [],
      })));
    } catch {
      setComments([]);
    }
  };

  const handleShare = async (momentId: string, moment: Moment) => {
    if (moment.visibility === "friends" && !moment.user?.isFriend) {
      return;
    }

    setSelectedMoment(moment);
    
    const shareUrl = `${window.location.origin}/moment/${momentId}`;
    const shareData = {
      title: `${moment.user?.name}'s Moment`,
      text: moment.caption || "Check out this moment!",
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        setShowShareDialog(true);
      }
    } else {
      setShowShareDialog(true);
    }
  };

  const copyLink = async () => {
    if (selectedMoment) {
      const shareUrl = `${window.location.origin}/moment/${selectedMoment.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!" });
      setShowShareDialog(false);
    }
  };

  // Comment mutation - calls the API to create a moment comment
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!selectedMoment) throw new Error("No moment selected");
      return api.createMomentComment(selectedMoment.id, content);
    },
    onSuccess: (result) => {
      // Add the new comment to the local state
      if (result && result.id) {
        if (replyingTo) {
          setComments(prev => prev.map(comment => {
            if (comment.id === replyingTo.commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), {
                  id: result.id,
                  userId: userId || '',
                  userName: currentUser?.name || 'You',
                  userAvatar: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
                  content: result.content || newComment,
                  createdAt: result.createdAt || new Date().toISOString(),
                  likesCount: 0,
                }]
              };
            }
            return comment;
          }));
        } else {
          setComments(prev => [{
            id: result.id,
            userId: userId || '',
            userName: currentUser?.name || 'You',
            userAvatar: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            content: result.content || newComment,
            createdAt: result.createdAt || new Date().toISOString(),
            likesCount: 0,
            replies: [],
          }, ...prev]);
        }
      }
      setNewComment("");
      setReplyingTo(null);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      toast({ title: "Comment posted!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({ 
      content: newComment, 
      parentId: replyingTo?.commentId 
    });
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleUserClick = (userId: string) => {
    setLocation(`/profile/${userId}`);
  };

  const handleCreateMoment = () => {
    setLocation("/create-moment");
  };

  // Show locked screen if user hasn't posted today
  if (!canViewMoments) {
    return <LockedMomentsScreen onCreateMoment={handleCreateMoment} />;
  }

  // Main Moments View - Instagram Reels style
  return (
    <>
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header with Tabs - Scrolls away like Instagram */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-30 transition-all duration-300",
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}>
          <div className="bg-gradient-to-b from-black/80 to-transparent px-4 pt-12 pb-6">
            <div className="flex items-center justify-center">
              {/* Tab Switcher - Instagram style */}
              <div className="flex items-center bg-white/10 backdrop-blur-md rounded-full p-1">
                <button
                  onClick={() => setActiveTab("friends")}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                    activeTab === "friends"
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Friends
                </button>
                <button
                  onClick={() => setActiveTab("global")}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                    activeTab === "global"
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Globe className="w-4 h-4" />
                  Global
                </button>
              </div>

              {/* Create Moment Button - Right side */}
              <button
                onClick={handleCreateMoment}
                className="absolute right-4 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Moments Feed - Vertical scroll like Instagram Reels */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Loading moments...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8">
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
          </div>
        ) : moments.length > 0 ? (
          <div
            ref={containerRef}
            className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {moments.map((moment, index) => {
              // Pre-load next 2 and previous 1 moments for instant playback
              const shouldPreload = Math.abs(index - currentMomentIndex) <= 2 && index !== currentMomentIndex;
              
              return (
                <div key={moment.id} className="h-full w-full snap-start">
                  <MomentReel
                    moment={moment}
                    isActive={index === currentMomentIndex}
                    shouldPreload={shouldPreload}
                    onLike={() => handleLike(moment.id)}
                    onOpenComments={() => openCommentsDialog(moment)}
                    onShare={() => handleShare(moment.id, moment)}
                    onUserClick={() => handleUserClick(moment.userId)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                {activeTab === "global" ? (
                  <Globe className="w-12 h-12 text-white/60" />
                ) : (
                  <Users className="w-12 h-12 text-white/60" />
                )}
              </div>
              <h2 className="text-white text-xl font-bold mb-2">
                {activeTab === "global" ? "No Global Moments" : "No Friends Moments"}
              </h2>
              <p className="text-white/60 text-sm mb-6">
                {activeTab === "global"
                  ? "Be the first to share!"
                  : "Your friends haven't shared yet"}
              </p>
              <Button
                onClick={handleCreateMoment}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Moment
              </Button>
            </div>
          </div>
        )}

        {/* Progress indicator - Right side like Instagram */}
        {moments.length > 1 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
            {moments.slice(0, 10).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-1 rounded-full transition-all duration-300",
                  index === currentMomentIndex
                    ? "h-6 bg-white"
                    : "h-2 bg-white/30"
                )}
              />
            ))}
          </div>
        )}

        <BottomNav />
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 bg-background">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-center">Comments</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <CommentIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main comment */}
                  <div className="flex gap-3">
                    <Avatar 
                      className="w-9 h-9 flex-shrink-0 cursor-pointer"
                      onClick={() => setLocation(`/profile/${comment.userId}`)}
                    >
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span 
                          className="font-semibold mr-2 cursor-pointer hover:underline"
                          onClick={() => setLocation(`/profile/${comment.userId}`)}
                        >
                          {comment.userName}
                        </span>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(comment.createdAt)}
                        </span>
                        {comment.likesCount > 0 && (
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            {comment.likesCount} likes
                          </button>
                        )}
                        <button 
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, comment.userName)}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-muted rounded">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar 
                            className="w-7 h-7 flex-shrink-0 cursor-pointer"
                            onClick={() => setLocation(`/profile/${reply.userId}`)}
                          >
                            <AvatarImage src={reply.userAvatar} />
                            <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span 
                                className="font-semibold mr-2 cursor-pointer hover:underline"
                                onClick={() => setLocation(`/profile/${reply.userId}`)}
                              >
                                {reply.userName}
                              </span>
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(reply.createdAt)}
                              </span>
                              {reply.likesCount > 0 && (
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  {reply.likesCount} likes
                                </button>
                              )}
                              <button 
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                onClick={() => handleReply(comment.id, reply.userName)}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                          <button className="p-1 hover:bg-muted rounded">
                            <Heart className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="border-t border-border p-3">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted rounded">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="font-semibold">@{replyingTo.userName}</span>
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
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                <AvatarFallback>{currentUser?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <Input
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || commentMutation.isPending}
                className="text-primary font-semibold text-sm disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Share Moment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={copyLink}
            >
              <Send className="w-5 h-5" />
              Copy Link
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                if (selectedMoment) {
                  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/moment/${selectedMoment.id}`)}`, '_blank');
                  setShowShareDialog(false);
                }
              }}
            >
              Share to Twitter
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                if (selectedMoment) {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/moment/${selectedMoment.id}`)}`, '_blank');
                  setShowShareDialog(false);
                }
              }}
            >
              Share to Facebook
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                if (selectedMoment) {
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this moment - ${window.location.origin}/moment/${selectedMoment.id}`)}`, '_blank');
                  setShowShareDialog(false);
                }
              }}
            >
              Share to WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
