/**
 * MarketplaceManager - Manages all shops in the Hololand metaverse
 */

import { logger } from './logger';
import { Shop } from './Shop';
import type { ShopConfig, MarketplaceStats } from './types';

export class MarketplaceManager {
  private shops: Map<string, Shop>;

  constructor() {
    this.shops = new Map();
    logger.info('[MarketplaceManager] Initialized');
  }

  /**
   * Create a new shop
   */
  createShop(config: ShopConfig): Shop {
    const shop = new Shop(config);

    if (this.shops.has(shop.id)) {
      throw new Error(`[MarketplaceManager] Shop with id ${shop.id} already exists`);
    }

    this.shops.set(shop.id, shop);

    logger.info('[MarketplaceManager] Shop created', {
      shopId: shop.id,
      name: shop.name,
    });

    return shop;
  }

  /**
   * Remove a shop
   */
  removeShop(shopId: string): boolean {
    const removed = this.shops.delete(shopId);
    if (removed) {
      logger.info('[MarketplaceManager] Shop removed', { shopId });
    }
    return removed;
  }

  /**
   * Get shop by ID
   */
  getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  /**
   * Get all shops
   */
  getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  /**
   * Get shops by owner
   */
  getShopsByOwner(ownerId: string): Shop[] {
    return Array.from(this.shops.values()).filter((shop) => shop.ownerId === ownerId);
  }

  /**
   * Search shops by name
   */
  searchShops(query: string): Shop[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.shops.values()).filter((shop) =>
      shop.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get marketplace statistics
   */
  getStats(): MarketplaceStats {
    let totalItems = 0;
    let totalTransactions = 0;
    let totalRevenue = 0;

    for (const shop of this.shops.values()) {
      const shopStats = shop.getStats();
      totalItems += shopStats.itemCount;
      totalTransactions += shopStats.transactionCount;
      totalRevenue += shopStats.totalRevenue;
    }

    return {
      totalShops: this.shops.size,
      totalItems,
      totalTransactions,
      totalRevenue,
    };
  }

  /**
   * Get leaderboard (top shops by revenue)
   */
  getLeaderboard(limit: number = 10): Array<{ shop: Shop; revenue: number }> {
    const shopsWithRevenue = Array.from(this.shops.values()).map((shop) => ({
      shop,
      revenue: shop.getTotalRevenue(),
    }));

    return shopsWithRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }
}
