import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "Scene Overview",
    description: "The VR shop example (examples/03-vr-shop) is a complete virtual storefront with browsable products and a checkout flow.",
    lines: [
      { content: "// examples/03-vr-shop/scene.holo — overview", annotation: "full example" },
      { content: "scene VRShop {", highlight: true },
      { content: "  environment: Retail" },
      { content: '  music: "assets/audio/shop-ambient.mp3"' },
      { content: "" },
      { content: "  objects: [" },
      { content: "    ShopFloor,       // floor + shelving" },
      { content: "    ProductDisplays, // 6 pedestals" },
      { content: "    ShoppingCart,    // grabbable cart" },
      { content: "    CheckoutPanel,   // UI payment panel" },
      { content: "    MirrorWall,      // try-on AR mirror" },
      { content: "  ]" },
      { content: "" },
      { content: "  state: CartState  // cart + total", type: "added" as const, annotation: "shared state" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Product Display Objects",
    description: "Each product sits on a pedestal — a PBR sphere mesh with the DisplayPedestal trait that shows price on hover.",
    lines: [
      { content: "object ProductHelmet {", highlight: true },
      { content: "  mesh: import('assets/models/helmet.glb')", annotation: "GLTF import" },
      { content: "  position: [1.5, 1.1, 0]" },
      { content: "" },
      { content: "  material: PBRMaterial {", type: "added" as const },
      { content: '    albedo: "#2c3e50"', type: "added" as const },
      { content: "    metallic: 0.8  roughness: 0.2", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait DisplayPedestal {", type: "added" as const, annotation: "product UI" },
      { content: '    productId: "helmet-001"', type: "added" as const },
      { content: '    name: "VR Explorer Helmet"', type: "added" as const },
      { content: "    price: 49.99", type: "added" as const },
      { content: '    currency: "USD"', type: "added" as const },
      { content: "    rotateOnDisplay: true", type: "added" as const, annotation: "slow spin" },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Cart Interaction",
    description: "Products are Grabbable — drop them in the CartArea proximity trigger to add them to the shopping cart state.",
    lines: [
      { content: "// Product item — grab and drop into cart", annotation: "drag to purchase" },
      { content: "object HelmetItem {", highlight: true },
      { content: "  mesh: import('assets/models/helmet-mini.glb')" },
      { content: "  trait Grabbable { hapticFeedback: true }", type: "added" as const },
      { content: "}" },
      { content: "" },
      { content: "// Cart drop zone", type: "added" as const },
      { content: "object CartArea {", type: "added" as const },
      { content: "  mesh: Box  scale: [0.5, 0.5, 0.5]  visible: false", type: "added" as const, annotation: "invisible trigger" },
      { content: "" },
      { content: "  trait ProximityTrigger {", type: "added" as const },
      { content: "    radius: 0.4", type: "added" as const },
      { content: '    onObjectEnter: "add_to_cart"', type: "added" as const, annotation: "state action" },
      { content: "  }", type: "added" as const },
      { content: "}", type: "added" as const },
      { content: "" },
      { content: 'on "add_to_cart" (item) {', type: "added" as const },
      { content: "  state.cart.push(item.productId)", type: "added" as const },
      { content: "  state.total += item.price", type: "added" as const, annotation: "auto-computed" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Checkout Panel",
    description: "A floating UIPanel with a total display and a checkout button — built entirely from HoloScript UI traits.",
    lines: [
      { content: "object CheckoutPanel {", highlight: true },
      { content: "  mesh: Plane  scale: [1.2, 0.8, 0.01]" },
      { content: "  position: [0, 1.5, -2]" },
      { content: "" },
      { content: "  trait UIPanel {", type: "added" as const, annotation: "2D UI in 3D" },
      { content: "    layout: Column" },
      { content: "" },
      { content: "    UIText {", type: "added" as const },
      { content: '      bind: "Total: $" + state.total.toFixed(2)', type: "added" as const, annotation: "reactive binding" },
      { content: "      fontSize: 32  color: '#ffffff'", type: "added" as const },
      { content: "    }", type: "added" as const },
      { content: "" },
      { content: "    UIButton {", type: "added" as const },
      { content: '      label: "Checkout"', type: "added" as const },
      { content: '      onPress: "open_payment"', type: "added" as const, annotation: "triggers flow" },
      { content: '      disabled: "state.cart.length === 0"', type: "added" as const },
      { content: "    }", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Multiplayer Sync",
    description: "Add MultiplayerSync to any object and its state is broadcast to all participants in the session in real-time.",
    lines: [
      { content: "// Sync the cart state across all visitors", annotation: "real-time collab" },
      { content: "state CartState {", highlight: true },
      { content: "  cart: string[]  = []", annotation: "product IDs" },
      { content: "  total: number   = 0.0" },
      { content: "" },
      { content: "  trait MultiplayerSync {", type: "added" as const, annotation: "broadcast changes" },
      { content: "    syncFields: [cart, total]", type: "added" as const },
      { content: '    conflictPolicy: "last-write-wins"', type: "added" as const },
      { content: "    broadcastRate: 10", type: "added" as const, annotation: "10 updates/sec" },
      { content: "  }", type: "added" as const },
      { content: "}" },
      { content: "" },
      { content: "// Shopper avatars — also synced", type: "added" as const },
      { content: "object ShopperAvatar {", type: "added" as const },
      { content: "  trait RemotePlayer { showNameTag: true }", type: "added" as const, annotation: "each visitor" },
      { content: "}", type: "added" as const },
    ],
  },
];

export const VRShopExample: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="VR Shop Example"
          subtitle="Build a complete virtual storefront — browse, grab, and purchase in VR"
          tag="Full Example"
        />
      </Sequence>
      {STEPS.map((step, i) => (
        <Sequence key={i} from={TITLE_FRAMES + i * STEP_FRAMES} durationInFrames={STEP_FRAMES}>
          <CodeStep
            title={step.title}
            description={step.description}
            language="holo"
            lines={step.lines}
            stepNumber={i + 1}
            totalSteps={STEPS.length}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
