import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationBanner from "@/components/NotificationBanner";
import NetworkStatus from "@/components/NetworkStatus";

// Native app detection utility
const isNativeApp = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  return userAgent.includes('Median') ||
         userAgent.includes('WebView') ||
         userAgent.includes('wv') ||
         window.ReactNativeWebView !== undefined;
};
import Home from "@/pages/Home";
import Events from "@/pages/Events";
import CreateEvent from "@/pages/CreateEvent";
import CreateActivity from "@/pages/CreateActivity";
import CreateGroup from "@/pages/CreateGroup";
import Groups from "@/pages/Groups";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import EventDetails from "@/pages/EventDetails";
import ActivityDetails from "@/pages/ActivityDetails";
import GroupChat from "@/pages/GroupChat";
import Notifications from "@/pages/Notifications";
import DirectChat from "@/pages/DirectChat";
import MyGroups from "@/pages/MyGroups";
import Settings from "@/pages/Settings";
import ProfileSettings from "@/pages/ProfileSettings";
import EditProfile from "@/pages/EditProfile";
import LoginActivity from "@/pages/LoginActivity";
import FollowersFollowing from "@/pages/FollowersFollowing";
import PostDetail from "@/pages/PostDetail";
import Moments from "@/pages/Moments";
import CreateMoment from "@/pages/CreateMoment";
import Discover from "@/pages/Discover";
import CreateJob from "@/pages/CreateJob";
import CreateDeal from "@/pages/CreateDeal";
import CreatePlace from "@/pages/CreatePlace";
import CreatePage from "@/pages/CreatePage";
import JobDetail from "@/pages/JobDetail";
import DealDetail from "@/pages/DealDetail";
import PlaceDetail from "@/pages/PlaceDetail";
import PageDetail from "@/pages/PageDetail";
import GroupDetails from "@/pages/GroupDetails";
import GroupSettings from "@/pages/GroupSettings";
import Splash from "@/pages/Splash";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyOtp from "@/pages/VerifyOtp";
import ResetPassword from "@/pages/ResetPassword";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
// New pages for Discuss module
import Discuss from "@/pages/Discuss";
import CreatePost from "@/pages/CreatePost";
import CreatePoll from "@/pages/CreatePoll";
import CreateQuestion from "@/pages/CreateQuestion";
import CreateDiscussion from "@/pages/CreateDiscussion";
// Detail pages for discussions
import NewsDetail from "@/pages/NewsDetail";
import PollDetail from "@/pages/PollDetail";
import DiscussionDetail from "@/pages/DiscussionDetail";
import CreateNews from "@/pages/CreateNews";
// Shots module
import Shots from "@/pages/Shots";
import CreateShot from "@/pages/CreateShot";
import ShotDetail from "@/pages/ShotDetail";

// Protected route wrapper - redirects to splash/welcome if not authenticated
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const hasVisited = localStorage.getItem("nearly_has_visited");
    const isAuthenticated = localStorage.getItem("nearly_onboarding_complete");
    
    if (!hasVisited) {
      // First time visitor - show splash
      localStorage.setItem("nearly_has_visited", "true");
      setLocation("/splash");
    } else if (!isAuthenticated) {
      // Has visited before but not logged in - show welcome
      setLocation("/welcome");
    } else {
      setIsChecking(false);
    }
  }, [setLocation]);

  if (isChecking) {
    const hasVisited = localStorage.getItem("nearly_has_visited");
    const isAuthenticated = localStorage.getItem("nearly_onboarding_complete");
    if (!hasVisited || !isAuthenticated) {
      return null; // Will redirect
    }
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/splash" component={Splash} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify-otp" component={VerifyOtp} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Main app routes */}
      <Route path="/">{() => <ProtectedRoute component={Home} />}</Route>
      <Route path="/events" component={Events} />
      <Route path="/create-event" component={CreateEvent} />
      <Route path="/create-activity" component={CreateActivity} />
      <Route path="/event/:id" component={EventDetails} />
      <Route path="/activity/:id" component={ActivityDetails} />
      <Route path="/chat" component={Chat} />
      <Route path="/groups" component={Groups} />
      <Route path="/create-group" component={CreateGroup} />
      <Route path="/my-groups" component={MyGroups} />
      <Route path="/group/:id/chat" component={GroupChat} />
      <Route path="/group/:id/details" component={GroupDetails} />
      <Route path="/group/:id/settings" component={GroupSettings} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/chat/:username" component={DirectChat} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile-settings" component={ProfileSettings} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/login-activity" component={LoginActivity} />
      <Route path="/followers-following/:username/:tab" component={FollowersFollowing} />
      <Route path="/followers-following/:username" component={FollowersFollowing} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/moments" component={Moments} />
      <Route path="/create-moment" component={CreateMoment} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/profile" component={Profile} />
      <Route path="/discover" component={Discover} />
      <Route path="/create-job" component={CreateJob} />
      <Route path="/create-deal" component={CreateDeal} />
      <Route path="/create-place" component={CreatePlace} />
      <Route path="/create-page" component={CreatePage} />
      <Route path="/job/:id" component={JobDetail} />
      <Route path="/deal/:id" component={DealDetail} />
      <Route path="/place/:id" component={PlaceDetail} />
      <Route path="/page/:id" component={PageDetail} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      {/* Discuss module routes */}
      <Route path="/discuss" component={Discuss} />
      <Route path="/create-post" component={CreatePost} />
      <Route path="/create-poll" component={CreatePoll} />
      <Route path="/create-question" component={CreateQuestion} />
      <Route path="/create-discussion" component={CreateDiscussion} />
      <Route path="/create-news" component={CreateNews} />
      {/* Detail pages for discussions */}
      <Route path="/news/:id" component={NewsDetail} />
      <Route path="/poll/:id" component={PollDetail} />
      <Route path="/discussion/:id" component={DiscussionDetail} />
      {/* Shots module routes */}
      <Route path="/shots" component={Shots} />
      <Route path="/create-shot" component={CreateShot} />
      <Route path="/shot/:id" component={ShotDetail} />
    </Switch>
  );
}

function App() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className={`max-w-md mx-auto bg-background min-h-screen ${isNative ? 'native-app' : ''}`}>
            <NotificationBanner />
            <NetworkStatus />
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
