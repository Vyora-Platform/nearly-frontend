import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, setLocation] = useLocation();
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Animation sequence
    const timer1 = setTimeout(() => setAnimationPhase(1), 300);
    const timer2 = setTimeout(() => setAnimationPhase(2), 800);
    const timer3 = setTimeout(() => setAnimationPhase(3), 1300);
    
    // Check if user is authenticated
    const timer4 = setTimeout(() => {
      const isAuthenticated = localStorage.getItem("nearly_user_id");
      const hasCompletedOnboarding = localStorage.getItem("nearly_onboarding_complete");
      
      if (isAuthenticated && hasCompletedOnboarding) {
        setLocation("/");
      } else {
        setLocation("/welcome");
      }
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className={`absolute top-1/4 -left-20 w-40 h-40 rounded-full bg-primary/10 transition-all duration-1000 ease-out ${
            animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        />
        <div 
          className={`absolute bottom-1/3 -right-16 w-32 h-32 rounded-full bg-primary/15 transition-all duration-1000 ease-out delay-200 ${
            animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        />
        <div 
          className={`absolute top-2/3 left-10 w-24 h-24 rounded-full bg-primary/10 transition-all duration-1000 ease-out delay-300 ${
            animationPhase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        />
      </div>

      {/* Logo and branding */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Icon */}
        <div 
          className={`w-24 h-24 rounded-3xl bg-primary flex items-center justify-center shadow-xl transition-all duration-700 ease-out ${
            animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <svg 
            viewBox="0 0 24 24" 
            className="w-14 h-14 text-primary-foreground"
            fill="currentColor"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        {/* App Name */}
        <h1 
          className={`mt-6 text-4xl font-bold text-foreground tracking-tight transition-all duration-700 ease-out delay-300 ${
            animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Nearly
        </h1>
        
        {/* Tagline */}
        <p 
          className={`mt-2 text-muted-foreground text-center transition-all duration-700 ease-out delay-500 ${
            animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Connect with people nearby
        </p>

        {/* Loading indicator */}
        <div 
          className={`mt-12 flex gap-1.5 transition-opacity duration-500 delay-700 ${
            animationPhase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

