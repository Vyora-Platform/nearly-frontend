import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Settings, Bell, BellOff, Image, Link2, FileText,
  Users, UserPlus, Crown, Shield, LogOut, Trash2, Search,
  MoreVertical, Camera, Edit2, ChevronRight, Lock, Globe,
  MessageCircle, Star, Ban, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: "admin" | "member";
  isOnline?: boolean;
  joinedAt?: string;
}

interface MediaItem {
  id: string;
  type: "image" | "video" | "document" | "link";
  url: string;
  thumbnail?: string;
  name?: string;
  createdAt: string;
}

export default function GroupDetails() {
  const [, params] = useRoute("/group/:id/details");
  const [, setLocation] = useLocation();
  const groupId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  
  const [isMuted, setIsMuted] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"media" | "links" | "docs">("media");

  // Fetch group data from API
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId!),
    enabled: !!groupId,
  });

  // Fetch group members from API
  const { data: membersData = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => api.getGroupMembers(groupId!),
    enabled: !!groupId,
  });

  // Transform members data to match expected interface
  const members: Member[] = membersData.map((member: any) => ({
    id: member.id || member.userId,
    name: member.name || member.username || 'Unknown',
    username: member.username || member.name?.toLowerCase().replace(/\s+/g, '_') || 'user',
    avatarUrl: member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`,
    role: member.role === 'admin' || member.isAdmin ? 'admin' : 'member',
    isOnline: member.isOnline || false,
  }));

  // Media, links, documents - empty arrays as we don't have these endpoints yet
  const mediaItems: MediaItem[] = [];
  const links: { id: string; title: string; url: string; createdAt: string }[] = [];
  const documents: { id: string; name: string; size: string; createdAt: string }[] = [];

  // Check if current user is admin
  const isAdmin = members.some(m => m.id === currentUserId && m.role === 'admin') || 
                  group?.userId === currentUserId;
  const admins = members.filter(m => m.role === "admin");
  const regularMembers = members.filter(m => m.role === "member");

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () => api.joinGroup(groupId!, currentUserId), // This endpoint handles both join and leave
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: "Left group", description: "You have left the group." });
      setLocation("/groups");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to leave group.", variant: "destructive" });
    },
  });

  // Delete group mutation  
  const deleteGroupMutation = useMutation({
    mutationFn: () => api.deleteGroup(groupId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: "Deleted", description: "Group has been deleted." });
      setLocation("/groups");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete group.", variant: "destructive" });
    },
  });

  const handleLeaveGroup = () => {
    leaveGroupMutation.mutate();
    setShowLeaveDialog(false);
  };

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate();
    setShowDeleteDialog(false);
  };

  // Loading state
  if (groupLoading || membersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (groupError || !group) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Group not found</p>
        <Button onClick={() => setLocation("/groups")}>Back to Groups</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation(`/group/${groupId}/chat`)}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Group Info</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setLocation(`/group/${groupId}/settings`)}
              className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors"
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Group Header Card */}
      <div className="p-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Cover/Avatar Section */}
          <div className="relative h-32 bg-gradient-primary">
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="relative px-4 pb-4">
            <div className="flex justify-between items-end -mt-12">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-card">
                  <AvatarImage src={group.imageUrl} />
                  <AvatarFallback className="text-2xl bg-gradient-primary text-white">
                    {group.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {group.groupType === "Public" ? (
                    <><Globe className="w-3 h-3 mr-1" /> Public</>
                  ) : (
                    <><Lock className="w-3 h-3 mr-1" /> Private</>
                  )}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {group.category}
                </Badge>
              </div>
            </div>

            {/* Group Name & Description */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
                {isAdmin && (
                  <button className="p-1 hover:bg-muted rounded-full">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Group · {group.membersCount.toLocaleString()} members
              </p>
            </div>

            {/* Description */}
            <div className="mt-4 p-3 bg-muted/50 rounded-xl">
              <p className="text-sm text-foreground leading-relaxed">
                {group.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Created on {new Date(group.createdAt).toLocaleDateString("en-US", { 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          <button
            onClick={() => setLocation(`/group/${groupId}/chat`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-primary text-white rounded-xl font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            Message
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium border ${
              isMuted ? "bg-muted text-muted-foreground border-border" : "bg-card text-foreground border-border"
            }`}
          >
            {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-card text-foreground rounded-xl font-medium border border-border">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media, Links, Docs */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Tab Header */}
          <div className="flex border-b border-border">
            {[
              { id: "media", label: "Media", icon: Image, count: mediaItems.length },
              { id: "links", label: "Links", icon: Link2, count: links.length },
              { id: "docs", label: "Docs", icon: FileText, count: documents.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMediaTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium relative ${
                  activeMediaTab === tab.id ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeMediaTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
                {activeMediaTab === tab.id && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3">
            {activeMediaTab === "media" && (
              <div className="grid grid-cols-3 gap-1">
                {mediaItems.map((item) => (
                  <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {activeMediaTab === "links" && (
              <div className="space-y-2">
                {links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}

            {activeMediaTab === "docs" && (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.size}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View All Button */}
          <button className="w-full py-3 text-sm text-primary font-medium border-t border-border hover:bg-muted/50 transition-colors">
            View All
          </button>
        </div>
      </div>

      {/* Members Section */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {group.membersCount.toLocaleString()} Members
              </span>
            </div>
            <button className="p-1 hover:bg-muted rounded-full">
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Add Participants (Admin only) */}
          {isAdmin && (
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">Add Participants</span>
            </button>
          )}

          {/* Invite Link */}
          <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-primary">Invite via Link</p>
              <p className="text-xs text-muted-foreground">Share group link with others</p>
            </div>
          </button>

          {/* Admins */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Admins · {admins.length}
            </p>
          </div>
          {admins.map((member) => (
            <MemberItem key={member.id} member={member} isAdmin={isAdmin} currentUserIsAdmin={isAdmin} />
          ))}

          {/* Members */}
          <div className="px-4 pt-4 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Members · {regularMembers.length}
            </p>
          </div>
          {regularMembers.slice(0, 5).map((member) => (
            <MemberItem key={member.id} member={member} isAdmin={false} currentUserIsAdmin={isAdmin} />
          ))}

          {regularMembers.length > 5 && (
            <button className="w-full py-3 text-sm text-primary font-medium border-t border-border hover:bg-muted/50 transition-colors">
              View All Members
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Exit Group</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors border-t border-border"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave Group Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit "{group.name}"? You will no longer receive messages from this group.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveGroup}>
              Exit Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone and all messages will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Member Item Component
function MemberItem({ 
  member, 
  isAdmin, 
  currentUserIsAdmin 
}: { 
  member: Member; 
  isAdmin: boolean;
  currentUserIsAdmin: boolean;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={member.avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {member.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
          {member.role === "admin" && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              <Crown className="w-2.5 h-2.5 mr-0.5" />
              Admin
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">@{member.username}</p>
      </div>
      
      {currentUserIsAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-muted rounded-full">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setLocation(`/chat/${member.username}`)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation(`/profile/${member.username}`)}>
              <Users className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {member.role === "member" ? (
              <DropdownMenuItem>
                <Shield className="w-4 h-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <Shield className="w-4 h-4 mr-2" />
                Remove Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive">
              <Ban className="w-4 h-4 mr-2" />
              Remove from Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}



