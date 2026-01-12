# 🏪 VR Shop

A complete virtual store demonstrating e-commerce features, inventory management, and transaction processing in VR.

## 🎯 What You'll Learn

- **Shop System** - Creating and managing virtual stores
- **Inventory Management** - Stock tracking and updates
- **Transaction Processing** - Purchase flow and validation
- **Cart System** - Adding/removing items, checkout
- **Revenue Tracking** - Recording sales and analytics
- **3D Product Display** - Showcasing items in VR space

## 🚀 Quick Start

1. **Open the file**:
   ```bash
   # Navigate to this example
   cd examples/03-vr-shop

   # Open in browser (or use a local server)
   python -m http.server 8000
   # OR
   npx serve
   ```

2. **Visit**: http://localhost:8000

3. **Shop around**:
   - Browse the 5 VR tech products
   - Add items to your cart
   - Adjust quantities
   - Click "💳 Checkout" to complete purchase
   - Watch inventory and revenue update

## 🥽 VR Mode

Click the **"ENTER VR"** button to explore the virtual store in immersive VR! Walk around, view products from all angles, and imagine shopping in the metaverse.

## 📖 Code Walkthrough

### Shop Class

```javascript
class Shop {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.ownerId = config.ownerId;
    this.inventory = new Map();
    this.transactions = [];
    this.revenue = 0;
  }

  addItem(item) {
    this.inventory.set(item.id, {
      ...item,
      quantity: item.quantity || 0,
    });
  }

  purchase(buyerId, itemId, quantity = 1) {
    const item = this.inventory.get(itemId);

    // Validate
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (item.quantity < quantity) {
      return { success: false, message: 'Insufficient stock' };
    }

    // Process purchase
    const totalPrice = item.price * quantity;
    item.quantity -= quantity;

    // Record transaction
    const transaction = {
      id: `txn-${Date.now()}`,
      buyerId,
      itemId,
      quantity,
      totalPrice,
      timestamp: Date.now(),
    };

    this.transactions.push(transaction);
    this.revenue += totalPrice;

    return { success: true, transaction };
  }
}
```

### Adding Products

```javascript
shop.addItem({
  id: 'vr-headset',
  name: 'VR Headset Pro',
  price: 399.99,
  quantity: 5,
  description: 'Premium VR experience',
  color: 0x2196F3, // Blue
});
```

### Cart System

```javascript
const cart = new Map();

function addToCart(itemId) {
  const item = shop.inventory.get(itemId);
  const currentQty = cart.get(itemId) || 0;

  if (currentQty < item.quantity) {
    cart.set(itemId, currentQty + 1);
  }
}
```

### Checkout Flow

```javascript
function checkout() {
  cart.forEach((quantity, itemId) => {
    const result = shop.purchase('customer-456', itemId, quantity);

    if (result.success) {
      console.log('✅ Purchase successful:', result.transaction);
    } else {
      console.error('❌ Purchase failed:', result.message);
    }
  });

  cart.clear();
}
```

## 🎨 Customization Ideas

### Add Product Categories

```javascript
class Shop {
  constructor(config) {
    // ... existing code
    this.categories = new Map(); // Add categories
  }

  addCategory(id, name) {
    this.categories.set(id, { id, name, items: [] });
  }

  addItemToCategory(itemId, categoryId) {
    const category = this.categories.get(categoryId);
    if (category) {
      category.items.push(itemId);
    }
  }

  getItemsByCategory(categoryId) {
    const category = this.categories.get(categoryId);
    return category?.items.map(id => this.inventory.get(id)) || [];
  }
}

// Usage
shop.addCategory('headsets', 'VR Headsets');
shop.addCategory('accessories', 'Accessories');
shop.addItemToCategory('vr-headset', 'headsets');
```

### Add Discounts/Sales

```javascript
class Shop {
  addItem(item) {
    this.inventory.set(item.id, {
      ...item,
      quantity: item.quantity || 0,
      discount: item.discount || 0, // Percentage (0-100)
    });
  }

  getEffectivePrice(itemId) {
    const item = this.inventory.get(itemId);
    if (!item) return 0;

    const discount = item.discount / 100;
    return item.price * (1 - discount);
  }
}

// Usage
shop.addItem({
  id: 'controllers',
  name: 'VR Controllers',
  price: 99.99,
  quantity: 10,
  discount: 20, // 20% off!
});
```

### Add Reviews/Ratings

```javascript
class Shop {
  addItem(item) {
    this.inventory.set(item.id, {
      ...item,
      reviews: [],
      averageRating: 0,
    });
  }

  addReview(itemId, review) {
    const item = this.inventory.get(itemId);
    if (!item) return;

    item.reviews.push({
      userId: review.userId,
      rating: review.rating, // 1-5
      comment: review.comment,
      timestamp: Date.now(),
    });

    // Update average rating
    const total = item.reviews.reduce((sum, r) => sum + r.rating, 0);
    item.averageRating = total / item.reviews.length;
  }
}
```

### Add Wishlist

```javascript
const wishlist = new Set();

function addToWishlist(itemId) {
  wishlist.add(itemId);
  showMessage('Added to wishlist ❤️', 'success');
}

function moveWishlistToCart() {
  wishlist.forEach(itemId => {
    addToCart(itemId);
  });
  wishlist.clear();
}
```

## 🛠️ Production Features to Add

For a real marketplace, consider:

### 1. User Authentication
```javascript
class Shop {
  async purchase(buyerId, itemId, quantity) {
    // Verify user is authenticated
    const user = await authenticateUser(buyerId);
    if (!user) {
      return { success: false, message: 'Please log in' };
    }

    // Check user balance
    if (user.balance < totalPrice) {
      return { success: false, message: 'Insufficient funds' };
    }

    // Process purchase...
  }
}
```

### 2. Payment Integration
```javascript
class Shop {
  async processPayment(transaction) {
    // Integrate with payment provider
    const payment = await stripe.charges.create({
      amount: transaction.totalPrice * 100, // cents
      currency: 'usd',
      customer: transaction.buyerId,
    });

    return payment;
  }
}
```

### 3. Multi-Shop Marketplace
```javascript
class MarketplaceManager {
  constructor() {
    this.shops = new Map();
    this.platformFee = 0.05; // 5% platform fee
  }

  registerShop(shop) {
    this.shops.set(shop.id, shop);
  }

  async purchase(buyerId, shopId, itemId, quantity) {
    const shop = this.shops.get(shopId);
    const result = await shop.purchase(buyerId, itemId, quantity);

    if (result.success) {
      // Calculate platform fee
      const fee = result.transaction.totalPrice * this.platformFee;
      const sellerAmount = result.transaction.totalPrice - fee;

      // Distribute funds
      await this.transferToSeller(shop.ownerId, sellerAmount);
      await this.transferToPlatform(fee);
    }

    return result;
  }
}
```

### 4. Order History
```javascript
class Shop {
  getUserOrders(userId) {
    return this.transactions.filter(t => t.buyerId === userId);
  }

  getOrderStatus(transactionId) {
    const transaction = this.transactions.find(t => t.id === transactionId);
    return transaction?.status || 'unknown';
  }

  updateOrderStatus(transactionId, status) {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (transaction) {
      transaction.status = status; // 'pending', 'shipped', 'delivered'
      transaction.statusUpdatedAt = Date.now();
    }
  }
}
```

## 📊 Commerce Concepts Explained

| Concept | What It Does | Example |
|---------|-------------|---------|
| **Inventory** | Tracks available products and quantities | 5 VR headsets in stock |
| **Transaction** | Records a purchase event | User bought 2 controllers |
| **Revenue** | Total money earned from sales | $599.98 total sales |
| **Cart** | Temporary storage before checkout | 3 items ready to buy |
| **Stock Management** | Prevent overselling | Only sell what's available |

## 🎯 Challenges

Try implementing these features:

1. **Search and Filters**
   - Search by product name
   - Filter by price range
   - Sort by rating or price

2. **Product Variations**
   - Color options
   - Size options
   - Custom configurations

3. **Bulk Purchase Discounts**
   - 10% off when buying 3+
   - Bundle deals
   - Coupon codes

4. **Shop Analytics**
   - Best-selling products
   - Revenue over time
   - Customer retention

## 📚 Learn More

- **@hololand/commerce**: See the full commerce package for production features
- **Next Example**: Check out [04-react-starter](../04-react-starter/) for React integration
- **Previous Example**: See [02-physics-playground](../02-physics-playground/) for physics

## 🐛 Troubleshooting

**Cart not updating?**
- Check that `renderCart()` is called after cart changes
- Ensure item IDs match between inventory and cart

**Purchase failing?**
- Verify stock quantity before purchase
- Check that item exists in inventory
- Ensure buyer ID is valid

**Revenue not tracking?**
- Confirm transaction is added to `shop.transactions`
- Check that `shop.revenue` is incremented
- Verify price calculations

**Products not displaying?**
- Check that products are added to shop inventory
- Ensure product positions don't overlap
- Verify materials and geometries are valid

---

**Build your virtual marketplace!** 🏪✨

## 💡 Real-World Applications

This shop system can be used for:
- **Virtual storefronts** - Sell physical or digital goods
- **NFT marketplaces** - Display and sell digital assets
- **Event ticketing** - Sell concert/event access in VR
- **Virtual real estate** - Buy/sell land parcels
- **Creator platforms** - Artists selling their work
