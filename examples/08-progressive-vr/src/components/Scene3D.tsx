/**
 * Scene3D Component
 *
 * The 3D scene that adapts to both desktop and VR modes.
 * Uses Three.js for rendering and adapts camera/controls based on mode.
 */

import { forwardRef, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneState, ViewMode, EnvironmentPreset } from '../types';

interface Scene3DProps {
  sceneState: SceneState;
  viewMode: ViewMode;
  vrSession: XRSession | null;
  onObjectSelect: (id: string | null) => void;
}

// Environment colors for different presets
const ENVIRONMENT_COLORS: Record<EnvironmentPreset, { sky: number; ground: number; ambient: number }> = {
  sunset: { sky: 0xff7e5f, ground: 0x2c1e14, ambient: 0xffeedd },
  night: { sky: 0x0a0a1a, ground: 0x050508, ambient: 0x334455 },
  studio: { sky: 0x808080, ground: 0x404040, ambient: 0xffffff },
  forest: { sky: 0x87ceeb, ground: 0x228b22, ambient: 0x90ee90 },
  space: { sky: 0x000011, ground: 0x000000, ambient: 0x222244 },
};

export const Scene3D = forwardRef<HTMLCanvasElement, Scene3DProps>(function Scene3D(
  { sceneState, viewMode, vrSession, onObjectSelect },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const animationFrameRef = useRef<number>(0);

  // Forward canvas ref
  useImperativeHandle(ref, () => canvasRef.current!, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 3, 5);
    cameraRef.current = camera;

    // Create orbit controls (desktop mode)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    objectsRef.current.set('ambientLight', ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    objectsRef.current.set('directionalLight', directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    objectsRef.current.set('ground', ground);

    // Create demo objects
    createDemoObjects(scene, objectsRef.current);

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      controls.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Update environment based on preset
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const colors = ENVIRONMENT_COLORS[sceneState.environmentPreset];

    // Update background
    scene.background = new THREE.Color(colors.sky);

    // Update ambient light
    const ambientLight = objectsRef.current.get('ambientLight') as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.color.set(colors.ambient);
    }

    // Update ground color
    const ground = objectsRef.current.get('ground') as THREE.Mesh;
    if (ground && ground.material instanceof THREE.MeshStandardMaterial) {
      ground.material.color.set(colors.ground);
    }
  }, [sceneState.environmentPreset]);

  // Update light intensity
  useEffect(() => {
    const directionalLight = objectsRef.current.get('directionalLight') as THREE.DirectionalLight;
    const ambientLight = objectsRef.current.get('ambientLight') as THREE.AmbientLight;

    if (directionalLight) {
      directionalLight.intensity = sceneState.lightIntensity;
    }
    if (ambientLight) {
      ambientLight.intensity = sceneState.lightIntensity * 0.5;
    }
  }, [sceneState.lightIntensity]);

  // Update object scale
  useEffect(() => {
    const cube = objectsRef.current.get('cube') as THREE.Mesh;
    const sphere = objectsRef.current.get('sphere') as THREE.Mesh;
    const torus = objectsRef.current.get('torus') as THREE.Mesh;

    const scale = sceneState.objectScale;

    if (cube) cube.scale.setScalar(scale);
    if (sphere) sphere.scale.setScalar(scale);
    if (torus) torus.scale.setScalar(scale);
  }, [sceneState.objectScale]);

  // Handle VR session changes
  useEffect(() => {
    const renderer = rendererRef.current;
    const controls = controlsRef.current;

    if (vrSession && renderer) {
      // Entering VR mode
      renderer.xr.setSession(vrSession);
      if (controls) controls.enabled = false;
    } else if (renderer) {
      // Exiting VR mode
      if (controls) controls.enabled = true;
    }
  }, [vrSession]);

  // Animation loop
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!renderer || !scene || !camera) return;

    let lastTime = 0;

    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Update controls (desktop mode only)
      if (viewMode === 'desktop' && controls) {
        controls.update();
      }

      // Rotate demo objects
      const rotationAmount = sceneState.rotationSpeed * delta;

      const cube = objectsRef.current.get('cube') as THREE.Mesh;
      const sphere = objectsRef.current.get('sphere') as THREE.Mesh;
      const torus = objectsRef.current.get('torus') as THREE.Mesh;

      if (cube) {
        cube.rotation.x += rotationAmount;
        cube.rotation.y += rotationAmount * 0.7;
      }
      if (sphere) {
        sphere.rotation.y += rotationAmount * 0.5;
      }
      if (torus) {
        torus.rotation.x += rotationAmount * 0.3;
        torus.rotation.z += rotationAmount * 0.5;
      }

      // Float the sphere
      if (sphere) {
        sphere.position.y = 1.5 + Math.sin(time * 0.001) * 0.2;
      }

      renderer.render(scene, camera);
    };

    // Use XR animation loop when in VR
    if (vrSession) {
      renderer.setAnimationLoop((time) => {
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        const rotationAmount = sceneState.rotationSpeed * delta;

        const cube = objectsRef.current.get('cube') as THREE.Mesh;
        const sphere = objectsRef.current.get('sphere') as THREE.Mesh;
        const torus = objectsRef.current.get('torus') as THREE.Mesh;

        if (cube) {
          cube.rotation.x += rotationAmount;
          cube.rotation.y += rotationAmount * 0.7;
        }
        if (sphere) {
          sphere.rotation.y += rotationAmount * 0.5;
          sphere.position.y = 1.5 + Math.sin(time * 0.001) * 0.2;
        }
        if (torus) {
          torus.rotation.x += rotationAmount * 0.3;
          torus.rotation.z += rotationAmount * 0.5;
        }

        renderer.render(scene, camera);
      });
    } else {
      renderer.setAnimationLoop(null);
      animate(0);
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      renderer.setAnimationLoop(null);
    };
  }, [viewMode, vrSession, sceneState.rotationSpeed]);

  // Click handling for object selection
  const handleClick = useCallback((event: MouseEvent) => {
    if (viewMode !== 'desktop') return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const selectableObjects = ['cube', 'sphere', 'torus'].map(
      name => objectsRef.current.get(name)
    ).filter(Boolean) as THREE.Object3D[];

    const intersects = raycaster.intersectObjects(selectableObjects);

    if (intersects.length > 0) {
      const selected = intersects[0].object;
      const id = Array.from(objectsRef.current.entries()).find(
        ([, obj]) => obj === selected
      )?.[0];
      onObjectSelect(id || null);
    } else {
      onObjectSelect(null);
    }
  }, [viewMode, onObjectSelect]);

  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [handleClick]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

// Helper function to create demo objects
function createDemoObjects(scene: THREE.Scene, objects: Map<string, THREE.Object3D>) {
  // Cube
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    roughness: 0.3,
    metalness: 0.7,
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(-2, 0.5, 0);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
  objects.set('cube', cube);

  // Sphere
  const sphereGeometry = new THREE.SphereGeometry(0.6, 32, 32);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.2,
    metalness: 0.8,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 1.5, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);
  objects.set('sphere', sphere);

  // Torus
  const torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
  const torusMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.4,
    metalness: 0.6,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.set(2, 1, 0);
  torus.castShadow = true;
  torus.receiveShadow = true;
  scene.add(torus);
  objects.set('torus', torus);

  // Add pedestals for objects
  const pedestalGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 32);
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.5,
    metalness: 0.5,
  });

  const pedestal1 = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
  pedestal1.position.set(-2, 0.05, 0);
  pedestal1.receiveShadow = true;
  scene.add(pedestal1);

  const pedestal2 = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
  pedestal2.position.set(2, 0.05, 0);
  pedestal2.receiveShadow = true;
  scene.add(pedestal2);
}
