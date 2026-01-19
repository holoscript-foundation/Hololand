import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

export function OasisPlanet({ onClick }: { onClick?: () => void }) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.001;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0012;
      cloudsRef.current.rotation.x = Math.sin(Date.now() * 0.0001) * 0.1;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick) {
      console.log('Planet clicked!');
      onClick();
    }
  };

  return (
    <group>
      <Stars radius={100} depth={50} count={8000} factor={4} saturation={0} fade speed={1} />
      
      {/* Ocean (blue base) */}
      <Sphere 
        ref={planetRef} 
        args={[3, 64, 64]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <meshStandardMaterial
          color="#1e40af"
          metalness={0.3}
          roughness={0.7}
        />
      </Sphere>
      
      {/* Continents (brown/green landmasses) */}
      <Sphere args={[3.01, 32, 32]}>
        <meshStandardMaterial
          color="#15803d"
          metalness={0.1}
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </Sphere>
      
      {/* Desert/rocky areas */}
      <Sphere args={[3.015, 32, 32]}>
        <meshStandardMaterial
          color="#92400e"
          metalness={0.1}
          roughness={1}
          transparent
          opacity={0.4}
        />
      </Sphere>
      
      {/* Clouds */}
      <Sphere ref={cloudsRef} args={[3.12, 32, 32]}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.25}
          roughness={1}
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere args={[3.25, 32, 32]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
