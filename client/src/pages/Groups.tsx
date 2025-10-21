import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import GroupCard from "@/components/GroupCard";
import SearchBar from "@/components/SearchBar";
import CategoryPills from "@/components/CategoryPills";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

export default function Groups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tech");
  const [, setLocation] = useLocation();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: api.getGroups,
  });

  const filteredGroups = groups.filter(group => {
    const matchesSearch = searchQuery === "" || 
      group.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar title="Groups" showActions={false} />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

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
              onClick={() => setLocation("/create-group")}
              data-testid="button-create-group"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>

          <CategoryPills
            categories={["Tech", "Startups", "Fitness", "Gaming"]}
            onSelect={setSelectedCategory}
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
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No groups found. Create one to get started!
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    id={group.id}
                    name={group.name}
                    imageUrl={group.imageUrl || undefined}
                    category={group.category || "General"}
                    membersCount={group.membersCount || 0}
                    groupType={group.groupType as "Public" | "Private" | "Invite-only"}
                  />
                ))
              )}
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
