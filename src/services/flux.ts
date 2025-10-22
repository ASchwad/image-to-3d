import type { GeneratedImage, ReferenceImage } from "./gemini";

export class FluxImageService {
  constructor(apiToken: string) {
    // API token not needed since we're using local server
    // Just keep for compatibility
  }

  async generateImages(
    prompt: string,
    referenceImage?: ReferenceImage
  ): Promise<GeneratedImage[]> {
    try {
      const requestBody: any = {
        prompt: prompt,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 90,
      };

      // If reference image is provided, use it for image editing
      if (referenceImage) {
        const imageDataUri = `data:${referenceImage.mimeType};base64,${referenceImage.data}`;
        requestBody.image = imageDataUri;
      }

      // Call the local Express server instead of Replicate directly
      const response = await fetch('http://localhost:3001/api/generate-flux-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          if (response.status === 0) {
            errorMessage = 'Unable to connect to local server. Make sure the Express server is running on port 3001';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const output = result.output;

      // The output is typically a single URL string or an array of URLs
      const images: GeneratedImage[] = [];

      if (typeof output === "string") {
        // Single image URL
        const imageData = await this.fetchImageAsBase64(output);
        images.push({
          id: `flux_${Date.now()}`,
          data: imageData,
          mimeType: "image/png",
          fileName: `flux_generated_${Date.now()}.png`,
        });
      } else if (Array.isArray(output)) {
        // Multiple image URLs
        for (let i = 0; i < output.length; i++) {
          const url = output[i];
          if (typeof url === "string") {
            const imageData = await this.fetchImageAsBase64(url);
            images.push({
              id: `flux_${Date.now()}_${i}`,
              data: imageData,
              mimeType: "image/png",
              fileName: `flux_generated_${Date.now()}_${i}.png`,
            });
          }
        }
      }

      return images;
    } catch (error) {
      console.error("Flux generation error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate image with Flux"
      );
    }
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get just the base64 data
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error("Failed to fetch generated image");
    }
  }

  async fileToReferenceImage(file: File): Promise<ReferenceImage> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error("Failed to read file"));
          return;
        }

        img.onload = () => {
          // Create a canvas to properly handle EXIF orientation
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error("Failed to create canvas context"));
            return;
          }

          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the image (this respects EXIF orientation in modern browsers)
          ctx.drawImage(img, 0, 0);

          // Convert canvas to base64 without EXIF data
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Failed to convert image"));
              return;
            }

            const blobReader = new FileReader();
            blobReader.onload = (blobEvent) => {
              const blobResult = blobEvent.target?.result as string;
              if (blobResult) {
                const base64Data = blobResult.split(",")[1];
                resolve({
                  data: base64Data,
                  mimeType: blob.type,
                });
              } else {
                reject(new Error("Failed to read blob"));
              }
            };
            blobReader.onerror = () => reject(new Error("Failed to read blob"));
            blobReader.readAsDataURL(blob);
          }, file.type || 'image/png');
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = result;
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  createImageUrl(image: GeneratedImage): string {
    return `data:${image.mimeType};base64,${image.data}`;
  }

  createReferenceImageUrl(image: ReferenceImage): string {
    return `data:${image.mimeType};base64,${image.data}`;
  }

  downloadImage(image: GeneratedImage): void {
    console.log("FLUX Downloading image:", image.fileName);
    const url = this.createImageUrl(image);
    const link = document.createElement("a");
    link.href = url;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
