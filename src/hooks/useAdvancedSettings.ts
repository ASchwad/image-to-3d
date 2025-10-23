import { useState } from "react";
import type { TrellisInput } from "@/services/trellis";
import { DEFAULT_ADVANCED_SETTINGS } from "@/constants/meshGeneration";

export function useAdvancedSettings() {
  const [advancedSettings, setAdvancedSettings] = useState<
    Partial<TrellisInput>
  >(DEFAULT_ADVANCED_SETTINGS);

  const resetToDefaults = () => {
    setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS);
  };

  const updateSetting = <K extends keyof TrellisInput>(
    key: K,
    value: TrellisInput[K]
  ) => {
    setAdvancedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return {
    advancedSettings,
    setAdvancedSettings,
    resetToDefaults,
    updateSetting,
  };
}
