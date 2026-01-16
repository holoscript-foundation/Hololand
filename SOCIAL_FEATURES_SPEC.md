# 🌐 Hololand Social Features Specification

**Date**: January 15, 2026  
**Status**: Complete System Design  
**Target Engagement**: 50+ daily active interactions per creator  

---

## Table of Contents

1. [Social Vision](#social-vision)
2. [Discovery System](#discovery-system)
3. [Creator Profiles](#creator-profiles)
4. [Ratings & Reviews](#ratings--reviews)
5. [Content Sharing](#content-sharing)
6. [Community Features](#community-features)
7. [Leaderboards & Rankings](#leaderboards--rankings)
8. [Social Feed Algorithm](#social-feed-algorithm)
9. [Moderation & Safety](#moderation--safety)

---

## Social Vision

### The Goal

Build a vibrant creator community where:
- **Discoverability**: Players find worlds effortlessly
- **Community**: Creators connect and collaborate
- **Feedback**: Direct player feedback shapes evolution
- **Virality**: Great worlds spread organically
- **Trust**: Transparent ratings & reviews build confidence

### Design Philosophy

```
Discovery → Community → Engagement → Monetization
                                          ↑
                                         └── Feeds back to discoverability
```

---

## Discovery System

### Browse Interface

**Main Categories** (10 core):
- Games (competitive, casual, RPG)
- Shops (retail, NFT, digital goods)
- Offices (work, collaboration, meetings)
- Education (courses, training, certifications)
- Art & Entertainment (galleries, concerts, performances)
- Social (hangouts, dating, networking)
- Sports & Fitness (VR sports, training, competitions)
- Music & Dance (clubs, concerts, rhythm games)
- Worlds & Exploration (adventure, travel, mystery)
- Creator Spotlights (featured new creators)

**Subcategories** (50+):
```
Games
├─ Competitive
│  ├─ PvP Arenas
│  ├─ Tournaments
│  └─ Esports
├─ Casual
│  ├─ Puzzle
│  ├─ Adventure
│  └─ Simulation
└─ RPG
   ├─ Fantasy
   ├─ Sci-Fi
   └─ Modern
```

### Filter System

**Primary filters**:
- Genre (dropdown)
- Max players (1-10, 10-100, 100+)
- Language (30+ options)
- Rating (4+, 3+, all)
- Update frequency (updated today, this week, this month)
- Price (free, paid, subscription)
- Duration (< 5 min, 5-30 min, 30+ min)

**Advanced filters** (power users):
- Creator experience level (new, established, celebrity)
- Monetization type (pure free, has shop, has sponsorship)
- Performance rating (60fps guaranteed, etc.)
- Accessibility features (blind-friendly, colorblind mode, etc.)

### Search

**Full-text search**:
```
Search: "multiplayer space arena"

Results:
1. "Nebula Arena" (Game) - 4.8★ (12K reviews)
   └─ 500K visits | Created by SpaceGames Studio
   └─ "Competitive 8-player arena in space setting"

2. "Cosmic Battles" (Game) - 4.5★ (8K reviews)
   └─ 250K visits | Created by QuantumGames
   └─ "Free-for-all multiplayer battle in galaxy"

3. "Space Station Alpha" (Social) - 4.6★ (5K reviews)
   └─ 180K visits | Created by GalacticGamer
   └─ "Hangout with friends in futuristic setting"
```

**Trending searches** (displayed):
- "Multiplayer games"
- "Free to play"
- "Dating worlds"
- "Educational experiences"

---

## Creator Profiles

### Profile Layout

```
┌─────────────────────────────────────────┐
│  TheVRMaster          [Follow] [Message] │
├─────────────────────────────────────────┤
│                                         │
│  Creator since: Jan 2025                │
│  Badge: Gold Creator ⭐                 │
│  Location: Los Angeles, CA              │
│                                         │
│  Bio: "Building immersive VR experiences│
│  focused on storytelling and gameplay"  │
│                                         │
│  Website: www.thevrmster.com            │
│  YouTube: 250K subscribers               │
│  Discord: 15K community members          │
│                                         │
├─ STATS ─────────────────────────────────┤
│ Total worlds:        15                  │
│ Total visits:        2.4M                │
│ Avg world rating:    4.7/5               │
│ Followers:           45K                 │
│ Following:           120                 │
│ Monthly earnings:    $12,400             │
│                                         │
├─ FEATURED WORLDS ───────────────────────┤
│ NebulaArena (Game)              4.8★    │
│ └─ 500K visits | Shop: enabled          │
│                                         │
│ PixelCastle (Adventure)         4.7★    │
│ └─ 280K visits | Multiplayer enabled    │
│                                         │
│ MountainClimb (Adventure)       4.6★    │
│ └─ 150K visits                          │
│                                         │
├─ SOCIAL ───────────────────────────────┤
│ [Show all worlds] [Recent activity]     │
│ [Collaborations] [Published articles]   │
│                                         │
├─ LATEST POST ───────────────────────────┤
│ "Launched new multiplayer arena! Check  │
│  it out and let me know what you think" │
│                                         │
│ Posted 2 days ago | ❤️ 3.2K | 💬 450   │
└─────────────────────────────────────────┘
```

### Profile Customization

**Editable sections**:
- Profile photo (1:1 image, 500x500px)
- Banner (16:9 image, 1920x1080px)
- Bio (250 characters)
- Links (website, YouTube, Discord, Twitter, TikTok)
- Featured worlds (up to 5, reorderable)
- Visibility (public, private, creators only)

**Creator badges**:
- ⭐ Gold Creator (tier 4)
- 🎯 Silver Creator (tier 3)
- 🥉 Bronze Creator (tier 2)
- 🆕 Founding Creator (tier 1)
- 🏆 Top earner of month
- 🚀 Trending creator
- ✨ Community favorite
- 👑 Verified creator

---

## Ratings & Reviews

### Rating System

**5-star rating** (required on world exit):

```
┌──────────────────────────┐
│ Rate "Nebula Arena"      │
├──────────────────────────┤
│                          │
│   ★ ★ ★ ★ ★             │
│   (click to rate)        │
│                          │
│ [Skip] [Submit]          │
└──────────────────────────┘
```

**Rating breakdown** (visible on world detail):
```
5★  ████████░ 72% (8,640 reviews)
4★  ███░░░░░░ 14% (1,680 reviews)
3★  ██░░░░░░░  8%   (960 reviews)
2★  █░░░░░░░░  4%   (480 reviews)
1★  ░░░░░░░░░  2%   (240 reviews)
────────────────────────────
Overall: 4.58/5 (12,000 reviews)
```

### Review Submission

**Required fields**:
- Rating (1-5 stars)
- Title (max 100 chars)
- Body (max 500 chars)
- Playstyle (single-player, co-op, competitive)
- Gameplay hours (1-5 hour bins)

**Optional**:
- Photo upload (1 screenshot)
- Would recommend? (yes/no toggle)
- Would purchase cosmetics? (yes/no toggle)

### Review Display

```
★★★★★ Amazing experience!
by ProGamer | 50+ hours | Verified purchase
Posted 3 days ago | ❤️ 342 | Helpful

"This world is incredible. The combat mechanics are 
tight, the story is engaging, and the visuals are 
stunning. Only minor complaint is occasional lag. 
Highly recommend!"

[Mark helpful] [Report] [Reply]
```

**Review sorting**:
- Most helpful (upvotes - downvotes)
- Most recent
- Highest rated
- Lowest rated
- Verified purchases first

### Moderation

**Review guidelines**:
- ✅ Honest feedback about gameplay
- ✅ Constructive criticism
- ✅ Personal experience
- ❌ Spam or irrelevant
- ❌ Harassment or hate speech
- ❌ Promotional links
- ❌ Spoilers (marked with spoiler tag if needed)

**Creator responses**:
- Creators can respond to reviews
- Only 1 response per review
- Response shown directly below review
- Can be marked as "response from creator" in gold

---

## Content Sharing

### Sharing Mechanisms

**In-game sharing**:
```
┌─────────────────────────────┐
│ Share World                 │
├─────────────────────────────┤
│ [ ] Copy link               │
│     (nebula-arena.holo.io)  │
│                             │
│ [ ] Share to:               │
│     ├─ Discord              │
│     ├─ Twitter              │
│     ├─ Facebook             │
│     ├─ WhatsApp             │
│     ├─ Email                │
│     └─ Reddit               │
│                             │
│ [ ] Generate QR code        │
│                             │
│ [ ] Invite friends          │
│     └─ [Enter names...]     │
│                             │
│         [Share] [Cancel]    │
└─────────────────────────────┘
```

**Integrated widgets**:
- Discord embed (thumbnail + world info)
- Twitter card (image + title + rating)
- Facebook link preview
- Email template (beautiful world preview)

### Viral Mechanics

**Referral links**:
```
https://hololand.io/ref/thevrmster/nebula-arena

When someone joins using this link:
├─ Creator: +5 points toward next tier bonus
├─ New player: 1 free cosmetic item
└─ Shared to 100 people: $50 bonus
```

**Shareable achievements**:
- "Beat the boss!" (screenshot + world link)
- "Found all collectibles!" (achievement card)
- "Bought the legendary skin!" (store receipt card)
- "Reached rank 10!" (rank card with world link)

**User-generated content**:
- Clip recording (30s, 60s, 5 min)
- Screenshot with watermark (optional)
- Auto-shareable to TikTok, YouTube Shorts, Instagram Reels
- Watermark includes: World name, creator name, Hololand logo

---

## Community Features

### Social Feed

**What appears in feed**:
- World publications (new worlds from followed creators)
- Creator posts (text updates with images)
- Reactions (liked reviews, endorsed creations)
- Achievements (friend beat boss, reached milestone)
- Collaborations (new team formed)
- Events (tournament starting, Creator Spotlight)

**Feed algorithm** (detailed in next section)

### Follows & Followers

**Following**:
- Follow creators to see their content first
- Get notified of new world releases
- Exclusive early access to new features
- Discounted items in their shops (5-10% off)
- Direct messaging capability

**Followers**:
- See your world activity
- Receive early access to beta worlds
- Get notified of shop updates
- Appear in "Recent followers" section

### Messaging System

**Direct messages**:
- Text-based private chat
- Image sharing
- World invitations (clickable links)
- Emojis and reactions
- Message history (infinite, searchable)

**Group chats**:
- Up to 100 members per chat
- Roles: Creator (can pin/delete), Moderator (can delete spam), Member
- Threads (replies within message)
- Pin important messages

**Notifications**:
- New direct message (real-time)
- Group chat mention (highlight in yellow)
- World invitation (pop-up card)
- Follow notification (batched, once per day)

### Community Events

**Weekly:**
- Creator highlight (1 creator featured, 5K+ bonus followers)
- World spotlight (trending world gets promotion)
- Community showcase (top reviews of the week)

**Monthly:**
- Creator competition (best new world, most creative, etc.)
- Theme jam (all creators build worlds on theme)
- Community voting (players vote on next features)
- Live Q&A (Hololand team + top creators)

**Quarterly:**
- Hackathon (48-hour world building competition)
- Creator summit (in-person if desired, or virtual)
- Awards ceremony (categories: Best Game, Best Social, Best Shop, etc.)

---

## Leaderboards & Rankings

### Global Leaderboards

**Top Earners** (Monthly):
```
Rank  Creator              Monthly Revenue  Worlds  Followers
────  ──────────────────  ────────────────  ──────  ─────────
1.    TheVRMaster         $45,600          15      45,000
2.    PixelCentral        $32,400          8       32,000
3.    QuantumWorlds       $28,900          12      28,000
4.    DreamscapeStudio    $25,400          6       25,000
5.    CreativeMinds       $22,100          10      22,000
```

**Most Visited**:
```
Rank  World              Creator          Visits    Rating   Category
────  ──────────────────  ──────────────  ────────  ───────  ─────────
1.    NebulaArena         TheVRMaster     2.4M      4.8★     Game
2.    ShopCentral         RetailGames     1.8M      4.5★     Shop
3.    ClassroomHub        EduCreators     1.2M      4.7★     Education
4.    MountainClimb       AdventureTeam     950K    4.6★     Adventure
5.    ThemeParkDream      FamilyWorlds      850K    4.5★     Family
```

**Highest Rated**:
```
Rank  World              Creator          Rating   Reviews  Visits
────  ──────────────────  ──────────────  ───────  ───────  ──────
1.    LunarBase          SpaceExplorers   4.95★    4,200    180K
2.    FutureLabs         TechCreative     4.93★    3,800    160K
3.    FantasyRealm       StoryGames       4.91★    5,100    220K
4.    UnderwaterCities   OceanWorlds      4.89★    2,900    140K
5.    InfinityGarden     ArtisticCreator  4.88★    3,300    170K
```

### Personal Leaderboards

**Creator dashboard** shows:
- Rank among all creators globally
- Rank in your category (e.g., Games, Shops)
- Rank in your region
- Trending up/down indicator
- Next milestone to reach next rank

**Player profile** shows:
- Most worlds visited
- Most items purchased
- Highest level reached
- Achievements unlocked
- Friends leaderboard (compare with friends)

---

## Social Feed Algorithm

### Algorithm Overview

**Goal**: Show each user the most relevant content

**Inputs** (personalized to user):
- User's following list
- User's interests (gaming, education, art, etc.)
- User's past activity (worlds visited, items purchased)
- User's friends' activity
- Global trending content

### Algorithm Details

**Ranking function**:

```
Score = (A × Engagement) + (B × Recency) + (C × Relevance) + (D × SocialProof)

Where:
- Engagement = likes, comments, shares on item
- Recency = how recent (decay over 7 days)
- Relevance = match to user interests (0-1)
- SocialProof = # friends who engaged (boosted if friend-posted)

Weights:
- A = 0.4 (engagement is most important)
- B = 0.3 (recent content preferred)
- C = 0.2 (relevance matters)
- D = 0.1 (social proof as bonus)
```

**Personalization**:

```
User interest profile:
- Gaming: 0.8 (likes games)
- Education: 0.2 (rarely visits educational worlds)
- Art: 0.1 (low interest)
- Shops: 0.5 (moderate interest in cosmetics)

When new world "Fantasy RPG" is published by followed creator:
- Engagement: 50 likes (ongoing, no decay yet)
- Recency: 1.0 (just published)
- Relevance: 0.8 × 0.8 = 0.64 (gaming interest high, matches world)
- SocialProof: 3 friends visited (3 points)

Score = (0.4 × 50) + (0.3 × 1.0) + (0.2 × 0.64) + (0.1 × 3)
      = 20 + 0.3 + 0.128 + 0.3
      = 20.728
      
→ Appears high in user's feed
```

### Feed Composition

**Typical 24-hour feed** (ordered by score):

```
┌─ Post 1: Followed creator released new world
│  Relevance: HIGH (creator you follow)
│  Type: New world publication
│  Engagement: 250 likes, 45 comments, 12 shares
│
├─ Post 2: Friend achieved rare achievement
│  Relevance: MEDIUM-HIGH (friend activity)
│  Type: Achievement unlocked
│  Engagement: 50 likes, 5 comments
│
├─ Post 3: Trending world from category you like
│  Relevance: HIGH (gaming category)
│  Type: Popular world
│  Engagement: 2K likes, 300 comments, 1K shares
│
├─ Post 4: Creator you follow published review
│  Relevance: MEDIUM (creator you follow)
│  Type: Creator review/opinion
│  Engagement: 120 likes, 30 comments
│
├─ Post 5: New world from trending creator
│  Relevance: MEDIUM (trending but not followed)
│  Type: New world publication
│  Engagement: 5K likes, 800 comments, 2K shares
│
└─ Post 6: Promotional event (weekly Creator Spotlight)
   Relevance: LOW (promotional, not personalized)
   Type: Platform event
   Engagement: N/A (admin post)
```

### Feed Controls

**User preferences**:
- Show posts from following only (toggle)
- Hide posts from category X (dropdown)
- Show fewer posts from creator Y (hide option)
- Mute world/creator for 24 hours (snooze)
- Report post (spam/inappropriate)

**Creator controls**:
- Post to followers only (private post)
- Schedule post for later
- Boost post ($5-$100 to reach more users)
- Pin post (stays at top of followers' feed for 7 days)

---

## Moderation & Safety

### Safety First

**Content moderation**:
- All world content reviewed by humans (AI-assisted)
- Sexual content: prohibited in public worlds
- Violence: allowed in games with age rating
- Harassment: zero tolerance, ban users/worlds
- Spam: auto-flagged, removed within 1 hour

**Rating system**:
- All ages (default)
- Teen (13+) - violence, mild language
- Mature (18+) - strong language, alcohol, some violence
- Adult (18+, limited distribution) - sexual themes, graphic violence

### Reporting Tools

**Report options**:
- Inappropriate content (CSAM, hate speech, harassment)
- Spam (promotional, repetitive)
- Scam (money loss, fraud)
- Bugs (technical issue)
- Copyright (plagiarism)

**Response time**:
- CSAM: 1 hour (escalated to authorities)
- Harassment: 4 hours
- Spam: 24 hours
- Other: 3-5 days

---

## Success Metrics

**Engagement targets** (EOY 2026):

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Avg posts/creator/month | 8 | 2 | Growing |
| Avg shares per world | 50 | 5 | Growing |
| Follow-through rate (shared→visit) | 15% | 8% | Improving |
| Review submission rate | 10% | 3% | Growing |
| Social features usage | 40% of users | 12% | Growing |

---

**Last Updated**: January 15, 2026  
**Version**: 1.0 Complete
