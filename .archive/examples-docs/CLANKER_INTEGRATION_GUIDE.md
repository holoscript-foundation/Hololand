# Clanker Social Token Integration Guide
## One-Click ERC-20 Deployment for Per-World Creator Economies

**Document Version**: 1.0
**Last Updated**: February 19, 2026
**Status**: Technical Specification (Phase B/C Implementation)
**Platform**: Clanker (acquired by Farcaster, October 2025)
**Network**: Base (Ethereum L2)

---

## Executive Summary

This guide provides comprehensive technical specifications for integrating Clanker's AI-powered token launcher into Hololand, enabling creators to deploy custom ERC-20 tokens for individual VR worlds in 30 seconds (vs 2-4 hours manually).

**Key Benefits**:
- **New Revenue Stream**: $250K/year (Year 5) from token deployments and trading fees
- **Creator Economies**: Per-world tokens enable token-gated access, rewards, and NFT minting
- **Competitive Advantage**: First VR platform with one-click token deployment (Decentraland = 2-4 hour manual process)
- **Farcaster Integration**: Automatic social identity linking (fid + castHash)
- **Battle-Tested**: 355,000+ tokens deployed, $34.4M in exchange fees generated

---

## Table of Contents

1. [Overview](#1-overview)
2. [Platform Architecture](#2-platform-architecture)
3. [Token Metadata Beyond ERC-20](#3-token-metadata-beyond-erc-20)
4. [SDK Integration](#4-sdk-integration)
5. [API Endpoints](#5-api-endpoints)
6. [User Flow](#6-user-flow)
7. [Database Schema](#7-database-schema)
8. [Security Considerations](#8-security-considerations)
9. [Implementation Phases](#9-implementation-phases)
10. [Code Examples](#10-code-examples)

---

## 1. Overview

### What is Clanker?

Clanker is an AI-powered protocol that allows users to deploy ERC-20 tokens instantly on Base blockchain through:
- Farcaster posts (tagging @clanker)
- Web interface (clanker.world)
- Developer API (invitation-only)
- **SDK (clanker-sdk / @poolfans/sdk)** ← Hololand integration method

**Platform Statistics** (2025):
- **355,000+ tokens created**
- **$34.4M in exchange fees generated**
- **Acquired by Farcaster** (October 2025)
- **Base mainnet** deployment

### Use Case Example

**Traditional Token Deployment** (Manual):
```
1. Write Solidity smart contract (2-4 hours)
2. Deploy to Base mainnet (30 min, gas fees)
3. Verify contract on BaseScan (15 min)
4. Create liquidity pool on Uniswap (30 min, $1K+ initial liquidity)
5. Lock LP tokens (15 min)
───────────────────────────────
Total: 3-5 hours, $50-100 gas, technical expertise required
```

**Clanker Integration** (Automated):
```
1. Creator clicks "Launch World Token" button in Hololand
2. Fills form: Token name, symbol, allocation %
3. Pays 50 $BRIAN fee
4. Clanker SDK deploys token in 30 seconds
───────────────────────────────
Total: 30 seconds, 50 $BRIAN fee (~$50), zero technical knowledge
```

### Creator Value Proposition

**Per-World Economy Example**: "Cyberpunk Race Track"

```
Step 1: Creator builds VR world in Hololand
  └─ Time: 30 minutes (using templates + AI)

Step 2: Creator clicks "Launch World Token"
  └─ Token: $CRACE (Cyberpunk Race Token)
  └─ Supply: 1,000,000 tokens
  └─ Allocation: 20% locked (creator vault), 80% circulating

Step 3: Configure token utilities in-world
  ✅ Hold 100 $CRACE → unlock exclusive race track
  ✅ Win race → earn 50 $CRACE rewards
  ✅ Mint race car NFT for 1,000 $CRACE
  ✅ Stake $CRACE → vote on track upgrades

Step 4: Token auto-listed on DEX (Uniswap v4)
  └─ Liquidity pool created automatically
  └─ Creators earn 2% on all trades
```

**Revenue Streams for Creator**:
1. Initial token sale (80% of supply)
2. Ongoing trading fees (2% of volume)
3. NFT sales (paid in $CRACE)
4. Premium features (token-gated)

---

## 2. Platform Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOLOLAND CREATOR                              │
│  - Builds VR world                                               │
│  - Clicks "Launch World Token" button                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 1. Submit token config
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              HOLOLAND API BACKEND                                │
│  - Validate creator wallet                                       │
│  - Charge 50 $BRIAN deployment fee                              │
│  - Generate token metadata (world ID, creator ID, image)         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 2. Call Clanker SDK
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              CLANKER SDK v4.0.0                                  │
│  - Deploy ERC-20 contract on Base                               │
│  - Create Uniswap v4 liquidity pool                             │
│  - Lock LP tokens in locker contract                            │
│  - Link to Farcaster identity (fid + castHash)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 3. Return deployed token address
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              HOLOLAND DATABASE                                   │
│  - Store: world_id → token_address mapping                      │
│  - Store: positionId, lockerAddress, pool_config                │
│  - Link token to creator's Farcaster identity                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 4. Configure in-world utilities
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│              VR WORLD (RUNTIME)                                  │
│  - Check wallet balance: Does user hold 100 $CRACE?             │
│  - Grant access: Unlock exclusive race track                    │
│  - Distribute rewards: User wins race → earn 50 $CRACE          │
│  - NFT minting: Pay 1,000 $CRACE → mint race car NFT            │
└─────────────────────────────────────────────────────────────────┘
```

### Clanker Factory Contracts (Base Mainnet)

| Version | Address | Event Fields | Status |
|---------|---------|--------------|--------|
| **v4.0.0** | `0xe85a59c628f7d27878aceb4bf3b35733630083a9` | Full v4 schema | ✅ Latest |
| v3.1.0 | `0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E` | tokenAddress, positionId, deployer, fid, name, symbol, supply, lockerAddress, castHash | Legacy |
| v3.0.0 | `0x732560fa1d1A76350b1A500155BA978031B53833` | Same as v3.1.0 | Legacy |

**Hololand Integration**: Use **v4.0.0** exclusively for new deployments.

---

## 3. Token Metadata Beyond ERC-20

### Standard ERC-20 Fields

All Clanker tokens include standard ERC-20 interface:

```solidity
interface IERC20 {
  function name() external view returns (string);
  function symbol() external view returns (string);
  function decimals() external view returns (uint8);
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function transfer(address to, uint256 amount) external returns (bool);
  // ... (full ERC-20 interface)
}
```

### Clanker-Specific Metadata (15+ Fields)

```
+-------------------------------------------------------------+
|                 CLANKER TOKEN METADATA                      |
+-------------------------------------------------------------+
| IDENTITY (Farcaster Integration)                            |
|  - fid: number          → Creator's Farcaster ID            |
|  - castHash: string     → Origin Farcaster post             |
|  - social_context: obj  → Platform, messageId, id           |
+-------------------------------------------------------------+
| LIQUIDITY                                                   |
|  - positionId: number   → Uniswap LP NFT position           |
|  - lockerAddress: addr  → LP token locker contract          |
|  - pool_config: obj     → Fee tiers, paired token, ticks    |
|  - starting_market_cap  → Initial mcap in quote token       |
+-------------------------------------------------------------+
| SAFETY                                                      |
|  - warnings: string[]   → UNUSUAL_TICK, UNUSUAL_PAIR_ADDR,  |
|                            MISSING_POOL_CONFIG              |
+-------------------------------------------------------------+
| DEPLOYMENT                                                  |
|  - factory_address      → Which factory version deployed    |
|  - deploy_config        → Full deployment parameters        |
|  - msg_sender           → Transaction initiator             |
|  - deployed_at          → Timestamp                         |
+-------------------------------------------------------------+
| REWARDS                                                     |
|  - vault: percentage, lockup, vesting, recipient            |
|  - rewards: recipients[], bps, token preference             |
+-------------------------------------------------------------+
```

**Hololand Usage**: Store all metadata in `world_tokens` table for analytics, safety warnings, and liquidity tracking.

---

## 4. SDK Integration

### Installation

```bash
npm install clanker-sdk viem
```

### Configuration

```typescript
import { Clanker } from 'clanker-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Hololand platform wallet (for gas fees, deployment)
const account = privateKeyToAccount(process.env.HOLOLAND_WALLET_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http('https://mainnet.base.org')
});

const clanker = new Clanker({
  publicClient,
  walletClient
});
```

### Token Deployment Interface

```typescript
interface ClankerTokenV4 {
  name: string;                    // Token name (e.g., "Cyberpunk Race Token")
  symbol: string;                  // Token symbol (e.g., "CRACE")
  tokenAdmin: string;              // Creator's wallet address
  image: string;                   // IPFS URL (world thumbnail)
  vanity?: boolean;                // Generate "b07" suffix (optional)

  metadata?: {
    description: string;           // Token description
    socialMediaUrls: string[];     // Links to world, creator profile
    auditUrls: string[];           // Security audits (if any)
  };

  context?: {
    interface: string;             // "hololand" (identifies source platform)
    platform: string;              // "hololand" or "farcaster"
    messageId: string;             // Hololand world ID
    id: string;                    // Creator's Farcaster fid (if linked)
  };

  pool?: {
    pairedToken?: string;          // Default: WETH (0x4200000000000000000000000000000000000006)
    tickIfToken0IsClanker?: number;// Uniswap v4 tick configuration
    positions?: PoolPosition[];    // Custom liquidity positions
  };

  fees?: {
    type: "static" | "dynamic";    // Fee type
    clankerFee?: number;           // Platform fee in bps (default: 100 = 1%)
    pairedFee?: number;            // Paired token fee in bps
  };

  vault?: {
    percentage: number;            // 10-90% (creator allocation)
    lockupDuration: number;        // Seconds (min: 7 days)
    vestingDuration: number;       // Seconds (vesting period)
    recipient?: string;            // Vault recipient (default: tokenAdmin)
  };

  rewards?: {
    recipients: Array<{
      recipient: string;           // Reward recipient address
      admin: string;               // Admin who can modify rewards
      bps: number;                 // Basis points (sum = 10000)
      token: "Paired" | "Clanker" | "Both"; // Reward token type
    }>;
  };

  devBuy?: {
    ethAmount: number;             // Initial buy amount in ETH
  };
}
```

---

## 5. API Endpoints

### 5.1 Public REST API (Limited Access)

**Base URL**: `https://api.clanker.world` (invitation-only for full access)

**Available Endpoints**:

```
GET /tokens
  └─ Paginated list of deployed tokens
  └─ Query params: ?page=1&limit=50

GET /tokens/search
  └─ Search by creator
  └─ PLANNED EOL: July 31, 2025 (deprecated)

GET /tokens/fetch-deployed-by-address
  └─ Tokens by creator address
  └─ Query params: ?address=0x...

GET /get-clanker-by-address
  └─ Single token lookup
  └─ Query params: ?contract=0x...
```

**Response Fields** (April 2025 update):
- `warnings` - Risk flags (UNUSUAL_TICK, UNUSUAL_PAIR_ADDRESS, etc.)
- `pool_config` - Liquidity configuration
- `starting_market_cap` - Initial market cap
- `chain_id` - Parsed as integer (8453 for Base)
- `metadata` - Token metadata from database
- `deploy_config` - Stringified deployment config
- `social_context` - Social provenance (Farcaster)
- `deployed_at` - Timestamp
- `msg_sender` - Transaction sender
- `factory_address` - Factory contract
- `locker_address` - LP locker

**Hololand Usage**: For analytics dashboard, token discovery, creator leaderboards.

### 5.2 Bitquery GraphQL API (Recommended)

**Best for**: Historical queries, analytics, comprehensive token data

**Example Query**:

```graphql
query ClankerTokensByHololand {
  EVM(network: base) {
    Events(
      where: {
        Log: {
          SmartContract: {
            is: "0xe85a59c628f7d27878aceb4bf3b35733630083a9"
          }
          Signature: { Name: { is: "TokenCreated" } }
        }
        Arguments: {
          includes: {
            Name: { is: "context" }
            Value: { String: { includes: "hololand" } }
          }
        }
      }
      orderBy: { descending: Block_Time }
      limit: { count: 100 }
    ) {
      Arguments {
        Name
        Value {
          ... on EVM_ABI_String_Value_Arg { string }
          ... on EVM_ABI_Integer_Value_Arg { integer }
          ... on EVM_ABI_Address_Value_Arg { address }
        }
      }
      Block { Time }
      Transaction { Hash }
    }
  }
}
```

**Setup**:
1. Create account at https://bitquery.io
2. Generate API key
3. Query endpoint: `https://streaming.bitquery.io/graphql`

### 5.3 Indexing.co Webhooks (Real-Time)

**Best for**: Real-time deployment notifications, live activity feed

**Webhook Payload**:

```typescript
interface ClankerWebhook {
  __filter_key: string;
  contract_address: string;      // Deployed token address
  deployed_at: string;            // ISO timestamp
  symbol: string;                 // Token symbol
  deployer_address: string;       // Creator wallet
  world_id?: string;              // Hololand world ID (if available)
}
```

**Handler Example**:

```typescript
app.post('/webhooks/clanker', async (req, res) => {
  const { contract_address, symbol, deployer_address, deployed_at } = req.body;

  // Verify webhook signature
  const isValid = verifyIndexingSignature(req.headers['x-indexing-signature']);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Store deployment in database
  await db.worldTokens.create({
    tokenAddress: contract_address,
    symbol,
    deployerAddress: deployer_address,
    deployedAt: new Date(deployed_at)
  });

  // Send notification to creator
  await notifyCreator(deployer_address, {
    message: `Your token ${symbol} is now live!`,
    tokenAddress: contract_address
  });

  res.status(200).json({ received: true });
});
```

---

## 6. User Flow

### Step-by-Step Creator Experience

**Step 1: Creator Dashboard**

```typescript
// Hololand UI: World Settings Page
<WorldSettingsPanel worldId={world.id}>
  <Section title="Monetization">
    <Card>
      <h3>🪙 Launch World Token</h3>
      <p>Deploy a custom ERC-20 token for your world in 30 seconds</p>
      <ul>
        <li>✅ Token-gated access (e.g., "Hold 100 tokens to enter")</li>
        <li>✅ In-world rewards (e.g., "Earn 50 tokens for winning")</li>
        <li>✅ NFT minting (e.g., "Pay 1,000 tokens for NFT")</li>
        <li>✅ Auto-listed on Uniswap DEX</li>
      </ul>
      <Button onClick={() => openTokenLauncher()}>
        Launch World Token (50 $BRIAN)
      </Button>
    </Card>
  </Section>
</WorldSettingsPanel>
```

**Step 2: Token Configuration Modal**

```typescript
<TokenLauncherModal worldId={world.id}>
  <Form onSubmit={handleDeployToken}>
    <Input
      label="Token Name"
      placeholder="Cyberpunk Race Token"
      value={tokenName}
      onChange={setTokenName}
      required
    />

    <Input
      label="Token Symbol"
      placeholder="CRACE"
      value={tokenSymbol}
      onChange={setTokenSymbol}
      maxLength={10}
      required
    />

    <Input
      label="Total Supply"
      type="number"
      value={totalSupply}
      onChange={setTotalSupply}
      default={1000000}
      required
    />

    <Slider
      label="Creator Vault Allocation"
      value={vaultPercentage}
      onChange={setVaultPercentage}
      min={10}
      max={90}
      step={5}
      help="% of tokens locked for you (vested over time)"
    />

    <Input
      label="Lockup Duration"
      type="number"
      value={lockupDays}
      onChange={setLockupDays}
      min={7}
      max={365}
      suffix="days"
      help="Minimum 7 days required by Clanker"
    />

    <div className="cost-breakdown">
      <h4>Cost Breakdown</h4>
      <p>Deployment fee: <strong>50 $BRIAN</strong> (~$50 USD)</p>
      <p>Gas fees: <strong>Included</strong> (Hololand covers)</p>
      <p>Liquidity: <strong>Auto-created</strong> (from circulating supply)</p>
    </div>

    <Button type="submit" disabled={loading}>
      {loading ? 'Deploying...' : 'Deploy Token (50 $BRIAN)'}
    </Button>
  </Form>
</TokenLauncherModal>
```

**Step 3: Backend Processing**

```typescript
// Hololand API: POST /api/v1/worlds/:id/deploy-token
export async function deployWorldToken(req: Request, res: Response) {
  const { worldId } = req.params;
  const { tokenName, tokenSymbol, totalSupply, vaultPercentage, lockupDays } = req.body;

  // 1. Validate creator owns world
  const world = await db.userWorlds.findUnique({ where: { id: worldId } });
  if (world.creatorId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // 2. Check if token already exists for this world
  const existingToken = await db.worldTokens.findFirst({ where: { worldId } });
  if (existingToken) {
    return res.status(400).json({ error: 'Token already deployed for this world' });
  }

  // 3. Charge 50 $BRIAN deployment fee
  const feeCharged = await chargeBrianFee(req.user.id, 50);
  if (!feeCharged) {
    return res.status(402).json({ error: 'Insufficient $BRIAN balance' });
  }

  // 4. Deploy token via Clanker SDK
  try {
    const result = await clanker.deployToken({
      name: tokenName,
      symbol: tokenSymbol,
      tokenAdmin: req.user.walletAddress,
      image: world.thumbnailUrl, // Use world thumbnail as token image

      context: {
        interface: "hololand",
        platform: "hololand",
        messageId: worldId,
        id: req.user.farcasterFid || ""
      },

      vault: {
        percentage: vaultPercentage,
        lockupDuration: lockupDays * 24 * 60 * 60, // Convert days to seconds
        vestingDuration: lockupDays * 24 * 60 * 60,
        recipient: req.user.walletAddress
      },

      fees: {
        type: "static",
        clankerFee: 100, // 1% platform fee (goes to Hololand treasury)
        pairedFee: 100   // 1% paired token fee
      }
    });

    // 5. Wait for transaction confirmation
    const { address, positionId, castHash } = await result.waitForTransaction();

    // 6. Store in database
    const worldToken = await db.worldTokens.create({
      data: {
        worldId,
        creatorId: req.user.id,
        tokenAddress: address,
        tokenName,
        tokenSymbol,
        totalSupply,
        vaultPercentage,
        lockupDays,
        positionId,
        castHash,
        deployedAt: new Date()
      }
    });

    // 7. Return success
    return res.status(200).json({
      success: true,
      token: {
        address,
        name: tokenName,
        symbol: tokenSymbol,
        positionId,
        explorerUrl: `https://basescan.org/token/${address}`,
        dexUrl: `https://app.uniswap.org/tokens/base/${address}`
      }
    });

  } catch (error) {
    console.error('Clanker deployment failed:', error);

    // Refund $BRIAN fee on failure
    await refundBrianFee(req.user.id, 50);

    return res.status(500).json({
      error: 'Token deployment failed',
      details: error.message
    });
  }
}
```

**Step 4: In-World Integration**

```typescript
// VR World Runtime: Check token balance for access control
async function checkTokenGateAccess(userWallet: string, worldId: string): Promise<boolean> {
  // 1. Fetch world's token address
  const worldToken = await db.worldTokens.findFirst({ where: { worldId } });
  if (!worldToken) {
    return true; // No token gate, allow access
  }

  // 2. Check user's token balance
  const tokenContract = new Contract(worldToken.tokenAddress, ERC20_ABI, provider);
  const balance = await tokenContract.balanceOf(userWallet);

  // 3. Check minimum requirement (configured in world settings)
  const requiredBalance = parseEther("100"); // Require 100 tokens
  return balance >= requiredBalance;
}

// Usage in world loader
async function loadWorld(worldId: string, userWallet: string) {
  const hasAccess = await checkTokenGateAccess(userWallet, worldId);

  if (!hasAccess) {
    showModal({
      title: "Token Required",
      message: "You need 100 $CRACE tokens to access this world",
      actions: [
        { label: "Buy on Uniswap", onClick: () => openDex(tokenAddress) },
        { label: "Cancel", onClick: () => navigateBack() }
      ]
    });
    return;
  }

  // Load world...
}
```

---

## 7. Database Schema

### Table: `world_tokens`

```sql
CREATE TABLE world_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES user_worlds(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  token_address VARCHAR(42) UNIQUE NOT NULL,
  token_name VARCHAR(100) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  total_supply BIGINT NOT NULL,

  -- Clanker-specific
  position_id BIGINT,
  locker_address VARCHAR(42),
  cast_hash VARCHAR(66),
  factory_address VARCHAR(42),
  pool_config JSONB,
  warnings TEXT[],

  -- Creator configuration
  vault_percentage INTEGER, -- 10-90
  lockup_days INTEGER,
  vesting_days INTEGER,

  -- Analytics
  deployment_fee_brian DECIMAL(10, 2) DEFAULT 50.00,
  trading_volume_usd DECIMAL(18, 2) DEFAULT 0,
  holder_count INTEGER DEFAULT 0,
  market_cap_usd DECIMAL(18, 2),

  deployed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_world_id (world_id),
  INDEX idx_creator_id (creator_id),
  INDEX idx_token_address (token_address),
  CONSTRAINT unique_world_token UNIQUE (world_id)
);
```

### Table: `token_transactions`

```sql
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_token_id UUID NOT NULL REFERENCES world_tokens(id),
  tx_hash VARCHAR(66) NOT NULL,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  amount DECIMAL(36, 18),
  tx_type VARCHAR(50), -- 'transfer', 'mint', 'burn', 'swap'
  block_number BIGINT,
  timestamp TIMESTAMP,

  INDEX idx_world_token (world_token_id),
  INDEX idx_tx_hash (tx_hash),
  INDEX idx_timestamp (timestamp)
);
```

---

## 8. Security Considerations

### 8.1 Smart Contract Risks

**Risk: Rug pulls** (creator drains liquidity)

**Mitigation**:
- Clanker auto-locks LP tokens in locker contract (`lockerAddress`)
- Lockup duration minimum: 7 days (enforced by SDK)
- Display locker status in UI: "LP Locked ✅" vs "LP Unlocked ⚠️"

**Risk: Malicious token logic**

**Mitigation**:
- Clanker deploys standardized ERC-20 contracts (no custom logic)
- All contracts verified on BaseScan
- Warning system for unusual tick configurations

### 8.2 API Security

**Rate Limiting**:

```typescript
const RATE_LIMITS = {
  token_deployments_per_creator_per_day: 5,
  token_deployments_per_world: 1 // Can't redeploy for same world
};

async function checkDeploymentRateLimit(creatorId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `ratelimit:deploy:${creatorId}:${today}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 24 * 60 * 60); // 24 hour TTL
  }

  return count <= RATE_LIMITS.token_deployments_per_creator_per_day;
}
```

**Wallet Verification**:

```typescript
// Verify creator owns the wallet before deployment
async function verifyWalletOwnership(userId: string, walletAddress: string): Promise<boolean> {
  const user = await db.users.findUnique({ where: { id: userId } });
  return user.walletAddress.toLowerCase() === walletAddress.toLowerCase();
}
```

### 8.3 Financial Risks

**Risk: Creator can't afford deployment fee**

**Mitigation**:
- Check $BRIAN balance before deployment
- Show balance in UI: "Your balance: 120 $BRIAN ✅" vs "Insufficient balance: 20 $BRIAN ❌"
- Refund fee if deployment fails

**Risk: Token has zero liquidity**

**Mitigation**:
- Clanker auto-creates liquidity pool from circulating supply
- Display initial liquidity in UI before deployment
- Minimum recommended: 1 ETH paired liquidity

---

## 9. Implementation Phases

### Phase B (Months 7-12): POC & Beta

**Month 8: Clanker SDK Integration**
- [ ] Install clanker-sdk package
- [ ] Set up Hololand platform wallet (Base mainnet)
- [ ] Deploy test token on Base testnet
- [ ] Verify token appears on BaseScan

**Month 9: UI Development**
- [ ] "Launch World Token" button in world settings
- [ ] Token configuration modal
- [ ] Deployment progress indicator
- [ ] Success/failure notifications

**Month 10: Beta Testing**
- [ ] Recruit 3 creator beta testers
- [ ] Deploy 10 test tokens
- [ ] Gather feedback on UX, pricing, reliability
- [ ] Fix bugs, optimize gas usage

**Month 11: Analytics Dashboard**
- [ ] Token holder count tracking
- [ ] Trading volume tracking (via Bitquery)
- [ ] Creator earnings dashboard
- [ ] Top tokens leaderboard

**Month 12: Validation Gate**
```
IF (tokens_deployed >= 10 AND deployment_success_rate >= 90%)
  THEN → Proceed to Phase C (public launch)
ELSE IF (tokens_deployed < 5)
  THEN → Extend beta, incentivize early adopters
ELSE
  THEN → Fix reliability issues, extend Phase B
```

### Phase C (Months 13-18): Production Launch

**Month 13: Public Launch**
- [ ] "Launch World Token" button live for all creators
- [ ] Pricing: 50 $BRIAN deployment fee
- [ ] First 10 creators: FREE deployment (waive fee)
- [ ] Marketing: X announcement, Farcaster post

**Month 14-15: In-World Utilities**
- [ ] Token-gated access configuration UI
- [ ] Reward distribution system (earn tokens for actions)
- [ ] NFT minting with token payment
- [ ] Staking rewards configuration

**Month 16-18: Scale & Optimize**
- [ ] Webhook integration (Indexing.co) for real-time notifications
- [ ] Bitquery integration for analytics
- [ ] Multi-world token support (one token, multiple worlds)
- [ ] Target: 50 world tokens deployed

---

## 10. Code Examples

### 10.1 Complete Deployment Flow

```typescript
import { Clanker } from 'clanker-sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Initialize Clanker SDK
const account = privateKeyToAccount(process.env.HOLOLAND_WALLET_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL)
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL)
});

const clanker = new Clanker({
  publicClient,
  walletClient
});

// Deploy token
async function deployWorldToken(config: {
  worldId: string;
  tokenName: string;
  tokenSymbol: string;
  creatorWallet: string;
  worldThumbnail: string;
  vaultPercentage: number;
  lockupDays: number;
}) {
  try {
    console.log(`Deploying token for world ${config.worldId}...`);

    const result = await clanker.deployToken({
      name: config.tokenName,
      symbol: config.tokenSymbol,
      tokenAdmin: config.creatorWallet,
      image: config.worldThumbnail,

      context: {
        interface: "hololand",
        platform: "hololand",
        messageId: config.worldId,
        id: "" // Farcaster fid (if linked)
      },

      vault: {
        percentage: config.vaultPercentage,
        lockupDuration: config.lockupDays * 24 * 60 * 60,
        vestingDuration: config.lockupDays * 24 * 60 * 60,
        recipient: config.creatorWallet
      },

      fees: {
        type: "static",
        clankerFee: 200, // 2% platform fee
        pairedFee: 100   // 1% paired fee
      },

      pool: {
        pairedToken: "0x4200000000000000000000000000000000000006", // WETH on Base
      }
    });

    console.log('Waiting for transaction confirmation...');
    const { address, positionId, castHash } = await result.waitForTransaction();

    console.log('✅ Token deployed successfully!');
    console.log(`Token address: ${address}`);
    console.log(`Position ID: ${positionId}`);
    console.log(`Cast hash: ${castHash}`);

    return {
      success: true,
      tokenAddress: address,
      positionId,
      castHash,
      explorerUrl: `https://basescan.org/token/${address}`,
      dexUrl: `https://app.uniswap.org/tokens/base/${address}`
    };

  } catch (error) {
    console.error('❌ Token deployment failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage
const result = await deployWorldToken({
  worldId: "world_abc123",
  tokenName: "Cyberpunk Race Token",
  tokenSymbol: "CRACE",
  creatorWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  worldThumbnail: "ipfs://QmXyz...",
  vaultPercentage: 20,
  lockupDays: 30
});
```

### 10.2 Token Balance Check (Client-Side)

```typescript
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function checkTokenBalance(
  tokenAddress: string,
  userWallet: string
): Promise<{ balance: string; symbol: string }> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
  });

  const [balance, decimals, symbol] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userWallet]
    }),
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals'
    }),
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'symbol'
    })
  ]);

  const formattedBalance = formatEther(balance as bigint);

  return {
    balance: formattedBalance,
    symbol: symbol as string
  };
}

// Usage in VR world
const { balance, symbol } = await checkTokenBalance(
  '0x9f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
  userWallet
);

if (parseFloat(balance) >= 100) {
  console.log(`✅ Access granted! User has ${balance} ${symbol}`);
  unlockExclusiveContent();
} else {
  console.log(`❌ Access denied! User needs 100 ${symbol}, has ${balance}`);
  showTokenPurchaseModal();
}
```

---

## Appendix A: Revenue Model

### Deployment Fees

| Tier | Fee | Volume (Year 5) | Revenue |
|------|-----|-----------------|---------|
| Standard | 50 $BRIAN | 1,000 deployments | **$50,000** |

**Assumptions**:
- 1,000 world tokens deployed by Year 5
- 50 $BRIAN = ~$50 USD
- First 10 creators: FREE (marketing incentive)

### Trading Fees

**Platform Fee Structure**:
- Clanker charges 2% platform fee on token trades
- Hololand receives 50% of Clanker fees (via partnership)
- Annual trading volume (Year 5): $3M across all Hololand world tokens
- Platform revenue: $3M × 2% × 50% = **$30,000/year**

**Updated Projection**:
- Deployment fees: $50K
- Trading fees: $30K
- **Total**: **$80K/year** (conservative)

**Optimistic Scenario** (10x trading volume):
- Trading fees: $300K
- **Total**: **$350K/year**

**Target for PLATFORM_STRATEGY.md**: **$250K/year** (midpoint estimate)

---

## Appendix B: Farcaster Integration

### What is Farcaster?

Farcaster is a decentralized social network where Clanker originated. Clanker was acquired by Farcaster in October 2025.

**Key Concepts**:
- **fid**: Farcaster ID (unique identifier for each user)
- **castHash**: Hash of the original Farcaster post that triggered token deployment
- **Social Context**: Links token to social identity

### Hololand Integration

**Option 1: Optional Farcaster Linking**

```typescript
// User links Farcaster account in Hololand settings
async function linkFarcasterAccount(userId: string, fid: string) {
  await db.users.update({
    where: { id: userId },
    data: { farcasterFid: fid }
  });
}

// Use fid when deploying token
const result = await clanker.deployToken({
  // ...
  context: {
    interface: "hololand",
    platform: "hololand",
    messageId: worldId,
    id: user.farcasterFid || "" // Use linked fid
  }
});
```

**Option 2: Hololand-Only Mode**

```typescript
// Deploy without Farcaster integration
const result = await clanker.deployToken({
  // ...
  context: {
    interface: "hololand",
    platform: "hololand",
    messageId: worldId,
    id: "" // Empty fid (Hololand-only mode)
  }
});
```

**Recommendation**: Start with Option 2 (Hololand-only), add Option 1 in Phase D if there's demand.

---

## Appendix C: Troubleshooting

### Common Errors

**Error: "Insufficient funds for gas"**

**Cause**: Hololand platform wallet doesn't have enough ETH for gas fees

**Fix**:
```bash
# Check wallet balance
cast balance 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb --rpc-url https://mainnet.base.org

# Fund wallet with ETH
# Transfer 0.1 ETH to platform wallet
```

**Error: "Deployment timed out"**

**Cause**: Base network congestion

**Fix**:
```typescript
// Increase timeout in SDK config
const clanker = new Clanker({
  publicClient,
  walletClient,
  timeout: 120000 // 2 minutes (default: 60s)
});
```

**Error: "Token already exists for this world"**

**Cause**: Creator already deployed a token for this world

**Fix**:
```typescript
// Check database before deployment
const existing = await db.worldTokens.findFirst({ where: { worldId } });
if (existing) {
  return res.status(400).json({
    error: 'Token already deployed',
    tokenAddress: existing.tokenAddress
  });
}
```

---

**Document Status**: Ready for Phase B implementation
**Next Review**: Month 8 (start of Clanker SDK POC)
**Maintainer**: Hololand Platform Team
**Contact**: dev@hololand.io

---

*End of Clanker Social Token Integration Guide*
