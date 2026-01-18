# @hololand/animation

Skeletal animation system for Hololand - keyframes, blend trees, IK, and procedural animation.

## Features

- **Skeletal Animation**: Full bone hierarchy support with inverse kinematics
- **Keyframe System**: Timeline-based keyframe animation with easing
- **Blend Trees**: Smooth transitions between animation states
- **Procedural Animation**: Runtime-generated animations for natural movement
- **VR Hand Tracking**: Integration with VR controller and hand tracking

## Installation

```bash
pnpm add @hololand/animation
```

## Usage

```typescript
import { AnimationController, BlendTree } from '@hololand/animation';

const controller = new AnimationController(skeleton);

// Add animations
controller.addClip('idle', idleAnimation);
controller.addClip('walk', walkAnimation);
controller.addClip('run', runAnimation);

// Create blend tree for locomotion
const locomotion = new BlendTree('locomotion', [
  { clip: 'idle', threshold: 0 },
  { clip: 'walk', threshold: 0.5 },
  { clip: 'run', threshold: 1.0 },
]);

controller.setBlendTree(locomotion);
controller.setBlendParameter('speed', 0.7); // Between walk and run
```

## API Reference

### AnimationController

Main animation management class.

- `addClip(name, clip)` - Add an animation clip
- `play(name, options?)` - Play an animation
- `crossFade(name, duration)` - Smoothly transition to animation
- `setBlendParameter(name, value)` - Set blend tree parameter

### BlendTree

Multi-animation blending system.

- `addNode(clip, threshold)` - Add blend node
- `evaluate(parameter)` - Get blended pose

## License

MIT © Hololand Team
