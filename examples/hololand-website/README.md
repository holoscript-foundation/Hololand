# 🌐 Hololand.io Landing Page

**The official landing page for Hololand - Build the Open Metaverse**

This is a Next.js website that serves as the public face of Hololand, explaining the platform and onboarding new creators and developers.

## 🎯 Purpose

The landing page showcases:
- **Three paths to creating**: No VR (Infinity Builder), Have VR (Hololand), Developers (Code)
- **The Creator Journey**: From "I want to build in VR" to having a thriving virtual business
- **Email signup**: Waitlist for early access to Infinity Builder
- **Social proof**: GitHub stars, Discord community, live stats

## 🚀 Quick Start

### Prerequisites

```bash
node --version  # Should be v18 or higher
```

### Installation

From the Hololand repository root:

```bash
# Install dependencies (from repo root)
pnpm install

# Navigate to website
cd examples/hololand-website

# Start development server
pnpm dev
```

The site will be available at [http://localhost:3000](http://localhost:3000)

### First-Time Setup

If dependencies aren't installed:

```bash
# From repository root
pnpm install

# Then start website
cd examples/hololand-website
pnpm dev
```

## 🏗️ Project Structure

```
hololand-website/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts & metadata
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Global styles & utilities
│   └── components/
│       ├── Hero.tsx             # Hero section with CTA
│       ├── CreatorJourney.tsx   # 4-step creator journey
│       ├── DualPath.tsx         # No VR vs Have VR paths
│       ├── Features.tsx         # Key features grid
│       ├── Stats.tsx            # Live statistics
│       ├── EmailSignup.tsx      # Email waitlist form
│       └── Footer.tsx           # Footer with links
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎨 Key Sections

### 1. Hero Section
- Gradient animated background
- "Build the Open Metaverse" headline
- 3 CTA buttons: Infinity Builder, Hololand Central, Docs
- Quick stats: HoloScript-native, FREE, 8+ Packages

### 2. Creator Journey (THE KEY SECTION)
Shows the 4-step path from problem to solution:

```
❌ Problem → 💡 Solution → 🚀 Export → 🎉 Success
```

**Step 1: The Problem**
- Don't have VR headset
- Don't know how to code
- Can't visualize 3D

**Step 2: Infinity Builder**
- Free 2D browser tool
- Drag-and-drop interface
- AI assistance

**Step 3: Export to Hololand**
- One-click publish
- Now available in VR/AR
- Share link with anyone

**Step 4: Experience & Grow**
- Add AI agents
- Enable e-commerce
- Earn $BRIAN tokens

### 3. Dual Path Section
Shows three distinct paths:

**Path A: No VR Headset**
- Use Infinity Builder (2D)
- Works on any device
- Export to Hololand when ready
- Perfect for: Business owners, creators, testing ideas

**Path B: Have VR Headset**
- Build directly in Hololand
- Voice commands, hand tracking
- Immersive creation experience
- Perfect for: VR enthusiasts, spatial designers

**Path C: For Developers**
- Code with @hololand packages
- React + Three.js
- Full control and customization

### 4. Features
- Universal Platform
- React + Three.js
- Natural Language
- Visual Builder
- Own Your Creations
- HoloScript Native

### 5. Email Signup
- Waitlist for Infinity Builder early access
- Validated email form
- Success confirmation

### 6. Footer
- Quick links
- Social media
- HoloLand licensing is separate from HoloScript
- $BRIAN token info

## 🎨 Design System

### Colors
```css
--primary: #667eea     /* Purple */
--primary-dark: #5568d3
--secondary: #764ba2   /* Deep purple */
--accent: #f093fb      /* Pink */
```

### Typography
- **Display Font**: Space Grotesk (headings)
- **Body Font**: Inter (body text)

### Components
- **Glass morphism**: Frosted glass effect
- **Gradient text**: Primary to secondary gradient
- **Glow effect**: Soft purple glow on CTAs
- **Floating animation**: Subtle floating badges

## 📦 Building for Production

### Local Build

```bash
pnpm build
```

Output will be in `.next/` directory.

### Preview Production Build

```bash
pnpm build && pnpm start
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
cd examples/hololand-website
pnpm build
vercel --prod
```

3. **Configure** (first time):
- Project name: `hololand-website`
- Root directory: `./`
- Build command: `pnpm build`
- Output directory: `.next`

Your site will be live at `hololand.io` (or Vercel subdomain)

### Environment Variables

No environment variables required for basic deployment. For email signup functionality:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 🔧 Development

### Hot Reload

```bash
pnpm dev
```

Changes auto-refresh in browser.

### Type Checking

```bash
pnpm build  # Runs TypeScript compiler
```

### Linting

```bash
pnpm lint
```

## ✨ Key Features to Implement

### Phase 1: Launch (Current)
- [x] Landing page structure
- [x] Creator journey section
- [x] Dual path (No VR vs Have VR)
- [x] Email signup form (UI only)
- [ ] Connect email signup to database
- [ ] Add analytics tracking

### Phase 2: Enhancement
- [ ] Embedded hololand-central demo
- [ ] Live stats from GitHub API
- [ ] Animated 3D background
- [ ] Video walkthroughs
- [ ] Blog integration

### Phase 3: Advanced
- [ ] User authentication
- [ ] Account dashboard
- [ ] Infinity Builder integration
- [ ] $BRIAN token wallet connect

## 🤝 Contributing

Want to improve the landing page?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

HoloLand platform licensing is separate from HoloScript. HoloScript is MIT-licensed;
do not describe HoloLand as MIT unless a HoloLand-specific license file says so.

## 🔗 Links

- **Live Site**: [hololand.io](https://hololand.io) (coming soon)
- **Main Repo**: [github.com/brianonbased-dev/Hololand](https://github.com/brianonbased-dev/Hololand)
- **Documentation**: [Hololand Docs](../../README.md)
- **Discord**: [Join Community](https://discord.gg/hololand)

---

**Built with ❤️ by the Hololand Community**

*Powered by Next.js • Styled with Tailwind CSS • Open to Everyone*

🌐 **Where Everyone Can Build in VR - And Beyond** ✨
