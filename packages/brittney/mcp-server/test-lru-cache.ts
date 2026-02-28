import { handleMemoryTool } from './src/memory-tools';

async function runCacheE2E() {
    console.log("=== Phase 8: LRU Caching Deduplication E2E Test ===\n");

    // Stub global fetch to track API call counts
    let netCallCount = 0;
    const originalFetch = global.fetch;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        netCallCount++;
        // Emulate typical DB latency
        await new Promise(r => setTimeout(r, 100));
        return {
            ok: true,
            status: 200,
            json: async () => ({
                memories: [
                    { content: "Red cube at 10, 5, 3", similarity: 0.95 }
                ]
            })
        } as any;
    };

    console.log("➜ 1. Firing Initial Query (Cold Cache)");
    const startObj1 = performance.now();
    await handleMemoryTool('recall_similar', {
        agentId: 'cache_tester',
        memoryType: 'semantic',
        query: 'What color is the cube?',
        limit: 5
    });
    const endObj1 = performance.now();
    console.log(`✔ Query 1 executed in ${(endObj1 - startObj1).toFixed(2)}ms. Network Calls: ${netCallCount}`);

    console.log("\n➜ 2. Firing Identical Query (Warm Cache)");
    const startObj2 = performance.now();
    await handleMemoryTool('recall_similar', {
        agentId: 'cache_tester',
        memoryType: 'semantic',
        query: 'What color is the cube?',
        limit: 5
    });
    const endObj2 = performance.now();
    console.log(`✔ Query 2 executed in ${(endObj2 - startObj2).toFixed(2)}ms. Network Calls: ${netCallCount}`);

    console.log("\n➜ 3. Firing Different Query (Cold Cache Miss)");
    const startObj3 = performance.now();
    await handleMemoryTool('recall_similar', {
        agentId: 'cache_tester',
        memoryType: 'semantic',
        query: 'Is there a blue sphere?',
        limit: 5
    });
    const endObj3 = performance.now();
    console.log(`✔ Query 3 executed in ${(endObj3 - startObj3).toFixed(2)}ms. Network Calls: ${netCallCount}`);


    if (netCallCount === 2 && (endObj2 - startObj2) < (endObj1 - startObj1)) {
        console.log("\n=== LRU Cache Implementation Passed! ===");
    } else {
        console.error(`\n✖ Cache Test failed. Expected 2 network calls, got ${netCallCount}. Cache hit latency should be faster.`);
        process.exit(1);
    }

    // Restore Global Fetch
    global.fetch = originalFetch;
}

runCacheE2E().catch(console.error);
