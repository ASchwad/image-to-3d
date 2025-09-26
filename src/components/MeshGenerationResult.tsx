import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrellisService,
  type MeshGenerationProgress,
  type TrellisOutput,
} from "@/services/trellis";
import { Download, Loader2, Box } from "lucide-react";
import { type ImageAnalysis } from "@/services/gemini";

interface MeshGenerationResultProps {
  meshProgress: MeshGenerationProgress;
  meshResult: TrellisOutput | null;
  trellisService: TrellisService | null;
  imageAnalysis?: ImageAnalysis;
}

export function MeshGenerationResult({
  meshProgress,
  meshResult,
  trellisService,
  imageAnalysis,
}: MeshGenerationResultProps) {
  const handleDownloadMesh = (url: string, type: string) => {
    if (!trellisService) return;

    const extension = trellisService.getFileExtension(url);
    const filename = imageAnalysis
      ? trellisService.getMeshFileName(imageAnalysis, extension)
      : `3d_model.${extension}`;
    trellisService.downloadMeshFile(url, filename);
  };

  return (
    <>
      {/* 3D Mesh Generation Progress */}
      {(meshProgress.status === "uploading" ||
        meshProgress.status === "generating" ||
        meshProgress.status === "error") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              {meshProgress.status === "error"
                ? "Mesh Generation Failed"
                : "Generating 3D Mesh"}
            </CardTitle>
            <CardDescription>
              {meshProgress.message || "Processing your images..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meshProgress.status === "error" ? (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {meshProgress.error || "An unknown error occurred"}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {meshProgress.message}
                  </div>
                  {meshProgress.status === "uploading" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Uploading images to processing server...
                    </div>
                  )}
                  {meshProgress.status === "generating" && (
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

      {/* 3D Mesh Generation Result */}
      {meshResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              3D Mesh Generated
            </CardTitle>
            <CardDescription>
              Your 3D mesh has been successfully generated
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
                    onClick={() =>
                      handleDownloadMesh(meshResult.model_glb!, "glb")
                    }
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
                    onClick={() =>
                      handleDownloadMesh(meshResult.gaussian_ply!, "ply")
                    }
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PLY
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
