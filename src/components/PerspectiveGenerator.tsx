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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GeminiImageService,
  type GeneratedImage,
  type ReferenceImage,
} from "@/services/gemini";
import { FluxImageService } from "@/services/flux";
import {
  TrellisService,
  type MeshGenerationProgress,
  type TrellisOutput,
} from "@/services/trellis";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Upload,
  RefreshCw,
  RotateCcw,
  Edit as EditIcon,
  Box,
} from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";
import { ImageUploadDropzone } from "./ImageUploadDropzone";
import { ModelSelector } from "./ModelSelector";

type ImageModel = "gemini" | "flux";

interface PerspectiveGeneratorProps {
  apiKey: string;
  replicateToken?: string;
}

export function PerspectiveGenerator({
  apiKey,
  replicateToken,
}: PerspectiveGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("flux");
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
  const [editingPerspective, setEditingPerspective] = useState<string | null>(
    null
  );
  const [editPrompt, setEditPrompt] = useState("");

  // 3D mesh generation states
  const [meshProgress, setMeshProgress] = useState<MeshGenerationProgress>({
    status: "idle",
  });
  const [meshResult, setMeshResult] = useState<TrellisOutput | null>(null);

  const geminiService = new GeminiImageService(apiKey);
  const fluxService = replicateToken
    ? new FluxImageService(replicateToken)
    : null;
  const trellisService = replicateToken
    ? new TrellisService(replicateToken)
    : null;

  const handleGenerate = async () => {
    if (referenceImages.length === 0) {
      setError("Please upload a reference image for 4-perspective generation");
      return;
    }

    if (selectedModel === "flux" && !fluxService) {
      setError("Replicate API token is required for Flux model");
      return;
    }

    setIsGenerating(true);
    setError("");
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });

    try {
      if (selectedModel === "flux" && fluxService) {
        // Use Flux to generate 4 perspectives
        await generateWithFlux();
      } else {
        // Use Gemini to generate 4 perspectives
        await geminiService.generate3DPerspectivesSimple(
          referenceImages[0],
          prompt.trim() || undefined,
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
      setError(
        err instanceof Error ? err.message : "Failed to generate 4 perspectives"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWithFlux = async () => {
    if (!fluxService) return;

    // Order: right first (like Gemini), then front, back, left
    const perspectives = [
      { name: "right", prompt: "right side view, 90-degree profile" },
      {
        name: "front",
        prompt: "front view, facing camera directly, symmetrical composition",
      },
      { name: "back", prompt: "back view, rear side visible" },
      {
        name: "left",
        prompt: "left side view, 90-degree profile from the left",
      },
    ];

    let firstGeneratedImage: GeneratedImage | null = null;
    let frontViewImage: GeneratedImage | null = null;

    for (let i = 0; i < perspectives.length; i++) {
      const perspective = perspectives[i];
      setCurrentGeneratingPerspective(perspective.name);

      // Build the prompt
      let fullPrompt: string;
      let referenceToUse: ReferenceImage;

      if (perspective.name === "left" && frontViewImage) {
        // Special handling for left view - use front view as reference and rotate 90 degrees left
        fullPrompt =
          "Rotate this view 90 degrees to the left to show the left side profile of the object. Maintain consistent lighting, style, and white background. Orthographic side view.";
        referenceToUse = {
          data: frontViewImage.data,
          mimeType: frontViewImage.mimeType,
        };
      } else {
        // Include user's base prompt only for the first (right) view
        const basePrompt = i === 0 && prompt.trim() ? `${prompt.trim()}. ` : "";
        fullPrompt = `${basePrompt}Generate a ${perspective.prompt} of this object. Maintain consistent lighting, style, and white background. Orthographic view.`;

        // Use original reference for first (right) view, then use the first generated image for others
        referenceToUse =
          i === 0
            ? referenceImages[0]
            : firstGeneratedImage
            ? ({
                data: firstGeneratedImage.data,
                mimeType: firstGeneratedImage.mimeType,
              } as ReferenceImage)
            : referenceImages[0];
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

        // Store first generated image (right view) to use as reference for others
        if (i === 0) {
          firstGeneratedImage = image;
        }
        // Store front view for left view generation
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

  const handleRegenerateSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left"
  ) => {
    if (referenceImages.length === 0) {
      setError("Missing reference image");
      return;
    }

    setPerspectiveLoadingStates((prev) => ({ ...prev, [perspective]: true }));
    setError("");

    try {
      if (selectedModel === "flux" && fluxService) {
        // Regenerate with Flux
        const perspectivePrompts: { [key: string]: string } = {
          front: "front view, facing camera directly, symmetrical composition",
          right: "right side view, 90-degree profile",
          back: "back view, rear side visible",
          left: "left side view, 90-degree profile from the left",
        };

        // Use right view as reference for front, back
        // Use front view as reference for left view
        // Use original reference for right view
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );
        const frontViewImage = generatedImages.find(
          (img) => img.perspective === "front"
        );

        // Build the prompt
        let fullPrompt: string;
        let referenceToUse: ReferenceImage;

        if (perspective === "left" && frontViewImage) {
          // Special handling for left view - use front view as reference and rotate 90 degrees left
          fullPrompt =
            "Rotate this view 90 degrees to the left to show the left side profile of the object. Maintain consistent lighting, style, and white background. Orthographic side view.";
          referenceToUse = {
            data: frontViewImage.data,
            mimeType: frontViewImage.mimeType,
          };
        } else {
          // Include user's base prompt only for the right view
          const basePrompt =
            perspective === "right" && prompt.trim()
              ? `${prompt.trim()}. `
              : "";
          fullPrompt = `${basePrompt}Generate a ${perspectivePrompts[perspective]} of this object. Maintain consistent lighting, style, and white background. Orthographic view.`;

          referenceToUse =
            perspective === "right" || !rightViewImage
              ? referenceImages[0]
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

        setPerspectiveLoadingStates((prev) => ({
          ...prev,
          [perspective]: false,
        }));
      } else {
        // Regenerate with Gemini
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );

        await geminiService.regenerateSpecificPerspective(
          referenceImages[0],
          perspective,
          undefined,
          prompt.trim() || undefined,
          (newImage) => {
            setGeneratedImages((prev) => {
              return prev.map((img) =>
                img.perspective === newImage.perspective ? newImage : img
              );
            });
            setPerspectiveLoadingStates((prev) => ({
              ...prev,
              [perspective]: false,
            }));
          },
          () => {
            // Already handled by setPerspectiveLoadingStates above
          },
          perspective === "right" ? undefined : rightViewImage
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate perspective"
      );
      setPerspectiveLoadingStates((prev) => ({
        ...prev,
        [perspective]: false,
      }));
    }
  };

  const handleEditSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left",
    editInstructions: string
  ) => {
    if (referenceImages.length === 0) {
      setError("Missing reference image");
      return;
    }

    const currentImage = generatedImages.find(
      (img) => img.perspective === perspective
    );
    if (!currentImage) {
      setError("No existing image found for this perspective");
      return;
    }

    setPerspectiveLoadingStates((prev) => ({ ...prev, [perspective]: true }));
    setError("");

    try {
      if (selectedModel === "flux" && fluxService) {
        // Edit with Flux
        const perspectivePrompts: { [key: string]: string } = {
          front: "front view, facing camera directly, symmetrical composition",
          right: "right side view, 90-degree profile",
          back: "back view, rear side visible",
          left: "180° rotated view showing the opposite side",
        };

        const fullPrompt = `${editInstructions}. Maintain ${perspectivePrompts[perspective]} of this object. Keep consistent lighting, style, and white background. Orthographic view.`;

        // For Flux, we'll use the current generated image as reference
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

        setPerspectiveLoadingStates((prev) => ({
          ...prev,
          [perspective]: false,
        }));
      } else {
        // Edit with Gemini
        const rightViewImage = generatedImages.find(
          (img) => img.perspective === "right"
        );

        await geminiService.editSpecificPerspective(
          referenceImages[0],
          perspective,
          undefined,
          currentImage,
          editInstructions,
          prompt.trim() || undefined,
          (newImage) => {
            setGeneratedImages((prev) => {
              return prev.map((img) =>
                img.perspective === newImage.perspective ? newImage : img
              );
            });
            setPerspectiveLoadingStates((prev) => ({
              ...prev,
              [perspective]: false,
            }));
          },
          () => {
            // Already handled by setPerspectiveLoadingStates above
          },
          perspective === "right" ? undefined : rightViewImage
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to edit perspective"
      );
      setPerspectiveLoadingStates((prev) => ({
        ...prev,
        [perspective]: false,
      }));
    }
  };

  const handleRegenerateAll = () => {
    setGeneratedImages([]);
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });
    handleGenerate();
  };

  const handleDownload = (image: GeneratedImage) => {
    console.log("handle download", image);

    if (selectedModel === "flux" && fluxService) {
      fluxService.downloadImage(image);
    } else {
      geminiService.downloadImage(image);
    }
  };

  const handleBatchDownload = () => {
    geminiService.downloadAllImages(generatedImages);
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

  const handleGenerate3DMesh = async () => {
    if (!trellisService) {
      setError("Replicate API token not configured");
      return;
    }

    if (generatedImages.length !== 4) {
      setError("Need all 4 perspective images to generate 3D mesh");
      return;
    }

    const orderedImages = ["front", "right", "back", "left"].map(
      (perspective) => {
        const image = generatedImages.find(
          (img) => img.perspective === perspective
        );
        if (!image) {
          throw new Error(`Missing ${perspective} perspective image`);
        }
        return image;
      }
    );

    setError("");
    setMeshResult(null);

    try {
      const result = await trellisService.generate3DMesh(
        orderedImages,
        (progress) => {
          setMeshProgress(progress);
        }
      );

      setMeshResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate 3D mesh"
      );
      setMeshProgress({ status: "idle" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl w-full space-y-6 z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Generate 3D assets from images
            </CardTitle>
            <CardDescription>
              Generate 4 clean and coherent perspectives from an input image.
              Correct the perspective details and then generate 3D Assets. Ready
              for further tuning in Blender or for 3D-printing.{" "}
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
              label="Reference Images (required)"
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
                Additional style instructions (optional)
              </Label>
              <Textarea
                id="prompt"
                placeholder="Style adjustments: realistic, cartoon style, metallic materials..."
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
              disabled={isGenerating || referenceImages.length === 0}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating 4 Views...
                </>
              ) : (
                "Generate 4 Perspectives"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis and Prompts Display */}

        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3D Perspective Views</CardTitle>
              <CardDescription>
                4 orthographic views generated for 3D modeling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {["front", "right", "back", "left"].map((perspective) => {
                    const image = generatedImages.find(
                      (img) => img.perspective === perspective
                    );
                    const isCurrentlyGenerating =
                      currentGeneratingPerspective === perspective;
                    const isRegenerating =
                      perspectiveLoadingStates[
                        perspective as "front" | "right" | "back" | "left"
                      ];
                    const isProcessing =
                      isCurrentlyGenerating || isRegenerating;
                    return (
                      <div key={perspective} className="relative group">
                        <div
                          className={`aspect-square bg-gray-100 rounded-lg border-2 overflow-hidden ${
                            isProcessing
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-200"
                          }`}
                        >
                          {image ? (
                            <>
                              <img
                                src={(selectedModel === "flux" && fluxService
                                  ? fluxService
                                  : geminiService
                                ).createImageUrl(image)}
                                alt={`${perspective} view`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  onClick={() => handleDownload(image)}
                                  size="sm"
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleRegenerateSpecificPerspective(
                                      perspective as
                                        | "front"
                                        | "right"
                                        | "back"
                                        | "left"
                                    )
                                  }
                                  size="sm"
                                  variant="secondary"
                                  disabled={isGenerating || isRegenerating}
                                  className="flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Regenerate
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingPerspective(perspective);
                                    setEditPrompt("");
                                  }}
                                  size="sm"
                                  variant="secondary"
                                  disabled={isGenerating || isRegenerating}
                                  className="flex items-center gap-1"
                                >
                                  <EditIcon className="w-3 h-3" />
                                  Edit
                                </Button>
                              </div>
                              {isRegenerating && (
                                <div className="absolute inset-0 bg-blue-50/90 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="text-xs text-blue-600">
                                      Regenerating...
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {isCurrentlyGenerating ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                  <span className="text-xs text-blue-600">
                                    Generating...
                                  </span>
                                </div>
                              ) : (
                                <div className="text-xs">Waiting...</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-center mt-2">
                          <Label
                            className={`text-sm font-medium capitalize ${
                              isProcessing ? "text-blue-600" : ""
                            }`}
                          >
                            {perspective} View
                            {isProcessing && (
                              <span className="ml-1 text-blue-500">●</span>
                            )}
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {generatedImages.length > 0 && (
                  <div className="flex justify-center gap-2 pt-4">
                    {generatedImages.length === 4 && (
                      <>
                        <Button
                          onClick={handleBatchDownload}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download All Views
                        </Button>
                        {trellisService && (
                          <Button
                            onClick={handleGenerate3DMesh}
                            variant="default"
                            disabled={
                              isGenerating ||
                              Object.values(perspectiveLoadingStates).some(
                                Boolean
                              ) ||
                              meshProgress.status === "uploading" ||
                              meshProgress.status === "generating"
                            }
                            className="flex items-center gap-2"
                          >
                            {meshProgress.status === "uploading" ||
                            meshProgress.status === "generating" ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {meshProgress.message ||
                                  "Generating 3D Mesh..."}
                              </>
                            ) : (
                              <>
                                <Box className="w-4 h-4" />
                                Generate 3D Mesh
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      onClick={handleRegenerateAll}
                      variant="outline"
                      disabled={
                        isGenerating ||
                        Object.values(perspectiveLoadingStates).some(Boolean)
                      }
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Regenerate All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <MeshGenerationResult
          meshProgress={meshProgress}
          meshResult={meshResult}
          trellisService={trellisService}
        />

        <Dialog
          open={!!editingPerspective}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPerspective(null);
              setEditPrompt("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit{" "}
                {editingPerspective
                  ? editingPerspective.charAt(0).toUpperCase() +
                    editingPerspective.slice(1)
                  : ""}{" "}
                View
              </DialogTitle>
              <DialogDescription>
                What would you like to change?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-prompt">Modifications</Label>
                <Textarea
                  id="edit-prompt"
                  placeholder="e.g., Make it brighter, change the color to blue, add more detail..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPerspective(null);
                  setEditPrompt("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (editPrompt.trim()) {
                    const perspective = editingPerspective as
                      | "front"
                      | "right"
                      | "back"
                      | "left";
                    const prompt = editPrompt.trim();
                    setEditingPerspective(null);
                    setEditPrompt("");
                    await handleEditSpecificPerspective(perspective, prompt);
                  }
                }}
                disabled={
                  !editPrompt.trim() ||
                  Object.values(perspectiveLoadingStates).some(Boolean)
                }
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
