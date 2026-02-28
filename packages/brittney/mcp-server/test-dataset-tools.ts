import { handleDatasetTool } from './src/dataset-tools';
import * as fs from 'fs';
import * as path from 'path';

async function runDatasetToolE2E() {
    console.log("=== Phase 9: Spatial Dataset Extraction Test ===\n");

    const targetFile = 'test-spatial-dataset.jsonl';
    const outPath = path.resolve(process.cwd(), targetFile);

    // Clean up if exists
    if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
    }

    console.log("➜ 1. Requesting MVP dataset extraction for Agent 'brittney-001'...");
    
    // Use the native dataset tool endpoint directly
    const result: any = await handleDatasetTool('generate_spatial_dataset', {
        outputFile: targetFile,
        agentId: 'brittney-001'
    });

    const outputString = result.content[0].text;
    console.log(outputString);

    if (outputString.includes("Successfully generated") && fs.existsSync(outPath)) {
        const fileContent = fs.readFileSync(outPath, 'utf-8');
        const lines = fileContent.trim().split('\n');

        console.log(`\n✔ Dataset JSONL generated successfully with ${lines.length} items!`);
        
        // Parse the first line to ensure schema validation
        try {
            const firstRow = JSON.parse(lines[0]);
            if (firstRow.spatial_context && firstRow.action && firstRow.outcome) {
                console.log("  - Triplet Output Schema Matrix Matched (Context -> Action -> Outcome)");
            } else {
                console.error("  - Schema mismatch in JSONL row!");
                process.exit(1);
            }
        } catch (e) {
            console.error("  - JSON Parsing generated invalid lines!");
            process.exit(1);
        }

    } else {
        console.error("\n✖ Failed to extract the ML dataset.");
        process.exit(1);
    }

    // Cleanup
    if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
    }

    console.log("\n=== Integration Passed! ===");
}

runDatasetToolE2E().catch(console.error);
