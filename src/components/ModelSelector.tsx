import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImageModel = "gemini" | "flux";

interface ModelSelectorProps {
  selectedModel: ImageModel;
  onModelChange: (model: ImageModel) => void;
  replicateToken?: string;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  replicateToken,
}: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="model-select">AI Model</Label>
      <Select value={selectedModel} onValueChange={(value) => onModelChange(value as ImageModel)}>
        <SelectTrigger id="model-select">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gemini">Nano Banana</SelectItem>
          <SelectItem value="flux" disabled={!replicateToken}>
            Flux Kontext Pro
          </SelectItem>
        </SelectContent>
      </Select>
      {selectedModel === "flux" && !replicateToken && (
        <p className="text-xs text-muted-foreground">
          Replicate API token required for Flux model
        </p>
      )}
    </div>
  );
}
