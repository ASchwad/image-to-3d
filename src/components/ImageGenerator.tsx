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
  type TrellisOutput
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

interface ImageGeneratorProps {
  apiKey: string;
  replicateToken?: string;
}

export function ImageGenerator({ apiKey, replicateToken }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string>("");
  const [is3DMode, setIs3DMode] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(
    null
  );
  const [generatedPrompts, setGeneratedPrompts] = useState<{
    [key: string]: string;
  }>({});
  const [currentGeneratingPerspective, setCurrentGeneratingPerspective] =
    useState<string | null>(null);
  const [regeneratingPerspective, setRegeneratingPerspective] = useState<
    string | null
  >(null);
  const [editingPerspective, setEditingPerspective] = useState<string | null>(
    null
  );
  const [editPrompt, setEditPrompt] = useState("");

  // 3D mesh generation states
  const [meshProgress, setMeshProgress] = useState<MeshGenerationProgress>({
    status: 'idle'
  });
  const [meshResult, setMeshResult] = useState<TrellisOutput | null>(null);

  const geminiService = new GeminiImageService(apiKey);
  const trellisService = replicateToken ? new TrellisService(replicateToken) : null;

  const handleGenerate = async () => {
    if (is3DMode && referenceImages.length === 0) {
      setError("Please upload a reference image for 3D mode");
      return;
    }

    if (!is3DMode && !prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError("");
    setImageAnalysis(null);
    setGeneratedPrompts({});
    setCurrentGeneratingPerspective(null);
    setRegeneratingPerspective(null);

    try {
      let images: GeneratedImage[];

      if (is3DMode) {
        // Use the first reference image for 3D perspective generation with streaming
        const result = await geminiService.generate3DPerspectivesWithDetails(
          referenceImages[0],
          prompt.trim() || undefined,
          // Callback for analysis completion - show immediately
          (analysis, prompts) => {
            setImageAnalysis(analysis);
            setGeneratedPrompts(prompts);
          },
          // Callback for each image as it's generated
          (newImage) => {
            setGeneratedImages((prev) => {
              const existing = prev.find(
                (img) => img.perspective === newImage.perspective
              );
              if (existing) {
                // Replace existing image for this perspective
                return prev.map((img) =>
                  img.perspective === newImage.perspective ? newImage : img
                );
              } else {
                // Add new image
                return [...prev, newImage];
              }
            });
            setCurrentGeneratingPerspective(null); // Clear when image is completed
          },
          // Callback for perspective start
          (perspective) => {
            setCurrentGeneratingPerspective(perspective);
          }
        );
        images = result.images;
      } else {
        // Standard image generation
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

  const handleRegenerateSpecificPerspective = async (
    perspective: "front" | "right" | "back" | "left"
  ) => {
    if (!imageAnalysis || referenceImages.length === 0) {
      setError("Missing image analysis or reference image");
      return;
    }

    setRegeneratingPerspective(perspective);
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
        // Callback for when image is generated
        (newImage) => {
          setGeneratedImages((prev) => {
            return prev.map((img) =>
              img.perspective === newImage.perspective ? newImage : img
            );
          });
          setRegeneratingPerspective(null);
        },
        // Callback for perspective start
        () => {
          // Already handled by setRegeneratingPerspective above
        },
        perspective === "right" ? undefined : rightViewImage // Don't pass right view to itself
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate perspective"
      );
      setRegeneratingPerspective(null);
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

    setRegeneratingPerspective(perspective);
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
        // Callback for when image is generated
        (newImage) => {
          setGeneratedImages((prev) => {
            return prev.map((img) =>
              img.perspective === newImage.perspective ? newImage : img
            );
          });
          setRegeneratingPerspective(null);
        },
        // Callback for perspective start
        () => {
          // Already handled by setRegeneratingPerspective above
        },
        perspective === "right" ? undefined : rightViewImage
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to edit perspective"
      );
      setRegeneratingPerspective(null);
    }
  };

  const handleRegenerateAll = () => {
    // Reset all generated images and start fresh
    setGeneratedImages([]);
    setImageAnalysis(null);
    setGeneratedPrompts({});
    setCurrentGeneratingPerspective(null);
    setRegeneratingPerspective(null);
    handleGenerate();
  };

  const handleDownload = (image: GeneratedImage) => {
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
          // 10MB limit
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

    // Order the images: front, right, back, left
    const orderedImages = ["front", "right", "back", "left"].map(perspective => {
      const image = generatedImages.find(img => img.perspective === perspective);
      if (!image) {
        throw new Error(`Missing ${perspective} perspective image`);
      }
      return image;
    });

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
      setError(err instanceof Error ? err.message : "Failed to generate 3D mesh");
      setMeshProgress({ status: 'idle' });
    }
  };

  const handleDownloadMesh = (url: string, type: string) => {
    if (!trellisService) return;

    const extension = trellisService.getFileExtension(url);
    const filename = trellisService.getMeshFileName(imageAnalysis || undefined, extension);
    trellisService.downloadMeshFile(url, filename);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            AI Image Generator
          </CardTitle>
          <CardDescription>
            {is3DMode
              ? "Generate 4 orthographic views for 3D asset creation"
              : "Generate images from text prompts using Google Gemini"}
          </CardDescription>
          <div className="flex items-center gap-3 pt-2">
            <Label className="text-sm font-medium">Generation Mode:</Label>
            <Button
              variant={is3DMode ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setIs3DMode(false);
                setImageAnalysis(null);
                setGeneratedPrompts({});
                setCurrentGeneratingPerspective(null);
                setRegeneratingPerspective(null);
              }}
              className="flex items-center gap-2"
            >
              Standard
            </Button>
            <Button
              variant={is3DMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIs3DMode(true);
                setImageAnalysis(null);
                setGeneratedPrompts({});
                setCurrentGeneratingPerspective(null);
                setRegeneratingPerspective(null);
              }}
              className="flex items-center gap-2"
            >
              3D Asset Mode
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reference-images">
              Reference Images{" "}
              {is3DMode ? "(required for 3D mode)" : "(optional)"}
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
              {is3DMode
                ? "Additional style instructions (optional)"
                : "Describe the image you want to generate"}
            </Label>
            <Textarea
              id="prompt"
              placeholder={
                is3DMode
                  ? "Style adjustments: realistic, cartoon style, metallic materials..."
                  : "A futuristic cityscape at sunset with flying cars..."
              }
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
            disabled={
              isGenerating ||
              (is3DMode ? referenceImages.length === 0 : !prompt.trim())
            }
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {is3DMode ? "Generating 4 Views..." : "Generating..."}
              </>
            ) : is3DMode ? (
              "Generate 4 Perspectives"
            ) : (
              "Generate Image"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis and Prompts Display for 3D Mode */}
      {is3DMode &&
        imageAnalysis &&
        Object.keys(generatedPrompts).length > 0 && (
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
            <CardTitle>
              {is3DMode ? "3D Perspective Views" : "Generated Images"}
            </CardTitle>
            <CardDescription>
              {is3DMode
                ? `4 orthographic views generated for 3D modeling`
                : `${generatedImages.length} image${
                    generatedImages.length > 1 ? "s" : ""
                  } generated`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {is3DMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {["front", "right", "back", "left"].map((perspective) => {
                    const image = generatedImages.find(
                      (img) => img.perspective === perspective
                    );
                    const isCurrentlyGenerating =
                      currentGeneratingPerspective === perspective;
                    const isRegenerating =
                      regeneratingPerspective === perspective;
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
                              regeneratingPerspective !== null ||
                              meshProgress.status === 'uploading' ||
                              meshProgress.status === 'generating'
                            }
                            className="flex items-center gap-2"
                          >
                            {meshProgress.status === 'uploading' || meshProgress.status === 'generating' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {meshProgress.message || 'Generating 3D Mesh...'}
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
                        isGenerating || regeneratingPerspective !== null
                      }
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Regenerate All
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={geminiService.createImageUrl(image)}
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
            )}
          </CardContent>
        </Card>
      )}

      {/* 3D Mesh Generation Result */}
      {is3DMode && meshResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              3D Mesh Generated
            </CardTitle>
            <CardDescription>
              Your 3D mesh has been successfully generated from the perspective images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {meshResult.model_glb && (
                <div className="border rounded-lg p-4 text-center">
                  <h3 className="font-medium mb-2">GLB Model</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    GLTF Binary format - Web and AR/VR ready
                  </p>
                  <Button
                    onClick={() => handleDownloadMesh(meshResult.model_glb!, 'glb')}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download GLB
                  </Button>
                </div>
              )}
              {meshResult.gaussian_ply && (
                <div className="border rounded-lg p-4 text-center">
                  <h3 className="font-medium mb-2">Gaussian PLY</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Point cloud format - Gaussian splatting
                  </p>
                  <Button
                    onClick={() => handleDownloadMesh(meshResult.gaussian_ply!, 'ply')}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PLY
                  </Button>
                </div>
              )}
              {(meshResult.model_obj || meshResult.model_file) && (
                <div className="border rounded-lg p-4 text-center">
                  <h3 className="font-medium mb-2">3D Model</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    3D model file - Compatible with most software
                  </p>
                  <Button
                    onClick={() => handleDownloadMesh(meshResult.model_obj || meshResult.model_file!, meshResult.model_obj ? 'obj' : 'glb')}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {meshResult.model_obj ? 'OBJ' : 'Model'}
                  </Button>
                </div>
              )}
            </div>
            {(meshResult.video || meshResult.color_video) && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">3D Preview Video</h3>
                <div className="border rounded-lg overflow-hidden">
                  <video
                    src={meshResult.color_video || meshResult.video}
                    controls
                    className="w-full max-w-md mx-auto"
                    autoPlay
                    loop
                    muted
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
                {(meshResult.normal_video || meshResult.combined_video) && (
                  <div className="flex justify-center gap-2 mt-3">
                    {meshResult.normal_video && (
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = meshResult.normal_video!;
                          link.download = 'normal_video.mp4';
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Download Normal Video
                      </Button>
                    )}
                    {meshResult.combined_video && (
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = meshResult.combined_video!;
                          link.download = 'combined_video.mp4';
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Download Combined Video
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3D Mesh Generation Progress */}
      {is3DMode && (meshProgress.status === 'uploading' || meshProgress.status === 'generating' || meshProgress.status === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              {meshProgress.status === 'error' ? 'Mesh Generation Failed' : 'Generating 3D Mesh'}
            </CardTitle>
            <CardDescription>
              {meshProgress.message || 'Processing your perspective images...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meshProgress.status === 'error' ? (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {meshProgress.error || 'An unknown error occurred'}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{meshProgress.message}</div>
                  {meshProgress.status === 'uploading' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Uploading images to processing server...
                    </div>
                  )}
                  {meshProgress.status === 'generating' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      This may take several minutes depending on complexity...
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  // Close dialog immediately
                  const perspective = editingPerspective as
                    | "front"
                    | "right"
                    | "back"
                    | "left";
                  const prompt = editPrompt.trim();
                  setEditingPerspective(null);
                  setEditPrompt("");

                  // Then handle the edit
                  await handleEditSpecificPerspective(perspective, prompt);
                }
              }}
              disabled={!editPrompt.trim() || regeneratingPerspective !== null}
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
