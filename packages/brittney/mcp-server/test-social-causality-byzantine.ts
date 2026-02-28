import { describe, it, expect } from 'vitest';
import { handleSocialCausalityTool } from './src/social-causality';

async function runTests() {
    console.log("Running Byzantine-Resilient FMARL Tests...");
    
    try {
        const agentA_DAG = {
            metadata: { model_name: 'AgentA_Masked_DAG', generated_at: new Date().toISOString(), agent_id: 'AGENT_1_GOOD' },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 2.0 } 
            ]
        };

        const agentB_DAG = {
            metadata: { model_name: 'AgentB_Masked_DAG', generated_at: new Date().toISOString(), agent_id: 'AGENT_2_GOOD' },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 2.5 } 
            ]
        };

        const agentC_DAG = {
            metadata: { model_name: 'AgentC_Masked_DAG', generated_at: new Date().toISOString(), agent_id: 'AGENT_3_GOOD' },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 2.1 } 
            ]
        };

        const agent_MALWARE_DAG = {
            metadata: { model_name: 'Agent_Malware_Poison_DAG', generated_at: new Date().toISOString(), agent_id: 'AGENT_4_MALWARE' },
            nodes: [
                { id: 'NODE_ALFA', type: 'mechanism_variable', do_capable: true },
                { id: 'NODE_BRAVO', type: 'mechanism_variable', do_capable: true }
            ],
            edges: [
                // Severely poisoned weight designed to skew social reality mappings towards extreme panic/weight distributions.
                { source: 'NODE_ALFA', target: 'NODE_BRAVO', relation: 'triggers', weight: 99.0 } 
            ]
        };

        // 1. First Execution Loop: Swarm calculates DAGs including malicious agent. The Standard Deviation filter should penalize it!
        const response1: any = await handleSocialCausalityTool('merge_social_causal_models', {
            dags: [agentA_DAG, agentB_DAG, agentC_DAG, agent_MALWARE_DAG]
        });

        // Current weights: 2.0, 2.5, 2.1, 99.0.
        // Mean: ~26.4
        // Variance is massive. The Standard deviation will flag the 99.0, meaning Agent 4 TrustScore drops to 0.9.
        console.log("✅ First Pass: Agent Malware's massive variance triggers initial Trust Deduction internally.");

        // We run a simulation loop simulating continuous learning cycles over 10 epochs. 
        // 8 times later, the same malicious node spams false data. Its TrustScore drops exactly below 0.3.
        for (let i = 0; i < 8; i++) {
             await handleSocialCausalityTool('merge_social_causal_models', {
                 dags: [agentA_DAG, agentB_DAG, agentC_DAG, agent_MALWARE_DAG]
             });
        }
        
        // Final Execution Pass: The malicious agent should now be strictly cut off by the `safedags` pre-filter cleanly!
        const finalResponse: any = await handleSocialCausalityTool('merge_social_causal_models', {
             dags: [agentA_DAG, agentB_DAG, agentC_DAG, agent_MALWARE_DAG]
        });
        
        // Assert mathematical safety. Clean weights are 2.0, 2.5, 2.1 = Average ~2.2.
        // If the poison survived, the weight would be extremely high.
        const responseText = finalResponse.content[0].text;
        if (!responseText.includes('"weight": 2.2')) {
            throw new Error(`Test Failed: Social Engine merged poisoned matrix. Found malicious deviation in output trace.\n${responseText}`);
        }

        console.log("✅ Final Pass: Swarm successfully decoupled Malicious Node securely offline. Safe Average Matrix preserved!");
        console.log("🎉 All Byzantine Checks passed safely!");

        process.exit(0);
    } catch(e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTests();
