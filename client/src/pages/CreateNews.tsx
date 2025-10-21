import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Clock, MapPin, ImageIcon, X } from "lucide-react";
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
import type { News } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_CATEGORIES } from "@shared/constants";

const createNewsFormSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  eventDate: z.coerce.date().optional(),
  eventTime: z.string().optional(),
  location: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

type CreateNewsFormValues = z.infer<typeof createNewsFormSchema>;

export default function CreateNews() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUserId = "current-user-id";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const form = useForm<CreateNewsFormValues>({
    resolver: zodResolver(createNewsFormSchema),
    defaultValues: {
      headline: "",
      description: "",
      imageUrl: "",
      eventDate: new Date(),
      eventTime: getCurrentTime(),
      location: "",
      category: ACTIVITY_CATEGORIES[0],
    },
  });

  const createNewsMutation = useMutation({
    mutationFn: async (data: CreateNewsFormValues): Promise<News> => {
      const newsData: Record<string, any> = {
        userId: currentUserId,
        headline: data.headline.trim(),
        category: data.category,
      };

      if (data.description?.trim()) {
        newsData.description = data.description.trim();
      }
      if (data.imageUrl?.trim()) {
        newsData.imageUrl = data.imageUrl.trim();
      }
      if (data.eventDate) {
        newsData.eventDate = new Date(data.eventDate).toISOString();
      }
      if (data.eventTime?.trim()) {
        newsData.eventTime = data.eventTime.trim();
      }
      if (data.location?.trim()) {
        newsData.location = data.location.trim();
      }

      return apiRequest("POST", "/api/news", newsData) as unknown as Promise<News>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Success!",
        description: "News published successfully",
      });
      setLocation("/news");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish news. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateNewsFormValues) => {
    createNewsMutation.mutate(data);
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
            onClick={() => setLocation("/news")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">
            Create News
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* News Headline */}
            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    News Headline
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a catchy headline..."
                      className="bg-muted border-none text-foreground placeholder:text-muted-foreground"
                      data-testid="input-headline"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* News Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    News Description (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share more details..."
                      className="bg-muted border-none text-foreground placeholder:text-muted-foreground min-h-32 resize-none"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Media */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Upload Media (Optional)
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

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Date
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          className="bg-muted border-none text-foreground pl-10"
                          data-testid="input-date"
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
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Time
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="time"
                          className="bg-muted border-none text-foreground pl-10"
                          data-testid="input-time"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Enter Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Enter Location
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

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Category
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className="bg-muted border-none text-foreground"
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
                disabled={createNewsMutation.isPending}
                data-testid="button-publish"
              >
                {createNewsMutation.isPending ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
