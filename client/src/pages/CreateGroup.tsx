import { useLocation } from "wouter";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const currentUserId = "current-user-id";

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
    queryKey: ["/api/users"],
  });

  const filteredUsers = allUsers.filter(
    (user) =>
      user.id !== currentUserId &&
      (searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormValues): Promise<Group> => {
      const groupData: Record<string, any> = {
        userId: currentUserId,
        name: data.name.trim(),
        groupType: data.groupType,
        membersCount: 1,
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

      return apiRequest("POST", "/api/groups", groupData) as unknown as Promise<Group>;
    },
    onSuccess: async (newGroup: Group) => {
      // Add creator as first member
      await apiRequest("POST", `/api/groups/${newGroup.id}/join`, {
        userId: currentUserId,
      });

      // Send invites to selected members
      for (const userId of Array.from(selectedMembers)) {
        try {
          await apiRequest("POST", `/api/groups/${newGroup.id}/join`, {
            userId,
          });
        } catch (error) {
          console.error("Failed to add member:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Success!",
        description: "Group created successfully",
      });
      setLocation("/groups");
    },
    onError: () => {
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
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-md mx-auto flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/groups")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">
            Create Your Group
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Group Photo Upload */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center">
                  {form.watch("imageUrl") ? (
                    <img
                      src={form.watch("imageUrl")}
                      alt="Group"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Add Group Photo
              </p>
            </div>

            {/* Group Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    Group Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Mumbai Street Foodies"
                      {...field}
                      data-testid="input-group-name"
                      className="bg-muted border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A group for sharing the best local eats!"
                      {...field}
                      data-testid="input-description"
                      className="bg-muted border-border min-h-24 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    Category (Optional)
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className="bg-muted border-border"
                        data-testid="select-category"
                      >
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {ACTIVITY_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Type */}
            <FormField
              control={form.control}
              name="groupType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-foreground font-medium">
                    Group Type
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-3"
                    >
                      <div
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${
                          field.value === "Public"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <RadioGroupItem
                          value="Public"
                          id="public"
                          className="mt-0.5"
                          data-testid="radio-public"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="public"
                            className="text-base font-medium text-foreground cursor-pointer"
                          >
                            Public
                          </Label>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Anyone can see and join
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${
                          field.value === "Private"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <RadioGroupItem
                          value="Private"
                          id="private"
                          className="mt-0.5"
                          data-testid="radio-private"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="private"
                            className="text-base font-medium text-foreground cursor-pointer"
                          >
                            Private
                          </Label>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Members must be approved
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${
                          field.value === "Invite-only"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <RadioGroupItem
                          value="Invite-only"
                          id="invite-only"
                          className="mt-0.5"
                          data-testid="radio-invite-only"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="invite-only"
                            className="text-base font-medium text-foreground cursor-pointer"
                          >
                            Invite-only
                          </Label>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Only invited users can join
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Rules */}
            <FormField
              control={form.control}
              name="rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    Group Rules
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g.,&#10;1. Be respectful to all members.&#10;2. No spam or self-promotion.&#10;3. Keep discussions relevant to the group's topic."
                      {...field}
                      data-testid="input-rules"
                      className="bg-muted border-border min-h-32 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add Members */}
            <div className="space-y-3">
              <Label className="text-foreground font-medium">Add Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for friends to invite"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-members"
                  className="pl-9 bg-muted border-border"
                />
              </div>

              {searchQuery && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredUsers.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                      data-testid={`member-item-${user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatarUrl || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">
                          {user.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant={
                          selectedMembers.has(user.id) ? "secondary" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleMemberSelection(user.id)}
                        data-testid={`button-invite-${user.id}`}
                        className={
                          selectedMembers.has(user.id)
                            ? "bg-gradient-primary text-white border-0"
                            : ""
                        }
                      >
                        {selectedMembers.has(user.id) ? "Invited" : "Invite"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Group Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white h-12 text-base font-semibold"
              disabled={createGroupMutation.isPending}
              data-testid="button-create-group"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
