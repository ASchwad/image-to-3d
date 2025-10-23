import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Loader2, RefreshCw, Edit as EditIcon } from "lucide-react";
import type { GeneratedImage } from "@/services/gemini";
import { GeminiImageService } from "@/services/gemini";
import { FluxImageService } from "@/services/flux";

interface PerspectiveGridProps {
  generatedImages: GeneratedImage[];
  currentGeneratingPerspective: string | null;
  perspectiveLoadingStates: {
    [key in "front" | "right" | "back" | "left"]: boolean;
  };
  selectedPerspectives: Set<string>;
  selectedModel: "gemini" | "flux";
  geminiService: GeminiImageService;
  fluxService: FluxImageService | null;
  onToggleSelection: (perspective: string) => void;
  onDownload: (image: GeneratedImage) => void;
  onRegenerate: (perspective: "front" | "right" | "back" | "left") => void;
  onEdit: (perspective: string) => void;
  isGenerating?: boolean;
}

export function PerspectiveGrid({
  generatedImages,
  currentGeneratingPerspective,
  perspectiveLoadingStates,
  selectedPerspectives,
  selectedModel,
  geminiService,
  fluxService,
  onToggleSelection,
  onDownload,
  onRegenerate,
  onEdit,
  isGenerating = false,
}: PerspectiveGridProps) {
  const perspectives: Array<"front" | "right" | "back" | "left"> = [
    "front",
    "right",
    "back",
    "left",
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {perspectives.map((perspective) => {
        const image = generatedImages.find(
          (img) => img.perspective === perspective
        );
        const isCurrentlyGenerating =
          currentGeneratingPerspective === perspective;
        const isRegenerating = perspectiveLoadingStates[perspective];
        const isProcessing = isCurrentlyGenerating || isRegenerating;
        const isSelected = selectedPerspectives.has(perspective);

        return (
          <div key={perspective} className="relative group">
            <div
              className={`aspect-square bg-gray-100 rounded-lg border-2 overflow-hidden ${
                isProcessing
                  ? "border-blue-400 bg-blue-50"
                  : isSelected
                  ? "border-blue-500"
                  : "border-gray-300"
              }`}
            >
              {image ? (
                <>
                  <img
                    src={(selectedModel === "flux" && fluxService
                      ? fluxService
                      : geminiService
                    ).createImageUrl(image)}
                    alt={`${perspective} view`}
                    className={`w-full h-full object-cover transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-40"
                    }`}
                  />
                  {/* Selection checkbox overlay */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={() => onToggleSelection(perspective)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "bg-white border-gray-300 hover:border-gray-400"
                      }`}
                      title={
                        isSelected
                          ? "Deselect for mesh generation"
                          : "Select for mesh generation"
                      }
                    >
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      onClick={() => onDownload(image)}
                      size="sm"
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                    <Button
                      onClick={() => onRegenerate(perspective)}
                      size="sm"
                      variant="secondary"
                      disabled={isGenerating || isRegenerating}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={() => onEdit(perspective)}
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
                {isProcessing && <span className="ml-1 text-blue-500">●</span>}
              </Label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
