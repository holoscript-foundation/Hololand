/**
 * @hololand/commerce Advanced Commerce System
 *
 * Inventory management, dynamic pricing, NPC shopkeepers, and transaction logging
 */

import { logger } from './logger';

export type CurrencyType = 'usd' | 'eur' | 'hololand-credits' | 'crypto';
export type InventoryItemStatus = 'available' | 'reserved' | 'sold' | 'unavailable';
export type PricingStrategy = 'fixed' | 'dynamic' | 'auction' | 'rental';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Inventory item
 */
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  skuId?: string;
  category: string;
  quantity: number;
  maxQuantity?: number;
  status: InventoryItemStatus;
  basePrice: number;
  currency: CurrencyType;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Dynamic pricing rule
 */
export interface PricingRule {
  id: string;
  itemId: string;
  strategy: PricingStrategy;
  basePrice: number;
  
  // Dynamic pricing
  minPrice?: number;
  maxPrice?: number;
  demandMultiplier?: number; // Adjust price based on demand
  timebasedMultiplier?: {
    hour: number; // 0-23
    multiplier: number; // e.g., 1.5 for peak hours
  }[];
  
  // Auction
  auctionDuration?: number; // ms
  startingBid?: number;
  
  // Rental
  rentalPeriod?: number; // ms
  rentalPrice?: number;
  
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  price: number;
  currency: CurrencyType;
  status: TransactionStatus;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * NPC Shopkeeper configuration
 */
export interface NPCShopkeeperConfig {
  npcId: string;
  shopName: string;
  inventoryIds: string[];
  
  // Personality
  personality?: {
    chattiness: number; // 0-1
    haggleWillingness: number; // 0-1
    fairness: number; // 0-1
    uniqueness: string; // Distinctive phrase/behavior
  };
  
  // Pricing
  markupPercentage?: number; // How much over base price
  discountThreshold?: number; // Items sold threshold for discount
  
  // Behavior
  restockInterval?: number; // ms between restocks
  peakHours?: { start: number; end: number }[];
  
  // Integration
  agentId?: string; // Link to uaa2-service NPC agent
}

/**
 * Shop transaction
 */
export interface ShopTransaction extends Transaction {
  shopId: string;
  npcId?: string;
  customerName?: string;
  negotiatedPrice?: number;
  appliedDiscount?: number;
}

/**
 * InventoryManager - Manage shop inventory
 */
export class InventoryManager {
  private items: Map<string, InventoryItem> = new Map();
  private reservations: Map<string, Set<string>> = new Map();

  addItem(item: InventoryItem): void {
    this.items.set(item.id, item);
    logger.info('Inventory item added', { itemId: item.id, quantity: item.quantity });
  }

  getItem(itemId: string): InventoryItem | undefined {
    return this.items.get(itemId);
  }

  updateQuantity(itemId: string, delta: number): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 0) return false;

    item.quantity = newQuantity;
    item.updatedAt = Date.now();
    logger.info('Inventory updated', { itemId, newQuantity });
    return true;
  }

  reserve(itemId: string, quantity: number, reservationId: string): boolean {
    const item = this.items.get(itemId);
    if (!item || item.quantity < quantity) return false;

    item.quantity -= quantity;
    item.status = 'reserved';

    let reservedItems = this.reservations.get(itemId);
    if (!reservedItems) {
      reservedItems = new Set();
      this.reservations.set(itemId, reservedItems);
    }
    reservedItems.add(reservationId);

    logger.info('Item reserved', { itemId, quantity, reservationId });
    return true;
  }

  release(itemId: string, quantity: number, reservationId: string): void {
    const item = this.items.get(itemId);
    if (!item) return;

    item.quantity += quantity;
    item.status = 'available';
    
    const reservedItems = this.reservations.get(itemId);
    if (reservedItems) {
      reservedItems.delete(reservationId);
    }

    logger.info('Reservation released', { itemId, quantity, reservationId });
  }

  getInventoryList(): InventoryItem[] {
    return Array.from(this.items.values()).filter((item) => item.status === 'available');
  }
}

/**
 * DynamicPricingEngine - Calculate prices based on demand and rules
 */
export class DynamicPricingEngine {
  private pricingRules: Map<string, PricingRule> = new Map();
  private demandHistory: Map<string, number[]> = new Map();

  addRule(rule: PricingRule): void {
    this.pricingRules.set(rule.id, rule);
    logger.info('Pricing rule added', { ruleId: rule.id, itemId: rule.itemId });
  }

  calculatePrice(itemId: string, baseDemand: number = 1): number {
    const rules = Array.from(this.pricingRules.values()).filter(
      (r) => r.itemId === itemId && r.enabled
    );

    if (rules.length === 0) return 0;

    const rule = rules[0]; // Use first matching rule
    let price = rule.basePrice;

    if (rule.strategy === 'dynamic') {
      // Apply demand multiplier
      if (rule.demandMultiplier) {
        price *= 1 + (baseDemand - 1) * rule.demandMultiplier;
      }

      // Apply time-based multiplier
      if (rule.timebasedMultiplier) {
        const hour = new Date().getHours();
        const timeRule = rule.timebasedMultiplier.find((t) => t.hour === hour);
        if (timeRule) {
          price *= timeRule.multiplier;
        }
      }

      // Clamp to min/max
      if (rule.minPrice) price = Math.max(price, rule.minPrice);
      if (rule.maxPrice) price = Math.min(price, rule.maxPrice);
    }

    return Math.round(price * 100) / 100;
  }

  recordDemand(itemId: string): void {
    let history = this.demandHistory.get(itemId);
    if (!history) {
      history = [];
      this.demandHistory.set(itemId, history);
    }

    history.push(Date.now());

    // Keep last hour of data
    const oneHourAgo = Date.now() - 3600000;
    history = history.filter((t) => t > oneHourAgo);
    this.demandHistory.set(itemId, history);
  }

  getDemandLevel(itemId: string): number {
    const history = this.demandHistory.get(itemId) || [];
    return history.length; // Simple: count of transactions in last hour
  }
}

/**
 * TransactionLogger - Record all shop transactions
 */
export class TransactionLogger {
  private transactions: ShopTransaction[] = [];
  private exporters: Set<(txns: ShopTransaction[]) => Promise<void>> = new Set();

  recordTransaction(transaction: ShopTransaction): void {
    this.transactions.push(transaction);
    logger.info('Transaction recorded', {
      transactionId: transaction.id,
      itemId: transaction.itemId,
      price: transaction.price,
    });

    // Trigger export if needed
    if (this.transactions.length >= 100) {
      this.exportTransactions();
    }
  }

  getTransactions(filters?: {
    itemId?: string;
    buyerId?: string;
    sellerId?: string;
    startTime?: number;
    endTime?: number;
  }): ShopTransaction[] {
    let filtered = [...this.transactions];

    if (filters?.itemId) {
      filtered = filtered.filter((t) => t.itemId === filters.itemId);
    }
    if (filters?.buyerId) {
      filtered = filtered.filter((t) => t.buyerId === filters.buyerId);
    }
    if (filters?.sellerId) {
      filtered = filtered.filter((t) => t.sellerId === filters.sellerId);
    }
    if (filters?.startTime) {
      filtered = filtered.filter((t) => t.timestamp >= filters.startTime!);
    }
    if (filters?.endTime) {
      filtered = filtered.filter((t) => t.timestamp <= filters.endTime!);
    }

    return filtered;
  }

  addExporter(exporter: (txns: ShopTransaction[]) => Promise<void>): void {
    this.exporters.add(exporter);
  }

  private async exportTransactions(): Promise<void> {
    if (this.transactions.length === 0 || this.exporters.size === 0) return;

    const txnsToExport = [...this.transactions];
    this.transactions = [];

    for (const exporter of this.exporters) {
      try {
        await exporter(txnsToExport);
      } catch (error) {
        logger.error('Transaction export failed', { error });
      }
    }
  }

  generateReport(period?: { start: number; end: number }): {
    totalTransactions: number;
    totalRevenue: number;
    averagePrice: number;
    topItems: { itemId: string; count: number; revenue: number }[];
  } {
    let filtered = this.getTransactions({
      startTime: period?.start,
      endTime: period?.end,
    });

    // Filter for completed transactions only
    filtered = filtered.filter((t) => t.status === 'completed');

    const totalRevenue = filtered.reduce((sum, t) => sum + t.price * t.quantity, 0);
    const averagePrice = filtered.length > 0 ? totalRevenue / filtered.length : 0;

    // Group by item
    const itemStats = new Map<string, { count: number; revenue: number }>();
    for (const txn of filtered) {
      const stat = itemStats.get(txn.itemId) || { count: 0, revenue: 0 };
      stat.count += txn.quantity;
      stat.revenue += txn.price * txn.quantity;
      itemStats.set(txn.itemId, stat);
    }

    const topItems = Array.from(itemStats.entries())
      .map(([itemId, stat]) => ({ itemId, ...stat }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalTransactions: filtered.length,
      totalRevenue,
      averagePrice,
      topItems,
    };
  }
}

/**
 * NPCShopkeeper - AI-driven shop NPC
 */
export class NPCShopkeeper {
  private config: NPCShopkeeperConfig;
  private inventory: InventoryManager;
  private pricingEngine: DynamicPricingEngine;
  private dialogue: string[] = [];

  constructor(
    config: NPCShopkeeperConfig,
    inventory: InventoryManager,
    pricingEngine: DynamicPricingEngine
  ) {
    this.config = {
      personality: {
        chattiness: 0.5,
        haggleWillingness: 0.3,
        fairness: 0.7,
        uniqueness: 'Welcome traveler!',
      },
      markupPercentage: 20,
      ...config,
    };

    this.inventory = inventory;
    this.pricingEngine = pricingEngine;
  }

  /**
   * Generate greeting dialogue
   */
  generateGreeting(): string {
    const greetings = [
      `Greetings! Welcome to ${this.config.shopName}!`,
      `Ah, a customer! Browse our fine wares.`,
      `Welcome, friend. What can I interest you in?`,
      this.config.personality?.uniqueness || 'Welcome!',
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Quote price with personality
   */
  quotePriceForItem(itemId: string, basePrice: number): { price: number; response: string } {
    const demand = this.pricingEngine.getDemandLevel(itemId);
    const calculatedPrice = this.pricingEngine.calculatePrice(itemId, demand);

    let response = '';
    const haggleWilling = this.config.personality?.haggleWillingness || 0.3;

    if (Math.random() < haggleWilling) {
      response = `I could let this go for ${calculatedPrice} credits, but I'm open to offers...`;
    } else {
      response = `That'll be ${calculatedPrice} credits.`;
    }

    return { price: calculatedPrice, response };
  }

  /**
   * Process purchase with NPC reactions
   */
  processPurchase(itemId: string, quantity: number, buyerName: string): {
    success: boolean;
    response: string;
    finalPrice?: number;
  } {
    const item = this.inventory.getItem(itemId);
    if (!item || item.quantity < quantity) {
      return {
        success: false,
        response: `Sorry, I don't have ${quantity} of that in stock.`,
      };
    }

    const basePrice = item.basePrice * (1 + (this.config.markupPercentage || 0) / 100);
    const { price } = this.quotePriceForItem(itemId, basePrice);
    const totalPrice = price * quantity;

    // Update inventory
    this.inventory.updateQuantity(itemId, -quantity);

    // Generate response
    const chattiness = this.config.personality?.chattiness || 0.5;
    let response = `Excellent choice! That'll be ${totalPrice} credits.`;

    if (chattiness > 0.7) {
      response += ` Thanks for your business, ${buyerName}!`;
    }

    return {
      success: true,
      response,
      finalPrice: totalPrice,
    };
  }

  /**
   * Get shop status for display
   */
  getStatus(): {
    shopName: string;
    npcId: string;
    inventory: number;
    totalValue: number;
    reputation: number;
  } {
    let totalValue = 0;
    let totalItems = 0;

    for (const itemId of this.config.inventoryIds) {
      const item = this.inventory.getItem(itemId);
      if (item) {
        totalValue += item.basePrice * item.quantity;
        totalItems += item.quantity;
      }
    }

    return {
      shopName: this.config.shopName,
      npcId: this.config.npcId,
      inventory: totalItems,
      totalValue,
      reputation: 0.5, // Would be calculated from transaction history
    };
  }
}

/**
 * Advanced Commerce System main controller
 */
export class AdvancedCommerceSystem {
  private inventory: InventoryManager;
  private pricingEngine: DynamicPricingEngine;
  private transactionLogger: TransactionLogger;
  private shopkeepers: Map<string, NPCShopkeeper> = new Map();

  constructor() {
    this.inventory = new InventoryManager();
    this.pricingEngine = new DynamicPricingEngine();
    this.transactionLogger = new TransactionLogger();
  }

  getInventoryManager(): InventoryManager {
    return this.inventory;
  }

  getPricingEngine(): DynamicPricingEngine {
    return this.pricingEngine;
  }

  getTransactionLogger(): TransactionLogger {
    return this.transactionLogger;
  }

  createShopkeeper(config: NPCShopkeeperConfig): NPCShopkeeper {
    const shopkeeper = new NPCShopkeeper(config, this.inventory, this.pricingEngine);
    this.shopkeepers.set(config.npcId, shopkeeper);
    logger.info('Shopkeeper created', { npcId: config.npcId, shopName: config.shopName });
    return shopkeeper;
  }

  getShopkeeper(npcId: string): NPCShopkeeper | undefined {
    return this.shopkeepers.get(npcId);
  }

  getAllShopkeepers(): NPCShopkeeper[] {
    return Array.from(this.shopkeepers.values());
  }
}
