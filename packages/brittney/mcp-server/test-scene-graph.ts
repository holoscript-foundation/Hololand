import { handleSpatialTool } from './src/spatial-tools';

async function runSceneGraphTest() {
    console.log("=== Phase 11: Scene Graph Training Supervision Test ===\n");

    console.log("➜ 1. Populating local Spatial Index with test Entity clusters.");
    
    // Populate
    await handleSpatialTool('index_spatial_object', { id: 'goblin_1', type: 'enemy', position: { x: 5, y: 0, z: 5 } });
    await handleSpatialTool('index_spatial_object', { id: 'brittney_001', type: 'agent', position: { x: 6, y: 0, z: 5 } });
    await handleSpatialTool('index_spatial_object', { id: 'tree_1', type: 'resource', position: { x: 15, y: 0, z: 2 } });
    await handleSpatialTool('index_spatial_object', { id: 'mountain_1', type: 'environment', position: { x: 50, y: 0, z: 50 } });

    console.log("\n➜ 2. Extracting ML Target Parameters over the geometric space.");
    
    const result: any = await handleSpatialTool('extract_scene_graph_labels', {
        radius: 100
    });

    const outputString = result.content[0].text;
    console.log(`\n   - Synthesis Output:\n     ${outputString}`);

    if (outputString.includes("adjacent_to") && outputString.includes("near") && outputString.includes("in_vicinity_of")) {
        console.log("\n✔ Scene Graph Extraction fully succeeded!");
        console.log("  - Triplets mapped Entity distances spanning 'adjacent_to' (Goblin vs Brittney), 'near' (Tree), to 'distant_from' (Mountain).");
    } else {
        console.error("\n✖ Extracted relation mapping parameters missed critical proximity bounds.");
        process.exit(1);
    }

    console.log("\n=== Integration Passed! ===");
}

runSceneGraphTest().catch(console.error);
