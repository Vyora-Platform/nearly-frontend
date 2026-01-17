import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Search, Plus, Users, Globe, Lock, 
  Sparkles, Code, Dumbbell, Gamepad2, Music, 
  Camera, BookOpen, Palette, Utensils, Plane,
  Heart, Briefcase, Film, Mic2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { api } from "@/lib/api";
import { groupApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";

interface Group {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string;
  membersCount?: number;
  groupType?: "Public" | "Private" | "Invite-only";
  isJoined?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

const categories = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "tech", label: "Tech", icon: Code },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "music", label: "Music", icon: Music },
  { id: "photography", label: "Photo", icon: Camera },
  { id: "education", label: "Learn", icon: BookOpen },
  { id: "art", label: "Art", icon: Palette },
  { id: "food", label: "Food", icon: Utensils },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "social", label: "Social", icon: Heart },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "movies", label: "Movies", icon: Film },
  { id: "podcasts", label: "Podcasts", icon: Mic2 },
];

export default function GroupsDiscover() {
  const [activeSection, setActiveSection] = useState<"my" | "discover">("my");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Fetch all groups
  const { data: allGroups = [], isLoading, error: groupsError } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      try {
        // First try the gateway API
        const gatewayGroups = await groupApi.getGroups();
        if (gatewayGroups && gatewayGroups.length > 0) {
          return gatewayGroups;
        }
        // Fallback to local API
        return await api.getGroups();
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        // Last resort - try direct API call
        try {
          const res = await authFetch('/api/groups');
          if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          }
        } catch {}
        return [];
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch user's groups (groups they've joined)
  const { data: userGroupMemberships = [] } = useQuery({
    queryKey: ["userGroups", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      try {
        // First try the gateway API
        const gatewayGroups = await groupApi.getUserGroups(currentUserId);
        if (gatewayGroups && gatewayGroups.length > 0) {
          return gatewayGroups;
        }
        // Fallback to local API
        return await api.getUserGroups(currentUserId);
      } catch (error) {
        console.error('Failed to fetch user groups:', error);
        // Last resort - try direct API call
        try {
          const res = await authFetch(`/api/groups/user/${currentUserId}`);
          if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          }
        } catch {}
        return [];
      }
    },
    enabled: !!currentUserId,
    staleTime: 30000,
  });

  // Get set of joined group IDs
  const userGroupIds = new Set(userGroupMemberships.map((g: any) => g.id));

  // Transform groups to add isJoined flag
  const myGroups: Group[] = allGroups
    .filter((g: any) => userGroupIds.has(g.id))
    .map((g: any) => ({
      ...g,
      isJoined: true,
      groupType: g.groupType || "Public",
      membersCount: g.membersCount || 0,
    }));

  const discoverGroups: Group[] = allGroups
    .filter((g: any) => !userGroupIds.has(g.id))
    .map((g: any) => ({
      ...g,
      isJoined: false,
      groupType: g.groupType || "Public",
      membersCount: g.membersCount || 0,
    }));

  const [localJoinedGroups, setLocalJoinedGroups] = useState<Set<string>>(new Set());

  // Filter discover groups by search and category
  const filteredDiscoverGroups = discoverGroups.filter((group) => {
    const matchesSearch =
      searchQuery === "" ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || group.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      try {
        return await groupApi.joinGroup(groupId, currentUserId);
      } catch {
        return await api.joinGroup(groupId, currentUserId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userGroups", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const handleJoinGroup = async (groupId: string) => {
    if (localJoinedGroups.has(groupId)) {
      // Already joined locally, do nothing (leave not implemented)
      return;
    }
    try {
      await joinMutation.mutateAsync(groupId);
      setLocalJoinedGroups((prev) => new Set(prev).add(groupId));
    } catch (error) {
      console.error("Failed to join group:", error);
    }
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    const date = new Date(time);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const mins = Math.floor(diffInMs / (1000 * 60));
      return mins === 0 ? "Now" : `${mins}m`;
    }
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    return "1d+";
  };

  return (
    <div className="flex flex-col">
      {/* Header with Search and Create */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-search-groups"
            />
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-primary text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
            data-testid="button-create-group"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Section Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection("my")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${activeSection === "my"
                ? "bg-gradient-primary text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            data-testid="section-my-groups"
          >
            <Users className="w-4 h-4" />
            My Groups
          </button>
          <button
            onClick={() => setActiveSection("discover")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${activeSection === "discover"
                ? "bg-gradient-primary text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            data-testid="section-discover"
          >
            <Globe className="w-4 h-4" />
            Discover
          </button>
        </div>
      </div>

      {/* Category Filter - Only show in Discover */}
      {activeSection === "discover" && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                    ${isActive
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                    }`}
                  data-testid={`category-${category.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {activeSection === "my" ? (
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading groups...</p>
            </div>
          ) : myGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                You haven't joined any groups yet
              </p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Discover groups based on your interests!
              </p>
              <Button
                onClick={() => setActiveSection("discover")}
                className="mt-4 bg-gradient-primary text-white"
              >
                <Globe className="w-4 h-4 mr-2" />
                Discover Groups
              </Button>
            </div>
          ) : (
            myGroups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}/chat`}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 active:bg-muted transition-colors"
                data-testid={`my-group-${group.id}`}
              >
                <Avatar className="w-14 h-14 flex-shrink-0">
                  <AvatarImage src={group.imageUrl || ""} />
                  <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg">
                    {group.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {group.name}
                      </p>
                      {group.groupType === "Private" && (
                        <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTime(group.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate pr-4">
                      {group.lastMessage ? group.lastMessage : (
                        <span className="text-primary italic">Start conversation</span>
                      )}
                    </p>
                    {group.unreadCount && group.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-gradient-primary text-white text-xs rounded-full flex items-center justify-center font-semibold">
                        {group.unreadCount > 9 ? "9+" : group.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="px-4 pb-4 grid gap-3">
          {filteredDiscoverGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No groups found</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Try a different search or category
              </p>
            </div>
          ) : (
            filteredDiscoverGroups.map((group) => {
              const isJoined = localJoinedGroups.has(group.id);
              const CategoryIcon = categories.find((c) => c.id === group.category)?.icon || Users;
              
              return (
                <div
                  key={group.id}
                  className="bg-card rounded-2xl p-4 border border-border"
                  data-testid={`discover-group-${group.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-14 h-14 flex-shrink-0">
                      <AvatarImage src={group.imageUrl || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-lg">
                        {group.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {group.name}
                        </p>
                        {group.groupType === "Private" && (
                          <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {group.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          {formatMemberCount(group.membersCount || 0)} members
                        </div>
                        <Badge variant="secondary" className="text-xs py-0 px-2">
                          <CategoryIcon className="w-3 h-3 mr-1" />
                          {categories.find((c) => c.id === group.category)?.label || group.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => handleJoinGroup(group.id)}
                      className={`flex-1 ${
                        isJoined
                          ? "bg-muted text-foreground hover:bg-muted/80"
                          : "bg-gradient-primary text-white hover:opacity-90"
                      }`}
                      size="sm"
                      data-testid={`join-${group.id}`}
                    >
                      {isJoined ? "Joined" : "Join Group"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                      onClick={() => setLocation(`/group/${group.id}/chat`)}
                      data-testid={`view-${group.id}`}
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

