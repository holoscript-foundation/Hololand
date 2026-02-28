import { handleSpatialTool, spatialSchemas } from './src/spatial-tools';
import { Octree, SpatialItem3D } from './src/octree';

async function runTests() {
  console.log("Running Accessibility Checker Tests...");
    
  try {
      // Indexing compliant items
      await handleSpatialTool('index_spatial_object', {
          id: 'btn_submit',
          type: 'button',
          position: { x: 50, y: 50, z: 50 },
          bounds: { width: 10, depth: 5 },
          metadata: {
              aria_label: 'Submit Form',
              contrast_ratio: 5.2 // Above 4.5
          }
      });

      let response: any = await handleSpatialTool('verify_accessibility_semantics', {
          position: { x: 50, y: 50, z: 50 },
          radius: 20,
          contrastThreshold: 4.5
      });

      if (!response.content[0].text.includes('PASSED ✅')) throw new Error("Test 1 Failed: Compliant items failed.");
      console.log("✅ Test 1 Passed: WCAG thresholds and ARIA properties.");

      // Indexing non-compliant item (Missing ARIA)
      await handleSpatialTool('index_spatial_object', {
          id: 'btn_cancel_hidden',
          type: 'button',
          position: { x: -50, y: -50, z: -50 },
          bounds: { width: 10, depth: 5 },
          metadata: {
              contrast_ratio: 6.0
          }
      });

      response = await handleSpatialTool('verify_accessibility_semantics', {
          position: { x: -50, y: -50, z: -50 },
          radius: 20
      });

      if (!response.content[0].text.includes('FAILED ❌') || !response.content[0].text.includes('missing-alt-text')) {
          throw new Error("Test 2 Failed: Did not catch missing ARIA.");
      }
      console.log("✅ Test 2 Passed: Interactive element missing ARIA labels.");

      // Indexing non-compliant item (Low contrast)
      await handleSpatialTool('index_spatial_object', {
          id: 'txt_disclaimer',
          type: 'ui_text',
          position: { x: 100, y: 100, z: 100 },
          bounds: { width: 50, depth: 5 },
          metadata: {
              aria_label: 'Disclaimer Text',
              contrast_ratio: 3.1 // Fails default 4.5 threshold natively
          }
      });

      response = await handleSpatialTool('verify_accessibility_semantics', {
          position: { x: 100, y: 100, z: 100 },
          radius: 20,
          contrastThreshold: 4.5
      });

      if (!response.content[0].text.includes('FAILED ❌') || !response.content[0].text.includes('low-contrast')) {
           throw new Error("Test 3 Failed: Did not catch low contrast.");
      }
      console.log("✅ Test 3 Passed: Text element contrast falls below WCAG scalar bound.");

      console.log("🎉 All Tests Successfully Passed!");
      process.exit(0);
  } catch(e) {
      console.error(e);
      process.exit(1);
  }
}

runTests();
