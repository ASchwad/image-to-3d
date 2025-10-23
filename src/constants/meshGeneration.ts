import type { TrellisInput } from "@/services/trellis";

// Default advanced settings for mesh generation
export const DEFAULT_ADVANCED_SETTINGS: Partial<TrellisInput> = {
  texture_size: 2048,
  mesh_simplify: 0.9,
  ss_sampling_steps: 38,
  slat_sampling_steps: 12,
  ss_guidance_strength: 7.5,
  slat_guidance_strength: 3,
  generate_normal: false,
  return_no_background: false,
};

// Perspective prompts for image generation
export const PERSPECTIVE_PROMPTS: {
  [key in "front" | "right" | "back" | "left"]: string;
} = {
  front: "front view, facing camera directly, symmetrical composition",
  right: "right side view, 90-degree profile",
  back: "back view, rear side visible",
  left: "left side view, 90-degree profile from the left",
};

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES = 4;
export const ALLOWED_FILE_TYPES = ["image/"];

// Perspective order for mesh generation
export const PERSPECTIVE_ORDER: Array<"front" | "right" | "back" | "left"> = [
  "front",
  "right",
  "back",
  "left",
];

// Default selected perspectives
export const DEFAULT_SELECTED_PERSPECTIVES = new Set<string>([
  "front",
  "right",
  "back",
  "left",
]);
