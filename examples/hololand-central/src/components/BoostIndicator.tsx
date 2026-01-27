
import React from 'react';
import { useInfinityBoost } from '../hooks/useInfinityBoost';

export const BoostIndicator: React.FC = () => {
    const { isActive, tier, activateBoost, deactivateBoost } = useInfinityBoost();

    const handleUpgrade = () => {
        // [Phase 14.5] Creator Economy Update
        // Instead of hard-gating, we offer deployment.
        const intent = confirm("Deploy your Asset to Infinity Marketplace?\n\n- Free Hosting\n- 70/30 Revenue Share\n- Instant Global Reach\n\nClick OK to generate Deployment Key (Simulated).");
        if (intent) {
            const simulatedKey = "inf_creator_" + Math.random().toString(36).substr(2, 9);
            activateBoost(simulatedKey);
            alert("Deployment Key Generated! You are now in Creator Mode. 🚀");
        }
    };

    if (isActive) {
        return (
            <div 
                className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/50 rounded-full cursor-pointer hover:bg-yellow-500/20 transition-all"
                onClick={() => { if(confirm("Disconnect Creator Mode?")) deactivateBoost(); }}
                title="Creator Mode Active (Revenue Share Enabled)"
            >
                <span className="text-yellow-400 text-xs font-bold animate-pulse">⚡</span>
                <span className="text-yellow-200 text-xs font-medium">Infinity Creator</span>
            </div>
        );
    }

    return (
        <div 
            className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-full cursor-pointer hover:bg-gray-700/50 transition-all group"
            onClick={handleUpgrade}
            title="Deploy to Marketplace"
        >
            <span className="text-gray-400 text-xs group-hover:text-blue-400 transition-colors">Local Mode</span>
            <span className="text-gray-500 text-[10px] group-hover:text-gray-300 transition-colors">(Deploy?)</span>
        </div>
    );
};
