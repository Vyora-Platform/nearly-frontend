import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: api.getEvents,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const userIds = Array.from(new Set(events.map(e => e.userId)));
      return Promise.all(userIds.map(id => api.getUser(id).catch(() => null)));
    },
    enabled: events.length > 0,
  });

  const getUserById = (userId: string) => {
    const user = users.find(u => u?.id === userId);
    return user || { 
      id: userId, 
      name: "Unknown User", 
      username: "@user",
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${userId}` 
    };
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === "" || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Events" showActions={false} />

      <div className="max-w-md mx-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar
                placeholder="Search events by name, host, or location"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-primary text-white h-11 px-4 gap-2"
              data-testid="button-create-event"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </div>

          <CategoryPills
            categories={["All", "College", "Sports", "Startups"]}
            onSelect={setSelectedCategory}
          />

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-muted h-10">
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="tab-saved">
                Saved
              </TabsTrigger>
              <TabsTrigger value="my-events" data-testid="tab-my-events">
                My Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No events found. Create one to get started!
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const user = getUserById(event.userId);
                  return (
                    <EventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      imageUrl={event.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"}
                      host={{
                        name: user.name || "Unknown",
                        username: user.username || "@user",
                        avatar: user.avatarUrl || undefined,
                      }}
                      date={format(new Date(event.startDate), "EEE, d MMM • h:mm a")}
                      location={event.location}
                      attendeesCount={event.attendeesCount || 0}
                      entryType={event.entryType}
                      price={event.price || undefined}
                      categories={event.category || []}
                    />
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">No saved events yet</p>
              </div>
            </TabsContent>

            <TabsContent value="my-events" className="mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">You haven't created any events</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
