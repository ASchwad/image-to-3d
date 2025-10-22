# Server Tests

This directory contains all backend tests for the image-to-3d application.

## Test Structure

```
tests/
├── README.md                      # This file
├── glb-conversion.test.js         # GLB to STL conversion tests
└── fixtures/                      # Test data files
    ├── README.md
    ├── test_cat.glb              # Small test model
    ├── test_chair.glb            # Medium test model
    └── test_large.glb            # Large test model
```

## Running Tests

### Run all tests
```bash
node server/tests/glb-conversion.test.js
```

### Prerequisites
- Server must be running on http://localhost:3001
- Test fixture files must exist in `fixtures/` directory

## Test Suites

### GLB to STL Conversion (`glb-conversion.test.js`)

Tests the complete pipeline for converting GLB models to STL format:

**What it tests:**
- API endpoint functionality
- Geometry processing (indexed to non-indexed conversion)
- Interleaved attribute handling (prevents corruption)
- Output validation (no NaN/Infinity values)
- File format correctness (valid STL headers/footers)
- Performance benchmarks

**Test Cases:**
1. Small model (~16K triangles)
2. Medium model (~30K triangles)  
3. Large model (~30K triangles)

All tests use local fixture files so they work offline without external dependencies.

## Adding New Tests

1. Create a new test file: `my-feature.test.js`
2. Follow the existing test structure
3. Add test fixtures to `fixtures/` if needed
4. Update this README

## Test Output

Tests provide detailed output including:
- Pass/fail status for each test
- File sizes and triangle counts
- Processing time benchmarks
- Sample vertex data for verification
- Validation results for all checks

Example output:
```
🎉 TEST PASSED!
📊 Results:
  File: test_output.stl
  Size: 9.07 MB
  Triangles: 29,826
  Time: 0.13s
```
