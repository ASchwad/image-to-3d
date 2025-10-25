import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadDropzone } from "@/components/ImageUploadDropzone";
import type { UploadedImageData } from "@/components/ImageUploadDropzone";
import OpenAI from "openai";
import { Sparkles, Download, Loader2 } from "lucide-react";

export const SoraVideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrls, setVideoUrls] = useState<(string | null)[]>([null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const [videoProgresses, setVideoProgresses] = useState<number[]>([0, 0, 0]);
  const [videoStatuses, setVideoStatuses] = useState<string[]>(["", "", ""]);
  const [videoIds, setVideoIds] = useState<(string | null)[]>([null, null, null]);

  // New state for advanced options
  const [startImages, setStartImages] = useState<UploadedImageData[]>([]);
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [model, setModel] = useState<"sora-2" | "sora-2-pro">("sora-2");
  const [resolution, setResolution] = useState<"1280x720" | "720x1280" | "1024x1792" | "1792x1024">("1280x720");
  const [duration, setDuration] = useState<"4" | "8" | "12">("4");

  const handleImageUpload = async (files: FileList) => {
    const file = files[0]; // Only take the first file
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Load and resize image to match resolution
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      const [targetWidth, targetHeight] = resolution.split('x').map(Number);

      console.log(`Original image: ${img.width}x${img.height}, Target: ${targetWidth}x${targetHeight}`);

      // Create canvas to resize image
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setError("Failed to create canvas context");
        URL.revokeObjectURL(url);
        return;
      }

      // Draw and resize image to target dimensions
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert canvas to blob with proper format
      const mimeType = file.type === 'image/webp' ? 'image/png' : file.type;

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setError("Failed to convert image");
            URL.revokeObjectURL(url);
            return;
          }

          console.log(`Blob created, size: ${blob.size}, type: ${blob.type}`);

          // Create new file from blob with proper extension
          const extension = mimeType.split('/')[1];
          const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);

          const resizedFile = new File([blob], fileName, {
            type: mimeType,
            lastModified: Date.now(),
          });

          // Verify the resized image dimensions
          const verifyImg = new Image();
          const verifyUrl = URL.createObjectURL(resizedFile);

          verifyImg.onload = () => {
            console.log(`Resized image verified: ${verifyImg.width}x${verifyImg.height}`);

            if (verifyImg.width !== targetWidth || verifyImg.height !== targetHeight) {
              setError(`Resize failed: Got ${verifyImg.width}x${verifyImg.height} instead of ${targetWidth}x${targetHeight}`);
              URL.revokeObjectURL(verifyUrl);
              URL.revokeObjectURL(url);
              return;
            }

            // Success - set the resized image
            setStartImages([{ url: verifyUrl, id: "start-image" }]);
            setStartImageFile(resizedFile);
            setError(null);

            // Clean up original URL
            URL.revokeObjectURL(url);

            // Show success message if image was resized
            if (img.width !== targetWidth || img.height !== targetHeight) {
              console.log(`Image resized from ${img.width}x${img.height} to ${targetWidth}x${targetHeight}`);
            }
          };

          verifyImg.onerror = () => {
            setError("Failed to verify resized image");
            URL.revokeObjectURL(verifyUrl);
            URL.revokeObjectURL(url);
          };

          verifyImg.src = verifyUrl;
        },
        mimeType,
        1.0 // Use max quality to ensure no issues
      );
    };

    img.onerror = () => {
      setError("Failed to load image");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleRemoveImage = () => {
    if (startImages.length > 0) {
      URL.revokeObjectURL(startImages[0].url);
    }
    setStartImages([]);
    setStartImageFile(null);
  };

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt describing your video");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrls([null, null, null]);
    setVideoProgresses([0, 0, 0]);
    setVideoStatuses(["Initializing...", "Initializing...", "Initializing..."]);
    setVideoIds([null, null, null]);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file"
        );
      }

      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
      });

      // Prepare video creation parameters
      const videoParams: any = {
        model: model,
        prompt: prompt,
        size: resolution,
        seconds: duration, // Keep as string, API expects '4', '8', or '12'
      };

      // If there's a start image, pass the File object directly
      if (startImageFile) {
        console.log(`Adding input_reference: ${startImageFile.name}, type: ${startImageFile.type}, size: ${startImageFile.size}`);

        // Verify image dimensions one more time before sending
        const verifyImg = new Image();
        const verifyUrl = URL.createObjectURL(startImageFile);

        await new Promise((resolve, reject) => {
          verifyImg.onload = () => {
            console.log(`Final verification before API call: ${verifyImg.width}x${verifyImg.height}`);
            URL.revokeObjectURL(verifyUrl);

            const [targetWidth, targetHeight] = resolution.split('x').map(Number);
            if (verifyImg.width !== targetWidth || verifyImg.height !== targetHeight) {
              reject(new Error(`Image dimensions mismatch: ${verifyImg.width}x${verifyImg.height} vs ${targetWidth}x${targetHeight}`));
            } else {
              resolve(true);
            }
          };
          verifyImg.onerror = () => {
            URL.revokeObjectURL(verifyUrl);
            reject(new Error("Failed to verify image"));
          };
          verifyImg.src = verifyUrl;
        });

        videoParams.input_reference = startImageFile;
      }

      console.log("Starting 3 parallel video generations with params:", {
        model: videoParams.model,
        prompt: videoParams.prompt,
        size: videoParams.size,
        seconds: videoParams.seconds,
        has_input_reference: !!videoParams.input_reference
      });

      // Create 3 parallel video generation promises
      const videoGenerationPromises = [0, 1, 2].map(async (index) => {
        try {
          // Start video generation
          let video = await openai.videos.create(videoParams);

          console.log(`Video ${index + 1} generation started:`, video.id);

          // Update video ID for this slot
          setVideoIds(prev => {
            const newIds = [...prev];
            newIds[index] = video.id;
            return newIds;
          });

          setVideoProgresses(prev => {
            const newProgress = [...prev];
            newProgress[index] = video.progress ?? 0;
            return newProgress;
          });

          // Poll for completion
          while (video.status === "in_progress" || video.status === "queued") {
            video = await openai.videos.retrieve(video.id);
            const currentProgress = video.progress ?? 0;

            setVideoProgresses(prev => {
              const newProgress = [...prev];
              newProgress[index] = currentProgress;
              return newProgress;
            });

            const statusText = video.status === "queued" ? "Queued" : "Processing";
            setVideoStatuses(prev => {
              const newStatuses = [...prev];
              newStatuses[index] = `${statusText}: ${currentProgress.toFixed(1)}%`;
              return newStatuses;
            });

            console.log(`Video ${index + 1} ${statusText}: ${currentProgress.toFixed(1)}%`);

            // Wait 2 seconds before checking again
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          if (video.status === "failed") {
            throw new Error(`Video ${index + 1} generation failed`);
          }

          console.log(`Video ${index + 1} generation completed`);
          setVideoStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[index] = "Downloading...";
            return newStatuses;
          });

          // Download the video content
          const content = await openai.videos.downloadContent(video.id);
          const arrayBuffer = await content.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "video/mp4" });
          const url = URL.createObjectURL(blob);

          setVideoUrls(prev => {
            const newUrls = [...prev];
            newUrls[index] = url;
            return newUrls;
          });

          setVideoStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[index] = "Completed!";
            return newStatuses;
          });

          console.log(`Video ${index + 1} ready for display`);
        } catch (err) {
          console.error(`Video ${index + 1} error:`, err);
          setVideoStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[index] = `Failed: ${err instanceof Error ? err.message : "Unknown error"}`;
            return newStatuses;
          });
          throw err;
        }
      });

      // Wait for all 3 videos to complete
      await Promise.all(videoGenerationPromises);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate videos"
      );
      console.error("Sora video generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (index: number) => {
    const videoUrl = videoUrls[index];
    if (!videoUrl) return;

    try {
      // Fetch the blob URL and convert to downloadable file
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `sora-video-${index + 1}-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the temporary URL
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download video");
    }
  };

  return (
    <div className="px-4 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Sora Video Generator
          </CardTitle>
          <CardDescription>
            Generate videos using OpenAI's Sora-2 model. Describe your vision
            and let AI create a video for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={(value: "sora-2" | "sora-2-pro") => setModel(value)} disabled={isGenerating}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sora-2">Sora 2 (720p)</SelectItem>
                  <SelectItem value="sora-2-pro">Sora 2 Pro (1024p)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resolution Selection */}
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select
                value={resolution}
                onValueChange={(value: "1280x720" | "720x1280" | "1024x1792" | "1792x1024") => setResolution(value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1280x720">1280x720 (16:9)</SelectItem>
                  <SelectItem value="720x1280">720x1280 (9:16)</SelectItem>
                  {model === "sora-2-pro" && (
                    <>
                      <SelectItem value="1024x1792">1024x1792 (9:16 HD)</SelectItem>
                      <SelectItem value="1792x1024">1792x1024 (16:9 HD)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={(value: "4" | "8" | "12") => setDuration(value)} disabled={isGenerating}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 seconds</SelectItem>
                  <SelectItem value="8">8 seconds</SelectItem>
                  <SelectItem value="12">12 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Image Upload (Optional) */}
          <div className="space-y-2">
            <ImageUploadDropzone
              id="start-image-upload"
              label="Start Image (Optional)"
              description={`Upload an image to use as the first frame. Images will be automatically resized to ${resolution}. Supports JPEG, PNG, and WebP.`}
              multiple={false}
              onFilesSelected={handleImageUpload}
              images={startImages}
              onRemoveImage={handleRemoveImage}
            />
            {startImages.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">
                💡 Tip: Upload any image - it will automatically be resized to match your selected resolution.
              </p>
            )}
          </div>

          {/* Prompt Input */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="sora-prompt" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Video Prompt
              </Label>
              <Textarea
                id="sora-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="text-sm min-h-[120px]"
                placeholder={startImages.length > 0
                  ? "Describe what happens in the video from the start image... (e.g., 'She turns around and smiles, then slowly walks out of the frame')"
                  : "Describe your video... (e.g., 'A video of the words Thank you in sparkling letters')"
                }
                disabled={isGenerating}
              />
            </div>
            <Button
              onClick={generateVideo}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating 3 Videos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate 3 Videos with Sora
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm font-semibold text-destructive mb-1">
                Error:
              </p>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Loading State with Progress for Each Video */}
          {isGenerating && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Generation Progress</h3>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Video {index + 1}: {videoStatuses[index] || "Initializing..."}
                    </p>
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {videoProgresses[index].toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${videoProgresses[index]}%` }}
                    />
                  </div>
                  {videoIds[index] && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      ID: {videoIds[index]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Video Display Grid */}
          {videoUrls.some((url) => url !== null) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Generated Videos</h3>
                <Button
                  onClick={() => {
                    // Clean up video URLs
                    videoUrls.forEach(url => {
                      if (url) URL.revokeObjectURL(url);
                    });
                    setVideoUrls([null, null, null]);
                    setPrompt("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Generate New Videos
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-muted rounded-lg overflow-hidden aspect-video relative">
                      {videoUrls[index] ? (
                        <>
                          <video
                            src={videoUrls[index]!}
                            controls
                            className="w-full h-full"
                            loop
                          >
                            Your browser does not support the video tag.
                          </video>
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Video {index + 1}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          {isGenerating ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span>Generating...</span>
                            </div>
                          ) : (
                            <span>Video {index + 1}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {videoUrls[index] && (
                      <Button
                        onClick={() => handleDownload(index)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download Video {index + 1}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
