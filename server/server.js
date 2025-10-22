import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';

dotenv.config({ path: '../.env' });

const app = express();
const port = 3001;

// Enable CORS for the frontend
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Support large base64 images

const replicate = new Replicate({
  auth: process.env.VITE_REPLICATE_API_TOKEN,
});

// Test endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Trellis API server is running' });
});

// Start 3D mesh generation (async)
app.post('/api/generate-mesh', async (req, res) => {
  try {
    const { images, config } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    console.log(`🚀 Starting mesh generation with ${images.length} images`);

    // Default configuration (matching your Node.js script)
    const defaultConfig = {
      seed: 0,
      texture_size: 2048,
      mesh_simplify: 0.9,
      generate_color: true,
      generate_model: true,
      randomize_seed: true,
      generate_normal: false,
      save_gaussian_ply: true,
      ss_sampling_steps: 38,
      slat_sampling_steps: 12,
      return_no_background: false,
      ss_guidance_strength: 7.5,
      slat_guidance_strength: 3,
    };

    const input = {
      ...defaultConfig,
      ...config,
      images, // Data URIs from frontend
    };

    console.log('📤 Creating prediction on Replicate...');

    // Use direct HTTP API call to ensure it's truly async
    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.VITE_REPLICATE_API_TOKEN}`
      },
      body: JSON.stringify({
        version: "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
        input: input
      })
    });

    if (!predictionResponse.ok) {
      throw new Error(`Replicate API error: ${predictionResponse.status}`);
    }

    const prediction = await predictionResponse.json();

    console.log('✅ Prediction created:', prediction.id, 'Status:', prediction.status);

    // Return prediction ID immediately
    res.json({
      success: true,
      prediction_id: prediction.id,
      status: prediction.status,
      urls: {
        get: prediction.urls?.get,
        cancel: prediction.urls?.cancel
      }
    });

  } catch (error) {
    console.error('❌ Mesh generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate mesh',
      details: error.message
    });
  }
});

// Check prediction status
app.get('/api/prediction/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📡 Checking prediction status: ${id}`);

    const prediction = await replicate.predictions.get(id);

    res.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      logs: prediction.logs
    });

  } catch (error) {
    console.error('❌ Failed to get prediction:', error);
    res.status(500).json({
      error: 'Failed to get prediction status',
      details: error.message
    });
  }
});

// Generate image with Flux Kontext Pro
app.post('/api/generate-flux-image', async (req, res) => {
  try {
    const { prompt, image, aspect_ratio = '1:1', output_format = 'png' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🎨 Starting Flux image generation with prompt: "${prompt.substring(0, 50)}..."`);

    const input = {
      prompt,
      aspect_ratio,
      output_format,
      prompt_upsampling: false,
    };

    // Add input_image if provided (for editing mode)
    // Note: parameter is called "input_image" not "image"
    if (image) {
      input.input_image = image;
      console.log('🖼️ Reference image provided for editing');
    }

    console.log('📤 Creating Flux prediction via Replicate...');

    // Use predictions.create instead of run to properly wait for completion
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: input,
    });

    console.log('📋 Prediction created:', prediction.id);
    console.log('⏳ Waiting for completion...');

    // Poll for completion
    let finalPrediction = prediction;
    while (
      finalPrediction.status !== 'succeeded' &&
      finalPrediction.status !== 'failed' &&
      finalPrediction.status !== 'canceled'
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('📊 Status:', finalPrediction.status);
    }

    if (finalPrediction.status === 'failed') {
      throw new Error(finalPrediction.error || 'Prediction failed');
    }

    if (finalPrediction.status === 'canceled') {
      throw new Error('Prediction was canceled');
    }

    console.log('✅ Flux generation completed');
    console.log('📦 Output type:', typeof finalPrediction.output);
    console.log('📦 Output value:', finalPrediction.output);

    // Return the output URL
    res.json({
      success: true,
      output: finalPrediction.output
    });

  } catch (error) {
    console.error('❌ Flux generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate image with Flux',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🌟 Trellis API Server running on http://localhost:${port}`);
  console.log(`📡 Ready to accept requests from http://localhost:5173`);
});