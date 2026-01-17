import { useState } from "react";
import { User, Users, Shuffle } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import FriendsChat from "@/pages/FriendsChat";
import GroupsDiscover from "@/pages/GroupsDiscover";
import RandomChat from "@/pages/RandomChat";

type ChatTab = "friends" | "groups" | "random";

export default function Chat() {
  const [activeTab, setActiveTab] = useState<ChatTab>("friends");

  const tabs = [
    { id: "friends" as ChatTab, icon: User, label: "Friends" },
    { id: "groups" as ChatTab, icon: Users, label: "Groups" },
    { id: "random" as ChatTab, icon: Shuffle, label: "Random" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Chat" showActions={false} />

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
      <div className="max-w-md mx-auto">
        {activeTab === "friends" && <FriendsChat />}
        {activeTab === "groups" && <GroupsDiscover />}
        {activeTab === "random" && <RandomChat />}
      </div>

      <BottomNav />
    </div>
  );
}

