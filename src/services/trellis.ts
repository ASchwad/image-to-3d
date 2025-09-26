import Replicate from "replicate";
import type { GeneratedImage } from "./gemini";

export interface TrellisInput {
  seed: number;
  images: string[];
  texture_size: number;
  mesh_simplify: number;
  generate_color: boolean;
  generate_model: boolean;
  randomize_seed: boolean;
  generate_normal: boolean;
  save_gaussian_ply: boolean;
  ss_sampling_steps: number;
  slat_sampling_steps: number;
  return_no_background: boolean;
  ss_guidance_strength: number;
  slat_guidance_strength: number;
}

export interface TrellisOutput {
  model_obj?: string;
  model_glb?: string;
  model_ply?: string;
  video?: string;
  image?: string;
  // New fields from actual API response
  color_video?: string;
  combined_video?: string;
  normal_video?: string;
  gaussian_ply?: string;
  model_file?: string;
  no_background_images?: string;
}

export interface MeshGenerationProgress {
  status: 'idle' | 'uploading' | 'generating' | 'completed' | 'error';
  progress?: number;
  message?: string;
  result?: TrellisOutput;
  error?: string;
}

export class TrellisService {
  constructor(apiToken: string) {
    // API token not needed since we're using local server
    // Just keep for compatibility
  }



  async generate3DMesh(
    perspectiveImages: GeneratedImage[],
    onProgress?: (progress: MeshGenerationProgress) => void,
    customConfig?: Partial<TrellisInput>
  ): Promise<TrellisOutput> {
    try {
      // Update progress: preparing
      onProgress?.({
        status: 'uploading',
        message: 'Preparing perspective images...'
      });

      // Convert images to data URIs
      const dataUris: string[] = [];
      for (const image of perspectiveImages) {
        const dataUri = `data:${image.mimeType};base64,${image.data}`;
        dataUris.push(dataUri);
      }

      // Update progress: generating
      onProgress?.({
        status: 'generating',
        message: 'Starting 3D mesh generation...'
      });

      // Start async prediction on our local Express server
      const response = await fetch('http://localhost:3001/api/generate-mesh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: dataUris,
          config: customConfig
        })
      });

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorMessage;
        } catch {
          // If we can't parse the error response, use a generic message
          if (response.status === 0) {
            errorMessage = 'Unable to connect to local server. Make sure the Express server is running on port 3001';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Now poll for completion using the prediction ID
      const finalResult = await this.pollPredictionStatus(result.prediction_id, onProgress);

      // Update progress: completed
      onProgress?.({
        status: 'completed',
        message: 'Mesh generation completed!',
        result: finalResult
      });

      return finalResult;
    } catch (error) {
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to local server. Make sure the Express server is running on port 3001';
      }

      onProgress?.({
        status: 'error',
        error: errorMessage,
        message: 'Failed to generate 3D mesh'
      });

      throw error;
    }
  }

  async generateMeshFromDataUris(
    dataUris: string[],
    onProgress?: (progress: MeshGenerationProgress) => void,
    customConfig?: Partial<TrellisInput>
  ): Promise<TrellisOutput> {
    try {
      // Update progress: starting
      onProgress?.({
        status: 'generating',
        message: 'Starting 3D mesh generation...'
      });

      // Start async prediction on our local Express server
      const response = await fetch('http://localhost:3001/api/generate-mesh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: dataUris,
          config: customConfig
        })
      });

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorMessage;
        } catch {
          // If we can't parse the error response, use a generic message
          if (response.status === 0) {
            errorMessage = 'Unable to connect to local server. Make sure the Express server is running on port 3001';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Now poll for completion using the prediction ID
      const finalResult = await this.pollPredictionStatus(result.prediction_id, onProgress);

      // Update progress: completed
      onProgress?.({
        status: 'completed',
        message: 'Mesh generation completed!',
        result: finalResult
      });

      return finalResult;
    } catch (error) {
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to local server. Make sure the Express server is running on port 3001';
      }

      onProgress?.({
        status: 'error',
        error: errorMessage,
        message: 'Failed to generate 3D mesh'
      });

      throw error;
    }
  }

  private async pollPredictionStatus(
    predictionId: string,
    onProgress?: (progress: MeshGenerationProgress) => void
  ): Promise<TrellisOutput> {
    const maxAttempts = 60; // 10 minutes max (60 * 10s = 10min)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:3001/api/prediction/${predictionId}`);

        if (!response.ok) {
          throw new Error(`Failed to check prediction status: ${response.status}`);
        }

        const prediction = await response.json();

        console.log(`📡 Prediction ${predictionId} status: ${prediction.status}`);

        if (prediction.status === 'succeeded') {
          // Map the actual API response to our interface
          const output = prediction.output;
          const mappedOutput: TrellisOutput = {
            model_obj: output.model_obj,
            model_glb: output.model_file, // Map model_file to model_glb
            model_ply: output.gaussian_ply, // Map gaussian_ply to model_ply
            video: output.color_video, // Map color_video to video for backward compatibility
            color_video: output.color_video,
            combined_video: output.combined_video,
            normal_video: output.normal_video,
            gaussian_ply: output.gaussian_ply,
            model_file: output.model_file,
            no_background_images: output.no_background_images,
          };
          return mappedOutput;
        } else if (prediction.status === 'failed') {
          throw new Error(prediction.error || 'Prediction failed');
        } else if (prediction.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }

        // Still processing - update progress
        const progressMessages: { [key: string]: string } = {
          'starting': 'Starting processing...',
          'processing': 'Processing images...',
          'running': 'Generating 3D mesh...'
        };

        onProgress?.({
          status: 'generating',
          message: progressMessages[prediction.status] || `Status: ${prediction.status}`
        });

        // Wait 10 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error; // Re-throw on final attempt
        }

        console.warn(`Polling attempt ${attempts + 1} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }

    throw new Error('Prediction timed out after 10 minutes');
  }

  downloadMeshFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileExtension(url: string): string {
    if (url.includes('.obj')) return 'obj';
    if (url.includes('.glb')) return 'glb';
    if (url.includes('.ply')) return 'ply';
    return 'mesh';
  }

  getMeshFileName(analysis?: { subject?: string }, extension: string = 'obj'): string {
    const subject = analysis?.subject?.replace(/\s+/g, '_').toLowerCase() || 'mesh';
    return `${subject}_3d_model.${extension}`;
  }
}