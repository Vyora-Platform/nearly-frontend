import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Grid3X3,
  CalendarDays,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  MessageCircle,
  Camera,
  Share2,
  Link2,
  Copy,
  Send,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mediaApi } from "@/lib/gateway-api";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, params] = useRoute("/profile/:username");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // First get current user to determine whose profile to show
  const userId = localStorage.getItem("nearly_user_id");
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!userId,
  });

  // Determine which profile to show
  const isOwnProfile = !params?.username;
  const profileUsername = params?.username || currentUser?.username;

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users/username", profileUsername],
    queryFn: () => api.getUserByUsername(profileUsername!),
    retry: false,
    enabled: !!profileUsername && !isOwnProfile,
  });

  // For own profile, use currentUser data directly; for others, use fetched user data
  const displayUser = isOwnProfile ? currentUser : user;

  const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
    queryKey: ["/api/follows", currentUser?.id, displayUser?.id],
    queryFn: async () => {
      // First check localStorage for persisted state
      const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
      const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
      
      // Try to get from API
      try {
        const apiStatus = await api.getFollowStatus(currentUser?.id || "", displayUser?.id || "");
        // If API returns following, persist to localStorage
        if (apiStatus.isFollowing && !followingList.includes(displayUser?.id)) {
          followingList.push(displayUser?.id);
          localStorage.setItem('nearly_following', JSON.stringify(followingList));
        }
        if (apiStatus.isPending && !pendingList.includes(displayUser?.id)) {
          pendingList.push(displayUser?.id);
          localStorage.setItem('nearly_pending_follows', JSON.stringify(pendingList));
        }
        return apiStatus;
      } catch {
        // Fallback to localStorage if API fails
        return {
          isFollowing: followingList.includes(displayUser?.id),
          isPending: pendingList.includes(displayUser?.id),
        };
      }
    },
    enabled:
      !!currentUser?.id &&
      !!displayUser?.id &&
      currentUser.id !== displayUser.id,
    staleTime: 0, // Always refetch to ensure fresh data
  });

  const isFollowing = followStatus?.isFollowing ?? false;
  const isPending = followStatus?.isPending ?? false;

  // Fetch user's activities/posts
  const { data: userActivities = [] } = useQuery({
    queryKey: ["/api/users/activities", displayUser?.id],
    queryFn: () => api.getUserActivities(displayUser?.id || ""),
    enabled: !!displayUser?.id,
  });

  // Fetch user's events
  const { data: userEvents = [] } = useQuery({
    queryKey: ["/api/users/events", displayUser?.id],
    queryFn: () => api.getUserEvents(displayUser?.id || ""),
    enabled: !!displayUser?.id,
  });

  // Fetch user groups for sharing
  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/groups/user", currentUser?.id],
    queryFn: () => api.getUserGroups(currentUser?.id || ""),
    enabled: !!currentUser?.id && showShareDialog,
  });

  // Fetch following list for sharing
  const { data: followingList = [] } = useQuery({
    queryKey: ["/api/users", currentUser?.id, "following"],
    queryFn: () => api.getFollowing(currentUser?.id || ""),
    enabled: !!currentUser?.id && showShareDialog,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      api.followUser(currentUser?.id || "", displayUser?.id || ""),
    onSuccess: (data) => {
      // Persist to localStorage immediately
      if (data.status === "requested") {
        const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
        if (!pendingList.includes(displayUser?.id)) {
          pendingList.push(displayUser?.id);
          localStorage.setItem('nearly_pending_follows', JSON.stringify(pendingList));
        }
      } else {
        const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
        if (!followingList.includes(displayUser?.id)) {
          followingList.push(displayUser?.id);
          localStorage.setItem('nearly_following', JSON.stringify(followingList));
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/users/username", profileUsername],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/follows", currentUser?.id, displayUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      if (displayUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["user", displayUser.id] });
      }

      if (data.status === "requested") {
        toast({
          title: "Follow Request Sent",
          description: `Your follow request has been sent to ${displayUser?.name || displayUser?.username}.`,
        });
      } else {
        toast({
          title: "Followed",
          description: `You are now following ${displayUser?.name || displayUser?.username}.`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () =>
      api.unfollowUser(currentUser?.id || "", displayUser?.id || ""),
    onSuccess: () => {
      // Remove from localStorage
      const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
      const filtered = followingList.filter((id: string) => id !== displayUser?.id);
      localStorage.setItem('nearly_following', JSON.stringify(filtered));
      
      const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
      const filteredPending = pendingList.filter((id: string) => id !== displayUser?.id);
      localStorage.setItem('nearly_pending_follows', JSON.stringify(filteredPending));

      queryClient.invalidateQueries({
        queryKey: ["/api/users/username", profileUsername],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/follows", currentUser?.id, displayUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      if (displayUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["user", displayUser.id] });
      }
      toast({
        title: "Unfollowed",
        description: `You are no longer following ${displayUser?.name || displayUser?.username}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  const handleUnfollow = () => {
    unfollowMutation.mutate();
  };

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // userId is now extracted from JWT token on server
      const result = await mediaApi.uploadFile(
        file,
        "PROFILE"
      );

      if (result.success && result.url) {
        await api.updateUser(currentUser?.id || "", { avatarUrl: result.url });
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
        toast({
          title: "Photo updated",
          description: "Your profile photo has been updated.",
        });
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${displayUser?.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Link copied",
      description: "Profile link copied to clipboard.",
    });
    setShowShareDialog(false);
  };

  const handleShareExternal = (platform: string) => {
    const profileUrl = `${window.location.origin}/profile/${displayUser?.username}`;
    const text = `Check out ${displayUser?.name}'s profile on Nearly!`;
    let shareUrl = "";

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + profileUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
    setShowShareDialog(false);
  };

  const handleShareToFriend = async (friendId: string) => {
    try {
      const profileUrl = `${window.location.origin}/profile/${displayUser?.username}`;
      await api.createMessage({
        senderId: currentUser?.id,
        recipientId: friendId,
        content: `Check out this profile: ${profileUrl}`,
        type: "link",
      });
      toast({
        title: "Shared!",
        description: "Profile link sent successfully.",
      });
      setShowShareDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share profile.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user && error && profileUsername !== currentUser?.username) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Profile not found</p>
            <p className="text-sm text-muted-foreground">
              The user profile you're looking for doesn't exist.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const safeUser = {
    id: displayUser.id || "",
    username: displayUser.username || "user",
    name: displayUser.name || "Unknown User",
    bio: displayUser.bio || "",
    location: displayUser.location || "",
    website: displayUser.website || "",
    avatarUrl:
      displayUser.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUser.id || displayUser.username || "user"}`,
    postsCount: displayUser.postsCount || userActivities.length || 0,
    followersCount: displayUser.followersCount || 0,
    followingCount: displayUser.followingCount || 0,
    interests: displayUser.interests || [],
    isPrivate: displayUser.isPrivate || false,
    isVerified: displayUser.isVerified || false,
  };

  if (!safeUser.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go Home
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isOwnProfile ? (
            <button onClick={() => window.history.back()}>
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-6" />
          )}
          <h2 className="text-lg font-semibold">@{safeUser.username}</h2>
          {isOwnProfile ? (
            <button onClick={() => setLocation("/profile-settings")}>
              <Settings className="w-6 h-6" />
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Profile
                </DropdownMenuItem>
                <DropdownMenuItem>Block</DropdownMenuItem>
                <DropdownMenuItem>Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="p-4">
          {/* Profile Header - Instagram Style */}
          <div className="flex items-start gap-6 mb-4">
            {/* Avatar with upload capability */}
            <div
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className="w-20 h-20 ring-2 ring-border">
                <AvatarImage src={safeUser.avatarUrl} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {safeUser.name[0]}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-lg border-2 border-background">
                    <span className="text-primary-foreground text-xs">+</span>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Stats - Instagram Style */}
            <div className="flex-1 flex justify-around">
              <button className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {safeUser.postsCount}
                </p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </button>
              <button
                className="text-center"
                onClick={() =>
                  setLocation(
                    `/followers-following/${safeUser.username}/followers`
                  )
                }
              >
                <p className="text-lg font-bold text-foreground">
                  {safeUser.followersCount >= 1000
                    ? `${(safeUser.followersCount / 1000).toFixed(1)}k`
                    : safeUser.followersCount}
                </p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </button>
              <button
                className="text-center"
                onClick={() =>
                  setLocation(
                    `/followers-following/${safeUser.username}/following`
                  )
                }
              >
                <p className="text-lg font-bold text-foreground">
                  {safeUser.followingCount}
                </p>
                <p className="text-xs text-muted-foreground">Following</p>
              </button>
            </div>
          </div>

          {/* Name and Bio */}
          <div className="mb-4">
            <h1 className="font-semibold text-foreground">{safeUser.name}</h1>
            {safeUser.bio && (
              <p className="text-sm text-foreground mt-1 whitespace-pre-line">
                {safeUser.bio}
              </p>
            )}
            {safeUser.location && (
              <p className="text-sm text-muted-foreground mt-1">
                📍 {safeUser.location}
              </p>
            )}
            {safeUser.website && (
              <a
                href={
                  safeUser.website.startsWith("http")
                    ? safeUser.website
                    : `https://${safeUser.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary mt-1 block"
              >
                {safeUser.website}
              </a>
            )}
          </div>

          {/* Interests */}
          {safeUser.interests && safeUser.interests.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1.5">
                {safeUser.interests.slice(0, 6).map((interest: string) => (
                  <span
                    key={interest}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {interest}
                  </span>
                ))}
                {safeUser.interests.length > 6 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    +{safeUser.interests.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            {currentUser?.id === displayUser?.id ? (
              // Own profile
              <>
                <Button
                  variant="secondary"
                  className="flex-1 h-9 text-sm font-semibold"
                  onClick={() => setLocation("/edit-profile")}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 w-9 p-0"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              // Other user's profile
              <>
                <Button
                  variant={isFollowing || isPending ? "outline" : "default"}
                  className="flex-1 h-9 text-sm font-semibold"
                  onClick={
                    isFollowing || isPending ? handleUnfollow : handleFollow
                  }
                  disabled={
                    followMutation.isPending || unfollowMutation.isPending
                  }
                >
                  {isFollowing ? (
                    "Following"
                  ) : isPending ? (
                    "Requested"
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-9 text-sm font-semibold"
                  onClick={() =>
                    setLocation(`/chat/${displayUser?.username}`)
                  }
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Message
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 w-9 p-0"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-transparent border-b border-border h-11 rounded-none p-0">
              <TabsTrigger
                value="posts"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Grid3X3 className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <CalendarDays className="w-5 h-5" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-1">
              {userActivities.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5">
                  {userActivities.map((activity: any) => (
                    <button
                      key={activity.id}
                      onClick={() => setLocation(`/activity/${activity.id}`)}
                      className="aspect-square relative overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                    >
                      {activity.imageUrl ? (
                        <img
                          src={activity.imageUrl}
                          alt={activity.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                          <span className="text-2xl">📝</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No Posts Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isOwnProfile
                      ? "Share your first post!"
                      : "This user hasn't posted yet."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-1">
              {userEvents.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5">
                  {userEvents.map((event: any) => (
                    <button
                      key={event.id}
                      onClick={() => setLocation(`/events/${event.id}`)}
                      className="aspect-square relative overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                    >
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-purple-500/40 flex items-center justify-center">
                          <span className="text-2xl">🎉</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No Events Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isOwnProfile
                      ? "Create your first event!"
                      : "This user hasn't created any events."}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copy Link */}
            <button
              onClick={handleCopyProfileLink}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <span className="font-medium">Copy Link</span>
            </button>

            {/* Share to Social Media */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Share to
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[
                  { id: "whatsapp", name: "WhatsApp", color: "bg-green-500" },
                  { id: "telegram", name: "Telegram", color: "bg-blue-500" },
                  { id: "twitter", name: "X", color: "bg-black" },
                  { id: "facebook", name: "Facebook", color: "bg-blue-600" },
                  { id: "linkedin", name: "LinkedIn", color: "bg-blue-700" },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleShareExternal(platform.id)}
                    className="flex flex-col items-center gap-1 min-w-[60px]"
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${platform.color} flex items-center justify-center text-white`}
                    >
                      <Send className="w-5 h-5" />
                    </div>
                    <span className="text-xs">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Share to Friends */}
            {followingList.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Send to Friends
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {followingList.slice(0, 5).map((friend: any) => (
                    <button
                      key={friend.id}
                      onClick={() => handleShareToFriend(friend.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback>{friend.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">
                          @{friend.username}
                        </p>
                      </div>
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Share to Groups */}
            {userGroups.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Share to Groups
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {userGroups.slice(0, 3).map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        toast({
                          title: "Shared to Group",
                          description: `Profile shared to ${group.name}`,
                        });
                        setShowShareDialog(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={group.imageUrl} />
                        <AvatarFallback>{group.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.membersCount || 0} members
                        </p>
                      </div>
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
