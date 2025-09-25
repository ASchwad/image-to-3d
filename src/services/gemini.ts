import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

export interface GeneratedImage {
  id: string;
  data: string; // base64 data
  mimeType: string;
  fileName: string;
}

export interface ReferenceImage {
  data: string; // base64 data
  mimeType: string;
}

export class GeminiImageService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  async generateImages(prompt: string, referenceImages?: ReferenceImage[]): Promise<GeneratedImage[]> {
    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const model = 'gemini-2.5-flash-image-preview';

    const parts: any[] = [
      {
        text: prompt,
      },
    ];

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach(image => {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      });
    }

    const contents = [
      {
        role: 'user',
        parts,
      },
    ];

    const response = await this.ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const images: GeneratedImage[] = [];
    let imageIndex = 0;

    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue;
      }

      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const fileName = `generated_image_${imageIndex++}`;
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const fileExtension = mime.getExtension(inlineData.mimeType || '') || 'png';

        images.push({
          id: `${fileName}_${Date.now()}`,
          data: inlineData.data || '',
          mimeType: inlineData.mimeType || 'image/png',
          fileName: `${fileName}.${fileExtension}`,
        });
      }
    }

    return images;
  }

  createImageUrl(image: GeneratedImage): string {
    return `data:${image.mimeType};base64,${image.data}`;
  }

  downloadImage(image: GeneratedImage): void {
    const url = this.createImageUrl(image);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async fileToReferenceImage(file: File): Promise<ReferenceImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Remove the data URL prefix (data:image/png;base64,)
          const base64Data = result.split(',')[1];
          resolve({
            data: base64Data,
            mimeType: file.type,
          });
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  createReferenceImageUrl(image: ReferenceImage): string {
    return `data:${image.mimeType};base64,${image.data}`;
  }
}