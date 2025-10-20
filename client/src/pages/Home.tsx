import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ActivityCard from "@/components/ActivityCard";
import CategoryPills from "@/components/CategoryPills";
import { Plus, Image as ImageIcon, Video, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";

export default function Home() {
  const [postText, setPostText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: api.getActivities,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      // Get unique user IDs from activities
      const userIds = Array.from(new Set(activities.map(a => a.userId)));
      // Fetch all users (in real app, would batch this)
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: activities.length > 0,
  });

  const getUserById = (userId: string) => {
    const user = users.find(u => u?.id === userId);
    return user || { 
      id: userId, 
      name: "Unknown User", 
      username: "@user",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` 
    };
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Just now";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredActivities = selectedCategory === "All" 
    ? activities 
    : activities.filter(a => a.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading activities...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      <div className="max-w-md mx-auto">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser" />
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
            <Input
              placeholder="What are you up to?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="flex-1 bg-muted border-0"
              data-testid="input-post"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-video"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-location"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            <button
              className="text-primary font-semibold text-sm"
              data-testid="button-post"
            >
              Post
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-border">
          <CategoryPills
            categories={["All", "Movies", "Sports", "Food"]}
            onSelect={setSelectedCategory}
          />
        </div>

        <div>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No activities yet. Create one to get started!
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const user = getUserById(activity.userId);
              return (
                <ActivityCard
                  key={activity.id}
                  id={activity.id}
                  author={{
                    name: user.name || "Unknown",
                    username: user.username || "@user",
                    avatar: user.avatarUrl || undefined,
                  }}
                  title={activity.title}
                  description={activity.description || undefined}
                  imageUrl={activity.imageUrl || undefined}
                  location={activity.location || undefined}
                  startDate={activity.startDate ? format(new Date(activity.startDate), "MMM d, h:mm a") : undefined}
                  cost={activity.cost || undefined}
                  category={activity.category || undefined}
                  likesCount={activity.likesCount || 0}
                  commentsCount={activity.commentsCount || 0}
                  participantsCount={activity.participantsCount || 0}
                  maxParticipants={activity.maxParticipants || undefined}
                  timeAgo={getTimeAgo(activity.createdAt)}
                />
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
