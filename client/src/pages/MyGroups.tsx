import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { format } from "date-fns";

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
  const currentUserId = "current-user-id";

  const { data: myGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/users", currentUserId, "groups"],
  });

  const { data: allGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

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

  const sampleGroupsData: Group[] = [
    {
      id: "1",
      name: "Kanpur Startups",
      description: "Great talk at the meetup!",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
      membersCount: 1200,
      lastMessage: "Great talk at the meetup!",
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      unreadCount: 12,
    },
    {
      id: "2",
      name: "Delhi Foodies",
      description: "Just tried this new cafe...",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
      membersCount: 875,
      lastMessage: "Just tried this new cafe...",
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      unreadCount: 3,
    },
    {
      id: "3",
      name: "Bangalore Tech Hub",
      description: "Anyone up for a game tonight?",
      imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400",
      membersCount: 2340,
      lastMessage: "Anyone up for a game tonight?",
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      unreadCount: 0,
    },
    {
      id: "4",
      name: "Mumbai Movie Club",
      description: "The new Spiderman movie wa...",
      imageUrl: "",
      membersCount: 567,
      lastMessage: "The new Spiderman movie wa...",
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      unreadCount: 1,
    },
  ];

  const groupsToDisplay = filteredGroups.length > 0 ? filteredGroups : sampleGroupsData;

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
        {groupsToDisplay.map((group) => (
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
        ))}

        {groupsToDisplay.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">No groups found</p>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
