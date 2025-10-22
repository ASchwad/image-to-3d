import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadDropzoneProps {
  id: string;
  label: string;
  description?: string;
  multiple?: boolean;
  onFilesSelected: (files: FileList) => void | Promise<void>;
}

export function ImageUploadDropzone({
  id,
  label,
  description,
  multiple = true,
  onFilesSelected,
}: ImageUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const dropzoneRef = useRef<HTMLDivElement>(null);

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
    if (e.dataTransfer.types.includes('Files')) {
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
      if (item.type.startsWith('image/')) {
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
      imageFiles.forEach(file => dataTransfer.items.add(file));
      await onFilesSelected(dataTransfer.files);

      // Show success toast
      toast.success(
        `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} pasted successfully`
      );
    }
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      handlePaste(e);
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        ref={dropzoneRef}
        tabIndex={0}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-gray-300"
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
          <Upload className={`w-8 h-8 transition-transform ${isDragging ? "scale-110" : ""}`} />
          <span className="text-sm font-medium">
            {isDragging ? "Drop files here" : "Click to browse, drag and drop, or paste"}
          </span>
          {description && !isDragging && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </label>
      </div>
    </div>
  );
}
