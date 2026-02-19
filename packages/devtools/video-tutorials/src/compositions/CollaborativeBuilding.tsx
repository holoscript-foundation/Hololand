import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { CodeStep } from "../components/CodeStep";

const STEPS = [
  {
    title: "CollabSession",
    description: "Create or join a collaborative session — every participant gets the same scene state in real-time.",
    lines: [
      { content: 'import { CollabSession } from "@hololand/platform/collab"', highlight: true },
      { content: "" },
      { content: "// Host: create a new session", annotation: "returns room code" },
      { content: "const session = await CollabSession.create({", type: "added" as const },
      { content: "  scene: app.getActiveScene(),", type: "added" as const },
      { content: '  name: "Arch Review Session",', type: "added" as const },
      { content: "  maxParticipants: 8,", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "console.log('Room code:', session.roomId)  // 'HOLO-3847'", type: "added" as const, annotation: "share with team" },
      { content: "" },
      { content: "// Guest: join an existing session", annotation: "with room code" },
      { content: "const session = await CollabSession.join('HOLO-3847')", type: "added" as const },
      { content: "const participants = session.participants  // list of users", type: "added" as const },
    ],
  },
  {
    title: "Shared State",
    description: "Any state change in the session is automatically broadcast to all participants — objects update in real-time.",
    lines: [
      { content: "// All state mutations are automatically synced", annotation: "real-time broadcast" },
      { content: "session.on('stateChange', (change) => {", highlight: true },
      { content: "  console.log('Updated by:', change.author)", type: "added" as const },
      { content: "  console.log('Field:', change.field, '→', change.value)", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "// Move an object — broadcast to all", annotation: "all see it move" },
      { content: "session.mutate(() => {", type: "added" as const },
      { content: "  scene.getObject('TableA').position = [2, 0, 1]", type: "added" as const },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "// Add a new object — all participants see it appear", annotation: "collaborative edit" },
      { content: "session.mutate(() => {", type: "added" as const },
      { content: "  scene.addObject({ id: 'NewChair', mesh: 'Chair', position: [0,0,2] })", type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "Object Ownership",
    description: "Claim exclusive ownership of an object before editing — prevents simultaneous conflicting edits.",
    lines: [
      { content: "// Claim an object before editing", annotation: "prevents conflicts" },
      { content: "const lock = await session.claim('TableA')", highlight: true },
      { content: "" },
      { content: "if (lock.acquired) {", type: "added" as const },
      { content: "  // Only you can move this object now", annotation: "exclusive edit" },
      { content: "  session.mutate(() => {", type: "added" as const },
      { content: "    scene.getObject('TableA').position = [3, 0, 0]", type: "added" as const },
      { content: "  })", type: "added" as const },
      { content: "  lock.release()  // let others edit it", type: "added" as const, annotation: "always release!" },
      { content: "} else {", type: "added" as const },
      { content: "  console.log('Claimed by:', lock.owner)  // show who has it", type: "added" as const },
      { content: "}", type: "added" as const },
      { content: "" },
      { content: "// Auto-release after 30s if you disconnect", annotation: "safety timeout" },
      { content: "// CollabSession handles this automatically", dim: true },
    ],
  },
  {
    title: "Chat and Voice",
    description: "Built-in spatial text chat and proximity voice chat — voices fade with distance, just like real life.",
    lines: [
      { content: "// Text chat", annotation: "all participants" },
      { content: "session.chat.send('Moving the table to the north wall')", highlight: true },
      { content: "" },
      { content: "session.chat.on('message', (msg) => {", type: "added" as const },
      { content: "  ui.showChatBubble(msg.author, msg.text)", type: "added" as const, annotation: "above avatar" },
      { content: "})", type: "added" as const },
      { content: "" },
      { content: "// Spatial voice chat", annotation: "proximity audio" },
      { content: "const voice = session.voice", type: "added" as const },
      { content: "await voice.enable()", type: "added" as const, annotation: "request mic" },
      { content: "" },
      { content: "voice.configure({", type: "added" as const },
      { content: "  spatial: true,", type: "added" as const, annotation: "3D positional" },
      { content: "  maxDistance: 10,", type: "added" as const, annotation: "10m radius" },
      { content: "  echoCancellation: true,", type: "added" as const },
      { content: "  noiseSuppression: true,", type: "added" as const },
      { content: "})", type: "added" as const },
    ],
  },
  {
    title: "Persistence",
    description: "Save the collaborative session to Supabase — reload it later and all participants can rejoin.",
    lines: [
      { content: "// Save session to Supabase", annotation: "cloud persistence" },
      { content: "const saved = await session.save({", highlight: true },
      { content: "  name: 'Arch Review v2 - Final'", highlight: true },
      { content: "})", type: "added" as const },
      { content: "console.log('Saved as:', saved.id)  // 'sess_abc123'", type: "added" as const, annotation: "shareable link" },
      { content: "" },
      { content: "// Load a saved session", annotation: "resume later" },
      { content: "const session = await CollabSession.load('sess_abc123')", type: "added" as const },
      { content: "await app.loadScene(session.scene)  // restore scene", type: "added" as const },
      { content: "" },
      { content: "// Participants can rejoin", annotation: "by session ID" },
      { content: "const rejoined = await CollabSession.join('sess_abc123')", type: "added" as const },
      { content: "// Full scene history + all objects restored", type: "added" as const, annotation: "complete restore" },
    ],
  },
];

export const CollaborativeBuilding: React.FC = () => {
  const { fps } = useVideoConfig();
  const TITLE_FRAMES = fps * 3;
  const STEP_FRAMES = fps * 5;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard
          title="Collaborative Building"
          subtitle="Real-time multiplayer scene editing with @hololand/platform/collab"
          tag="Multiplayer"
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
