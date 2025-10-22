#!/usr/bin/env python3
"""
Process GLB files by first smoothing with trimesh, then adding foundation with Blender

Usage: python process_with_foundation.py input.glb output.stl [margin_ratio] [thickness_ratio]
"""

import sys
import subprocess
import os
import tempfile

def main():
    if len(sys.argv) < 3:
        print("Usage: python process_with_foundation.py input.glb output.stl [margin_ratio] [thickness_ratio]")
        print("Example: python process_with_foundation.py model.glb model_with_foundation.stl 0.15 0.08")
        return

    input_glb = sys.argv[1]
    output_stl = sys.argv[2]
    margin_ratio = sys.argv[3] if len(sys.argv) > 3 else "0.1"
    thickness_ratio = sys.argv[4] if len(sys.argv) > 4 else "0.05"

    if not os.path.exists(input_glb):
        print(f"Input file not found: {input_glb}")
        return

    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Step 1: First smooth the GLB with trimesh
    print("Step 1: Smoothing GLB with trimesh...")
    temp_smoothed_stl = os.path.join(tempfile.gettempdir(), "smoothed_temp.stl")

    glb_to_stl_script = os.path.join(script_dir, "glb_to_stl.py")
    try:
        subprocess.run([
            sys.executable, glb_to_stl_script,
            input_glb, temp_smoothed_stl
        ], check=True)
        print(f"✓ Smoothed STL created: {temp_smoothed_stl}")
    except subprocess.CalledProcessError as e:
        print(f"Error in trimesh smoothing: {e}")
        return

    # Step 2: Convert smoothed STL back to GLB temporarily for Blender
    print("Step 2: Converting smoothed STL to temporary GLB...")
    temp_glb = os.path.join(tempfile.gettempdir(), "smoothed_temp.glb")
    try:
        subprocess.run([
            "assimp", "export", temp_smoothed_stl, temp_glb
        ], check=True)
        print(f"✓ Temporary GLB created: {temp_glb}")
    except subprocess.CalledProcessError as e:
        print(f"Error converting STL to GLB: {e}")
        # Clean up
        if os.path.exists(temp_smoothed_stl):
            os.remove(temp_smoothed_stl)
        return

    # Step 3: Add foundation with Blender
    print("Step 3: Adding foundation with Blender...")
    add_foundation_script = os.path.join(script_dir, "add_foundation_blender.py")
    try:
        subprocess.run([
            "blender", "--background", "--python", add_foundation_script, "--",
            temp_glb, output_stl, margin_ratio, thickness_ratio
        ], check=True)
        print(f"✓ Final STL with foundation created: {output_stl}")
    except subprocess.CalledProcessError as e:
        print(f"Error adding foundation: {e}")
        return
    finally:
        # Clean up temporary files
        for temp_file in [temp_smoothed_stl, temp_glb]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
                print(f"Cleaned up: {temp_file}")

    print("\n🎉 Success! Process completed:")
    print(f"   Input:  {input_glb}")
    print(f"   Output: {output_stl}")
    print(f"   Applied trimesh smoothing + circular foundation")

if __name__ == "__main__":
    main()