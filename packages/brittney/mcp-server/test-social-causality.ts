import { describe, it, expect } from 'vitest';
import { handleSocialCausalityTool } from './src/social-causality';

async function runTests() {
    console.log("Running Causal Social Memory Tests...");
    
    try {
        const agentA_DAG = {
            metadata: { model_name: 'AgentA_Masked_DAG', generated_at: new Date().toISOString() },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 4.5 } // High confidence
            ]
        };

        const agentB_DAG = {
            metadata: { model_name: 'AgentB_Masked_DAG', generated_at: new Date().toISOString() },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_CHARLIE', type: 'static_variable', do_capable: false } // Subjective noise
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 2.0 }, // Medium confidence
                { source: 'NODE_BRAVO', target: 'NODE_CHARLIE', relation: 'near', weight: 1.0 } // False correlation
            ]
        };

        const agentC_DAG = {
            metadata: { model_name: 'AgentC_Masked_DAG', generated_at: new Date().toISOString() },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 2.5 } // Normal confidence
            ]
        };

        const response: any = await handleSocialCausalityTool('merge_social_causal_models', {
            dags: [agentA_DAG, agentB_DAG, agentC_DAG]
        });

        // 1. Assert Node Consensus. (ALFA and BRAVO are in 3/3 DAGs. CHARLIE is in 1/3 DAGs).
        // Threshold requires > 50% observation (2). CHARLIE must be dropped cleanly.
        if (response.content[0].text.includes("NODE_CHARLIE")) {
            throw new Error("Test 1 Failed: SCM Merge failed to drop minority noise nodes dynamically.");
        }
        console.log("✅ Test 1 Passed: Noise nodes dropped cleanly via consensus.");

        // 2. Assert Edge Averaging handling collisions cleanly.
        // Weights: 4.5, 2.0, 2.5 => Sum: 9.0 => Average: 3.0
        if (!response.content[0].text.includes('"weight": 3')) {
            throw new Error("Test 2 Failed: SCM Merge failed to correctly average colliding objective weights offline.\n" + response.content[0].text);
        }
        console.log("✅ Test 2 Passed: Dynamic edge correlations averaged forming accurate consensus DAGs.");

        console.log("🎉 All Social Causality Tests Successfully Passed!");
        process.exit(0);
    } catch(e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTests();
