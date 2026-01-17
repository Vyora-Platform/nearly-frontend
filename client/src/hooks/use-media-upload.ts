import { useState, useCallback } from "react";
import { mediaApi } from "@/lib/gateway-api";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
}

interface UseMediaUploadOptions {
  // userId is now extracted from JWT token via X-User-Id header on server
  context: "PROFILE" | "COVER" | "ACTIVITY" | "EVENT" | "GROUP" | "NEWS" | "MOMENT" | "MESSAGE" | "JOB" | "DEAL" | "PLACE" | "PAGE" | "OTHER";
  contextId?: string;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // For smaller files (< 5MB), use direct upload
      // userId is now extracted from JWT token via X-User-Id header on server
      if (file.size < 5 * 1024 * 1024) {
        const response = await mediaApi.uploadFile(
          file,
          options.context,
          options.contextId
        );

        if (response.success) {
          const uploadResult: UploadResult = {
            id: response.id,
            url: response.url,
            thumbnailUrl: response.thumbnailUrl,
            fileName: response.fileName,
            contentType: response.contentType,
            fileSize: response.fileSize,
            mediaType: response.mediaType,
          };

          setResult(uploadResult);
          setProgress({ loaded: file.size, total: file.size, percentage: 100 });
          options.onSuccess?.(uploadResult);
          return uploadResult;
        } else {
          throw new Error(response.error || "Upload failed");
        }
      }

      // For larger files, use presigned URL for direct S3 upload
      // userId is now extracted from JWT token via X-User-Id header on server
      const presignedResponse = await mediaApi.getPresignedUrl(
        file.name,
        file.type,
        options.context,
        options.contextId
      );

      // Upload directly to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(progressData);
            options.onProgress?.(progressData);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", presignedResponse.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Confirm upload completion
      await mediaApi.confirmUpload(presignedResponse.fileId, file.size);

      const uploadResult: UploadResult = {
        id: presignedResponse.fileId,
        url: presignedResponse.publicUrl,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        mediaType: getMediaType(file.type),
      };

      setResult(uploadResult);
      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      options.onSuccess?.(uploadResult);
      return uploadResult;

    } catch (err) {
      const error = err instanceof Error ? err : new Error("Upload failed");
      setError(error);
      options.onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    setIsUploading(true);
    setError(null);

    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const response = await mediaApi.uploadMultiple(
        files,
        options.context,
        options.contextId
      );

      const results: UploadResult[] = response
        .filter((r: any) => r.success)
        .map((r: any) => ({
          id: r.id,
          url: r.url,
          thumbnailUrl: r.thumbnailUrl,
          fileName: r.fileName,
          contentType: r.contentType,
          fileSize: r.fileSize,
          mediaType: r.mediaType,
        }));

      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Upload failed");
      setError(error);
      options.onError?.(error);
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError(null);
    setResult(null);
  }, []);

  return {
    upload,
    uploadMultiple,
    reset,
    isUploading,
    progress,
    error,
    result,
  };
}

function getMediaType(contentType: string): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" {
  if (contentType.startsWith("image/")) return "IMAGE";
  if (contentType.startsWith("video/")) return "VIDEO";
  if (contentType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export default useMediaUpload;

