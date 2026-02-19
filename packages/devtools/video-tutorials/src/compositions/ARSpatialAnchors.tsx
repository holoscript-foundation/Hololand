import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "What are Spatial Anchors?",
    description: "Spatial anchors bind virtual objects to real-world coordinates — place something once, and it stays there forever.",
    lines: [
      { content: "// Without anchors: objects drift on every session", annotation: "the problem" },
      { content: "scene.place(virtualChair, { x: 1.5, y: 0, z: -2 })", dim: true, annotation: "resets on reload" },
      { content: "" },
      { content: "// With spatial anchors: persistent placement", annotation: "the solution" },
      { content: 'import { AnchorManager } from "@hololand/ar/anchors"', highlight: true },
      { content: "" },
      { content: "const anchor = await AnchorManager.createAnchor({", type: "added" as const },
      { content: "  worldTransform: camera.worldTransform,", type: "added" as const, annotation: "real-world pose" },
      { content: "  object: virtualChair,", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "// Chair appears in the same real-world position", annotation: "every session" },
      { content: "// on any device that loads this anchor", type: "added" as const },
    ],
  },
  {
    title: "Create an Anchor",
    description: "Call AnchorManager.createAnchor() with the object and its desired world transform — returns an anchor ID.",
    lines: [
      { content: 'import { AnchorManager, WorldAnchor } from "@hololand/ar/anchors"', highlight: true },
      { content: "" },
      { content: "// Get the current AR camera transform", annotation: "where user is looking" },
      { content: "const hitResult = await arSession.hitTest(screenCenter)", type: "added" as const },
      { content: "" },
      { content: "const anchor: WorldAnchor = await AnchorManager.createAnchor({", type: "added" as const },
      { content: "  worldTransform: hitResult.worldTransform,", type: "added" as const, annotation: "real-world position" },
      { content: "  object: myHoloObject,", type: "added" as const, annotation: "the virtual object" },
      { content: "  persistent: true,", type: "added" as const, annotation: "survives app restart" },
      { content: "  label: 'living-room-lamp',", type: "added" as const, annotation: "human-readable ID" },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "console.log('Anchor ID:', anchor.id)  // 'anc_8f3a2b...'", type: "added" as const },
    ],
  },
  {
    title: "Save and Restore",
    description: "Persist anchors to device storage — on app launch, call loadAnchors() to restore all placed objects.",
    lines: [
      { content: "// After placing objects, save all anchors", annotation: "call before app close" },
      { content: "await AnchorManager.saveAll()", highlight: true, annotation: "writes to device storage" },
      { content: "" },
      { content: "// On app startup — restore everything", annotation: "call on mount" },
      { content: "async function initAR() {", type: "added" as const },
      { content: "  const anchors = await AnchorManager.loadAnchors()", type: "added" as const, annotation: "from device storage" },
      { content: "" },
      { content: "  for (const anchor of anchors) {", type: "added" as const },
      { content: "    await scene.placeAtAnchor(anchor.object, anchor)", type: "added" as const },
      { content: "    console.log(`Restored: ${anchor.label}`)", type: "added" as const },
      { content: "  }", type: "added" as const },
      { content: "" },
      { content: "  console.log(`${anchors.length} objects restored`)", type: "added" as const, annotation: "ready!" },
      { content: "}", type: "added" as const },
    ],
  },
  {
    title: "Cloud Anchors",
    description: "Share anchors across devices with CloudAnchorService — collaborators see the same objects in the same place.",
    lines: [
      { content: 'import { CloudAnchorService } from "@hololand/ar/cloud-anchors"', highlight: true },
      { content: "" },
      { content: "const cloud = new CloudAnchorService({", type: "added" as const },
      { content: '  provider: "google-arcore",', type: "added" as const, annotation: "or azure, niantic" },
      { content: "  apiKey: process.env.AR_API_KEY,", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "// Upload local anchor to cloud", annotation: "share with others" },
      { content: "const cloudAnchor = await cloud.hostAnchor(localAnchor)", type: "added" as const },
      { content: "const shareCode = cloudAnchor.id  // send to collaborators", type: "added" as const, annotation: "shareable ID" },
      { content: "" },
      { content: "// On another device — resolve the cloud anchor", annotation: "same real-world pos" },
      { content: "const resolved = await cloud.resolveAnchor(shareCode)", type: "added" as const },
      { content: "scene.placeAtAnchor(virtualObject, resolved)", type: "added" as const },
    ],
  },
  {
    title: "Anchor Events",
    description: "React to anchor lifecycle events — handle tracking loss, recovery, and position updates gracefully.",
    lines: [
      { content: "// Subscribe to anchor events", annotation: "full lifecycle" },
      { content: "anchor.on('found', (pose) => {", highlight: true, annotation: "tracking started" },
      { content: "  myObject.setVisible(true)", type: "added" as const },
      { content: "  myObject.setTransform(pose.worldTransform)", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "anchor.on('lost', () => {", type: "added" as const, annotation: "tracking lost" },
      { content: "  myObject.setVisible(false)  // hide when lost", type: "added" as const },
      { content: "  showTrackingLostUI()", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "anchor.on('updated', (pose) => {", type: "added" as const, annotation: "position refined" },
      { content: "  // Smooth update to refined position", type: "added" as const },
      { content: "  myObject.tweenTransform(pose.worldTransform, 0.3)", type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
];

export const ARSpatialAnchors: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="AR Spatial Anchors"
          subtitle="Persist virtual objects in the real world with @hololand/ar/anchors"
          tag="AR Features"
          packageName="@hololand/ar"
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
