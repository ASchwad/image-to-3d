import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  GeminiImageService,
  type GeneratedImage,
  type ReferenceImage,
} from "@/services/gemini";
import { FluxImageService } from "@/services/flux";
import { Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { ImageUploadDropzone } from "./ImageUploadDropzone";
import { ModelSelector } from "./ModelSelector";

type ImageModel = "gemini" | "flux";

interface SingleImageGeneratorProps {
  apiKey: string;
  replicateToken?: string;
}

export function SingleImageGenerator({
  apiKey,
  replicateToken,
}: SingleImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("flux");

  const geminiService = new GeminiImageService(apiKey);
  const fluxService = replicateToken
    ? new FluxImageService(replicateToken)
    : null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    if (selectedModel === "flux" && !fluxService) {
      setError("Replicate API token is required for Flux model");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      let images: GeneratedImage[];

      if (selectedModel === "flux" && fluxService) {
        // Flux supports only one reference image
        const refImage =
          referenceImages.length > 0 ? referenceImages[0] : undefined;
        images = await fluxService.generateImages(prompt, refImage);
      } else {
        // Gemini
        images = await geminiService.generateImages(
          prompt,
          referenceImages.length > 0 ? referenceImages : undefined
        );
      }

      setGeneratedImages(images);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate images"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (image: GeneratedImage) => {
    if (selectedModel === "flux" && fluxService) {
      fluxService.downloadImage(image);
    } else {
      geminiService.downloadImage(image);
    }
  };

  const handleFilesSelected = async (files: FileList) => {
    setError("");
    const newReferenceImages: ReferenceImage[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError("Please upload only image files");
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          setError("Image files must be smaller than 10MB");
          return;
        }

        // Use the appropriate service based on selected model
        const service =
          selectedModel === "flux" && fluxService ? fluxService : geminiService;
        const referenceImage = await service.fileToReferenceImage(file);
        newReferenceImages.push(referenceImage);
      }

      setReferenceImages((prev) => [...prev, ...newReferenceImages]);
    } catch {
      setError("Failed to process uploaded images");
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl w-full space-y-6 z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Single Image: Create and Edit
            </CardTitle>
            <CardDescription>
              Create, edit, and enhance single images with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              replicateToken={replicateToken}
            />

            <ImageUploadDropzone
              id="reference-images"
              label={`Reference Images (optional${
                selectedModel === "flux" ? " - first image only" : ""
              })`}
              description="PNG, JPG supported"
              multiple={true}
              onFilesSelected={handleFilesSelected}
              images={referenceImages.map((image, index) => ({
                id: index,
                url: (selectedModel === "flux" && fluxService
                  ? fluxService
                  : geminiService
                ).createReferenceImageUrl(image),
              }))}
              onRemoveImage={(id) => removeReferenceImage(id as number)}
            />

            <div className="space-y-2">
              <Label htmlFor="prompt">
                Describe the image you want to generate
              </Label>
              <Textarea
                id="prompt"
                placeholder="A futuristic cityscape at sunset with flying cars..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
              <CardDescription>
                {generatedImages.length} image
                {generatedImages.length > 1 ? "s" : ""} generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={(selectedModel === "flux" && fluxService
                        ? fluxService
                        : geminiService
                      ).createImageUrl(image)}
                      alt="Generated image"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        onClick={() => handleDownload(image)}
                        size="sm"
                        variant="secondary"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
