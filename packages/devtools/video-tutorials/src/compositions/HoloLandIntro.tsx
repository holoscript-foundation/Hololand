import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "What is HoloLand?",
    description: "HoloLand is the full VR/AR platform built on HoloScript — physics, rendering, AI, AR, and social in one stack.",
    lines: [
      { content: "// HoloLand ecosystem", annotation: "the full stack" },
      { content: 'import { HoloLandApp } from "@hololand/core"', highlight: true },
      { content: 'import { World } from "@hololand/world"', highlight: true },
      { content: 'import { BabylonAdapter } from "@hololand/babylon-adapter"', highlight: true },
      { content: 'import { Brittney } from "@hololand/brittney-service"', highlight: true },
      { content: "" },
      { content: "const app = new HoloLandApp({", type: "added" as const },
      { content: '  renderer: new BabylonAdapter(),', type: "added" as const },
      { content: "  physics: new World({ gravity: -9.8 }),", type: "added" as const },
      { content: '  ai: new Brittney({ model: "llama3.2" })', type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "Loading a .holo Scene",
    description: "Load and render any HoloScript scene — the runtime compiles it to your chosen renderer automatically.",
    lines: [
      { content: 'import { loadScene } from "@hololand/core"', highlight: true },
      { content: "" },
      { content: 'const scene = await loadScene("./scenes/garden.holo")', type: "added" as const, annotation: "parse + compile" },
      { content: "" },
      { content: "await app.mount(scene, {", type: "added" as const },
      { content: '  container: document.getElementById("canvas"),', type: "added" as const },
      { content: '  xr: { mode: "immersive-vr" },', type: "added" as const, annotation: "optional VR mode" },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "The Adapter System",
    description: "Swap rendering backends without changing your scene — Babylon.js, Three.js, Unity, and more.",
    lines: [
      { content: "// Dev: use Babylon.js in browser", annotation: "fast iteration" },
      { content: "const renderer = new BabylonAdapter()", highlight: true },
      { content: "" },
      { content: "// Production: export to native Unity", annotation: "ship to platform" },
      { content: "const renderer = new UnityAdapter()", highlight: true },
      { content: "" },
      { content: "// Same scene, different output", annotation: "write once" },
      { content: "app.setRenderer(renderer)", type: "added" as const },
      { content: "await app.render(scene)  // works with any adapter", type: "added" as const },
    ],
  },
  {
    title: "Physics with @hololand/world",
    description: "Full rigid body physics with gravity, collisions, and joints — powered by Rapier under the hood.",
    lines: [
      { content: 'import { World, RigidBody } from "@hololand/world"', highlight: true },
      { content: "" },
      { content: "const world = new World({ gravity: [0, -9.8, 0] })", type: "added" as const },
      { content: "" },
      { content: "// Sync physics to your scene", annotation: "runs at 60Hz" },
      { content: 'world.on("step", (bodies) => {', highlight: true },
      { content: "  bodies.forEach(b => scene.syncObject(b.id, b.transform))", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "world.step(1 / 60)  // advance simulation", type: "added" as const },
    ],
  },
  {
    title: "Getting Started",
    description: "Install the HoloLand CLI, create a project, and run the dev server in 3 commands.",
    lines: [
      { content: "# Install HoloLand CLI", annotation: "one-time setup" },
      { content: "$ npm install -g @hololand/cli", highlight: true },
      { content: "" },
      { content: "# Create a new project", annotation: "scaffolding" },
      { content: "$ hololand create my-vr-world --template starter", highlight: true },
      { content: "  ✓ Created my-vr-world/" },
      { content: "  ✓ Installed dependencies" },
      { content: "" },
      { content: "# Start the dev server", annotation: "live preview" },
      { content: "$ cd my-vr-world && hololand dev", highlight: true },
      { content: "  → http://localhost:5173 (2D preview)" },
      { content: "  → webxr://localhost:5173 (VR mode)" },
    ],
  },
];

export const HoloLandIntro: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Welcome to HoloLand"
          subtitle="The full-stack VR/AR platform — rendering, physics, AI, and social in one ecosystem"
          tag="HoloLand Intro"
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
