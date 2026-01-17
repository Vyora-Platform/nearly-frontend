import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, Camera, Edit2, Globe, Lock, Users, Shield,
  Bell, BellOff, MessageSquare, UserPlus, Link2, Trash2,
  Eye, EyeOff, Check, ChevronRight, ImageIcon, AtSign
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function GroupSettings() {
  const [, params] = useRoute("/group/:id/settings");
  const [, setLocation] = useLocation();
  const groupId = params?.id;
  const { toast } = useToast();

  // Group state
  const [groupName, setGroupName] = useState("Kanpur Startup Hub");
  const [groupDescription, setGroupDescription] = useState(
    "A community for startup enthusiasts, entrepreneurs, and innovators in Kanpur. Share ideas, find co-founders, and grow together! 🚀"
  );
  const [groupImage, setGroupImage] = useState(
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400"
  );
  const [groupType, setGroupType] = useState<"public" | "private">("public");
  const [category, setCategory] = useState("business");

  // Settings state
  const [editGroupInfo, setEditGroupInfo] = useState<"admins" | "everyone">("admins");
  const [sendMessages, setSendMessages] = useState<"admins" | "everyone">("everyone");
  const [addMembers, setAddMembers] = useState<"admins" | "everyone">("everyone");
  const [approveNewMembers, setApproveNewMembers] = useState(false);
  const [showMembersList, setShowMembersList] = useState(true);
  
  // Dialogs
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showEditDescDialog, setShowEditDescDialog] = useState(false);
  const [tempName, setTempName] = useState(groupName);
  const [tempDesc, setTempDesc] = useState(groupDescription);

  const categories = [
    { value: "tech", label: "Technology" },
    { value: "business", label: "Business & Startups" },
    { value: "fitness", label: "Fitness & Health" },
    { value: "gaming", label: "Gaming" },
    { value: "music", label: "Music" },
    { value: "photography", label: "Photography" },
    { value: "education", label: "Education" },
    { value: "art", label: "Art & Design" },
    { value: "food", label: "Food & Cooking" },
    { value: "travel", label: "Travel" },
    { value: "social", label: "Social & Meetups" },
    { value: "movies", label: "Movies & Entertainment" },
  ];

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Group settings have been updated successfully.",
    });
    setLocation(`/group/${groupId}/details`);
  };

  const handleSaveName = () => {
    setGroupName(tempName);
    setShowEditNameDialog(false);
    toast({
      title: "Name Updated",
      description: "Group name has been changed.",
    });
  };

  const handleSaveDesc = () => {
    setGroupDescription(tempDesc);
    setShowEditDescDialog(false);
    toast({
      title: "Description Updated",
      description: "Group description has been changed.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation(`/group/${groupId}/details`)}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Group Settings</h1>
          </div>
          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-primary text-white"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Group Profile Section */}
      <div className="p-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Group Profile</h2>
          
          {/* Group Image */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={groupImage} />
                <AvatarFallback className="text-xl bg-gradient-primary text-white">
                  {groupName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Group Icon</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <ImageIcon className="w-3.5 h-3.5 mr-1" />
                  Upload
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-destructive">
                  Remove
                </Button>
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div className="mb-4">
            <Label className="text-sm text-muted-foreground">Group Name</Label>
            <button
              onClick={() => {
                setTempName(groupName);
                setShowEditNameDialog(true);
              }}
              className="w-full flex items-center justify-between p-3 mt-1 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{groupName}</span>
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Group Description */}
          <div>
            <Label className="text-sm text-muted-foreground">Description</Label>
            <button
              onClick={() => {
                setTempDesc(groupDescription);
                setShowEditDescDialog(true);
              }}
              className="w-full flex items-start justify-between p-3 mt-1 bg-muted rounded-xl hover:bg-muted/80 transition-colors text-left"
            >
              <span className="text-sm text-foreground line-clamp-2 pr-2">{groupDescription}</span>
              <Edit2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Group Type & Category */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Group Type</h2>
          
          <RadioGroup value={groupType} onValueChange={(v) => setGroupType(v as any)} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-xl">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Public</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anyone can find and join this group
                </p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-xl">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Private</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only invited members can join
                </p>
              </Label>
            </div>
          </RadioGroup>

          {/* Category */}
          <div className="mt-4">
            <Label className="text-sm text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Group Permissions */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Permissions</h2>
          
          {/* Edit Group Info */}
          <div className="mb-4">
            <Label className="text-sm text-muted-foreground">Who can edit group info?</Label>
            <RadioGroup 
              value={editGroupInfo} 
              onValueChange={(v) => setEditGroupInfo(v as any)} 
              className="flex gap-2 mt-2"
            >
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${editGroupInfo === "admins" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="admins" id="edit-admins" />
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm">Admins</span>
                  </div>
                </label>
              </div>
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${editGroupInfo === "everyone" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="everyone" id="edit-everyone" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">Everyone</span>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Send Messages */}
          <div className="mb-4">
            <Label className="text-sm text-muted-foreground">Who can send messages?</Label>
            <RadioGroup 
              value={sendMessages} 
              onValueChange={(v) => setSendMessages(v as any)} 
              className="flex gap-2 mt-2"
            >
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${sendMessages === "admins" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="admins" id="msg-admins" />
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm">Admins</span>
                  </div>
                </label>
              </div>
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${sendMessages === "everyone" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="everyone" id="msg-everyone" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">Everyone</span>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Add Members */}
          <div>
            <Label className="text-sm text-muted-foreground">Who can add members?</Label>
            <RadioGroup 
              value={addMembers} 
              onValueChange={(v) => setAddMembers(v as any)} 
              className="flex gap-2 mt-2"
            >
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${addMembers === "admins" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="admins" id="add-admins" />
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm">Admins</span>
                  </div>
                </label>
              </div>
              <div className={`flex-1 p-3 rounded-xl border cursor-pointer ${addMembers === "everyone" ? "border-primary bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="everyone" id="add-everyone" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">Everyone</span>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Privacy & Safety */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <h2 className="text-sm font-semibold text-foreground p-4 pb-2">Privacy & Safety</h2>
          
          {/* Approve New Members */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Approve New Members</p>
                <p className="text-xs text-muted-foreground">Admins must approve join requests</p>
              </div>
            </div>
            <Switch
              checked={approveNewMembers}
              onCheckedChange={setApproveNewMembers}
            />
          </div>

          {/* Show Members List */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {showMembersList ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Show Members List</p>
                <p className="text-xs text-muted-foreground">Non-members can see who's in the group</p>
              </div>
            </div>
            <Switch
              checked={showMembersList}
              onCheckedChange={setShowMembersList}
            />
          </div>
        </div>
      </div>

      {/* Invite Link */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Invite Link</p>
              <p className="text-xs text-muted-foreground">Manage and share group invite link</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button className="w-full flex items-center gap-3 p-4 border-t border-border hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <AtSign className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Group Username</p>
              <p className="text-xs text-muted-foreground">Set a unique @username for the group</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-2xl border border-destructive/20 overflow-hidden">
          <h2 className="text-sm font-semibold text-destructive p-4 pb-2">Danger Zone</h2>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/5 transition-colors">
            <Trash2 className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Delete Group</span>
          </button>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>
              Enter a new name for the group
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Group name"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground text-right">{tempName.length}/50</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditNameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} className="bg-gradient-primary text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Description Dialog */}
      <Dialog open={showEditDescDialog} onOpenChange={setShowEditDescDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
            <DialogDescription>
              Describe what this group is about
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={tempDesc}
            onChange={(e) => setTempDesc(e.target.value)}
            placeholder="Group description..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{tempDesc.length}/500</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDescDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDesc} className="bg-gradient-primary text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



