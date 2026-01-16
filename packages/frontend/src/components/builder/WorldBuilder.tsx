'use client';

import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface Asset {
  id: string;
  name: string;
  type: 'model' | 'texture' | 'sound';
  thumbnail: string;
  path: string;
}

interface WorldObject {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  properties: Record<string, any>;
}

interface WorldBuilderProps {
  worldId?: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

export function WorldBuilder({ worldId, initialData, onSave }: WorldBuilderProps) {
  const [objects, setObjects] = useState<WorldObject[]>(initialData?.objects || []);
  const [selectedObject, setSelectedObject] = useState<WorldObject | null>(null);
  const [assets, setAssets] = useState<Asset[]>([
    // Placeholder assets
    { id: '1', name: 'Box', type: 'model', thumbnail: '📦', path: 'box.glb' },
    { id: '2', name: 'Sphere', type: 'model', thumbnail: '🔵', path: 'sphere.glb' },
    { id: '3', name: 'Cylinder', type: 'model', thumbnail: '🔷', path: 'cylinder.glb' },
  ]);

  function addObject(asset: Asset) {
    const newObject: WorldObject = {
      id: Math.random().toString(),
      name: asset.name,
      type: asset.type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      properties: { model: asset.path },
    };
    setObjects([...objects, newObject]);
    setSelectedObject(newObject);
  }

  function updateObject(id: string, updates: Partial<WorldObject>) {
    setObjects(objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)));
    if (selectedObject?.id === id) {
      setSelectedObject({ ...selectedObject, ...updates });
    }
  }

  function deleteObject(id: string) {
    setObjects(objects.filter((obj) => obj.id !== id));
    if (selectedObject?.id === id) {
      setSelectedObject(null);
    }
  }

  function handleSave() {
    if (onSave) {
      onSave({ id: worldId, objects });
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Asset Panel */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-bold">Assets</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => addObject(asset)}
              className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2 transition"
            >
              <span className="text-xl">{asset.thumbnail}</span>
              <span className="text-sm">{asset.name}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition"
          >
            Save World
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-gray-900">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} />
            <OrbitControls />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#444444" />
            </mesh>

            {/* Objects */}
            {objects.map((obj) => (
              <group
                key={obj.id}
                position={obj.position}
                rotation={obj.rotation}
                scale={obj.scale}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObject(obj);
                }}
              >
                <mesh
                  castShadow
                  receiveShadow
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(obj);
                  }}
                >
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial
                    color={selectedObject?.id === obj.id ? '#FF00FF' : '#4488FF'}
                  />
                </mesh>
              </group>
            ))}
          </Canvas>
        </div>

        {/* Inspector Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold">Inspector</h3>
          </div>

          {selectedObject ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <input
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) =>
                    updateObject(selectedObject.id, { name: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Position</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                    <div key={axis}>
                      <input
                        type="number"
                        value={selectedObject.position[i]}
                        onChange={(e) => {
                          const newPos = [...selectedObject.position] as [
                            number,
                            number,
                            number
                          ];
                          newPos[i] = parseFloat(e.target.value);
                          updateObject(selectedObject.id, { position: newPos });
                        }}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        placeholder={axis}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Rotation</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                    <div key={axis}>
                      <input
                        type="number"
                        value={(selectedObject.rotation[i] * 180) / Math.PI}
                        onChange={(e) => {
                          const newRot = [...selectedObject.rotation] as [
                            number,
                            number,
                            number
                          ];
                          newRot[i] = (parseFloat(e.target.value) * Math.PI) / 180;
                          updateObject(selectedObject.id, { rotation: newRot });
                        }}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        placeholder={axis}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Scale</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                    <div key={axis}>
                      <input
                        type="number"
                        value={selectedObject.scale[i]}
                        onChange={(e) => {
                          const newScale = [...selectedObject.scale] as [
                            number,
                            number,
                            number
                          ];
                          newScale[i] = parseFloat(e.target.value);
                          updateObject(selectedObject.id, { scale: newScale });
                        }}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        placeholder={axis}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteObject(selectedObject.id)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition"
              >
                Delete Object
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select an object to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
