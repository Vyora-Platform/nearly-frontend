import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { buildGatewayUrl } from "@/lib/config";
import { 
  ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, MapPin, 
  Check, X, AtSign, User, Camera, Sparkles
} from "lucide-react";

// Comprehensive list of interests (40+ options)
const ALL_INTERESTS = [
  // Entertainment
  { id: "movies", label: "Movies", emoji: "🎬", category: "Entertainment" },
  { id: "music", label: "Music", emoji: "🎵", category: "Entertainment" },
  { id: "gaming", label: "Gaming", emoji: "🎮", category: "Entertainment" },
  { id: "tv_shows", label: "TV Shows", emoji: "📺", category: "Entertainment" },
  { id: "anime", label: "Anime", emoji: "🎌", category: "Entertainment" },
  { id: "comedy", label: "Comedy", emoji: "😂", category: "Entertainment" },
  { id: "podcasts", label: "Podcasts", emoji: "🎙️", category: "Entertainment" },
  
  // Sports & Fitness
  { id: "cricket", label: "Cricket", emoji: "🏏", category: "Sports" },
  { id: "football", label: "Football", emoji: "⚽", category: "Sports" },
  { id: "basketball", label: "Basketball", emoji: "🏀", category: "Sports" },
  { id: "badminton", label: "Badminton", emoji: "🏸", category: "Sports" },
  { id: "tennis", label: "Tennis", emoji: "🎾", category: "Sports" },
  { id: "swimming", label: "Swimming", emoji: "🏊", category: "Sports" },
  { id: "gym", label: "Gym & Fitness", emoji: "🏋️", category: "Sports" },
  { id: "yoga", label: "Yoga", emoji: "🧘", category: "Sports" },
  { id: "running", label: "Running", emoji: "🏃", category: "Sports" },
  { id: "cycling", label: "Cycling", emoji: "🚴", category: "Sports" },
  
  // Food & Lifestyle
  { id: "food", label: "Food & Cooking", emoji: "🍕", category: "Lifestyle" },
  { id: "coffee", label: "Coffee", emoji: "☕", category: "Lifestyle" },
  { id: "travel", label: "Travel", emoji: "✈️", category: "Lifestyle" },
  { id: "photography", label: "Photography", emoji: "📸", category: "Lifestyle" },
  { id: "fashion", label: "Fashion", emoji: "👗", category: "Lifestyle" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", category: "Lifestyle" },
  { id: "pets", label: "Pets", emoji: "🐕", category: "Lifestyle" },
  { id: "gardening", label: "Gardening", emoji: "🌱", category: "Lifestyle" },
  
  // Arts & Culture
  { id: "art", label: "Art", emoji: "🎨", category: "Arts" },
  { id: "dance", label: "Dance", emoji: "💃", category: "Arts" },
  { id: "theatre", label: "Theatre", emoji: "🎭", category: "Arts" },
  { id: "books", label: "Books & Reading", emoji: "📚", category: "Arts" },
  { id: "writing", label: "Writing", emoji: "✍️", category: "Arts" },
  { id: "music_playing", label: "Playing Music", emoji: "🎸", category: "Arts" },
  
  // Tech & Career
  { id: "technology", label: "Technology", emoji: "💻", category: "Tech" },
  { id: "startups", label: "Startups", emoji: "🚀", category: "Tech" },
  { id: "coding", label: "Coding", emoji: "👨‍💻", category: "Tech" },
  { id: "crypto", label: "Crypto & Web3", emoji: "🪙", category: "Tech" },
  { id: "ai", label: "AI & ML", emoji: "🤖", category: "Tech" },
  { id: "investing", label: "Investing", emoji: "📈", category: "Tech" },
  { id: "career", label: "Career Growth", emoji: "💼", category: "Tech" },
  
  // Social & Community
  { id: "volunteering", label: "Volunteering", emoji: "🤝", category: "Social" },
  { id: "networking", label: "Networking", emoji: "🌐", category: "Social" },
  { id: "politics", label: "Politics", emoji: "🗳️", category: "Social" },
  { id: "environment", label: "Environment", emoji: "🌍", category: "Social" },
  { id: "spirituality", label: "Spirituality", emoji: "🕉️", category: "Social" },
  { id: "parenting", label: "Parenting", emoji: "👶", category: "Social" },
  
  // Hobbies
  { id: "diy", label: "DIY & Crafts", emoji: "🔨", category: "Hobbies" },
  { id: "cars", label: "Cars & Bikes", emoji: "🚗", category: "Hobbies" },
  { id: "camping", label: "Camping", emoji: "🏕️", category: "Hobbies" },
  { id: "hiking", label: "Hiking", emoji: "🥾", category: "Hobbies" },
  { id: "board_games", label: "Board Games", emoji: "🎲", category: "Hobbies" },
  { id: "astronomy", label: "Astronomy", emoji: "🔭", category: "Hobbies" },
  { id: "history", label: "History", emoji: "🏛️", category: "Hobbies" },
  { id: "languages", label: "Languages", emoji: "🗣️", category: "Hobbies" },
];

const STEPS = [
  { id: "account", title: "Create Account" },
  { id: "username", title: "Choose Username" },
  { id: "profile", title: "Set Up Profile" },
  { id: "interests", title: "Select Interests" },
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: "",
    bio: "",
    location: "",
    avatarUrl: "",
  });
  
  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  
  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState("");

  // Check username availability with debounce
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus("checking");

    try {
      // Call auth service for username check
      const response = await fetch(buildGatewayUrl(`/api/auth/check-username?username=${encodeURIComponent(username)}`));
      const data = await response.json();

      if (data.available) {
        setUsernameStatus("available");
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus("taken");
        setUsernameSuggestions(data.suggestions || []);
      }
    } catch (error) {
      // If API fails, just allow the username (will be validated on submit)
      setUsernameStatus("idle");
    }
  }, []);

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsername(formData.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, checkUsername]);

  // Username validation
  const validateUsername = (value: string) => {
    // Only allow lowercase letters, numbers, and underscores
    return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validated = validateUsername(e.target.value);
    setFormData({ ...formData, username: validated });
  };

  const selectSuggestedUsername = (username: string) => {
    setFormData({ ...formData, username });
  };

  // Interest toggle
  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  // Filter interests by search
  const filteredInterests = interestSearch
    ? ALL_INTERESTS.filter(i => 
        i.label.toLowerCase().includes(interestSearch.toLowerCase()) ||
        i.category.toLowerCase().includes(interestSearch.toLowerCase())
      )
    : ALL_INTERESTS;

  // Group interests by category
  const groupedInterests = filteredInterests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = [];
    }
    acc[interest.category].push(interest);
    return acc;
  }, {} as Record<string, typeof ALL_INTERESTS>);

  // Validation for each step
  const validateStep = () => {
    switch (currentStep) {
      case 0: // Account
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          toast({ title: "Please fill all fields", variant: "destructive" });
          return false;
        }
        if (formData.password.length < 6) {
          toast({ title: "Password must be at least 6 characters", variant: "destructive" });
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({ title: "Passwords don't match", variant: "destructive" });
          return false;
        }
        return true;
      case 1: // Username
        if (!formData.username || formData.username.length < 3) {
          toast({ title: "Username must be at least 3 characters", variant: "destructive" });
          return false;
        }
        if (usernameStatus === "taken") {
          toast({ title: "This username is taken", variant: "destructive" });
          return false;
        }
        return true;
      case 2: // Profile
        if (!formData.name) {
          toast({ title: "Please enter your name", variant: "destructive" });
          return false;
        }
        return true;
      case 3: // Interests
        if (selectedInterests.length < 5) {
          toast({ title: "Please select at least 5 interests", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setLocation("/welcome");
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setIsLoading(true);

    try {
      // Get selected interest labels
      const interestLabels = selectedInterests.map(id => {
        const interest = ALL_INTERESTS.find(i => i.id === id);
        return interest ? `${interest.label} ${interest.emoji}` : id;
      });

      // Call auth service for signup
      const response = await fetch(buildGatewayUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          avatarUrl: formData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
          interests: interestLabels,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }

      // Store JWT tokens
      if (data.accessToken) {
        localStorage.setItem("nearly_access_token", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("nearly_refresh_token", data.refreshToken);
      }

      // Store user info
      localStorage.setItem("nearly_user_id", data.user.id);
      localStorage.setItem("nearly_username", data.user.username);
      localStorage.setItem("nearly_onboarding_complete", "true");

      toast({
        title: "Welcome to Nearly!",
        description: "Your account has been created successfully",
      });

      setLocation("/");
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAvatarUrl = () => {
    const seeds = ["Felix", "Aneka", "Sarah", "Max", "Luna", "Alex", "Jordan", "River"];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.random().toString(36).slice(2, 5);
    setFormData({ ...formData, avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}` });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={prevStep}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg pr-9">
          {STEPS[currentStep].title}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          {STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {/* Step 0: Account */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Join Nearly</h2>
              <p className="text-muted-foreground text-sm">Create your account to get started</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="relative">
  <Input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="At least 6 characters"
    value={formData.password}
    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
    className="pr-12 h-12"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-muted-foreground hover:text-foreground"
  >
    {showPassword ? (
      <EyeOff className="w-5 h-5" />
    ) : (
      <Eye className="w-5 h-5" />
    )}
  </button>
</div>


            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        )}

        {/* Step 1: Username */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <AtSign className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Pick your username</h2>
              <p className="text-muted-foreground text-sm">This is how others will find you</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  className="pl-8 pr-10 h-12"
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {usernameStatus === "available" && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {usernameStatus === "taken" && (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Only letters, numbers, and underscores. Min 3 characters.
              </p>
            </div>

            {usernameStatus === "taken" && usernameSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Try one of these instead:</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.map(suggestion => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => selectSuggestedUsername(suggestion)}
                      className="text-sm"
                    >
                      @{suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {usernameStatus === "available" && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  @{formData.username} is available!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Profile */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Set up your profile</h2>
              <p className="text-muted-foreground text-sm">Tell others about yourself</p>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`} />
                  <AvatarFallback>{formData.name?.charAt(0) || formData.username?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
                  onClick={generateAvatarUrl}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tap to change avatar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[100px] resize-none"
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.bio.length}/150
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="location"
                  type="text"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="pl-11 h-12"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">What interests you?</h2>
              <p className="text-muted-foreground text-sm">
                Select at least 5 interests ({selectedInterests.length}/5 minimum)
              </p>
            </div>

            {/* Search */}
            <Input
              type="text"
              placeholder="Search interests..."
              value={interestSearch}
              onChange={(e) => setInterestSearch(e.target.value)}
              className="h-11"
            />

            {/* Selected count indicator */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedInterests.length} selected
              </span>
              {selectedInterests.length >= 5 && (
                <span className="text-green-500 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Minimum reached!
                </span>
              )}
            </div>

            {/* Interests grid */}
            <div className="space-y-6 pb-4">
              {Object.entries(groupedInterests).map(([category, interests]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {interests.map(interest => {
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-primary text-primary-foreground scale-105'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          }`}
                        >
                          <span>{interest.emoji}</span>
                          <span>{interest.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-background">
        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={nextStep}
          disabled={isLoading || (currentStep === 1 && usernameStatus === "checking")}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating account...
            </>
          ) : currentStep === STEPS.length - 1 ? (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Complete Setup
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {currentStep === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button 
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

