import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { 
  Plus, Heart, Send, MessageCircle, Share2, 
  MoreHorizontal, Bookmark, Music2, Video, ChevronUp, ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ReelPlayer from "@/components/ReelPlayer";
import { cn } from "@/lib/utils";
import { streamingApi, VideoInfo } from "@/lib/gateway-api";

// Types
export interface ReelData {
  id: string;
  userId: string;
  mediaId?: string;      // Media service file ID (preferred)
  videoUrl: string;      // Direct URL (fallback)
  hlsUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  musicTitle?: string;
  duration?: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  isLiked?: boolean;
  isSaved?: boolean;
}

interface ReelsFeedProps {
  reels: ReelData[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onLike: (reelId: string) => void;
  onComment: (reel: ReelData) => void;
  onShare: (reel: ReelData) => void;
  onSave: (reelId: string) => void;
  onUserClick: (userId: string) => void;
  className?: string;
}

/**
 * Format number for display (1.2K, 1.5M, etc.)
 */
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

/**
 * Single Reel Item with IntersectionObserver integration
 */
const ReelItem = memo(function ReelItem({
  reel,
  isActive,
  shouldPreload,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserClick,
  onVisible,
  index,
}: {
  reel: ReelData;
  isActive: boolean;
  shouldPreload: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onUserClick: () => void;
  onVisible: (index: number, isVisible: boolean) => void;
  index: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [showHeart, setShowHeart] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  // Fetch video info for HLS URL using mediaId (preferred) or reel.id (fallback)
  useEffect(() => {
    const mediaIdentifier = reel.mediaId || reel.id;
    if (mediaIdentifier && (isActive || shouldPreload)) {
      streamingApi.getVideoInfo(mediaIdentifier)
        .then(info => setVideoInfo(info))
        .catch(() => {
          // Fallback to direct URL
          setVideoInfo(null);
        });
    }
  }, [reel.id, reel.mediaId, isActive, shouldPreload]);

  // IntersectionObserver for visibility detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Consider visible when more than 50% is in view
          onVisible(index, entry.isIntersecting && entry.intersectionRatio > 0.5);
        });
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: "100px 0px", // Pre-detect items about to come into view
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [index, onVisible]);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      onLike();
    }
  }, [isLiked, onLike]);

  const handleLikeClick = useCallback(() => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      onLike();
    }
  }, [isLiked, onLike]);

  const handleSaveClick = useCallback(() => {
    setIsSaved(!isSaved);
    onSave();
  }, [isSaved, onSave]);

  // Determine which URL to use
  const effectiveHlsUrl = videoInfo?.hlsUrl || reel.hlsUrl;
  const effectiveVideoUrl = videoInfo?.url || reel.videoUrl;
  const effectiveThumbnail = videoInfo?.thumbnailUrl || reel.thumbnailUrl || null;
  const effectiveMp4Urls = videoInfo?.mp4Urls;
  const effectiveMp4FallbackUrl = videoInfo?.mp4Url;
  const transcodeStatus = videoInfo?.transcodeStatus;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full snap-start flex-shrink-0"
    >
      {/* Video Player */}
      <ReelPlayer
        videoUrl={effectiveVideoUrl}
        hlsUrl={effectiveHlsUrl}
        mp4Urls={effectiveMp4Urls}
        mp4FallbackUrl={effectiveMp4FallbackUrl}
        poster={effectiveThumbnail}
        isActive={isActive}
        shouldPreload={shouldPreload}
        transcodeStatus={transcodeStatus}
        onDoubleTap={handleDoubleTap}
        className="absolute inset-0"
      />

      {/* Double tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-32 h-32 text-white fill-white animate-ping" />
        </div>
      )}

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        {/* User Avatar */}
        <button onClick={onUserClick} className="relative mb-2">
          <Avatar className="w-12 h-12 ring-2 ring-white">
            <AvatarImage src={reel.user?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white font-bold">
              {reel.user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-black">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </button>

        {/* Like */}
        <button onClick={handleLikeClick} className="flex flex-col items-center">
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
        <button onClick={onComment} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold mt-1">{formatCount(reel.commentsCount)}</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleSaveClick} className="flex flex-col items-center">
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
          <span className="text-white text-xs font-semibold mt-1">{formatCount(reel.sharesCount)}</span>
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-20 left-0 right-20 p-4 z-20">
        {/* User Info */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onUserClick} className="flex items-center gap-2">
            <span className="text-white font-bold text-base">@{reel.user?.username}</span>
            {reel.user?.isVerified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
          </button>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-2 mb-3">
            {reel.caption}
          </p>
        )}

        {/* Music/Sound */}
        {reel.musicTitle && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Music2 className="w-3 h-3 text-white animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-white text-xs truncate max-w-[150px]">
                {reel.musicTitle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent z-10" />
    </div>
  );
});

/**
 * Reels Feed Component with smart pre-loading
 * 
 * Features:
 * - Vertical scroll with snap points
 * - IntersectionObserver for visibility detection
 * - Pre-loads next 2 reels for instant playback
 * - Unloads distant reels to save memory
 */
export default function ReelsFeed({
  reels,
  currentIndex,
  onIndexChange,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserClick,
  className,
}: ReelsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibilityMap, setVisibilityMap] = useState<Map<number, boolean>>(new Map());

  // Handle scroll to detect current reel
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      
      if (newIndex !== currentIndex) {
        onIndexChange(newIndex);
      }
    }
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Update visibility map from IntersectionObserver callbacks
  const handleVisibilityChange = useCallback((index: number, isVisible: boolean) => {
    setVisibilityMap(prev => {
      const newMap = new Map(prev);
      newMap.set(index, isVisible);
      return newMap;
    });

    // Update current index based on which reel is most visible
    if (isVisible) {
      // Only update if this reel is in the center of the viewport
      const container = containerRef.current;
      if (container) {
        const scrollTop = container.scrollTop;
        const height = container.clientHeight;
        const expectedIndex = Math.round(scrollTop / height);
        if (index === expectedIndex && index !== currentIndex) {
          onIndexChange(index);
        }
      }
    }
  }, [currentIndex, onIndexChange]);

  // Determine which reels should preload
  const shouldPreload = useCallback((index: number) => {
    const distance = Math.abs(index - currentIndex);
    // Pre-load next 2 and previous 1 reels
    return distance <= 2 && index !== currentIndex;
  }, [currentIndex]);

  // Check if a reel is active (currently visible and playing)
  const isActive = useCallback((index: number) => {
    return index === currentIndex;
  }, [currentIndex]);

  if (reels.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-black p-8", className)}>
        <div className="w-28 h-28 rounded-full bg-rose-500 flex items-center justify-center mx-auto mb-8">
          <Video className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-white text-2xl font-bold mb-3">No Reels Yet</h2>
        <p className="text-white/60 text-base mb-2">Share short videos with your community.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      {/* Scrollable Feed */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="h-full w-full snap-start">
            <ReelItem
              reel={reel}
              index={index}
              isActive={isActive(index)}
              shouldPreload={shouldPreload(index)}
              onLike={() => onLike(reel.id)}
              onComment={() => onComment(reel)}
              onShare={() => onShare(reel)}
              onSave={() => onSave(reel.id)}
              onUserClick={() => onUserClick(reel.user?.username || reel.userId)}
              onVisible={handleVisibilityChange}
            />
          </div>
        ))}
      </div>

      {/* Scroll Indicators */}
      {reels.length > 1 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
          {reels.slice(0, Math.min(8, reels.length)).map((_, index) => (
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
          {reels.length > 8 && (
            <div className="w-1 h-1 rounded-full bg-white/20" />
          )}
        </div>
      )}

      {/* Navigation Hints */}
      {currentIndex > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-50">
          <ChevronUp className="w-6 h-6 text-white" />
        </div>
      )}
      {currentIndex < reels.length - 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-50">
          <ChevronDown className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  );
}
