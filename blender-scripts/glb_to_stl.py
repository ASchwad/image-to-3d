#!/usr/bin/env python3
import trimesh
import sys
import subprocess
import os

if len(sys.argv) != 3:
    print("Usage: python glb_to_stl.py input.glb output.stl")
    sys.exit(1)

input_glb = sys.argv[1]
output_stl = sys.argv[2]
temp_stl = "temp.stl"

# Step 1: Convert GLB → STL using Assimp
print(f"Converting {input_glb} to STL...")
subprocess.run(["assimp", "export", input_glb, temp_stl], check=True)

# Step 2: Load STL with trimesh
print("Loading and repairing mesh...")
mesh = trimesh.load(temp_stl)

# Repair operations
try:
    mesh.fill_holes()
except Exception as e:
    print(f"Warning: Could not fill holes: {e}")
mesh.update_faces(mesh.unique_faces())
mesh.remove_unreferenced_vertices()

# Optional smoothing (basic Laplacian smoothing)
print("Smoothing mesh...")
try:
    import trimesh.smoothing
    mesh = mesh.smoothed()
except AttributeError:
    try:
        from trimesh.smoothing import filter_laplacian
        filter_laplacian(mesh, lamb=0.5, iterations=3)
    except Exception as e:
        print(f"Warning: Could not smooth mesh: {e}")
except Exception as e:
    print(f"Warning: Could not smooth mesh: {e}")

# Step 3: Export final STL
mesh.export(output_stl)
print(f"Repaired and smoothed STL saved as {output_stl}")

# Clean up temp file
os.remove(temp_stl)