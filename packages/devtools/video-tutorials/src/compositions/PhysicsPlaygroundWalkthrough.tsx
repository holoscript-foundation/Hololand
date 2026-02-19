import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "Scene Setup",
    description: "The physics playground example lives in examples/02-physics-playground — a flat arena with a few spawners.",
    lines: [
      { content: "// examples/02-physics-playground/scene.holo", annotation: "the full scene" },
      { content: "scene PhysicsPlayground {", highlight: true },
      { content: "  environment: Indoor" },
      { content: '  gravity: [0, -9.8, 0]', annotation: "Earth gravity" },
      { content: "" },
      { content: "  objects: [" },
      { content: "    Arena,         // walls + floor" },
      { content: "    CrateStack,    // stackable crates" },
      { content: "    BallLauncher,  // throwable balls" },
      { content: "    ExplosionBarrel, // trigger explosion" },
      { content: "    ResetButton,   // respawn everything" },
      { content: "  ]" },
      { content: "}" },
    ],
  },
  {
    title: "Stacking Objects",
    description: "Crates are placed at different Y positions — when the scene loads, they stack and settle under gravity.",
    lines: [
      { content: "// Spawn 5 crates at increasing heights", annotation: "auto-stacks" },
      { content: "group CrateStack {", highlight: true },
      { content: "  repeat 5 as i {", type: "added" as const, annotation: "loop syntax" },
      { content: "    object Crate_{i} {", type: "added" as const },
      { content: "      mesh: Box", type: "added" as const },
      { content: "      scale: [0.6, 0.6, 0.6]", type: "added" as const },
      { content: "      position: [0, i * 0.65, 0]", type: "added" as const, annotation: "stacked Y" },
      { content: "      material: PBRMaterial { albedo: '#8b5e3c', roughness: 0.8 }", type: "added" as const },
      { content: "" },
      { content: "      trait PhysicsBody {", type: "added" as const },
      { content: "        mass: 2.0", type: "added" as const, annotation: "2kg crate" },
      { content: "        friction: 0.7", type: "added" as const },
      { content: "        restitution: 0.2", type: "added" as const },
      { content: "      }", type: "added" as const },
      { content: "    }", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Throwable Objects",
    description: "Combine the Grabbable and PhysicsBody traits — when released from VR controller, the throw velocity is applied.",
    lines: [
      { content: "object ThrowBall {", highlight: true },
      { content: "  mesh: Sphere" },
      { content: "  scale: [0.2, 0.2, 0.2]" },
      { content: '  material: PBRMaterial { albedo: "#e74c3c", metallic: 0.3 }' },
      { content: "" },
      { content: "  trait PhysicsBody {", type: "added" as const },
      { content: "    mass: 0.5", type: "added" as const, annotation: "light ball" },
      { content: "    restitution: 0.6", type: "added" as const, annotation: "bouncy!" },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait Grabbable {", type: "added" as const },
      { content: "    throwForce: 1.5", type: "added" as const, annotation: "velocity multiplier" },
      { content: "    hapticFeedback: true", type: "added" as const, annotation: "controller rumble" },
      { content: "    snapToHand: true", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Explosion Trigger",
    description: "The explosion barrel uses RadialForce — when triggered, it pushes all nearby physics bodies outward.",
    lines: [
      { content: "object ExplosionBarrel {", highlight: true },
      { content: "  mesh: Cylinder  scale: [0.4, 0.8, 0.4]" },
      { content: '  material: PBRMaterial { albedo: "#e74c3c" }' },
      { content: "" },
      { content: "  trait Interactable {", type: "added" as const },
      { content: '    onActivate: "explode"', type: "added" as const, annotation: "VR trigger" },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait RadialForce {", type: "added" as const, annotation: "explosion" },
      { content: "    radius: 5.0", type: "added" as const, annotation: "5m blast radius" },
      { content: "    force: 800", type: "added" as const, annotation: "impulse strength" },
      { content: "    falloff: quadratic", type: "added" as const },
      { content: '    trigger: "explode"', type: "added" as const, annotation: "linked to action" },
      { content: "  }", type: "added" as const },
      { content: "}" },
    ],
  },
  {
    title: "Reset Mechanism",
    description: "A floating reset button respawns all physics objects to their original positions — handy for demos.",
    lines: [
      { content: "state playground {", highlight: true },
      { content: "  spawnPositions: map<string, Vector3>", annotation: "saved on load" },
      { content: "}" },
      { content: "" },
      { content: "object ResetButton {", type: "added" as const },
      { content: "  mesh: Box  scale: [0.3, 0.1, 0.3]", type: "added" as const },
      { content: "  position: [0, 1.2, -3]", type: "added" as const },
      { content: '  material: EmissiveMaterial { color: "#00ff88" }', type: "added" as const },
      { content: "" },
      { content: "  trait Interactable {", type: "added" as const },
      { content: '    label: "RESET"', type: "added" as const },
      { content: '    onActivate: "reset_playground"', type: "added" as const, annotation: "triggers reset" },
      { content: "  }", type: "added" as const },
      { content: "}", type: "added" as const },
      { content: "" },
      { content: 'on "reset_playground" {', type: "added" as const, annotation: "state action" },
      { content: "  playground.spawnPositions.forEach((pos, id) => {", type: "added" as const },
      { content: "    scene.getObject(id).respawn(pos)", type: "added" as const },
      { content: "  })", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
];

export const PhysicsPlaygroundWalkthrough: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Physics Playground"
          subtitle="Walk through the physics playground example — stacking, throwing, explosions"
          tag="Tutorial"
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
