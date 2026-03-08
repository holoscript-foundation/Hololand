# Avatar Studio Bridge: HoloScript to VRM Pipeline

## Overview

This document details how HoloScript NPC compositions flow through the HoloLand Avatar Studio pipeline to produce industry-standard VRM avatars. The bridge enables seamless integration between HoloScript's declarative avatar syntax and the VRM export process, supporting cross-platform avatar deployment to VRChat, cluster, Vroid Hub, and any VRM-compatible platform.

**Key Components:**
1. **HoloScriptAvatarBridge.ts** - Bidirectional conversion between HoloScript and AvatarBlueprint
2. **VRMExporter.ts** - VRM export pipeline with quality presets
3. **AvatarMeshAssembler.ts** - 3D mesh generation from blueprint
4. **AssetCatalog** - Texture/mesh asset management
5. **PerformanceBudget** - Multi-tier performance budgeting system

---

## 1. HoloScript NPC Composition Processing

### 1.1 Input: HoloScript Avatar Declaration

HoloScript uses a declarative syntax for avatar/NPC definitions with composition blocks:

```holoscript
composition "Brittney Avatar" {

  // NPC metadata block
  npc "Brittney" {
    npc_type: "ai_assistant"
    model: "/models/brittney/brittney_v2.glb"
    dialogue_tree: "brittney_greeting"
  }

  // Spatial avatar object with decorators
  object "BrittneyAvatar" {
    @animated
    @spatial_audio
    @tracked
    @billboard

    geometry: "avatar"
    model: "/models/brittney/brittney_v2.glb"
    scale: [1, 1, 1]

    state {
      speaking: false
      thinking: false
      mood: "friendly"
      lipSyncLevel: 0
    }

    // Animation definitions
    animation blink {
      property: "morph.blink"
      keyframes: [
        { time: 0,   value: 0 }
        { time: 50,  value: 1 }
        { time: 150, value: 0 }
      ]
      loop: false
    }

    // Event handlers for expressions
    on_event("react", emotion) {
      state.mood = emotion
      if (emotion == "excited") {
        play("nod")
        play("talk_gesture_left")
      }
    }
  }
}
```

### 1.2 HoloScriptAvatarBridge: Parsing and Conversion

The `HoloScriptAvatarBridge` class provides bidirectional conversion:

#### **Method: `parseHoloScriptAvatar(source: string)`**

Parses HoloScript avatar blocks into intermediate `HoloScriptAvatarNode` format:

```typescript
export interface HoloScriptAvatarNode {
  type: 'avatar';
  id: string;              // e.g., "Brittney"
  name: string;            // Display name
  vrmUrl?: string;         // VRM export URL

  // Decorators parsed from @skeleton, @body, etc.
  skeleton?: {
    type: 'humanoid';
    ikEnabled: boolean;
  };
  body?: {
    preset: BodyPreset;    // 'slim' | 'average' | 'athletic' | 'heavy'
    height: number;
    gender?: GenderPresentation;
    skinColor?: string;
  };
  face?: {
    shape: FaceShape;      // 'oval' | 'round' | 'square' | 'heart'
  };
  expressive?: {
    blendShapes: boolean;  // Enable morph targets
    autoBlink: boolean;    // Auto-blink animation
  };

  // Child nodes
  hair?: {
    id: string;
    style: string;
    color: string;
    physics: boolean;
  };
  outfit?: {
    id: string;
    style: string;
    type: string;
  };

  // Event handlers
  handlers: {
    event: string;         // "pose_change", "expression_change"
    action: string;        // "sync_animation(pose)"
  }[];
}
```

**Parsing Logic:**

The parser uses regex patterns to extract decorator values and properties:

```typescript
// Extract @body decorator
const bodyMatch = line.match(/@body\(preset:\s*"(\w+)",\s*height:\s*([\d.]+)\)/);
if (bodyMatch) {
  node.body = {
    preset: bodyMatch[1] as BodyPreset,
    height: parseFloat(bodyMatch[2]),
  };
}

// Extract @skeleton decorator
const skelMatch = line.match(/@skeleton\(type:\s*"(\w+)",\s*ik_enabled:\s*(true|false)\)/);
if (skelMatch) {
  node.skeleton = {
    type: 'humanoid',
    ikEnabled: skelMatch[2] === 'true',
  };
}

// Extract event handlers
const handlerMatch = line.match(/@on_(\w+)\((\w+)\)\s*=>\s*(\w+)\((\w+)\)/);
if (handlerMatch) {
  node.handlers.push({
    event: handlerMatch[1],      // "pose_change"
    action: `${handlerMatch[3]}(${handlerMatch[4]})`, // "sync_animation(pose)"
  });
}
```

#### **Method: `holoScriptToBlueprint(node: HoloScriptAvatarNode)`**

Converts parsed node to `AvatarBlueprint` (the studio's internal format):

```typescript
holoScriptToBlueprint(node: HoloScriptAvatarNode): Partial<AvatarBlueprint> {
  const blueprint: Partial<AvatarBlueprint> = {
    name: node.name,
  };

  // Body configuration
  if (node.body) {
    blueprint.body = {
      preset: node.body.preset,
      genderPresentation: node.body.gender ?? 'androgynous',
      height: node.body.height,
      proportions: {
        headScale: 0.5,
        shoulderWidth: 0.5,
        chestSize: 0.5,
        waistSize: 0.5,
        hipWidth: 0.5,
        armLength: 0.5,
        legLength: 0.5,
        handSize: 0.5,
        footSize: 0.5,
        muscleTone: 0.3,
      },
      skinColor: { hex: node.body.skinColor ?? '#e0b896' },
    };
  }

  // Face configuration
  if (node.face) {
    blueprint.face = {
      shape: node.face.shape,
      morphs: {
        jawWidth: 0.5,
        jawHeight: 0.5,
        chinSize: 0.5,
        cheekboneHeight: 0.5,
        cheekFullness: 0.5,
        foreheadHeight: 0.5,
        browRidge: 0.3,
      },
      eyes: {
        shape: 'almond',
        irisColor: { hex: '#6b4423' },
        pupilSize: 0.5,
        separation: 0.5,
        tilt: 0.5,
        size: 0.5,
        scleraColor: { hex: '#ffffff' },
      },
      nose: {
        shape: 'straight',
        bridgeWidth: 0.5,
        tipHeight: 0.5,
        nostrilWidth: 0.5,
        size: 0.5,
      },
      mouth: {
        shape: 'medium',
        lipColor: { hex: '#c47070' },
        width: 0.5,
        upperFullness: 0.5,
        lowerFullness: 0.5,
      },
      eyebrows: {
        styleId: 'default',
        color: { hex: '#3d2b1f' },
        thickness: 0.5,
        archHeight: 0.5,
        height: 0.5,
      },
      ears: {
        size: 0.5,
        pointedness: 0.0,
        angle: 0.5,
      },
      faceOverlays: [],
    };
  }

  // Hair configuration
  if (node.hair) {
    blueprint.hair = {
      styleId: node.hair.style,
      primaryColor: { hex: node.hair.color },
      gradientPosition: 1.0,
      physics: node.hair.physics ? 'simple' : 'none',
      lengthFactor: 0.5,
      volume: 0.5,
    };
  }

  return blueprint;
}
```

#### **Method: `blueprintToHoloScript(blueprint: AvatarBlueprint, avatarId: string)`**

Converts `AvatarBlueprint` back to HoloScript (for export or editing):

```typescript
blueprintToHoloScript(blueprint: Readonly<AvatarBlueprint>, avatarId: string = 'player'): string {
  const lines: string[] = [];

  // Avatar node with decorators
  lines.push(`avatar#${avatarId}`);
  lines.push(`  @skeleton(type: "humanoid", ik_enabled: true)`);
  lines.push(`  @body(preset: "${blueprint.body.preset}", height: ${blueprint.body.height})`);
  lines.push(`  @face(shape: "${blueprint.face.shape}")`);
  lines.push(`  @expressive(blend_shapes: true, auto_blink: true)`);
  lines.push(`  @locomotion(style: "realistic", walk_speed: 1.4)`);
  lines.push(`{`);
  lines.push(`  name: "${blueprint.name}"`);

  if (blueprint.body.skinColor) {
    lines.push(`  skin_color: "${blueprint.body.skinColor.hex}"`);
  }

  // Expression event handlers
  lines.push(``);
  lines.push(`  @on_pose_change(pose) => sync_animation(pose)`);
  lines.push(`  @on_expression_change(emotion) => update_face(emotion)`);
  lines.push(`}`);

  // Hair child node
  lines.push(``);
  const hairPhysics = blueprint.hair.physics !== 'none';
  lines.push(`hair#${avatarId}_hair @hair(style: "${blueprint.hair.styleId}", physics: ${hairPhysics}) {`);
  lines.push(`  color: "${blueprint.hair.primaryColor.hex}"`);
  if (blueprint.hair.secondaryColor) {
    lines.push(`  secondary_color: "${blueprint.hair.secondaryColor.hex}"`);
  }
  lines.push(`  parent: "${avatarId}"`);
  lines.push(`}`);

  // Clothing child nodes
  for (const clothing of blueprint.clothing) {
    lines.push(``);
    const slotType = this.clothingSlotToHoloScript(clothing.slot);
    lines.push(`outfit#${avatarId}_${clothing.slot} @clothing(type: "${slotType}") {`);
    lines.push(`  style: "${clothing.assetId}"`);
    if (clothing.primaryColor) {
      lines.push(`  color: "${clothing.primaryColor.hex}"`);
    }
    lines.push(`  parent: "${avatarId}"`);
    lines.push(`}`);
  }

  return lines.join('\n');
}
```

---

## 2. VRM Export Process with Ready Player Me Schema Mapping

### 2.1 Export Pipeline Overview

The `VRMExporter` class converts `AvatarBlueprint` to VRM format through an 8-step pipeline:

```typescript
async export(
  blueprint: Readonly<AvatarBlueprint>,
  scene: THREE.Scene,
  config?: Partial<ExportConfig>,
  onProgress?: ExportProgressCallback,
): Promise<ExportResult>
```

**Pipeline Steps:**

1. **Validate Blueprint** (10% progress)
   - Check required fields (name, VRM metadata)
   - Validate height range (0.5-2.5m)
   - Verify standard expressions (happy, sad, angry, surprised, neutral)
   - Estimate polygon count and compare to budget

2. **Prepare Scene** (20% progress)
   - Clone source scene (don't modify preview)
   - Remove non-exportable objects (lights, grid, helpers)
   - Filter objects with `userData.noExport` flag

3. **Inject VRM Metadata** (35% progress)
   - Convert `VRMMetadata` to VRM 1.0 spec format
   - Store as glTF extensions in `scene.userData.vrm`

4. **Inject Expressions** (45% progress)
   - Map expression blend shape weights to VRM expression format
   - Configure morph target bindings
   - Set up material value overrides (texture swaps)

5. **Optimize Meshes** (55% progress)
   - Clamp texture resolution based on quality preset
   - Merge meshes with same material to reduce draw calls
   - Skip meshes with morph targets (cannot be merged)

6. **Performance Budget Check** (70% progress)
   - Count total polygons and draw calls
   - Generate warnings if exceeding budget

7. **Export to Binary** (80% progress)
   - Use Three.js GLTFExporter to generate binary
   - Include VRM extensions via `includeCustomExtensions`

8. **Finalize** (95% progress)
   - Calculate export statistics
   - Dispose cloned scene to free memory
   - Create Blob for download

### 2.2 VRM Metadata Injection

VRM metadata follows the VRM 1.0 specification and maps to Ready Player Me schema:

```typescript
private injectVRMMetadata(scene: THREE.Scene, meta: VRMMetadata): void {
  scene.userData.vrm = {
    specVersion: '1.0',
    meta: {
      name: meta.title,
      version: meta.version,
      authors: [meta.author],
      contactInformation: meta.contactInformation,
      references: meta.reference ? [meta.reference] : [],

      // Usage permissions (Ready Player Me compatibility)
      allowedUserName: meta.allowedUser,        // 'OnlyAuthor' | 'ExplicitlyLicensedPerson' | 'Everyone'
      violentUssageName: meta.violentUsage ? 'Allow' : 'Disallow',
      sexualUssageName: meta.sexualUsage ? 'Allow' : 'Disallow',
      commercialUssageName: meta.commercialUsage ? 'Allow' : 'Disallow',

      // License
      licenseName: meta.license,                // 'CC0' | 'CC_BY' | 'CC_BY_NC' | etc.
      otherLicenseUrl: meta.otherLicenseUrl ?? '',
    },
  };
}
```

**Default VRM Metadata:**

```typescript
export const DEFAULT_VRM_META: VRMMetadata = {
  title: 'HoloLand Avatar',
  description: 'Avatar created with HoloLand Avatar Studio',
  author: 'HoloLand User',
  version: '1.0',
  allowedUser: 'Everyone',
  violentUsage: false,
  sexualUsage: false,
  commercialUsage: true,
  license: 'CC_BY',
};
```

### 2.3 Expression Blend Shape Mapping

HoloScript's `@emotion` trait maps to VRM expressions via blend shapes:

```typescript
private injectExpressions(
  scene: THREE.Scene,
  expressions: readonly ExpressionPreset[],
): void {
  scene.userData.vrm = scene.userData.vrm ?? {};
  scene.userData.vrm.expressions = expressions.map((expr) => ({
    name: expr.name,           // "happy", "sad", "angry", etc.
    isBinary: false,           // Gradual transitions

    // Blend shape bindings
    binds: Object.entries(expr.blendShapeWeights).map(([morphName, weight]) => ({
      mesh: 0,                 // Resolved at export time
      index: 0,                // Resolved at export time
      weight: weight,          // 0.0 - 1.0
      morphTargetName: morphName,
    })),

    // Material value overrides (texture swaps for mouth shapes)
    materialValues: expr.textureOverrides
      ? Object.entries(expr.textureOverrides).map(([name, value]) => ({
          materialName: name,
          propertyName: '_MainTex',
          targetValue: value,
        }))
      : [],
  }));
}
```

**Standard VRM Expressions:**

From VRM 1.0 spec, mapped to HoloScript:

| VRM Expression | HoloScript Trait | Blend Shape Morphs |
|----------------|------------------|-------------------|
| `happy` | `@emotion(type: "happy")` | `mouthSmile: 1.0, eyeSquint: 0.5` |
| `sad` | `@emotion(type: "sad")` | `mouthFrown: 1.0, eyeSquint: 0.3` |
| `angry` | `@emotion(type: "angry")` | `browFurrow: 1.0, mouthFrown: 0.5` |
| `surprised` | `@emotion(type: "surprised")` | `eyeWide: 1.0, mouthOpen: 0.7` |
| `neutral` | `@emotion(type: "neutral")` | `(all morphs: 0.0)` |
| `blink` | `@morph(target: "blink")` | `eyeBlink: 1.0` |
| `aa` / `ih` / `ou` / `ee` / `oh` | `@morph(target: "lipSync_*")` | Viseme morphs for lip sync |

---

## 3. Asset Catalog Integration

### 3.1 Asset Catalog Structure

The `AssetCatalog` manages textures, meshes, and accessories for avatar customization:

```typescript
export interface CatalogAsset {
  id: string;                   // Unique asset ID
  name: string;                 // Display name
  category: AssetCategory;      // 'hair' | 'clothing' | 'accessory' | 'faceOverlay'
  subcategory?: string;         // 'short' | 'long' | 'curly' for hair
  tags: string[];               // For search filtering

  // Asset files
  thumbnailUrl: string;         // Preview image
  modelUrl: string;             // glTF/GLB model URL

  // Compatibility
  compatibleBodies: BodyPreset[];           // ['slim', 'average', 'athletic']
  compatibleGenders: GenderPresentation[];   // ['masculine', 'feminine', 'androgynous']

  // Performance metrics
  polyCount: number;            // Triangle count
  textureResolution: number;    // Max texture size (512, 1024, 2048, 4096)

  // Marketplace metadata
  creatorId: string;
  creatorName: string;
  price: number;                // 0 = free
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isDefault: boolean;           // Built-in asset

  // Customization
  colorableRegions?: string[];  // ['primary', 'secondary', 'trim']
  downloads: number;
  rating: number;
  reviewCount: number;
}
```

### 3.2 Asset Filtering and Search

Assets are filtered by performance budget and compatibility:

```typescript
async searchAssets(filter: {
  category?: AssetCategory;
  tags?: string[];
  maxPolyCount?: number;
  compatibleBody?: BodyPreset;
  compatibleGender?: GenderPresentation;
  priceRange?: [number, number];
  rarity?: string;
  creatorId?: string;
}): Promise<CatalogAsset[]>
```

**Example: Filtering hair for performance budget**

```typescript
const mobileHairAssets = await catalog.searchAssets({
  category: 'hair',
  maxPolyCount: 5000,              // Mobile budget
  compatibleBody: 'average',
  compatibleGender: 'androgynous',
});

// Result: Only hair styles with ≤5000 polys
```

### 3.3 Texture/Mesh Management

Assets are loaded on-demand and cached:

```typescript
// Load asset model
const hairModel = await catalog.loadAsset('hair-style-01');
// Returns: THREE.Group with SkinnedMesh

// Apply to avatar scene
scene.add(hairModel);

// Attach to avatar skeleton
const skeleton = avatar.skeleton;
hairModel.bind(skeleton);
```

**Asset Loading Process:**

1. Check cache for asset ID
2. If not cached, fetch from `modelUrl` (CDN or local)
3. Parse glTF/GLB using `GLTFLoader`
4. Extract mesh, materials, textures
5. Store in cache for reuse
6. Return `THREE.Group` ready for scene integration

---

## 4. Performance Budgeting System

### 4.1 Multi-Tier Performance Budgets

HoloLand supports three target platform tiers with different budgets:

```typescript
export interface PerformanceBudget {
  maxPolyCount: number;         // Maximum total triangles
  maxTextureMemoryMB: number;   // Maximum texture memory
  maxDrawCalls: number;         // Maximum draw calls (mesh count)
  targetPlatforms: ('desktop' | 'mobile' | 'quest' | 'visionpro')[];
}
```

**Default Budget (Desktop + Quest):**

```typescript
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxPolyCount: 70000,
  maxTextureMemoryMB: 75,
  maxDrawCalls: 32,
  targetPlatforms: ['desktop', 'quest'],
};
```

**Platform-Specific Budgets:**

| Platform | Max Polys | Max Textures (MB) | Max Draw Calls | Notes |
|----------|-----------|-------------------|----------------|-------|
| **Desktop VR** | 150,000 | 200 | 64 | High-end PCVR (Index, Vive Pro) |
| **Quest 2/3** | 70,000 | 75 | 32 | Mobile VR (default) |
| **Mobile AR** | 30,000 | 50 | 16 | iOS/Android ARKit/ARCore |
| **Vision Pro** | 100,000 | 150 | 48 | Apple Vision Pro (spatial computing) |

### 4.2 Quality Presets

Three quality presets adjust export settings for different platforms:

```typescript
const QUALITY_PRESETS: Record<ExportQuality, Partial<ExportConfig>> = {
  full: {
    textureResolution: 4096,
    optimizeMeshes: false,
    compressTextures: false,
    includePhysics: true,
    includeExpressions: true,
    includeAnimations: true,
  },
  optimized: {
    textureResolution: 2048,
    optimizeMeshes: true,
    targetPolyCount: 70000,      // Quest target
    compressTextures: true,
    includePhysics: true,
    includeExpressions: true,
    includeAnimations: false,
  },
  mobile: {
    textureResolution: 1024,
    optimizeMeshes: true,
    targetPolyCount: 30000,      // Mobile AR target
    compressTextures: true,
    includePhysics: false,       // Disable physics for mobile
    includeExpressions: true,
    includeAnimations: false,
  },
};
```

**Preset Usage:**

```typescript
// Export for Quest
const result = await exporter.export(blueprint, scene, {
  quality: 'optimized',
  format: 'vrm',
});

// Export for mobile AR
const mobileResult = await exporter.export(blueprint, scene, {
  quality: 'mobile',
  format: 'vrm',
});
```

### 4.3 Polygon Count and Draw Call Tracking

Real-time performance tracking during avatar assembly:

```typescript
private checkPerformanceBudget(
  scene: THREE.Scene,
  budget: PerformanceBudget,
): { warnings: string[] } {
  const warnings: string[] = [];
  let totalPolys = 0;
  let totalDrawCalls = 0;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;

      // Count polygons (triangles)
      if (geometry.index) {
        totalPolys += geometry.index.count / 3;
      } else {
        totalPolys += (geometry.getAttribute('position')?.count ?? 0) / 3;
      }

      // Count draw calls (1 per mesh)
      totalDrawCalls++;
    }
  });

  // Generate warnings if over budget
  if (totalPolys > budget.maxPolyCount) {
    warnings.push(
      `Polygon count (${totalPolys.toLocaleString()}) exceeds budget ` +
      `(${budget.maxPolyCount.toLocaleString()}).`
    );
  }

  if (totalDrawCalls > budget.maxDrawCalls) {
    warnings.push(
      `Draw calls (${totalDrawCalls}) exceeds budget (${budget.maxDrawCalls}). ` +
      `Consider merging meshes or reducing accessories.`
    );
  }

  return { warnings };
}
```

**Example Output:**

```
⚠ Polygon count (85,432) exceeds budget (70,000).
⚠ Draw calls (48) exceeds budget (32). Consider merging meshes or reducing accessories.
```

---

## 5. Animation Rigging from @skeleton and @morph Traits

### 5.1 Skeleton Configuration

HoloScript's `@skeleton` decorator maps to VRM humanoid skeleton:

```holoscript
avatar#player
  @skeleton(type: "humanoid", ik_enabled: true)
  @body(preset: "athletic", height: 1.8)
{
  name: "Player Avatar"
}
```

**VRM Humanoid Skeleton Mapping:**

The `@skeleton(type: "humanoid")` decorator ensures the exported VRM includes a full humanoid bone hierarchy:

```typescript
// VRM 1.0 Humanoid Bone Structure
const humanoidBones = {
  hips: 'Root',
  spine: 'Spine1',
  chest: 'Spine2',
  neck: 'Neck',
  head: 'Head',

  leftShoulder: 'LeftShoulder',
  leftUpperArm: 'LeftUpperArm',
  leftLowerArm: 'LeftLowerArm',
  leftHand: 'LeftHand',

  rightShoulder: 'RightShoulder',
  rightUpperArm: 'RightUpperArm',
  rightLowerArm: 'RightLowerArm',
  rightHand: 'RightHand',

  leftUpperLeg: 'LeftUpperLeg',
  leftLowerLeg: 'LeftLowerLeg',
  leftFoot: 'LeftFoot',

  rightUpperLeg: 'RightUpperLeg',
  rightLowerLeg: 'RightLowerLeg',
  rightFoot: 'RightFoot',

  // Optional finger bones
  leftThumbProximal: 'LeftThumbProximal',
  leftThumbIntermediate: 'LeftThumbIntermediate',
  leftThumbDistal: 'LeftThumbDistal',
  leftIndexProximal: 'LeftIndexProximal',
  // ... (total 56 bones for full hand tracking)
};
```

**IK (Inverse Kinematics) Support:**

When `ik_enabled: true`, the VRM exporter includes IK solver metadata:

```typescript
scene.userData.vrm.humanoid = {
  humanBones: humanoidBones,
  ikSolvers: [
    { target: 'leftHand', chain: ['leftShoulder', 'leftUpperArm', 'leftLowerArm'] },
    { target: 'rightHand', chain: ['rightShoulder', 'rightUpperArm', 'rightLowerArm'] },
    { target: 'leftFoot', chain: ['leftUpperLeg', 'leftLowerLeg'] },
    { target: 'rightFoot', chain: ['rightUpperLeg', 'rightLowerLeg'] },
  ],
};
```

### 5.2 Morph Target Configuration

HoloScript's `@morph` decorator defines blend shape targets for facial expressions:

```holoscript
animation blink {
  property: "morph.blink"
  keyframes: [
    { time: 0,   value: 0 }
    { time: 50,  value: 1 }
    { time: 150, value: 0 }
  ]
  loop: false
}

on_update(delta) {
  // Lip sync morphs
  morph.jawOpen    = state.speaking ? state.lipSyncLevel * 0.4 : 0
  morph.mouthOpen  = state.speaking ? state.lipSyncLevel * 0.6 : 0
  morph.lipSync_aa = state.speaking ? state.lipSyncLevel * 0.3 : 0
}
```

**Morph Target Export:**

Each morph target becomes a blend shape in the VRM file:

```typescript
// Face mesh with morph targets
const faceMesh = new THREE.SkinnedMesh(geometry, material);
faceMesh.morphTargetInfluences = [
  0,  // morph.blink
  0,  // morph.jawOpen
  0,  // morph.mouthOpen
  0,  // morph.lipSync_aa
  0,  // morph.lipSync_ih
  0,  // morph.lipSync_ou
  // ... up to 32 morph targets
];

faceMesh.morphTargetDictionary = {
  'blink': 0,
  'jawOpen': 1,
  'mouthOpen': 2,
  'lipSync_aa': 3,
  'lipSync_ih': 4,
  'lipSync_ou': 5,
  // ...
};
```

**Supported Morph Targets:**

| Morph Target | Purpose | VRM Mapping |
|--------------|---------|-------------|
| `blink` | Eye close | VRM `blink` expression |
| `blinkLeft` | Left eye close | VRM `blinkLeft` |
| `blinkRight` | Right eye close | VRM `blinkRight` |
| `jawOpen` | Jaw drop | VRM `aa` viseme |
| `mouthOpen` | Mouth wide | VRM `oh` viseme |
| `lipSync_aa` | Viseme A | VRM `aa` |
| `lipSync_ih` | Viseme I | VRM `ih` |
| `lipSync_ou` | Viseme O | VRM `ou` |
| `lipSync_ee` | Viseme E | VRM `ee` |
| `mouthSmile` | Smile expression | VRM `happy` |
| `mouthFrown` | Frown expression | VRM `sad` |
| `browFurrow` | Angry brow | VRM `angry` |
| `eyeWide` | Surprised eyes | VRM `surprised` |

### 5.3 Animation Binding

HoloScript animations are exported as glTF animation clips:

```typescript
// Export animation clips
const animations: THREE.AnimationClip[] = [];

// Idle float animation
const idleFloatTrack = new THREE.VectorKeyframeTrack(
  'BrittneyAvatar.position',
  [0, 3],                        // Time: 0s, 3s
  [0, 0, 0, 0, 0.05, 0]         // Position: [x, y, z] at each time
);

const idleFloatClip = new THREE.AnimationClip('idle_float', 3, [idleFloatTrack]);
idleFloatClip.duration = 3;
animations.push(idleFloatClip);

// Talk gesture animation
const talkGestureTrack = new THREE.QuaternionKeyframeTrack(
  'leftArm.quaternion',
  [0, 0.3, 0.6, 0.9],           // Time keyframes
  [/* quaternion values */]
);

const talkGestureClip = new THREE.AnimationClip('talk_gesture_left', 0.9, [talkGestureTrack]);
animations.push(talkGestureClip);

// Add to scene for export
scene.animations = animations;
```

---

## 6. Real-Time Facial Expression Mapping

### 6.1 Emotion to Blend Shape System

HoloScript's `@emotion` trait drives real-time blend shape updates:

```holoscript
on_event("react", emotion) {
  state.mood = emotion
  if (emotion == "excited") {
    play("nod")
    play("talk_gesture_left")
    play("talk_gesture_right")
  }
}
```

**Emotion → Blend Shape Mapping:**

```typescript
const EMOTION_BLEND_SHAPES: Record<string, Record<string, number>> = {
  happy: {
    mouthSmile: 1.0,
    eyeSquint: 0.5,
    cheekRaise: 0.3,
  },
  sad: {
    mouthFrown: 1.0,
    eyeSquint: 0.3,
    browInnerUp: 0.4,
  },
  angry: {
    browFurrow: 1.0,
    mouthFrown: 0.5,
    noseSneer: 0.3,
  },
  surprised: {
    eyeWide: 1.0,
    mouthOpen: 0.7,
    browInnerUp: 0.6,
  },
  neutral: {
    // All morphs set to 0
  },
  excited: {
    mouthSmile: 0.9,
    eyeWide: 0.5,
    mouthOpen: 0.3,
  },
  thinking: {
    browInnerUp: 0.4,
    mouthPucker: 0.3,
  },
};
```

**Runtime Expression Update:**

```typescript
// In HoloScript runtime
function updateExpression(emotion: string) {
  const blendShapes = EMOTION_BLEND_SHAPES[emotion];
  if (!blendShapes) return;

  // Smoothly transition blend shapes
  for (const [morphName, targetWeight] of Object.entries(blendShapes)) {
    const currentWeight = faceMesh.morphTargetInfluences[morphName];
    const newWeight = THREE.MathUtils.lerp(currentWeight, targetWeight, 0.1);
    faceMesh.morphTargetInfluences[morphName] = newWeight;
  }
}
```

### 6.2 Lip Sync Implementation

Real-time lip sync driven by audio analysis:

```holoscript
on_speech_audio_level(level) {
  state.lipSyncLevel = level
}

on_update(delta) {
  // Lip sync morphs
  morph.jawOpen    = state.speaking ? state.lipSyncLevel * 0.4 : 0
  morph.mouthOpen  = state.speaking ? state.lipSyncLevel * 0.6 : 0
  morph.lipSync_aa = state.speaking ? state.lipSyncLevel * 0.3 : 0
}
```

**Viseme Detection:**

For advanced lip sync, analyze audio to detect visemes (mouth shapes for phonemes):

```typescript
// Analyze audio buffer to detect viseme
function analyzeViseme(audioBuffer: Float32Array): string {
  const fft = performFFT(audioBuffer);
  const formants = detectFormants(fft);

  // Map formants to visemes
  if (formants.f1 < 500 && formants.f2 > 2000) return 'ee'; // "see"
  if (formants.f1 > 700 && formants.f2 < 1200) return 'aa'; // "father"
  if (formants.f1 > 500 && formants.f2 > 1500) return 'ih'; // "sit"
  if (formants.f1 < 400 && formants.f2 < 1000) return 'ou'; // "you"
  if (formants.f1 > 600 && formants.f2 > 1400) return 'oh'; // "go"

  return 'neutral';
}

// Update morph targets based on viseme
function updateLipSync(viseme: string, intensity: number) {
  // Clear all viseme morphs
  faceMesh.morphTargetInfluences['lipSync_aa'] = 0;
  faceMesh.morphTargetInfluences['lipSync_ih'] = 0;
  faceMesh.morphTargetInfluences['lipSync_ou'] = 0;
  faceMesh.morphTargetInfluences['lipSync_ee'] = 0;
  faceMesh.morphTargetInfluences['lipSync_oh'] = 0;

  // Set active viseme
  if (viseme !== 'neutral') {
    faceMesh.morphTargetInfluences[`lipSync_${viseme}`] = intensity;
  }

  // Add jaw movement
  faceMesh.morphTargetInfluences['jawOpen'] = intensity * 0.4;
  faceMesh.morphTargetInfluences['mouthOpen'] = intensity * 0.6;
}
```

---

## 7. Complete Code Examples

### 7.1 Full NPC Definition in HoloScript

```holoscript
composition "Guide NPC Avatar" {

  // NPC metadata
  npc "MuseumGuide" {
    npc_type: "tour_guide"
    model: "/models/guide/guide_v1.glb"
    dialogue_tree: "museum_tour_intro"
  }

  // Avatar with full rigging
  avatar#guide
    @skeleton(type: "humanoid", ik_enabled: true)
    @body(preset: "average", height: 1.75)
    @face(shape: "oval")
    @expressive(blend_shapes: true, auto_blink: true)
    @locomotion(style: "realistic", walk_speed: 1.2)
  {
    name: "Museum Guide"
    skin_color: "#d4a574"

    @on_pose_change(pose) => sync_animation(pose)
    @on_expression_change(emotion) => update_face(emotion)
  }

  // Hair
  hair#guide_hair @hair(style: "short-professional", physics: false) {
    color: "#3a2a1a"
    parent: "guide"
  }

  // Outfit
  outfit#guide_shirt @clothing(type: "upper_body") {
    style: "button-shirt"
    color: "#ffffff"
    parent: "guide"
  }

  outfit#guide_pants @clothing(type: "lower_body") {
    style: "slacks"
    color: "#1a1a2e"
    parent: "guide"
  }

  outfit#guide_shoes @clothing(type: "feet") {
    style: "dress-shoes"
    color: "#0f0f0f"
    parent: "guide"
  }

  // Accessories
  accessory#guide_badge @accessory(type: "custom") {
    style: "museum-badge"
    color: "#ffd700"
    parent: "guide"
  }

  accessory#guide_glasses @accessory(type: "glasses") {
    style: "reading-glasses"
    color: "#2a2a2a"
    parent: "guide"
  }
}
```

### 7.2 Resulting VRM Output Structure

After processing through the bridge and exporter, the output VRM file contains:

```json
{
  "asset": {
    "version": "2.0",
    "generator": "HoloLand Avatar Studio v1.0"
  },
  "scene": 0,
  "scenes": [
    {
      "name": "Museum Guide Avatar",
      "nodes": [0]
    }
  ],
  "nodes": [
    {
      "name": "Root",
      "children": [1, 2, 3, 4, 5],
      "skin": 0
    },
    {
      "name": "Body",
      "mesh": 0
    },
    {
      "name": "Hair",
      "mesh": 1
    },
    {
      "name": "Shirt",
      "mesh": 2
    },
    {
      "name": "Pants",
      "mesh": 3
    },
    {
      "name": "Shoes",
      "mesh": 4
    }
  ],
  "meshes": [
    {
      "name": "Body",
      "primitives": [
        {
          "attributes": {
            "POSITION": 0,
            "NORMAL": 1,
            "TEXCOORD_0": 2,
            "JOINTS_0": 3,
            "WEIGHTS_0": 4
          },
          "indices": 5,
          "material": 0,
          "targets": [
            {
              "POSITION": 6,
              "NORMAL": 7
            }
          ]
        }
      ],
      "weights": [0, 0, 0, 0, 0, 0, 0, 0]
    }
  ],
  "materials": [
    {
      "name": "Skin",
      "pbrMetallicRoughness": {
        "baseColorFactor": [0.83, 0.65, 0.45, 1.0],
        "metallicFactor": 0.0,
        "roughnessFactor": 0.8
      }
    }
  ],
  "skins": [
    {
      "name": "HumanoidSkeleton",
      "inverseBindMatrices": 8,
      "joints": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    }
  ],
  "extensions": {
    "VRMC_vrm": {
      "specVersion": "1.0",
      "meta": {
        "name": "Museum Guide",
        "version": "1.0.0",
        "authors": ["HoloLand User"],
        "allowedUserName": "Everyone",
        "violentUssageName": "Disallow",
        "sexualUssageName": "Disallow",
        "commercialUssageName": "Allow",
        "licenseName": "CC_BY"
      },
      "humanoid": {
        "humanBones": {
          "hips": {"node": 9},
          "spine": {"node": 10},
          "chest": {"node": 11},
          "neck": {"node": 12},
          "head": {"node": 13},
          "leftShoulder": {"node": 14},
          "leftUpperArm": {"node": 15},
          "leftLowerArm": {"node": 16},
          "leftHand": {"node": 17},
          "rightShoulder": {"node": 18},
          "rightUpperArm": {"node": 19},
          "rightLowerArm": {"node": 20},
          "rightHand": {"node": 21},
          "leftUpperLeg": {"node": 22},
          "leftLowerLeg": {"node": 23},
          "leftFoot": {"node": 24}
        }
      },
      "expressions": {
        "preset": {
          "happy": {
            "morphTargetBinds": [
              {
                "node": 1,
                "index": 0,
                "weight": 1.0
              },
              {
                "node": 1,
                "index": 1,
                "weight": 0.5
              }
            ]
          },
          "sad": {
            "morphTargetBinds": [
              {
                "node": 1,
                "index": 2,
                "weight": 1.0
              }
            ]
          },
          "angry": {
            "morphTargetBinds": [
              {
                "node": 1,
                "index": 3,
                "weight": 1.0
              }
            ]
          },
          "surprised": {
            "morphTargetBinds": [
              {
                "node": 1,
                "index": 4,
                "weight": 1.0
              }
            ]
          },
          "blink": {
            "morphTargetBinds": [
              {
                "node": 1,
                "index": 5,
                "weight": 1.0
              }
            ]
          }
        }
      }
    }
  }
}
```

**File Statistics:**

```
Export Result:
✓ Success
  File: museum-guide.vrm
  Size: 3.2 MB
  Poly Count: 42,350
  Vertex Count: 28,420
  Materials: 8
  Textures: 12
  Blend Shapes: 24
  Draw Calls: 6
  Export Duration: 2.3s

Performance Budget: PASSED
  Poly Count: 42,350 / 70,000 (60.5%)
  Draw Calls: 6 / 32 (18.8%)

Platform Compatibility:
  ✓ Desktop VR (Quest, PCVR)
  ✓ Mobile AR (iOS, Android)
  ✓ VRChat
  ✓ cluster
  ✓ Vroid Hub
```

---

## 8. Summary

The HoloLand Avatar Studio bridge provides a complete pipeline from HoloScript NPC declarations to production-ready VRM avatars:

1. **HoloScriptAvatarBridge** parses declarative HoloScript syntax (`@skeleton`, `@body`, `@morph`, `@emotion`) into `AvatarBlueprint` objects
2. **VRMExporter** converts blueprints to VRM 1.0 format with full metadata, expressions, and skeleton rigging
3. **AssetCatalog** manages textures, meshes, and accessories with performance budgeting
4. **PerformanceBudget** enforces poly count and draw call limits for Quest/desktop/mobile platforms
5. **Animation rigging** from `@skeleton` creates full humanoid bone hierarchies with optional IK
6. **Facial expressions** from `@emotion` and `@morph` map to VRM blend shapes for real-time lip sync and emotions

**Key Benefits:**

- **Cross-platform compatibility**: VRM avatars work in VRChat, cluster, Vroid Hub, and any VRM-compatible platform
- **Performance optimization**: Multi-tier budgets ensure avatars run smoothly on Quest, desktop, and mobile
- **Declarative syntax**: HoloScript provides clean, readable avatar definitions without manual rigging
- **Asset management**: Built-in catalog system with marketplace support and performance filtering
- **Real-time expressions**: Emotion-driven blend shapes and lip sync for lifelike avatars

**File Locations:**

- `packages/ar/avatar-studio/src/HoloScriptAvatarBridge.ts`
- `packages/ar/avatar-studio/src/VRMExporter.ts`
- `packages/ar/avatar-studio/src/AvatarMeshAssembler.ts`
- `packages/ar/avatar-studio/src/AssetCatalog.ts`
- `packages/ar/avatar-studio/src/types.ts`

**Example Files:**

- `examples/brittney-avatar.holo` - Full AI assistant avatar with animations
- `examples/agents/distributed-npc-state.holo` - NPCs with decentralized state
- `examples/perception-tests/07-cross-reality-agent-continuity.holo` - Cross-reality avatar embodiment

---

**Last Updated:** 2026-03-07
**Version:** 1.0
**Maintained By:** HoloLand Platform Team
