# Hololand Central - Admin System

## Overview

Hololand Central includes a hidden admin panel for managing themes, portals, and viewing analytics. The admin panel is protected by Web3 wallet authentication and accessed via a secret Easter egg.

## Features

### 🎨 Theme Management
- Visual grid of all available themes
- One-click theme switching
- Preview of theme colors and atmosphere

### 🌐 Portal Configuration
- Enable/disable individual portals
- View portal status and connections
- Configure portal destinations

### 📊 Analytics Dashboard
- Real-time visitor metrics
- Popular world statistics
- Theme usage analytics
- Daily trend graphs

## Accessing the Admin Panel

### Secret Access Method

1. Navigate to the **Infinity Shop** world from the Main Plaza
2. Find the Brittney hologram (glowing purple wireframe sphere on a platform)
3. **Click the hologram 5 times within 3 seconds**
4. Console will log: `🔐 Secret admin access triggered!`
5. Admin panel will appear as an overlay

### Authentication

When admin access is triggered, you'll be prompted to connect your Web3 wallet:

1. MetaMask extension must be installed
2. Click "Connect Wallet" button in the admin panel
3. Approve the connection in MetaMask
4. Your wallet address will be verified against the admin whitelist
5. If authorized, full admin access is granted

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Admin wallet addresses (comma-separated)
VITE_ADMIN_WALLETS=0x1234567890abcdef...,0xfedcba0987654321...
```

**Requirements:**
- Ethereum wallet addresses (42 characters, starting with `0x`)
- Comma-separated, no spaces
- Addresses are case-insensitive (automatically normalized to lowercase)

### Example Configuration

```env
# Single admin
VITE_ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1

# Multiple admins
VITE_ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1,0x1234567890123456789012345678901234567890
```

## Security

### Web3 Authentication
- Wallet signatures prove ownership
- No passwords or server-side authentication
- Admin addresses stored in environment variables
- Not accessible without MetaMask or compatible Web3 wallet

### Secret Access Pattern
- 5 clicks within 3 seconds prevents accidental discovery
- No visible UI hints about admin access
- Console logging for debugging (can be removed for production)
- Hologram is a natural interaction point in the world

### Best Practices
1. **Never commit `.env` file** - use `.env.example` for templates
2. **Rotate admin wallets** if compromised
3. **Use hardware wallets** for high-value admin accounts
4. **Limit admin wallets** to trusted team members only
5. **Monitor admin actions** via console logs

## Technical Implementation

### File Structure

```
examples/hololand-central/
├── src/
│   ├── admin/
│   │   ├── AdminPanel.tsx       # Main admin UI component
│   │   └── useAdminAuth.ts      # Web3 authentication hook
│   ├── worlds/
│   │   └── InfinityShop.tsx     # Contains secret trigger
│   └── App.tsx                   # Admin panel integration
├── .env.example                  # Environment variable template
└── ADMIN.md                      # This file
```

### Key Components

#### AdminPanel.tsx
Full-featured admin dashboard with tabs for:
- Theme management
- Portal configuration
- Analytics viewing

#### useAdminAuth.ts
Custom React hook providing:
- `connectWallet()` - Initiates MetaMask connection
- `disconnect()` - Logs out admin
- `adminUser` - Current authenticated admin
- `isAdmin` - Boolean admin status
- `loading` - Connection state
- `error` - Authentication errors

#### Secret Trigger (InfinityShop.tsx)
```typescript
// Click tracking
const [clickCount, setClickCount] = useState(0);
const [lastClickTime, setLastClickTime] = useState(0);

// 5 clicks within 3 seconds
const handleSecretClick = () => {
  const now = Date.now();
  if (now - lastClickTime > 3000) {
    setClickCount(1);
  } else if (clickCount + 1 >= 5) {
    onAdminAccess(); // Trigger admin panel
  }
  setClickCount(clickCount + 1);
  setLastClickTime(now);
};
```

## Development

### Testing Admin Access

1. **Add your wallet to `.env`:**
   ```env
   VITE_ADMIN_WALLETS=0xYourWalletAddress
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Access admin panel:**
   - Navigate to Infinity Shop
   - Click Brittney hologram 5 times quickly
   - Connect your MetaMask wallet
   - Admin panel should appear

### Debugging

Enable debug logging in browser console:
```javascript
// Check if admin wallets are loaded
console.log(import.meta.env.VITE_ADMIN_WALLETS);

// Monitor click tracking
// Logs appear in console when clicking hologram
```

### Common Issues

**Issue:** "MetaMask not installed"
- **Solution:** Install MetaMask browser extension

**Issue:** "Wallet address not authorized"
- **Solution:** Add your wallet address to `VITE_ADMIN_WALLETS` in `.env`

**Issue:** Admin panel doesn't appear
- **Solution:** Check console for "🔐 Secret admin access triggered!" message
- Ensure you clicked 5 times within 3 seconds

**Issue:** Environment variables not loading
- **Solution:** Restart dev server after modifying `.env`
- Vite requires restart for env var changes

## Production Deployment

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Production admin wallets configured
- [ ] Console logs removed or disabled
- [ ] Admin panel only accessible via secret trigger
- [ ] MetaMask connection prompts working
- [ ] Admin wallet whitelist verified

### Environment Variables on Vercel

1. Go to project settings on Vercel dashboard
2. Navigate to "Environment Variables"
3. Add `VITE_ADMIN_WALLETS` with production wallet addresses
4. Deploy

### Alternative Deployment Platforms

**Netlify:**
```bash
netlify env:set VITE_ADMIN_WALLETS "0xAddress1,0xAddress2"
```

**Custom Server:**
```bash
export VITE_ADMIN_WALLETS="0xAddress1,0xAddress2"
npm run build
npm run preview
```

## Future Enhancements

Potential admin features to add:
- [ ] User management and banning
- [ ] Content moderation tools
- [ ] World upload/management
- [ ] Revenue and payment tracking
- [ ] Advanced analytics and heatmaps
- [ ] Multi-signature wallet support
- [ ] Role-based permissions (super admin, moderator, etc.)
- [ ] Audit logs for admin actions
- [ ] Two-factor authentication
- [ ] Admin activity notifications

## Support

For admin access issues or questions:
- Email: [email protected]
- GitHub Issues: https://github.com/brianonbased-dev/Hololand/issues
- Discord: https://discord.gg/hololand

---

**Last Updated:** January 2026
**License:** Elastic License 2.0 (Platform Code)
