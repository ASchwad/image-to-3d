import { useState } from "react";
import { GeminiImageService, type GeneratedImage } from "@/services/gemini";
import { FluxImageService } from "@/services/flux";
import { DEFAULT_SELECTED_PERSPECTIVES } from "@/constants/meshGeneration";

type ImageModel = "gemini" | "flux";

interface UsePerspectiveActionsOptions {
  geminiService: GeminiImageService;
  fluxService: FluxImageService | null;
}

export function usePerspectiveActions({
  geminiService,
  fluxService,
}: UsePerspectiveActionsOptions) {
  const [selectedPerspectives, setSelectedPerspectives] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED_PERSPECTIVES)
  );

  const togglePerspectiveSelection = (perspective: string) => {
    setSelectedPerspectives((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(perspective)) {
        newSet.delete(perspective);
      } else {
        newSet.add(perspective);
      }
      return newSet;
    });
  };

  const downloadImage = (image: GeneratedImage, selectedModel: ImageModel) => {
    if (selectedModel === "flux" && fluxService) {
      fluxService.downloadImage(image);
    } else {
      geminiService.downloadImage(image);
    }
  };

  const downloadAllImages = (images: GeneratedImage[]) => {
    geminiService.downloadAllImages(images);
  };

  const resetPerspectiveSelection = () => {
    setSelectedPerspectives(new Set(DEFAULT_SELECTED_PERSPECTIVES));
  };

  return {
    selectedPerspectives,
    setSelectedPerspectives,
    togglePerspectiveSelection,
    downloadImage,
    downloadAllImages,
    resetPerspectiveSelection,
  };
}
