import { Environment, PositionalAudio, Gltf, OrbitControls, Text, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, Vignette } from '@react-three/postprocessing';
import { Physics, RigidBody, CuboidCollider, BallCollider, MeshCollider, CapsuleCollider, CylinderCollider } from '@react-three/rapier';
import { R3FCompiler, HSPlusAST, R3FNode } from '@holoscript/core';
import { getGeometry, getMaterialProps, ShaderMeshNode, hasShaderTrait } from '@holoscript/r3f-renderer';
import { SyncedEntity } from './SyncedEntity';
import { DeformableEntity } from './DeformableEntity';
import { IntelligenceEntity } from './IntelligenceEntity';
import { InteractionEntity } from './InteractionEntity';
import { AnimatedEntity } from './AnimatedEntity';
import { SpatialAgent } from './SpatialAgent';
import { useThree } from '@react-three/fiber';
import { getAudioManager } from './audio/AudioManager';
import React, { useMemo, Suspense, useEffect, useCallback, useState, useContext } from 'react';
import { HoloRuntimeContext } from './RuntimeContext';

/**
 * Portal Component
 * Handles cross-world navigation from HoloScript @portal trait
 */
const Portal: React.FC<{ destination: string; text?: string; color?: string }> = ({
  destination,
  text = 'PORTAL',
  color = '#22c55e'
}) => {
  const handleClick = () => {
    console.log(`Navigating to ${destination}`);
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = destination;
    }, 500);
  };

  return (
    <group onClick={handleClick}>
      <mesh>
        <torusGeometry args={[1.5, 0.2, 16, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[1.3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <Text position={[0, 2, 0]} fontSize={0.3} color="white">
        {text}
      </Text>
      <Sparkles count={50} scale={4} size={3} color={color} />
    </group>
  );
};

export interface HoloScriptR3FRendererProps {
  ast: HSPlusAST;
  precompiledTree?: R3FNode;
  debug?: boolean;
  physics?: boolean;
  companions?: Record<string, any>;
  /** Optional runtime — enables state interpolation and event dispatch */
  runtime?: any;
}

/**
 * HoloScriptR3FRenderer
 *
 * High-fidelity React Three Fiber renderer for HoloScript.
 * Translates compiled R3F nodes into actual React components.
 * When used inside a HoloRuntimeProvider, automatically picks up
 * the runtime context for action dispatching and variable interpolation.
 */
export const HoloScriptR3FRenderer: React.FC<HoloScriptR3FRendererProps> = ({
  ast,
  precompiledTree,
  debug,
  physics = true,
  companions = {},
  runtime: runtimeProp,
}) => {
  // Pick up runtime from context if not passed as prop
  const runtimeCtx = useContext(HoloRuntimeContext);
  const runtime = runtimeProp || runtimeCtx.runtime;
  const compiler = useMemo(() => new R3FCompiler(), []);
  const [summonedAssets, setSummonedAssets] = useState<R3FNode[]>([]);
  const [globalTheme, setGlobalTheme] = useState<string | null>(null);

  useEffect(() => {
    if (companions.Hub) {
       companions.Hub.setThemeUpdater = setGlobalTheme;
    }
  }, [companions]);

  const r3fTree = useMemo(() => {
    const tree = precompiledTree || compiler.compile(ast);
    if (globalTheme) {
      const envNode = tree.children?.find((c: R3FNode) => c.type === 'Environment');
      if (envNode) envNode.props.preset = globalTheme;
    }
    return tree;
  }, [ast, precompiledTree, compiler, globalTheme]);

  const { camera } = useThree();

  useEffect(() => {
    const listener = getAudioManager().getListener();
    camera.add(listener);
    return () => {
      camera.remove(listener);
    };
  }, [camera]);

  const handleAction = useCallback((action: string) => {
    console.log('HoloScriptR3FRenderer Action:', action);

    // 1. Route through runtime if available (event dispatch + variable mutation)
    if (runtime) {
      try {
        // set(variable, value) pattern
        const setMatch = action.match(/^set\((\w+),\s*(.+)\)$/);
        if (setMatch) {
          const [, varName, rawVal] = setMatch;
          const val = JSON.parse(rawVal);
          runtime.setVariable(varName, val);
          return;
        }
        // emit(event, payload?) pattern
        const emitMatch = action.match(/^emit\((\w+)(?:,\s*(.+))?\)$/);
        if (emitMatch) {
          const [, event, payloadStr] = emitMatch;
          runtime.emit(event, payloadStr ? JSON.parse(payloadStr) : undefined);
          return;
        }
      } catch {
        // Parsing failed — fall through to other handlers
      }
    }

    // 2. Companion module call: Alias.method(args)
    const match = action.match(/^(\w+)\.(\w+)\((.*)\)$/);
    if (match) {
      const [, alias, funcName, argsStr] = match;
      const companion = companions[alias];
      if (companion && typeof companion[funcName] === 'function') {
        console.log(`Executing Companion: ${alias}.${funcName}`);
        companion[funcName](argsStr);
        return;
      }
    }

    // 3. Speak action (local AI handling placeholder)
    if (action.startsWith('speak(')) {
       // Local AI handling
    }

    // 4. Summon action — dynamically spawn physics entity
    if (action.includes('summon')) {
      const newAsset: R3FNode = {
        type: 'mesh',
        id: `summoned_${Date.now()}`,
        props: {
          position: [0, 5, 0],
          hsType: 'box',
          color: '#ff8844',
          rigidBody: { type: 'dynamic' },
          collider: { type: 'auto' }
        }
      };
      setSummonedAssets(prev => [...prev, newAsset]);
    }

    // 5. Forward unhandled actions to runtime as generic events
    if (runtime) {
      runtime.emit('action', action);
    }
  }, [companions, runtime]);

  const content = (
    <group>
      {renderR3FNode(r3fTree, handleAction)}
      {summonedAssets.map(asset => renderR3FNode(asset, handleAction))}
      {debug && <OrbitControls />}
    </group>
  );

  return (
    <Suspense fallback={null}>
      {physics ? (
        <Physics debug={debug} gravity={[0, -9.81, 0]}>
          {content}
        </Physics>
      ) : content}
    </Suspense>
  );
};

function renderR3FNode(node: R3FNode, onAction?: (action: string) => void): React.ReactNode {
  const { type, props, children, id } = node;
  const key = id || Math.random().toString(36).substring(7);

  // 0. Physics Wrapper (RigidBody)
  if (props.rigidBody) {
    const { rigidBody, ...restProps } = props;
    return (
      <RigidBody key={key} {...rigidBody}>
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </RigidBody>
    );
  }

  // 0.1 Networking Wrapper
  if (props.networked) {
    const { networked, ...restProps } = props;
    return (
      <SyncedEntity key={key} id={id || key}>
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </SyncedEntity>
    );
  }

  // 0.2 Intelligence / Agent Wrapper
  if (props.ai_driven || props.dialogue || props.avatarEmbodiment || props.lipSync || props.emotionDirective) {
    const { ai_driven, dialogue, avatarEmbodiment, lipSync, emotionDirective, ...restProps } = props;
    
    // Use high-fidelity SpatialAgent if embodiment features are requested
    if (avatarEmbodiment || lipSync || emotionDirective) {
      return (
        <SpatialAgent 
          key={key} 
          aiDriven={ai_driven} 
          avatarEmbodiment={avatarEmbodiment}
          lipSync={lipSync}
          emotionDirective={emotionDirective}
        >
          {renderR3FNode({ ...node, props: restProps }, onAction)}
        </SpatialAgent>
      );
    }

    return (
      <IntelligenceEntity key={key} config={ai_driven}>
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </IntelligenceEntity>
    );
  }

  // 0.3 Interaction Wrapper
  if (props.gesture || props.haptic || props.grabbable || props.hoverable) {
    const { gesture, haptic, grabbable, hoverable, ...restProps } = props;
    return (
      <InteractionEntity
        key={key}
        gesture={gesture}
        haptic={haptic}
        grabbable={grabbable}
        hoverable={hoverable}
        onAction={onAction}
      >
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </InteractionEntity>
    );
  }

  // 0.4 Deformable Wrapper
  if (props.moldable || props.stretchable) {
    const { moldable, stretchable, ...restProps } = props;
    return (
      <DeformableEntity key={key} moldable={moldable} stretchable={stretchable}>
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </DeformableEntity>
    );
  }

  // 0.5 Animation Wrapper
  if (props.animated) {
    const { animated, ...restProps } = props;
    return (
      <AnimatedEntity key={key} config={animated}>
        {renderR3FNode({ ...node, props: restProps }, onAction)}
      </AnimatedEntity>
    );
  }

  // 1. Post-Processing Effects
  if (type === 'EffectComposer') {
    return (
      <EffectComposer key={key} {...props}>
        {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
      </EffectComposer>
    );
  }
  if (type === 'Bloom') return <Bloom key={key} {...props} />;
  if (type === 'SSAO') return <SSAO key={key} {...props} />;
  if (type === 'Vignette') return <Vignette key={key} {...props} />;

  // 1.1 Fog support
  if (type === 'fog') {
    return <fog key={key} {...props} />;
  }

  // 2. Environment & Atmosphere (drei)
  if (type === 'Environment') {
    return <Environment key={key} {...props} />;
  }

  // 2. Spatial Audio (drei)
  if (type === 'positionalAudio') {
    return <PositionalAudio key={key} {...props} url={props.src} />;
  }

  // 2.1 Text (drei)
  if (type === 'Text' || type === 'text') {
    return (
      <Text key={key} {...props}>
        {props.text || ''}
        {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
      </Text>
    );
  }

  // 2.2 Portal & Sparkles
  if (type === 'Portal') {
    return <Portal key={key} {...props} />;
  }
  if (type === 'Sparkles') {
    return <Sparkles key={key} {...props} />;
  }

  // 3. Asset Loading (drei Gltf)
  if ((type === 'primitive' || type === 'gltfModel') && props.src) {
    const { collider, ...restProps } = props;
    if (collider) {
      return (
        <MeshCollider key={key} type="hull">
          <Gltf {...restProps}>
            {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
          </Gltf>
        </MeshCollider>
      );
    }
    return (
      <Gltf key={key} {...restProps}>
        {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
      </Gltf>
    );
  }

  // 3.5 Shader Mesh — @shader trait renders with custom GLSL
  if (type === 'mesh' && hasShaderTrait(node)) {
    return <ShaderMeshNode key={key} node={node} />;
  }

  // 4. Primitives with full PBR Materials (via @holoscript/r3f-renderer)
  if (type === 'mesh') {
    const { collider, ...meshProps } = props;
    const matProps = getMaterialProps(node);
    const hsType = props.hsType || 'sphere';
    const size = props.size || 1;
    return (
      <mesh key={key} {...meshProps} castShadow receiveShadow>
        {getGeometry(hsType, size, props)}
        <meshPhysicalMaterial {...matProps} />
        {collider && renderCollider(hsType, props.args)}
        {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
      </mesh>
    );
  }

  // 5. Light Components
  if (type === 'ambientLight') {
    return <ambientLight key={key} {...props} />;
  }
  if (type === 'hemisphereLight') {
    return <hemisphereLight key={key} {...props} />;
  }
  if (type === 'directionalLight') {
    const { shadows, ...lightProps } = props;
    return <directionalLight key={key} {...lightProps} castShadow={shadows !== false} />;
  }
  if (type === 'pointLight') {
    const { shadows, ...lightProps } = props;
    return <pointLight key={key} {...lightProps} castShadow={!!shadows} />;
  }
  if (type === 'spotLight') {
    const { shadows, ...lightProps } = props;
    return <spotLight key={key} {...lightProps} castShadow={shadows !== false} />;
  }
  if (type === 'rectAreaLight') {
    return <rectAreaLight key={key} {...props} />;
  }
  // Generic light fallback
  if (type.toLowerCase().includes('light')) {
    const LightComponent = type as any;
    return <LightComponent key={key} {...props} />;
  }

  // 6. Generic Group / Composition
  if (type === 'group' || type === 'composition') {
    return (
       <group key={key} {...props}>
         {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
       </group>
    );
  }

  // Fallback/Generic Components
  const Component = type as any;
  if (typeof Component !== 'string' || !Component) return null;

  return (
    <Component key={key} {...props}>
      {children?.map((child: R3FNode) => renderR3FNode(child, onAction))}
    </Component>
  );
}

function renderCollider(type: string, args: any[] = []): React.ReactNode {
  switch (type) {
    case 'sphere':
    case 'orb':
      return <BallCollider args={[args[0] || 1]} />;
    case 'cube':
    case 'box':
      return <CuboidCollider args={[(args[0] || 1) / 2, (args[1] || 1) / 2, (args[2] || 1) / 2]} />;
    case 'cylinder':
      return <CylinderCollider args={[(args[2] || 1) / 2, args[0] || 1]} />;
    case 'plane':
      return <CuboidCollider args={[(args[0] || 1) / 2, (args[1] || 1) / 2, 0.01]} />;
    case 'capsule':
      return <CapsuleCollider args={[(args[1] || 1) / 2, args[0] || 0.5]} />;
    default:
      // For complex shapes (torus, ring, etc.), use a bounding-box cuboid approximation
      return <CuboidCollider args={[0.5, 0.5, 0.5]} />;
  }
}
