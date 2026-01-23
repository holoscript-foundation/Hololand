/**
 * HoloScript Marketplace - Tier 4
 * Share, import, and discover templates and worlds
 */

export interface MarketplaceItem {
  id: string;
  type: 'template' | 'world' | 'script' | 'asset';
  name: string;
  description: string;
  author: string;
  authorId: string;
  version: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  thumbnail?: string;
  content: string; // Serialized HoloScript or world data
  createdAt: number;
  updatedAt: number;
  license: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'Proprietary';
  isPublic: boolean;
  price: number; // 0 for free
  dependencies: string[];
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  icon: string;
}

/**
 * Marketplace Client
 */
export class HoloScriptMarketplace {
  private apiUrl: string;
  private authToken: string = '';
  private cache: Map<string, MarketplaceItem> = new Map();
  private cachedAt: number = 0;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(apiUrl: string = 'https://marketplace.holoscript.dev/api') {
    this.apiUrl = apiUrl;
  }

  /**
   * Authentication
   */
  async login(username: string, password: string): Promise<{ token: string; userId: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      this.authToken = data.token;
      localStorage.setItem('marketplace_token', data.token);
      return { token: data.token, userId: data.userId };
    } catch (error) {
      console.error('Marketplace login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.authToken = '';
    localStorage.removeItem('marketplace_token');
  }

  /**
   * Search and Discovery
   */
  async search(
    query: string,
    type?: string,
    tags?: string[],
    sortBy: 'rating' | 'downloads' | 'recent' = 'rating'
  ): Promise<MarketplaceItem[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        sort: sortBy,
      });

      if (type) params.append('type', type);
      if (tags) tags.forEach((tag) => params.append('tags', tag));

      const response = await fetch(`${this.apiUrl}/items/search?${params}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Search failed');

      const items = await response.json();
      items.forEach((item: MarketplaceItem) => this.cache.set(item.id, item));
      return items;
    } catch (error) {
      console.error('Marketplace search failed:', error);
      return [];
    }
  }

  async getCategories(): Promise<MarketplaceCategory[]> {
    try {
      const response = await fetch(`${this.apiUrl}/categories`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch categories');

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch marketplace categories:', error);
      return [];
    }
  }

  async getTrending(): Promise<MarketplaceItem[]> {
    try {
      const response = await fetch(`${this.apiUrl}/items/trending`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch trending');

      const items = await response.json();
      items.forEach((item: MarketplaceItem) => this.cache.set(item.id, item));
      return items;
    } catch (error) {
      console.error('Failed to fetch trending items:', error);
      return [];
    }
  }

  /**
   * Item Management
   */
  async getItem(id: string): Promise<MarketplaceItem | null> {
    // Check cache first
    if (this.cache.has(id) && Date.now() - this.cachedAt < this.cacheExpiry) {
      return this.cache.get(id) || null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/items/${id}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return null;

      const item = await response.json();
      this.cache.set(id, item);
      this.cachedAt = Date.now();
      return item;
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
  }

  async publishItem(item: Omit<MarketplaceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceItem> {
    try {
      const response = await fetch(`${this.apiUrl}/items`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(item),
      });

      if (!response.ok) throw new Error('Failed to publish item');

      const published = await response.json();
      this.cache.set(published.id, published);
      return published;
    } catch (error) {
      console.error('Failed to publish item:', error);
      throw error;
    }
  }

  async updateItem(id: string, updates: Partial<MarketplaceItem>): Promise<MarketplaceItem> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update item');

      const updated = await response.json();
      this.cache.set(id, updated);
      return updated;
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete item');

      this.cache.delete(id);
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  }

  /**
   * Download & Import
   */
  async downloadItem(id: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${id}/download`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Download failed');

      // Track download
      await this.recordDownload(id);

      return await response.text();
    } catch (error) {
      console.error('Failed to download item:', error);
      throw error;
    }
  }

  private async recordDownload(itemId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/items/${itemId}/download`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Failed to record download:', error);
    }
  }

  /**
   * Ratings and Reviews
   */
  async getReviews(itemId: string): Promise<MarketplaceReview[]> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${itemId}/reviews`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  }

  async submitReview(
    itemId: string,
    rating: number,
    comment: string
  ): Promise<MarketplaceReview> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${itemId}/reviews`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ rating, comment }),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      return await response.json();
    } catch (error) {
      console.error('Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Collections and Lists
   */
  async getMyItems(): Promise<MarketplaceItem[]> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me/items`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch my items:', error);
      return [];
    }
  }

  async getFavorites(): Promise<MarketplaceItem[]> {
    try {
      const response = await fetch(`${this.apiUrl}/users/me/favorites`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      return [];
    }
  }

  async addToFavorites(itemId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/users/me/favorites/${itemId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    }
  }

  async removeFromFavorites(itemId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/users/me/favorites/${itemId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
    }
  }

  /**
   * Helper Methods
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  isAuthenticated(): boolean {
    return Boolean(this.authToken || localStorage.getItem('marketplace_token'));
  }

  async validateDependencies(item: MarketplaceItem): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    for (const dep of item.dependencies) {
      const depItem = await this.getItem(dep);
      if (!depItem) {
        missing.push(dep);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * Marketplace Cache Manager
 */
export class MarketplaceCache {
  private storage: Storage;
  private prefix: string = 'marketplace_';

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
  }

  set(key: string, value: any, expirySeconds: number = 3600): void {
    try {
      const item = {
        value,
        expiry: Date.now() + expirySeconds * 1000,
      };
      this.storage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set failed:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        this.storage.removeItem(this.prefix + key);
        return null;
      }

      return parsed.value as T;
    } catch (error) {
      console.error('Cache get failed:', error);
      return null;
    }
  }

  clear(): void {
    const keys = Object.keys(this.storage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    });
  }
}
