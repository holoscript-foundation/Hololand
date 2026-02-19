import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "The Room Floor",
    description: "Start with a flat plane mesh — a PBR material with realistic roughness, and a static physics collider.",
    lines: [
      { content: "object Floor {", highlight: true },
      { content: "  mesh: Plane" },
      { content: "  scale: [10, 1, 10]", annotation: "10m x 10m" },
      { content: "  position: [0, 0, 0]" },
      { content: "" },
      { content: "  material: PBRMaterial {", type: "added" as const },
      { content: '    albedo: "#c8b89a"', type: "added" as const, annotation: "warm wood tone" },
      { content: "    roughness: 0.8", type: "added" as const },
      { content: "    metallic: 0.0", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  trait StaticCollider {}", type: "added" as const, annotation: "physics floor" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Adding Walls",
    description: "Four box objects form the walls — each with a static collider so physics objects can't pass through.",
    lines: [
      { content: "object WallNorth {", highlight: true },
      { content: "  mesh: Box" },
      { content: "  scale: [10, 3, 0.2]", annotation: "width, height, depth" },
      { content: "  position: [0, 1.5, -5]" },
      { content: '  material: PBRMaterial { albedo: "#e8e0d4", roughness: 0.9 }' },
      { content: "  trait StaticCollider {}", type: "added" as const },
      { content: "}" },
      { content: "" },
      { content: "// Repeat for WallSouth, WallEast, WallWest", annotation: "mirror positions" },
      { content: "object WallSouth {", type: "added" as const },
      { content: "  mesh: Box  scale: [10, 3, 0.2]", type: "added" as const },
      { content: "  position: [0, 1.5, 5]  trait StaticCollider {}", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Door and Window",
    description: "Add an interactive door and a transparent glass window to make the room feel lived-in.",
    lines: [
      { content: "object Door {", highlight: true },
      { content: "  mesh: Box" },
      { content: "  scale: [1.2, 2.2, 0.1]" },
      { content: "  position: [2, 1.1, -4.95]" },
      { content: '  material: PBRMaterial { albedo: "#5c3d1e", roughness: 0.6 }' },
      { content: "" },
      { content: "  trait Interactable {", type: "added" as const, annotation: "clickable" },
      { content: '    onActivate: "toggle_open"', type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}" },
      { content: "" },
      { content: "object Window {", type: "added" as const },
      { content: "  mesh: Box  scale: [1.5, 1.0, 0.05]", type: "added" as const },
      { content: "  material: GlassMaterial { opacity: 0.3, tint: 0.9 }", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Lighting the Room",
    description: "A warm point light inside the room, an ambient fill light, and an emissive torch for atmosphere.",
    lines: [
      { content: "object RoomLight {", highlight: true },
      { content: "  light: PointLight" },
      { content: "  position: [0, 2.8, 0]", annotation: "near ceiling" },
      { content: "  intensity: 1.2" },
      { content: '  color: "#fff5e0"', annotation: "warm white" },
      { content: "  range: 12" },
      { content: "}" },
      { content: "" },
      { content: "object AmbientFill {", type: "added" as const },
      { content: "  light: AmbientLight  intensity: 0.3", type: "added" as const },
      { content: "}", type: "added" as const },
      { content: "" },
      { content: "object WallTorch {", type: "added" as const },
      { content: "  mesh: Cylinder  position: [-4.5, 1.5, -4.8]", type: "added" as const },
      { content: "  material: EmissiveMaterial { color: '#ff6b00', intensity: 3 }", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Ambient Audio",
    description: "Add background music that loops quietly — the AudioSource trait handles spatial audio automatically.",
    lines: [
      { content: "object RoomAudio {", highlight: true },
      { content: "  position: [0, 1, 0]", annotation: "center of room" },
      { content: "" },
      { content: "  trait AudioSource {", type: "added" as const },
      { content: '    src: "assets/audio/fireplace-ambient.mp3"', type: "added" as const, annotation: "your audio file" },
      { content: "    loop: true", type: "added" as const },
      { content: "    volume: 0.4", type: "added" as const },
      { content: "    spatial: true", type: "added" as const, annotation: "3D positional audio" },
      { content: "    maxDistance: 15", type: "added" as const },
      { content: "    rolloff: 2.0", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "}", type: "added" as const },
    ],
  },
];

export const BuildingAVRRoom: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Building a VR Room"
          subtitle="Floor, walls, lighting, and ambient music — your first complete VR space"
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
