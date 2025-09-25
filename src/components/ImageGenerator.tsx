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
import { GeminiImageService, type GeneratedImage, type ReferenceImage, type ImageAnalysis } from "@/services/gemini";
import { Download, Image as ImageIcon, Loader2, Upload, X, RefreshCw, RotateCcw } from "lucide-react";

interface ImageGeneratorProps {
  apiKey: string;
}

export function ImageGenerator({ apiKey }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string>("");
  const [is3DMode, setIs3DMode] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<{[key: string]: string}>({});
  const [currentGeneratingPerspective, setCurrentGeneratingPerspective] = useState<string | null>(null);
  const [regeneratingPerspective, setRegeneratingPerspective] = useState<string | null>(null);

  const geminiService = new GeminiImageService(apiKey);

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
            setGeneratedImages(prev => {
              const existing = prev.find(img => img.perspective === newImage.perspective);
              if (existing) {
                // Replace existing image for this perspective
                return prev.map(img =>
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

  const handleRegenerateSpecificPerspective = async (perspective: 'front' | 'right' | 'back' | 'left') => {
    if (!imageAnalysis || referenceImages.length === 0) {
      setError("Missing image analysis or reference image");
      return;
    }

    setRegeneratingPerspective(perspective);
    setError("");

    try {
      await geminiService.regenerateSpecificPerspective(
        referenceImages[0],
        perspective,
        imageAnalysis,
        prompt.trim() || undefined,
        // Callback for when image is generated
        (newImage) => {
          setGeneratedImages(prev => {
            return prev.map(img =>
              img.perspective === newImage.perspective ? newImage : img
            );
          });
          setRegeneratingPerspective(null);
        },
        // Callback for perspective start
        () => {
          // Already handled by setRegeneratingPerspective above
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate perspective");
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setError("");
    const newReferenceImages: ReferenceImage[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError('Please upload only image files');
          return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          setError('Image files must be smaller than 10MB');
          return;
        }

        const referenceImage = await geminiService.fileToReferenceImage(file);
        newReferenceImages.push(referenceImage);
      }

      setReferenceImages(prev => [...prev, ...newReferenceImages]);
    } catch {
      setError('Failed to process uploaded images');
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
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
              : "Generate images from text prompts using Google Gemini"
            }
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
              Reference Images {is3DMode ? "(required for 3D mode)" : "(optional)"}
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
                <span className="text-xs">Click to browse or drag and drop</span>
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
                : "Describe the image you want to generate"
              }
            </Label>
            <Textarea
              id="prompt"
              placeholder={is3DMode
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
            disabled={isGenerating || (is3DMode ? referenceImages.length === 0 : !prompt.trim())}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {is3DMode ? "Generating 4 Views..." : "Generating..."}
              </>
            ) : (
              is3DMode ? "Generate 4 Perspectives" : "Generate Image"
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {is3DMode ? "3D Perspective Views" : "Generated Images"}
            </CardTitle>
            <CardDescription>
              {is3DMode
                ? `4 orthographic views generated for 3D modeling`
                : `${generatedImages.length} image${generatedImages.length > 1 ? "s" : ""} generated`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {is3DMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {['front', 'right', 'back', 'left'].map((perspective) => {
                    const image = generatedImages.find(img => img.perspective === perspective);
                    const isCurrentlyGenerating = currentGeneratingPerspective === perspective;
                    const isRegenerating = regeneratingPerspective === perspective;
                    const isProcessing = isCurrentlyGenerating || isRegenerating;
                    return (
                      <div key={perspective} className="relative group">
                        <div className={`aspect-square bg-gray-100 rounded-lg border-2 overflow-hidden ${
                          isProcessing ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                        }`}>
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
                                  onClick={() => handleRegenerateSpecificPerspective(perspective as 'front' | 'right' | 'back' | 'left')}
                                  size="sm"
                                  variant="secondary"
                                  disabled={isGenerating || isRegenerating}
                                  className="flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Regenerate
                                </Button>
                              </div>
                              {isRegenerating && (
                                <div className="absolute inset-0 bg-blue-50/90 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="text-xs text-blue-600">Regenerating...</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {isCurrentlyGenerating ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                  <span className="text-xs text-blue-600">Generating...</span>
                                </div>
                              ) : (
                                <div className="text-xs">Waiting...</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-center mt-2">
                          <Label className={`text-sm font-medium capitalize ${
                            isProcessing ? 'text-blue-600' : ''
                          }`}>
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
                      <Button
                        onClick={handleBatchDownload}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download All Views
                      </Button>
                    )}
                    <Button
                      onClick={handleRegenerateAll}
                      variant="outline"
                      disabled={isGenerating || regeneratingPerspective !== null}
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

      {/* Analysis and Prompts Display for 3D Mode */}
      {is3DMode && imageAnalysis && Object.keys(generatedPrompts).length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Image Analysis</CardTitle>
              <CardDescription>
                AI analysis of your reference image used for generating consistent perspectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Subject:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.subject}</p>
                </div>
                <div>
                  <Label className="font-medium">Object Type:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.objectType}</p>
                </div>
                <div>
                  <Label className="font-medium">Style:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.style}</p>
                </div>
                <div>
                  <Label className="font-medium">Lighting:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.lighting}</p>
                </div>
                <div>
                  <Label className="font-medium">Materials:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.materials}</p>
                </div>
                <div>
                  <Label className="font-medium">Background:</Label>
                  <p className="text-muted-foreground mt-1">{imageAnalysis.background}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Prompts</CardTitle>
              <CardDescription>
                The specific prompts used for each perspective to ensure consistency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(generatedPrompts).map(([perspective, prompt]) => (
                  <div key={perspective} className="border rounded-lg p-4">
                    <Label className="font-medium capitalize text-primary">
                      {perspective} View Prompt:
                    </Label>
                    <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                      {prompt}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
