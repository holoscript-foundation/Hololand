import React from 'react';
import { HoloScriptPhysicsRenderer } from '../components/HoloScriptPhysicsRenderer';

const PHYSICS_DEMO_SCRIPT = `
# Physics Lab Demo

# Jenga Tower Base
orb #base {
  position: [0, -1, 0]
  scale: [10, 1, 10]
  color: "#333333"
  @physics(type: "static")
}

# Dynamic Objects
orb #ball {
  position: [0, 5, 0]
  scale: [0.8, 0.8, 0.8]
  color: "#ff0055"
  @physics(mass: 1)
  @grabbable
  @throwable(velocity_scale: 1.5)
  @bouncy(restitution: 0.8)
}

orb #cube1 {
  position: [0.5, 2, 0]
  scale: [1, 1, 1]
  color: "#00ccff"
  @physics(mass: 1)
  @grabbable
  @throwable
}

orb #cube2 {
  position: [-0.5, 4, 0]
  scale: [1, 1, 1]
  color: "#ccff00"
  @physics(mass: 1)
  @grabbable
  @throwable
}

# Gravity Field Visualizer
orb #gravity_center {
  position: [0, 8, 0]
  scale: [0.2, 0.2, 0.2]
  color: "white"
  @physics(type: "static")
  @glow(color: "white", intensity: 2)
}
`;

export const PhysicsLab: React.FC = () => {
  return (
    <group>
      <HoloScriptPhysicsRenderer scriptContent={PHYSICS_DEMO_SCRIPT} />
      
      {/* Lab Environment Decor */}
      <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -0.49, 0]} />
    </group>
  );
};
