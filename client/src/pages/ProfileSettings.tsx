import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ChevronRight,
  User,
  Lock,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Globe,
  Eye,
  EyeOff,
  Mail,
  Key,
  Download,
  Check,
  X,
  Bookmark,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const userId = localStorage.getItem("nearly_user_id");
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!userId,
  });

  const [editMode, setEditMode] = useState<string | null>(null);

  const [privacySettings, setPrivacySettings] = useState({
    privateAccount: false,
    activityStatus: true,
    storySharing: true,
    messageFromEveryone: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [messageSettings, setMessageSettings] = useState({
    allowFromEveryone: false,
    allowFromFollowers: true,
    allowFromFollowing: true,
    allowFromNoOne: false,
  });

  // Fetch saved posts for the saved items section
  const { data: savedPosts = [] } = useQuery({
    queryKey: ["saved-posts", userId],
    queryFn: async () => {
      const savedIds = JSON.parse(
        localStorage.getItem("nearly_saved_posts") || "[]"
      );
      if (savedIds.length === 0) return [];
      const activities = await Promise.all(
        savedIds.map((id: string) => api.getActivity(id).catch(() => null))
      );
      return activities.filter(Boolean);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (user) {
      setPrivacySettings({
        privateAccount: user.isPrivate || false,
        activityStatus: user.showActivityStatus !== false,
        storySharing: user.allowStorySharing !== false,
        messageFromEveryone: user.messagePrivacy === "everyone",
      });

      const messagePrivacy = user.messagePrivacy || "everyone";
      setMessageSettings({
        allowFromEveryone: messagePrivacy === "everyone",
        allowFromFollowers: messagePrivacy === "followers",
        allowFromFollowing: messagePrivacy === "following",
        allowFromNoOne: messagePrivacy === "noone",
      });
    }
  }, [user]);

  const changePasswordMutation = useMutation({
    mutationFn: (data: typeof passwordData) =>
      api.changePassword(user?.id || "", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setEditMode(null);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Failed to change password. Please check your current password and try again.",
        variant: "destructive",
      });
    },
  });

  const savePrivacySettingsMutation = useMutation({
    mutationFn: (settings: typeof privacySettings) => {
      const messagePrivacy = messageSettings.allowFromEveryone
        ? "everyone"
        : messageSettings.allowFromFollowing
          ? "following"
          : messageSettings.allowFromFollowers
            ? "followers"
            : "noone";

      return api.updateUser(user?.id || "", {
        isPrivate: settings.privateAccount,
        showActivityStatus: settings.activityStatus,
        allowStorySharing: settings.storySharing,
        messagePrivacy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast({
        title: "Settings saved",
        description: "Your privacy settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description:
          "Please make sure your new password and confirmation match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };



  const settingsSections = [
    {
      title: "ACCOUNT",
      items: [
        {
          id: "edit-profile",
          label: "Edit Profile",
          icon: User,
          onClick: () => setLocation("/edit-profile"),
        },
        {
          id: "change-password",
          label: "Change Password",
          icon: Key,
          onClick: () => setEditMode("password"),
        },
        {
          id: "saved",
          label: "Saved",
          icon: Bookmark,
          onClick: () => setEditMode("saved"),
          badge: savedPosts.length > 0 ? savedPosts.length : undefined,
        },

      ],
    },
    {
      title: "PRIVACY",
      items: [
        {
          id: "account-privacy",
          label: "Private Account",
          description: "Only approved followers can see your content",
          icon: privacySettings.privateAccount ? EyeOff : Eye,
          type: "toggle",
          value: privacySettings.privateAccount,
          onToggle: (checked: boolean) => {
            const newSettings = { ...privacySettings, privateAccount: checked };
            setPrivacySettings(newSettings);
            savePrivacySettingsMutation.mutate(newSettings);
          },
        },
        {
          id: "activity-status",
          label: "Show Activity Status",
          description: "Let others see when you're active",
          icon: Bell,
          type: "toggle",
          value: privacySettings.activityStatus,
          onToggle: (checked: boolean) => {
            const newSettings = { ...privacySettings, activityStatus: checked };
            setPrivacySettings(newSettings);
            savePrivacySettingsMutation.mutate(newSettings);
          },
        },

      ],
    },
    {
      title: "SUPPORT & ABOUT",
      items: [
        {
          id: "help",
          label: "Help Center",
          icon: HelpCircle,
          onClick: () => console.log("Help"),
        },
        {
          id: "privacy-policy",
          label: "Privacy Policy",
          icon: Shield,
          onClick: () => setLocation("/privacy-policy"),
        },
        {
          id: "terms",
          label: "Terms of Use",
          icon: FileText,
          onClick: () => setLocation("/terms-of-use"),
        },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => setLocation("/profile")}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="pb-8">
        {/* Profile Preview */}
        <div className="p-4 border-b border-border">
          <button
            className="flex items-center gap-4 w-full text-left"
            onClick={() => setLocation("/edit-profile")}
          >
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{user?.name || "User"}</h2>
              <p className="text-sm text-muted-foreground">
                @{user?.username || "username"}
              </p>
              <p className="text-sm text-primary mt-1">Edit profile</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Change Password Modal */}
        {editMode === "password" && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-background rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Change Password</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditMode(null);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Saved Posts Modal */}
        {editMode === "saved" && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-background rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Saved</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4">
                {savedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {savedPosts.map((activity: any) => (
                      <button
                        key={activity.id}
                        onClick={() => {
                          setEditMode(null);
                          setLocation(`/activity/${activity.id}`);
                        }}
                        className="aspect-square relative overflow-hidden bg-muted"
                      >
                        {activity.imageUrl ? (
                          <img
                            src={activity.imageUrl}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <span className="text-xl">📝</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="font-semibold">No Saved Posts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tap the bookmark icon on any post to save it
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? "mt-6" : "mt-0"}>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase">
              {section.title}
            </p>
            <div className="bg-background">
              {section.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                const isLast = itemIndex === section.items.length - 1;

                if (
                  "type" in item &&
                  item.type === "toggle" &&
                  "value" in item &&
                  "onToggle" in item
                ) {
                  return (
                    <div
                      key={item.id}
                      className={`w-full flex items-center gap-4 px-4 py-4 ${!isLast ? "border-b border-border" : ""
                        }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        {"description" in item && item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={item.value as boolean}
                        onCheckedChange={item.onToggle as (checked: boolean) => void}
                      />
                    </div>
                  );
                }

                if (!("onClick" in item)) return null;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors ${!isLast ? "border-b border-border" : ""
                      }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {(item as any).label}
                      </p>
                      {"description" in item && (item as any).description && (
                        <p className="text-xs text-muted-foreground">
                          {(item as any).description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {"badge" in item && item.badge && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="mt-8 px-4">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 text-destructive border-destructive hover:bg-destructive/10 h-12"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </Button>
        </div>

        {/* App Version */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Nearly v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
