/**
 * @hololand/commerce
 *
 * Commerce & Economy System for the Hololand metaverse
 * Shops, inventory management, and transactions
 */

// Core classes
export { Shop } from './Shop';
export { MarketplaceManager } from './MarketplaceManager';

// Logger
export { setHololandCommerceLogger, resetLogger, type HololandCommerceLogger } from './logger';

// Types
export type { ShopConfig, ShopItem, Transaction, MarketplaceStats } from './types';

// Constants
export const HOLOLAND_COMMERCE_VERSION = '1.0.0-alpha.1';

// Utility functions
export function createMarketplace() {
  return new (require('./MarketplaceManager').MarketplaceManager)();
}

// Export everything as default
import { Shop } from './Shop';
import { MarketplaceManager } from './MarketplaceManager';

export default {
  Shop,
  MarketplaceManager,
  createMarketplace,
  HOLOLAND_COMMERCE_VERSION,
};
