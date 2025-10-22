# Blender Scripts for 3D Model Processing

This directory contains Blender scripts for post-processing 3D models generated from images.

## Scripts

### 1. `add_foundation_blender.py`
Adds a circular foundation/base to a GLB model using Blender.

**Usage:**
```bash
blender --background --python add_foundation_blender.py -- input.glb output.stl [margin_ratio] [thickness_ratio]
```

**Parameters:**
- `input.glb`: Input GLB file path
- `output.stl`: Output file path (supports .stl, .glb, .gltf)
- `margin_ratio`: (Optional) Foundation radius margin as ratio of max dimension (default: 0.1 = 10%)
- `thickness_ratio`: (Optional) Foundation thickness as ratio of max dimension (default: 0.05 = 5%)

**Example:**
```bash
blender --background --python add_foundation_blender.py -- model.glb model_with_base.stl 0.15 0.08
```

### 2. `glb_to_stl.py`
Converts GLB to STL with mesh repair and smoothing using trimesh.

**Usage:**
```bash
python glb_to_stl.py input.glb output.stl
```

**Features:**
- Hole filling
- Face deduplication
- Vertex cleanup
- Laplacian smoothing

### 3. `process_with_foundation.py`
Complete pipeline that smooths a GLB and adds a foundation.

**Usage:**
```bash
python process_with_foundation.py input.glb output.stl [margin_ratio] [thickness_ratio]
```

**Pipeline:**
1. Smooths GLB with trimesh
2. Converts to temporary GLB
3. Adds foundation with Blender
4. Exports final STL

## Requirements

### Python Dependencies
```bash
pip install -r requirements.txt
```

### System Dependencies
- **Blender**: Required for `add_foundation_blender.py` and `process_with_foundation.py`
- **Assimp**: Required for GLB/STL conversion

**Install on Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install blender assimp-utils
```

**Install on macOS:**
```bash
brew install blender assimp
```

## API Endpoint

The server provides an endpoint to process GLB files with foundation:

```
POST /api/process-glb
```

**Request Body:**
```json
{
  "glbUrl": "https://example.com/model.glb",
  "marginRatio": 0.1,
  "thicknessRatio": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "outputUrl": "https://example.com/model_with_foundation.stl"
}
```

## Notes

- The scripts require Blender to be installed and available in the system PATH
- Processing large models may take significant time and memory
- Temporary files are automatically cleaned up after processing
