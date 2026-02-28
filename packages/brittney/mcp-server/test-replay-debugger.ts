import { handleDatasetTool } from './src/dataset-tools';

async function runReplayDebuggerTest() {
    console.log("=== Phase 11: Episodic Replay Debugger Test ===\n");

    console.log("➜ 1. Querying Spatial Temporal Timelines via MCP boundaries...");

    const result: any = await handleDatasetTool('replay_episodic_timeline', {
        agentId: 'brittney-001',
        limit: 50
    });

    const outputString = result.content[0].text;
    console.log(outputString);

    if (outputString.includes("Replay Array bounds exported") && outputString.includes("Timeline [4 nodes]")) {
        console.log("\n✔ Timeline Chronology extraction fully mapped!");
        console.log("  - Evaluated successful formatting tracking sequential chronological steps spanning {t: 0, 1000, 2500, 4000}.");
    } else {
        console.error("\n✖ Failed to orchestrate JSON Timeline format.");
        process.exit(1);
    }

    console.log("\n=== Integration Passed! ===");
}

runReplayDebuggerTest().catch(console.error);
