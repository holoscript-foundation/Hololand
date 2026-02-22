# User Deployment Guide - Publishing Your Worlds

**Build it once. Deploy everywhere.**

This guide shows you how to take your HoloScript world from local development to production deployment across multiple platforms.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Build & Export](#build--export)
3. [Deployment Options](#deployment-options)
4. [Publishing to Hololand Network](#publishing-to-hololand-network)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Platform-Specific Guides](#platform-specific-guides)
7. [Monetization & Analytics](#monetization--analytics)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

**Goal**: Get your world live in under 5 minutes.

### Prerequisites

- Node.js 18+ installed
- HoloScript world file (`.hsplus` or `.holo`)
- Hololand account (for network publishing)

### Option A: Publish to Hololand Network (Easiest)

```bash
# 1. Build your world
holoscript build my-world.hsplus

# 2. Publish to Hololand
holoscript publish my-world.hsplus --public

# 3. Get shareable link
# → https://hololand.io/worlds/your-username/my-world
```

**Done!** Your world is live and shareable.

### Option B: Deploy to Your Own Server

```bash
# 1. Build for web
holoscript build my-world.hsplus --target web

# 2. Deploy to static host
# (Vercel, Netlify, GitHub Pages, etc.)
vercel deploy ./dist
```

---

## Build & Export

### Build Command

```bash
holoscript build <input> [options]
```

**Options**:
- `--target <platform>` - Unity, Unreal, Web, Quest, etc.
- `--output <dir>` - Output directory (default: `./dist`)
- `--optimize` - Enable production optimizations
- `--bundle` - Bundle all assets into single file

**Examples**:

```bash
# Web/browser deployment
holoscript build world.hsplus --target web --optimize

# Quest 2/3 standalone app
holoscript build world.hsplus --target quest --bundle

# Unity C# project
holoscript build world.hsplus --target unity --output ./UnityProject/Assets

# Unreal C++ project
holoscript build world.hsplus --target unreal --output ./UnrealProject/Source
```

### Build Outputs

| Target | Output | Use Case |
|--------|--------|----------|
| `web` | HTML + JS + assets | Browser, WebXR, hosted sites |
| `quest` | `.apk` | Quest 2/3 standalone app |
| `unity` | C# scripts | Unity project integration |
| `unreal` | C++ code | Unreal Engine integration |
| `desktop` | Tauri app | Windows/Mac/Linux desktop |
| `mobile` | React Native | iOS/Android native apps |

### Assets & Bundling

**Include custom assets**:

```bash
# Specify asset directory
holoscript build world.hsplus --assets ./my-assets

# Bundle everything (single file)
holoscript build world.hsplus --bundle --output world-bundle.holo
```

**Asset structure**:
```
my-world/
├── world.hsplus          # Main world file
├── assets/
│   ├── models/           # 3D models (.glb, .fbx)
│   ├── textures/         # Images (.png, .jpg)
│   ├── sounds/           # Audio (.mp3, .wav)
│   └── scripts/          # Additional .hsplus files
└── package.json          # Dependencies
```

---

## Deployment Options

### 1. Hololand Network (Recommended for Creators)

**Pros**:
- ✅ One-click publish
- ✅ Built-in analytics & monetization
- ✅ Global CDN (fast loading)
- ✅ Automatic updates
- ✅ Social features (comments, ratings)

**Pricing**:
- Free: Up to 5 worlds, 10K visits/month
- Creator ($15/mo): Unlimited worlds, 100K visits/month, custom domain
- Pro ($99/mo): 1M visits/month, priority support, white-label

**Use Cases**:
- Indie creators building VR games/experiences
- Artists showcasing 3D portfolios
- Educators creating interactive lessons

### 2. Self-Hosted (Full Control)

**Pros**:
- ✅ Complete ownership
- ✅ No platform fees
- ✅ Custom backend integration
- ✅ Private/enterprise deployments

**Cons**:
- ❌ You handle hosting costs
- ❌ You manage infrastructure
- ❌ No built-in analytics

**Use Cases**:
- Enterprise VR training platforms
- White-label solutions for clients
- High-traffic commercial apps

### 3. Hybrid (Best of Both)

**Host on Hololand + custom domain**:

```bash
# Publish to Hololand
holoscript publish world.hsplus

# Point your domain
# CNAME: vr.mycompany.com → hololand.io
```

**Benefits**:
- Hololand handles hosting & scaling
- You keep your brand (custom domain)
- Analytics & monetization included

---

## Publishing to Hololand Network

### 1. Create Account

```bash
# Sign up (browser opens)
holoscript login

# Or manually: https://hololand.io/signup
```

### 2. Configure World

**Create `hololand.config.json`**:

```json
{
  "name": "My Awesome World",
  "description": "A VR adventure game with puzzles and exploration",
  "tags": ["game", "adventure", "multiplayer"],
  "thumbnail": "./assets/thumbnail.png",
  "visibility": "public",
  "pricing": {
    "type": "free",
    "premium": false
  },
  "features": {
    "multiplayer": true,
    "maxPlayers": 50,
    "voiceChat": true,
    "physics": true
  },
  "platforms": ["web", "quest", "vr"],
  "minAge": 13
}
```

### 3. Publish

```bash
# First-time publish
holoscript publish world.hsplus

# Update existing world
holoscript publish world.hsplus --update

# Unpublish (take offline)
holoscript unpublish my-world
```

**Output**:
```
📦 Building world...
   ✓ Compiled to WebXR
   ✓ Optimized assets (12.4 MB → 3.2 MB)
   ✓ Generated thumbnail

🚀 Publishing to Hololand...
   ✓ Uploaded assets
   ✓ World deployed to CDN

✅ Published!
   URL: https://hololand.io/worlds/yourname/my-awesome-world
   QR Code: ./dist/qr-code.png
```

### 4. Share & Promote

**Shareable links**:
- Web: `https://hololand.io/worlds/yourname/my-world`
- Direct VR: `hololand://worlds/yourname/my-world`
- Embed: `<iframe src="https://hololand.io/embed/worlds/yourname/my-world">`

**QR Code** (for Quest headsets):
```bash
# Generate QR code for easy access
holoscript qr my-world --output ./qr.png
```

---

## Self-Hosted Deployment

### Web Deployment (Static Hosting)

**1. Build for web**:
```bash
holoscript build world.hsplus --target web --optimize
```

**2. Deploy to platform**:

#### Vercel
```bash
npm install -g vercel
vercel deploy ./dist
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir ./dist
```

#### GitHub Pages
```bash
# In your repo
cp -r dist/* docs/
git add docs/ && git commit -m "Deploy world"
git push

# Enable GitHub Pages: Settings → Pages → Source: /docs
# URL: https://yourusername.github.io/repo-name
```

#### AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync ./dist s3://my-vr-world --acl public-read

# Create CloudFront distribution
# Point to S3 bucket
# Enable HTTPS
```

### Quest Standalone Deployment

**Build APK**:
```bash
# 1. Build for Quest
holoscript build world.hsplus --target quest --bundle

# 2. Sign APK (one-time setup)
keytool -genkey -v -keystore my-key.keystore \
  -alias my-world -keyalg RSA -keysize 2048 -validity 10000

# 3. Generate signed APK
holoscript sign dist/my-world.apk --keystore my-key.keystore

# 4. Sideload to Quest
adb install -r dist/my-world-signed.apk
```

**Distribute APK**:
- SideQuest: Upload to [sidequestvr.com](https://sidequestvr.com)
- AppLab: Submit to Meta AppLab (free distribution)
- Meta Store: Submit for full Quest Store review

### Desktop Deployment (Tauri)

**Build native app**:
```bash
# Build for current OS
holoscript build world.hsplus --target desktop

# Cross-compile (requires Docker)
holoscript build world.hsplus --target desktop --os windows
holoscript build world.hsplus --target desktop --os macos
holoscript build world.hsplus --target desktop --os linux
```

**Outputs**:
- Windows: `.exe` installer
- macOS: `.dmg` disk image
- Linux: `.AppImage` or `.deb`

**Distribute**:
- GitHub Releases
- itch.io
- Steam (requires Steamworks integration)

---

## Platform-Specific Guides

### Browser / WebXR

**See**: [DEPLOYMENT_BROWSER.md](./DEPLOYMENT_BROWSER.md)

**Quick reference**:
```bash
holoscript build world.hsplus --target web
# Deploy to: Vercel, Netlify, GitHub Pages, Cloudflare Pages
```

**Features**:
- Works in any modern browser
- VR mode via WebXR (Quest, Vive, Index)
- Desktop mode with keyboard/mouse

### Desktop App (Tauri)

**See**: [DEPLOYMENT_TAURI.md](./DEPLOYMENT_TAURI.md)

**Quick reference**:
```bash
holoscript build world.hsplus --target desktop
# Outputs: .exe (Windows), .dmg (macOS), .AppImage (Linux)
```

**Features**:
- Native performance
- Offline support
- File system access
- Auto-updates

### Mobile (iOS/Android)

**See**: [DEPLOYMENT_MOBILE.md](./DEPLOYMENT_MOBILE.md)

**Quick reference**:
```bash
# iOS
holoscript build world.hsplus --target ios
# Outputs: Xcode project

# Android
holoscript build world.hsplus --target android
# Outputs: .apk
```

### Unity Integration

**Export C# scripts**:
```bash
holoscript build world.hsplus --target unity --output ./UnityProject/Assets/Generated
```

**Use in Unity**:
1. Open Unity project
2. Import generated scripts
3. Attach `WorldLoader` component to scene
4. Build for target platform (PC, Quest, WebGL)

### Unreal Integration

**Export C++ code**:
```bash
holoscript build world.hsplus --target unreal --output ./UnrealProject/Source/Generated
```

**Use in Unreal**:
1. Add generated files to project
2. Regenerate project files
3. Compile in Visual Studio
4. Place `WorldLoader` actor in level

---

## Monetization & Analytics

### Monetization Options

**1. Paid Access**:
```json
// hololand.config.json
{
  "pricing": {
    "type": "paid",
    "price": 4.99,
    "currency": "USD",
    "trial": 7 // 7-day free trial
  }
}
```

**2. Freemium (In-World Purchases)**:
```hsplus
// Sell virtual items
item SwordOfFire {
  price: 2.99
  category: "weapon"
}

system Shop {
  on_purchase(item) {
    // Handle purchase
    player.inventory.add(item)
  }
}
```

**3. Creator Program (70/30 split)**:
- Automatic revenue sharing
- Monthly payouts via Stripe
- Detailed earnings dashboard

**4. Sponsorships**:
- Partner with brands for in-world ads
- Sponsored experiences
- Affiliate links

### Analytics Dashboard

Access at: `https://hololand.io/dashboard/worlds/my-world/analytics`

**Metrics tracked**:
- Daily/monthly active users (DAU/MAU)
- Session duration
- Retention (D1, D7, D30)
- Geographic distribution
- Device breakdown (Quest, desktop, mobile)
- Revenue & conversions
- User ratings & reviews

**Export data**:
```bash
# Download analytics CSV
holoscript analytics my-world --export --range 30d
```

**Custom events**:
```hsplus
// Track custom events in your world
system Analytics {
  track("level_completed", {
    level: 5,
    time: 240
  })

  track("item_purchased", {
    item: "SwordOfFire",
    price: 2.99
  })
}
```

---

## Troubleshooting

### Common Issues

#### Build Fails

**Error**: `Error: Asset not found: models/tree.glb`

**Fix**:
```bash
# Ensure asset paths are relative to world file
# Check assets/ directory structure
ls assets/models/tree.glb
```

#### Publish Fails

**Error**: `401 Unauthorized - Please log in`

**Fix**:
```bash
holoscript logout
holoscript login
```

#### World Doesn't Load in Browser

**Error**: Mixed content (HTTP vs HTTPS)

**Fix**:
```json
// Ensure all asset URLs use HTTPS
{
  "assets": {
    "baseUrl": "https://cdn.hololand.io/assets"
  }
}
```

#### Low Performance

**Optimize assets**:
```bash
# Compress textures
holoscript optimize world.hsplus --textures --quality 0.8

# Reduce polygon count
holoscript optimize world.hsplus --meshes --target-tris 100000

# Bundle and minify
holoscript build world.hsplus --bundle --minify
```

### Performance Targets

| Platform | Target FPS | Max File Size | Max Polygons |
|----------|------------|---------------|--------------|
| Quest 2 | 72 FPS | 100 MB | 750K tris |
| Quest 3 | 90 FPS | 150 MB | 1.5M tris |
| Desktop VR | 90 FPS | 500 MB | 5M tris |
| Browser | 60 FPS | 50 MB | 500K tris |

### Getting Help

- **Documentation**: https://docs.hololand.io
- **Discord**: https://discord.gg/hololand
- **Email**: support@hololand.io
- **GitHub Issues**: https://github.com/brianonbased-dev/Hololand/issues

---

## Best Practices

### Before Publishing

- [ ] Test on target platform (Quest, browser, desktop)
- [ ] Optimize assets (textures <2048px, meshes <100K tris)
- [ ] Add thumbnail image (1920x1080)
- [ ] Write clear description with keywords
- [ ] Set appropriate age rating
- [ ] Test multiplayer (if enabled)
- [ ] Verify analytics tracking

### Version Control

**Recommended workflow**:

```bash
# Initialize git repo
git init
git add world.hsplus assets/ hololand.config.json
git commit -m "Initial world"

# Tag releases
git tag v1.0.0
git push origin v1.0.0

# Publish tagged version
holoscript publish world.hsplus --version 1.0.0
```

### Update Strategy

**Semantic versioning**:
- `1.0.0` → `1.0.1` - Bug fixes
- `1.0.0` → `1.1.0` - New features
- `1.0.0` → `2.0.0` - Breaking changes

**Staged rollout**:
```bash
# Deploy to beta first
holoscript publish world.hsplus --channel beta

# Promote to production after testing
holoscript promote my-world --from beta --to production
```

---

## Example Workflows

### Indie Creator Publishing Game

```bash
# 1. Build and test locally
holoscript dev world.hsplus

# 2. Optimize for Quest
holoscript build world.hsplus --target quest --optimize

# 3. Publish to Hololand
holoscript publish world.hsplus --public --pricing 4.99

# 4. Share on social media
# URL: https://hololand.io/worlds/myname/awesome-game
```

### Enterprise VR Training

```bash
# 1. Build for internal deployment
holoscript build training.hsplus --target web

# 2. Deploy to company servers
scp -r dist/* server:/var/www/vr-training/

# 3. Restrict access (enterprise SSO)
# Configure nginx with auth_request
```

### Artist Portfolio

```bash
# 1. Build interactive 3D gallery
holoscript build gallery.hsplus --target web

# 2. Deploy to custom domain
vercel deploy ./dist --prod
vercel alias set my-deployment.vercel.app art.mywebsite.com

# 3. Embed in portfolio site
<iframe src="https://art.mywebsite.com" width="100%" height="600"></iframe>
```

---

## Next Steps

- **Tutorial**: [Building Your First VR World](./TUTORIAL.md)
- **API Reference**: [HoloScript API Docs](./API.md)
- **Examples**: Browse [community worlds](https://hololand.io/explore)
- **Discord**: Join our [creator community](https://discord.gg/hololand)

---

**Last Updated**: February 21, 2026
**Questions?** Email [creators@hololand.io](mailto:creators@hololand.io)

---

*Built with ❤️ by the Hololand community. Where everyone can build in VR.*
