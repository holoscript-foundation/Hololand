/**
 * Shop - VR shop/store entity in the Hololand metaverse
 */

import { logger } from './logger';
import type { ShopConfig, ShopItem, Transaction } from './types';

export class Shop {
  public readonly id: string;
  public readonly name: string;
  public readonly ownerId: string;
  private inventory: Map<string, ShopItem>;
  private transactions: Transaction[];
  private isOpen: boolean;
  private metadata: Record<string, any>;

  constructor(config: ShopConfig) {
    this.id = config.id ?? this.generateId();
    this.name = config.name;
    this.ownerId = config.ownerId;
    this.inventory = new Map();
    this.transactions = [];
    this.isOpen = config.isOpen ?? true;
    this.metadata = config.metadata ?? {};

    logger.info('[Shop] Created', {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
    });
  }

  private generateId(): string {
    return `shop_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add item to inventory
   */
  addItem(item: ShopItem): void {
    this.inventory.set(item.id, item);
    logger.debug('[Shop] Item added', { shopId: this.id, itemId: item.id });
  }

  /**
   * Remove item from inventory
   */
  removeItem(itemId: string): boolean {
    const removed = this.inventory.delete(itemId);
    if (removed) {
      logger.debug('[Shop] Item removed', { shopId: this.id, itemId });
    }
    return removed;
  }

  /**
   * Get item by ID
   */
  getItem(itemId: string): ShopItem | undefined {
    return this.inventory.get(itemId);
  }

  /**
   * Get all items
   */
  getAllItems(): ShopItem[] {
    return Array.from(this.inventory.values());
  }

  /**
   * Update item stock
   */
  updateStock(itemId: string, quantity: number): boolean {
    const item = this.inventory.get(itemId);
    if (!item) return false;

    item.stock = quantity;
    logger.debug('[Shop] Stock updated', { shopId: this.id, itemId, stock: quantity });
    return true;
  }

  /**
   * Purchase item
   */
  purchase(buyerId: string, itemId: string, quantity: number = 1): Transaction | null {
    if (!this.isOpen) {
      logger.warn('[Shop] Purchase failed - shop closed', { shopId: this.id });
      return null;
    }

    const item = this.inventory.get(itemId);
    if (!item) {
      logger.warn('[Shop] Purchase failed - item not found', { shopId: this.id, itemId });
      return null;
    }

    if (item.stock < quantity) {
      logger.warn('[Shop] Purchase failed - insufficient stock', {
        shopId: this.id,
        itemId,
        requested: quantity,
        available: item.stock,
      });
      return null;
    }

    // Process transaction
    item.stock -= quantity;
    const totalPrice = item.price * quantity;

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      shopId: this.id,
      buyerId,
      itemId,
      quantity,
      totalPrice,
      timestamp: Date.now(),
    };

    this.transactions.push(transaction);

    logger.info('[Shop] Purchase completed', {
      shopId: this.id,
      transactionId: transaction.id,
      item: item.name,
      quantity,
      totalPrice,
    });

    return transaction;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get transaction history
   */
  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  /**
   * Get total revenue
   */
  getTotalRevenue(): number {
    return this.transactions.reduce((sum, txn) => sum + txn.totalPrice, 0);
  }

  /**
   * Open/close shop
   */
  setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    logger.info('[Shop] Status changed', { shopId: this.id, isOpen });
  }

  /**
   * Check if shop is open
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get shop statistics
   */
  getStats() {
    return {
      id: this.id,
      name: this.name,
      itemCount: this.inventory.size,
      transactionCount: this.transactions.length,
      totalRevenue: this.getTotalRevenue(),
      isOpen: this.isOpen,
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      inventory: Array.from(this.inventory.values()),
      transactionCount: this.transactions.length,
      totalRevenue: this.getTotalRevenue(),
      isOpen: this.isOpen,
      metadata: this.metadata,
    };
  }
}
