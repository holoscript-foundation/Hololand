import React, { useState } from 'react';
import { Tag, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

export interface QuickMintButtonProps {
  targetObjectId: string;
  compiledTraits: any;
  onMint: (nftData: any) => Promise<void>;
}

export function QuickMintButton({ targetObjectId, compiledTraits, onMint }: QuickMintButtonProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nftUrl, setNftUrl] = useState('');

  const handleMint = async () => {
    setIsMinting(true);
    
    try {
      // 1. Snapshot the visual item + abstract traits
      const snapshotMetadata = {
        name: `In-World Creation #${targetObjectId.slice(0, 4)}`,
        description: `Created live inside Hololand Spatial Builder. Packaged with ${compiledTraits?.traits?.length || 0} active HoloScript traits.`,
        traits: compiledTraits?.traits || []
      };

      // 2. Pass to the HoloScript Spatial Asset Registry (smart contract equivalent)
      await onMint(snapshotMetadata);

      // Simulate network wait
      await new Promise(resolve => setTimeout(resolve, 2000));

      setNftUrl(`https://marketplace.holoscript.io/item/${targetObjectId}`);
      setIsSuccess(true);
    } catch (e) {
      console.error("Mint failed:", e);
    } finally {
      setIsMinting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle size={18} />
          <span>Minted Successfully!</span>
        </div>
        <a 
          href={nftUrl} 
          target="_blank" 
          rel="noreferrer"
          className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors"
        >
          View on Marketplace <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleMint}
      disabled={isMinting || !compiledTraits}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-2xl transition-all
        ${isMinting 
          ? 'bg-neutral-800 text-neutral-400 cursor-wait' 
          : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[#4f46e540_0_0_30px]'
        }
      `}
    >
      {isMinting ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          MINTING TO HOLOSCRIPT MARKET...
        </>
      ) : (
        <>
          <Tag size={20} />
          QUICK MINT CONTENT
        </>
      )}
    </button>
  );
}
