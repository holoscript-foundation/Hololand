import { handleSpatialTool } from './src/spatial-tools';

async function runSemanticSpatialE2E() {
    console.log("=== Phase 8: Semantic Spatial Query E2E Test ===\n");

    console.log("➜ 1. Populating spatial index with physical items...");
    await handleSpatialTool('index_spatial_object', { id: 'obj-sword', type: 'weapon', position: { x: 10, y: 10, z: 10 } });
    await handleSpatialTool('index_spatial_object', { id: 'obj-apple', type: 'food', position: { x: 12, y: 10, z: 10 } });
    await handleSpatialTool('index_spatial_object', { id: 'obj-far-sword', type: 'weapon', position: { x: 500, y: 500, z: 500 } });

    // Mock global fetch for semantic similarity endpoint
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        return {
            ok: true,
            status: 200,
            json: async () => ({
                memories: [
                    { content: "A sharp medieval weapon", metadata: { type: "weapon" }, similarity: 0.95 },
                    { content: "Something dangerous", metadata: { objectId: "obj-sword" }, similarity: 0.88 }
                ]
            })
        } as any;
    };

    console.log("➜ 2. Searching for 'danger' within radius 50...");
    const result: any = await handleSpatialTool('semantic_spatial_query', {
        position: { x: 0, y: 0, z: 0 },
        radius: 50,
        concept: "danger",
        minSimilarity: 0.8
    });

    const outputString = result.content[0].text;
    console.log(outputString);

    if (outputString.includes("Found 1 concept-aligned objects") && outputString.includes("obj-sword")) {
        console.log("\n✔ Semantic + Spatial Fusion Succeeded!");
        console.log("  - Excluded 'obj-apple' (semantically irrelevant)");
        console.log("  - Excluded 'obj-far-sword' (spatially out of bounds)");
    } else {
        console.error("\n✖ Failed to isolate 'obj-sword' correctly based on fused parameters.");
        process.exit(1);
    }

    // Restore Global Fetch
    global.fetch = originalFetch;

    console.log("\n=== Integration Passed! ===");
}

runSemanticSpatialE2E().catch(console.error);
