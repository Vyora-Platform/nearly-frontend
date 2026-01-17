import { useEffect, useState } from 'react';

interface PreloadOptions {
  fonts?: string[];
  images?: string[];
  scripts?: string[];
  stylesheets?: string[];
}

export function usePreloadCritical(options: PreloadOptions = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const {
      fonts = [],
      images = [],
      scripts = [],
      stylesheets = []
    } = options;

    const allResources = [...fonts, ...images, ...scripts, ...stylesheets];
    setTotalCount(allResources.length);

    if (allResources.length === 0) {
      setIsLoading(false);
      return;
    }

    let loaded = 0;

    const updateProgress = () => {
      loaded++;
      setLoadedCount(loaded);
      if (loaded >= allResources.length) {
        setIsLoading(false);
      }
    };

    // Preload fonts
    fonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = fontUrl;
      link.as = 'font';
      link.crossOrigin = 'anonymous';
      link.onload = updateProgress;
      link.onerror = updateProgress; // Count as loaded even on error
      document.head.appendChild(link);
    });

    // Preload images
    images.forEach(imageUrl => {
      const img = new Image();
      img.onload = updateProgress;
      img.onerror = updateProgress;
      img.src = imageUrl;
    });

    // Preload scripts
    scripts.forEach(scriptUrl => {
      const script = document.createElement('link');
      script.rel = 'preload';
      script.href = scriptUrl;
      script.as = 'script';
      script.onload = updateProgress;
      script.onerror = updateProgress;
      document.head.appendChild(script);
    });

    // Preload stylesheets
    stylesheets.forEach(stylesheetUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = stylesheetUrl;
      link.as = 'style';
      link.onload = updateProgress;
      link.onerror = updateProgress;
      document.head.appendChild(link);
    });

  }, [options.fonts, options.images, options.scripts, options.stylesheets]);

  return {
    isLoading,
    progress: totalCount > 0 ? (loadedCount / totalCount) * 100 : 100,
    loadedCount,
    totalCount
  };
}

// Default critical resources for Nearly app
export function usePreloadNearlyCritical() {
  return usePreloadCritical({
    fonts: [
      // Add your critical fonts here
      // '/fonts/inter-var.woff2',
    ],
    images: [
      // Add critical images that should be preloaded
      // '/images/logo.png',
      // '/images/default-avatar.png',
    ]
  });
}