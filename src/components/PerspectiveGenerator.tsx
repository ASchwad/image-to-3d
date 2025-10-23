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
  type ReferenceImage,
} from "@/services/gemini";
import { FluxImageService } from "@/services/flux";
import { TrellisService } from "@/services/trellis";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Box,
} from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";
import { ImageUploadDropzone } from "./ImageUploadDropzone";
import { ModelSelector } from "./ModelSelector";
import { PerspectiveGrid } from "./PerspectiveGrid";
import { EditPerspectiveDialog } from "./EditPerspectiveDialog";
import { ErrorDisplay } from "./ErrorDisplay";
import { usePerspectiveGeneration } from "@/hooks/usePerspectiveGeneration";
import { usePerspectiveActions } from "@/hooks/usePerspectiveActions";
import { useMeshGeneration } from "@/hooks/useMeshGeneration";
import { PERSPECTIVE_ORDER } from "@/constants/meshGeneration";

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
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("flux");
  const [editingPerspective, setEditingPerspective] = useState<string | null>(
    null
  );

  const geminiService = new GeminiImageService(apiKey);
  const fluxService = replicateToken
    ? new FluxImageService(replicateToken)
    : null;
  const trellisService = replicateToken
    ? new TrellisService(replicateToken)
    : null;

  const {
    generatedImages,
    isGenerating,
    currentGeneratingPerspective,
    perspectiveLoadingStates,
    generatePerspectives,
    regenerateSpecificPerspective,
    editSpecificPerspective,
    regenerateAll,
  } = usePerspectiveGeneration({
    geminiService,
    fluxService,
    onError: setError,
  });

  const {
    selectedPerspectives,
    togglePerspectiveSelection,
    downloadImage,
    downloadAllImages,
  } = usePerspectiveActions({
    geminiService,
    fluxService,
  });

  const { meshProgress, meshResult, generateMeshFromImages } =
    useMeshGeneration({
      trellisService,
      onError: setError,
    });

  const handleGenerate = async () => {
    if (referenceImages.length === 0) {
      setError("Please upload a reference image for 4-perspective generation");
      return;
    }

    if (selectedModel === "flux" && !fluxService) {
      setError("Replicate API token is required for Flux model");
      return;
    }

    setError("");
    await generatePerspectives(
      referenceImages[0],
      selectedModel,
      prompt.trim() || undefined
    );
  };

  const handleRegenerateSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left"
  ) => {
    if (referenceImages.length === 0) {
      setError("Missing reference image");
      return;
    }

    setError("");
    await regenerateSpecificPerspective(
      perspective,
      referenceImages[0],
      selectedModel,
      prompt.trim() || undefined
    );
  };

  const handleEditSpecificPerspective = async (
    perspective: string,
    editInstructions: string
  ) => {
    if (referenceImages.length === 0) {
      setError("Missing reference image");
      return;
    }

    setError("");
    await editSpecificPerspective(
      perspective as "front" | "right" | "back" | "left",
      editInstructions,
      referenceImages[0],
      selectedModel,
      prompt.trim() || undefined
    );
  };

  const handleRegenerateAll = () => {
    if (referenceImages.length === 0) return;
    regenerateAll(referenceImages[0], selectedModel, prompt.trim() || undefined);
  };

  const handleDownload = (image: any) => {
    downloadImage(image, selectedModel);
  };

  const handleBatchDownload = () => {
    downloadAllImages(generatedImages);
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

    if (selectedPerspectives.size === 0) {
      setError("Please select at least 1 image for mesh generation");
      return;
    }

    const orderedImages = PERSPECTIVE_ORDER.filter((perspective) =>
      selectedPerspectives.has(perspective)
    )
      .map((perspective) => {
        const image = generatedImages.find(
          (img) => img.perspective === perspective
        );
        if (!image) {
          throw new Error(`Missing ${perspective} perspective image`);
        }
        return image;
      });

    if (orderedImages.length === 0) {
      setError("No selected images available for mesh generation");
      return;
    }

    setError("");
    await generateMeshFromImages(orderedImages);
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
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              replicateToken={replicateToken}
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

            <ErrorDisplay error={error} />

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
                <PerspectiveGrid
                  generatedImages={generatedImages}
                  currentGeneratingPerspective={currentGeneratingPerspective}
                  perspectiveLoadingStates={perspectiveLoadingStates}
                  selectedPerspectives={selectedPerspectives}
                  selectedModel={selectedModel}
                  geminiService={geminiService}
                  fluxService={fluxService}
                  onToggleSelection={togglePerspectiveSelection}
                  onDownload={handleDownload}
                  onRegenerate={handleRegenerateSpecificPerspective}
                  onEdit={setEditingPerspective}
                  isGenerating={isGenerating}
                />
                {generatedImages.length > 0 && (
                  <div className="space-y-2">
                    {trellisService && selectedPerspectives.size > 0 && (
                      <div className="text-center text-sm text-muted-foreground">
                        {selectedPerspectives.size} of {generatedImages.length}{" "}
                        images selected for mesh generation
                      </div>
                    )}
                    <div className="flex justify-center gap-2 pt-2">
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
                        </>
                      )}
                      {trellisService && generatedImages.length > 0 && (
                        <Button
                          onClick={handleGenerate3DMesh}
                          variant="default"
                          disabled={
                            selectedPerspectives.size === 0 ||
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
                              {meshProgress.message || "Generating 3D Mesh..."}
                            </>
                          ) : (
                            <>
                              <Box className="w-4 h-4" />
                              Generate 3D Mesh
                              {selectedPerspectives.size > 0 &&
                                selectedPerspectives.size <
                                  generatedImages.length &&
                                ` (${selectedPerspectives.size})`}
                            </>
                          )}
                        </Button>
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

        <EditPerspectiveDialog
          perspective={editingPerspective}
          onClose={() => setEditingPerspective(null)}
          onApply={handleEditSpecificPerspective}
          isLoading={Object.values(perspectiveLoadingStates).some(Boolean)}
        />
      </div>
    </div>
  );
}
