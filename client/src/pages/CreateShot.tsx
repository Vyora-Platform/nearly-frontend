import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Video, Upload, X, Music2,
  Type, Sparkles, Check, Loader2, Play,
  Pause, RotateCcw, Camera, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { shotsApi, mediaApi, streamingApi } from "@/lib/gateway-api";
import { buildGatewayUrl } from "@/lib/config";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Max video duration in seconds
const MAX_DURATION = 60;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB - increased for CRT uploads

// Upload progress state
interface UploadProgress {
  status: 'idle' | 'uploading' | 'completing' | 'success' | 'error';
  percent: number;
  bytesTransferred: string;
  totalBytes: string;
  transferRate: string;
  estimatedTime: string;
  error?: string;
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
};

export default function CreateShot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State
  const [step, setStep] = useState<'select' | 'preview' | 'details'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [caption, setCaption] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    percent: 0,
    bytesTransferred: '0 B',
    totalBytes: '0 B',
    transferRate: '0 B/s',
    estimatedTime: '--',
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please select a video file",
        variant: "destructive" 
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 500MB",
        variant: "destructive" 
      });
      return;
    }

    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('preview');
  };

  // Check video duration when loaded
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      
      if (duration > MAX_DURATION) {
        toast({ 
          title: "Video too long", 
          description: `Maximum duration is ${MAX_DURATION} seconds. Your video is ${Math.round(duration)} seconds.`,
          variant: "destructive" 
        });
      }
    }
  };

  // Toggle video playback
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Reset selection
  const resetSelection = () => {
    setSelectedFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setIsPlaying(false);
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload with real-time progress tracking using XMLHttpRequest
  const uploadWithProgress = useCallback(async (file: File): Promise<{ success: boolean; url: string; id?: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", "SHOT");
      formData.append("isPublic", "true");

      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = event.loaded / elapsed;
          const remaining = (event.total - event.loaded) / rate;

          setUploadProgress({
            status: 'uploading',
            percent,
            bytesTransferred: formatBytes(event.loaded),
            totalBytes: formatBytes(event.total),
            transferRate: `${formatBytes(rate)}/s`,
            estimatedTime: remaining > 0 ? `${Math.ceil(remaining)}s` : 'Almost done...',
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            console.log('[UPLOAD] Upload resultt:', xhr);

            const result = JSON.parse(xhr.responseText);
            console.log('[UPLOAD] Upload result1:', xhr.responseText);
            console.log('[UPLOAD] Upload result2:',result);

            const url = result.rawUrl || result.data?.rawUrl || result.fileUrl || '';
            const id = result.mediaId || result.data?.mediaId || '';
            
            setUploadProgress(prev => ({
              ...prev,
              status: 'completing',
              percent: 95,
              estimatedTime: 'Creating shot...',
            }));
            
            if (url) {
              resolve({ success: true, url, id });
            } else {
              reject(new Error('No URL in response'));
            }
          } catch (e) {
            reject(new Error('Invalid response'));
          }
        } else {
          let errorMsg = 'Upload failed';
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch {}
          reject(new Error(errorMsg));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadProgress(prev => ({
          ...prev,
          status: 'error',
          error: 'Network error - please check your connection',
        }));
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Open connection
      xhr.open('POST', buildGatewayUrl('/api/media/video/async'));

      // Add auth headers
      const accessToken = localStorage.getItem('nearly_access_token');
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      const userId = localStorage.getItem('nearly_user_id');
      if (userId) {
        xhr.setRequestHeader('X-User-Id', userId);
      }

      // Send
      xhr.send(formData);
    });
  }, []);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      setIsUploading(true);
      setUploadProgress({
        status: 'uploading',
        percent: 0,
        bytesTransferred: '0 B',
        totalBytes: formatBytes(selectedFile.size),
        transferRate: 'Starting...',
        estimatedTime: 'Calculating...',
      });
      
      // Upload video with progress tracking
      console.log('[UPLOAD] Starting upload with progress tracking...');
      const uploadResult = await uploadWithProgress(selectedFile);
      console.log('[UPLOAD] Upload result:', uploadResult);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error("Failed to upload video  issue ");
      }
      
      setUploadProgress(prev => ({
        ...prev,
        status: 'completing',
        percent: 98,
        estimatedTime: 'Creating shot...',
      }));
      
      // Create shot record in database
      // Prefer mediaId over videoUrl for better URL resolution
      const shotData = {
        mediaId: uploadResult.id || undefined,  // Preferred: Media service file ID
        videoUrl: uploadResult.url,              // Fallback: Direct URL
        caption: caption.trim() || undefined,
        musicTitle: musicTitle.trim() || undefined,
        duration: Math.round(videoDuration),
        visibility: visibility,
      };
      
      console.log('[UPLOAD] Creating shot with data:', shotData);
      
      const result = await shotsApi.createShot(shotData);
      console.log('[UPLOAD] Shot created:', result);
      
      setUploadProgress(prev => ({
        ...prev,
        status: 'success',
        percent: 100,
        estimatedTime: 'Done!',
      }));
      
      return result;
    },
    onSuccess: (result) => {
      console.log('[UPLOAD] Success:', result);
      toast({ title: "Shot uploaded successfully!" });
      setTimeout(() => setLocation('/shots'), 500);
    },
    onError: (error: Error) => {
      console.error('[UPLOAD] Error:', error);
      setUploadProgress(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
      }));
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
      setIsUploading(false);
    },
  });

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Step 1: Select Video
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-white/10 z-10">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setLocation('/shots')}>
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">Create Shot</h1>
            <div className="w-6" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Upload area */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] rounded-3xl border-2 border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center gap-4 hover:bg-white/10 hover:border-white/50 transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center">
                <Video className="w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg mb-1">Select Video</p>
                <p className="text-white/60 text-sm">Tap to choose a video</p>
                <p className="text-white/40 text-xs mt-2">Max {MAX_DURATION}s • Up to 500MB</p>
              </div>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Or divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/40 text-sm">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Record option (placeholder) */}
            <button
              className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
              disabled
            >
              <Camera className="w-5 h-5" />
              Record Video
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Coming Soon</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Preview Video
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-white/10 z-10">
          <div className="flex items-center justify-between p-4">
            <button onClick={resetSelection}>
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">Preview</h1>
            <button 
              onClick={() => setStep('details')}
              disabled={videoDuration > MAX_DURATION}
              className="text-primary font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden bg-black">
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                onLoadedMetadata={handleVideoLoaded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}
            
            {/* Play/Pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <div className={cn(
                "w-16 h-16 rounded-full bg-black/50 flex items-center justify-center transition-opacity",
                isPlaying ? "opacity-0" : "opacity-100"
              )}>
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </div>
            </button>

            {/* Duration badge */}
            <div className={cn(
              "absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium",
              videoDuration > MAX_DURATION
                ? "bg-red-500 text-white"
                : "bg-black/50 text-white"
            )}>
              {Math.round(videoDuration)}s
            </div>

            {/* Warning for long videos */}
            {videoDuration > MAX_DURATION && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 rounded-xl p-3 text-center">
                <p className="text-white text-sm font-medium">
                  Video is too long. Max {MAX_DURATION} seconds.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <Button
            variant="outline"
            onClick={resetSelection}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Choose Another
          </Button>
          <Button
            onClick={() => setStep('details')}
            disabled={videoDuration > MAX_DURATION}
            className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Add Details
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setStep('preview')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Add Details</h1>
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={isUploading}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Post"
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Video thumbnail and caption */}
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-28 h-40 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {videoUrl && (
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                muted
              />
            )}
          </div>
          
          {/* Caption */}
          <div className="flex-1">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="resize-none h-full min-h-[120px] border-0 bg-muted/50"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {caption.length}/500
            </p>
          </div>
        </div>

        {/* Music */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Music2 className="w-4 h-4" />
            Add Music (Optional)
          </label>
          <Input
            value={musicTitle}
            onChange={(e) => setMusicTitle(e.target.value)}
            placeholder="Song name or artist"
            className="bg-muted/50"
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Who can view this?</label>
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Everyone (Public)</SelectItem>
              <SelectItem value="friends">Friends Only</SelectItem>
              <SelectItem value="private">Only Me (Private)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            {/* Status header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uploadProgress.status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : uploadProgress.status === 'success' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                <span className="text-sm font-medium">
                  {uploadProgress.status === 'error' ? 'Upload failed' :
                   uploadProgress.status === 'success' ? 'Upload complete!' :
                   uploadProgress.status === 'completing' ? 'Creating shot...' :
                   'Uploading video...'}
                </span>
              </div>
              <span className="text-sm font-bold text-primary">{uploadProgress.percent}%</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  uploadProgress.status === 'error' 
                    ? "bg-red-500" 
                    : uploadProgress.status === 'success'
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-rose-500 to-purple-600"
                )}
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            
            {/* Progress details */}
            {uploadProgress.status !== 'error' && uploadProgress.status !== 'success' && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{uploadProgress.bytesTransferred} / {uploadProgress.totalBytes}</span>
                <span>{uploadProgress.transferRate}</span>
                <span>ETA: {uploadProgress.estimatedTime}</span>
              </div>
            )}
            
            {/* Error message */}
            {uploadProgress.status === 'error' && uploadProgress.error && (
              <p className="text-sm text-red-500">{uploadProgress.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Post Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={() => uploadMutation.mutate()}
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white py-6 rounded-xl font-semibold"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading... {uploadProgress.percent}%
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Post Shot
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
