# @hololand/commerce

Commerce & Economy System for the Hololand metaverse.

## Features

- **Virtual Shops**: Create and manage in-world stores
- **Inventory System**: Track items, quantities, and ownership
- **Marketplace**: Buy, sell, and trade virtual goods
- **Currency Integration**: Support for tokens and virtual currencies
- **Transaction History**: Complete audit trail

## Installation

```bash
pnpm add @hololand/commerce
```

## Usage

```typescript
import { Shop, Inventory, Marketplace } from '@hololand/commerce';

// Create a shop
const shop = new Shop({
  name: 'Avatar Accessories',
  ownerId: userId,
  position: { x: 10, y: 0, z: 5 },
});

// Add items to shop inventory
shop.addItem({
  id: 'hat-001',
  name: 'Wizard Hat',
  price: 100,
  quantity: 50,
  category: 'accessories',
});

// Process purchase
const result = await shop.purchase(buyerId, 'hat-001', 1);

// Transfer to buyer inventory
const inventory = new Inventory(buyerId);
await inventory.addItem(result.item);
```

## Marketplace

```typescript
import { Marketplace } from '@hololand/commerce';

const marketplace = new Marketplace();

// List item for sale
await marketplace.list({
  itemId: 'rare-sword',
  sellerId: userId,
  price: 5000,
  duration: '7d',
});

// Search listings
const listings = await marketplace.search({
  category: 'weapons',
  priceMax: 10000,
});

// Purchase from marketplace
await marketplace.buy(listingId, buyerId);
```

## API Reference

### Shop

In-world store management.

- `addItem(item)` - Add item to inventory
- `removeItem(id)` - Remove item
- `purchase(buyerId, itemId, qty)` - Process purchase
- `getInventory()` - Get shop inventory

### Inventory

Player inventory management.

- `addItem(item)` - Add item
- `removeItem(id)` - Remove item
- `getItems()` - List all items
- `transfer(itemId, toUserId)` - Transfer item

### Marketplace

Global marketplace.

- `list(listing)` - Create listing
- `search(query)` - Search listings
- `buy(listingId, buyerId)` - Purchase listing

## License

MIT © Hololand Team
