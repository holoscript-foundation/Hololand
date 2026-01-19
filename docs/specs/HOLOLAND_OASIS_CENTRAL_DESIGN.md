# 🌆 Hololand Oasis (Central) - Design & Growth Plan

**Version**: 1.0  
**Date**: January 15, 2026  
**Vision**: The central hub that grows from downtown strip → suburban sprawl → continental expansion

---

## 📌 Sources of Truth
- Phase 0 execution: PHASE_0_IMPLEMENTATION_PLAN.md
- Growth targets: HOLOLAND_GROWTH_STRATEGY.md
- Platform architecture: DEVELOPMENT_ENVIRONMENT_SETUP.md
- Creator tools: NOCODE_WORLD_BUILDER_SPEC.md

---

## 🏙️ Spatial Design Philosophy

**Hololand Oasis** is a living, evolving world that mirrors real-world urban geography:

- **Central Strip (Downtown)**: High density, premium real estate, commerce hub
- **Suburban Rings**: Creator worlds, residential, mid-tier monetization
- **Wilderness Zones**: Parks, forests, monuments, natural exploration
- **Ocean Expansion**: Aquatic worlds, island destinations, tourism
- **Inter-world Highways**: Fast travel, connections, discovery portals

**Growth Pattern**: Concentric expansion outward + vertical complexity (layers, sky cities, underground)

---

## 📊 Phase 0: MVP Central Strip (Week 4 Launch)

### The Downtown Core

**Size**: ~500m x 500m virtual space (modest for MVP, scales up)

**Zones** (5 key areas):

#### 1. **Welcome Plaza** (Entry Point)
- First-person spawn location
- Orientation kiosk (AI guide)
- Billboard displays (sponsor/featured worlds)
- Seating areas (social hubs)
- Aesthetic: Bright, modern retail, glass storefronts

- Demo stations (preview worlds)
- Creator booths (profile display + contact)
- Creator tournament brackets (esports)
- Social gambling (play-to-earn cosmetics, not real money in Phase 0)
- Aesthetic: Neon, Vegas-inspired, energy

- Tower climb (skill-based)
- Crypto poker variant (cosmetic chips)
- Trivia arena (Hololand facts)

#### 4. **GREEN MACHINE ARCADE** (Casual Gaming Hub)
- Classic + VR arcade games (Pac-Man, rhythm games, shooting games)
- Aesthetic: Neon retro-futuristic, bright lights, energetic

- Racing sim (competitive standings)
- Pinball physics (high-score hunts)
- Premium token packs (cosmetic boosters)
- Exclusive arcade cosmetics (limited edition skins)
- Networking lounge (1:1 meetings, voice rooms)
- White-label platform showcase
- Meeting pods (spatial conferencing)
- Deal negotiation tables
- Contract templates (downloadable)
- Video conference integration
- Creator pitch stage (present to brands)

#### 6. **$BRIAN's GYM** (Fitness & Wellness Hub)
- Full VR fitness experience (personal training, classes, leaderboards)
- Workout tracking (cosmetics for milestones: 100 push-ups, 1000 calories burned)
- Social fitness (group challenges, team competitions)
- Meditation pods (relaxation zones)
- Avatar customization (show off fitness progress in appearance)
- Aesthetic: High-tech sports complex, LED screens, motivational energy

**Features**:
- Virtual training stations (guided workouts)
- Leaderboard (weekly/monthly challenges)
- Trainer NPCs (form correction, tips)
- Locker rooms (player meet-up)
- Prize redemption (cosmetic gear, featured spots)

**Monetization**:
- Premium trainer pass (cosmetic, early access challenges)
- Cosmetic workout gear (branded equipment appearances)
- Challenge sponsorships (Gatorade, Nike, fitness brands)

#### 7. **Central Park** (Social Hub)
- Large open plaza
- Amphitheater (events, concerts, talks)
- Art installations (NFT showcase, community art)
- Gardens (themed biomes)
- Playgrounds (social mini-games)
- Benches (chat spots)
- Aesthetic: Nature meets tech, green + neon

**Features**:
- Event stage (livestreaming integration)
- Sculpture gallery (user-created art)
- Grassy commons (hang out)
- Bonfire area (social gathering)
- Nature trails (path to suburbs)

### Rotating Skins & Theming System

**Dynamic World Transformation** - The entire downtown core rotates through themed cosmetic skins, transforming the aesthetic while preserving all gameplay mechanics.

**Current Skins Library** (Already Built):

1. **Cyberpunk Station** 🌐
   - High-tech neon space station aesthetic
   - Neon purple/pink towers with glowing emissive effects
   - Cyberpunk color scheme: 0x667eea (primary), 0xf093fb (accent)
   - Point lights: neon ambient lighting
   - Particle effects: city lights
   - Atmosphere: dark futuristic, tech-forward

2. **Wild West Frontier** 🤠
   - Desert town at sunset
   - Wooden saloons, general stores, banks, water towers
   - Sandy/earthy color scheme: 0xd4a574 (primary), 0xff6347 (accent)
   - Warm sunset lighting: 0xffa500
   - Particle effects: dust particles
   - Atmosphere: warm, rustic, adventure

3. **Urban Cityscape** 🏙️
   - Modern city at night
   - Tall skyscrapers, neon signs, metropolitan
   - Blue/neon color scheme: 0x00bfff (primary), 0xff1493 (accent)
   - Multi-colored point lights: blue, pink, green, yellow
   - Particle effects: none (clean urban)
   - Atmosphere: sleek, modern, energetic

4. **Snowy Village** ❄️
   - Festive winter celebration
   - Christmas trees, decorated houses, gift boxes
   - Red/green/gold color scheme: 0xff0000, 0x228b22, 0xffd700
   - Snow particles + golden sparkles
   - Particle effects: 200 snowflakes, 60 golden sparkles
   - Atmosphere: festive, warm, celebratory

5. **Tropical Paradise** 🌴
   - Lush tropical jungle aesthetic
   - Palm trees, tropical buildings, colorful houses
   - Vibrant color scheme: lime green, ocean blue, sunset orange
   - Warm daylight lighting
   - Particle effects: tropical birds, flower petals
   - Atmosphere: vibrant, exotic, welcoming

**How Rotation Works**:
- Manual toggle: Click floating cube in Welcome Plaza to cycle themes
- Automatic schedule (future): Seasonal rotations, daily themes, event-triggered skins
- All 7 zones transform together (unified aesthetic)
- Buildings, lighting, particles, and fog all skin together
- No gameplay changes: same zones, same mechanics, different look

**Implementation**:
- Theme engine: `src/themes/themes.ts` (5+ themes defined)
- Render system: Three.js with dynamic material swapping
- Color system: Hex colors + metalness/roughness for PBR
- Lighting: Per-theme lighting rigs (ambient + point lights)
- Performance: LOD + instancing for seamless swaps

**Monetization Opportunities**:
- Premium skin packs (cosmetic, seasonal)
- Sponsor-branded skins (Nike skin, Red Bull skin, etc.)
- Creator custom skins (build-a-theme for $1K+)
- Limited-time event skins (Halloween, Chinese New Year, etc.)

### Easter Eggs & Secrets System

**Overview**: A layered system of hidden content across the downtown core, designed to reward exploration, celebrate community, and deepen lore — without impacting core gameplay or performance.

**Categories** (all included):
- Hidden NPCs: Concierge avatars, dev cameos, community shout-outs with secret dialogues.
- Secret Areas: Locked doorways, hidden passages, rooftop access, underground tunnels.
- Lore Notes: Cryptic plaques, encoded messages, world-building scrolls.
- Interactive Puzzles: Combination locks, light-sequencing, rhythm challenges, riddle terminals.
- Developer References: Subtle tech nods, terminal prompts, inside jokes.
- Cross-Homage Moments: Tasteful tributes to classics (arcade cabinets, iconic silhouettes).
- Physics Anomalies: Zero-g pockets, gravity wells, teleport glitches (cosmetic-only).
- Achievement Hunts: Collectibles, badges, time-limited challenges, leaderboard trails.

**Phase 0 Placements (7 Zones)**:
- Welcome Plaza: Hidden concierge NPC behind the fountain; plaque with encoded city origin; floating cube unlocks a secret sky walkway when tapped thrice.
- Builder Shop: Dev terminal in back office with puzzle to unlock “Prototype Tool Skin”; blueprint scavenger hunt across displays.
- Hololand Casino: VIP door opens with a 4-light sequence; trivia machine grants “Lucky Charm” cosmetic; mirrored hall reveals lore quotes.
- GREEN MACHINE ARCADE: Secret cabinets reference classic titles; perfect rhythm run unlocks “Retro Glow” cosmetic; hush-hush leaderboard.
- B2B Hub: Hidden meeting pod with audio log; contract room bookshelf has a sliding panel leading to a negotiation mini-puzzle.
- $BRIAN's GYM: Form-perfect set unlocks “Athlete Aura” cosmetic; meditation pod reveals a calming forest vignette when completed.
- Central Park: Fireflies path at night leads to stage basement; sculpture tapping sequence reveals an art lore panel.

**Triggers & Rewards**:
- Triggers: Proximity zones, ordered interactions, time-of-day, multi-user actions, theme-dependent variants.
- Rewards: Cosmetic items (auras, badges, emotes), titles, profile stickers, secret leaderboard entries.
- Logging: Server-side discovery logs for analytics; anti-spoiler rate limits; opt-in share-to-feed.

**Anti-Spoiler & Safety**:
- No pay-to-win; purely cosmetic rewards.
- Discovery cooldowns; randomized variants to deter brute forcing.
- Age-appropriate content filters; accessibility-friendly puzzle paths.

**Theming Integration**:
- Eggs can skin with rotations (e.g., Wild West plaques change prose; Snowy Village adds winter vignette).
- Seasonal eggs appear during events (holiday lights puzzle; new year countdown terminal).

**Monetization (Optional)**:
- Event passes that unlock limited-time cosmetic rewards via puzzles.
- Sponsored eggs (brand-themed cabinet skins, puzzle prizes) with clear labeling.

**Scalability Notes**:
- Suburbs: Neighborhood scavenger hunts, creator storefront secrets, classroom quiz eggs.
- Wilderness: Biome-specific trail puzzles, photo-point achievements, monument lore tablets.
- Oceans: Lighthouse light-code puzzles, underwater bubble trail mazes, island festival secrets.

### Navigation in Phase 0

**Wayfinding**:
- Floating directional signs (teleport gates)
- Minimap (top-right corner)
- NPC guides (AI avatars at each zone entrance)
- Walking paths (stroll or fast-travel)

**Fast Travel**:
- Teleport gates between zones (instant)
- Metro system stub (future expansion)
- Portal hub (links to creator worlds)

**Performance Target**: <3s load, <100ms zone transitions

---

## 🌱 Phase 1: Suburban Expansion (Months 4-6)

### Ring 1: Suburban Sprawl

**Size**: 2km x 2km (4x larger than downtown)

**New Zones**:

#### 1. **Creator Neighborhoods**
- Personalized storefronts (each creator gets a tiny world entry)
- Residential districts (creator homes with trophies/earnings displays)
- Studio spaces (collaborative building zones)
- Coffee shops (social hangouts)
- Schools (learning centers for HoloScript)

#### 2. **Entertainment District**
- Movie theaters (watch creator showcases)
- Music venues (concert worlds)
- Sports arenas (multiplayer game hubs)
- Clubs (social dancing, events)
- Restaurants (cosmetic dining, no real food :))

#### 3. **Commerce District**
- Shopping malls (curated creator merchandise)
- Office parks (B2B workspace rental)
- Trade halls (monthly conventions)
- Auction houses (rare asset trading)
- Banks (wallet/payment kiosks)

#### 4. **Educational Hub**
- University district (HoloScript courses)
- Library (documentation, tutorials)
- Classroom spaces (teacher worlds)
- Labs (experimental building areas)
- Auditoriums (seminars, workshops)

#### 5. **Wilderness Entry**
- Forest path begins
- Nature museum (educational)
- Adventure outfitter (equip for exploration)
- Hiking trails (connect to outdoor zones)
- Camping grounds (overnight social areas)

### Expansion Mechanics

**Portal Network**:
- Subway system (fast travel between ring zones)
- Teleport gates (premium, cosmetic-based pricing)
- Walking paths (immersive, free, slow)

**Population Density**:
- Downtown: crowded, always busy, social
- Suburbs: moderate, peaceful, explorable
- Wilderness: sparse, adventurous, discovery

---

## 🌲 Phase 2: Wilderness & Monuments (Months 7-9)

### Ring 2: Natural Expansion

#### **National Hololand Monuments**
- Grand Canyon replica (scale: 500m deep, navigable)
- Digital Everest (highest point, view all of Oasis)
- Yellowstone-like geysers (animated nature)
- Meteor crater (explorer destination)
- Crystal caverns (underground adventure)

**Mechanics**:
- Photo points (share screenshots)
- Climb/puzzle challenges (cosmetic rewards)
- Discovery achievements (badges for visiting)
- Environmental storytelling (lore plaques)

#### **Biome Exploration**
- **Ancient Forest**: Towering trees, wildlife, ruins
- **Desert Dunes**: Oasis settlements, caravan routes
- **Tundra**: Ice sculptures, auroras, isolation
- **Tropical Jungle**: Waterfall hubs, biodiversity
- **Underwater Realm**: Bioluminescent creatures, submarine bases

**Monetization**:
- Creator world portals at biome entrances (gateway to paid experiences)
- Photo contests (cosmetics for best shots)
- Guided tours (AI narration, cosmetic tips)
- Camping gear marketplace (cosmetic equipment)

---

## 🌊 Phase 3: Ocean & Island Expansion (Months 10-12)

### Ring 3: Maritime Expansion

#### **Island Archipelago**
- Tropical resort islands (vacation worlds)
- Trading post islands (economy hub)
- Pirate havens (esports arenas)
- Research stations (science collaboration)
- Festival islands (event venues)

#### **Ocean Zones**
- Shipping lanes (fast travel routes)
- Underwater cities (futuristic habitats)
- Coral reefs (nature exploration)
- Sea monster encounters (PvE gameplay)
- Submarine bases (exclusive creator worlds)

#### **Bridge Moments** (In-Between Spaces)
- Pier towns (transition hubs)
- Lighthouse settlements (navigation guides)
- Ferry stations (cross-water travel)
- Shipping docks (economic activity)

---

## 📈 Year 1 Complete Map Vision

```
                    SKY CITIES (Layer 3)
                    (Cloud platforms)
                          ↑
    DOWNTOWN CORE    SUBURBAN RINGS    WILDERNESS    OCEANS
    (500m x 500m)    (2km x 2km)       (5km radius)  (unlimited)
    
    ┌─────────────────────────────────────────────┐
    │                                             │
    │    ╔════════════════╗                       │
    │    ║  WELCOME PLAZA ║                       │
    │    ║    (Spawn)     ║                       │
    │    ╚════════════════╝                       │
    │         │                                   │
    │    ┌────┼────┬─────┬──────┐                 │
    │    │    │    │     │      │                 │
    │  SHOP CASINO PARK B2B     │                 │
    │    │    │    │     │      │                 │
    │    └────┼────┴─────┴──────┤                 │
    │         │                 │                 │
    │    SUBURBAN SPRAWL → WILDERNESS → OCEAN    │
    │    (Creator Homes)   (Forests)  (Islands)  │
    │                      (Parks)    (Reefs)    │
    │                      (Monuments) (Cities)  │
    │                                             │
    └─────────────────────────────────────────────┘
    
    UNDERGROUND: Cave systems, bunkers, server rooms (future)
    SKY: Cloud cities, floating islands, airship routes (future)
```

---

## 💰 Monetization Zones (All Phases)

### Downtown Core (Phase 0)

**High-Value Real Estate**:
- Billboard sponsorships: $10K-$50K/month per billboard
- Shop rental: $1K-$5K/month per storefront
- Event venue rental: $500-$2K per event
- Featured carousel rotation: $5K/week

**Creator Opportunities**:
- Prize pools for casino (Hololand funds, creators split)
- Sponsorship matching (brands find creators)
- Event hosting (conferences, concerts, expos)

### Suburbs (Phase 1)

**Medium-Value Areas**:
- Creator home customization: $5-$50/month personalization
- Studio rental: $100-$500/month
- Ad placement: $1K-$10K/month
- School curriculum licensing: Custom pricing

### Wilderness (Phase 2)

**Exploration-Based Revenue**:
- Monument pass: $9.99/month (early access, cosmetics)
- Guided tours: $2.99 per tour
- Photography contests: Cosmetic prize pools
- Environmental conservation (cosmetic donation system)

### Oceans (Phase 3)

**Experience Monetization**:
- Island resort worlds: Premium creator spaces ($10K-$100K/month licensing)
- Underwater city licenses: Enterprise partnerships
- Festival hosting: $50K-$500K per major event
- Submarine base premium access: Cosmetic + gameplay advantages

---

## 🎨 Aesthetic & Branding

### Design Language

**Downtown**: Cyberpunk-meets-futuristic
- Neon signs, LED displays, glass architecture
- Color palette: Cyan, magenta, silver, black
- Vibe: High-energy, cosmopolitan, commerce-driven

**Suburbs**: Comfortable & Customizable
- Residential architecture, parks, shops
- Color palette: Warm earth tones, green, blue
- Vibe: Safe, inviting, creative freedom

**Wilderness**: Natural & Vast
- Realistic biomes, geological formations, waterfalls
- Color palette: Greens, browns, blues, golds
- Vibe: Exploration, discovery, majesty

**Oceans**: Mysterious & Adventurous
- Bioluminescence, coral formations, futuristic habitats
- Color palette: Deep blues, purples, glowing accents
- Vibe: Wonder, discovery, unknown depths

**Unified Theme**: "Built by Everyone, For Everyone"
- Clean, modern typography
- Accessible wayfinding
- Inclusive imagery (diverse avatars)

---

## 🚀 Growth Metrics by Phase

### Phase 0 (Week 4)
- Downtown Core: ✅ Live
- Zones: 5 (Welcome, Shop, Casino, B2B, Park)
- Population capacity: 500 concurrent
- Creator storefronts: 20 featured
- Monetization: Billboard sponsorships, storefronts, events
- Target: $50K-$100K/month platform revenue from Central

### Phase 1 (Month 6)
- Suburban Rings: ✅ Live (2km x 2km)
- Zones: +5 new (neighborhoods, entertainment, commerce, education, wilderness entry)
- Population capacity: 5,000 concurrent
- Creator storefronts: 1,000+ personalized
- Monetization: Home customization, studio rentals, events, education
- Target: $500K-$1M/month platform revenue

### Phase 2 (Month 9)
- Wilderness & Monuments: ✅ Live (5km radius)
- Zones: +5 biomes, +5 monuments
- Population capacity: 50,000 concurrent
- Unique explorer zones: 20+
- Monetization: Monument passes, guided tours, photography contests
- Target: $2M-$5M/month platform revenue

### Phase 3 (Month 12)
- Ocean & Island Expansion: ✅ Live (unlimited)
- Zones: +50+ islands, underwater cities, bridge towns
- Population capacity: 500,000+ concurrent
- Creator licensed worlds: 100+ premium spaces
- Monetization: Island licensing, enterprise partnerships, events
- Target: $5M-$10M/month platform revenue

---

## 🗺️ Navigation & Discovery

### Wayfinding System

**Visual Navigation**:
- Floating holographic signs (point to major zones)
- Minimap (reveals as player explores)
- NPC guides (AI avatars, context-aware help)
- Street names (lore-based: "Creator Avenue", "Monument Plaza")
- Compass (cardinal directions, always visible)

### Discovery Mechanics

**Progressive Unlock**:
- Phase 0: Downtown only (curated intro)
- Phase 1: Suburbs unlock (player-driven exploration)
- Phase 2: Wilderness unlock (via achievement system)
- Phase 3: Oceans unlock (via adventure progression)

**Portal Network**:
- Downtown hub has portals to all major zones
- Subway system (Phase 1+) connects rings
- Fast-travel cosmetics (sparkly effects, themed particles)
- Walking paths (free, slow, scenic)

**Social Discovery**:
- "Where are players now?" leaderboard
- "Most visited zones" trending map
- Creator portal recommendations (AI-powered)
- Event calendar (shows what's happening where)

---

## 🎭 Events & Seasonal Updates

### Phase 0 Launch Events

**Week 1**: Grand Opening
- Founder creator ceremony (live event)
- "Golden Ticket" cosmetics (limited edition)
- Multiplayer obstacle course (cosmetic prizes)

**Week 2**: Builder Showcase
- Top 100 creators featured in Park
- Monthly contest announced ($10K prize pool)

**Week 3**: B2B Networking
- Corporate partner announcements
- White-label platform pitch event

**Week 4**: Casino Grand Opening
- Tournament brackets
- Prize reveal ceremony

### Seasonal Themes

**Spring (Q2)**: Renewal & Growth
- Suburban expansion announcement
- Creator hiring fair (portfolio matching)
- Flower gardens in Central Park

**Summer (Q3)**: Exploration & Adventure
- Wilderness monument reveals
- Guided tour season
- Festival circuit begins

**Fall (Q4)**: Harvest & Commerce
- Thanksgiving marketplace (special cosmetics)
- Black Friday sales (builder shop)
- Creator awards ceremony

**Winter**: Joy & Celebration
- Holiday light displays (Downtown glow-up)
- Gift-giving system (cosmetics)
- New Year Eve gala (VIP event)

---

## 🔧 Technical Implementation

### Phase 0 (MVP)

**Rendering**:
- Downtown Core: Full detail (high LOD)
- Suburbs: Stubs (low poly, future expansion)
- Wilderness: Blocked off (future zone)
- Oceans: Blocked off (future zone)

**Performance**:
- 500 concurrent avatars in Downtown
- <3s load time
- <100ms zone transitions
- 60fps target on recommended specs

**Networking**:
- WebSocket-based player sync
- Spatial audio (voice attenuates by distance)
- Optimized mesh updates (delta compression)

### Phase 1+ (Expansion)

**Streaming**:
- Chunk-based world loading (Suburban Ring streams in)
- Predictive preload (anticipate player movement)
- Culling system (render only visible objects)
- Population management (spawn instances if full)

**Instances**:
- Downtown: Persistent, always-on (shared world)
- Suburbs: Persistent with overflow instances (phase 1+)
- Wilderness: Dynamic spawning based on player count

---

## 👥 Community Role in Growth

### Creator Contribution

**Phase 0**: 
- Featured storefronts (showcase portfolio)
- B2B booth setup (meet brands)
- Park art installations (community gallery)

**Phase 1**:
- Custom neighborhoods (personalized world)
- School classrooms (teach HoloScript)
- Studio collaborations (co-create spaces)

**Phase 2**:
- Guided tours (become local experts)
- Monument naming contests (community votes)
- Environmental storytelling (lore creation)

**Phase 3**:
- Island resort design (premium licensing)
- Underwater city architecture (innovative design)
- Festival hosting (community events)

### User Contributions

- Art submissions (Central Park gallery)
- Story/lore writing (monument descriptions)
- Photography (monument contest entries)
- Feedback & suggestions (design council)

---

## 📊 Success Metrics

### Engagement

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Concurrent players | 500 | 5,000 | 50,000 | 500K+ |
| Avg session time | 20 min | 45 min | 60+ min | 90+ min |
| Daily visitors | 10K | 100K | 500K | 5M |
| Repeat visitation | 40% | 60% | 75% | 85% |
| Explorer achievement rate | 20% | 40% | 60% | 70% |

### Monetization

| Source | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Sponsorships | $30K | $200K | $500K | $2M |
| Creator fees | $20K | $300K | $1M | $3M |
| Premium access | $0 | $100K | $500K | $5M |
| Enterprise licensing | $50K | $400K | $1.5M | $5M+ |
| **Total** | **$100K** | **$1M** | **$3.5M** | **$15M+** |

---

## 🎯 Next Steps

### Immediate (Week 1-2)
- [ ] Downtown Core 3D modeling (Welcome, Shop, Casino sections)
- [ ] Asset pipeline for zone creation
- [ ] Wayfinding UI mockups
- [ ] Sponsorship packages (billboard templates)

### Short-term (Week 3-4)
- [ ] Full Downtown playable MVP
- [ ] Navigation & portal system
- [ ] Event hosting backend
- [ ] Analytics tracking (zone popularity, dwell time)

### Medium-term (Phase 1)
- [ ] Suburban ring architecture
- [ ] Creator personalization tools
- [ ] Expanded monetization UI
- [ ] Premium access tiers

### Long-term (Phase 2+)
- [ ] Wilderness generation tools
- [ ] Ocean world scaffolding
- [ ] Dynamic seasonal theming
- [ ] Community governance (voting on new zones)

---

**Status**: Ready for design team  
**Designer Inputs Needed**: Visual aesthetics, avatar customization, UI/UX flows  
**Engineer Inputs Needed**: Streaming architecture, instancing, performance budgets  
**Creator Feedback**: Early testers to validate explore/monetization loops

---

*Hololand Oasis: Built by everyone, for everyone. Forever open source.*
