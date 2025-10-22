import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UploadedImageData {
  url: string;
  id: string | number;
}

interface ImageUploadDropzoneProps {
  id: string;
  label: string;
  description?: string;
  multiple?: boolean;
  onFilesSelected: (files: FileList) => void | Promise<void>;
  images?: UploadedImageData[];
  onRemoveImage?: (id: string | number) => void;
  renderImageOverlay?: (
    image: UploadedImageData,
    onPreview: () => void
  ) => React.ReactNode;
}

export function ImageUploadDropzone({
  id,
  label,
  description,
  multiple = true,
  onFilesSelected,
  images = [],
  onRemoveImage,
  renderImageOverlay,
}: ImageUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<UploadedImageData | null>(
    null
  );

  const hasImages = images.length > 0;

  // Get current image index for navigation
  const currentImageIndex = previewImage
    ? images.findIndex((img) => img.id === previewImage.id)
    : -1;

  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setPreviewImage(images[currentImageIndex - 1]);
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setPreviewImage(images[currentImageIndex + 1]);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await onFilesSelected(files);
    // Reset input so the same file can be selected again
    event.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await onFilesSelected(files);
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      // Convert to FileList-like object
      const dataTransfer = new DataTransfer();
      imageFiles.forEach((file) => dataTransfer.items.add(file));
      await onFilesSelected(dataTransfer.files);

      // Show success toast
      toast.success(
        `${imageFiles.length} image${
          imageFiles.length > 1 ? "s" : ""
        } pasted successfully`
      );
    }
  };

  // Keyboard navigation for image preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewImage) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPreviousImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextImage();
      }
    };

    if (previewImage) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [previewImage, currentImageIndex, images]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      handlePaste(e);
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, []);

  // Standalone dropzone component (used when no images)
  const renderStandaloneDropzone = () => (
    <div
      ref={dropzoneRef}
      tabIndex={0}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-gray-300"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <label
        htmlFor={id}
        className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Upload
          className={`w-8 h-8 transition-transform ${
            isDragging ? "scale-110" : ""
          }`}
        />
        <span className="text-sm font-medium">
          {isDragging
            ? "Drop files here"
            : "Click to browse, drag and drop, or paste"}
        </span>
        {description && !isDragging && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </label>
    </div>
  );

  // Compact dropzone card (used in grid mode)
  const renderCompactDropzone = () => (
    <div
      className={`relative border-2 border-dashed rounded-lg transition-all aspect-square ${
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-gray-300"
      }`}
    >
      <input
        id={id}
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <label
        htmlFor={id}
        className="cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors h-full w-full p-4"
      >
        <Upload
          className={`w-6 h-6 transition-transform ${
            isDragging ? "scale-110" : ""
          }`}
        />
        <span className="text-xs font-medium text-center">
          {isDragging ? "Drop here" : "Add more"}
        </span>
      </label>
    </div>
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {!hasImages ? (
        // Standalone mode - show large dropzone
        <div
          ref={dropzoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {renderStandaloneDropzone()}
        </div>
      ) : (
        // Grid mode - show images with compact dropzone card
        <div
          ref={dropzoneRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-2"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {images.map((image) => (
            <div key={image.id} className="relative group aspect-square">
              <img
                src={image.url}
                alt={`Uploaded ${image.id}`}
                className="w-full h-full object-cover object-top rounded border cursor-pointer"
                onClick={() => setPreviewImage(image)}
              />
              {renderImageOverlay ? (
                renderImageOverlay(image, () => setPreviewImage(image))
              ) : (
                <>
                  {onRemoveImage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(image.id);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {renderCompactDropzone()}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Image Preview {currentImageIndex >= 0 && images.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({currentImageIndex + 1} of {images.length})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <div className="flex items-center justify-center">
                <img
                  src={previewImage.url}
                  alt="Preview"
                  className="max-h-[70vh] w-auto object-contain rounded"
                />
              </div>

              {/* Navigation Buttons */}
              {images.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={goToPreviousImage}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  {currentImageIndex < images.length - 1 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                      onClick={goToNextImage}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  )}
                </>
              )}

              {/* Keyboard hint */}
              {images.length > 1 && (
                <div className="text-center mt-3 text-xs text-muted-foreground">
                  Use arrow keys ← → to navigate
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
