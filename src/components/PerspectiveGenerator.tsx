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
  type ImageAnalysis,
} from "@/services/gemini";
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
  X,
  RefreshCw,
  RotateCcw,
  Edit as EditIcon,
  Box,
} from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";

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
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(
    null
  );
  const [generatedPrompts, setGeneratedPrompts] = useState<{
    [key: string]: string;
  }>({});
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
  const trellisService = replicateToken
    ? new TrellisService(replicateToken)
    : null;

  const handleGenerate = async () => {
    if (referenceImages.length === 0) {
      setError("Please upload a reference image for 4-perspective generation");
      return;
    }

    setIsGenerating(true);
    setError("");
    setImageAnalysis(null);
    setGeneratedPrompts({});
    setCurrentGeneratingPerspective(null);
    setPerspectiveLoadingStates({
      front: false,
      right: false,
      back: false,
      left: false,
    });

    try {
      const result = await geminiService.generate3DPerspectivesWithDetails(
        referenceImages[0],
        prompt.trim() || undefined,
        (analysis, prompts) => {
          setImageAnalysis(analysis);
          setGeneratedPrompts(prompts);
        },
        (newImage) => {
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
        (perspective) => {
          setCurrentGeneratingPerspective(perspective);
        }
      );
      setGeneratedImages(result.images);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate 4 perspectives"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left"
  ) => {
    if (!imageAnalysis || referenceImages.length === 0) {
      setError("Missing image analysis or reference image");
      return;
    }

    setPerspectiveLoadingStates((prev) => ({ ...prev, [perspective]: true }));
    setError("");

    const rightViewImage = generatedImages.find(
      (img) => img.perspective === "right"
    );

    try {
      await geminiService.regenerateSpecificPerspective(
        referenceImages[0],
        perspective,
        imageAnalysis,
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
    if (!imageAnalysis || referenceImages.length === 0) {
      setError("Missing image analysis or reference image");
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

    const rightViewImage = generatedImages.find(
      (img) => img.perspective === "right"
    );

    try {
      await geminiService.editSpecificPerspective(
        referenceImages[0],
        perspective,
        imageAnalysis,
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
    setImageAnalysis(null);
    setGeneratedPrompts({});
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

    geminiService.downloadImage(image);
  };

  const handleBatchDownload = () => {
    geminiService.downloadAllImages(generatedImages);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

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

        const referenceImage = await geminiService.fileToReferenceImage(file);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Generate image + 3D asset
          </CardTitle>
          <CardDescription>
            Generate 4 Perspectives and a 3D Asset from a single image
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reference-images">
              Reference Images (required)
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                id="reference-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="reference-images"
                className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span>Upload reference images</span>
                <span className="text-xs">
                  Click to browse or drag and drop
                </span>
              </label>
            </div>
          </div>

          {referenceImages.length > 0 && (
            <div className="space-y-2">
              <Label>Reference Images</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {referenceImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={geminiService.createReferenceImageUrl(image)}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeReferenceImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
      {imageAnalysis && Object.keys(generatedPrompts).length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Image Analysis</CardTitle>
              <CardDescription>
                AI analysis of your reference image used for generating
                consistent perspectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Subject:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.subject}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Object Type:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.objectType}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Style:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.style}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Lighting:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.lighting}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Materials:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.materials}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Background:</Label>
                  <p className="text-muted-foreground mt-1">
                    {imageAnalysis.background}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Prompts</CardTitle>
              <CardDescription>
                The specific prompts used for each perspective to ensure
                consistency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(generatedPrompts).map(
                  ([perspective, prompt]) => (
                    <div key={perspective} className="border rounded-lg p-4">
                      <Label className="font-medium capitalize text-primary">
                        {perspective} View Prompt:
                      </Label>
                      <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                        {prompt}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  const isProcessing = isCurrentlyGenerating || isRegenerating;
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
                              src={geminiService.createImageUrl(image)}
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
                              {meshProgress.message || "Generating 3D Mesh..."}
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
        imageAnalysis={imageAnalysis || undefined}
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
  );
}
