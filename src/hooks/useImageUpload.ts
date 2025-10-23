import { useState } from "react";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/constants/meshGeneration";

export interface UploadedImage {
  id: string;
  file: File;
  dataUri: string;
}

interface UseImageUploadOptions {
  maxImages?: number;
  onError?: (error: string) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { maxImages = 4, onError } = options;
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.some((type) => file.type.startsWith(type))) {
      return "Please upload only image files";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "Image files must be smaller than 10MB";
    }

    return null;
  };

  const handleFilesSelected = async (files: FileList): Promise<boolean> => {
    try {
      for (const file of Array.from(files)) {
        const error = validateFile(file);
        if (error) {
          onError?.(error);
          return false;
        }

        if (uploadedImages.length >= maxImages) {
          onError?.(`Maximum ${maxImages} images allowed`);
          return false;
        }

        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;

            const newImage: UploadedImage = {
              id: Date.now().toString() + Math.random(),
              file,
              dataUri: result,
            };

            setUploadedImages((prev) => {
              if (prev.length >= maxImages) {
                onError?.(`Maximum ${maxImages} images allowed`);
                reject(new Error("Max images reached"));
                return prev;
              }
              resolve();
              return [...prev, newImage];
            });
          };

          reader.onerror = () => {
            reject(new Error("Failed to read file"));
          };

          reader.readAsDataURL(file);
        });
      }
      return true;
    } catch {
      onError?.("Failed to process uploaded images");
      return false;
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const clearImages = () => {
    setUploadedImages([]);
  };

  return {
    uploadedImages,
    setUploadedImages,
    handleFilesSelected,
    removeImage,
    clearImages,
  };
}
