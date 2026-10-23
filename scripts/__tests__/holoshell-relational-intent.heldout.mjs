// Held-out set, written BEFORE scoring the new rule (claude1's point: the eight phrasings that
// found the bug cannot also prove the fix). Operational = should NOT be relational.
export const OPERATIONAL = [
  'I was wondering, is the network connection to the anchor up?',
  'can you tell me how much memory the laptop has free',
  'my jetson is at 90% memory, what should I do',
  'we need to grow the fleet by two boxes tonight',
  'I trust the receipt more than the dashboard, which one is right',
  'the miner did not grow its hashrate, check the fan curve',
  'you said the connection drops every hour, show me the log',
  'is our anchor present on the mesh right now',
  'listen for new tasks on the board and summarize them',
  'our memory store is on the eMMC, should it move to the NVMe',
];
export const RELATIONAL = [
  'do you remember what I told you about my dad',
  'I feel like you have been distant today',
  'what do you know about me so far',
  'who am I to you, honestly',
  'I trust you, do you trust me',
  'how are we doing, you and I',
  'can we grow together on this',
  'are you listening to me right now',
  'I need you present tonight, not just working',
  'tell me about our connection, is it real to you',
];
