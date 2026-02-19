import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "Scene Foundation",
    description: "Set the Forest environment, ground fog, ambient color, and the terrain plane that the whole scene builds on.",
    lines: [
      { content: "scene EnchantedForest {", highlight: true },
      { content: "  environment: Forest", annotation: "sky + HDRI preset" },
      { content: "  ambientColor: "#0a1a0a"", annotation: "deep green-black night" },
      { content: "  fog: {", type: "added" as const, annotation: "atmospheric fog" },
      { content: "    enabled: true", type: "added" as const },
      { content: "    density: 0.035", type: "added" as const },
      { content: "    color: "#1a2e1a"", type: "added" as const, annotation: "dark forest green" },
      { content: "    start: 10  end: 80", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "  object Terrain {", type: "added" as const },
      { content: "    mesh: HeightmapPlane { src: "assets/terrain/forest-hmap.png" }", type: "added" as const, annotation: "terrain mesh" },
      { content: "    scale: [100, 4, 100]", type: "added" as const },
      { content: "    material: PBRMaterial { albedo: "#2d4a1e", roughness: 0.95 }", type: "added" as const },
      { content: "    trait StaticCollider {}", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Tree Scatter",
    description: "Scatter 200 oak trees randomly across the terrain — each with random scale and Y-axis rotation for variety.",
    lines: [
      { content: "// Define reusable oak tree template", annotation: "used by scatter" },
      { content: "template OakTree {", highlight: true },
      { content: "  mesh: import("assets/models/oak-tree.glb")" },
      { content: "  material: PBRMaterial {" },
      { content: "    albedo: "#2d5016"  roughness: 0.9" },
      { content: "  }" },
      { content: "  trait StaticCollider { shape: Capsule }", type: "added" as const, annotation: "trunk collider" },
      { content: "}" },
      { content: "scatter OakTree 200 {", type: "added" as const },
      { content: "  area: [80, 80]", type: "added" as const, annotation: "80m x 80m zone" },
      { content: "  alignToTerrain: true", type: "added" as const, annotation: "stick to ground" },
      { content: "  scale: random(0.7, 1.6)", type: "added" as const, annotation: "size variation" },
      { content: "  rotation.y: random(0, 360)", type: "added" as const, annotation: "random facing" },
      { content: "  avoidRadius: 2.0", type: "added" as const, annotation: "no overlapping" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Firefly Particles",
    description: "A ParticleSystem emits hundreds of glowing fireflies — emissive spheres with a gentle Float animation.",
    lines: [
      { content: "object Fireflies {", highlight: true },
      { content: "  position: [0, 0.5, 0]", annotation: "near ground level" },
      { content: "" },
      { content: "  trait ParticleSystem {", type: "added" as const, annotation: "GPU particles" },
      { content: "    count: 400", type: "added" as const, annotation: "400 fireflies" },
      { content: "    spawnArea: Sphere { radius: 30 }", type: "added" as const },
      { content: "    particleMesh: Sphere { scale: 0.03 }", type: "added" as const },
      { content: "    material: EmissiveMaterial {", type: "added" as const },
      { content: "      color: "#aaff44"  intensity: 8", type: "added" as const, annotation: "bright glow" },
      { content: "    }", type: "added" as const },
      { content: "    lifetime: random(4.0, 8.0)", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait Float {", type: "added" as const, annotation: "idle animation" },
      { content: "    amplitude: 0.3  speed: 0.8  phase: random(0, 6.28)", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "NPC Wizard",
    description: "The wizard NPC patrols between waypoints and greets the player when approached — fully scripted in .holo.",
    lines: [
      { content: "object WizardNPC {", highlight: true },
      { content: "  mesh: import("assets/models/wizard.glb")" },
      { content: "  position: [5, 0, -3]" },
      { content: "" },
      { content: "  trait NPC {", type: "added" as const, annotation: "AI behavior" },
      { content: "    patrol: [", type: "added" as const },
      { content: "      [5, 0, -3],  [8, 0, 0],", type: "added" as const },
      { content: "      [5, 0, 4],   [0, 0, 2],", type: "added" as const, annotation: "waypoints" },
      { content: "    ]", type: "added" as const },
      { content: "    patrolSpeed: 1.2", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait Dialogue {", type: "added" as const },
      { content: "    Greeting: {", type: "added" as const },
      { content: "      trigger: proximity(3.0)", type: "added" as const, annotation: "3m range" },
      { content: "      lines: ["Welcome, traveller...", "Beware the shadows beyond."]", type: "added" as const },
      { content: "    }", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Audio Atmosphere",
    description: "Layer forest ambience sounds with reverb and distance falloff — building a fully immersive audio soundscape.",
    lines: [
      { content: "object ForestAudio {", highlight: true },
      { content: "  position: [0, 1, 0]", annotation: "scene center" },
      { content: "" },
      { content: "  trait AudioSource {", type: "added" as const },
      { content: "    src: "assets/audio/forest-night-ambience.mp3"", type: "added" as const, annotation: "crickets, wind" },
      { content: "    loop: true  volume: 0.6  spatial: false", type: "added" as const, annotation: "global ambient" },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait Reverb {", type: "added" as const, annotation: "space feel" },
      { content: "    preset: LargeOutdoor", type: "added" as const },
      { content: "    wetMix: 0.4  dryMix: 0.6", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
      { content: "" },
      { content: "// Campfire spatial 3D audio near fire object", type: "added" as const },
      { content: "object CampfireAudio {", type: "added" as const },
      { content: "  position: [0, 0.2, 0]", type: "added" as const },
      { content: "  trait AudioSource {", type: "added" as const },
      { content: "    src: "assets/audio/campfire-crackle.mp3"", type: "added" as const, annotation: "close crackling" },
      { content: "    spatial: true  maxDistance: 8  rolloff: 2", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
]; 

export const EnchantedForestDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Enchanted Forest"
          subtitle="Full scene walkthrough — trees, fog, fireflies, NPC wizard, ambient audio"
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