# Hololand Licensing Model

Hololand uses a **hybrid licensing approach** designed to maximize developer freedom while protecting commercial interests.

## TL;DR

- **HoloScript Language**: Fully open source (MIT) - use anywhere for anything
- **Core Framework**: Fully open source (MIT) - build and deploy freely
- **Platform Code**: Source-available (Elastic License 2.0) - view and modify, but commercial hosting restricted
- **Official Hosting**: Proprietary - central.hololand.io and commercial services

## Detailed Breakdown

### 1. HoloScript (MIT License)

**Fully Open Source - Zero Restrictions**

The HoloScript programming language and toolchain are completely free and open:

**Includes:**
- Language specification and grammar
- Compiler and interpreter
- Runtime and VM
- Standard library
- Developer tools (LSP, debugger, REPL)
- Documentation and tutorials

**You Can:**
- ✅ Use HoloScript for any purpose (personal, commercial, enterprise)
- ✅ Build proprietary applications
- ✅ Integrate into commercial products
- ✅ Create competing platforms using HoloScript
- ✅ Offer HoloScript as a service
- ✅ Fork and modify without attribution

**Location:** `Hololand/packages/holoscript/`

**License File:** [`packages/holoscript/LICENSE`](packages/holoscript/LICENSE)

---

### 2. Core Framework (MIT License)

**Fully Open Source - Maximum Freedom**

Core rendering, physics, and utilities are completely open:

**Includes:**
- `@hololand/core` - Core VR/AR engine
- `@hololand/renderer` - WebGL/WebGPU renderer
- `@hololand/physics` - Physics simulation
- `@hololand/world` - World building utilities
- `@hololand/react-three` - React bindings
- `@hololand/auth` - Authentication utilities

**You Can:**
- ✅ Build any VR/AR application
- ✅ Create commercial products
- ✅ Self-host without restrictions
- ✅ Modify and redistribute
- ✅ Use in proprietary software
- ✅ Offer as part of your service

**Location:** `Hololand/packages/`

**License File:** [`LICENSE`](LICENSE) (applies to all packages unless otherwise specified)

---

### 3. Platform Code (Elastic License 2.0)

**Source-Available with Commercial Restrictions**

Hololand Central and platform features are source-available but have commercial hosting restrictions:

**Includes:**
- Hololand Central hub
- Theme system and scenery
- Portal management
- World marketplace
- Commercial space leasing system
- Analytics and metrics

**You Can:**
- ✅ View and study the source code
- ✅ Modify for personal use
- ✅ Self-host for internal company use
- ✅ Use for education and research
- ✅ Deploy for non-commercial communities
- ✅ Contribute improvements via pull requests

**You Cannot (without a license):**
- ❌ Offer Hololand Central as a hosted service to third parties
- ❌ Create a competing metaverse platform service
- ❌ Use "Hololand" trademark commercially
- ❌ Charge users for hosting Hololand instances

**Commercial Use Clarification:**
- Using Hololand internally at your company: ✅ Allowed
- Building a VR app for your business using Hololand packages: ✅ Allowed
- Hosting a private Hololand instance for your employees: ✅ Allowed
- Offering "Hololand as a Service" to customers: ❌ Requires commercial license

**Location:** `Hololand/examples/hololand-central/`, `Hololand/platform/`

**License File:** [`examples/hololand-central/LICENSE-ELASTIC`](examples/hololand-central/LICENSE-ELASTIC)

---

### 4. Official Hosting (Proprietary)

**Closed Source - Commercial Service**

The following are proprietary and not included in this repository:

- **central.hololand.io** - Official hosted central hub
- **Commercial leasing backend** - Space rental and payment processing
- **Enterprise features** - Advanced analytics, white-labeling, SLA support
- **Scaling infrastructure** - Multi-region deployment, CDN, load balancing

**Access:** Available through paid enterprise licenses and partnerships.

---

## FAQ

### Can I use Hololand to build my company's VR app?

**Yes!** All core packages (@hololand/*) are MIT licensed. Build and deploy freely.

### Can I self-host Hololand Central for my organization?

**Yes!** Internal use is allowed under Elastic License 2.0. You cannot offer it as a service to external customers.

### Can I create a competing metaverse using HoloScript?

**Yes!** HoloScript is MIT licensed. You're free to build competing platforms.

### Can I fork Hololand and create my own version?

**Yes, with conditions:**
- Core packages (MIT): Fork freely, no restrictions
- Platform code (Elastic 2.0): You can fork and modify, but cannot offer as a hosted service
- You cannot use the "Hololand" trademark

### What if I want to offer commercial hosting?

Contact us for an **Enterprise License** at [email protected]

### Can I contribute to Hololand?

**Absolutely!** We welcome contributions to all components:
- Core packages: Submit PRs under MIT
- Platform code: Submit PRs under Elastic 2.0
- All contributors retain their copyright

### Why this licensing model?

This model balances several goals:

1. **Developer Freedom**: HoloScript and core tools are completely free
2. **Platform Protection**: Prevents large cloud providers from commoditizing our hosted service
3. **Community Growth**: Source-available platform code enables learning and contributions
4. **Sustainable Business**: Commercial hosting revenue funds ongoing development
5. **Ecosystem Health**: Anyone can build on Hololand without restrictions

### What license should I use for my HoloScript app?

**Any license you want!** Since HoloScript is MIT licensed, you have no obligations. Your apps can be:
- Proprietary/closed source
- Open source (any license)
- Commercial or free

---

## License Comparison

| Component | License | Commercial Use | Modify | Host for Others | Fork |
|-----------|---------|---------------|---------|-----------------|------|
| HoloScript | MIT | ✅ Unlimited | ✅ Yes | ✅ Yes | ✅ Yes |
| Core Packages | MIT | ✅ Unlimited | ✅ Yes | ✅ Yes | ✅ Yes |
| Platform Code | Elastic 2.0 | ⚠️ Internal Only | ✅ Yes | ❌ No | ⚠️ Yes* |
| Official Hosting | Proprietary | 💰 Paid License | ❌ No | ❌ No | ❌ No |

*Can fork but cannot offer as a commercial service

---

## Commercial Licensing

Need to offer Hololand as a service? We offer flexible commercial licenses:

### Startup License ($0 - $500/month)
- Up to 1,000 users
- Basic support
- Use "Powered by Hololand" branding

### Business License ($500 - $5,000/month)
- Up to 50,000 users
- Priority support
- Limited white-labeling

### Enterprise License (Custom Pricing)
- Unlimited users
- Full white-labeling
- Dedicated support
- Custom SLA
- Source code access to proprietary components

**Contact:** [email protected] or https://hololand.io/enterprise

---

## Getting Started

### For Developers
```bash
# Install core packages (MIT - completely free)
npm install @hololand/core @hololand/renderer @hololand/react-three

# Build your VR app - no restrictions!
```

### For Self-Hosters
```bash
# Clone and deploy (Elastic 2.0 - free for internal use)
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand/examples/hololand-central
npm install
npm run build
# Deploy to your infrastructure
```

### For Commercial Hosting
Contact us for an Enterprise License: [email protected]

---

## Trademark

"Hololand" and the Hololand logo are trademarks of Brian Joseph. Unauthorized commercial use of the trademark is prohibited.

**Permitted:**
- "Built with Hololand"
- "Compatible with Hololand"
- "Powered by Hololand" (with permission)

**Prohibited:**
- "Hololand [Your Service Name]"
- Implying official affiliation
- Using logo without permission

---

## Questions?

- **General questions:** Open a [GitHub Discussion](https://github.com/brianonbased-dev/Hololand/discussions)
- **Commercial licensing:** [email protected]
- **Security issues:** [email protected]
- **Community:** Discord (https://discord.gg/hololand)

---

**Last Updated:** January 2026

**Licensing Model Version:** 1.0
