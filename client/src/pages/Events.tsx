import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// TODO: remove mock data
const mockEvents = [
  {
    id: "1",
    title: "TechSparks 2024",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    host: {
      name: "TechHub",
      username: "@techub",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TH",
    },
    date: "Fri, 15 Dec • 10:00 AM",
    location: "Bangalore International Centre",
    attendeesCount: 125,
    entryType: "FREE",
    categories: ["TECH", "STARTUP"],
  },
  {
    id: "2",
    title: "Rang Barse - Holi Festival",
    imageUrl: "https://images.unsplash.com/photo-1583338506904-91cfd5c67a9b?w=800",
    host: {
      name: "Delhi Events",
      username: "@delhievents",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=DE",
    },
    date: "Mon, 25 Mar • 11:00 AM",
    location: "Jawaharlal Nehru Stadium, Delhi",
    attendeesCount: 500,
    entryType: "PAID",
    price: 500,
    categories: ["FESTIVAL"],
  },
  {
    id: "3",
    title: "KalaKriti Art Fair",
    imageUrl: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800",
    host: {
      name: "Mumbai Art",
      username: "@mumbaiart",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MA",
    },
    date: "Sat, 20 Jan • 12:00 PM",
    location: "Mumbai Art Gallery",
    attendeesCount: 42,
    entryType: "SPONSORED",
    categories: ["ART"],
  },
];

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");

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
              {mockEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
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
