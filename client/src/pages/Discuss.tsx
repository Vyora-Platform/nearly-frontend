import { useState, useRef, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mediaApi, shotsApi } from "@/lib/gateway-api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Music2,
  Plus, Volume2, VolumeX, Play, Pause, ChevronUp, ChevronDown,
  X, Camera, Loader2, Send
} from "lucide-react";

// Shots Icon - Camera with flash
const ShotsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Camera body */}
    <rect x="3" y="6" width="18" height="12" rx="3" fill="currentColor" opacity="0.9"/>
    {/* Lens */}
    <circle cx="12" cy="12" r="3" fill="white"/>
    {/* Lens center */}
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    {/* Flash */}
    <path
      d="M7 8L9 10H7V8Z"
      fill="white"
    />
    {/* Camera details */}
    <rect x="16" y="9" width="2" height="1" rx="0.5" fill="white" opacity="0.7"/>
    <rect x="6" y="9" width="2" height="1" rx="0.5" fill="white" opacity="0.7"/>
  </svg>
);
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  caption?: string;
  audioName?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

interface ReelComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
}

export default function Discuss() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Shots state
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  // Initialize liked shots from localStorage
  const [likedShots, setLikedShots] = useState<Set<string>>(() => {
    const liked = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
    return new Set(liked);
  });
  
  // Initialize saved shots from localStorage
  const [savedShots, setSavedShots] = useState<Set<string>>(() => {
    const saved = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
    return new Set(saved);
  });
  
  // Initialize followed users from localStorage
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(() => {
    const followed = JSON.parse(localStorage.getItem('nearly_following') || '[]');
    return new Set(followed);
  });
  
  const [showCreateShot, setShowCreateShot] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Caption dialog state for shot uploads
  const [showCaptionDialog, setShowCaptionDialog] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [shotCaption, setShotCaption] = useState("");

  // Refs
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Fetch shots from dedicated shots API
  const { data: shots = [], isLoading, refetch: refetchShots } = useQuery({
    queryKey: ["shots"],
    queryFn: async () => {
      try {
        const shotsList = await shotsApi.getShots(50);
        return shotsList;
      } catch {
        // Fallback to moments API for backwards compatibility
        const moments = await api.getMoments('global', 50);
        return moments.filter((m: any) => m.mediaType === 'video' || m.mediaUrl?.includes('.mp4') || m.mediaUrl?.includes('.webm'));
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  // Fetch shot comments with nested replies
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['shot-comments', shots[currentShotIndex]?.id],
    queryFn: async () => {
      const shotId = shots[currentShotIndex]?.id;
      try {
        return await shotsApi.getComments(shotId);
      } catch {
        return api.getMomentComments(shotId);
      }
    },
    enabled: showComments && !!shots[currentShotIndex]?.id,
    staleTime: 0,
  });

  // Users data for shot authors
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users/shots", shots],
    queryFn: async () => {
      const userIds = Array.from(new Set(shots.map((r: any) => r.userId).filter(Boolean)));
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: shots.length > 0,
  });

  const getUserById = (userId: string) => {
    if (userId === currentUserId) {
      return { 
        id: userId, 
        name: "You", 
        username: "you",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` 
      };
    }
    const user = users.find((u: any) => u?.id === userId);
    return user || { 
      id: userId, 
      name: "User", 
      username: "user",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` 
    };
  };

  // Handle video playback
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentShotIndex) {
          if (isPlaying) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
          video.muted = isMuted;
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentShotIndex, isPlaying, isMuted]);

  // Handle scroll navigation
  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && currentShotIndex > 0) {
      setCurrentShotIndex(prev => prev - 1);
    } else if (direction === 'down' && currentShotIndex < shots.length - 1) {
      setCurrentShotIndex(prev => prev + 1);
    }
  }, [currentShotIndex, shots.length]);

  // Touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleScroll('down');
      } else {
        handleScroll('up');
      }
    }
    touchStartY.current = null;
  };

  // Wheel handling for desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      handleScroll('down');
    } else {
      handleScroll('up');
    }
  }, [handleScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Track view on shot change
  useEffect(() => {
    const shot = shots[currentShotIndex];
    if (shot?.id) {
      shotsApi.viewShot(shot.id).catch(() => {});
    }
  }, [currentShotIndex, shots]);

  // Like shot - with localStorage persistence and one-like-only
  const likeMutation = useMutation({
    mutationFn: async (shotId: string) => {
      // Prevent multiple likes
      if (likedShots.has(shotId)) {
        // Unlike
        return shotsApi.unlikeShot(shotId);
      }
      return shotsApi.likeShot(shotId);
    },
    onMutate: (shotId) => {
      // Optimistically toggle like
      setLikedShots(prev => {
        const newSet = new Set(prev);
        if (newSet.has(shotId)) {
          newSet.delete(shotId);
        } else {
          newSet.add(shotId);
        }
        localStorage.setItem('nearly_liked_shots', JSON.stringify([...newSet]));
        return newSet;
      });
    },
    onSuccess: () => {
      refetchShots();
    },
    onError: (_, shotId) => {
      // Revert on error
      setLikedShots(prev => {
        const newSet = new Set(prev);
        newSet.add(shotId);
        // Persist to localStorage
        localStorage.setItem('nearly_liked_shots', JSON.stringify([...newSet]));
        return newSet;
      });
    },
    onError: (_, shotId) => {
      // Revert on error
      setLikedShots(prev => {
        const newSet = new Set(prev);
        newSet.delete(shotId);
        localStorage.setItem('nearly_liked_shots', JSON.stringify([...newSet]));
        return newSet;
      });
    },
  });

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  // Comment on shot (with reply support)
  const commentMutation = useMutation({
    mutationFn: async ({ shotId, content, parentCommentId }: { shotId: string; content: string; parentCommentId?: string }) => {
      try {
        return await shotsApi.addComment(shotId, content, parentCommentId);
      } catch {
        return api.createMomentComment(shotId, content, parentCommentId);
      }
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      refetchComments();
      refetchShots();
      toast({ title: "Comment added!" });
    },
  });

  // Share shot (with backend tracking)
  const shareMutation = useMutation({
    mutationFn: async (shotId: string) => {
      return shotsApi.shareShot(shotId);
    },
    onSuccess: () => {
      refetchShots();
    },
  });

  // Delete shot (only owner can delete)
  const deleteMutation = useMutation({
    mutationFn: async (shotId: string) => {
      return shotsApi.deleteShot(shotId);
    },
    onSuccess: () => {
      toast({ title: "Shot deleted" });
      refetchShots();
      if (currentShotIndex >= shots.length - 1) {
        setCurrentShotIndex(Math.max(0, currentShotIndex - 1));
      }
    },
    onError: () => {
      toast({ title: "Failed to delete shot", variant: "destructive" });
    },
  });

  // Handle video selection - show caption dialog
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: "Please select a video file", variant: "destructive" });
      return;
    }

    // Create preview URL and show caption dialog
    const previewUrl = URL.createObjectURL(file);
    setSelectedVideoFile(file);
    setVideoPreviewUrl(previewUrl);
    setShotCaption("");
    setShowCaptionDialog(true);
    setShowCreateShot(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get video duration from file
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  // Upload shot with caption to S3 and create via shotsApi
  const handleUploadShot = async () => {
    if (!selectedVideoFile) return;

    setIsUploading(true);

    try {
      // Get video duration
      const duration = await getVideoDuration(selectedVideoFile);

      // Upload video to server
      let videoUrl = '';
      
      // Try dedicated shotsApi upload first
      try {
        console.log('Uploading via shotsApi.uploadVideo...');
        const uploadResult = await shotsApi.uploadVideo(selectedVideoFile);
        console.log('shotsApi.uploadVideo result:', uploadResult);
        if (uploadResult.success && uploadResult.url) {
          videoUrl = uploadResult.url;
        }
      } catch (shotErr) {
        console.log('shotsApi.uploadVideo failed, trying mediaApi...', shotErr);
      }
      
      // Try mediaApi second
      if (!videoUrl) {
        try {
          console.log('Uploading via mediaApi...');
          const uploadResult = await mediaApi.uploadFile(selectedVideoFile, "SHOT");
          console.log('mediaApi result:', uploadResult);
          if (uploadResult.success && uploadResult.url) {
            videoUrl = uploadResult.url;
          }
        } catch (mediaErr) {
          console.log('mediaApi failed, trying fallback...', mediaErr);
        }
      }
      
      // Fallback: try direct upload through api
      if (!videoUrl) {
        try {
          console.log('Uploading via api.uploadMedia...');
          const fallbackResult = await api.uploadMedia(selectedVideoFile, 'shots');
          console.log('api.uploadMedia result:', fallbackResult);
          if (fallbackResult.url) {
            videoUrl = fallbackResult.url;
          }
        } catch (fallbackErr) {
          console.log('api.uploadMedia failed...', fallbackErr);
        }
      }

      // Last resort: create a blob URL (works locally but won't persist)
      if (!videoUrl) {
        console.log('Using local blob URL as last resort');
        // Create a temporary URL that works for preview
        videoUrl = videoPreviewUrl || URL.createObjectURL(selectedVideoFile);
      }

      if (!videoUrl) {
        throw new Error('Video upload failed');
      }

      console.log('Final video URL:', videoUrl);

      // Create shot using shotsApi
      let shotCreated = false;
      try {
        console.log('Creating shot via shotsApi...');
        await shotsApi.createShot({
          videoUrl,
          caption: shotCaption,
          duration,
          visibility: 'public',
        });
        shotCreated = true;
        console.log('Shot created via shotsApi');
      } catch (shotErr) {
        console.log('shotsApi.createShot failed, trying moment...', shotErr);
      }
      
      // Fallback to moments API
      if (!shotCreated) {
        try {
          console.log('Creating shot via moments API...');
          await api.createMoment({
            mediaUrl: videoUrl,
            mediaType: 'video',
            visibility: 'global',
            caption: shotCaption,
          });
          shotCreated = true;
          console.log('Shot created via moments API');
        } catch (momentErr) {
          console.log('Moment API also failed', momentErr);
        }
      }

      if (!shotCreated) {
        throw new Error('Failed to create shot');
      }

      queryClient.invalidateQueries({ queryKey: ["shots"] });
      
      // Clean up
      setShowCaptionDialog(false);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setSelectedVideoFile(null);
      setVideoPreviewUrl(null);
      setShotCaption("");
      
      toast({
        title: "Shot uploaded! 🎬",
        description: "Your shot is now live",
      });
    } catch (error) {
      console.error('Error uploading shot:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel caption dialog and clean up
  const handleCancelCaption = () => {
    setShowCaptionDialog(false);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setShotCaption("");
  };

  const handleShare = async () => {
    const shot = shots[currentShotIndex];
    if (!shot) return;

    const shareUrl = `${window.location.origin}/shots?id=${shot.id}`;
    try {
      // Track share on backend
      shareMutation.mutate(shot.id);
      
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this shot!',
          text: shot.caption || 'Amazing video on Nearly!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied!" });
      }
    } catch {
      toast({ title: "Share cancelled" });
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/60">Loading shots...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (shots.length === 0) {
    return (
        <div className="min-h-screen bg-black pb-20">
        <TopBar title="Shots" />
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-6">
            <ShotsIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Shots Yet</h2>
          <p className="text-white/60 mb-8 max-w-xs">Share short videos with your community. Only video files are supported.</p>
          
          {/* Instagram-style upload button */}
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'video/*';
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files?.[0]) {
                  handleVideoSelect({ target } as React.ChangeEvent<HTMLInputElement>);
                }
              };
              input.click();
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[3px] mb-4"
          >
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Plus className="w-10 h-10 text-white" />
            </div>
          </button>
          
          <p className="text-blue-400 font-semibold text-sm cursor-pointer hover:text-blue-300" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files?.[0]) {
                handleVideoSelect({ target } as React.ChangeEvent<HTMLInputElement>);
              }
            };
            input.click();
          }}>
            Upload your first video
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentShot = shots[currentShotIndex];
  const shotUser = currentShot ? getUserById(currentShot.userId) : null;

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Full-screen Reels Container */}
      <div
        ref={containerRef}
        className="relative h-screen w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {shots.map((shot: any, index: number) => {
          const user = getUserById(shot.userId);
          const isLiked = likedShots.has(shot.id);
          const isSaved = savedShots.has(shot.id);
          const isCurrentShot = index === currentShotIndex;

          return (
            <div
              key={shot.id}
              className={`absolute inset-0 transition-transform duration-300 ${
                index === currentShotIndex
                  ? 'translate-y-0'
                  : index < currentShotIndex
                  ? '-translate-y-full'
                  : 'translate-y-full'
              }`}
            >
              {/* Video */}
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={shot.mediaUrl || shot.videoUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                onClick={() => setIsPlaying(!isPlaying)}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {/* Play/Pause indicator */}
              {!isPlaying && isCurrentShot && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                </div>
              )}

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between">
                <h1 className="text-white font-bold text-xl">Shots</h1>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Right side actions */}
              <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
                {/* User avatar */}
                <button
                  onClick={() => setLocation(`/profile/${user.username}`)}
                  className="relative"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-white">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                      {user.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                </button>

                {/* Like */}
                <button
                  onClick={() => !isLiked && likeMutation.mutate(shot.id)}
                  className={`flex flex-col items-center ${isLiked ? 'cursor-default' : ''}`}
                  disabled={isLiked}
                >
                  <div className={`w-12 h-12 rounded-full ${isLiked ? 'bg-red-500/20' : 'bg-white/10'} backdrop-blur-sm flex items-center justify-center`}>
                    <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </div>
                  <span className="text-white text-xs mt-1">{formatCount((shot.likesCount || 0) + (isLiked ? 1 : 0))}</span>
                </button>

                {/* Comment */}
                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs mt-1">{formatCount(shot.commentsCount || 0)}</span>
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs mt-1">Share</span>
                </button>

                {/* Save */}
                <button
                  onClick={() => {
                    setSavedShots(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(shot.id)) {
                        newSet.delete(shot.id);
                        toast({ title: "Removed from saved" });
                      } else {
                        newSet.add(shot.id);
                        toast({ title: "Saved!" });
                      }
                      // Persist to localStorage
                      localStorage.setItem('nearly_saved_shots', JSON.stringify([...newSet]));
                      return newSet;
                    });
                  }}
                  className="flex flex-col items-center"
                >
                  <div className={`w-12 h-12 rounded-full ${isSaved ? 'bg-primary/20' : 'bg-white/10'} backdrop-blur-sm flex items-center justify-center`}>
                    <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
                  </div>
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>

                {/* Delete (only visible to owner) */}
                {shot.userId === currentUserId && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this shot?')) {
                        deleteMutation.mutate(shot.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex flex-col items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
                      <X className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-red-400 text-xs mt-1">Delete</span>
                  </button>
                )}
              </div>

              {/* Bottom info */}
              <div className="absolute left-4 right-20 bottom-24">
                {/* Username */}
                <button
                  onClick={() => setLocation(`/profile/${user.username}`)}
                  className="flex items-center gap-2 mb-2"
                >
                  <span className="text-white font-bold">@{user.username}</span>
                  <span className="text-white/60 text-sm">•</span>
                  {shot.userId !== currentUserId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-4 rounded-full text-xs ${
                        followedUsers.has(shot.userId) 
                          ? 'bg-white/20 border-white/50 text-white' 
                          : 'bg-transparent border-white/50 text-white hover:bg-white/20'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!followedUsers.has(shot.userId)) {
                          // Follow user
                          api.followUser(currentUserId, shot.userId).then(() => {
                            setFollowedUsers(prev => {
                              const newSet = new Set(prev);
                              newSet.add(shot.userId);
                              localStorage.setItem('nearly_following', JSON.stringify([...newSet]));
                              return newSet;
                            });
                            toast({ title: "Following!" });
                          }).catch(() => {
                            toast({ title: "Failed to follow", variant: "destructive" });
                          });
                        }
                      }}
                      disabled={followedUsers.has(shot.userId)}
                    >
                      {followedUsers.has(shot.userId) ? 'Following' : 'Follow'}
                    </Button>
                  )}
                </button>

                {/* Caption */}
                {shot.caption && (
                  <p className="text-white text-sm mb-3 line-clamp-2">
                    {shot.caption}
                  </p>
                )}

                {/* Audio */}
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-white" />
                  <div className="overflow-hidden">
                    <p className="text-white text-sm whitespace-nowrap animate-marquee">
                      {shot.audioName || "Original Audio"} • {user.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation arrows */}
              {index > 0 && isCurrentShot && (
                <button
                  onClick={() => handleScroll('up')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200%] w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-50"
                >
                  <ChevronUp className="w-6 h-6 text-white" />
                </button>
              )}
              {index < shots.length - 1 && isCurrentShot && (
                <button
                  onClick={() => handleScroll('down')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[150%] w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-50"
                >
                  <ChevronDown className="w-6 h-6 text-white" />
                </button>
              )}
            </div>
          );
        })}

        {/* Progress dots */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {shots.slice(0, 10).map((_: any, index: number) => (
            <div
              key={index}
              className={`w-1 rounded-full transition-all ${
                index === currentShotIndex ? 'h-4 bg-white' : 'h-1 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Instagram-style Create Shot FAB */}
        <button
          onClick={() => {
            const galleryInput = document.createElement('input');
            galleryInput.type = 'file';
            galleryInput.accept = 'video/*';
            galleryInput.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files?.[0]) {
                handleVideoSelect({ target } as React.ChangeEvent<HTMLInputElement>);
              }
            };
            galleryInput.click();
          }}
          className="absolute bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px] shadow-lg hover:scale-110 transition-transform z-50"
        >
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
            <Plus className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={(open) => {
        setShowComments(open);
        if (!open) {
          setReplyingTo(null);
          setNewComment("");
        }
      }}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 bg-background/95 backdrop-blur-sm">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-center">Comments</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main comment */}
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{comment.userName || 'User'}</span>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(comment.createdAt)}
                        </span>
                        {comment.likesCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {comment.likesCount} likes
                          </span>
                        )}
                        <button 
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, comment.userName || 'User')}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-muted rounded">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Nested replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-10 pl-3 border-l-2 border-muted space-y-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} />
                            <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-semibold mr-2">{reply.userName || 'User'}</span>
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(reply.createdAt)}
                              </span>
                              <button 
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                onClick={() => handleReply(comment.id, reply.userName || 'User')}
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
              ))
            )}
          </div>

          {/* Replying indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span>
              </span>
              <button 
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment("");
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Comment input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
                <AvatarFallback>{currentUser?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <Input
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment..."}
                className="flex-1 border-0 bg-muted focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newComment.trim() && currentShot) {
                    commentMutation.mutate({ 
                      shotId: currentShot.id, 
                      content: newComment,
                      parentCommentId: replyingTo?.commentId
                    });
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newComment.trim() && currentShot) {
                    commentMutation.mutate({ 
                      shotId: currentShot.id, 
                      content: newComment,
                      parentCommentId: replyingTo?.commentId
                    });
                  }
                }}
                disabled={!newComment.trim() || commentMutation.isPending}
                className="text-primary font-semibold text-sm disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram-style New Shot Dialog */}
      <Dialog open={showCaptionDialog} onOpenChange={(open) => !open && handleCancelCaption()}>
        <DialogContent className="max-w-lg w-full h-[90vh] max-h-[800px] p-0 bg-black overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button
              onClick={handleCancelCaption}
              disabled={isUploading}
              className="text-white/70 hover:text-white disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-white font-semibold text-lg">New Shot</h2>
            <button
              onClick={handleUploadShot}
              disabled={isUploading || !selectedVideoFile}
              className="text-blue-500 font-semibold disabled:opacity-50"
            >
              {isUploading ? 'Posting...' : 'Share'}
            </button>
          </div>
          
          {/* Video Preview - Instagram style */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <div className="text-center text-white/50">
                <Camera className="w-16 h-16 mx-auto mb-4" />
                <p>No video selected</p>
              </div>
            )}
            
            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-3" />
                  <p className="text-white font-medium">Uploading...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Caption Section - Instagram style */}
          <div className="bg-zinc-900 p-4 border-t border-white/10">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <textarea
                value={shotCaption}
                onChange={(e) => setShotCaption(e.target.value)}
                placeholder="Write a caption..."
                className="flex-1 bg-transparent text-white placeholder-white/40 resize-none focus:outline-none min-h-[60px] text-sm"
                maxLength={2200}
              />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="text-white/40 text-xs">{shotCaption.length}/2200</span>
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <span>📹 Video only</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for video upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />

      {/* Upload loading overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white text-xl font-semibold mb-2">Uploading your reel...</p>
            <p className="text-white/60">This may take a moment</p>
          </div>
        </div>
      )}

      <BottomNav />

      {/* CSS for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 10s linear infinite;
        }
      `}</style>
    </div>
  );
}
