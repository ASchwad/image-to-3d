import { useState } from "react";
import {
  TrellisService,
  type MeshGenerationProgress,
  type TrellisOutput,
  type TrellisInput,
} from "@/services/trellis";
import type { GeneratedImage } from "@/services/gemini";

interface UseMeshGenerationOptions {
  trellisService: TrellisService | null;
  onError?: (error: string) => void;
}

export function useMeshGeneration({
  trellisService,
  onError,
}: UseMeshGenerationOptions) {
  const [meshProgress, setMeshProgress] = useState<MeshGenerationProgress>({
    status: "idle",
  });
  const [meshResult, setMeshResult] = useState<TrellisOutput | null>(null);

  const generateMeshFromImages = async (
    images: GeneratedImage[],
    advancedSettings?: Partial<TrellisInput>
  ) => {
    if (!trellisService) {
      onError?.("Replicate API token not configured");
      return null;
    }

    if (images.length === 0) {
      onError?.("Please provide at least 1 image for mesh generation");
      return null;
    }

    setMeshResult(null);

    try {
      const result = await trellisService.generate3DMesh(
        images,
        (progress) => {
          setMeshProgress(progress);
        },
        advancedSettings
      );

      setMeshResult(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate 3D mesh";
      onError?.(errorMessage);
      setMeshProgress({ status: "idle" });
      return null;
    }
  };

  const generateMeshFromDataUris = async (
    dataUris: string[],
    advancedSettings?: Partial<TrellisInput>
  ) => {
    if (!trellisService) {
      onError?.("Replicate API token not configured");
      return null;
    }

    if (dataUris.length === 0) {
      onError?.("Please provide at least 1 image for mesh generation");
      return null;
    }

    setMeshResult(null);

    try {
      const result = await trellisService.generateMeshFromDataUris(
        dataUris,
        (progress) => {
          setMeshProgress(progress);
        },
        advancedSettings
      );

      setMeshResult(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate 3D mesh";
      onError?.(errorMessage);
      setMeshProgress({ status: "idle" });
      return null;
    }
  };

  const resetMeshState = () => {
    setMeshResult(null);
    setMeshProgress({ status: "idle" });
  };

  return {
    meshProgress,
    meshResult,
    generateMeshFromImages,
    generateMeshFromDataUris,
    resetMeshState,
    isGenerating:
      meshProgress.status === "uploading" ||
      meshProgress.status === "generating",
  };
}
