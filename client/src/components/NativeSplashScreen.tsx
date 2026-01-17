import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NativeSplashScreenProps {
  onComplete: () => void;
  duration?: number;
  showLogo?: boolean;
  message?: string;
}

export default function NativeSplashScreen({
  onComplete,
  duration = 2000,
  showLogo = true,
  message = "Loading..."
}: NativeSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15; // Random progress for realism
      });
    }, 100);

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] bg-gradient-primary flex flex-col items-center justify-center",
      "transition-opacity duration-300",
      !isVisible && "opacity-0 pointer-events-none"
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo/Brand */}
        {showLogo && (
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-4 mx-auto backdrop-blur-sm">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">N</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Nearly</h1>
            <p className="text-white/80 text-sm">Connect with people nearby</p>
          </div>
        )}

        {/* Loading indicator */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-12 h-12 border-3 border-white/30 rounded-full"></div>
            {/* Progress ring */}
            <div
              className="absolute top-0 left-0 w-12 h-12 border-3 border-white rounded-full transition-all duration-300"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2)}% ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2)}%)`
              }}
            ></div>
            {/* Inner dot */}
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
          </div>

          {/* Progress bar */}
          <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Loading message */}
          <p className="text-white/70 text-sm font-medium">{message}</p>
        </div>
      </div>

      {/* Version info */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <p className="text-white/50 text-xs">v1.0.0</p>
      </div>
    </div>
  );
}