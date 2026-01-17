import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { mediaApi } from "@/lib/gateway-api";
import { 
  Camera, Image as ImageIcon, Upload, X, ZoomIn, ZoomOut, 
  RotateCw, Loader2, Check, Trash2, Move
} from "lucide-react";

interface ImageUploaderProps {
  currentImage?: string;
  onImageChange: (url: string) => void;
  userId: string;
  context?: string;
  aspectRatio?: "square" | "cover" | "free";
  maxSizeMB?: number;
}

interface ImageDimensions {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export default function ImageUploader({
  currentImage,
  onImageChange,
  userId,
  context = "PROFILE",
  aspectRatio = "square",
  maxSizeMB = 10,
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [minZoom, setMinZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);

  // Calculate the minimum zoom to fill the container
  const calculateMinZoom = useCallback((imgWidth: number, imgHeight: number, containerSize: number) => {
    // Calculate the scale needed to fill the square container
    const scaleToFillWidth = containerSize / imgWidth;
    const scaleToFillHeight = containerSize / imgHeight;
    // Use the larger scale to ensure the image fills the container
    return Math.max(scaleToFillWidth, scaleToFillHeight);
  }, []);

  // Constrain position to keep image within bounds
  const constrainPosition = useCallback((x: number, y: number, currentZoom: number) => {
    if (!imageDimensions || !containerRef.current) return { x: 0, y: 0 };
    
    const containerSize = containerRef.current.offsetWidth;
    const scaledWidth = imageDimensions.naturalWidth * currentZoom;
    const scaledHeight = imageDimensions.naturalHeight * currentZoom;
    
    // Calculate max panning distance
    const maxX = Math.max(0, (scaledWidth - containerSize) / 2);
    const maxY = Math.max(0, (scaledHeight - containerSize) / 2);
    
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [imageDimensions]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please select an image smaller than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      
      // Load image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        const containerSize = 320; // Approximate container size
        const minZ = calculateMinZoom(img.width, img.height, containerSize);
        setMinZoom(minZ);
        setZoom([minZ]);
        setImageDimensions({
          width: img.width,
          height: img.height,
          naturalWidth: img.width,
          naturalHeight: img.height,
        });
      };
      img.src = dataUrl;
      
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, toast, calculateMinZoom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const constrained = constrainPosition(newX, newY, zoom[0]);
      setPosition(constrained);
    }
  }, [isDragging, dragStart, zoom, constrainPosition]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      const constrained = constrainPosition(newX, newY, zoom[0]);
      setPosition(constrained);
    }
  }, [isDragging, dragStart, zoom, constrainPosition]);

  const handleZoomChange = useCallback((newZoom: number[]) => {
    setZoom(newZoom);
    // Constrain position when zoom changes
    const constrained = constrainPosition(position.x, position.y, newZoom[0]);
    setPosition(constrained);
  }, [constrainPosition, position]);

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
    // Swap dimensions when rotating
    if (imageDimensions) {
      const newDimensions = {
        ...imageDimensions,
        naturalWidth: imageDimensions.naturalHeight,
        naturalHeight: imageDimensions.naturalWidth,
      };
      setImageDimensions(newDimensions);
      
      // Recalculate min zoom for new dimensions
      const containerSize = containerRef.current?.offsetWidth || 320;
      const newMinZoom = calculateMinZoom(newDimensions.naturalWidth, newDimensions.naturalHeight, containerSize);
      setMinZoom(newMinZoom);
      if (zoom[0] < newMinZoom) {
        setZoom([newMinZoom]);
      }
    }
    setPosition({ x: 0, y: 0 });
  };

  const processAndUpload = async () => {
    if (!selectedImage || !imageDimensions) return;

    setIsUploading(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new window.Image();
      img.src = selectedImage;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Output size for the cropped image
      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.clearRect(0, 0, outputSize, outputSize);

      // Calculate the crop area from the preview
      const containerSize = containerRef.current?.offsetWidth || 320;
      const scale = zoom[0];
      
      // The visible area in the original image coordinates
      const visibleWidth = containerSize / scale;
      const visibleHeight = containerSize / scale;
      
      // Center of the image adjusted by position
      const centerX = img.width / 2 - position.x / scale;
      const centerY = img.height / 2 - position.y / scale;
      
      // Source rectangle (crop area from original image)
      const sx = centerX - visibleWidth / 2;
      const sy = centerY - visibleHeight / 2;
      const sWidth = visibleWidth;
      const sHeight = visibleHeight;

      // Handle rotation
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outputSize / 2, -outputSize / 2);
      
      // Draw the cropped image
      ctx.drawImage(
        img,
        sx, sy, sWidth, sHeight,
        0, 0, outputSize, outputSize
      );
      
      ctx.restore();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
      });

      // Create file from blob
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

      // Upload using mediaApi (userId is now extracted from JWT token on server)
      const result = await mediaApi.uploadFile(
        file,
        context as any
      );

      if (result.success && result.url) {
        onImageChange(result.url);
        toast({
          title: "Image uploaded!",
          description: "Your profile picture has been updated",
        });
        setIsOpen(false);
        setSelectedImage(null);
        setImageDimensions(null);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onImageChange("");
    setIsOpen(false);
    toast({
      title: "Image removed",
      description: "Your profile picture has been removed",
    });
  };

  const resetEditor = () => {
    setSelectedImage(null);
    setImageDimensions(null);
    setZoom([1]);
    setMinZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Update min zoom when container size changes
  useEffect(() => {
    if (selectedImage && containerRef.current && imageDimensions) {
      const containerSize = containerRef.current.offsetWidth;
      const newMinZoom = calculateMinZoom(
        imageDimensions.naturalWidth, 
        imageDimensions.naturalHeight, 
        containerSize
      );
      setMinZoom(newMinZoom);
      if (zoom[0] < newMinZoom) {
        setZoom([newMinZoom]);
      }
    }
  }, [selectedImage, imageDimensions, calculateMinZoom]);

  return (
    <>
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleInputChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Trigger */}
      <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
        <Avatar className={`${aspectRatio === "square" ? "w-24 h-24" : "w-full h-32"} ring-4 ring-background`}>
          <AvatarImage src={currentImage} className="object-cover" />
          <AvatarFallback className="text-2xl bg-muted">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Camera className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetEditor();
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {selectedImage ? "Adjust Photo" : "Change Profile Photo"}
            </DialogTitle>
          </DialogHeader>

          {!selectedImage ? (
            <div className="p-6 space-y-4">
              {/* Preview current image */}
              {currentImage && (
                <div className="flex justify-center mb-6">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={currentImage} />
                    <AvatarFallback>
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2">
                <Button
                  onClick={openCamera}
                  variant="outline"
                  className="w-full h-14 justify-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Take Photo</p>
                    <p className="text-xs text-muted-foreground">Use your camera</p>
                  </div>
                </Button>

                <Button
                  onClick={openFilePicker}
                  variant="outline"
                  className="w-full h-14 justify-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Upload from Device</p>
                    <p className="text-xs text-muted-foreground">Choose from gallery</p>
                  </div>
                </Button>

                {currentImage && (
                  <Button
                    onClick={removeImage}
                    variant="outline"
                    className="w-full h-14 justify-start gap-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Remove Photo</p>
                      <p className="text-xs text-muted-foreground">Delete current photo</p>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image editor - Instagram/Facebook style */}
              <div 
                ref={containerRef}
                className="relative w-full aspect-square bg-black overflow-hidden cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {/* Grid overlay for better positioning */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Rule of thirds grid */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/10" />
                    ))}
                  </div>
                  {/* Circular crop guide for profile photos */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <mask id="profileMask">
                        <rect width="100" height="100" fill="white" />
                        <circle cx="50" cy="50" r="45" fill="black" />
                      </mask>
                    </defs>
                    <rect width="100" height="100" fill="rgba(0,0,0,0.5)" mask="url(#profileMask)" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
                  </svg>
                </div>
                
                {/* Image */}
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Preview"
                  className="absolute top-1/2 left-1/2 max-w-none select-none pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom[0]})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />

                {/* Drag hint */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/60 rounded-full px-3 py-1 flex items-center gap-1.5 text-white text-xs">
                  <Move className="w-3 h-3" />
                  <span>Drag to adjust</span>
                </div>
              </div>

              {/* Controls */}
              <div className="px-4 space-y-4">
                {/* Zoom slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Zoom</span>
                    <span>{Math.round((zoom[0] / minZoom) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Slider
                      value={zoom}
                      onValueChange={handleZoomChange}
                      min={minZoom}
                      max={minZoom * 3}
                      step={0.01}
                      className="flex-1"
                    />
                    <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rotateImage}
                    className="flex-1"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetEditor}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Save button */}
              <div className="p-4 pt-0">
                <Button
                  onClick={processAndUpload}
                  disabled={isUploading}
                  className="w-full h-11"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
