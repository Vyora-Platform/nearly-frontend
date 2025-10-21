import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Home from "@/pages/Home";
import Events from "@/pages/Events";
import Groups from "@/pages/Groups";
import News from "@/pages/News";
import Profile from "@/pages/Profile";
import EventDetails from "@/pages/EventDetails";
import ActivityDetails from "@/pages/ActivityDetails";
import GroupChat from "@/pages/GroupChat";
import Notifications from "@/pages/Notifications";
import DirectChat from "@/pages/DirectChat";
import MyGroups from "@/pages/MyGroups";
import Settings from "@/pages/Settings";
import SignIn from "@/pages/SignIn";

interface User {
  id: string;
  googleId: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

function ProtectedRouter() {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  useEffect(() => {
    if (!isLoading && !user && location !== "/sign-in") {
      setLocation("/sign-in");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/sign-in" component={SignIn} />
      <Route path="/" component={Home} />
      <Route path="/events" component={Events} />
      <Route path="/event/:id" component={EventDetails} />
      <Route path="/activity/:id" component={ActivityDetails} />
      <Route path="/groups" component={Groups} />
      <Route path="/my-groups" component={MyGroups} />
      <Route path="/group/:id/chat" component={GroupChat} />
      <Route path="/news" component={News} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/chat/:username" component={DirectChat} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-md mx-auto bg-background min-h-screen">
          <Toaster />
          <ProtectedRouter />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
