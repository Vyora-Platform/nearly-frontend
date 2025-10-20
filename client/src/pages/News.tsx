import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import NewsCard from "@/components/NewsCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateNewsDialog } from "@/components/CreateNewsDialog";

export default function News() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All News");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const currentUserId = "current-user-id";

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["/api/news"],
    queryFn: api.getNews,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const userIds = Array.from(new Set(news.map(n => n.userId)));
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: news.length > 0,
  });

  const getUserById = (userId: string) => {
    const user = users.find(u => u?.id === userId);
    return user || { 
      id: userId, 
      name: "@unknown", 
      username: "@user",
      location: "Unknown",
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${userId}` 
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

  const filteredNews = news.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.headline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All News" || 
      item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="News" showActions={false} />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading news...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="News" showActions={false} />

      <div className="max-w-md mx-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar
                placeholder="Search for news..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-primary text-white h-11 px-4 gap-2"
              onClick={() => setCreateDialogOpen(true)}
              data-testid="button-create-news"
            >
              <Plus className="w-4 h-4" />
              Create News
            </Button>
          </div>

          <CreateNewsDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            userId={currentUserId}
          />

          <CategoryPills
            categories={["All News", "Local", "National", "SPORT"]}
            onSelect={setSelectedCategory}
          />

          <div className="space-y-4">
            {filteredNews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No news items found. Create one to get started!
                </p>
              </div>
            ) : (
              filteredNews.map((newsItem) => {
                const user = getUserById(newsItem.userId);
                return (
                  <NewsCard
                    key={newsItem.id}
                    id={newsItem.id}
                    author={{
                      name: user.username || "@user",
                      location: newsItem.location || user.location || "Unknown",
                      avatar: user.avatarUrl || undefined,
                    }}
                    headline={newsItem.headline}
                    description={newsItem.description || ""}
                    imageUrl={newsItem.imageUrl || undefined}
                    category={newsItem.category}
                    trueVotes={newsItem.trueVotes || 0}
                    fakeVotes={newsItem.fakeVotes || 0}
                    likesCount={newsItem.likesCount || 0}
                    commentsCount={newsItem.commentsCount || 0}
                    timeAgo={getTimeAgo(newsItem.publishedAt)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
