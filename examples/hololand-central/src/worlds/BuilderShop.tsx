import React from 'react';
import { HoloCompositionRenderer } from '@hololand/react-three';
import builderShopData from './BuilderShop.holo';

/**
 * ZONE 2: Builder Shop
 * 
 * Ported to HoloScript + R3F bridge.
 */
export const BuilderShop: React.FC = () => {
  return (
    <HoloCompositionRenderer 
      composition={builderShopData} 
      debug={false} 
      physics={true} 
    />
  );
};
