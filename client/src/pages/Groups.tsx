import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import GroupCard from "@/components/GroupCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// TODO: remove mock data
const mockGroups = [
  {
    id: "1",
    name: "Kanpur Startups",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
    category: "Startups",
    membersCount: 1200,
    groupType: "Public" as const,
  },
  {
    id: "2",
    name: "Delhi Foodies",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
    category: "Foodies",
    membersCount: 875,
    groupType: "Private" as const,
  },
  {
    id: "3",
    name: "Bangalore Tech Hub",
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400",
    category: "Tech",
    membersCount: 5600,
    groupType: "Public" as const,
  },
  {
    id: "4",
    name: "Mumbai Movie Club",
    imageUrl: "https://images.unsplash.com/photo-1574267432644-f347f1c40326?w=400",
    category: "Movies",
    membersCount: 2100,
    groupType: "Public" as const,
  },
];

export default function Groups() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Groups" showActions={false} />

      <div className="max-w-md mx-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchBar
                placeholder="Search groups..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-primary text-white h-11 px-4 gap-2"
              data-testid="button-create-group"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>

          <CategoryPills
            categories={["Tech", "Startups", "Fitness", "Gaming"]}
          />

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-muted h-10">
              <TabsTrigger value="my-groups" data-testid="tab-my-groups">
                My Groups
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all-groups">
                All Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4 space-y-4">
              {mockGroups.map((group) => (
                <GroupCard key={group.id} {...group} />
              ))}
            </TabsContent>

            <TabsContent value="my-groups" className="mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">You haven't joined any groups yet</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
