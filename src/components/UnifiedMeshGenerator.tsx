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
  Upload,
  RotateCcw,
  Box,
  Wand2,
  ArrowRight,
  Settings,
  ArrowLeft,
  Edit as EditIcon,
} from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";
import { ImageUploadDropzone } from "./ImageUploadDropzone";
import { ModelSelector } from "./ModelSelector";
import { PerspectiveGrid } from "./PerspectiveGrid";
import { EditPerspectiveDialog } from "./EditPerspectiveDialog";
import { AdvancedSettingsPanel } from "./AdvancedSettingsPanel";
import { ErrorDisplay } from "./ErrorDisplay";
import { usePerspectiveGeneration } from "@/hooks/usePerspectiveGeneration";
import { usePerspectiveActions } from "@/hooks/usePerspectiveActions";
import { useMeshGeneration } from "@/hooks/useMeshGeneration";
import { useAdvancedSettings } from "@/hooks/useAdvancedSettings";
import { PERSPECTIVE_ORDER } from "@/constants/meshGeneration";

type ImageModel = "gemini" | "flux";
type WorkflowState =
  | "upload"
  | "generate-perspectives"
  | "configure-mesh"
  | "mesh-result";

interface UploadedImage {
  id: string;
  file: File;
  dataUri: string;
}

interface UnifiedMeshGeneratorProps {
  apiKey: string;
  replicateToken?: string;
}

export function UnifiedMeshGenerator({
  apiKey,
  replicateToken,
}: UnifiedMeshGeneratorProps) {
  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>("upload");

  // Upload state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);

  // Perspective generation state
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("flux");
  const [editingPerspective, setEditingPerspective] = useState<string | null>(
    null
  );

  // Common state
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Services
  const geminiService = new GeminiImageService(apiKey);
  const fluxService = replicateToken
    ? new FluxImageService(replicateToken)
    : null;
  const trellisService = replicateToken
    ? new TrellisService(replicateToken)
    : null;

  // Custom hooks
  const {
    generatedImages,
    isGenerating,
    currentGeneratingPerspective,
    perspectiveLoadingStates,
    generatePerspectives,
    regenerateSpecificPerspective,
    editSpecificPerspective,
    regenerateAll,
    clearGeneratedImages,
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
    resetPerspectiveSelection,
  } = usePerspectiveActions({
    geminiService,
    fluxService,
  });

  const {
    meshProgress,
    meshResult,
    generateMeshFromImages,
    generateMeshFromDataUris,
    resetMeshState,
  } = useMeshGeneration({
    trellisService,
    onError: setError,
  });

  const { advancedSettings, resetToDefaults, updateSetting } =
    useAdvancedSettings();

  // ===== Upload Handlers =====
  const handleFilesSelected = async (files: FileList) => {
    setError("");

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

        if (uploadedImages.length < 4) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const result = e.target?.result as string;

            if (uploadedImages.length >= 4) {
              setError("Maximum 4 images allowed");
              return;
            }

            const newImage: UploadedImage = {
              id: Date.now().toString() + Math.random(),
              file,
              dataUri: result,
            };

            setUploadedImages((prev) => [...prev, newImage]);

            // Also create reference image for AI generation path
            if (uploadedImages.length === 0 && referenceImages.length === 0) {
              const service =
                selectedModel === "flux" && fluxService
                  ? fluxService
                  : geminiService;
              const referenceImage = await service.fileToReferenceImage(file);
              setReferenceImages([referenceImage]);
            }
          };

          reader.readAsDataURL(file);
        }
      }
    } catch {
      setError("Failed to process uploaded images");
    }
  };

  const removeUploadedImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    if (uploadedImages.length === 1) {
      setReferenceImages([]);
    }
  };

  // ===== Path Selection =====
  const handleGeneratePerspectives = () => {
    setWorkflowState("generate-perspectives");
  };

  const handleDirectToMesh = () => {
    setWorkflowState("configure-mesh");
  };

  // ===== Perspective Generation Handlers =====
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

  // ===== Mesh Generation Handlers =====
  const handleGenerate3DMesh = async () => {
    if (!trellisService) {
      setError("Replicate API token not configured");
      return;
    }

    setError("");

    try {
      // If we have generated perspectives, use those
      if (generatedImages.length > 0) {
        if (selectedPerspectives.size === 0) {
          setError("Please select at least 1 image for mesh generation");
          return;
        }

        const orderedImages = PERSPECTIVE_ORDER.filter((perspective) =>
          selectedPerspectives.has(perspective)
        ).map((perspective) => {
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

        const result = await generateMeshFromImages(
          orderedImages,
          advancedSettings
        );
        if (result) {
          setWorkflowState("mesh-result");
        }
      } else {
        // Use manually uploaded images
        if (uploadedImages.length === 0) {
          setError("Please upload at least 1 image");
          return;
        }

        const orderedDataUris = uploadedImages.map((img) => img.dataUri);

        const result = await generateMeshFromDataUris(
          orderedDataUris,
          advancedSettings
        );
        if (result) {
          setWorkflowState("mesh-result");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate 3D mesh"
      );
    }
  };

  // ===== Navigation Handlers =====
  const handleStartOver = () => {
    setWorkflowState("upload");
    setUploadedImages([]);
    setReferenceImages([]);
    clearGeneratedImages();
    resetMeshState();
    setError("");
    setPrompt("");
    resetPerspectiveSelection();
  };

  const handleBackToPerspectives = () => {
    setWorkflowState("generate-perspectives");
    resetMeshState();
  };

  const handleBackToConfiguration = () => {
    setWorkflowState("configure-mesh");
    resetMeshState();
  };

  // ===== Render Functions =====
  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Generate 3D assets from images
        </CardTitle>
        <CardDescription>
          Upload images and choose how to generate the meshes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImageUploadDropzone
          id="unified-images"
          label={`Upload Images (${uploadedImages.length}/4)`}
          description="PNG, JPG supported"
          multiple={true}
          onFilesSelected={handleFilesSelected}
          images={uploadedImages.map((img) => ({
            id: img.id,
            url: img.dataUri,
          }))}
          onRemoveImage={(id) => removeUploadedImage(id as string)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className={`transition-colors ${
              uploadedImages.length > 0
                ? "cursor-pointer hover:border-primary"
                : "opacity-60"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2
                  className={`w-4 h-4 ${
                    uploadedImages.length === 0 ? "text-muted-foreground" : ""
                  }`}
                />
                <span
                  className={
                    uploadedImages.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  Refine the details
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Use AI to create front, right, back, and left views from your
                images. Edit and refine before mesh generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGeneratePerspectives}
                className="w-full"
                variant="default"
                disabled={uploadedImages.length === 0}
              >
                Refine
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`transition-colors ${
              uploadedImages.length > 0
                ? "cursor-pointer hover:border-primary"
                : "opacity-60"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box
                  className={`w-4 h-4 ${
                    uploadedImages.length === 0 ? "text-muted-foreground" : ""
                  }`}
                />
                <span
                  className={
                    uploadedImages.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  Directly generate 3D mesh
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Skip perspective generation and create 3D mesh directly from
                your uploaded image(s).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleDirectToMesh}
                className="w-full"
                variant="outline"
                disabled={!trellisService || uploadedImages.length === 0}
              >
                Generate Mesh
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <ErrorDisplay error={error} />
      </CardContent>
    </Card>
  );

  const renderGeneratePerspectivesStep = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Generate 4 Perspectives
          </CardTitle>
          <CardDescription>
            Generate 4 clean and coherent perspectives from your input image
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadDropzone
            id="perspectives-images"
            label={`Source Images (${uploadedImages.length}/4)`}
            description="PNG, JPG supported"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            images={uploadedImages.map((img) => ({
              id: img.id,
              url: img.dataUri,
            }))}
            onRemoveImage={(id) => removeUploadedImage(id as string)}
          />

          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            replicateToken={replicateToken}
          />

          {selectedModel === "flux" && uploadedImages.length > 1 && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-md border border-blue-200">
              <strong>Note:</strong> Flux only supports one reference image.
              Only the first uploaded image will be used for perspective
              generation.
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

          <ErrorDisplay error={error} />

          <div className="flex gap-2">
            <Button
              onClick={() => setWorkflowState("upload")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || referenceImages.length === 0}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate 4 Views
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Perspectives</CardTitle>
            <CardDescription>
              Review, edit, and select perspectives for mesh generation
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
                  {generatedImages.length == 4 &&
                    trellisService &&
                    selectedPerspectives.size > 0 && (
                      <div className="text-center text-sm text-muted-foreground">
                        {selectedPerspectives.size} of {generatedImages.length}{" "}
                        images selected for mesh generation
                      </div>
                    )}
                  <div className="flex justify-center gap-2 pt-2">
                    {generatedImages.length === 4 && (
                      <Button
                        onClick={handleBatchDownload}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download All
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
                    {trellisService && (
                      <Button
                        onClick={() => setWorkflowState("configure-mesh")}
                        variant="default"
                        disabled={
                          selectedPerspectives.size === 0 ||
                          isGenerating ||
                          Object.values(perspectiveLoadingStates).some(Boolean)
                        }
                        className="flex items-center gap-2"
                      >
                        Next: Configure Mesh
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <EditPerspectiveDialog
        perspective={editingPerspective}
        onClose={() => setEditingPerspective(null)}
        onApply={handleEditSpecificPerspective}
        isLoading={Object.values(perspectiveLoadingStates).some(Boolean)}
      />
    </>
  );

  const renderConfigureMeshStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configure 3D Mesh Generation
        </CardTitle>
        <CardDescription>
          {generatedImages.length > 0
            ? `Generate 3D mesh from ${selectedPerspectives.size} selected perspective(s)`
            : `Generate 3D mesh from ${uploadedImages.length} uploaded image(s)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generatedImages.length === 0 && (
          <ImageUploadDropzone
            id="configure-mesh-images"
            label={`Source Images (${uploadedImages.length}/4)`}
            description="PNG, JPG supported"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            images={uploadedImages.map((img) => ({
              id: img.id,
              url: img.dataUri,
            }))}
            onRemoveImage={(id) => removeUploadedImage(id as string)}
          />
        )}

        <AdvancedSettingsPanel
          advancedSettings={advancedSettings}
          onSettingChange={updateSetting}
          onReset={resetToDefaults}
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
        />

        <ErrorDisplay error={error} />

        <div className="flex gap-2">
          <Button
            onClick={
              generatedImages.length > 0
                ? handleBackToPerspectives
                : () => setWorkflowState("upload")
            }
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleGenerate3DMesh}
            disabled={
              (!generatedImages.length && uploadedImages.length === 0) ||
              meshProgress.status === "uploading" ||
              meshProgress.status === "generating"
            }
            className="flex-1"
          >
            {meshProgress.status === "uploading" ||
            meshProgress.status === "generating" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {meshProgress.message || "Generating..."}
              </>
            ) : (
              <>
                <Box className="w-4 h-4 mr-2" />
                Generate 3D Mesh
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderMeshResultStep = () => (
    <>
      <MeshGenerationResult
        meshProgress={meshProgress}
        meshResult={meshResult}
        trellisService={trellisService}
      />

      {meshResult && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleStartOver}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
                <Button
                  onClick={handleBackToConfiguration}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Mesh generation
                </Button>
              </div>
              {generatedImages.length > 0 && (
                <Button
                  onClick={handleBackToPerspectives}
                  variant="outline"
                  className="w-full"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Perspectives
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  // ===== Main Render =====
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl w-full space-y-6 z-10">
        {workflowState === "upload" && renderUploadStep()}
        {workflowState === "generate-perspectives" &&
          renderGeneratePerspectivesStep()}
        {workflowState === "configure-mesh" && renderConfigureMeshStep()}
        {workflowState === "mesh-result" && renderMeshResultStep()}
      </div>
    </div>
  );
}
