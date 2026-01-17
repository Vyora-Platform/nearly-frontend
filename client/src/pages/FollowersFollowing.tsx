import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, UserPlus, UserMinus, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function FollowersFollowing() {
  const [, params] = useRoute("/followers-following/:username/:tab");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const username = params?.username;
  const activeTab = params?.tab || "followers";

  // Get user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/username", username],
    queryFn: () => api.getUserByUsername(username || ""),
    enabled: !!username,
  });

  // Get followers and following
  const { data: followers = [], isLoading: followersLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "followers"],
    queryFn: () => api.getFollowers(user?.id || ""),
    enabled: !!user?.id,
  });

  const { data: following = [], isLoading: followingLoading } = useQuery({
    queryKey: ["/api/users", user?.id, "following"],
    queryFn: () => api.getFollowing(user?.id || ""),
    enabled: !!user?.id,
  });

  // Get current user for follow/unfollow functionality
  const currentUserId = localStorage.getItem("nearly_user_id");
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  // Get current user's following list to check follow status
  const { data: currentUserFollowing = [] } = useQuery({
    queryKey: ["/api/users", currentUser?.id, "following"],
    queryFn: () => api.getFollowing(currentUser?.id || ""),
    enabled: !!currentUser?.id,
  });

  // Follow/Unfollow mutations
  const followMutation = useMutation({
    mutationFn: (followingId: string) =>
      api.followUser(currentUser?.id || "", followingId),
    onSuccess: (data, followingId) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "followers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "following"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUser?.id, "following"],
      });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/users/username", username],
      });

      if (data.status === "requested") {
        toast({
          title: "Request Sent",
          description: "Follow request sent.",
        });
      } else {
        toast({
          title: "Followed",
          description: "You are now following this user.",
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
    mutationFn: (followingId: string) =>
      api.unfollowUser(currentUser?.id || "", followingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "followers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "following"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUser?.id, "following"],
      });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/users/username", username],
      });
      toast({
        title: "Unfollowed",
        description: "You are no longer following this user.",
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

  const handleFollow = (userId: string) => {
    followMutation.mutate(userId);
  };

  const handleUnfollow = (userId: string) => {
    unfollowMutation.mutate(userId);
  };

  const handleRemoveFollower = async (followerId: string) => {
    // Remove someone who follows you
    try {
      await api.unfollowUser(followerId, currentUser?.id || "");
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "followers"],
      });
      toast({
        title: "Removed",
        description: "Follower removed successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove follower.",
        variant: "destructive",
      });
    }
  };

  const isCurrentUserProfile = currentUser?.id === user?.id;

  // Filter users based on search
  const filterUsers = (users: any[]) => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query)
    );
  };

  const filteredFollowers = filterUsers(followers);
  const filteredFollowing = filterUsers(following);

  const renderUserList = (users: any[], type: "followers" | "following") => {
    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-center">
            {searchQuery
              ? "No users found"
              : type === "followers"
                ? "No followers yet"
                : "Not following anyone yet"}
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {users.map((userItem) => {
          const isFollowingUser = currentUserFollowing.some(
            (f: any) => f.id === userItem.id
          );
          const isOwnProfile = userItem.id === currentUser?.id;

          return (
            <div
              key={userItem.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Avatar
                className="w-12 h-12 cursor-pointer"
                onClick={() => setLocation(`/profile/${userItem.username}`)}
              >
                <AvatarImage src={userItem.avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {userItem.name?.[0]?.toUpperCase() ||
                    userItem.username?.[0]?.toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setLocation(`/profile/${userItem.username}`)}
              >
                <p className="font-semibold text-sm truncate">
                  {userItem.username}
                </p>
                <p className="text-muted-foreground text-sm truncate">
                  {userItem.name}
                </p>
              </div>

              {!isOwnProfile && (
                <div className="flex gap-2">
                  {type === "followers" && isCurrentUserProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => handleRemoveFollower(userItem.id)}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    variant={isFollowingUser ? "outline" : "default"}
                    size="sm"
                    onClick={() =>
                      isFollowingUser
                        ? handleUnfollow(userItem.id)
                        : handleFollow(userItem.id)
                    }
                    disabled={
                      followMutation.isPending || unfollowMutation.isPending
                    }
                    className="h-8 text-xs font-semibold min-w-[80px]"
                  >
                    {isFollowingUser ? "Following" : "Follow"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => setLocation(`/profile/${username}`)}
            className="p-1"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {user.username}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() =>
              setLocation(`/followers-following/${username}/followers`)
            }
            className={`flex-1 py-3 text-sm font-semibold relative ${
              activeTab === "followers"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {user.followersCount || followers.length} Followers
            {activeTab === "followers" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
          <button
            onClick={() =>
              setLocation(`/followers-following/${username}/following`)
            }
            className={`flex-1 py-3 text-sm font-semibold relative ${
              activeTab === "following"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {user.followingCount || following.length} Following
            {activeTab === "following" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 bg-muted border-0 rounded-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {activeTab === "followers" ? (
          followersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            renderUserList(filteredFollowers, "followers")
          )
        ) : followingLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          renderUserList(filteredFollowing, "following")
        )}
      </div>
    </div>
  );
}
