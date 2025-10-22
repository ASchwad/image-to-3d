import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrellisService,
  type MeshGenerationProgress,
  type TrellisOutput,
  type TrellisInput,
} from "@/services/trellis";
import { X, Loader2, Box, Settings, Upload } from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";
import { ImageUploadDropzone } from "./ImageUploadDropzone";

interface UploadedImage {
  id: string;
  file: File;
  dataUri: string;
  perspective: "front" | "right" | "back" | "left";
}

interface ManualMeshGeneratorProps {
  replicateToken: string;
}

export function ManualMeshGenerator({
  replicateToken,
}: ManualMeshGeneratorProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string>("");
  const [meshProgress, setMeshProgress] = useState<MeshGenerationProgress>({
    status: "idle",
  });
  const [meshResult, setMeshResult] = useState<TrellisOutput | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings with defaults from server
  const [advancedSettings, setAdvancedSettings] = useState<
    Partial<TrellisInput>
  >({
    texture_size: 2048,
    mesh_simplify: 0.9,
    ss_sampling_steps: 38,
    slat_sampling_steps: 12,
    ss_guidance_strength: 7.5,
    slat_guidance_strength: 3,
    generate_normal: false,
    return_no_background: false,
  });

  const trellisService = new TrellisService(replicateToken);

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

        // Convert to base64 data URI (like the Node.js script)
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;

          // Determine next perspective
          const perspectives: ("front" | "right" | "back" | "left")[] = [
            "front",
            "right",
            "back",
            "left",
          ];
          const usedPerspectives = uploadedImages.map((img) => img.perspective);
          const nextPerspective = perspectives.find(
            (p) => !usedPerspectives.includes(p)
          );

          if (!nextPerspective) {
            setError("Maximum 4 images allowed");
            return;
          }

          const newImage: UploadedImage = {
            id: Date.now().toString() + Math.random(),
            file,
            dataUri: result,
            perspective: nextPerspective,
          };

          setUploadedImages((prev) => [...prev, newImage]);
        };

        reader.readAsDataURL(file);
      }
    } catch {
      setError("Failed to process uploaded images");
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const changePerspective = (
    id: string,
    newPerspective: "front" | "right" | "back" | "left"
  ) => {
    // Check if perspective is already used
    if (
      uploadedImages.some(
        (img) => img.id !== id && img.perspective === newPerspective
      )
    ) {
      setError(`${newPerspective} perspective is already assigned`);
      return;
    }

    setError("");
    setUploadedImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, perspective: newPerspective } : img
      )
    );
  };

  const handleGenerate3DMesh = async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least 1 image");
      return;
    }

    // Order images: front, right, back, left (matching the Node.js script pattern)
    const orderedPerspectives: ("front" | "right" | "back" | "left")[] = [
      "front",
      "right",
      "back",
      "left",
    ];
    const orderedDataUris: string[] = [];

    for (const perspective of orderedPerspectives) {
      const image = uploadedImages.find(
        (img) => img.perspective === perspective
      );
      if (image) {
        orderedDataUris.push(image.dataUri);
      }
    }

    setError("");
    setMeshResult(null);

    try {
      const result = await trellisService.generateMeshFromDataUris(
        orderedDataUris,
        (progress) => {
          setMeshProgress(progress);
        },
        advancedSettings
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
            <Upload className="w-5 h-5" />
            Direct 3D Mesh Generation
          </CardTitle>
          <CardDescription>
            Upload your own images and generate 3D meshes directly using Trellis
            API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadDropzone
            id="manual-images"
            label="Upload Images (1-4 images, multiple perspectives recommended)"
            description="Upload perspective images • PNG, JPG supported"
            multiple={true}
            onFilesSelected={handleFilesSelected}
          />

          {uploadedImages.length > 0 && (
            <div className="space-y-4">
              <Label>Uploaded Images ({uploadedImages.length}/4)</Label>
              <div className="grid grid-cols-2 gap-4">
                {["front", "right", "back", "left"].map((perspective) => {
                  const image = uploadedImages.find(
                    (img) => img.perspective === perspective
                  );
                  return (
                    <div key={perspective} className="space-y-2">
                      <div className="border rounded-lg overflow-hidden aspect-square bg-gray-50">
                        {image ? (
                          <div className="relative group h-full">
                            <img
                              src={image.dataUri}
                              alt={`${perspective} view`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                onClick={() => removeImage(image.id)}
                                size="sm"
                                variant="destructive"
                                className="flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <div className="text-xs">No image</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <Label className="text-sm font-medium capitalize">
                          {perspective} View
                        </Label>
                        {image && uploadedImages.length > 1 && (
                          <div className="flex flex-wrap gap-1 mt-1 justify-center">
                            {(["front", "right", "back", "left"] as const).map(
                              (p) => (
                                <Button
                                  key={p}
                                  size="sm"
                                  variant={
                                    p === perspective ? "default" : "outline"
                                  }
                                  onClick={() => changePerspective(image.id, p)}
                                  disabled={uploadedImages.some(
                                    (img) =>
                                      img.id !== image.id &&
                                      img.perspective === p
                                  )}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  {p}
                                </Button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? "Hide" : "Show"} Advanced Settings
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="texture_size">
                    Texture Size
                    <span className="text-xs text-muted-foreground ml-2">
                      Higher = better quality
                    </span>
                  </Label>
                  <Input
                    id="texture_size"
                    type="number"
                    min="512"
                    max="8192"
                    step="512"
                    value={advancedSettings.texture_size}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        texture_size: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mesh_simplify">
                    Mesh Simplify
                    <span className="text-xs text-muted-foreground ml-2">
                      Lower = more detail
                    </span>
                  </Label>
                  <Input
                    id="mesh_simplify"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={advancedSettings.mesh_simplify}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        mesh_simplify: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ss_sampling_steps">
                    Sparse Structure Steps
                    <span className="text-xs text-muted-foreground ml-2">
                      More = better quality
                    </span>
                  </Label>
                  <Input
                    id="ss_sampling_steps"
                    type="number"
                    min="10"
                    max="100"
                    step="1"
                    value={advancedSettings.ss_sampling_steps}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        ss_sampling_steps: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slat_sampling_steps">
                    SLAT Sampling Steps
                    <span className="text-xs text-muted-foreground ml-2">
                      More = finer details
                    </span>
                  </Label>
                  <Input
                    id="slat_sampling_steps"
                    type="number"
                    min="5"
                    max="50"
                    step="1"
                    value={advancedSettings.slat_sampling_steps}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        slat_sampling_steps: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ss_guidance_strength">
                    SS Guidance Strength
                    <span className="text-xs text-muted-foreground ml-2">
                      Image adherence
                    </span>
                  </Label>
                  <Input
                    id="ss_guidance_strength"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={advancedSettings.ss_guidance_strength}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        ss_guidance_strength: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slat_guidance_strength">
                    SLAT Guidance Strength
                    <span className="text-xs text-muted-foreground ml-2">
                      Detail preservation
                    </span>
                  </Label>
                  <Input
                    id="slat_guidance_strength"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={advancedSettings.slat_guidance_strength}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        slat_guidance_strength: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="generate_normal"
                    checked={advancedSettings.generate_normal}
                    onCheckedChange={(checked: boolean) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        generate_normal: checked,
                      })
                    }
                  />
                  <Label htmlFor="generate_normal" className="cursor-pointer">
                    Generate Normal Maps
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="return_no_background"
                    checked={advancedSettings.return_no_background}
                    onCheckedChange={(checked: boolean) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        return_no_background: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="return_no_background"
                    className="cursor-pointer"
                  >
                    Remove Background
                  </Label>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setAdvancedSettings({
                    texture_size: 2048,
                    mesh_simplify: 0.9,
                    ss_sampling_steps: 38,
                    slat_sampling_steps: 12,
                    ss_guidance_strength: 7.5,
                    slat_guidance_strength: 3,
                    generate_normal: false,
                    return_no_background: false,
                  })
                }
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Button
            onClick={handleGenerate3DMesh}
            disabled={
              uploadedImages.length === 0 ||
              meshProgress.status === "uploading" ||
              meshProgress.status === "generating"
            }
            className="w-full"
          >
            {meshProgress.status === "uploading" ||
            meshProgress.status === "generating" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {meshProgress.message || "Generating 3D Mesh..."}
              </>
            ) : (
              <>
                <Box className="w-4 h-4 mr-2" />
                Generate 3D Mesh
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <MeshGenerationResult
        meshProgress={meshProgress}
        meshResult={meshResult}
        trellisService={trellisService}
      />
    </div>
  );
}
