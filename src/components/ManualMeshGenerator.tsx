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
import {
  TrellisService,
  type MeshGenerationProgress,
  type TrellisOutput,
} from "@/services/trellis";
import { Upload, X, Loader2, Box } from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";

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

  const trellisService = new TrellisService(replicateToken);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

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
    if (uploadedImages.length < 3) {
      setError("Please upload at least 3 images");
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

  const handleDownloadMesh = (url: string, type: string) => {
    const extension = trellisService.getFileExtension(url);
    const filename = `manual_upload_3d_model.${extension}`;
    trellisService.downloadMeshFile(url, filename);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Manual Image Upload
          </CardTitle>
          <CardDescription>
            Upload your own images and generate 3D meshes directly using Trellis
            API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-images">
              Upload Images (3-4 images recommended)
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                id="manual-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="manual-images"
                className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span>Upload perspective images</span>
                <span className="text-xs">
                  Click to browse or drag and drop • PNG, JPG supported
                </span>
              </label>
            </div>
          </div>

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

          <Button
            onClick={handleGenerate3DMesh}
            disabled={
              uploadedImages.length < 3 ||
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
