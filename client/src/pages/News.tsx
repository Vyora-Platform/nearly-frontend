import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import NewsCard from "@/components/NewsCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// TODO: remove mock data
const mockNews = [
  {
    id: "1",
    author: {
      name: "@localreporter",
      location: "Hauz Khas, Delhi",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=LR",
    },
    headline: "Road closed near IIT Gate",
    description: "A brief summary of the news item about a temporary road closure affecting local traffic.",
    imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
    category: "Local",
    trueVotes: 210,
    fakeVotes: 105,
    likesCount: 120,
    commentsCount: 88,
    timeAgo: "5m ago",
  },
  {
    id: "2",
    author: {
      name: "@foodieKanpur",
      location: "Swaroop Nagar, Kanpur",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=FK",
    },
    headline: "New café opening in Swaroop Nagar",
    description: "Exciting news for coffee lovers! A brand new cafe is opening its doors this weekend.",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
    category: "Local",
    trueVotes: 560,
    fakeVotes: 12,
    likesCount: 973,
    commentsCount: 102,
    timeAgo: "2h ago",
  },
];

export default function News() {
  const [searchQuery, setSearchQuery] = useState("");

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
              data-testid="button-create-news"
            >
              <Plus className="w-4 h-4" />
              Create News
            </Button>
          </div>

          <CategoryPills
            categories={["All News", "Local", "National", "SPORT"]}
          />

          <div className="space-y-4">
            {mockNews.map((news) => (
              <NewsCard key={news.id} {...news} />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
