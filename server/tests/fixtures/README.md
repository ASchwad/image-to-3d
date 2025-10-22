# Test Fixtures

This directory contains GLB test files for the GLB to STL conversion pipeline.

## Test Files

- `test_cat.glb` - Small model (~4.2 MB, ~16K triangles)
- `test_chair.glb` - Medium model (~4.8 MB, ~30K triangles)
- `test_large.glb` - Large model (~5 MB, ~30K triangles)

## Running Tests

```bash
node server/tests/glb-conversion.test.js
```

The test suite will:
1. Use existing GLB files from this directory
2. Download missing test files automatically (if URLs are still valid)
3. Convert each GLB to STL via the API
4. Validate the output for correctness
5. Report success/failure for each test

## What Gets Tested

- ✅ API responds successfully
- ✅ STL format is correct
- ✅ Valid STL header/footer
- ✅ No NaN or Infinity values
- ✅ Triangle count meets minimum threshold
- ✅ File size is reasonable
- ✅ Vertex coordinates are valid

## Adding New Test Models

To add a new test model:

1. Place a `.glb` file in this directory
2. Update `TEST_CASES` in `server/tests/glb-conversion.test.js`
3. Run the tests

Test files are committed to git so the tests work offline and don't depend on external URLs expiring.
