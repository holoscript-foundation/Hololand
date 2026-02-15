# @hololand/base-token-viz

> **"Clanker token → Hololand VR in 5 mins"**

Visualize any Base chain ERC-20 token as a stunning 3D object in Hololand. Part of the [HoloScript](https://github.com/brianonbased-dev/HoloScript) ecosystem.

## 🚀 Quick Start

```typescript
import { visualizeToken } from '@hololand/base-token-viz';

// One-liner: Token address → HoloScript
const script = await visualizeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
console.log(script); // Ready-to-render .hsplus code
```

## 📦 Installation

```bash
pnpm add @hololand/base-token-viz
# or
npm install @hololand/base-token-viz
```

## 🎨 Features

- **🔮 5 Visualization Styles**: Orb, Cube, Pedestal, Floating, Galaxy
- **⛓️ Base Chain Native**: Chain ID 8453, public RPC included
- **🎯 Zero Config**: Works out of the box with public RPC
- **📊 Token Metadata**: Fetches name, symbol, decimals, total supply
- **🎮 VR-Ready**: Generates .hsplus with @grabbable, @glowing traits
- **🎨 Smart Colors**: Auto-detects stablecoins, meme tokens, DeFi
- **🤖 Clanker Integration**: Farcaster identity, factory version, safety warnings

## 🔧 API

### `visualizeToken(address, style?)`

Quick one-liner to fetch token and generate HoloScript.

```typescript
const script = await visualizeToken('0x...', 'galaxy');
```

### `BaseTokenFetcher`

Fetch ERC-20 metadata from Base chain.

```typescript
import { BaseTokenFetcher } from '@hololand/base-token-viz';

const fetcher = new BaseTokenFetcher();
const metadata = await fetcher.fetchMetadata('0x...');
// { name: 'USD Coin', symbol: 'USDC', decimals: 6, totalSupply: 10000000n, ... }
```

### `HoloScriptGenerator`

Generate .hsplus code from token metadata.

```typescript
import { HoloScriptGenerator } from '@hololand/base-token-viz';

const generator = new HoloScriptGenerator();
const script = generator.generate(metadata, {
  style: 'orb',      // 'orb' | 'cube' | 'pedestal' | 'floating' | 'galaxy'
  glow: true,        // Enable emissive glow
  animated: true,    // Enable rotation/float animations
  grabbable: true,   // Enable VR interaction
  scale: 1.5,        // Scale factor
});
```

## 🎭 Visualization Styles

| Style | Description |
|-------|-------------|
| `orb` | Classic glowing sphere with rotation animation |
| `cube` | Rotating cube, great for NFT-style display |
| `pedestal` | Museum-style display on a pedestal |
| `floating` | Multiple floating orbs, dreamy effect |
| `galaxy` | Central token with orbiting particles |

## 🏗️ Generated HoloScript

Example output for USDC (`orb` style):

```hsplus
composition "TokenViz_usdc" {
  environment {
    backgroundColor: "#0f2f1f"
    fog: { type: "linear", color: "#0f2f1f", near: 10, far: 50 }
    camera: { position: [0, 2, 6], fov: 60 }
    ambient: 0.3
    shadows: true
  }

  template "TokenOrb" {
    @physics
    @collidable
    @grabbable
    @glowing
    @animated
    geometry: "sphere"
    color: "#00ff88"
    emissive: "#66ffaa"
    emissiveIntensity: 0.5

    label: "USDC - USD Coin"
    labelPosition: [0, 0.8, 0]
    labelColor: "#ffffff"
    labelSize: 0.15

    animation rotate {
      property: "rotation.y"
      from: 0
      to: 360
      duration: 8000
      loop: infinite
      easing: "linear"
    }
  }

  object "usdc" using "TokenOrb" {
    position: [0, 1.5, 0]
    scale: [1, 1, 1]
  }

  // Token info panel
  spatial_group "InfoPanel" {
    position: [3, 1.5, 0]
    // ... metadata display
  }
}
```

## 🧪 Demo

Run the demo locally:

```bash
cd packages/base-token-viz
pnpm demo
# Open http://localhost:3001
```

## 📝 Known Tokens

The package includes fallback data for common Base tokens:

- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- WETH: `0x4200000000000000000000000000000000000006`
- DAI: `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb`

## ⚠️ Gotchas

- **RPC Rate Limits**: Public Base RPC may throttle heavy usage. Use Alchemy for production.
- **Name/Symbol Revert**: Some tokens revert on `name()`/`symbol()`. Package handles gracefully.
- **Chain ID**: Base Mainnet is `8453`, not `84531` (that's Sepolia).

## 🤖 Clanker Integration

Fetch Clanker-specific metadata beyond standard ERC-20.

### Setup

Set the Bitquery API key via environment variable:

```bash
# .env or .env.local
BITQUERY_API_KEY=ory_at_WbZb...your_key_here
```

Get your key at: https://account.bitquery.io/user/api_v2/api_keys

### Usage

```typescript
import { visualizeClankerToken, ClankerTokenFetcher } from '@hololand/base-token-viz';

// With env var set (BITQUERY_API_KEY) - recommended
const script = await visualizeClankerToken('0x...', 'galaxy');

// Or pass key directly
const script = await visualizeClankerToken('0x...', 'galaxy', 'YOUR_KEY');

// Or use the fetcher directly
const fetcher = new ClankerTokenFetcher(); // Uses env var
const metadata = await fetcher.fetchClankerMetadata('0x...');

console.log(metadata.fid);           // Creator's Farcaster ID
console.log(metadata.castHash);      // Origin cast hash
console.log(metadata.factoryVersion); // 'v4', 'v3.1', etc.
console.log(metadata.warnings);      // Safety warnings
```

### Clanker Metadata Fields

| Field | Description |
| ----- | ----------- |
| `fid` | Creator's Farcaster ID |
| `castHash` | Origin Farcaster cast |
| `factoryVersion` | v4, v3.1, v3, legacy, original |
| `positionId` | Uniswap LP NFT position |
| `lockerAddress` | LP token locker contract |
| `warnings` | Safety flags (UNUSUAL_TICK, LOW_LIQUIDITY, etc.) |
| `deployedAt` | Deployment timestamp |

### Factory Contracts

| Version | Address |
| ------- | ------- |
| v4.0.0 | `0xe85a59c628f7d27878aceb4bf3b35733630083a9` |
| v3.1.0 | `0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E` |

## 🔗 Links

- [Hololand](https://github.com/brianonbased-dev/Hololand)
- [HoloScript](https://github.com/brianonbased-dev/HoloScript)
- [Base Chain](https://base.org)
- [Clanker](https://clanker.world)

## 📄 License

Elastic-2.0 © brianonbased-dev
