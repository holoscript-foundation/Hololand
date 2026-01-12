/**
 * Type definitions for @hololand/commerce
 */

export interface ShopConfig {
  id?: string;
  name: string;
  ownerId: string;
  isOpen?: boolean;
  metadata?: Record<string, any>;
}

export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface Transaction {
  id: string;
  shopId: string;
  buyerId: string;
  itemId: string;
  quantity: number;
  totalPrice: number;
  timestamp: number;
}

export interface MarketplaceStats {
  totalShops: number;
  totalItems: number;
  totalTransactions: number;
  totalRevenue: number;
}
