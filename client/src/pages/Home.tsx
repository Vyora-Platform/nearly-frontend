import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ActivityCard from "@/components/ActivityCard";
import EventCard from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { ACTIVITY_CATEGORIES } from "@shared/constants";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  Activity, Calendar, Plus, Search,
  Target, CalendarDays, MessageSquare, MessageCircle,
  Newspaper, BarChart3, MessageSquareMore, Filter,
  Vote, AlertCircle, Hash
} from "lucide-react";

type HomeTab = "discussions" | "activities" | "events";
type DiscussSubTab = "news" | "polls" | "issues" | "general";

const DISCUSSION_CATEGORIES = {
  news: ["All", "Local", "Community", "Safety", "Traffic", "Weather", "Events", "Politics", "Business", "Sports"],
  polls: ["All", "Local Issues", "Community", "Events", "Food", "Entertainment", "Tech", "Lifestyle"],
  issues: ["All", "Neighborhood", "Traffic", "Safety", "Utilities", "Construction", "Noise", "Parking", "Roads", "Pollution"],
  general: ["All", "Religious", "Political", "Educational", "Health", "Weather", "Entertainment", "Tips", "Recommendations", "Questions", "Lost & Found"],
};

const discussSubTabs = [
  { id: "news" as DiscussSubTab, icon: Newspaper, label: "News" },
  { id: "polls" as DiscussSubTab, icon: Vote, label: "Polls" },
  { id: "issues" as DiscussSubTab, icon: AlertCircle, label: "Issues" },
  { id: "general" as DiscussSubTab, icon: Hash, label: "General" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<HomeTab>("discussions");
  const [discussSubTab, setDiscussSubTab] = useState<DiscussSubTab>("news");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Pull to refresh functionality
  const { isRefreshing, progress, canRefresh } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh all active queries
      await queryClient.invalidateQueries();
    }
  });

  // Activities data
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.getActivities(),
    enabled: activeTab === "activities",
  });

  // Events data
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => api.getEvents(),
    enabled: activeTab === "events",
  });

  // Discussion data
  const { data: news = [], isLoading: newsLoading } = useQuery({
    queryKey: ["news"],
    queryFn: () => api.getNews(),
    enabled: activeTab === "discussions" && discussSubTab === "news",
  });

  const { data: polls = [], isLoading: pollsLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: () => api.getPolls(),
    enabled: activeTab === "discussions" && discussSubTab === "polls",
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: () => api.getQuestions(),
    enabled: activeTab === "discussions" && discussSubTab === "general",
  });

  const { data: discussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ["discussions"],
    queryFn: () => api.getDiscussions(),
    enabled: activeTab === "discussions" && ["issues", "general"].includes(discussSubTab),
  });

  // Users data for activity/event/discussion authors
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users", activities, events, news, polls, questions, discussions],
    queryFn: async () => {
      const allItems = [...(activities || []), ...(events || []), ...(news || []), ...(polls || []), ...(questions || []), ...(discussions || [])];
      const userIds = Array.from(new Set(allItems.map((a: any) => a.userId).filter(Boolean)));
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: (activities && activities.length > 0) || (events && events.length > 0) || (news?.length > 0) || (polls?.length > 0) || (questions?.length > 0) || (discussions?.length > 0),
  });

  const getUserById = (userId: string) => {
    if (userId === currentUserId) {
      return {
        id: userId,
        name: "You",
        username: "@you",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
      };
    }
    const user = users.find(u => u?.id === userId);
    return user || {
      id: userId,
      name: "User",
      username: "@user",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
    };
  };

  const getTimeAgo = (date: Date | string | null) => {
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

  // Filter activities
  const filteredActivities = activities && Array.isArray(activities)
    ? activities.filter(a => {
      const matchesSearch = searchQuery === "" ||
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    : [];

  // Filter events
  const filteredEvents = events && Array.isArray(events)
    ? events.filter(e => {
      const matchesSearch = searchQuery === "" ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesCategory = selectedCategory === "All";
      if (!matchesCategory) {
        if (Array.isArray(e.category)) {
          matchesCategory = e.category.some((cat: string) =>
            cat.toLowerCase() === selectedCategory.toLowerCase()
          );
        } else if (typeof e.category === 'string') {
          matchesCategory = e.category.toLowerCase() === selectedCategory.toLowerCase();
        }
      }
      return matchesSearch && matchesCategory;
    })
    : [];

  // Filter discussion content
  const filteredNews = news && Array.isArray(news)
    ? news.filter(n => {
      const matchesSearch = searchQuery === "" ||
        n.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || n.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    : [];

  const filteredPolls = polls && Array.isArray(polls)
    ? polls.filter(p => {
      const matchesSearch = searchQuery === "" ||
        p.question?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    : [];

  const filteredQuestions = questions && Array.isArray(questions)
    ? questions.filter(q => {
      const matchesSearch = searchQuery === "" ||
        q.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || q.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    : [];

  const filteredDiscussions = discussions && Array.isArray(discussions)
    ? discussions.filter(d => {
      const matchesSearch = searchQuery === "" ||
        d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || d.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    : [];

  const tabs = [
    { id: "discussions" as HomeTab, icon: MessageSquare, label: "Discuss" },
    { id: "activities" as HomeTab, icon: Target, label: "Activities" },
    { id: "events" as HomeTab, icon: CalendarDays, label: "Events" },
  ];

  const isLoading =
    (activeTab === "activities" && activitiesLoading) ||
    (activeTab === "events" && eventsLoading) ||
    (activeTab === "discussions" && (newsLoading || pollsLoading || questionsLoading || discussionsLoading));

  const getCreatePath = () => {
    switch (activeTab) {
      case "activities": return "/create-activity";
      case "events": return "/create-event";
      case "discussions":
        switch (discussSubTab) {
          case "news": return "/create-news";
          case "polls": return "/create-poll";
          case "issues": return "/create-discussion";
          case "general": return "/create-discussion";
          default: return "/create-discussion";
        }
      default: return "/create-activity";
    }
  };

  const getCategories = () => {
    switch (activeTab) {
      case "activities": return ["All", ...ACTIVITY_CATEGORIES];
      case "events": return ["All", "Music", "Sports", "Tech", "Business", "Food", "Art", "Health", "Networking", "Education", "Entertainment", "College", "Startups"];
      case "discussions": return DISCUSSION_CATEGORIES[discussSubTab] || ["All"];
      default: return ["All"];
    }
  };

  // Get title label based on section type
  const getTitleLabel = (type: string) => {
    switch (type) {
      case 'news': return 'Headline';
      case 'poll': return 'Question';
      case 'issue': return 'Issue';
      case 'general': return 'Topic';
      default: return 'Title';
    }
  };

  // Reddit-like Discussion Card Component - Simplified
  const DiscussionCard = ({ item, type }: { item: any; type: string }) => {
    const user = getUserById(item.userId);
    const discussCount = item.commentsCount || item.answersCount || 0;

    return (
      <button
        onClick={() => {
          if (type === 'news') setLocation(`/news/${item.id}`);
          else if (type === 'poll') setLocation(`/poll/${item.id}`);
          else if (type === 'issue') setLocation(`/discussion/${item.id}`);
          else setLocation(`/discussion/${item.id}`);
        }}
        className="w-full text-left bg-card rounded-xl p-4 border border-border hover:bg-muted/50 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{getTimeAgo(item.createdAt || item.publishedAt)}</span>
          </div>
          {item.category && (
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground line-clamp-2">
          {item.title || item.headline || item.question}
        </h3>

        {/* Poll options preview - keep for polls only */}
        {type === 'poll' && item.options && (
          <div className="space-y-1 mt-2">
            {item.options.slice(0, 2).map((opt: any, idx: number) => (
              <div key={idx} className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1">
                {opt.text || opt}
              </div>
            ))}
            {item.options.length > 2 && (
              <span className="text-xs text-primary">+{item.options.length - 2} more options</span>
            )}
          </div>
        )}

        {/* Footer - Discuss button */}
        <div className="flex items-center gap-4 text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5 text-primary">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{discussCount} {discussCount === 1 ? 'discuss' : 'discusses'}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      <div className="max-w-md mx-auto">
        {/* Custom Tab Navigation - Segmented Control Style */}
        <div className="sticky top-0 z-10 bg-background pt-2 pb-2 border-b border-border/50">
          <div className="mx-4 bg-muted/50 p-1 rounded-xl flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium
                    ${isActive
                      ? "bg-background text-foreground shadow-sm relative z-10"
                      : "text-muted-foreground hover:text-foreground/80 hover:bg-background/30"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discussion Sub-tabs */}
        {activeTab === "discussions" && (
          <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm overflow-x-auto scrollbar-hide">
            <div className="flex px-2">
              {discussSubTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = discussSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setDiscussSubTab(tab.id);
                      setSelectedCategory("All");
                    }}
                    className={`flex items-center gap-2 px-4 py-3 transition-colors relative whitespace-nowrap
                      ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80"}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                    <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>{tab.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Bar with Create Button */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`Search ${activeTab === "discussions" ? discussSubTab : activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-full bg-muted border-0"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background/50 rounded-full transition-colors">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <Button
              onClick={() => setLocation(getCreatePath())}
              className="w-11 h-11 rounded-full bg-gradient-primary text-white p-0"
              data-testid="create-button"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="p-4 border-b border-border">
          <CategoryPills
            categories={getCategories()}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <SkeletonList count={3} />
        )}

        {/* Pull to refresh indicator */}
        {canRefresh && !isRefreshing && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
            Pull to refresh
          </div>
        )}

        {/* Refreshing indicator */}
        {isRefreshing && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            Refreshing...
          </div>
        )}

        {/* Discussions Tab Content */}
        {!isLoading && activeTab === "discussions" && (
          <div className="p-4 space-y-3">
            {discussSubTab === "news" && (
              filteredNews.length === 0 ? (
                <div className="text-center py-12">
                  <Newspaper className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No news yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/create-news")}>
                    Share News
                  </Button>
                </div>
              ) : filteredNews.map((item) => (
                <DiscussionCard key={item.id} item={item} type="news" />
              ))
            )}

            {discussSubTab === "polls" && (
              filteredPolls.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No polls yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/create-poll")}>
                    Create Poll
                  </Button>
                </div>
              ) : filteredPolls.map((item) => (
                <DiscussionCard key={item.id} item={item} type="poll" />
              ))
            )}

            {discussSubTab === "issues" && (
              filteredDiscussions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquareMore className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No issues reported yet</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/create-discussion")}>
                    Report Issue
                  </Button>
                </div>
              ) : filteredDiscussions.map((item) => (
                <DiscussionCard key={item.id} item={item} type="issue" />
              ))
            )}

            {discussSubTab === "general" && (
              (() => {
                // Merge discussions and questions for general tab, remove duplicates by id
                const allGeneralItems = [...filteredDiscussions, ...filteredQuestions];
                const uniqueItems = allGeneralItems.filter((item, index, self) =>
                  index === self.findIndex((t) => t.id === item.id)
                );

                return uniqueItems.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No discussions yet</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/create-discussion")}>
                      Start Discussion
                    </Button>
                  </div>
                ) : uniqueItems.map((item) => (
                  <DiscussionCard key={item.id} item={item} type="general" />
                ));
              })()
            )}
          </div>
        )}

        {/* Activities Tab Content */}
        {!isLoading && activeTab === "activities" && (
          <div>
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No activities yet. Create one to get started!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setLocation("/create-activity")}
                >
                  Create Activity
                </Button>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const isOwnPost = activity.userId === currentUserId;
                const user = isOwnPost
                  ? { id: currentUserId, name: "You", username: "@you", avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}` }
                  : getUserById(activity.userId);
                return (
                  <ActivityCard
                    key={activity.id}
                    id={activity.id}
                    author={{
                      id: user.id,
                      name: user.name || "User",
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
                    isOwnPost={isOwnPost}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Events Tab Content */}
        {!isLoading && activeTab === "events" && (
          <div className="p-4 space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No events found. Create one to get started!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setLocation("/create-event")}
                >
                  Create Event
                </Button>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const user = getUserById(event.userId);
                const isOwnEvent = event.userId === currentUserId;
                return (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    imageUrl={event.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
                    host={{
                      id: event.userId,
                      name: isOwnEvent ? "You" : (user.name || "Unknown"),
                      username: user.username || "@user",
                      avatar: user.avatarUrl || undefined,
                    }}
                    date={format(new Date(event.startDate), "EEE, d MMM • h:mm a")}
                    location={event.location}
                    attendeesCount={event.attendeesCount || 0}
                    entryType={event.entryType}
                    price={event.price || undefined}
                    categories={event.category ? (Array.isArray(event.category) ? event.category : [event.category]) : []}
                    isOwnEvent={isOwnEvent}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
