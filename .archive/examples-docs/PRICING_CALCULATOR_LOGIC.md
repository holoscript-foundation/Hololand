# Hololand Enterprise Pricing Calculator - Technical Specification

**Purpose**: Transparent pricing calculator that differentiates from Spatial.io's opaque "Contact Sales"
**Target**: Museums, universities, agencies evaluating white-label VR
**Goal**: "See your price in 30 seconds, not 30 days"
**Implementation**: Figma prototype (Day 4-5) → Web calculator (Phase B)

---

## 🎯 Design Principles

1. **Transparency**: Show exact price breakdown (base + deployments + users + support)
2. **Simplicity**: 3-4 input sliders, instant calculation
3. **Honesty**: No hidden fees, no "starting at $X" tricks
4. **Competitive**: Emphasize vs Spatial.io's opaque pricing
5. **Self-Service**: Users can see price WITHOUT sales call

---

## 💰 Pricing Tiers Overview

| Tier | Monthly Price | Use Case | Target Customers |
|------|---------------|----------|------------------|
| **Business** | $99 | White-label lite, 1-2 deployments | Small agencies, startups |
| **Enterprise** | $500-$5,000 | Full white-label, 3-10 deployments | Museums, universities, large agencies |
| **Custom** | Contact Sales | 10+ deployments, custom integrations | Fortune 500, government |

**Focus**: Enterprise tier ($500-$5K) is the sweet spot for museums/universities

---

## 🧮 Enterprise Tier Pricing Formula

### Base Formula

```
Total Monthly Price = Base + Deployments + Users + Support + Add-Ons

Where:
  Base = $500 (fixed)
  Deployments = calculateDeploymentCost(numDeployments)
  Users = calculateUserCost(monthlyActiveUsers)
  Support = calculateSupportCost(supportLevel)
  Add-Ons = calculateAddOnCost(selectedAddOns)
```

---

### Component 1: Base Price

**Fixed**: $500/month

**Includes**:
- 1 white-label deployment (custom subdomain: museum.hololand.com)
- Up to 10,000 monthly active users
- Standard support (email, 24-hour response time)
- 50-100 curated templates
- AI customization (natural language → VR)
- Export to 3+ platforms (WebXR, Unity, Unreal)

---

### Component 2: Additional Deployments

**Formula**:
```javascript
function calculateDeploymentCost(numDeployments) {
  if (numDeployments <= 1) {
    return 0; // First deployment included in base
  } else if (numDeployments <= 10) {
    return (numDeployments - 1) * 100; // $100 per additional deployment
  } else {
    return "Contact Sales"; // 10+ deployments = custom quote
  }
}
```

**Pricing Tiers**:
| Deployments | Cost | Notes |
|-------------|------|-------|
| 1 | $0 | Included in base |
| 2 | +$100 | 2nd deployment |
| 3 | +$200 | 3rd deployment |
| 5 | +$400 | 5th deployment |
| 10 | +$900 | 10th deployment |
| 10+ | Custom | Contact Sales |

**Example**:
- 3 deployments = Base $500 + $200 (2 additional × $100) = **$700/month**

---

### Component 3: Monthly Active Users (MAU)

**Formula**:
```javascript
function calculateUserCost(monthlyActiveUsers) {
  if (monthlyActiveUsers <= 10000) {
    return 0; // First 10K users included in base
  } else if (monthlyActiveUsers <= 100000) {
    const additionalUsers = monthlyActiveUsers - 10000;
    const tiers = Math.ceil(additionalUsers / 10000); // Round up to nearest 10K
    return tiers * 50; // $50 per 10K users above first 10K
  } else {
    return "Contact Sales"; // 100K+ users = custom quote
  }
}
```

**Pricing Tiers**:
| MAU | Cost | Notes |
|-----|------|-------|
| 0-10,000 | $0 | Included in base |
| 10,001-20,000 | +$50 | 1st additional 10K tier |
| 20,001-30,000 | +$100 | 2nd additional 10K tier |
| 30,001-40,000 | +$150 | 3rd additional 10K tier |
| 50,001-60,000 | +$250 | 5th additional 10K tier |
| 100,000+ | Custom | Contact Sales |

**Example**:
- 35,000 MAU = Base $500 + $150 (3 tiers × $50) = **$650/month**

**MAU Definition**:
> Monthly Active Users = Unique visitors who load a VR world in a 30-day period (counted once, even if they visit multiple times)

---

### Component 4: Support Level

**Formula**:
```javascript
function calculateSupportCost(supportLevel) {
  switch (supportLevel) {
    case "standard":
      return 0; // Included in base
    case "premium":
      return 500; // $500/month upgrade
    case "dedicated":
      return 1000; // $1,000/month upgrade
    default:
      return 0;
  }
}
```

**Support Tiers**:
| Level | Cost | Includes |
|-------|------|----------|
| **Standard** (Included) | $0 | Email support, 24-hour response time, Help Center |
| **Premium** | +$500/month | Email + Slack, <2 hour response time, phone support, monthly check-ins |
| **Dedicated CSM** | +$1,000/month | Named Customer Success Manager, <1 hour response time, quarterly business reviews, custom training |

**Example**:
- Premium support = Base $500 + $500 = **$1,000/month**

---

### Component 5: Add-Ons (Optional)

**Formula**:
```javascript
function calculateAddOnCost(selectedAddOns) {
  let total = 0;
  if (selectedAddOns.includes("customDomain")) total += 100;
  if (selectedAddOns.includes("sso")) total += 200;
  if (selectedAddOns.includes("api")) total += 300;
  if (selectedAddOns.includes("whiteLabel")) total += 200;
  return total;
}
```

**Add-On Pricing**:
| Add-On | Cost | Description |
|--------|------|-------------|
| **Custom Domain** | +$100/month | Use your own domain (museum.org/vr instead of museum.hololand.com) |
| **SSO Integration** | +$200/month | SAML, OAuth, Shibboleth integration (one-time setup included) |
| **API Access** | +$300/month | REST API, webhooks, 10K requests/hour (100K requests/hour for higher tiers) |
| **Full White-Label** | +$200/month | Remove "Powered by Hololand" footer, custom login page branding |

**Example**:
- Custom domain + SSO = Base $500 + $100 + $200 = **$800/month**

---

## 📊 Pricing Calculator UI (Figma Mockup)

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Hololand Enterprise Pricing Calculator                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ "See your price in 30 seconds, not 30 days"            │
│ (Unlike Spatial.io's opaque "Contact Sales")           │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 1. Number of Deployments                          │ │
│ │ [●────────────] 3 deployments                     │ │
│ │ (1, 2-5, 6-10, 10+ Custom)                        │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 2. Monthly Active Users                           │ │
│ │ [●──────────] 30,000 users                        │ │
│ │ (1K, 10K, 50K, 100K, 500K+)                       │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 3. Support Level                                  │ │
│ │ [Standard ▼]                                      │ │
│ │ ○ Standard (included)                             │ │
│ │ ● Premium (+$500, <2hr response)                  │ │
│ │ ○ Dedicated CSM (+$1K, named manager)             │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 4. Add-Ons (Optional)                             │ │
│ │ ☑ Custom Domain (+$100)                           │ │
│ │ ☑ SSO Integration (+$200)                         │ │
│ │ ☐ API Access (+$300)                              │ │
│ │ ☐ Full White-Label (+$200)                        │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ YOUR ESTIMATED PRICE                              │ │
│ │                                                   │ │
│ │ $1,550/month                                      │ │
│ │                                                   │ │
│ │ Breakdown:                                        │ │
│ │ Base Price:        $500                           │ │
│ │ Deployments (3):   $200  [2 additional × $100]    │ │
│ │ Users (30K):       $100  [2 tiers × $50]          │ │
│ │ Support:           $500  [Premium]                │ │
│ │ Custom Domain:     $100                           │ │
│ │ SSO Integration:   $200                           │ │
│ │ ────────────────────────                          │ │
│ │ TOTAL:             $1,550/month                   │ │
│ │                                                   │ │
│ │ 💡 Annual billing: $16,740/year (10% discount)    │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ [Get Started] [Contact Sales]                          │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ Compare to Spatial.io:                                 │
│ ❌ Spatial.io: "Contact Sales" (opaque, 2-6 week wait) │
│ ✅ Hololand: $1,550/month (transparent, start today)   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Figma Prototype Implementation

### Interactive Elements

1. **Deployment Slider**:
   - Range: 1-10 (with "10+ Custom" endpoint)
   - Snaps to integers
   - Updates price in real-time

2. **User Slider**:
   - Options: 1K, 5K, 10K, 20K, 30K, 50K, 100K, "100K+ Custom"
   - Logarithmic scale (not linear)
   - Updates price in real-time

3. **Support Dropdown**:
   - Radio buttons: Standard, Premium, Dedicated CSM
   - Tooltip on hover (explains each level)

4. **Add-Ons Checkboxes**:
   - Toggle on/off
   - Shows price delta (+$100, +$200, etc.)

5. **Price Breakdown**:
   - Animated counter (price updates smoothly)
   - Itemized list (shows how we got to total)

---

### Pre-Filled Scenarios (Quick Links)

Add 3 quick-select buttons above sliders:

```
[Small Museum]  [Medium University]  [Large Agency]
```

**Small Museum** (clicks button → auto-fills):
- Deployments: 1
- Users: 5K
- Support: Standard
- Add-Ons: None
- **Price**: $500/month

**Medium University** (clicks button → auto-fills):
- Deployments: 3
- Users: 30K
- Support: Premium
- Add-Ons: Custom Domain, SSO
- **Price**: $1,550/month

**Large Agency** (clicks button → auto-fills):
- Deployments: 10
- Users: 100K
- Support: Dedicated CSM
- Add-Ons: All
- **Price**: $3,400/month

---

## 💻 Web Calculator Implementation (Phase B)

### Tech Stack

**Frontend**:
- React (Next.js)
- Tailwind CSS (styling)
- Framer Motion (animations)

**Backend** (optional, for lead capture):
- Vercel serverless functions
- PostgreSQL (log pricing queries for analytics)

---

### React Component Structure

```jsx
// components/PricingCalculator.tsx

import { useState } from 'react';

export default function PricingCalculator() {
  const [deployments, setDeployments] = useState(1);
  const [users, setUsers] = useState(10000);
  const [support, setSupport] = useState('standard');
  const [addOns, setAddOns] = useState([]);

  const calculatePrice = () => {
    let base = 500;
    let deploymentCost = deployments > 1 ? (deployments - 1) * 100 : 0;
    let userCost = users > 10000 ? Math.ceil((users - 10000) / 10000) * 50 : 0;
    let supportCost = support === 'premium' ? 500 : support === 'dedicated' ? 1000 : 0;
    let addOnCost = addOns.reduce((sum, addOn) => sum + ADD_ON_PRICES[addOn], 0);

    return {
      base,
      deploymentCost,
      userCost,
      supportCost,
      addOnCost,
      total: base + deploymentCost + userCost + supportCost + addOnCost
    };
  };

  const price = calculatePrice();

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">Hololand Enterprise Pricing</h1>
      <p className="text-gray-600 mt-2">
        See your price in 30 seconds, not 30 days
      </p>

      {/* Sliders */}
      <div className="mt-8 space-y-6">
        <DeploymentSlider value={deployments} onChange={setDeployments} />
        <UserSlider value={users} onChange={setUsers} />
        <SupportDropdown value={support} onChange={setSupport} />
        <AddOnsCheckboxes value={addOns} onChange={setAddOns} />
      </div>

      {/* Price Breakdown */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold">Your Estimated Price</h2>
        <div className="text-5xl font-bold text-blue-600 mt-4">
          ${price.total.toLocaleString()}/month
        </div>
        <div className="mt-4 space-y-2 text-gray-700">
          <div className="flex justify-between">
            <span>Base Price:</span>
            <span>${price.base}</span>
          </div>
          {price.deploymentCost > 0 && (
            <div className="flex justify-between">
              <span>Deployments ({deployments}):</span>
              <span>${price.deploymentCost}</span>
            </div>
          )}
          {price.userCost > 0 && (
            <div className="flex justify-between">
              <span>Users ({(users / 1000).toFixed(0)}K):</span>
              <span>${price.userCost}</span>
            </div>
          )}
          {price.supportCost > 0 && (
            <div className="flex justify-between">
              <span>Support ({support}):</span>
              <span>${price.supportCost}</span>
            </div>
          )}
          {price.addOnCost > 0 && (
            <div className="flex justify-between">
              <span>Add-Ons:</span>
              <span>${price.addOnCost}</span>
            </div>
          )}
          <div className="border-t pt-2 font-bold text-lg">
            <div className="flex justify-between">
              <span>TOTAL:</span>
              <span>${price.total.toLocaleString()}/month</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          💡 Annual billing: ${(price.total * 12 * 0.9).toLocaleString()}/year (10% discount)
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex gap-4">
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
          Get Started
        </button>
        <button className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50">
          Contact Sales
        </button>
      </div>

      {/* Comparison */}
      <div className="mt-12 bg-gray-100 p-6 rounded-lg">
        <h3 className="font-bold text-lg">Compare to Spatial.io:</h3>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold">❌</span>
            <span>Spatial.io: "Contact Sales" (opaque, 2-6 week wait)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✅</span>
            <span>Hololand: ${price.total}/month (transparent, start today)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📈 Analytics & Optimization

### Track These Metrics

1. **Calculator Usage**:
   - Page views
   - Time spent on calculator
   - Number of slider adjustments (engagement)

2. **Price Selections**:
   - Average price generated
   - Distribution: <$1K, $1K-$2K, $2K-$5K, $5K+
   - Most common configurations

3. **Conversion Funnel**:
   - Calculator view → "Get Started" click → Sign-up
   - Calculator view → "Contact Sales" click → Lead captured

4. **Lead Quality**:
   - Organizations that request prices >$2K/month (high-intent)
   - Organizations that adjust sliders 5+ times (engaged)

---

### A/B Test Variations

**Test #1: Pricing Display**
- A: Show monthly price only
- B: Show monthly + annual (10% discount)
- Hypothesis: Showing annual savings increases "Get Started" clicks

**Test #2: Comparison Messaging**
- A: "See your price in 30 seconds, not 30 days"
- B: "Transparent pricing, unlike Spatial.io"
- Hypothesis: Direct competitor callout increases conversions

**Test #3: Pre-Filled Scenarios**
- A: No pre-filled scenarios (users set sliders manually)
- B: 3 pre-filled scenarios (Small, Medium, Large)
- Hypothesis: Pre-filled scenarios reduce bounce rate

---

## 🚀 Implementation Timeline

### Phase 1: Figma Prototype (Days 3-5, Week 1)
- [ ] Day 3: Design layout (4 hours, Designer)
- [ ] Day 4: Add interactive sliders (Figma prototype, 4 hours)
- [ ] Day 5: Test with 2 team members, iterate (2 hours)
- [ ] **Deliverable**: Figma mockup with interactive prototype

---

### Phase 2: Web Calculator (Phase B, Weeks 7-8)
- [ ] Week 7: Build React component (16 hours, Frontend Engineer)
- [ ] Week 7: Add analytics (Mixpanel events, 4 hours)
- [ ] Week 8: A/B test setup (Vercel Edge Config, 4 hours)
- [ ] Week 8: Deploy to hololand.com/pricing (2 hours)
- [ ] **Deliverable**: Live pricing calculator

---

### Phase 3: Lead Capture (Phase B, Week 9)
- [ ] Add email capture: "Get your custom quote emailed to you"
- [ ] Integrate with CRM (Salesforce/HubSpot)
- [ ] Auto-send pricing summary email (Resend/SendGrid)
- [ ] **Deliverable**: Lead generation pipeline

---

## 💡 Competitive Differentiation

### Hololand vs Spatial.io Pricing

| Dimension | Spatial.io | Hololand |
|-----------|------------|----------|
| **Visibility** | Opaque "Contact Sales" | Transparent $500-$5K published |
| **Speed** | 2-6 week sales cycle | See price in 30 seconds |
| **Self-Service** | No (requires sales call) | Yes (calculator + sign-up) |
| **Breakdown** | No itemization shown | Detailed (base + deployments + users + support) |
| **Negotiation** | Required (opaque pricing) | Optional (transparent base, custom for 10+ deployments) |

---

## 🎯 Success Metrics

**Week 1 (Figma Prototype)**:
- [ ] 5 interview targets see calculator
- [ ] 4/5 find it helpful (vs "Contact Sales")
- [ ] 3/5 say it would speed up procurement

**Phase B (Web Calculator)**:
- [ ] 100+ calculator views/month
- [ ] 20% click "Get Started" or "Contact Sales"
- [ ] 10% provide email for quote
- [ ] Average price generated: $1.5K-$2.5K (target range)

**Phase C (Lead Conversion)**:
- [ ] 30% of leads from calculator convert to pilots
- [ ] 50% of pilots convert to annual contracts
- [ ] Pricing calculator accounts for 30%+ of enterprise pipeline

---

**Pricing Calculator Logic Complete**
**Next Step**: Design Figma mockup (Day 4-5, Week 1)
**Expected Impact**: Differentiate from Spatial.io, 30% faster enterprise sales cycle
