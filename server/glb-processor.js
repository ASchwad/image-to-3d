import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import fs from 'fs';
import path from 'path';

// Polyfill browser globals for Three.js in Node.js
global.self = global;
global.window = global;
global.document = {
  createElement: () => ({
    getContext: () => null,
    style: {},
  }),
};

/**
 * Process a GLB file: smooth the mesh and optionally add a foundation
 * @param {string} inputPath - Path to input GLB file
 * @param {string} outputPath - Path to output STL file
 * @param {Object} options - Processing options
 * @param {number} options.marginRatio - Foundation margin as ratio of model size (default: 0.1)
 * @param {number} options.thicknessRatio - Foundation thickness as ratio of model size (default: 0.05)
 * @param {boolean} options.addFoundation - Whether to add a foundation (default: true)
 * @returns {Promise<void>}
 */
export async function processGLB(inputPath, outputPath, options = {}) {
  const {
    marginRatio = 0.1,
    thicknessRatio = 0.05,
    addFoundation = true
  } = options;

  console.log(`🔧 Processing GLB: ${inputPath}`);

  // Load the GLB file from disk
  const glbData = fs.readFileSync(inputPath);
  const arrayBuffer = glbData.buffer.slice(
    glbData.byteOffset,
    glbData.byteOffset + glbData.byteLength
  );

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      '', // path (not needed for parse)
      (gltf) => resolve(gltf),
      (error) => reject(error)
    );
  });

  console.log('✓ GLB loaded successfully');

  // Get all meshes from the scene
  const meshes = [];
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) {
    throw new Error('No meshes found in GLB file');
  }

  console.log(`✓ Found ${meshes.length} mesh(es)`);

  // Create a new scene with only the meshes (no other nodes)
  const exportScene = new THREE.Scene();

  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);

    let geometry = mesh.geometry.clone();

    // Apply world transforms to bake them into the geometry
    geometry.applyMatrix4(mesh.matrixWorld);

    // Check if geometry is indexed and has interleaved attributes (this causes corruption)
    const hasInterleavedAttributes = Object.values(geometry.attributes).some(
      attr => attr.isInterleavedBufferAttribute
    );

    console.log(`✓ Processing mesh: ${geometry.attributes.position.count} vertices`);
    console.log(`  Indexed: ${!!geometry.index}`);
    console.log(`  Interleaved: ${hasInterleavedAttributes}`);

    // If indexed but NOT interleaved, convert to non-indexed for STL
    // If interleaved, keep as-is and let STLExporter handle it
    if (geometry.index && !hasInterleavedAttributes) {
      geometry = geometry.toNonIndexed();
      console.log('  ✓ Converted to non-indexed');
    }

    // Ensure normals exist
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
      console.log('  ✓ Computed normals');
    }

    // Create a new mesh with the processed geometry
    const exportMesh = new THREE.Mesh(geometry);
    exportScene.add(exportMesh);
  }

  // Export to STL
  const exporter = new STLExporter();
  const stlString = exporter.parse(exportScene, { binary: false });

  // Write to file
  fs.writeFileSync(outputPath, stlString);
  console.log(`✅ STL saved: ${outputPath}`);
}

/**
 * Auto-orient the geometry to stand upright
 * Tries to find the best "up" direction by testing which rotation
 * produces the smallest base footprint (tallest/thinnest orientation)
 */
function autoOrient(geometry) {
  // Test 6 possible orientations (±X, ±Y, ±Z pointing up)
  const orientations = [
    { name: 'Y up (original)', matrix: new THREE.Matrix4() },
    { name: 'Y down (flip)', matrix: new THREE.Matrix4().makeRotationZ(Math.PI) },
    { name: 'X up', matrix: new THREE.Matrix4().makeRotationZ(-Math.PI / 2) },
    { name: 'X down', matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2) },
    { name: 'Z up', matrix: new THREE.Matrix4().makeRotationX(Math.PI / 2) },
    { name: 'Z down', matrix: new THREE.Matrix4().makeRotationX(-Math.PI / 2) }
  ];

  let bestOrientation = null;
  let bestScore = -Infinity;

  for (const orientation of orientations) {
    const testGeometry = geometry.clone();
    testGeometry.applyMatrix4(orientation.matrix);
    testGeometry.computeBoundingBox();

    const bbox = testGeometry.boundingBox;
    const sizeX = bbox.max.x - bbox.min.x;
    const sizeY = bbox.max.y - bbox.min.y;
    const sizeZ = bbox.max.z - bbox.min.z;

    // Score = height / base_area (we want TALL and THIN - objects should stand up)
    const baseArea = sizeX * sizeZ;
    const score = sizeY / baseArea;

    console.log(`  ${orientation.name}: ${sizeX.toFixed(2)}×${sizeY.toFixed(2)}×${sizeZ.toFixed(2)}, score=${score.toFixed(3)}`);

    if (score > bestScore) {
      bestScore = score;
      bestOrientation = orientation;
    }
  }

  console.log(`✓ Best orientation: ${bestOrientation.name}`);
  geometry.applyMatrix4(bestOrientation.matrix);

  // Center the model on the XZ plane and place on ground (Y=0)
  geometry.computeBoundingBox();
  const newBbox = geometry.boundingBox;
  const centerX = (newBbox.max.x + newBbox.min.x) / 2;
  const centerZ = (newBbox.max.z + newBbox.min.z) / 2;
  const minY = newBbox.min.y;

  geometry.translate(-centerX, -minY, -centerZ);
  console.log('✓ Centered and placed on ground');

  return geometry;
}

/**
 * Add a circular foundation/base to the geometry
 */
function addCircularFoundation(geometry, marginRatio, thicknessRatio) {
  // Compute bounding box
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;

  const sizeX = bbox.max.x - bbox.min.x;
  const sizeY = bbox.max.y - bbox.min.y;
  const sizeZ = bbox.max.z - bbox.min.z;
  const maxSize = Math.max(sizeX, sizeY, sizeZ);

  const centerX = (bbox.max.x + bbox.min.x) / 2;
  const centerZ = (bbox.max.z + bbox.min.z) / 2;
  const bottomY = bbox.min.y;

  // Calculate foundation dimensions
  const radius = (maxSize / 2) * (1 + marginRatio);
  const thickness = maxSize * thicknessRatio;

  console.log(`  Foundation: radius=${radius.toFixed(2)}, thickness=${thickness.toFixed(2)}`);

  // Create a cylinder for the foundation
  const foundationGeometry = new THREE.CylinderGeometry(
    radius,      // radiusTop
    radius,      // radiusBottom
    thickness,   // height
    64,          // radialSegments
    1,           // heightSegments
    false        // openEnded
  );

  // Position the foundation
  foundationGeometry.translate(centerX, bottomY - thickness / 2, centerZ);

  // Convert both geometries to non-indexed (required for STL)
  const origGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const foundGeometry = foundationGeometry.index ? foundationGeometry.toNonIndexed() : foundationGeometry;

  // Merge the foundation with the original geometry
  const mergedGeometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];

  // Add original geometry
  const origPos = origGeometry.attributes.position.array;
  const origNorm = origGeometry.attributes.normal?.array;
  positions.push(...origPos);
  if (origNorm) {
    normals.push(...origNorm);
  } else {
    // Generate flat normals if missing
    for (let i = 0; i < origPos.length; i += 9) {
      const v1 = new THREE.Vector3(origPos[i], origPos[i+1], origPos[i+2]);
      const v2 = new THREE.Vector3(origPos[i+3], origPos[i+4], origPos[i+5]);
      const v3 = new THREE.Vector3(origPos[i+6], origPos[i+7], origPos[i+8]);
      const normal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(v2, v1),
        new THREE.Vector3().subVectors(v3, v1)
      ).normalize();
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
    }
  }

  // Add foundation geometry
  const foundPos = foundGeometry.attributes.position.array;
  const foundNorm = foundGeometry.attributes.normal.array;
  positions.push(...foundPos);
  normals.push(...foundNorm);

  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  return mergedGeometry;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node glb-processor.js <input.glb> <output.stl> [marginRatio] [thicknessRatio]');
    console.log('Example: node glb-processor.js model.glb output.stl 0.1 0.05');
    process.exit(1);
  }

  const [inputPath, outputPath, marginRatio, thicknessRatio] = args;

  processGLB(inputPath, outputPath, {
    marginRatio: marginRatio ? parseFloat(marginRatio) : 0.1,
    thicknessRatio: thicknessRatio ? parseFloat(thicknessRatio) : 0.05,
    addFoundation: true
  }).catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
