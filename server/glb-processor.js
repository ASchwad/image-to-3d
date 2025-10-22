import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import fs from 'fs';
import path from 'path';

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

  // Load the GLB file
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      inputPath,
      (gltf) => resolve(gltf),
      undefined,
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

  // Process each mesh: smooth and merge
  const processedGeometries = [];

  for (const mesh of meshes) {
    let geometry = mesh.geometry.clone();

    // Ensure we have a BufferGeometry
    if (!geometry.isBufferGeometry) {
      geometry = new THREE.BufferGeometry().fromGeometry(geometry);
    }

    // Apply mesh transformations
    mesh.updateMatrixWorld(true);
    geometry.applyMatrix4(mesh.matrixWorld);

    // Smooth the mesh by computing vertex normals
    // First merge vertices to ensure proper smoothing
    geometry = mergeVertices(geometry);
    geometry.computeVertexNormals();

    processedGeometries.push(geometry);
    console.log(`✓ Processed mesh with ${geometry.attributes.position.count} vertices`);
  }

  // Merge all geometries into one
  let finalGeometry;
  if (processedGeometries.length === 1) {
    finalGeometry = processedGeometries[0];
  } else {
    const mergedGeometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];

    for (const geo of processedGeometries) {
      const pos = geo.attributes.position.array;
      const norm = geo.attributes.normal.array;
      positions.push(...pos);
      normals.push(...norm);
    }

    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    finalGeometry = mergedGeometry;
  }

  console.log('✓ Meshes merged');

  // Add foundation if requested
  if (addFoundation) {
    finalGeometry = addCircularFoundation(finalGeometry, marginRatio, thicknessRatio);
    console.log('✓ Foundation added');
  }

  // Export to STL
  const exporter = new STLExporter();
  const stlString = exporter.parse(new THREE.Mesh(finalGeometry), { binary: true });

  // Write to file
  fs.writeFileSync(outputPath, Buffer.from(stlString));
  console.log(`✅ STL saved: ${outputPath}`);
}

/**
 * Merge vertices that are at the same position
 * This is necessary for proper smooth shading
 */
function mergeVertices(geometry, tolerance = 1e-4) {
  const positions = geometry.attributes.position.array;
  const vertexCount = positions.length / 3;

  // Simple vertex merging - map unique positions
  const uniqueVertices = new Map();
  const newIndices = new Uint32Array(vertexCount);
  const newPositions = [];
  const newNormals = [];

  let uniqueIndex = 0;

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    // Create a key for this vertex position
    const key = `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;

    if (!uniqueVertices.has(key)) {
      uniqueVertices.set(key, uniqueIndex);
      newPositions.push(x, y, z);
      newIndices[i] = uniqueIndex;
      uniqueIndex++;
    } else {
      newIndices[i] = uniqueVertices.get(key);
    }
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeometry.setIndex(Array.from(newIndices));

  return newGeometry;
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

  // Merge the foundation with the original geometry
  const mergedGeometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];

  // Add original geometry
  const origPos = geometry.attributes.position.array;
  const origNorm = geometry.attributes.normal?.array;
  positions.push(...origPos);
  if (origNorm) normals.push(...origNorm);

  // Add foundation geometry
  const foundPos = foundationGeometry.attributes.position.array;
  const foundNorm = foundationGeometry.attributes.normal.array;
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
