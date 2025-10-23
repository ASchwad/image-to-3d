import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Settings } from "lucide-react";
import type { TrellisInput } from "@/services/trellis";

interface AdvancedSettingsPanelProps {
  advancedSettings: Partial<TrellisInput>;
  onSettingChange: (key: keyof TrellisInput, value: any) => void;
  onReset: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AdvancedSettingsPanel({
  advancedSettings,
  onSettingChange,
  onReset,
  open = true,
  onOpenChange,
}: AdvancedSettingsPanelProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full flex items-center gap-2">
          <Settings className="w-4 h-4" />
          {open ? "Hide" : "Show"} Advanced Settings
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
                onSettingChange("texture_size", Number(e.target.value))
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
                onSettingChange("mesh_simplify", Number(e.target.value))
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
                onSettingChange("ss_sampling_steps", Number(e.target.value))
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
                onSettingChange("slat_sampling_steps", Number(e.target.value))
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
                onSettingChange("ss_guidance_strength", Number(e.target.value))
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
                onSettingChange(
                  "slat_guidance_strength",
                  Number(e.target.value)
                )
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
                onSettingChange("generate_normal", checked)
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
                onSettingChange("return_no_background", checked)
              }
            />
            <Label htmlFor="return_no_background" className="cursor-pointer">
              Remove Background
            </Label>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          Reset to Defaults
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
