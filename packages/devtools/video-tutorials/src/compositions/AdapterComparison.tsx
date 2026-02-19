import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "Same Scene, Two Renderers",
    description: "Load the exact same .holo scene file with either adapter — zero changes to your scene code.",
    lines: [
      { content: "// scene.holo — unchanged for both adapters", annotation: "write once" },
      { content: "scene Garden {", highlight: true },
      { content: "  environment: Outdoor" },
      { content: "  skybox: HDRISky { src: 'sunset.hdr' }" },
      { content: "  objects: [Tree, Bench, Fountain]" },
      { content: "}" },
      { content: "" },
      { content: "// With Babylon adapter", annotation: "enterprise features" },
      { content: "const app = new HoloLandApp({ renderer: new BabylonAdapter() })", type: "added" as const },
      { content: "await app.loadScene('./garden.holo')", type: "added" as const },
      { content: "" },
      { content: "// With Three adapter", annotation: "lighter bundle" },
      { content: "const app = new HoloLandApp({ renderer: new ThreeAdapter() })", type: "added" as const },
      { content: "await app.loadScene('./garden.holo')  // same file!", type: "added" as const },
    ],
  },
  {
    title: "Babylon: Enterprise Features",
    description: "Babylon.js shines for complex scenes — its built-in GUI, ActionManager, and Havok physics integration.",
    lines: [
      { content: "// Babylon-specific capabilities", annotation: "via BabylonAdapter" },
      { content: "const adapter = new BabylonAdapter({ canvas })", highlight: true },
      { content: "" },
      { content: "// Advanced GUI (GUI textures on meshes)", type: "added" as const },
      { content: 'const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(mesh)', type: "added" as const, annotation: "GUI on 3D mesh" },
      { content: "" },
      { content: "// ActionManager for complex event chains", type: "added" as const },
      { content: "mesh.actionManager = new BABYLON.ActionManager(scene)", type: "added" as const },
      { content: "// Havok physics (native WebAssembly)", type: "added" as const },
      { content: "const hk = await HavokPhysics()", type: "added" as const, annotation: "WASM physics" },
      { content: "new BABYLON.HavokPlugin(true, hk)", type: "added" as const },
      { content: "// Inspector for debugging", type: "added" as const },
      { content: "scene.debugLayer.show()", type: "added" as const, annotation: "scene inspector" },
    ],
  },
  {
    title: "Three: Lightweight & React-Native",
    description: "Three.js has a smaller bundle and a rich React ecosystem — perfect for web apps and React projects.",
    lines: [
      { content: "// Three.js bundle comparison", annotation: "approx gzipped" },
      { content: "BabylonAdapter  ~680kb gz", dim: true },
      { content: "ThreeAdapter    ~145kb gz", highlight: true, annotation: "4.7x smaller" },
      { content: "" },
      { content: "// React integration — works like any React component", annotation: "R3F ecosystem" },
      { content: "import { useHoloScene } from '@hololand/react-three'", type: "added" as const },
      { content: "" },
      { content: "function VRApp() {", type: "added" as const },
      { content: "  const { scene, objects } = useHoloScene('./lobby.holo')", type: "added" as const },
      { content: "  return <HoloCanvas>{scene}</HoloCanvas>", type: "added" as const, annotation: "React render" },
      { content: "}", type: "added" as const },
      { content: "" },
      { content: "// Ecosystem: Drei, Rapier, Postprocessing, XR", type: "added" as const, annotation: "@react-three/*" },
    ],
  },
  {
    title: "Switching at Runtime",
    description: "Swap renderers at runtime — useful for progressive enhancement or A/B testing rendering backends.",
    lines: [
      { content: "const app = new HoloLandApp({ renderer: new ThreeAdapter() })", highlight: true },
      { content: "await app.loadScene('./lobby.holo')", highlight: true },
      { content: "" },
      { content: "// User clicks 'Enable HD Mode'", annotation: "runtime swap" },
      { content: "async function upgradeRenderer() {", type: "added" as const },
      { content: "  const currentScene = app.getActiveScene()", type: "added" as const, annotation: "save state" },
      { content: "" },
      { content: "  await app.setRenderer(new BabylonAdapter({", type: "added" as const },
      { content: "    canvas: app.canvas,", type: "added" as const },
      { content: "    xr: { mode: 'immersive-vr' },", type: "added" as const },
      { content: "  }))", type: "added" as const },
      { content: "" },
      { content: "  await app.loadScene(currentScene)  // re-render", type: "added" as const, annotation: "same scene" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Decision Guide",
    description: "Choose your adapter based on your project's needs — here is the quick decision matrix.",
    lines: [
      { content: "// Use BabylonAdapter when:", annotation: "go Babylon if..." },
      { content: "//  ✓ Building a full standalone VR/AR app", highlight: true },
      { content: "//  ✓ Need built-in GUI, inspector, ActionManager" },
      { content: "//  ✓ Using Havok physics or advanced physics joints" },
      { content: "//  ✓ Target: native mobile VR headsets" },
      { content: "" },
      { content: "// Use ThreeAdapter when:", annotation: "go Three if..." },
      { content: "//  ✓ Building inside a React SPA", highlight: true },
      { content: "//  ✓ Bundle size is a constraint" },
      { content: "//  ✓ Using @react-three/fiber ecosystem (Drei, Rapier)" },
      { content: "//  ✓ Target: web browser, lightweight web experience" },
      { content: "" },
      { content: "// Both adapters support:", type: "added" as const, annotation: "shared features" },
      { content: "//  WebXR, PBR, spatial audio, LOD, shadows", type: "added" as const },
    ],
  },
];

export const AdapterComparison: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Adapter Comparison"
          subtitle="Babylon.js vs Three.js — choose the right renderer for your project"
          tag="Adapters"
        />
      </Sequence>
      {STEPS.map((step, i) => (
        <Sequence key={i} from={TITLE_FRAMES + i * STEP_FRAMES} durationInFrames={STEP_FRAMES}>
          <CodeStep
            title={step.title}
            description={step.description}
            language="typescript"
            lines={step.lines}
            stepNumber={i + 1}
            totalSteps={STEPS.length}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
