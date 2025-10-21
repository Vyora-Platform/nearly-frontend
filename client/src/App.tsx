import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
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
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
