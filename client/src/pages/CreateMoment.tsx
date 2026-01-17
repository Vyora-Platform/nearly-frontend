import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, Send, RotateCcw, Image as ImageIcon, X, Check,
  Type, Download, Users, Globe, User, ChevronRight, Video, Circle, Square,
  Crop, VolumeX, Volume2, Sparkles, AtSign, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { mediaApi } from "@/lib/gateway-api";
import { useQuery } from "@tanstack/react-query";

type ScreenMode = 'camera' | 'preview' | 'edit' | 'share';
type MediaType = 'photo' | 'video';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  fontFamily: string;
}

// Only 10 beauty-enhancing filters that improve quality
interface Filter {
  id: string;
  name: string;
  cssFilter: string;
  preview: string;
}

const beautyFilters: Filter[] = [
  { id: "none", name: "Original", cssFilter: "none", preview: "📷" },
  { id: "enhance", name: "Enhance", cssFilter: "brightness(1.1) contrast(1.05) saturate(1.1)", preview: "✨" },
  { id: "glow", name: "Glow", cssFilter: "brightness(1.15) contrast(0.95) saturate(1.1)", preview: "💫" },
  { id: "soft", name: "Soft", cssFilter: "brightness(1.1) contrast(0.92) blur(0.3px)", preview: "🌸" },
  { id: "vivid", name: "Vivid", cssFilter: "saturate(1.4) contrast(1.08) brightness(1.05)", preview: "🌈" },
  { id: "warm", name: "Warm", cssFilter: "sepia(0.15) saturate(1.2) brightness(1.08)", preview: "☀️" },
  { id: "cool", name: "Cool", cssFilter: "hue-rotate(10deg) saturate(1.1) brightness(1.05)", preview: "❄️" },
  { id: "radiant", name: "Radiant", cssFilter: "brightness(1.18) saturate(1.15) contrast(1.02)", preview: "⭐" },
  { id: "clear", name: "Clear", cssFilter: "contrast(1.15) brightness(1.08) saturate(1.05)", preview: "💎" },
  { id: "fresh", name: "Fresh", cssFilter: "brightness(1.12) saturate(1.2) hue-rotate(-5deg)", preview: "🍃" },
];

const textColors = [
  "#FFFFFF", "#000000", "#FF6B6B", "#4ECDC4", "#45B7D1", 
  "#96E6A1", "#DDA0DD", "#F7DC6F", "#E74C3C", "#3498DB"
];

const textBackgrounds = [
  "transparent", "#000000CC", "#FFFFFFCC", "#FF6B6BCC", "#4ECDC4CC"
];

interface Friend {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
}

interface Group {
  id: string;
  name: string;
  imageUrl?: string;
  membersCount: number;
}

export default function CreateMoment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Screen states
  const [screenMode, setScreenMode] = useState<ScreenMode>('camera');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('photo');
  const [isUploading, setIsUploading] = useState(false);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<Filter>(beautyFilters[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null); // Store blob directly
  const [recordingLock, setRecordingLock] = useState(false); // Prevent stopping too early

  // Edit states
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [currentTextInput, setCurrentTextInput] = useState("");
  const [currentTextColor, setCurrentTextColor] = useState("#FFFFFF");
  const [currentTextBg, setCurrentTextBg] = useState("transparent");
  const [isMuted, setIsMuted] = useState(false);
  const [showCrop, setShowCrop] = useState(false);

  // Share states
  const [caption, setCaption] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [mentionedGroups, setMentionedGroups] = useState<string[]>([]);
  const [shareToFriends, setShareToFriends] = useState(true);
  const [shareToGlobal, setShareToGlobal] = useState(false);
  const [directShareFriends, setDirectShareFriends] = useState<string[]>([]);
  const [directShareGroups, setDirectShareGroups] = useState<string[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  // Fetch friends and groups for sharing
  const { data: friendsData = [] } = useQuery({
    queryKey: ['friends-for-sharing'],
    queryFn: async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser?.id) {
          const friends = await api.getFriends(currentUser.id);
          return friends.map((u: any) => ({
            id: u.id,
            username: u.username || `user_${u.id}`,
            name: u.name || 'Unknown',
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  const { data: groupsData = [] } = useQuery({
    queryKey: ['groups-for-sharing'],
    queryFn: async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser?.id) {
          const groups = await api.getUserGroups(currentUser.id);
          return groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            imageUrl: g.imageUrl,
            membersCount: g.membersCount || 0,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (selectedMedia && selectedMedia.startsWith('blob:')) {
        URL.revokeObjectURL(selectedMedia);
      }
    };
  }, [selectedMedia]);

  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraActive(true);
        };
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access.",
        variant: "destructive",
      });
    }
  }, [isFrontCamera, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply filter and auto-enhance
    context.filter = currentFilter.cssFilter === "none" 
      ? "brightness(1.05) contrast(1.02) saturate(1.05)" // Auto-enhance
      : currentFilter.cssFilter;

    if (isFrontCamera) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.filter = 'none';

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSelectedMedia(imageDataUrl);
    setMediaType('photo');
    setScreenMode('edit');
    stopCamera();
  }, [isFrontCamera, currentFilter, stopCamera]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      toast({
        title: "Camera Error",
        description: "No camera stream available. Please restart camera.",
        variant: "destructive",
      });
      return;
    }

    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      toast({
        title: "Recording Not Supported",
        description: "Your browser doesn't support video recording. Please try a different browser.",
        variant: "destructive",
      });
      return;
    }

    recordedChunksRef.current = [];

    // Try different MIME types for better compatibility
    let options: MediaRecorderOptions;
    try {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      } else {
        // Fallback to default
        options = {};
      }
    } catch (error) {
      console.warn('[RECORDING] MIME type detection failed, using defaults:', error);
      options = { mimeType: 'video/webm' };
    }

    console.log('[RECORDING] Using MediaRecorder options:', options);

    const mediaRecorder = new MediaRecorder(streamRef.current, options);

    // Collect data in chunks every 500ms for better reliability
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
        console.log(`[RECORDING] Collected chunk: ${event.data.size} bytes, total chunks: ${recordedChunksRef.current.length}, total size: ${(recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / 1024 / 1024).toFixed(2)} MB`);
      }
    };

    mediaRecorder.onstop = () => {
      console.log(`[RECORDING] Stopped recording, total chunks: ${recordedChunksRef.current.length}`);

      // Clear recording lock
      setRecordingLock(false);

      const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`[RECORDING] Total recorded data: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      if (recordedChunksRef.current.length === 0 || totalSize === 0) {
        toast({
          title: "Recording Failed",
          description: "No video data was recorded. Please try again.",
          variant: "destructive",
        });
        setRecordingLock(false);
        setIsRecording(false);
        return;
      }

      if (totalSize < 10000) { // Less than 10KB
        toast({
          title: "Recording Failed",
          description: "Video file is too small. Please record for longer.",
          variant: "destructive",
        });
        setRecordingLock(false);
        setIsRecording(false);
        return;
      }

      try {
        // Log chunk details before creating blob
        console.log('[RECORDING] Creating blob from chunks:', {
          totalChunks: recordedChunksRef.current.length,
          totalBytes: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          mimeType: mediaRecorder.mimeType
        });

        // Create blob with all collected chunks - try without explicit type first
        let blob: Blob;
        try {
          blob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
        } catch (blobError) {
          console.warn('[RECORDING] Blob creation with MIME type failed, trying without:', blobError);
          // Fallback: create blob without explicit type
          blob = new Blob(recordedChunksRef.current);
        }

        console.log(`[RECORDING] Created blob: ${blob.size} bytes, type: ${blob.type}`);

        if (blob.size === 0) {
          toast({
            title: "Recording Failed",
            description: "Video file is empty. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          return;
        }

        // Verify blob can be read (additional validation)
        try {
          const testReader = new FileReader();
          testReader.onload = () => {
            console.log('[RECORDING] Blob integrity check passed');
          };
          testReader.onerror = () => {
            console.error('[RECORDING] Blob integrity check failed');
          };
          testReader.readAsArrayBuffer(blob.slice(0, 1024)); // Test first 1KB
        } catch (integrityError) {
          console.warn('[RECORDING] Blob integrity check error:', integrityError);
        }

        // Store blob directly to avoid URL.createObjectURL truncation
        setRecordedBlob(blob);

        // Final verification: ensure blob contains expected data
        const expectedSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        if (blob.size !== expectedSize) {
          console.error(`[RECORDING] Blob size mismatch! Expected: ${expectedSize}, Got: ${blob.size}`);
          toast({
            title: "Recording Failed",
            description: `Video data corruption detected. Please try recording again.`,
            variant: "destructive",
          });
          setRecordingLock(false);
          setIsRecording(false);
          return;
        }

        console.log(`[RECORDING] Blob verification passed: ${blob.size} bytes`);

        // Create object URL for display/preview
        const url = URL.createObjectURL(blob);
        setSelectedMedia(url);
        setMediaType('video');
        setScreenMode('edit');
        stopCamera();

        toast({
          title: "Recording Complete",
          description: `Video recorded: ${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        });
      } catch (error) {
        console.error('[RECORDING] Error creating video blob:', error);
        toast({
          title: "Recording Failed",
          description: "Error processing video. Please try again.",
          variant: "destructive",
        });
        setRecordingLock(false);
        setIsRecording(false);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('[RECORDING] MediaRecorder error:', event);
      setRecordingLock(false);
      toast({
        title: "Recording Error",
        description: "An error occurred while recording. Please try again.",
        variant: "destructive",
      });
      setIsRecording(false);
    };

    mediaRecorder.onstart = () => {
      console.log('[RECORDING] MediaRecorder started successfully');
    };

    mediaRecorderRef.current = mediaRecorder;

    // Start recording with smaller time slices for better data collection
    try {
      mediaRecorder.start(500); // Collect data every 500ms for better reliability
      setIsRecording(true);
      setRecordingLock(true); // Lock recording for minimum duration

      // Clear recording lock after 1 second minimum
      setTimeout(() => {
        setRecordingLock(false);
        console.log('[RECORDING] Recording lock cleared - can now stop');
      }, 1000);

      console.log('[RECORDING] Started recording with 500ms chunks (locked for 1s minimum)');
    } catch (error) {
      console.error('[RECORDING] Failed to start recording:', error);
      setRecordingLock(false);
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please check camera permissions.",
        variant: "destructive",
      });
    }
  }, [stopCamera, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Check if we're still in the recording lock period
      if (recordingLock) {
        console.log('[RECORDING] Cannot stop yet - minimum recording time not met');
        toast({
          title: "Keep Recording",
          description: "Please record for at least 1 second to capture your moment.",
          variant: "default",
        });
        return;
      }

      // Check if we have collected at least some data
      const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      if (totalSize < 5000) { // Less than 5KB
        console.log('[RECORDING] Not enough data collected yet, waiting...');
        toast({
          title: "Recording...",
          description: "Collecting video data, please wait a moment.",
          variant: "default",
        });
        return;
      }

      console.log('[RECORDING] Stopping recording...');

      // Request the final data chunk
      mediaRecorderRef.current.requestData();

      // Stop recording after a short delay to ensure final chunk is collected
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      }, 100); // 100ms delay
    }
  }, [isRecording, recordingLock, toast]);

  const toggleCamera = () => {
    stopCamera();
    setTimeout(() => {
      setIsFrontCamera(!isFrontCamera);
      startCamera();
    }, 200);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedMedia(e.target?.result as string);
        setMediaType(isVideo ? 'video' : 'photo');
        setScreenMode('edit');
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextOverlay = () => {
    if (!currentTextInput.trim()) return;

    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: currentTextInput,
      x: 50,
      y: 50,
      fontSize: 24,
      color: currentTextColor,
      backgroundColor: currentTextBg,
      fontFamily: "system-ui, sans-serif",
    };

    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentTextInput("");
    setIsAddingText(false);
  };

  const handleDownload = async () => {
    if (!selectedMedia) return;

    try {
      const link = document.createElement('a');
      link.href = selectedMedia;
      link.download = `moment-${Date.now()}.${mediaType === 'video' ? 'webm' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Downloaded! 📥",
        description: "Saved to your device",
      });
    } catch {
      toast({
        title: "Download failed",
        variant: "destructive",
      });
    }
  };

  const handleMention = (type: 'user' | 'group', id: string) => {
    if (type === 'user') {
      const user = friendsData.find((f: Friend) => f.id === id);
      if (user && !mentionedUsers.includes(id)) {
        setMentionedUsers([...mentionedUsers, id]);
        setCaption(prev => prev + `@${user.username} `);
      }
    } else {
      const group = groupsData.find((g: Group) => g.id === id);
      if (group && !mentionedGroups.includes(id)) {
        setMentionedGroups([...mentionedGroups, id]);
        setCaption(prev => prev + `#${group.name.replace(/\s/g, '')} `);
      }
    }
    setShowMentionPicker(false);
  };

  const toggleDirectShareFriend = (friendId: string) => {
    setDirectShareFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleDirectShareGroup = (groupId: string) => {
    setDirectShareGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handlePost = async () => {
    if (!selectedMedia) return;

    setIsUploading(true);

    try {
      let blob: Blob;

      if (mediaType === 'video' && recordedBlob) {
        // Use the stored blob directly for videos to avoid truncation
        blob = recordedBlob;
        console.log(`[UPLOAD] Using stored video blob: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`);
      } else {
        // For photos or fallback, fetch from object URL
        console.log('[UPLOAD] Converting blob to file...');
        const response = await fetch(selectedMedia);
        blob = await response.blob();
        console.log(`[UPLOAD] Blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`);
      }

      // Ensure blob has correct type for video files
      if (mediaType === 'video' && !blob.type) {
        console.log('[UPLOAD] Blob missing type, creating new blob with video/webm type');
        blob = new Blob([blob], { type: 'video/webm' });
      }

      if (blob.size === 0) {
        throw new Error('Video file is empty. Recording may have failed.');
      }

      if (blob.size < 1000) { // Less than 1KB
        throw new Error('Video file is too small. Recording may have failed.');
      }

      const fileName = `moment-${Date.now()}.${mediaType === 'video' ? 'webm' : 'jpg'}`;
      const fileType = mediaType === 'video' ? (blob.type || 'video/webm') : 'image/jpeg';

      console.log(`[UPLOAD] Creating file: name=${fileName}, type=${fileType}, blob.size=${blob.size}`);

      const file = new File([blob], fileName, { type: fileType });

      console.log(`[UPLOAD] Created file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB, type: ${file.type}`);

      // Validate file before upload
      if (file.size === 0) {
        throw new Error('File is empty after conversion');
      }

      if (file.size < 10000) { // Less than 10KB
        throw new Error('File is too small. Video may not have been recorded properly.');
      }

      // Additional validation: ensure file size matches blob size
      if (file.size !== blob.size) {
        console.warn(`[UPLOAD] File size mismatch: blob=${blob.size}, file=${file.size}`);
      }

      // Test file integrity by checking we can read from it
      try {
        const testSlice = file.slice(0, Math.min(1024, file.size));
        const testArrayBuffer = await testSlice.arrayBuffer();
        console.log(`[UPLOAD] File integrity test passed: read ${testArrayBuffer.byteLength} bytes`);
      } catch (integrityError) {
        console.error('[UPLOAD] File integrity test failed:', integrityError);
        throw new Error('File integrity check failed. Video may be corrupted.');
      }

      // Upload using mediaApi (userId is now extracted from JWT token on server)
      console.log('[UPLOAD] Starting upload...');
      const uploadResult = await mediaApi.uploadFile(
        file,
        "MOMENT"
      );

      console.log('[UPLOAD] Upload result:', uploadResult);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      if (!uploadResult.id) {
        throw new Error('Upload succeeded but no file ID returned');
      }

      // Determine visibility
      let visibility: "global" | "friends" | "private" = "friends";
      if (shareToGlobal) visibility = "global";
      else if (directShareFriends.length > 0 || directShareGroups.length > 0) visibility = "private";

      // Calculate expiry (24h for public/friends, 7 days for direct share)
      const expiresAt = new Date();
      if (visibility === "private") {
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else {
        expiresAt.setHours(expiresAt.getHours() + 24);
      }

      // Create moment with correct API payload
      // Prefer mediaId over mediaUrl for better URL resolution
      const momentData = {
        mediaId: uploadResult.id || undefined,    // Preferred: Media service file ID
        mediaUrl: uploadResult.url,               // Fallback: Direct URL
        mediaType: (mediaType === 'photo' ? 'image' : 'video') as 'image' | 'video',
        caption: caption || undefined,
        textOverlays: textOverlays.length > 0 ? JSON.stringify(textOverlays) : undefined,
        filter: currentFilter.id !== 'none' ? currentFilter.name : undefined,
        visibility,
        recipientIds: directShareFriends.length > 0 ? directShareFriends : undefined,
      };

      await api.createMoment(momentData);

      // Send notifications for mentions
      if (mentionedUsers.length > 0 || mentionedGroups.length > 0) {
        // API will handle notifications for mentions
      }

      // Mark as posted today
      localStorage.setItem('nearly_last_moment_date', new Date().toDateString());

      toast({
        title: "Moment shared! ✨",
        description: visibility === "private" 
          ? `Sent to ${directShareFriends.length + directShareGroups.length} recipients. Expires in 7 days.`
          : `Shared ${visibility === "global" ? "globally" : "with friends"}. Expires in 24 hours.`,
      });

      setLocation("/moments");
    } catch (error) {
      console.error('Error posting moment:', error);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Camera Screen
  if (screenMode === 'camera') {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation("/moments")}
              className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={toggleCamera}
              className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center gap-2 bg-red-500 rounded-full px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${recordingLock ? 'bg-yellow-400 animate-spin' : 'bg-white animate-pulse'}`} />
                <span className="text-white font-mono font-medium">
                  {recordingLock ? `Recording... ${formatTime(recordingTime)}` : formatTime(recordingTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Camera View */}
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              isFrontCamera && "scale-x-[-1]"
            )}
            style={{ filter: currentFilter.cssFilter }}
          />

          {/* Filter name display */}
          {currentFilter.id !== "none" && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 z-10">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <span>{currentFilter.preview}</span>
                {currentFilter.name}
              </span>
            </div>
          )}

          {/* Beauty Filters - Horizontal scroll */}
          <div className="absolute bottom-40 left-0 right-0 z-10">
            <div className="flex gap-3 px-4 overflow-x-auto pb-4 scrollbar-hide">
              {beautyFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setCurrentFilter(filter)}
                  className={cn(
                    "flex flex-col items-center gap-2 flex-shrink-0 transition-all",
                    currentFilter.id === filter.id && "scale-110"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all",
                    currentFilter.id === filter.id
                      ? "border-white bg-white/20"
                      : "border-white/30 bg-black/30"
                  )}>
                    {filter.preview}
                  </div>
                  <span className="text-white text-xs">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="flex items-center justify-between">
              {/* Gallery */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <ImageIcon className="w-6 h-6 text-white" />
              </button>

              {/* Capture Button */}
              <div className="relative">
                {/* Photo/Video Toggle */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex bg-black/40 backdrop-blur-sm rounded-full p-1">
                  <button
                    onClick={() => setMediaType('photo')}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      mediaType === 'photo' ? "bg-white text-black" : "text-white/70"
                    )}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMediaType('video')}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      mediaType === 'video' ? "bg-white text-black" : "text-white/70"
                    )}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>

                {mediaType === 'photo' ? (
                  <button
                    onClick={takePhoto}
                    disabled={!isCameraActive}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-all disabled:opacity-50 shadow-lg"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300" />
                  </button>
                ) : (
                  <button
                    onMouseDown={isRecording ? stopRecording : startRecording}
                    onMouseUp={isRecording ? undefined : stopRecording}
                    onTouchStart={isRecording ? stopRecording : startRecording}
                    onTouchEnd={isRecording ? undefined : stopRecording}
                    disabled={!isCameraActive}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg relative",
                      isRecording ? "bg-red-500 scale-110" : "bg-red-500 hover:bg-red-600",
                      recordingLock ? "ring-4 ring-yellow-400 ring-opacity-50" : ""
                    )}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-8 h-8 text-white fill-white" />
                        {recordingLock && (
                          <div className="absolute inset-0 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin" />
                        )}
                      </>
                    ) : (
                      <Circle className="w-16 h-16 text-white fill-white" />
                    )}
                  </button>
                )}
              </div>

              <div className="w-14 h-14" />
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Edit Screen - Simplified with only 5 options
  if (screenMode === 'edit') {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScreenMode('camera');
                setSelectedMedia(null);
                setTextOverlays([]);
                startCamera();
              }}
              className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <Button
              onClick={() => setScreenMode('share')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 rounded-full font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Media Preview */}
        <div className="relative w-full h-full">
          {mediaType === 'video' ? (
            <video
              src={selectedMedia!}
              className="w-full h-full object-cover"
              autoPlay
              loop
              playsInline
              muted={isMuted}
            />
          ) : (
            <img
              src={selectedMedia!}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          )}

          {/* Text Overlays */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute cursor-move select-none group"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span
                style={{
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                  fontFamily: overlay.fontFamily,
                  backgroundColor: overlay.backgroundColor,
                  padding: overlay.backgroundColor !== 'transparent' ? '4px 12px' : '0',
                  borderRadius: '8px',
                  textShadow: overlay.backgroundColor === 'transparent' ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {overlay.text}
              </span>
              <button
                onClick={() => setTextOverlays(textOverlays.filter(t => t.id !== overlay.id))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Text Input Modal */}
        {isAddingText && (
          <div className="absolute inset-0 bg-black/80 z-30 flex flex-col">
            <div className="flex items-center justify-between p-4 pt-12">
              <button onClick={() => setIsAddingText(false)} className="text-white/70">
                Cancel
              </button>
              <button onClick={addTextOverlay} className="text-pink-400 font-medium">
                Done
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <input
                type="text"
                value={currentTextInput}
                onChange={(e) => setCurrentTextInput(e.target.value)}
                placeholder="Type something..."
                className="bg-transparent text-white text-center text-2xl outline-none w-full"
                style={{
                  color: currentTextColor,
                  backgroundColor: currentTextBg,
                  padding: currentTextBg !== 'transparent' ? '8px 16px' : '0',
                  borderRadius: '8px',
                }}
                autoFocus
              />
            </div>

            {/* Text styling */}
            <div className="p-4 space-y-4">
              {/* Colors */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {textColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentTextColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full flex-shrink-0 transition-all",
                      currentTextColor === color && "ring-2 ring-white ring-offset-2 ring-offset-black"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Backgrounds */}
              <div className="flex gap-2">
                {textBackgrounds.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setCurrentTextBg(bg)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex-shrink-0 transition-all border",
                      currentTextBg === bg ? "border-white" : "border-white/30",
                      bg === 'transparent' && "bg-transparent"
                    )}
                    style={{ backgroundColor: bg === 'transparent' ? undefined : bg }}
                  >
                    {bg === 'transparent' && <span className="text-white text-xs">None</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Toolbar - Only 5 options */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-8">
            {/* 1. Text */}
            <button onClick={() => setIsAddingText(true)} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Type className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Text</span>
            </button>

            {/* 2. Crop */}
            <button onClick={() => setShowCrop(true)} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Crop className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Crop</span>
            </button>

            {/* 3. Mute (for video) */}
            {mediaType === 'video' && (
              <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center",
                  isMuted ? "bg-red-500/50" : "bg-white/10"
                )}>
                  {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                </div>
                <span className="text-white text-xs">{isMuted ? "Unmute" : "Mute"}</span>
              </button>
            )}

            {/* 4. Filter */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Filter</span>
            </button>

            {/* 5. Download */}
            <button onClick={handleDownload} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Save</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Share Screen - Instagram style with mentions
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm z-10 p-4 pt-12 border-b border-white/10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setScreenMode('edit')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <h1 className="text-white font-semibold text-lg">Share Moment</h1>

          <Button
            onClick={handlePost}
            disabled={isUploading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 rounded-full font-medium disabled:opacity-50"
          >
            {isUploading ? "..." : "Share"}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Caption with mention support */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Add Caption</h3>
            <button
              onClick={() => setShowMentionPicker(true)}
              className="flex items-center gap-1 text-purple-400 text-sm"
            >
              <AtSign className="w-4 h-4" />
              Mention
            </button>
          </div>
          
          <div className="flex gap-3">
            <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/20">
              {mediaType === 'video' ? (
                <video src={selectedMedia!} className="w-full h-full object-cover" />
              ) : (
                <img src={selectedMedia!} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... Use @username to mention friends"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              rows={4}
            />
          </div>

          {/* Mentioned users/groups display */}
          {(mentionedUsers.length > 0 || mentionedGroups.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {mentionedUsers.map(userId => {
                const user = friendsData.find((f: Friend) => f.id === userId);
                return user ? (
                  <span key={userId} className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-sm flex items-center gap-1">
                    @{user.username}
                    <button onClick={() => setMentionedUsers(mentionedUsers.filter(id => id !== userId))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {mentionedGroups.map(groupId => {
                const group = groupsData.find((g: Group) => g.id === groupId);
                return group ? (
                  <span key={groupId} className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-sm flex items-center gap-1">
                    #{group.name}
                    <button onClick={() => setMentionedGroups(mentionedGroups.filter(id => id !== groupId))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Share With Section - Multi-select */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Share with</h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShareToFriends(!shareToFriends)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 rounded-xl transition-all",
                shareToFriends
                  ? "bg-purple-500/20 border border-purple-500/50"
                  : "bg-white/5 border border-white/10"
              )}
            >
              <Users className={cn("w-6 h-6", shareToFriends ? "text-purple-400" : "text-white/60")} />
              <div className="text-left">
                <p className={cn("font-medium", shareToFriends ? "text-white" : "text-white/70")}>Friends</p>
                <p className="text-xs text-white/50">24h expiry</p>
              </div>
              {shareToFriends && <Check className="w-5 h-5 text-purple-400 ml-auto" />}
            </button>

            <button
              onClick={() => setShareToGlobal(!shareToGlobal)}
              className={cn(
                "flex-1 flex items-center gap-3 p-4 rounded-xl transition-all",
                shareToGlobal
                  ? "bg-blue-500/20 border border-blue-500/50"
                  : "bg-white/5 border border-white/10"
              )}
            >
              <Globe className={cn("w-6 h-6", shareToGlobal ? "text-blue-400" : "text-white/60")} />
              <div className="text-left">
                <p className={cn("font-medium", shareToGlobal ? "text-white" : "text-white/70")}>Global</p>
                <p className="text-xs text-white/50">24h expiry</p>
              </div>
              {shareToGlobal && <Check className="w-5 h-5 text-blue-400 ml-auto" />}
            </button>
          </div>
        </div>

        {/* Direct Share Section */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Send className="w-4 h-4" />
            Direct share to
            {(directShareFriends.length + directShareGroups.length) > 0 && (
              <span className="text-pink-400 text-sm">
                ({directShareFriends.length + directShareGroups.length} selected)
              </span>
            )}
          </h3>
          <p className="text-white/50 text-sm">Select friends and groups • 7 days expiry</p>

          {/* Friends List */}
          {friendsData.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/60 text-xs uppercase tracking-wider">Friends</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {friendsData.map((friend: Friend) => (
                  <button
                    key={friend.id}
                    onClick={() => toggleDirectShareFriend(friend.id)}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                  >
                    <div className="relative">
                      <Avatar className={cn(
                        "w-16 h-16 transition-all",
                        directShareFriends.includes(friend.id) && "ring-2 ring-pink-500"
                      )}>
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {friend.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {directShareFriends.includes(friend.id) && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-white text-xs truncate max-w-[64px]">{friend.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Groups List */}
          {groupsData.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/60 text-xs uppercase tracking-wider">Groups</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {groupsData.map((group: Group) => (
                  <button
                    key={group.id}
                    onClick={() => toggleDirectShareGroup(group.id)}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                  >
                    <div className="relative">
                      <Avatar className={cn(
                        "w-16 h-16 transition-all",
                        directShareGroups.includes(group.id) && "ring-2 ring-blue-500"
                      )}>
                        <AvatarImage src={group.imageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {group.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {directShareGroups.includes(group.id) && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-white text-xs truncate max-w-[64px]">{group.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expiry Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-white font-medium">Auto-delete enabled</p>
              <p className="text-white/70 text-sm">
                {(directShareFriends.length + directShareGroups.length) > 0
                  ? "Direct shares expire after 7 days"
                  : "This moment will disappear after 24 hours"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mention Picker Modal */}
      {showMentionPicker && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="p-4 pt-12 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold">Mention</h2>
            <button onClick={() => setShowMentionPicker(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Friends */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Friends
              </p>
              {friendsData.map((friend: Friend) => (
                <button
                  key={friend.id}
                  onClick={() => handleMention('user', friend.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatarUrl} />
                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-white font-medium">{friend.name}</p>
                    <p className="text-white/50 text-sm">@{friend.username}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Groups */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Groups
              </p>
              {groupsData.map((group: Group) => (
                <button
                  key={group.id}
                  onClick={() => handleMention('group', group.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={group.imageUrl} />
                    <AvatarFallback>{group.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-white font-medium">{group.name}</p>
                    <p className="text-white/50 text-sm">{group.membersCount} members</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center p-8">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white text-xl font-semibold mb-2">Sharing your moment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
