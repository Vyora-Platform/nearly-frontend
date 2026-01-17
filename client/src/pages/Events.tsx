import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import { Plus, Calendar, Heart, User, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useLocation } from "wouter";

type EventTab = "upcoming" | "saved" | "my-events";

export default function Events() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<EventTab>("upcoming");

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: () => api.getEvents(),
  });

  // Get current user ID for "My Events" tab
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const userIds = Array.from(new Set(events?.map(e => e.userId) || []));
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: events && events.length > 0,
  });

  const getUserById = (userId: string) => {
    // Check if this is the current user
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

  // Fetch user's events
  const { data: myEvents = [] } = useQuery({
    queryKey: ["user-events", currentUserId],
    queryFn: () => api.getUserEvents(currentUserId),
    enabled: !!currentUserId && activeTab === "my-events",
  });

  const filteredEvents = events && Array.isArray(events)
    ? events.filter(event => {
        // Search filter
        const matchesSearch = searchQuery === "" ||
          event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter - handle both string and array categories
        let matchesCategory = selectedCategory === "All";
        if (!matchesCategory) {
          if (Array.isArray(event.category)) {
            matchesCategory = event.category.some(cat => 
              cat.toLowerCase() === selectedCategory.toLowerCase()
            );
          } else if (typeof event.category === 'string') {
            matchesCategory = event.category.toLowerCase() === selectedCategory.toLowerCase();
          }
        }

        return matchesSearch && matchesCategory;
      })
    : [];
  
  // Filter my events
  const filteredMyEvents = myEvents && Array.isArray(myEvents)
    ? myEvents.filter(event => {
        const matchesSearch = searchQuery === "" ||
          event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
    : [];

  const tabs = [
    { id: "upcoming" as EventTab, icon: Calendar, label: "Upcoming" },
    { id: "saved" as EventTab, icon: Heart, label: "Saved" },
    { id: "my-events" as EventTab, icon: User, label: "My Events" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="Events" showActions={false} />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="Events" showActions={false} />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Failed to load events</p>
            <p className="text-sm text-muted-foreground">
              Please check your database connection and try again.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Events" showActions={false} />

      <div className="max-w-md mx-auto">
        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events by name, host, or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-full bg-muted border-0"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background/50 rounded-full transition-colors">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">

          <Button
            variant="default"
            size="sm"
            className="w-full h-12 bg-gradient-primary text-white"
            onClick={() => setLocation("/create-event")}
            data-testid="button-create-event"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Event
          </Button>

          <CategoryPills
            categories={["All", "Music", "Sports", "Tech", "Business", "Food", "Art", "Health", "Networking", "Education", "Entertainment", "College", "Startups"]}
            onSelect={setSelectedCategory}
          />

          {/* Custom Tab Navigation */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 transition-all relative
                      ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                    <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-4 space-y-4">
            {activeTab === "upcoming" && (
              <>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No events found. Create one to get started!
                    </p>
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
              </>
            )}

            {activeTab === "saved" && (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No saved events yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Events you save will appear here
                </p>
              </div>
            )}

            {activeTab === "my-events" && (
              <>
                {filteredMyEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">You haven't created any events</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setLocation("/create-event")}
                    >
                      Create your first event
                    </Button>
                  </div>
                ) : (
                  filteredMyEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      imageUrl={event.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
                      host={{
                        name: "You",
                        username: "@you",
                        avatar: undefined,
                      }}
                      date={format(new Date(event.startDate), "EEE, d MMM • h:mm a")}
                      location={event.location}
                      attendeesCount={event.attendeesCount || 0}
                      entryType={event.entryType}
                      price={event.price || undefined}
                      categories={event.category ? [event.category] : []}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
