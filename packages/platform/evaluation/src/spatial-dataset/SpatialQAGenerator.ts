/**
 * Spatial QA Generator
 *
 * Generates spatial reasoning questions and ground-truth answers
 * from VR scene data. Creates diverse training examples across
 * 12 question types for XR spatial reasoning model training.
 *
 * @module spatial-dataset/SpatialQAGenerator
 */

import type {
  VRScene,
  SceneObject,
  SpatialQAExample,
  SpatialQuestionType,
  SpatialRelationType,
  Vector3,
} from './types';

// =============================================================================
// RNG
// =============================================================================

class RNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

// =============================================================================
// Question Template Engine
// =============================================================================

interface QuestionTemplate {
  type: SpatialQuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Minimum objects needed in scene */
  minObjects: number;
  /** Generate question/answer pair from scene */
  generate: (scene: VRScene, rng: RNG) => GeneratedQA | null;
}

interface GeneratedQA {
  question: string;
  answer: string;
  answerType: SpatialQAExample['answerType'];
  reasoningSteps: string[];
  involvedObjectIds: string[];
  testedRelations: SpatialRelationType[];
  viewpointDependent: boolean;
}

// =============================================================================
// Helper functions
// =============================================================================

function objectDesc(obj: SceneObject): string {
  return `the ${obj.material} ${obj.type.replace(/_/g, ' ')}`;
}

function distance3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function directionWord(from: Vector3, to: Vector3): string {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const angle = Math.atan2(dz, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return 'to the right';
  if (angle >= 22.5 && angle < 67.5) return 'to the front-right';
  if (angle >= 67.5 && angle < 112.5) return 'in front';
  if (angle >= 112.5 && angle < 157.5) return 'to the front-left';
  if (angle >= 157.5 || angle < -157.5) return 'to the left';
  if (angle >= -157.5 && angle < -112.5) return 'to the back-left';
  if (angle >= -112.5 && angle < -67.5) return 'behind';
  return 'to the back-right';
}

// =============================================================================
// Question Templates
// =============================================================================

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // --- Object Localization (Easy) ---
  {
    type: 'object-localization',
    difficulty: 'easy',
    minObjects: 2,
    generate: (scene, rng) => {
      const obj = rng.pick(scene.objects);
      const room = scene.rooms.find((r) => r.id === obj.roomId);
      const roomName = room?.name ?? 'the room';

      return {
        question: `Where is ${objectDesc(obj)} located?`,
        answer: `${objectDesc(obj)} is located in ${roomName} at approximately (${obj.transform.position.x.toFixed(1)}, ${obj.transform.position.y.toFixed(1)}, ${obj.transform.position.z.toFixed(1)}).`,
        answerType: 'text',
        reasoningSteps: [
          `Identify ${objectDesc(obj)} in the scene`,
          `Determine its room assignment: ${roomName}`,
          `Read its position coordinates`,
        ],
        involvedObjectIds: [obj.id],
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Spatial Relation (Easy) ---
  {
    type: 'spatial-relation',
    difficulty: 'easy',
    minObjects: 3,
    generate: (scene, rng) => {
      // Find an object with relationships
      const candidates = scene.objects.filter(
        (o) => o.relationships.length > 0,
      );
      if (candidates.length === 0) return null;

      const obj = rng.pick(candidates);
      const rel = rng.pick(obj.relationships);
      const target = scene.objects.find((o) => o.id === rel.targetId);
      if (!target) return null;

      const relWords: Record<string, string> = {
        'on-top-of': 'on top of',
        'under': 'under',
        'next-to': 'next to',
        'in-front-of': 'in front of',
        'behind': 'behind',
        'left-of': 'to the left of',
        'right-of': 'to the right of',
        'above': 'above',
        'below': 'below',
        'near': 'near',
        'adjacent': 'adjacent to',
      };

      return {
        question: `What is ${relWords[rel.type] ?? rel.type} ${objectDesc(target)}?`,
        answer: `${objectDesc(obj)} is ${relWords[rel.type] ?? rel.type} ${objectDesc(target)}.`,
        answerType: 'text',
        reasoningSteps: [
          `Find ${objectDesc(target)} in the scene`,
          `Check spatial relationships of nearby objects`,
          `Identify ${objectDesc(obj)} as ${rel.type} to it`,
        ],
        involvedObjectIds: [obj.id, target.id],
        testedRelations: [rel.type],
        viewpointDependent: false,
      };
    },
  },
  // --- Counting (Easy) ---
  {
    type: 'counting',
    difficulty: 'easy',
    minObjects: 3,
    generate: (scene, rng) => {
      const categories = [...new Set(scene.objects.map((o) => o.category))];
      const category = rng.pick(categories);
      const matching = scene.objects.filter((o) => o.category === category);
      const count = matching.length;

      const room = rng.pick(scene.rooms);
      const roomObjects = matching.filter((o) => o.roomId === room.id);

      return {
        question: `How many ${category}s are in ${room.name}?`,
        answer: `There are ${roomObjects.length} ${category}${roomObjects.length !== 1 ? 's' : ''} in ${room.name}.`,
        answerType: 'count',
        reasoningSteps: [
          `Identify all objects of category "${category}"`,
          `Filter to those in ${room.name}`,
          `Count: ${roomObjects.length}`,
        ],
        involvedObjectIds: roomObjects.map((o) => o.id),
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Room Classification (Easy) ---
  {
    type: 'room-classification',
    difficulty: 'easy',
    minObjects: 2,
    generate: (scene, rng) => {
      const room = rng.pick(scene.rooms);
      const roomObjects = scene.objects.filter((o) => o.roomId === room.id);
      const categories = roomObjects.map((o) => o.category);

      return {
        question: `What type of room contains ${objectDesc(rng.pick(roomObjects))}?`,
        answer: `This is a ${room.type.replace(/_/g, ' ')}. It contains ${roomObjects.length} objects including ${categories.slice(0, 3).join(', ')}.`,
        answerType: 'text',
        reasoningSteps: [
          `Locate the referenced object`,
          `Identify which room it belongs to`,
          `Classify room type based on contents`,
        ],
        involvedObjectIds: [roomObjects[0]?.id ?? ''],
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Distance Estimation (Medium) ---
  {
    type: 'distance-estimation',
    difficulty: 'medium',
    minObjects: 3,
    generate: (scene, rng) => {
      if (scene.objects.length < 2) return null;
      const objA = rng.pick(scene.objects);
      let objB = rng.pick(scene.objects);
      let attempts = 0;
      while (objB.id === objA.id && attempts < 10) {
        objB = rng.pick(scene.objects);
        attempts++;
      }
      if (objB.id === objA.id) return null;

      const dist = distance3D(
        objA.transform.position,
        objB.transform.position,
      );

      return {
        question: `Approximately how far is ${objectDesc(objA)} from ${objectDesc(objB)}?`,
        answer: `The distance between ${objectDesc(objA)} and ${objectDesc(objB)} is approximately ${dist.toFixed(1)} meters.`,
        answerType: 'text',
        reasoningSteps: [
          `Locate ${objectDesc(objA)} at (${objA.transform.position.x.toFixed(1)}, ${objA.transform.position.y.toFixed(1)}, ${objA.transform.position.z.toFixed(1)})`,
          `Locate ${objectDesc(objB)} at (${objB.transform.position.x.toFixed(1)}, ${objB.transform.position.y.toFixed(1)}, ${objB.transform.position.z.toFixed(1)})`,
          `Calculate Euclidean distance: ${dist.toFixed(2)}m`,
        ],
        involvedObjectIds: [objA.id, objB.id],
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Object Comparison (Medium) ---
  {
    type: 'object-comparison',
    difficulty: 'medium',
    minObjects: 3,
    generate: (scene, rng) => {
      if (scene.objects.length < 2) return null;
      const objA = rng.pick(scene.objects);
      let objB = rng.pick(scene.objects);
      let attempts = 0;
      while (
        (objB.id === objA.id || objB.category === objA.category) &&
        attempts < 20
      ) {
        objB = rng.pick(scene.objects);
        attempts++;
      }

      const volA =
        objA.aabb.extents.x * objA.aabb.extents.y * objA.aabb.extents.z * 8;
      const volB =
        objB.aabb.extents.x * objB.aabb.extents.y * objB.aabb.extents.z * 8;
      const larger = volA > volB ? objA : objB;

      return {
        question: `Which is larger, ${objectDesc(objA)} or ${objectDesc(objB)}?`,
        answer: `${objectDesc(larger)} is larger with a volume of approximately ${Math.max(volA, volB).toFixed(2)} cubic meters compared to ${Math.min(volA, volB).toFixed(2)} cubic meters.`,
        answerType: 'text',
        reasoningSteps: [
          `Calculate volume of ${objectDesc(objA)}: ${volA.toFixed(2)} m^3`,
          `Calculate volume of ${objectDesc(objB)}: ${volB.toFixed(2)} m^3`,
          `Compare: ${objectDesc(larger)} is larger`,
        ],
        involvedObjectIds: [objA.id, objB.id],
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Scene Understanding (Medium) ---
  {
    type: 'scene-understanding',
    difficulty: 'medium',
    minObjects: 4,
    generate: (scene, rng) => {
      const room = rng.pick(scene.rooms);
      const roomObjects = scene.objects.filter((o) => o.roomId === room.id);
      const categoryCounts = new Map<string, number>();
      for (const obj of roomObjects) {
        categoryCounts.set(
          obj.category,
          (categoryCounts.get(obj.category) ?? 0) + 1,
        );
      }

      const desc = Array.from(categoryCounts.entries())
        .map(([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`)
        .join(', ');

      return {
        question: `Describe the layout and contents of ${room.name}.`,
        answer: `${room.name} is a ${room.type.replace(/_/g, ' ')} measuring approximately ${(room.bounds.extents.x * 2).toFixed(1)}m x ${(room.bounds.extents.z * 2).toFixed(1)}m. It contains ${roomObjects.length} objects: ${desc}. The ceiling height is ${room.ceilingY.toFixed(1)}m.`,
        answerType: 'text',
        reasoningSteps: [
          `Identify ${room.name} boundaries`,
          `Enumerate all objects in the room`,
          `Group by category and count`,
          `Describe spatial layout`,
        ],
        involvedObjectIds: roomObjects.map((o) => o.id),
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Functional Reasoning (Medium) ---
  {
    type: 'functional-reasoning',
    difficulty: 'medium',
    minObjects: 3,
    generate: (scene, rng) => {
      const chairs = scene.objects.filter((o) => o.category === 'chair');
      const tables = scene.objects.filter((o) => o.category === 'table');
      if (chairs.length === 0 || tables.length === 0) return null;

      const table = rng.pick(tables);
      // Find nearest chair to this table
      let nearestChair = chairs[0];
      let nearestDist = Infinity;
      for (const chair of chairs) {
        const dist = distance3D(
          chair.transform.position,
          table.transform.position,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestChair = chair;
        }
      }

      return {
        question: `Where would you sit to use ${objectDesc(table)}?`,
        answer: `You would sit in ${objectDesc(nearestChair)}, which is ${nearestDist.toFixed(1)}m away from ${objectDesc(table)}, ${directionWord(table.transform.position, nearestChair.transform.position)} of it.`,
        answerType: 'text',
        reasoningSteps: [
          `Locate ${objectDesc(table)}`,
          `Find all chairs in the scene`,
          `Calculate distance from each chair to the table`,
          `Select nearest: ${objectDesc(nearestChair)} at ${nearestDist.toFixed(1)}m`,
        ],
        involvedObjectIds: [table.id, nearestChair.id],
        testedRelations: ['near' as SpatialRelationType],
        viewpointDependent: false,
      };
    },
  },
  // --- Navigation (Hard) ---
  {
    type: 'navigation',
    difficulty: 'hard',
    minObjects: 4,
    generate: (scene, _rng) => {
      if (scene.rooms.length < 2) return null;
      const roomA = scene.rooms[0];
      const roomB = scene.rooms[scene.rooms.length - 1];

      // Find path through connected rooms
      const path = findRoomPath(scene.rooms, roomA.id, roomB.id);
      if (!path || path.length < 2) return null;

      const steps = path.map((roomId, i) => {
        const room = scene.rooms.find((r) => r.id === roomId)!;
        if (i === 0) return `Start in ${room.name}`;
        return `Go through the doorway into ${room.name}`;
      });

      return {
        question: `How do you get from ${roomA.name} to ${roomB.name}?`,
        answer: steps.join('. ') + '.',
        answerType: 'text',
        reasoningSteps: [
          `Identify start room: ${roomA.name}`,
          `Identify destination: ${roomB.name}`,
          `Find connected rooms path: ${path.length} rooms`,
          ...steps,
        ],
        involvedObjectIds: [],
        testedRelations: [],
        viewpointDependent: false,
      };
    },
  },
  // --- Occlusion Reasoning (Hard) ---
  {
    type: 'occlusion-reasoning',
    difficulty: 'hard',
    minObjects: 5,
    generate: (scene, rng) => {
      // Find a large object that could occlude others
      const largeObjects = scene.objects.filter(
        (o) => o.aabb.extents.x > 0.3 && o.aabb.extents.y > 0.5,
      );
      if (largeObjects.length === 0) return null;

      const occluder = rng.pick(largeObjects);
      // Find objects behind the occluder (relative to scene origin)
      const behind = scene.objects.filter((o) => {
        if (o.id === occluder.id) return false;
        const dz = o.transform.position.z - occluder.transform.position.z;
        const dx = Math.abs(
          o.transform.position.x - occluder.transform.position.x,
        );
        return dz > 0 && dx < occluder.aabb.extents.x * 2;
      });

      if (behind.length === 0) return null;

      const hiddenDescs = behind
        .slice(0, 3)
        .map((o) => objectDesc(o))
        .join(', ');

      return {
        question: `What objects might be hidden behind ${objectDesc(occluder)}?`,
        answer: `Behind ${objectDesc(occluder)}, there are ${behind.length} objects that could be partially or fully occluded: ${hiddenDescs}.`,
        answerType: 'text',
        reasoningSteps: [
          `Identify ${objectDesc(occluder)} as potential occluder`,
          `Calculate its bounding box and orientation`,
          `Find objects behind it along the viewing axis`,
          `Determine occlusion based on size overlap`,
        ],
        involvedObjectIds: [occluder.id, ...behind.map((o) => o.id)],
        testedRelations: ['behind' as SpatialRelationType],
        viewpointDependent: true,
      };
    },
  },
  // --- Viewpoint Reasoning (Hard) ---
  {
    type: 'viewpoint-reasoning',
    difficulty: 'hard',
    minObjects: 5,
    generate: (scene, rng) => {
      if (scene.rooms.length === 0) return null;
      const room = rng.pick(scene.rooms);
      const door = scene.objects.find(
        (o) => o.category === 'door' && o.roomId === room.id,
      );

      const viewpoint = door
        ? door.transform.position
        : { x: room.bounds.center.x, y: 1.6, z: room.bounds.center.z - room.bounds.extents.z };

      // Simulate visibility from the doorway
      const roomObjects = scene.objects.filter(
        (o) => o.roomId === room.id && o.category !== 'door',
      );
      const visible = roomObjects.filter((o) => {
        const dist = distance3D(viewpoint, o.transform.position);
        return dist < 8; // simplified visibility check
      });

      const visibleDescs = visible
        .slice(0, 5)
        .map((o) => objectDesc(o))
        .join(', ');

      return {
        question: `Standing at the entrance of ${room.name}, what objects can you see?`,
        answer: `From the entrance of ${room.name}, you can see ${visible.length} objects including: ${visibleDescs}.`,
        answerType: 'text',
        reasoningSteps: [
          `Determine viewpoint at ${room.name} entrance`,
          `Cast visibility rays from viewpoint`,
          `Check which objects are within field of view`,
          `Account for occlusion by large objects`,
        ],
        involvedObjectIds: visible.map((o) => o.id),
        testedRelations: [],
        viewpointDependent: true,
      };
    },
  },
  // --- Trajectory Reasoning (Hard) ---
  {
    type: 'trajectory-reasoning',
    difficulty: 'hard',
    minObjects: 5,
    generate: (scene, rng) => {
      const room = rng.pick(scene.rooms);
      const startPos: Vector3 = {
        x: room.bounds.center.x - room.bounds.extents.x * 0.8,
        y: 1.6,
        z: room.bounds.center.z,
      };
      const steps = rng.nextInt(2, 5);
      const stepSize = 1.0;

      const endPos: Vector3 = {
        x: startPos.x + steps * stepSize,
        y: startPos.y,
        z: startPos.z,
      };

      const nearbyAtEnd = scene.objects
        .filter(
          (o) =>
            o.roomId === room.id &&
            distance3D(endPos, o.transform.position) < 3,
        )
        .sort(
          (a, b) =>
            distance3D(endPos, a.transform.position) -
            distance3D(endPos, b.transform.position),
        );

      if (nearbyAtEnd.length === 0) return null;

      const nearbyDescs = nearbyAtEnd
        .slice(0, 3)
        .map((o) => objectDesc(o))
        .join(', ');

      return {
        question: `If you walk forward ${steps} steps (${(steps * stepSize).toFixed(1)}m) from the left side of ${room.name}, what will be nearby?`,
        answer: `After walking ${steps} steps forward, you would be near: ${nearbyDescs}.`,
        answerType: 'text',
        reasoningSteps: [
          `Start at left side of ${room.name}`,
          `Walk ${steps} steps (${(steps * stepSize).toFixed(1)}m) forward`,
          `Calculate end position: (${endPos.x.toFixed(1)}, ${endPos.y.toFixed(1)}, ${endPos.z.toFixed(1)})`,
          `Find objects within 3m of end position`,
        ],
        involvedObjectIds: nearbyAtEnd.slice(0, 3).map((o) => o.id),
        testedRelations: ['near' as SpatialRelationType],
        viewpointDependent: true,
      };
    },
  },
];

// =============================================================================
// Room Pathfinding
// =============================================================================

function findRoomPath(
  rooms: VRScene['rooms'],
  startId: string,
  endId: string,
): string[] | null {
  const visited = new Set<string>();
  const queue: string[][] = [[startId]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === endId) return path;
    if (visited.has(current)) continue;
    visited.add(current);

    const room = rooms.find((r) => r.id === current);
    if (!room) continue;

    for (const neighbor of room.connectedRooms) {
      if (!visited.has(neighbor)) {
        queue.push([...path, neighbor]);
      }
    }
  }

  return null;
}

// =============================================================================
// Spatial QA Generator
// =============================================================================

export class SpatialQAGenerator {
  private rng: RNG;
  private exampleCounter = 0;

  constructor(seed: number) {
    this.rng = new RNG(seed);
  }

  /**
   * Generate spatial QA examples from a scene.
   */
  generateExamples(
    scene: VRScene,
    count: number,
    difficultyDistribution: Record<string, number> = {
      easy: 0.4,
      medium: 0.35,
      hard: 0.25,
    },
  ): SpatialQAExample[] {
    const examples: SpatialQAExample[] = [];
    const usedTypes = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Select difficulty
      const roll = this.rng.next();
      let difficulty: 'easy' | 'medium' | 'hard';
      if (roll < difficultyDistribution.easy) difficulty = 'easy';
      else if (roll < difficultyDistribution.easy + difficultyDistribution.medium)
        difficulty = 'medium';
      else difficulty = 'hard';

      // Filter templates by difficulty and scene requirements
      const candidates = QUESTION_TEMPLATES.filter(
        (t) =>
          t.difficulty === difficulty &&
          scene.objects.length >= t.minObjects,
      );

      if (candidates.length === 0) continue;

      // Try to diversify question types
      let template = this.rng.pick(candidates);
      const diverseCandidates = candidates.filter(
        (t) => !usedTypes.has(t.type),
      );
      if (diverseCandidates.length > 0) {
        template = this.rng.pick(diverseCandidates);
      }

      const qa = template.generate(scene, this.rng);
      if (!qa) continue;

      usedTypes.add(template.type);
      if (usedTypes.size >= 12) usedTypes.clear(); // Reset for diversity

      // Compute quality score
      const qualityScore = this.computeQualityScore(qa, template);

      const example: SpatialQAExample = {
        id: `spatial-qa-${++this.exampleCounter}`,
        sceneId: scene.id,
        source: scene.source as 'procthor' | 'scannet',
        questionType: template.type,
        question: qa.question,
        answer: qa.answer,
        answerType: qa.answerType,
        difficulty: template.difficulty,
        reasoningSteps: qa.reasoningSteps,
        involvedObjectIds: qa.involvedObjectIds,
        testedRelations: qa.testedRelations,
        viewpointDependent: qa.viewpointDependent,
        qualityScore,
        metadata: {
          templateName: template.type,
          objectCount: scene.objects.length,
          roomCount: scene.rooms.length,
        },
      };

      examples.push(example);
    }

    return examples;
  }

  /**
   * Validate an example for quality and correctness.
   */
  private computeQualityScore(
    qa: GeneratedQA,
    template: QuestionTemplate,
  ): number {
    let score = 0.5; // Base

    // Reward longer, more detailed answers
    if (qa.answer.length > 50) score += 0.1;
    if (qa.answer.length > 100) score += 0.1;

    // Reward more reasoning steps
    if (qa.reasoningSteps.length >= 3) score += 0.1;

    // Reward testing spatial relations
    if (qa.testedRelations.length > 0) score += 0.1;

    // Reward involving multiple objects
    if (qa.involvedObjectIds.length >= 2) score += 0.05;
    if (qa.involvedObjectIds.length >= 4) score += 0.05;

    return Math.min(1.0, score);
  }

  /**
   * Get available question types.
   */
  getQuestionTypes(): SpatialQuestionType[] {
    return [...new Set(QUESTION_TEMPLATES.map((t) => t.type))];
  }
}
