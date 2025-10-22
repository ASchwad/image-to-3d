import Replicate from 'replicate';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env' });

const replicate = new Replicate({
  auth: process.env.VITE_REPLICATE_API_TOKEN,
});

async function testFluxImageGeneration() {
  try {
    console.log('🧪 Testing Flux Kontext Pro API...\n');

    // Read the test image
    const imagePath = path.join(__dirname, 'test_images', 'chair.jpeg');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    console.log('📸 Test image loaded:', imagePath);
    console.log('📏 Image size:', imageBuffer.length, 'bytes');
    console.log('📝 Prompt: "Change the chair color to bright orange"\n');

    // Test 1: Image editing with reference
    console.log('🎨 Test 1: Image editing with reference image');
    console.log('─'.repeat(50));

    const input = {
      prompt: "Change the chair color to bright orange",
      input_image: dataUri,
      aspect_ratio: "1:1",
      output_format: "png",
      prompt_upsampling: false,
    };

    console.log('📤 Creating prediction...');
    const startTime = Date.now();

    // Use predictions.create instead of run to get more control
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: input,
    });

    console.log('📋 Prediction ID:', prediction.id);
    console.log('📊 Initial status:', prediction.status);

    // Wait for completion
    console.log('⏳ Waiting for completion...');
    let finalPrediction = prediction;

    while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && finalPrediction.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log('📊 Status:', finalPrediction.status);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Generation completed in ${duration}s\n`);

    const output = finalPrediction.output;

    // Analyze output
    console.log('📦 Output Analysis:');
    console.log('─'.repeat(50));
    console.log('Type:', typeof output);
    console.log('Is Array:', Array.isArray(output));
    console.log('Value:', JSON.stringify(output, null, 2));
    console.log('\n');

    // Test 2: Text-to-image (no reference)
    console.log('🎨 Test 2: Text-to-image without reference');
    console.log('─'.repeat(50));

    const input2 = {
      prompt: "A modern orange velvet chair with black metal legs in a minimalist style",
      aspect_ratio: "1:1",
      output_format: "png",
      prompt_upsampling: false,
    };

    console.log('📤 Creating prediction...');
    const startTime2 = Date.now();

    const prediction2 = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: input2,
    });

    console.log('📋 Prediction ID:', prediction2.id);
    console.log('📊 Initial status:', prediction2.status);

    // Wait for completion
    console.log('⏳ Waiting for completion...');
    let finalPrediction2 = prediction2;

    while (finalPrediction2.status !== 'succeeded' && finalPrediction2.status !== 'failed' && finalPrediction2.status !== 'canceled') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      finalPrediction2 = await replicate.predictions.get(prediction2.id);
      console.log('📊 Status:', finalPrediction2.status);
    }

    const endTime2 = Date.now();
    const duration2 = ((endTime2 - startTime2) / 1000).toFixed(2);

    console.log(`✅ Generation completed in ${duration2}s\n`);

    const output2 = finalPrediction2.output;

    console.log('📦 Output Analysis:');
    console.log('─'.repeat(50));
    console.log('Type:', typeof output2);
    console.log('Is Array:', Array.isArray(output2));
    console.log('Value:', JSON.stringify(output2, null, 2));

    // Summary
    console.log('\n');
    console.log('📊 Summary:');
    console.log('─'.repeat(50));
    console.log('Test 1 (with reference):', typeof output);
    console.log('Test 2 (text-to-image):', typeof output2);

    if (typeof output === 'string') {
      console.log('\n✅ Output is a URL string');
      console.log('Example URL:', output);
    } else if (Array.isArray(output)) {
      console.log('\n✅ Output is an array');
      console.log('Array length:', output.length);
    } else if (typeof output === 'object') {
      console.log('\n✅ Output is an object');
      console.log('Object keys:', Object.keys(output));
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

console.log('🚀 Starting Flux Kontext Pro API Test\n');
testFluxImageGeneration();
