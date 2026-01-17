import { useLocation } from "wouter";
import { ArrowLeft, Camera, Search, X, Users, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { mediaApi } from "@/lib/gateway-api";
import type { User, Group } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_CATEGORIES } from "@shared/constants";

const createGroupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  groupType: z.enum(["Public", "Private", "Invite-only"]),
  category: z.string().optional(),
  rules: z.string().optional(),
  imageUrl: z.string().optional(),
});

type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

export default function CreateGroup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      groupType: "Public",
      category: "",
      rules: "",
      imageUrl: "",
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
  });

  const filteredUsers = allUsers.filter(
    (user) =>
      user.id !== currentUserId &&
      (searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);

    try {
      // Upload using mediaApi (userId is now extracted from JWT token on server)
      const result = await mediaApi.uploadFile(
        file,
        "GROUP"
      );
      
      if (result.success && result.url) {
        form.setValue("imageUrl", result.url);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormValues): Promise<Group> => {
      const groupData: Record<string, any> = {
        userId: currentUserId,
        name: data.name.trim(),
        groupType: data.groupType,
        membersCount: 1 + selectedMembers.size, // Include creator + invited members
      };

      if (data.description?.trim()) {
        groupData.description = data.description.trim();
      }
      if (data.category?.trim()) {
        groupData.category = data.category.trim();
      }
      if (data.rules?.trim()) {
        groupData.rules = data.rules.trim();
      }
      if (data.imageUrl?.trim()) {
        groupData.imageUrl = data.imageUrl.trim();
      }

      return api.createGroup(groupData);
    },
    onSuccess: async (newGroup: Group) => {
      // Creator is automatically added by the server now
      // Just add the selected members
      for (const memberId of Array.from(selectedMembers)) {
        try {
          await api.joinGroup(newGroup.id, memberId);
        } catch (error) {
          console.error("Failed to add member:", error);
        }
      }

      // Invalidate all group-related queries
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      
      toast({
        title: "Success!",
        description: "Group created successfully",
      });
      
      // Navigate to the new group's chat
      setLocation(`/group/${newGroup.id}/chat`);
    },
    onError: (error) => {
      console.error("Group creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateGroupFormValues) => {
    createGroupMutation.mutate(data);
  };

  const toggleMemberSelection = (userId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMembers(newSelection);
  };

  return (
    <div className="min-h-screen bg-black pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-zinc-800 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/groups")}
            className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white flex-1">
            Create Group
          </h1>
          <Button
            type="submit"
            form="create-group-form"
            disabled={createGroupMutation.isPending || !form.watch("name")}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4"
          >
            {createGroupMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <Form {...form}>
          <form id="create-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Group Photo Upload - WhatsApp Style */}
            <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl">
              <div className="relative">
                <div 
                  className={`w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-zinc-600'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Group"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-zinc-500" />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Group name"
                          {...field}
                          className="bg-transparent border-0 border-b border-zinc-700 rounded-none px-0 text-white text-lg font-medium placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-sm">
                      Description (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What's this group about?"
                        {...field}
                        className="bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0 min-h-20 resize-none p-0 mt-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-sm">
                      Category
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-transparent border-0 text-white focus:ring-0 p-0 h-auto mt-2">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {ACTIVITY_CATEGORIES.map((category) => (
                          <SelectItem 
                            key={category} 
                            value={category}
                            className="text-white hover:bg-zinc-800 focus:bg-zinc-800"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Group Type */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <FormField
                control={form.control}
                name="groupType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-sm mb-4 block">
                      Group Privacy
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        {[
                          { value: "Public", label: "Public", desc: "Anyone can find and join" },
                          { value: "Private", label: "Private", desc: "Members need approval to join" },
                          { value: "Invite-only", label: "Invite Only", desc: "Only invited users can join" },
                        ].map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                              field.value === option.value
                                ? "bg-blue-500/10 border border-blue-500/50"
                                : "bg-zinc-800/50 border border-transparent hover:bg-zinc-800"
                            }`}
                            onClick={() => field.onChange(option.value)}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value.toLowerCase()}
                              className="border-zinc-600 text-blue-500"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={option.value.toLowerCase()}
                                className="text-white font-medium cursor-pointer"
                              >
                                {option.label}
                              </Label>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {option.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Group Rules */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <FormField
                control={form.control}
                name="rules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-sm">
                      Group Rules (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="1. Be respectful&#10;2. No spam&#10;3. Stay on topic"
                        {...field}
                        className="bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0 min-h-24 resize-none p-0 mt-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Add Members */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-zinc-400 text-sm">Add Members</Label>
                {selectedMembers.size > 0 && (
                  <span className="text-xs text-blue-400">{selectedMembers.size} selected</span>
                )}
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search for people"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-0 text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>

              {/* Selected Members Chips */}
              {selectedMembers.size > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from(selectedMembers).map((userId) => {
                    const user = allUsers.find((u) => u.id === userId);
                    if (!user) return null;
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={user.avatarUrl || ""} />
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{user.name.split(' ')[0]}</span>
                        <button
                          type="button"
                          onClick={() => toggleMemberSelection(userId)}
                          className="hover:bg-blue-500/30 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3 text-blue-300" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">No users found</p>
                  ) : (
                    filteredUsers.slice(0, 10).map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${
                          selectedMembers.has(user.id)
                            ? "bg-blue-500/10"
                            : "bg-zinc-800/50 hover:bg-zinc-800"
                        }`}
                        onClick={() => toggleMemberSelection(user.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatarUrl || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium text-white block">
                              {user.name}
                            </span>
                            <span className="text-xs text-zinc-500">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedMembers.has(user.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-zinc-600"
                        }`}>
                          {selectedMembers.has(user.id) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!searchQuery && filteredUsers.length > 0 && (
                <div className="flex items-center justify-center py-4 text-zinc-500">
                  <Users className="w-5 h-5 mr-2" />
                  <span className="text-sm">Search to add members</span>
                </div>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
