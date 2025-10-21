import bpy
import bmesh
import mathutils
import os
import sys

def clear_scene():
    """Clear all mesh objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False, confirm=False)

def add_circular_foundation(glb_path, output_path, margin_ratio=0.1, thickness_ratio=0.05, min_thickness=0.05):
    """
    Add a circular foundation to a GLB model

    Args:
        glb_path: Path to input GLB file
        output_path: Path to output GLB/STL file
        margin_ratio: Foundation radius margin as ratio of max dimension (default 0.1 = 10%)
        thickness_ratio: Foundation thickness as ratio of max dimension (default 0.05 = 5%)
        min_thickness: Minimum foundation thickness in units (default 0.05)
    """

    # Clear existing scene
    clear_scene()

    # Import GLB file
    print(f"Importing {glb_path}...")
    bpy.ops.import_scene.gltf(filepath=glb_path)

    # Get all mesh objects
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    if not mesh_objects:
        print("No mesh objects found in GLB file!")
        return False

    # Calculate combined bounding box of all objects
    min_coords = [float('inf')] * 3
    max_coords = [float('-inf')] * 3

    for obj in mesh_objects:
        # Apply transformations to get world coordinates
        bbox_corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]

        for corner in bbox_corners:
            for i in range(3):
                min_coords[i] = min(min_coords[i], corner[i])
                max_coords[i] = max(max_coords[i], corner[i])

    # Calculate dimensions
    x_size = max_coords[0] - min_coords[0]
    y_size = max_coords[1] - min_coords[1]
    z_min = min_coords[2]

    # Calculate foundation parameters
    max_dimension = max(x_size, y_size)
    foundation_radius = (max_dimension / 2) * (1 + margin_ratio)
    foundation_thickness = max(max_dimension * thickness_ratio, min_thickness)

    # Calculate center position
    center_x = (min_coords[0] + max_coords[0]) / 2
    center_y = (min_coords[1] + max_coords[1]) / 2
    foundation_z = z_min - foundation_thickness / 2

    print(f"Model dimensions: {x_size:.1f} x {y_size:.1f}")
    print(f"Foundation: radius={foundation_radius:.1f}, thickness={foundation_thickness:.1f}")

    # Create circular foundation (cylinder)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=foundation_radius,
        depth=foundation_thickness,
        location=(center_x, center_y, foundation_z),
        vertices=64  # Smooth circle
    )

    foundation = bpy.context.active_object
    foundation.name = "Foundation"

    # Optional: Join all objects into one
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = mesh_objects[0]
    bpy.ops.object.join()

    # Export result
    file_ext = os.path.splitext(output_path)[1].lower()

    if file_ext == '.stl':
        print(f"Exporting to STL: {output_path}")
        bpy.ops.wm.stl_export(filepath=output_path)

    elif file_ext in ['.glb', '.gltf']:
        print(f"Exporting to GLB: {output_path}")
        bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
    else:
        print(f"Unsupported format: {file_ext}")
        return False

    print("Foundation added successfully!")
    return True

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 6:  # Script name + 4 args minimum
        print("Usage in Blender: blender --background --python add_foundation_blender.py -- input.glb output.stl [margin_ratio] [thickness_ratio]")
        print("Example: blender --background --python add_foundation_blender.py -- model.glb model_with_base.stl 0.15 0.08")
        return

    # Get arguments after '--'
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]

    input_file = argv[0]
    output_file = argv[1]
    margin_ratio = float(argv[2]) if len(argv) > 2 else 0.1
    thickness_ratio = float(argv[3]) if len(argv) > 3 else 0.05

    if not os.path.exists(input_file):
        print(f"Input file not found: {input_file}")
        return

    success = add_circular_foundation(input_file, output_file, margin_ratio, thickness_ratio)

    if success:
        print(f"Successfully created {output_file}")
    else:
        print("Failed to create foundation")

if __name__ == "__main__":
    main()