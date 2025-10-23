import { useState } from "react";
import {
  GeminiImageService,
  type GeneratedImage,
  type ReferenceImage,
} from "@/services/gemini";
import { FluxImageService } from "@/services/flux";
import { PERSPECTIVE_PROMPTS } from "@/constants/meshGeneration";

type ImageModel = "gemini" | "flux";

interface UsePerspectiveGenerationOptions {
  geminiService: GeminiImageService;
  fluxService: FluxImageService | null;
  onError?: (error: string) => void;
}

export function usePerspectiveGeneration({
  geminiService,
  fluxService,
  onError,
}: UsePerspectiveGenerationOptions) {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingPerspective, setCurrentGeneratingPerspective] =
    useState<string | null>(null);
  const [perspectiveLoadingStates, setPerspectiveLoadingStates] = useState<{
    [key in "front" | "right" | "back" | "left"]: boolean;
  }>({
    front: false,
    right: false,
    back: false,
    left: false,
  });

  const generateWithFlux = async (
    referenceImage: ReferenceImage,
    prompt?: string
  ) => {
    if (!fluxService) return;

    const perspectives = [
      { name: "right", prompt: PERSPECTIVE_PROMPTS.right },
      { name: "front", prompt: PERSPECTIVE_PROMPTS.front },
      { name: "back", prompt: PERSPECTIVE_PROMPTS.back },
      { name: "left", prompt: PERSPECTIVE_PROMPTS.left },
    ];

    let firstGeneratedImage: GeneratedImage | null = null;
    let frontViewImage: GeneratedImage | null = null;

    for (let i = 0; i < perspectives.length; i++) {
      const perspective = perspectives[i];
      setCurrentGeneratingPerspective(perspective.name);

      let fullPrompt: string;
      let referenceToUse: ReferenceImage;

      if (perspective.name === "left" && frontViewImage) {
        fullPrompt =
          "Rotate this view 90 degrees to the left to show the left side profile of the object. Maintain consistent lighting, style, and white background. Orthographic side view.";
        referenceToUse = {
          data: frontViewImage.data,
          mimeType: frontViewImage.mimeType,
        };
      } else {
        const basePrompt = i === 0 && prompt ? `${prompt}. ` : "";
        fullPrompt = `${basePrompt}Generate a ${perspective.prompt} of this object. Maintain consistent lighting, style, and white background. Orthographic view.`;

        referenceToUse =
          i === 0
            ? referenceImage
            : firstGeneratedImage
            ? ({
                data: firstGeneratedImage.data,
                mimeType: firstGeneratedImage.mimeType,
              } as ReferenceImage)
            : referenceImage;
      }

      const images = await fluxService.generateImages(
        fullPrompt,
        referenceToUse
      );

      if (images.length > 0) {
        const image = {
          ...images[0],
          perspective: perspective.name as "front" | "right" | "back" | "left",
        };

        if (i === 0) {
          firstGeneratedImage = image;
        }
        if (perspective.name === "front") {
          frontViewImage = image;
        }

        setGeneratedImages((prev) => {
          const existing = prev.find(
            (img) => img.perspective === perspective.name
          );
          if (existing) {
            return prev.map((img) =>
              img.perspective === perspective.name ? image : img
            );
          } else {
            return [...prev, image];
          }
        });
      }
    }

    setCurrentGeneratingPerspective(null);
  };

  const generatePerspectives = async (
    referenceImage: ReferenceImage,
    selectedModel: ImageModel,
    prompt?: string
  ) => {
    setIsGenerating(true);
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });

    try {
      if (selectedModel === "flux") {
        if (!fluxService) {
          onError?.("Replicate API token is required for Flux model");
          return;
        }
        await generateWithFlux(referenceImage, prompt);
      } else {
        await geminiService.generate3DPerspectivesSimple(
          referenceImage,
          prompt,
          (newImage: GeneratedImage) => {
            setGeneratedImages((prev) => {
              const existing = prev.find(
                (img) => img.perspective === newImage.perspective
              );
              if (existing) {
                return prev.map((img) =>
                  img.perspective === newImage.perspective ? newImage : img
                );
              } else {
                return [...prev, newImage];
              }
            });
            setCurrentGeneratingPerspective(null);
          },
          (perspective: string) => {
            setCurrentGeneratingPerspective(perspective);
          }
        );
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Failed to generate 4 perspectives"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left",
    referenceImage: ReferenceImage,
    selectedModel: ImageModel,
    prompt?: string
  ) => {
    setPerspectiveLoadingStates((prev) => ({ ...prev, [perspective]: true }));

    try {
      if (selectedModel === "flux" && fluxService) {
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );
        const frontViewImage = generatedImages.find(
          (img) => img.perspective === "front"
        );

        let fullPrompt: string;
        let referenceToUse: ReferenceImage;

        if (perspective === "left" && frontViewImage) {
          fullPrompt =
            "Rotate this view 90 degrees to the left to show the left side profile of the object. Maintain consistent lighting, style, and white background. Orthographic side view.";
          referenceToUse = {
            data: frontViewImage.data,
            mimeType: frontViewImage.mimeType,
          };
        } else {
          const basePrompt =
            perspective === "right" && prompt ? `${prompt}. ` : "";
          fullPrompt = `${basePrompt}Generate a ${PERSPECTIVE_PROMPTS[perspective]} of this object. Maintain consistent lighting, style, and white background. Orthographic view.`;

          referenceToUse =
            perspective === "right" || !rightViewImage
              ? referenceImage
              : {
                  data: rightViewImage.data,
                  mimeType: rightViewImage.mimeType,
                };
        }

        const images = await fluxService.generateImages(
          fullPrompt,
          referenceToUse
        );

        if (images.length > 0) {
          const newImage = {
            ...images[0],
            perspective: perspective,
          };

          setGeneratedImages((prev) => {
            return prev.map((img) =>
              img.perspective === perspective ? newImage : img
            );
          });
        }
      } else {
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );

        await geminiService.regenerateSpecificPerspective(
          referenceImage,
          perspective,
          undefined,
          prompt,
          (newImage) => {
            setGeneratedImages((prev) => {
              return prev.map((img) =>
                img.perspective === newImage.perspective ? newImage : img
              );
            });
          },
          () => {},
          perspective === "right" ? undefined : rightViewImage
        );
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Failed to regenerate perspective"
      );
    } finally {
      setPerspectiveLoadingStates((prev) => ({
        ...prev,
        [perspective]: false,
      }));
    }
  };

  const editSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left",
    editInstructions: string,
    referenceImage: ReferenceImage,
    selectedModel: ImageModel,
    prompt?: string
  ) => {
    const currentImage = generatedImages.find(
      (img) => img.perspective === perspective
    );
    if (!currentImage) {
      onError?.("No existing image found for this perspective");
      return;
    }

    setPerspectiveLoadingStates((prev) => ({ ...prev, [perspective]: true }));

    try {
      if (selectedModel === "flux" && fluxService) {
        const fullPrompt = `${editInstructions}. Maintain ${PERSPECTIVE_PROMPTS[perspective]} of this object. Keep consistent lighting, style, and white background. Orthographic view.`;

        const currentImageAsReference: ReferenceImage = {
          data: currentImage.data,
          mimeType: currentImage.mimeType,
        };

        const images = await fluxService.generateImages(
          fullPrompt,
          currentImageAsReference
        );

        if (images.length > 0) {
          const newImage = {
            ...images[0],
            perspective: perspective,
          };

          setGeneratedImages((prev) => {
            return prev.map((img) =>
              img.perspective === perspective ? newImage : img
            );
          });
        }
      } else {
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );

        await geminiService.editSpecificPerspective(
          referenceImage,
          perspective,
          undefined,
          currentImage,
          editInstructions,
          prompt,
          (newImage) => {
            setGeneratedImages((prev) => {
              return prev.map((img) =>
                img.perspective === newImage.perspective ? newImage : img
              );
            });
          },
          () => {},
          perspective === "right" ? undefined : rightViewImage
        );
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Failed to edit perspective"
      );
    } finally {
      setPerspectiveLoadingStates((prev) => ({
        ...prev,
        [perspective]: false,
      }));
    }
  };

  const regenerateAll = (
    referenceImage: ReferenceImage,
    selectedModel: ImageModel,
    prompt?: string
  ) => {
    setGeneratedImages([]);
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });
    generatePerspectives(referenceImage, selectedModel, prompt);
  };

  const clearGeneratedImages = () => {
    setGeneratedImages([]);
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });
  };

  return {
    generatedImages,
    setGeneratedImages,
    isGenerating,
    currentGeneratingPerspective,
    perspectiveLoadingStates,
    generatePerspectives,
    regenerateSpecificPerspective,
    editSpecificPerspective,
    regenerateAll,
    clearGeneratedImages,
  };
}
