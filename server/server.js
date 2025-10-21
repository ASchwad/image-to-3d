import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Process GLB with foundation
app.post('/api/process-glb', async (req, res) => {
  try {
    const { glbUrl, glbBase64, marginRatio = 0.1, thicknessRatio = 0.05, outputFormat = 'stl' } = req.body;

    if (!glbUrl && !glbBase64) {
      return res.status(400).json({ error: 'Either glbUrl or glbBase64 is required' });
    }

    console.log('🔧 Starting GLB processing with foundation...');

    // Create temp directory for processing
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputPath = path.join(tempDir, `input_${Date.now()}.glb`);
    const outputExt = outputFormat === 'glb' ? 'glb' : 'stl';
    const outputPath = path.join(tempDir, `output_${Date.now()}.${outputExt}`);

    try {
      // Download or save GLB file
      if (glbUrl) {
        console.log(`📥 Downloading GLB from ${glbUrl}`);
        const response = await fetch(glbUrl);
        if (!response.ok) {
          throw new Error(`Failed to download GLB: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(inputPath, Buffer.from(buffer));
      } else if (glbBase64) {
        console.log('📥 Processing base64 GLB data');
        const base64Data = glbBase64.replace(/^data:.*?;base64,/, '');
        fs.writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));
      }

      // Run the Blender processing script
      const scriptPath = path.join(__dirname, '../blender-scripts/process_with_foundation.py');
      const command = `python3 "${scriptPath}" "${inputPath}" "${outputPath}" ${marginRatio} ${thicknessRatio}`;

      console.log(`🎨 Running Blender processing: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      if (stdout) console.log('📝 Output:', stdout);
      if (stderr) console.log('⚠️  Stderr:', stderr);

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Processing completed but output file was not created');
      }

      // Read the output file and convert to base64
      const outputBuffer = fs.readFileSync(outputPath);
      const outputBase64 = `data:application/octet-stream;base64,${outputBuffer.toString('base64')}`;

      // Clean up temp files
      try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.warn('⚠️  Failed to clean up temp files:', cleanupError);
      }

      console.log('✅ GLB processing completed successfully');

      res.json({
        success: true,
        output: outputBase64,
        format: outputExt,
        message: 'GLB processed with foundation successfully'
      });

    } catch (processingError) {
      // Clean up temp files on error
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.warn('⚠️  Failed to clean up temp files:', cleanupError);
      }
      throw processingError;
    }

  } catch (error) {
    console.error('❌ GLB processing failed:', error);
    res.status(500).json({
      error: 'Failed to process GLB',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🌟 Trellis API Server running on http://localhost:${port}`);
  console.log(`📡 Ready to accept requests from http://localhost:5173`);
});