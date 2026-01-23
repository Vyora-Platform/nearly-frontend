import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Plus, Users, Globe, Lock,
  Sparkles, Code, Dumbbell, Gamepad2, Music,
  Camera, BookOpen, Palette, Utensils, Plane,
  Heart, Briefcase, Film, Mic2, ChevronRight, Check
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
        } catch { }
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
        } catch { }
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

  const handleInviteFriends = () => {
    const text = `Hey! 👋 connect with me on Nearly - The Only Campus Social Network you'll ever need.
    
🚀 Connect with verified students from your campus
💬 Secure Chats & Group Discussions
📸 Share Photo/Video Moments
🔥 Discover Campus Events, Confessions & More!
    
Join the community now: https://nearlyapp.in`;
    const message = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Native Header with Search and Create */}
      <div className="px-4 py-3 space-y-3 sticky top-0 bg-background/95 backdrop-blur-lg z-10">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-muted/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border-0 transition-all duration-200"
              data-testid="input-search-groups"
            />
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-11 h-11 rounded-xl bg-gradient-primary text-white p-0 flex-shrink-0"
            data-testid="button-create-group"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Native Segment Control */}
        <div className="relative bg-muted/50 p-1 rounded-xl flex">
          {/* Active indicator */}
          <div
            className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-gradient-primary rounded-lg transition-all duration-300 ease-out shadow-sm ${activeSection === "discover" ? "left-[calc(50%+2px)]" : "left-1"
              }`}
          />
          <button
            onClick={() => setActiveSection("my")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${activeSection === "my"
              ? "text-white"
              : "text-muted-foreground"
              }`}
            data-testid="section-my-groups"
          >
            <Users className="w-4 h-4" />
            <span>My Groups</span>
          </button>
          <button
            onClick={() => setActiveSection("discover")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${activeSection === "discover"
              ? "text-white"
              : "text-muted-foreground"
              }`}
            data-testid="section-discover"
          >
            <Globe className="w-4 h-4" />
            <span>Discover</span>
          </button>
        </div>
      </div>

      {/* Category Pills - Only show in Discover */}
      {activeSection === "discover" && (
        <div className="px-4 py-2 border-b border-border/50">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${isActive
                    ? "bg-gradient-primary text-white"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
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
        <div className="flex-1">
          {/* Section Header */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Your Groups</h2>
              <span className="text-sm text-muted-foreground">({myGroups.length})</span>
            </div>
            {/* WhatsApp Invite Button */}
            <button
              onClick={handleInviteFriends}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Invite Friends
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-3 border-muted border-t-primary rounded-full animate-spin" />
              <p className="mt-4 text-muted-foreground text-sm">Loading groups...</p>
            </div>
          ) : myGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-9 h-9 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Join your first group</h3>
              <p className="text-muted-foreground text-sm text-center max-w-[260px]">
                Discover communities that match your interests
              </p>
              <Button
                onClick={() => setActiveSection("discover")}
                className="mt-5 bg-gradient-primary text-white rounded-xl px-6 py-5 font-semibold"
              >
                <Globe className="w-4 h-4 mr-2" />
                Explore Groups
              </Button>
            </div>
          ) : (
            <div>
              {myGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/group/${group.id}/chat`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors border-b border-border/30"
                  data-testid={`my-group-${group.id}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 rounded-xl">
                      <AvatarImage src={group.imageUrl || ""} className="object-cover rounded-xl" />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg rounded-xl">
                        {group.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {group.unreadCount && group.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-gradient-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                        {group.unreadCount > 99 ? "99+" : group.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[15px] font-semibold text-foreground truncate">
                          {group.name}
                        </p>
                        {group.groupType === "Private" && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">
                        {formatTime(group.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-3">
                        {group.lastMessage ? group.lastMessage : (
                          <span className="text-primary/70 italic">Start the conversation</span>
                        )}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Discover Groups</h2>
            <span className="text-sm text-muted-foreground">({filteredDiscoverGroups.length})</span>
          </div>

          {filteredDiscoverGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-9 h-9 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No groups found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                Try adjusting your search or explore different categories
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDiscoverGroups.map((group) => {
                const isJoined = localJoinedGroups.has(group.id);
                const CategoryIcon = categories.find((c) => c.id === group.category)?.icon || Users;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                    data-testid={`discover-group-${group.id}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        <Avatar className="w-14 h-14 rounded-xl flex-shrink-0">
                          <AvatarImage src={group.imageUrl || ""} className="object-cover rounded-xl" />
                          <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg rounded-xl">
                            {group.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-bold text-foreground truncate">
                              {group.name}
                            </p>
                            {group.groupType === "Private" && (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                            {group.description || "No description available"}
                          </p>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3.5 h-3.5 text-primary" />
                              <span>{formatMemberCount(group.membersCount || 0)} members</span>
                            </div>
                            <Badge variant="secondary" className="text-xs py-0.5 px-2 h-auto">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {categories.find((c) => c.id === group.category)?.label || group.category || "General"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3.5 flex gap-2.5">
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            handleJoinGroup(group.id);
                          }}
                          className={`flex-1 h-10 rounded-xl font-semibold ${isJoined
                            ? "bg-muted text-foreground hover:bg-muted/80"
                            : "bg-gradient-primary text-white hover:opacity-90"
                            }`}
                          size="sm"
                          data-testid={`join-${group.id}`}
                        >
                          {isJoined ? (
                            <>
                              <Check className="w-4 h-4 mr-1.5" />
                              Joined
                            </>
                          ) : (
                            "Join Group"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-4 h-10 rounded-xl border-border font-semibold"
                          onClick={() => setLocation(`/group/${group.id}/chat`)}
                          data-testid={`view-${group.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
