import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "Install & Setup",
    description: "Add the Babylon adapter to your project — then wire it into your HoloLandApp constructor.",
    lines: [
      { content: "# Install the adapter", annotation: "one dependency" },
      { content: "$ npm install @hololand/babylon-adapter", highlight: true },
      { content: "" },
      { content: 'import { BabylonAdapter } from "@hololand/babylon-adapter"', type: "added" as const },
      { content: 'import { HoloLandApp } from "@hololand/core"', type: "added" as const },
      { content: "" },
      { content: "const adapter = new BabylonAdapter({", type: "added" as const },
      { content: '  canvas: document.getElementById("xr-canvas") as HTMLCanvasElement,', type: "added" as const, annotation: "your canvas element" },
      { content: "  antialias: true,", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "const app = new HoloLandApp({ renderer: adapter })", type: "added" as const },
    ],
  },
  {
    title: "Configure the Engine",
    description: "Tune Babylon engine settings for device pixel ratio, hardware scaling, and canvas resize handling.",
    lines: [
      { content: "const adapter = new BabylonAdapter({", highlight: true },
      { content: "  canvas,", highlight: true },
      { content: "  antialias: true,", type: "added" as const },
      { content: "  adaptToDeviceRatio: true,", type: "added" as const, annotation: "retina displays" },
      { content: "  engineOptions: {", type: "added" as const },
      { content: "    preserveDrawingBuffer: true,", type: "added" as const },
      { content: "    stencil: true,", type: "added" as const },
      { content: "    disableWebGL2Support: false,", type: "added" as const, annotation: "prefer WebGL2" },
      { content: "  },", type: "added" as const },
      { content: "  autoResize: true,", type: "added" as const, annotation: "window resize handler" },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "PBR Materials",
    description: "The BabylonAdapter automatically translates HoloScript PBRMaterial properties to Babylon.js PBRMaterial.",
    lines: [
      { content: "// In your .holo scene file:", annotation: "what you write" },
      { content: "object Rock {", highlight: true },
      { content: "  mesh: Sphere" },
      { content: "  material: PBRMaterial {" },
      { content: '    albedo: "#7a6a5a"' },
      { content: "    roughness: 0.9" },
      { content: "    metallic: 0.0" },
      { content: "  }" },
      { content: "}" },
      { content: "" },
      { content: "// BabylonAdapter produces:", annotation: "auto-translated" },
      { content: "const mat = new BABYLON.PBRMaterial('Rock_mat', scene)", type: "added" as const },
      { content: "mat.albedoColor = BABYLON.Color3.FromHexString('#7a6a5a')", type: "added" as const },
      { content: "mat.roughness = 0.9  mat.metallic = 0.0", type: "added" as const },
    ],
  },
  {
    title: "WebXR Integration",
    description: "Enable immersive VR sessions with a single option — the adapter handles the WebXR session lifecycle.",
    lines: [
      { content: "const adapter = new BabylonAdapter({", highlight: true },
      { content: "  canvas,", highlight: true },
      { content: "  xr: {", type: "added" as const, annotation: "WebXR config" },
      { content: '    mode: "immersive-vr",', type: "added" as const },
      { content: "    optionalFeatures: [", type: "added" as const },
      { content: '      "hand-tracking",', type: "added" as const, annotation: "hand controllers" },
      { content: '      "layers",', type: "added" as const },
      { content: "    ],", type: "added" as const },
      { content: "    onSessionStart: () => app.setXRMode(true),", type: "added" as const },
      { content: "    onSessionEnd: () => app.setXRMode(false),", type: "added" as const },
      { content: "  },", type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "Performance Tips",
    description: "Optimize your Babylon scene with LOD groups, frustum culling, and on-demand texture streaming.",
    lines: [
      { content: "// LOD groups in .holo", annotation: "auto-applied by adapter" },
      { content: "object BigRock {", highlight: true },
      { content: "  mesh: Rock_High  lod: { 0: Rock_High, 20: Rock_Med, 50: Rock_Low }" },
      { content: "}" },
      { content: "" },
      { content: "// Adapter-level performance options", type: "added" as const },
      { content: "const adapter = new BabylonAdapter({", type: "added" as const },
      { content: "  performance: {", type: "added" as const },
      { content: "    frustumCulling: true,", type: "added" as const, annotation: "skip off-screen" },
      { content: "    occlusionCulling: true,", type: "added" as const },
      { content: '    textureStreaming: "progressive",', type: "added" as const, annotation: "load on demand" },
      { content: "    maxTextureSize: 2048,", type: "added" as const },
      { content: "  },", type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
];

export const BabylonAdapterDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Babylon.js Adapter"
          subtitle="Render HoloLand scenes in the browser with Babylon.js"
          tag="Adapters"
          packageName="@hololand/babylon-adapter"
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
