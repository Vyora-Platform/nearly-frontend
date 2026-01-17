import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Users, Calendar, Newspaper, MessageCircle, Sparkles } from "lucide-react";

const slides = [
  {
    icon: MapPin,
    title: "Discover What's Nearby",
    description: "Find events, activities, and people in your local area. Connect with your community like never before.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Users,
    title: "Join Communities",
    description: "Connect with groups that share your interests. From startups to foodies, find your tribe.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Calendar,
    title: "Create & Join Events",
    description: "Organize meetups, parties, or casual hangouts. Or join existing events happening around you.",
    gradient: "from-green-500/20 to-green-500/5",
  },
  {
    icon: Newspaper,
    title: "Local News & Updates",
    description: "Stay informed about what's happening in your neighborhood. Real news from real people.",
    gradient: "from-orange-500/20 to-orange-500/5",
  },
  {
    icon: MessageCircle,
    title: "Chat & Share Moments",
    description: "Message friends, share moments like stories, and build meaningful connections.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleGetStarted = () => {
    setLocation("/signup");
  };

  const handleLogin = () => {
    setLocation("/login");
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-20">
        <Button variant="ghost" size="sm" onClick={handleGetStarted}>
          Skip
        </Button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative overflow-hidden">
        {/* Background gradient */}
        <div 
          className={`absolute inset-0 bg-gradient-to-b ${slides[currentSlide].gradient} transition-all duration-500`}
        />

        {/* Animated icon */}
        <div 
          key={currentSlide}
          className="relative z-10 w-32 h-32 rounded-full bg-card flex items-center justify-center shadow-lg mb-8 animate-in fade-in zoom-in duration-500"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <CurrentIcon className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Title and description */}
        <div 
          key={`text-${currentSlide}`}
          className="relative z-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {slides[currentSlide].title}
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Navigation arrows for desktop */}
        <div className="hidden sm:flex absolute inset-x-4 top-1/2 -translate-y-1/2 justify-between z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="rounded-full bg-card/80 backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="rounded-full bg-card/80 backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-8 space-y-6">
        {/* Dots indicator */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full h-12 text-base font-semibold"
            onClick={handleGetStarted}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 text-base"
            onClick={handleLogin}
          >
            I already have an account
          </Button>
        </div>
      </div>
    </div>
  );
}

