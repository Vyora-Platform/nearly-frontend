import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Clock, MapPin, ImageIcon, X, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Activity } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const createActivityFormSchema = z.object({
  title: z.string().min(1, "Activity title is required"),
  organizerName: z.string().min(1, "Organizer name is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  startDate: z.coerce.date(),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.coerce.date().optional(),
  endTime: z.string().optional(),
  maxParticipants: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  visibility: z.enum(["Public", "Private", "Invite Only"]),
  cost: z.enum(["Free", "Contribution"]),
});

type CreateActivityFormValues = z.infer<typeof createActivityFormSchema>;

export default function CreateActivity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUserId = "current-user-id";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const form = useForm<CreateActivityFormValues>({
    resolver: zodResolver(createActivityFormSchema),
    defaultValues: {
      title: "",
      organizerName: "",
      description: "",
      imageUrl: "",
      location: "",
      startDate: new Date(),
      startTime: getCurrentTime(),
      endDate: undefined,
      endTime: "",
      maxParticipants: undefined,
      visibility: "Public",
      cost: "Free",
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: CreateActivityFormValues): Promise<Activity> => {
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      let endDateTime: Date | undefined;
      if (data.endDate && data.endTime) {
        endDateTime = new Date(data.endDate);
        const [endHours, endMinutes] = data.endTime.split(':');
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));
      }

      const activityData: Record<string, any> = {
        userId: currentUserId,
        title: data.title.trim(),
        organizerName: data.organizerName.trim(),
        location: data.location.trim(),
        startDate: startDateTime,
        visibility: data.visibility,
        cost: data.cost,
      };

      if (data.description?.trim()) {
        activityData.description = data.description.trim();
      }
      if (data.imageUrl?.trim()) {
        activityData.imageUrl = data.imageUrl.trim();
      }
      if (endDateTime) {
        activityData.endDate = endDateTime;
      }
      if (data.maxParticipants && data.maxParticipants > 0) {
        activityData.maxParticipants = data.maxParticipants;
      }

      return apiRequest("POST", "/api/activities", activityData) as unknown as Promise<Activity>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success!",
        description: "Activity created successfully",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateActivityFormValues) => {
    createActivityMutation.mutate(data);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue("imageUrl", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    form.setValue("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Preview functionality coming soon",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-md mx-auto flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">
            Create Activity
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Activity Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Activity Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter activity title..."
                      className="bg-muted border-none text-foreground placeholder:text-muted-foreground"
                      data-testid="input-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Organizer Name */}
            <FormField
              control={form.control}
              name="organizerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Organizer Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter organizer name..."
                      className="bg-muted border-none text-foreground placeholder:text-muted-foreground"
                      data-testid="input-organizer-name"
                      {...field}
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
                  <FormLabel className="text-sm font-medium text-foreground">
                    Description (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share more details about the activity..."
                      className="bg-muted border-none text-foreground placeholder:text-muted-foreground min-h-32 resize-none"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Photos/Videos */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Add Photos/Videos (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        data-testid="input-file"
                      />
                      
                      {imagePreview ? (
                        <div className="relative border-2 border-border rounded-lg overflow-hidden bg-muted/30">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-90"
                            data-testid="button-remove-image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-border rounded-lg p-8 bg-muted/30 hover-elevate"
                          data-testid="button-upload-media"
                        >
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <ImageIcon className="w-10 h-10" />
                            <span className="text-sm">Tap to upload from Gallery</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Activity Location
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search for a location..."
                        className="bg-muted border-none text-foreground pl-10 placeholder:text-muted-foreground"
                        data-testid="input-location"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Starts (Date and Time) */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-medium text-foreground">
                Starts
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            className="bg-muted border-none text-foreground pl-10"
                            data-testid="input-start-date"
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="time"
                            className="bg-muted border-none text-foreground pl-10"
                            data-testid="input-start-time"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Ends (Date and Time) - Optional */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-medium text-foreground">
                Ends (Optional)
              </FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            className="bg-muted border-none text-foreground pl-10"
                            data-testid="input-end-date"
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="time"
                            className="bg-muted border-none text-foreground pl-10"
                            data-testid="input-end-time"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Maximum Participants */}
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Maximum Participants
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter maximum participants..."
                        className="bg-muted border-none text-foreground pl-10 placeholder:text-muted-foreground"
                        data-testid="input-max-participants"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Activity Visibility
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value="Public"
                          id="public"
                          className="border-border text-primary"
                          data-testid="radio-visibility-public"
                        />
                        <Label
                          htmlFor="public"
                          className="text-foreground cursor-pointer flex-1"
                        >
                          Public
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value="Private"
                          id="private"
                          className="border-border text-primary"
                          data-testid="radio-visibility-private"
                        />
                        <Label
                          htmlFor="private"
                          className="text-foreground cursor-pointer flex-1"
                        >
                          Private
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value="Invite Only"
                          id="invite-only"
                          className="border-border text-primary"
                          data-testid="radio-visibility-invite-only"
                        />
                        <Label
                          htmlFor="invite-only"
                          className="text-foreground cursor-pointer flex-1"
                        >
                          Invite Only
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost */}
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Cost
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value="Free"
                          id="free"
                          className="border-border text-primary"
                          data-testid="radio-cost-free"
                        />
                        <Label
                          htmlFor="free"
                          className="text-foreground cursor-pointer flex-1"
                        >
                          Free
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value="Contribution"
                          id="contribution"
                          className="border-border text-primary"
                          data-testid="radio-cost-contribution"
                        />
                        <Label
                          htmlFor="contribution"
                          className="text-foreground cursor-pointer flex-1"
                        >
                          Contribution
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={handlePreview}
                data-testid="button-preview"
              >
                Preview
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary text-white hover:opacity-90"
                disabled={createActivityMutation.isPending}
                data-testid="button-create-activity"
              >
                {createActivityMutation.isPending ? "Creating..." : "Create Activity"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
