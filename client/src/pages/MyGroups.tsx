import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { groupApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";

interface Group {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  membersCount?: number | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function MyGroups() {
  const [activeTab, setActiveTab] = useState("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Fetch user's groups
  const { data: myGroups = [], isLoading: loadingMyGroups } = useQuery<Group[]>({
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
        const localGroups = await api.getUserGroups(currentUserId);
        if (localGroups && localGroups.length > 0) {
          return localGroups;
        }
        // Last resort - try direct API call
        const res = await authFetch(`/api/groups/user/${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
        return [];
      } catch (error) {
        console.error('Failed to fetch user groups:', error);
        return [];
      }
    },
    enabled: !!currentUserId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch all groups
  const { data: allGroups = [], isLoading: loadingAllGroups } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      try {
        // First try the gateway API
        const gatewayGroups = await groupApi.getGroups();
        if (gatewayGroups && gatewayGroups.length > 0) {
          return gatewayGroups;
        }
        // Fallback to local API
        const localGroups = await api.getGroups();
        if (localGroups && localGroups.length > 0) {
          return localGroups;
        }
        // Last resort - try direct API call
        const res = await authFetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
        return [];
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        return [];
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const isLoading = activeTab === "my" ? loadingMyGroups : loadingAllGroups;
  const displayedGroups = activeTab === "my" ? myGroups : allGroups;
  const filteredGroups = displayedGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: "tech", label: "Tech" },
    { id: "startups", label: "Startups" },
    { id: "fitness", label: "Fitness" },
    { id: "gaming", label: "Gaming" },
  ];

  const formatTime = (time?: string) => {
    if (!time) return "";
    const date = new Date(time);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) return `${Math.floor(diffInMs / (1000 * 60))} min ago`;
    if (diffInHours < 24) return format(date, "h:mm a");
    return "Yesterday";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-foreground">Groups</h1>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center"
            data-testid="button-create-group"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("my")}
            className={`flex-1 pb-3 text-sm font-medium relative ${
              activeTab === "my" ? "text-foreground" : "text-muted-foreground"
            }`}
            data-testid="tab-my-groups"
          >
            My Groups
            {activeTab === "my" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 pb-3 text-sm font-medium relative ${
              activeTab === "all" ? "text-foreground" : "text-muted-foreground"
            }`}
            data-testid="tab-all-groups"
          >
            All Groups
            {activeTab === "all" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {activeTab === "my" && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="bg-muted text-foreground hover:bg-muted/80 cursor-pointer whitespace-nowrap"
              data-testid={`category-${category.id}`}
            >
              {category.label}
            </Badge>
          ))}
        </div>
      )}

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">No groups found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "my" ? "Join some groups to see them here!" : "Create a new group to get started!"}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <Link
            key={group.id}
            href={`/group/${group.id}/chat`}
            className="flex items-center gap-3 p-4 hover-elevate active-elevate-2"
            data-testid={`group-${group.id}`}
          >
            <Avatar className="w-14 h-14 flex-shrink-0">
              <AvatarImage src={group.imageUrl || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg font-semibold">
                {group.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {group.name}
                </p>
                {group.membersCount && group.membersCount > 1000 && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">🔒</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {group.lastMessage || group.description || "No messages yet"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground">
                {formatTime(group.lastMessageTime)}
              </p>
              {group.unreadCount && group.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-gradient-primary text-white text-xs flex items-center justify-center font-semibold">
                  {group.unreadCount}
                </div>
              )}
            </div>
          </Link>
        ))
        )}
      </div>

      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
