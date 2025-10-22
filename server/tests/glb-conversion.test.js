/**
 * GLB to STL Conversion Tests
 *
 * Run with: node server/tests/glb-conversion.test.js
 *
 * This test suite validates the GLB to STL conversion pipeline:
 * - Uses local test files from server/tests/fixtures/
 * - Tests API endpoint functionality
 * - Validates output STL files for correctness
 * - Checks for geometry corruption (NaN, Infinity)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3001/api/process-glb';
const TEMP_DIR = path.join(__dirname, '../../temp');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Test GLB files - must exist in fixtures/ directory
// These files are committed to git so tests work offline
const TEST_CASES = [
  {
    name: 'Test 1: Small Model',
    fileName: 'test_cat.glb',
    expectedMinTriangles: 5000,
    expectedMaxSize: 15 // MB
  },
  {
    name: 'Test 2: Medium Model',
    fileName: 'test_chair.glb',
    expectedMinTriangles: 10000,
    expectedMaxSize: 15 // MB
  },
  {
    name: 'Test 3: Large Model',
    fileName: 'test_large.glb',
    expectedMinTriangles: 15000,
    expectedMaxSize: 20 // MB
  }
];

/**
 * Ensure test model exists locally
 */
function ensureTestModel(testCase) {
  const filePath = path.join(FIXTURES_DIR, testCase.fileName);

  if (fs.existsSync(filePath)) {
    console.log(`  ✓ Using test file: ${testCase.fileName}`);
    return filePath;
  }

  console.log(`  ❌ Test file not found: ${testCase.fileName}`);
  console.log(`  ℹ️  Please add the GLB file to: ${filePath}`);
  return null;
}

async function runTest(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Ensure test model exists locally
    const glbPath = ensureTestModel(testCase);
    if (!glbPath) {
      console.log('❌ Test file not available - SKIPPED');
      return false;
    }

    const startTime = Date.now();

    // Read the GLB file and convert to base64
    const glbBuffer = fs.readFileSync(glbPath);
    const glbBase64 = `data:model/gltf-binary;base64,${glbBuffer.toString('base64')}`;

    console.log(`📁 Using local file: ${testCase.fileName} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Call the API with base64 data
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        glbBase64: glbBase64,
        marginRatio: 0.1,
        thicknessRatio: 0.05,
        outputFormat: 'stl'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const elapsed = Date.now() - startTime;

    // Decode the STL
    const base64Data = result.output.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save for inspection
    const testFileName = `test_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.stl`;
    const testFilePath = path.join(TEMP_DIR, testFileName);
    fs.writeFileSync(testFilePath, buffer);

    // Validate the STL
    const content = buffer.toString('utf-8');
    const triangleCount = (content.match(/facet normal/g) || []).length;
    const fileSizeMB = buffer.length / 1024 / 1024;

    // Check for corruption
    const hasNaN = content.includes('NaN') || content.includes('nan');
    const hasInf = content.includes('Infinity') || content.includes('inf');
    const hasValidHeader = content.startsWith('solid exported');
    const hasValidFooter = content.trim().endsWith('endsolid exported');

    // Validation checks
    const checks = {
      '✓ API Success': result.success === true,
      '✓ Format': result.format === 'stl',
      '✓ Valid Header': hasValidHeader,
      '✓ Valid Footer': hasValidFooter,
      '✓ No NaN Values': !hasNaN,
      '✓ No Infinity Values': !hasInf,
      '✓ Triangle Count': triangleCount >= testCase.expectedMinTriangles,
      '✓ File Size': fileSizeMB <= testCase.expectedMaxSize
    };

    // Print results
    console.log('\n📊 Results:');
    console.log(`  File: ${testFileName}`);
    console.log(`  Size: ${fileSizeMB.toFixed(2)} MB`);
    console.log(`  Triangles: ${triangleCount.toLocaleString()}`);
    console.log(`  Time: ${(elapsed / 1000).toFixed(2)}s`);

    console.log('\n✅ Validation:');
    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      const icon = passed ? '✅' : '❌';
      console.log(`  ${icon} ${check}`);
      if (!passed) allPassed = false;
    }

    // Show sample vertices
    const vertices = content.match(/vertex [^\n]+/g) || [];
    if (vertices.length > 0) {
      console.log('\n🔍 Sample Vertices (first 3):');
      vertices.slice(0, 3).forEach(v => console.log(`  ${v}`));
    }

    if (allPassed) {
      console.log('\n🎉 TEST PASSED!');
      return true;
    } else {
      console.log('\n❌ TEST FAILED!');
      return false;
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting GLB to STL Conversion Tests');
  console.log(`📁 Output directory: ${TEMP_DIR}\n`);

  const results = [];

  for (const testCase of TEST_CASES) {
    const passed = await runTest(testCase);
    results.push({ name: testCase.name, passed });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));

  results.forEach(({ name, passed }) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  console.log('\n' + '='.repeat(60));
  if (passedCount === totalCount) {
    console.log(`🎉 ALL TESTS PASSED (${passedCount}/${totalCount})`);
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log(`❌ SOME TESTS FAILED (${passedCount}/${totalCount})`);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
