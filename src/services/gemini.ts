import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

export interface GeneratedImage {
  id: string;
  data: string; // base64 data
  mimeType: string;
  fileName: string;
  perspective?: 'front' | 'right' | 'back' | 'left';
}

export interface ReferenceImage {
  data: string; // base64 data
  mimeType: string;
}

export interface ImageAnalysis {
  subject: string;
  style: string;
  lighting: string;
  background: string;
  materials: string;
  objectType: string;
}

export interface PerspectiveView {
  perspective: 'front' | 'right' | 'back' | 'left';
  angle: string;
  description: string;
}

export class GeminiImageService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  async analyzeImage(referenceImage: ReferenceImage): Promise<ImageAnalysis> {
    const model = 'gemini-2.0-flash-exp';

    const prompt = `Analyze this image and provide detailed information for 3D asset generation.

    Return the analysis in this exact JSON format:
    {
      "subject": "detailed description of the main subject/object",
      "style": "artistic style (realistic, cartoon, stylized, etc.)",
      "lighting": "lighting description (studio, natural, dramatic, etc.)",
      "background": "background description",
      "materials": "surface materials and textures visible",
      "objectType": "category (person, vehicle, building, furniture, etc.)"
    }`;

    const response = await this.ai.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: referenceImage.mimeType,
              data: referenceImage.data,
            },
          },
        ],
      }],
    });

    try {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanText);
    } catch {
      // Fallback analysis
      return {
        subject: "object",
        style: "realistic",
        lighting: "studio lighting",
        background: "neutral",
        materials: "varied materials",
        objectType: "object"
      };
    }
  }

  private getPerspectiveViews(): PerspectiveView[] {
    return [
      {
        perspective: 'front',
        angle: '0°',
        description: 'facing camera directly, symmetrical composition, front view'
      },
      {
        perspective: 'right',
        angle: '90°',
        description: '90-degree profile view, right side silhouette visible'
      },
      {
        perspective: 'back',
        angle: '180°',
        description: 'rear view, back side visible, opposite of front view'
      },
      {
        perspective: 'left',
        angle: '270°',
        description: 'left side profile view, opposite of right side view'
      }
    ];
  }

  private getBasePrompt(additionalInstructions?: string): string {
    return `Professional orthographic views of the EXACT SAME object from the reference image.

CRITICAL: This must be the identical subject/object, not a different one. Keep all identifying features, colors, shapes, and details exactly the same.

Lighting: Standardized soft, even lighting - bright, diffused, shadow-free illumination
Background: Pure white background (#FFFFFF) - clean, seamless, infinite white
Composition: Centered, full object visible
Quality: High detail, sharp focus, product photography style

STANDARDIZED LIGHTING REQUIREMENTS:
- Soft, even, diffused lighting from all angles
- NO strong shadows or harsh lighting
- Bright, well-lit object with minimal shadow details
- Even illumination like professional light box photography
- No directional shadows that could obscure 3D details
- Uniform lighting regardless of original image lighting

WHITE BACKGROUND REQUIREMENTS:
- Pure white background (#FFFFFF) only
- Remove ALL non-white background elements
- Remove ground/floor/surface the object sits on
- Object should appear to float against pure white
- NO shadows cast on background/ground
- Clean white background suitable for easy masking and 3D modeling
- Seamless infinite white background like a photo studio

Technical requirements:
- This is the SAME object as in the reference image - keep all unique features
- Maintain exact same proportions, scale, and dimensions
- Identical color palette and materials from the reference
- STANDARDIZED LIGHTING: Soft, even, diffused illumination across all views
- NO harsh shadows or directional lighting effects
- Orthographic projection (no perspective distortion)
- Suitable for 3D reconstruction workflow
- Object centered and fully visible in frame
- No parts cut off from frame
- CONSISTENCY IS KEY: This must look like the same object rotated to different sides
- WHITE BACKGROUND ONLY: Pure white background with no environmental elements
- SHADOW-FREE: Minimal shadows, bright even lighting like a professional light box

${additionalInstructions ? `Additional style instructions: ${additionalInstructions}` : ''}`;
  }

  private createPerspectivePrompt(
    analysis: ImageAnalysis,
    perspective: PerspectiveView,
    additionalInstructions?: string,
    rightViewImage?: GeneratedImage,
    isFirstPerspective: boolean = false,
    extraPrompt?: string
  ): string {
    const basePrompt = isFirstPerspective ? this.getBasePrompt(additionalInstructions) : '';

    // Special handling for left view with right view reference
    if (perspective.perspective === 'left' && rightViewImage) {
      const leftInstruction = `Turn the object by exact 180° to show the opposite side.`;
      return `${basePrompt}${basePrompt ? '\n\n' : ''}${leftInstruction}${extraPrompt ? `\n\nExtra instructions: ${extraPrompt}` : ''}`;
    }

    const perspectiveInstruction = `Generate the ${perspective.description} (${perspective.angle}) with standardized soft, even lighting on a pure white background.`;

    return `${basePrompt}${basePrompt ? '\n\n' : ''}${perspectiveInstruction}${extraPrompt ? `\n\nExtra instructions: ${extraPrompt}` : ''}`;
  }

  async generate3DPerspectivesWithDetails(
    referenceImage: ReferenceImage,
    additionalInstructions?: string,
    onAnalysisComplete?: (analysis: ImageAnalysis, prompts: {[perspective: string]: string}) => void,
    onImageGenerated?: (image: GeneratedImage) => void,
    onPerspectiveStart?: (perspective: string) => void
  ): Promise<{
    images: GeneratedImage[];
    analysis: ImageAnalysis;
    prompts: {[perspective: string]: string};
  }> {
    // First analyze the reference image
    const analysis = await this.analyzeImage(referenceImage);
    const perspectives = this.getPerspectiveViews();

    // Reorder perspectives: right first, then others, left last
    const orderedPerspectives = [
      perspectives.find(p => p.perspective === 'right')!,
      perspectives.find(p => p.perspective === 'front')!,
      perspectives.find(p => p.perspective === 'back')!,
      perspectives.find(p => p.perspective === 'left')!,
    ];

    const allImages: GeneratedImage[] = [];
    const prompts: {[perspective: string]: string} = {};
    let rightViewImage: GeneratedImage | undefined;

    // Generate initial prompts (left view prompt will be updated later)
    orderedPerspectives.forEach((perspective, index) => {
      const perspectivePrompt = this.createPerspectivePrompt(
        analysis,
        perspective,
        additionalInstructions,
        undefined,
        index === 0 // Only first perspective gets base prompt
      );
      prompts[perspective.perspective] = perspectivePrompt;
    });

    // Call the analysis callback immediately
    if (onAnalysisComplete) {
      onAnalysisComplete(analysis, prompts);
    }

    // Generate each perspective sequentially in the new order
    for (const perspective of orderedPerspectives) {
      // Notify that we're starting this perspective
      if (onPerspectiveStart) {
        onPerspectiveStart(perspective.perspective);
      }

      const config = {
        responseModalities: ['IMAGE', 'TEXT'],
      };

      const model = 'gemini-2.5-flash-image-preview';

      // For left view, update the prompt to include right view reference
      let currentPrompt = prompts[perspective.perspective];
      if (perspective.perspective === 'left' && rightViewImage) {
        currentPrompt = this.createPerspectivePrompt(
          analysis,
          perspective,
          additionalInstructions,
          rightViewImage,
          false // Left view doesn't need base prompt since it was shown for right view
        );
        prompts[perspective.perspective] = currentPrompt; // Update stored prompt
      }

      const parts: any[] = [
        { text: currentPrompt },
        {
          inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.data,
          },
        },
      ];

      // Add right view image as additional reference for left view generation
      if (perspective.perspective === 'left' && rightViewImage) {
        parts.push({
          inlineData: {
            mimeType: rightViewImage.mimeType,
            data: rightViewImage.data,
          },
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

      let imageIndex = 0;
      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }

        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const fileName = `${analysis.subject.replace(/\s+/g, '_').toLowerCase()}_${perspective.perspective}`;
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          const fileExtension = mime.getExtension(inlineData.mimeType || '') || 'png';

          const newImage: GeneratedImage = {
            id: `${fileName}_${Date.now()}_${imageIndex}`,
            data: inlineData.data || '',
            mimeType: inlineData.mimeType || 'image/png',
            fileName: `${fileName}.${fileExtension}`,
            perspective: perspective.perspective,
          };

          allImages.push(newImage);

          // Store right view image for later use in left view generation
          if (perspective.perspective === 'right') {
            rightViewImage = newImage;
          }

          // Call the image callback immediately when each image is generated
          if (onImageGenerated) {
            onImageGenerated(newImage);
          }

          imageIndex++;
        }
      }
    }

    return { images: allImages, analysis, prompts };
  }

  async generate3DPerspectives(
    referenceImage: ReferenceImage,
    additionalInstructions?: string
  ): Promise<GeneratedImage[]> {
    const result = await this.generate3DPerspectivesWithDetails(referenceImage, additionalInstructions);
    return result.images;
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

  async regenerateSpecificPerspective(
    referenceImage: ReferenceImage,
    perspective: 'front' | 'right' | 'back' | 'left',
    analysis: ImageAnalysis,
    additionalInstructions?: string,
    onImageGenerated?: (image: GeneratedImage) => void,
    onPerspectiveStart?: (perspective: string) => void,
    rightViewImage?: GeneratedImage,
    extraPrompt?: string
  ): Promise<GeneratedImage> {
    const perspectives = this.getPerspectiveViews();
    const targetPerspective = perspectives.find(p => p.perspective === perspective);

    if (!targetPerspective) {
      throw new Error(`Invalid perspective: ${perspective}`);
    }

    // Notify that we're starting this perspective
    if (onPerspectiveStart) {
      onPerspectiveStart(perspective);
    }

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const model = 'gemini-2.5-flash-image-preview';
    const prompt = this.createPerspectivePrompt(
      analysis,
      targetPerspective,
      additionalInstructions,
      perspective === 'left' ? rightViewImage : undefined,
      true, // Regenerated perspectives always show base prompt
      extraPrompt
    );

    const parts: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: referenceImage.mimeType,
          data: referenceImage.data,
        },
      },
    ];

    // Add right view image as additional reference for left view regeneration
    if (perspective === 'left' && rightViewImage) {
      parts.push({
        inlineData: {
          mimeType: rightViewImage.mimeType,
          data: rightViewImage.data,
        },
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

    let generatedImage: GeneratedImage | null = null;

    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue;
      }

      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const fileName = `${analysis.subject.replace(/\s+/g, '_').toLowerCase()}_${perspective}`;
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const fileExtension = mime.getExtension(inlineData.mimeType || '') || 'png';

        generatedImage = {
          id: `${fileName}_${Date.now()}`,
          data: inlineData.data || '',
          mimeType: inlineData.mimeType || 'image/png',
          fileName: `${fileName}.${fileExtension}`,
          perspective: perspective,
        };

        // Call the image callback immediately when the image is generated
        if (onImageGenerated) {
          onImageGenerated(generatedImage);
        }
      }
    }

    if (!generatedImage) {
      throw new Error(`Failed to generate ${perspective} view`);
    }

    return generatedImage;
  }

  async downloadAllImages(images: GeneratedImage[]): Promise<void> {
    // For now, download each image individually
    // In a production app, you might want to use a zip library like JSZip
    images.forEach((image, index) => {
      setTimeout(() => {
        this.downloadImage(image);
      }, index * 200); // Stagger downloads to avoid overwhelming the browser
    });
  }
}