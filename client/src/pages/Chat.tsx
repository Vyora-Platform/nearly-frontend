import { useState } from "react";
import { User, Users, Shuffle } from "lucide-react";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import FriendsChat from "@/pages/FriendsChat";
import GroupsDiscover from "@/pages/GroupsDiscover";
import RandomChat from "@/pages/RandomChat";

type ChatTab = "random" | "friends" | "groups";
type RandomChatState = "idle" | "searching" | "connected" | "disconnected";

export default function Chat() {
  const [activeTab, setActiveTab] = useState<ChatTab>("random");
  const [isRandomFullScreen, setIsRandomFullScreen] = useState(false);
  const [randomChatState, setRandomChatState] = useState<RandomChatState>("idle");

  const tabs = [
    { id: "random" as ChatTab, icon: Shuffle, label: "Random" },
    { id: "friends" as ChatTab, icon: User, label: "Friends" },
    { id: "groups" as ChatTab, icon: Users, label: "Groups" },
  ];

  // Show footer for friends, groups, OR when random is in idle state
  const showFooter = activeTab !== "random" || (activeTab === "random" && randomChatState === "idle");

  return (
    <div className={`min-h-screen bg-background ${showFooter ? "pb-20" : ""}`}>
      {/* Show Header & Tabs only if not in full screen mode */}
      {!isRandomFullScreen && (
        <>
          <TopBar title="Chat" showActions={false} />

          {/* Native Tab Navigation */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 py-3 border-b border-border/50">
            <div className="flex bg-muted/50 p-1 rounded-xl">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold
                      ${isActive
                        ? "bg-gradient-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"}`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Tab Content */}
      <div className={`${activeTab === "random"
        ? (isRandomFullScreen ? "fixed inset-0 z-50 bg-background h-screen w-screen" : "h-[calc(100vh-112px)]")
        : "max-w-md mx-auto"}`}>
        {activeTab === "friends" && <FriendsChat />}
        {activeTab === "groups" && <GroupsDiscover />}
        {activeTab === "random" && (
          <RandomChat
            onFullScreenChange={setIsRandomFullScreen}
            onChatStateChange={setRandomChatState}
          />
        )}
      </div>

      {showFooter && !isRandomFullScreen && <BottomNav />}
    </div>
  );
}
