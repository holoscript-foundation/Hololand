# Microsoft Mesh & HoloLens 2 Migration Guide

**For Enterprise Customers Transitioning to HoloLand**

**Version:** 1.0.0
**Date:** February 28, 2026
**Audience:** Enterprise IT Leaders, XR Program Managers, Solution Architects

---

## Executive Summary

Microsoft has discontinued its spatial computing stack:

- **Microsoft Mesh** -- Retired December 1, 2025. The Mesh PC app, Quest app, mesh.cloud.microsoft website, and Immersive Space (3D) view in Teams have all been shut down.
- **Dynamics 365 Remote Assist & Guides** -- End of support December 31, 2026. No security updates, bug fixes, or technical support after this date.
- **HoloLens 2** -- Production discontinued. Security and critical fixes end December 31, 2027. No successor hardware announced.

This creates a $23+ billion enterprise spatial computing vacuum (market projected to reach $23.45B by 2030 at 42.53% CAGR). Organizations currently using Microsoft's mixed reality stack must migrate before support ends or face frozen capabilities, shrinking spare hardware pools, and growing security/compliance risk.

**HoloLand** is positioned as the comprehensive migration target: an open, dual-purpose VR/AR platform with 43+ packages, enterprise-grade security, multi-agent orchestration, and cross-platform deployment to 20+ targets including Unity, Unreal, WebXR, VisionOS, and OpenXR.

---

## Table of Contents

1. [What Microsoft Is Discontinuing](#1-what-microsoft-is-discontinuing)
2. [Critical Timeline for Enterprise Customers](#2-critical-timeline-for-enterprise-customers)
3. [Risk Assessment: Staying on Microsoft's Stack](#3-risk-assessment-staying-on-microsofts-stack)
4. [Why HoloLand: Platform Comparison](#4-why-hololand-platform-comparison)
5. [Migration Paths by Use Case](#5-migration-paths-by-use-case)
6. [Technical Migration Guide](#6-technical-migration-guide)
7. [Enterprise Feature Mapping](#7-enterprise-feature-mapping)
8. [Deployment Options](#8-deployment-options)
9. [Pricing and Licensing](#9-pricing-and-licensing)
10. [Migration Checklist](#10-migration-checklist)
11. [FAQ](#11-faq)
12. [Getting Started](#12-getting-started)

---

## 1. What Microsoft Is Discontinuing

### Microsoft Mesh (Retired December 1, 2025)

Microsoft Mesh was an enterprise collaboration platform that enabled immersive 3D meetings and shared virtual spaces. As of December 1, 2025, Microsoft has retired:

| Component | Status |
|-----------|--------|
| Mesh app (Microsoft Store) | Retired |
| Mesh app (Quest headsets) | Retired |
| mesh.cloud.microsoft website | Retired |
| Immersive Space (3D) view in Teams Meetings | Retired |
| Mesh Toolkit (Unity development) | Retired (June 24, 2025) |
| Custom Mesh environments | No longer deployable |

**Partial replacement:** Microsoft launched "Immersive Events" in Teams, but with significant limitations -- supports only 16 participants vs. Mesh's 330.

### Dynamics 365 Remote Assist & Guides (EOL December 31, 2026)

| Product | End of Support | Last Purchase Date |
|---------|----------------|-------------------|
| Dynamics 365 Remote Assist | December 31, 2026 | November 1, 2025 |
| Dynamics 365 Guides | December 31, 2026 | November 1, 2025 |

After December 31, 2026: No security updates, no bug fixes, no technical support. Microsoft has not released a direct replacement product. Instead, they are directing customers to third-party solutions on the Microsoft Marketplace.

### HoloLens 2 Hardware (EOL December 31, 2027)

| Milestone | Date |
|-----------|------|
| Production discontinued | October 2024 |
| Final feature release | Shipped |
| "Last Time Buy" | First-come, first-served (limited stock) |
| Security/critical fixes end | December 31, 2027 |
| Customer & developer support end | December 31, 2027 |

No HoloLens 3 has been announced. Microsoft has exited mixed reality hardware entirely.

---

## 2. Critical Timeline for Enterprise Customers

```
2025 Q4          2026 Q1-Q2         2026 Q3-Q4        2027 Q1-Q4
  |                  |                  |                  |
  v                  v                  v                  v
Mesh RETIRED    MIGRATION           D365 Remote      HoloLens 2
(Dec 1 2025)    WINDOW              Assist & Guides   EOL
                (Best time           EOL (Dec 31)      (Dec 31 2027)
                 to start)

                 [========= YOU ARE HERE (Feb 2026) =========]
                 10 months until Dynamics 365 MR tools lose support
                 22 months until HoloLens 2 loses all support
```

**Urgency:** Organizations should begin migration planning immediately. The optimal migration window is Q1-Q2 2026, providing time for pilot programs, content migration, user training, and validation before the December 2026 Dynamics 365 deadline.

---

## 3. Risk Assessment: Staying on Microsoft's Stack

### Immediate Risks (Now)
- No new Mesh environments can be deployed
- Mesh Toolkit no longer supported for custom development
- No purchase path for new Dynamics 365 MR licenses (after Nov 2025)

### Near-Term Risks (By December 2026)
- Dynamics 365 Remote Assist stops receiving security patches
- Dynamics 365 Guides stops receiving bug fixes
- Compliance frameworks (SOC 2, HIPAA, ISO 27001) may flag unsupported software
- No Microsoft technical support for troubleshooting

### Long-Term Risks (By December 2027)
- HoloLens 2 devices receive no security updates
- Hardware replacement parts become scarce
- Enterprise app deployment to HoloLens 2 becomes unsupported
- Regulatory audits may require removal of unsupported devices from networks

### Business Impact
- **Training programs** built on Guides lose support and update capability
- **Field service** workflows on Remote Assist become unsupportable
- **Custom Mesh environments** are permanently inaccessible
- **Capital investment** in HoloLens 2 hardware becomes stranded

---

## 4. Why HoloLand: Platform Comparison

### Platform Architecture

HoloLand is a dual-purpose platform serving both B2C (consumer VR/AR metaverse) and B2B (enterprise agent orchestration) markets:

| Capability | Microsoft Mesh (Retired) | HoloLand |
|------------|--------------------------|----------|
| **Max participants** | 330 | 32+ per world (scalable via server sharding) |
| **Custom environments** | Unity + Mesh Toolkit (retired) | HoloScript (open language) + 43 packages |
| **AI assistant** | None | Brittney AI (voice-to-world, code generation) |
| **Development approach** | Unity C# only | 5 creation tiers (voice, visual, script, code, SDK) |
| **Cross-platform** | PC, Quest | 20 compilation targets (Unity, Unreal, WebXR, VisionOS, OpenXR, etc.) |
| **AR capabilities** | HoloLens 2 only | WebXR AR, detection, tracking, anchors, rendering |
| **Collaboration** | Mesh-specific | CRDT state sync, WebRTC, Socket.io |
| **Security** | Azure AD | JWT, OAuth, Web3, zero-trust agent auth (RS256/Ed25519) |
| **Agent orchestration** | None | Multi-agent registry, choreography, negotiation |
| **Content creation** | Manual (Unity) | AI-assisted (voice commands, natural language) |
| **Open source** | No | 43 open-source packages |
| **Hardware lock-in** | HoloLens 2, Quest | Hardware-agnostic (any WebXR device) |

### Feature Depth

HoloLand's 43+ package ecosystem covers enterprise needs comprehensively:

**Core Platform:** Runtime engine, world physics, 3D renderer, React Three Fiber integration

**Enterprise Features:**
- OpenTelemetry observability
- Security hardening and audit logging
- Edge deployment support
- Rate limiting and multi-tenant isolation
- Agent identity and credential management
- Encrypted agent-to-agent messaging (AES-256-GCM)

**AR/VR Capabilities:**
- Surface and object detection
- Face, hand, and body tracking
- Spatial anchoring
- AR overlay rendering
- Haptic feedback for controllers and wearables
- Gesture and emotion recognition

**Collaboration:**
- CRDT-based collaborative editing (conflict-free)
- Voice communication with 3D spatial audio
- Multiplayer networking (WebRTC + WebSocket)
- Portal-based world navigation

**Development Tools:**
- Browser-based Playground IDE (Monaco + Three.js)
- VS Code and IntelliJ extensions
- 25 reusable component templates
- Performance profiler and complexity analyzer

---

## 5. Migration Paths by Use Case

### 5A. Microsoft Mesh Immersive Meetings --> HoloLand Collaboration Worlds

**What you had:** 3D meeting spaces in Teams with avatars, spatial audio, shared whiteboards.

**What you get:** Fully customizable collaboration worlds with AI-generated environments, spatial audio, gesture recognition, and multi-agent support.

| Mesh Feature | HoloLand Equivalent | Package |
|--------------|---------------------|---------|
| Avatar presence | Social avatars with gestures | @hololand/social |
| Spatial audio | 3D positional audio + lip sync | @hololand/audio |
| Shared whiteboards | Interactive world objects (HoloScript) | @hololand/world |
| Custom environments | AI-generated or HoloScript-defined worlds | @hololand/builder, @hololand/ai-bridge |
| Teams integration | API integration + WebXR embedding | @hololand/network |
| Up to 330 users | 32+ per world instance (shardable) | @hololand/network |

**Migration steps:**
1. Inventory existing Mesh environments and their use cases
2. Map each environment to a HoloLand world template (office, gallery, collaboration, analytics)
3. Recreate environments using Brittney AI voice commands or HoloScript
4. Configure multi-user access and permissions
5. Train users on HoloLand's interface (simpler than Mesh -- voice-driven)
6. Deploy via WebXR (no app installation required)

### 5B. Dynamics 365 Remote Assist --> HoloLand Remote Collaboration

**What you had:** Real-time video calling with AR annotations for field service technicians.

**What you get:** Spatial collaboration worlds with AR overlay, annotation tools, and AI-powered assistance.

| Remote Assist Feature | HoloLand Equivalent | Package |
|----------------------|---------------------|---------|
| Live video with AR annotations | AR renderer with spatial annotations | @hololand/ar-renderer |
| Remote expert guidance | Voice + gesture + world sharing | @hololand/voice, @hololand/social |
| Asset/document sharing | World assets (models, textures, documents) | @hololand/streaming |
| Call recording | Analytics events + session recording | Platform analytics |
| Dynamics 365 integration | REST API integration | Platform backend API |

**Migration steps:**
1. Document current Remote Assist workflows and user roles
2. Create dedicated service worlds for each use case (field service, training, quality inspection)
3. Configure AR capabilities for mobile devices (WebXR AR mode)
4. Set up voice communication channels
5. Build annotation and documentation workflows in HoloScript
6. Train field service teams on new interface
7. Pilot with non-critical workflows first

### 5C. Dynamics 365 Guides --> HoloLand Interactive Training

**What you had:** Step-by-step holographic instructions anchored to physical equipment.

**What you get:** AI-generated training worlds with spatial anchoring, procedural guidance, and performance analytics.

| Guides Feature | HoloLand Equivalent | Package |
|----------------|---------------------|---------|
| Step-by-step instructions | HoloScript-defined procedural guides | @holoscript/components |
| Holographic anchoring | AR spatial anchors | @hololand/ar-anchors |
| 3D model placement | World asset management | @hololand/world |
| Operator tracking | Analytics events + completion tracking | Platform analytics |
| Content authoring | Brittney AI + Builder + Playground IDE | @hololand/builder |
| Branching logic | HoloScript conditional flows | @holoscript/core |

**Content migration:**
1. Export Guides content using Microsoft's Content Migration Tool (available in public preview)
2. Convert 3D assets to glTF/GLB format (HoloLand's native format)
3. Recreate step sequences in HoloScript
4. Map spatial anchors to HoloLand's AR anchor system
5. Validate training effectiveness with pilot users
6. Deploy across devices (phones, tablets, headsets via WebXR)

### 5D. Custom HoloLens 2 Applications --> HoloLand Cross-Platform Apps

**What you had:** Custom Unity apps deployed to HoloLens 2 via Microsoft Store or MDM.

**What you get:** Cross-platform spatial applications deployable to 20+ targets from a single codebase.

| HoloLens 2 Custom App | HoloLand Equivalent |
|------------------------|---------------------|
| Unity C# codebase | HoloScript or Unity adapter |
| HoloLens 2 deployment only | 20 compilation targets |
| MRTK interaction toolkit | HoloLand gesture/haptic packages |
| Azure Spatial Anchors | @hololand/ar-anchors (WebXR-based) |
| Windows Holographic APIs | WebXR + OpenXR standards |

**Migration approach:**
1. Audit existing Unity projects for MRTK and HoloLens-specific dependencies
2. Identify portable business logic vs. platform-specific code
3. Choose migration path:
   - **Option A:** Port to HoloScript for maximum cross-platform reach
   - **Option B:** Use HoloLand's Unity adapter to wrap existing Unity code
   - **Option C:** Hybrid approach -- HoloScript for new features, Unity adapter for legacy
4. Replace MRTK calls with HoloLand gesture/haptic APIs
5. Replace Azure Spatial Anchors with @hololand/ar-anchors
6. Test across target platforms (Quest, WebXR, mobile)
7. Deploy through HoloLand platform or standalone builds

---

## 6. Technical Migration Guide

### 6A. Architecture Mapping

```
MICROSOFT STACK (RETIRING)          HOLOLAND STACK (MIGRATION TARGET)
=============================       ================================

Azure Active Directory         -->  JWT + OAuth + Web3 Auth
  (Identity)                        (@hololand/platform backend)

Azure Spatial Anchors          -->  @hololand/ar-anchors
  (AR Anchoring)                    (WebXR-based, hardware-agnostic)

MRTK (Mixed Reality Toolkit)   -->  @hololand/gestures + @hololand/haptics
  (Interaction)                     + @hololand/voice

Azure Communication Services   -->  @hololand/network + @hololand/voice
  (Real-time Comms)                 (WebRTC + Socket.io)

Azure Digital Twins            -->  @hololand/world + @hololand/pcg
  (IoT/Spatial)                     (Scene graph + procedural generation)

Unity + Mesh Toolkit           -->  HoloScript + @hololand/builder
  (Development)                     (or Unity adapter for existing code)

Dynamics 365 Dataverse         -->  PostgreSQL + REST API
  (Data Layer)                      (HoloLand platform backend)

Microsoft Teams Integration    -->  WebXR embedding + API integration
  (Collaboration)                   (@hololand/network)
```

### 6B. Authentication Migration

**From Azure AD to HoloLand Auth:**

HoloLand supports multiple authentication methods. For enterprises migrating from Azure AD:

1. **OAuth integration** -- HoloLand supports Google, GitHub, Discord OAuth. Azure AD can be added as a custom OAuth provider via the platform backend.
2. **JWT-based sessions** -- Standard JWT token flow with refresh tokens.
3. **Web3 authentication** -- Wallet-based auth for decentralized identity.
4. **Agent authentication** -- Zero-trust RS256/Ed25519 for automated systems.

Enterprise SSO (SAML/OIDC) integration is available through the enterprise tier.

### 6C. Data Migration

**Exporting from Microsoft:**

1. **Mesh environments:** No export path available (environments are no longer accessible). Recreate in HoloLand using AI-assisted world building.
2. **Dynamics 365 Guides content:** Use Microsoft's Content Migration Tool to export from Dataverse. Convert 3D assets to glTF/GLB.
3. **Remote Assist recordings:** Export from Dynamics 365 storage before EOL.
4. **Azure Spatial Anchors:** Export anchor data and spatial maps. Convert to HoloLand anchor format.

**Importing into HoloLand:**

```
# World creation via API
POST /api/worlds
{
  "name": "Training Floor - Assembly Line 3",
  "description": "Migrated from Dynamics 365 Guides",
  "template": "collaboration",
  "isPublic": false,
  "tags": ["training", "manufacturing", "migrated-from-mesh"]
}

# Asset upload
POST /api/worlds/{worldId}/assets
Content-Type: multipart/form-data
{
  "type": "model",
  "name": "assembly-station.glb",
  "file": <glTF/GLB binary>
}
```

### 6D. 3D Asset Compatibility

| Source Format | HoloLand Support | Notes |
|---------------|-----------------|-------|
| glTF/GLB | Native support | Preferred format |
| FBX | Conversion required | Use Blender or FBX2glTF |
| OBJ | Supported | Limited material support |
| USD/USDZ | Supported via adapter | For Apple ecosystem |
| Unity AssetBundle | Via Unity adapter | For existing Unity assets |

---

## 7. Enterprise Feature Mapping

### Security and Compliance

| Requirement | Microsoft Mesh | HoloLand |
|-------------|----------------|----------|
| SSO/SAML | Azure AD | OAuth + custom OIDC (enterprise tier) |
| MFA | Azure MFA | Platform-configurable |
| Data encryption at rest | Azure-managed | PostgreSQL encryption + Secrets Manager |
| Data encryption in transit | TLS 1.2+ | TLS 1.2+ via ALB |
| Audit logging | Azure Monitor | Agent action logs + analytics events |
| Role-based access | Azure AD roles | World permissions + agent permissions |
| Network isolation | Azure VNET | AWS VPC Multi-AZ |
| Compliance certifications | SOC 2, ISO 27001 (Azure) | AWS infrastructure compliance (SOC 2 eligible) |

### Observability

HoloLand includes enterprise-grade observability:
- **OpenTelemetry** integration for distributed tracing
- **CloudWatch** logging, metrics, and alarms
- **Agent action logs** with full audit trail
- **Analytics events** for usage tracking (visits, portal clicks, world loads, chat messages)
- **Performance profiling** with budget presets

### Multi-Tenancy

HoloLand's platform backend supports multi-tenant isolation:
- Per-organization world namespaces
- Tenant-scoped API keys and permissions
- Isolated agent registries per enterprise account
- Configurable data residency

---

## 8. Deployment Options

### Option A: HoloLand Cloud (Recommended for Most)

- Hosted on AWS (Multi-AZ, ECS Fargate)
- Managed PostgreSQL + Redis
- Automatic scaling
- Starting at ~$200/month for infrastructure

### Option B: Self-Hosted

- Deploy HoloLand backend on your own infrastructure
- Full control over data residency
- Requires DevOps expertise
- Docker + PostgreSQL + Redis

### Option C: Hybrid

- HoloLand cloud for world hosting and rendering
- On-premise data stores for sensitive content
- API bridge between cloud and on-premise systems

### Client Deployment

| Client Type | Device | Technology |
|-------------|--------|------------|
| Web browser | Any PC/Mac | WebXR (no installation) |
| Mobile | iOS/Android | WebXR + PWA |
| VR headset | Quest 2/3/Pro, PSVR2 | WebXR or native build |
| AR glasses | Any WebXR-capable | WebXR AR mode |
| Desktop app | Windows/Mac/Linux | Tauri-based native app |
| Custom hardware | OpenXR-compatible | OpenXR compilation target |

---

## 9. Pricing and Licensing

### Open Source (43 Packages)

HoloLand's core platform is open source. Organizations can self-host at no licensing cost.

### Enterprise Tier

| Feature | Included |
|---------|----------|
| Enterprise SSO (SAML/OIDC) | Yes |
| Priority support | Yes |
| Custom agent development | Professional services |
| White-label instances | Phase 8 (2028+) |
| SLA guarantee | 99.9% uptime |
| Data residency options | Yes |

**Pricing:** $500 - $5,000/month per team (based on usage and features)

### Creator Economy

Organizations can also monetize internal content:
- 70/30 revenue share for creator content
- In-world purchases and subscriptions
- Asset marketplace with commission structure

---

## 10. Migration Checklist

### Phase 1: Assessment (Weeks 1-2)

- [ ] Inventory all Microsoft Mesh environments and their business owners
- [ ] Inventory all Dynamics 365 Guides content and training programs
- [ ] Inventory all Dynamics 365 Remote Assist workflows
- [ ] Inventory all custom HoloLens 2 applications
- [ ] Inventory all HoloLens 2 hardware (count, condition, deployment locations)
- [ ] Document all Azure Spatial Anchors deployments
- [ ] Identify stakeholders and migration sponsors
- [ ] Assess compliance requirements (industry-specific regulations)

### Phase 2: Planning (Weeks 3-4)

- [ ] Map each use case to HoloLand migration path (Section 5)
- [ ] Determine deployment model (cloud, self-hosted, hybrid)
- [ ] Define success criteria for migration
- [ ] Create migration timeline with dependencies
- [ ] Estimate budget (infrastructure, professional services, training)
- [ ] Identify pilot programs (non-critical workflows first)
- [ ] Plan user training and change management

### Phase 3: Environment Setup (Weeks 5-6)

- [ ] Provision HoloLand platform (cloud or self-hosted)
- [ ] Configure authentication (SSO integration, user provisioning)
- [ ] Set up network connectivity (VPN if hybrid)
- [ ] Configure monitoring and alerting
- [ ] Create organizational world structure (namespaces, permissions)
- [ ] Set up development environment for content creators

### Phase 4: Content Migration (Weeks 7-10)

- [ ] Export Dynamics 365 Guides content (before Dec 2026 EOL)
- [ ] Convert 3D assets to glTF/GLB format
- [ ] Recreate Mesh environments in HoloLand (using AI-assisted tools)
- [ ] Port Remote Assist workflows to HoloLand collaboration worlds
- [ ] Migrate custom HoloLens 2 apps (via Unity adapter or HoloScript port)
- [ ] Validate content accuracy and completeness

### Phase 5: Pilot and Validation (Weeks 11-14)

- [ ] Deploy pilot program with selected user group
- [ ] Gather user feedback on experience quality
- [ ] Validate training effectiveness (for Guides migrations)
- [ ] Test all critical workflows end-to-end
- [ ] Performance test under expected load
- [ ] Security audit of new deployment

### Phase 6: Full Deployment (Weeks 15-18)

- [ ] Roll out to all users in phased waves
- [ ] Decommission Microsoft Mesh integrations (already retired)
- [ ] Plan Dynamics 365 MR license non-renewal
- [ ] Plan HoloLens 2 hardware retirement or repurpose
- [ ] Establish ongoing support and content management processes
- [ ] Document lessons learned

---

## 11. FAQ

### General

**Q: Is there a direct Microsoft replacement for Mesh?**
A: No. Microsoft replaced Mesh with a limited "Immersive Events" feature in Teams that supports only 16 participants (vs. Mesh's 330). There is no direct replacement for custom environments, the Mesh Toolkit, or the full immersive experience.

**Q: Will Microsoft release a HoloLens 3?**
A: No successor has been announced. Microsoft has exited mixed reality hardware. All indications suggest HoloLens is discontinued permanently.

**Q: Can I still purchase Dynamics 365 Remote Assist or Guides licenses?**
A: No. The last purchase date was November 1, 2025. Existing licenses remain active until December 31, 2026.

### Technical

**Q: Can I reuse my existing Unity/MRTK code?**
A: Yes. HoloLand provides a Unity adapter that can wrap existing Unity projects. However, MRTK-specific interactions will need to be replaced with HoloLand's gesture and haptic packages.

**Q: Does HoloLand support Azure AD for authentication?**
A: HoloLand supports OAuth-based authentication. Azure AD (now Microsoft Entra ID) can be configured as a custom OAuth/OIDC provider in the enterprise tier.

**Q: What headsets does HoloLand support?**
A: HoloLand targets WebXR, which means it works on any WebXR-compatible device: Meta Quest 2/3/Pro, Apple Vision Pro, PSVR2, and any WebXR-capable browser on PC/mobile. It also compiles to OpenXR and VisionOS natively.

**Q: How does HoloLand handle data residency requirements?**
A: The self-hosted deployment option gives full control over data location. The cloud option runs on AWS with configurable region selection.

**Q: Can HoloLand run offline?**
A: Yes. HoloLand supports edge deployment with local caching and asset streaming. Worlds can be pre-loaded for offline use.

### Migration

**Q: How long does a typical enterprise migration take?**
A: 14-18 weeks for a full migration (assessment through deployment). Simple use cases (meeting spaces, basic training) can be migrated in 4-6 weeks.

**Q: What if our Mesh environments are already inaccessible?**
A: Since Mesh was retired December 1, 2025, custom environments are no longer accessible. You will need to recreate them in HoloLand. Brittney AI can generate environments from natural language descriptions, significantly accelerating this process.

**Q: Can we run Microsoft's stack and HoloLand in parallel during migration?**
A: Yes. HoloLand operates independently. You can run both systems side-by-side during the transition, with users gradually migrating workflows.

---

## 12. Getting Started

### Quick Start (5 Minutes)

1. **Visit** [https://central.hololand.io](https://central.hololand.io)
2. **Create an account** (email, Google OAuth, or Web3 wallet)
3. **Explore** existing worlds to understand the platform
4. **Create your first world** using voice commands:
   - "Create a meeting room with a presentation screen and seating for 20"
   - "Build a training floor with assembly stations and safety equipment"
   - "Design a product showroom with interactive displays"

### Enterprise Evaluation

For enterprise-scale evaluations and migration planning:

- **Platform:** [https://central.hololand.io](https://central.hololand.io)
- **Backend API:** [http://localhost:3001](http://localhost:3001) (self-hosted) or cloud endpoint
- **Documentation:** [https://github.com/brianonbased-dev/Hololand](https://github.com/brianonbased-dev/Hololand)
- **HoloScript Language:** [https://github.com/brianonbased-dev/HoloScript](https://github.com/brianonbased-dev/HoloScript)

### Developer Resources

| Resource | Description |
|----------|-------------|
| [QUICKSTART.md](../../QUICKSTART.md) | Platform setup guide |
| [API Reference](../API_REFERENCE.md) | REST API documentation |
| [HoloScript Language Reference](../HOLOSCRIPT_LANGUAGE_REFERENCE.md) | Language specification |
| [Creator Quickstart](../CREATOR_QUICKSTART.md) | Content creation guide |
| [Security Best Practices](../SECURITY_BEST_PRACTICES.md) | Enterprise security guide |
| [Architecture Decisions](../ARCHITECTURE_DECISIONS.md) | Technical architecture |
| [Hybrid Architecture](../../HYBRID_ARCHITECTURE.md) | B2C + B2B platform design |

---

## Appendix A: Competitive Landscape

For enterprises evaluating multiple migration options:

| Platform | Strengths | Limitations |
|----------|-----------|-------------|
| **HoloLand** | Open source, 20+ targets, AI-assisted, enterprise agents | Newer platform, growing ecosystem |
| Meta Horizon Workrooms | Meta Quest integration | Consumer-focused, limited enterprise features, vendor lock-in |
| Vizible | Low-code VR collaboration | Limited to presentations, no custom development |
| SimplyVideo | XR-enhanced video meetings | Meeting-only, no custom environments |
| Scope AR (WorkLink) | Industrial AR instructions | AR-only, no VR, no custom worlds |
| DigiLens ARGO | Enterprise smartglasses | Hardware-specific, limited software platform |
| Apple Vision Pro | Spatial computing quality | High cost ($3,499+), Apple ecosystem only |
| Nvidia Omniverse | Digital twin visualization | Complex, requires Nvidia GPUs, enterprise pricing |

---

## Appendix B: HoloLand Compilation Targets

HoloScript compiles to 20 targets from a single codebase:

| Category | Targets |
|----------|---------|
| **Game Engines** | Unity, Unreal, Godot |
| **Web** | Babylon.js, React Three Fiber, PlayCanvas, WebGPU, WASM |
| **Social VR** | VRChat |
| **Standards** | OpenXR |
| **Mobile** | iOS, Android, VisionOS |
| **Industrial** | Robotics (ROS2, MoveIt, Gazebo) |
| **Healthcare** | Medical (HL7 FHIR, DICOM) |
| **IoT** | MQTT, OPC-UA |

---

## Appendix C: Market Context

The spatial computing market is projected to grow significantly:

- **2025:** $3.98 billion (Mordor Intelligence)
- **2026:** ~87% growth recovery after 2025 contraction
- **2030:** $23.45 billion (42.53% CAGR)
- **2034:** $1,066 billion (Precedence Research, broader definition)

Enterprise adoption across manufacturing, healthcare, retail, automotive, and defense is the primary growth driver. Microsoft's exit from the space creates a significant addressable market for platforms that can absorb displaced enterprise customers.

---

*This guide is maintained by the HoloLand platform team. For enterprise migration inquiries, contact the HoloLand team through the platform repository or central.hololand.io.*

*Last updated: February 28, 2026*
