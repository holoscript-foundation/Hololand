# 🎨 HoloScript Trait Marketplace

A full-stack marketplace for buying and selling HoloScript traits with integrated payment processing, licensing, and NFT support.

## ✨ Features

### For Buyers
- 🔍 **Browse & Search** - Discover traits with advanced filtering and search
- ⭐ **Reviews & Ratings** - Make informed decisions with community feedback
- 💳 **Multiple Payment Options** - Pay with credit card (Stripe) or cryptocurrency
- 🎫 **License Management** - Automatic license key generation and management
- 📦 **Purchase History** - Track all your purchases and downloads
- ❤️ **Favorites** - Save traits for later

### For Sellers
- 🚀 **Create & Sell** - Upload and sell your custom traits
- 📊 **Dashboard Analytics** - Track sales, revenue, downloads, and ratings
- 💰 **Tiered Commissions** - Lower fees as you grow
  - FREE tier: 30% commission
  - PRO tier: 20% commission
  - PREMIUM tier: 15% commission
  - ENTERPRISE tier: 10% commission
- 🎯 **Featured Listings** - Get your traits promoted
- 📝 **Review Management** - Respond to customer feedback

### Technical Features
- ⚡ **Type-Safe API** - Built with tRPC for end-to-end type safety
- 🗄️ **Robust Database** - Prisma ORM with PostgreSQL
- 💳 **Payment Processing** - Stripe integration with webhook support
- 🔐 **Authentication** - Secure JWT-based auth
- 🎨 **Modern UI** - React + TypeScript with beautiful design
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🌐 **NFT Support** - Optional blockchain integration for trait ownership

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm
- Stripe account (for payment processing)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd packages/trait-marketplace
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Initialize the database:**
   ```bash
   pnpm db:push      # Push schema to database
   pnpm db:seed      # (Optional) Seed with sample data
   ```

4. **Start development servers:**
   ```bash
   pnpm dev          # Starts both API server (port 3000) and frontend (port 3001)
   ```

5. **Open your browser:**
   ```
   http://localhost:3001
   ```

## 📁 Project Structure

```
trait-marketplace/
├── src/
│   ├── server/
│   │   └── trpc.ts              # tRPC API routes
│   ├── client/
│   │   ├── App.tsx              # Main app component
│   │   ├── pages/
│   │   │   ├── MarketplaceBrowser.tsx   # Browse traits
│   │   │   ├── TraitDetail.tsx          # Trait details & purchase
│   │   │   ├── SellerDashboard.tsx      # Seller management
│   │   │   └── MyPurchases.tsx          # Purchase history
│   │   ├── components/
│   │   │   └── Navigation.tsx           # Nav bar
│   │   └── styles.css           # Global styles
│   └── index.tsx                # Entry point
├── prisma/
│   └── schema.prisma            # Database schema
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎯 API Routes

### Public Routes
- `getTraits` - Browse and search traits with filters
- `getTrait` - Get detailed trait information
- `getFeatured` - Get featured traits

### Protected Routes (Require Auth)
- `purchaseTrait` - Purchase a trait with Stripe or crypto
- `getMyPurchases` - Get user's purchase history
- `submitReview` - Submit a review for a purchased trait
- `toggleFavorite` - Add/remove trait from favorites

### Seller Routes (Require Seller Status)
- `createTrait` - Upload and create a new trait
- `updateTrait` - Update existing trait
- `getSellerStats` - Get seller dashboard statistics

## 💳 Payment Processing

The marketplace integrates with Stripe for credit card payments:

1. **Customer initiates purchase** → Frontend creates payment intent
2. **Stripe processes payment** → Webhook confirms payment
3. **License key generated** → Automatic unique key (e.g., "ABCD-EFGH-IJKL-MNOP")
4. **Database updated** → Purchase record created, stats incremented
5. **Commission calculated** → Revenue split based on seller tier

## 🗄️ Database Schema

Key models:
- **User** - Buyers and sellers with profiles and stats
- **Trait** - Trait listings with code, pricing, and metadata
- **Purchase** - Purchase records with license keys
- **Review** - User reviews and ratings
- **Favorite** - User's favorited traits
- **Analytics** - Event tracking (views, purchases, downloads)

## 🎨 Customization

### Styling
Edit `src/client/styles.css` to customize colors, fonts, and layout.

### Commission Tiers
Modify commission rates in `src/server/trpc.ts`:
```typescript
function getCommission(tier: string): number {
  switch (tier) {
    case 'FREE': return 0.30;      // 30%
    case 'PRO': return 0.20;       // 20%
    case 'PREMIUM': return 0.15;   // 15%
    case 'ENTERPRISE': return 0.10; // 10%
  }
}
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
pnpm build
# Deploy dist/client folder
```

### Backend (Railway/Render)
```bash
# Set environment variables in hosting platform
# Deploy with automatic database migration
```

### Database (Supabase/PlanetScale)
```bash
pnpm db:push     # Push schema to production
```

## 📚 Tech Stack

- **Frontend:** React, TypeScript, tRPC Client, React Router, Monaco Editor
- **Backend:** tRPC, Node.js, Prisma ORM
- **Database:** PostgreSQL
- **Payments:** Stripe
- **Styling:** Custom CSS with modern design
- **Build:** Vite
- **Type Safety:** TypeScript + Zod validation

## 📝 License

MIT License - feel free to use this marketplace for your own projects!

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📞 Support

For questions or issues, please open a GitHub issue.

---

Built with ❤️ for the HoloScript community
