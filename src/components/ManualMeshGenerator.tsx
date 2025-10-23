import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrellisService } from "@/services/trellis";
import { Loader2, Box, Upload } from "lucide-react";
import { MeshGenerationResult } from "./MeshGenerationResult";
import { ImageUploadDropzone } from "./ImageUploadDropzone";
import { AdvancedSettingsPanel } from "./AdvancedSettingsPanel";
import { ErrorDisplay } from "./ErrorDisplay";
import { useMeshGeneration } from "@/hooks/useMeshGeneration";
import { useAdvancedSettings } from "@/hooks/useAdvancedSettings";

interface UploadedImage {
  id: string;
  file: File;
  dataUri: string;
}

interface ManualMeshGeneratorProps {
  replicateToken: string;
}

export function ManualMeshGenerator({
  replicateToken,
}: ManualMeshGeneratorProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(true);

  const trellisService = new TrellisService(replicateToken);

  const { advancedSettings, resetToDefaults, updateSetting } =
    useAdvancedSettings();

  const { meshProgress, meshResult, generateMeshFromDataUris, isGenerating } =
    useMeshGeneration({
      trellisService,
      onError: setError,
    });

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

        // Convert to base64 data URI
        const reader = new FileReader();
        reader.onload = (e) => {
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

  const handleGenerate3DMesh = async () => {
    if (uploadedImages.length === 0) {
      setError("Please upload at least 1 image");
      return;
    }

    // Use images in the order they were uploaded
    const orderedDataUris = uploadedImages.map((img) => img.dataUri);

    setError("");
    await generateMeshFromDataUris(orderedDataUris, advancedSettings);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl w-full space-y-6 z-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Direct 3D Mesh Generation
            </CardTitle>
            <CardDescription>
              Upload your own images and generate 3D meshes directly using
              Trellis API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadDropzone
              id="manual-images"
              label={`Upload Images (${uploadedImages.length}/4)`}
              description="Upload images • PNG, JPG supported"
              multiple={true}
              onFilesSelected={handleFilesSelected}
              images={uploadedImages.map((img) => ({
                id: img.id,
                url: img.dataUri,
              }))}
              onRemoveImage={(id) => removeImage(id as string)}
            />

            <ErrorDisplay error={error} />

            <AdvancedSettingsPanel
              advancedSettings={advancedSettings}
              onSettingChange={updateSetting}
              onReset={resetToDefaults}
              open={showAdvanced}
              onOpenChange={setShowAdvanced}
            />

            <Button
              onClick={handleGenerate3DMesh}
              disabled={uploadedImages.length === 0 || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
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
    </div>
  );
}
