/**
 * Property Inspector Component - Runtime object property editor
 */

import React, { useState, useEffect } from 'react';
import { usePlaygroundStore } from '@hooks/usePlaygroundStore';

interface ObjectProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'vector' | 'color' | 'enum';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface InspectedObject {
  id: string;
  name: string;
  type: string;
  properties: ObjectProperty[];
}

const PropertyInspector: React.FC = () => {
  const { preview } = usePlaygroundStore();
  const [inspectedObject, setInspectedObject] = useState<InspectedObject | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  // Update inspected object from preview
  useEffect(() => {
    if (preview.selectedObject) {
      const properties: ObjectProperty[] = [];

      // Basic properties
      properties.push({
        name: 'name',
        type: 'string',
        value: preview.selectedObject.name || 'Unnamed',
      });

      properties.push({
        name: 'type',
        type: 'enum',
        value: preview.selectedObject.type || 'object',
        options: ['object', 'light', 'camera', 'particle', 'npc'],
      });

      // Position
      if (preview.selectedObject.position) {
        properties.push({
          name: 'positionX',
          type: 'number',
          value: preview.selectedObject.position.x || 0,
          step: 0.1,
        });
        properties.push({
          name: 'positionY',
          type: 'number',
          value: preview.selectedObject.position.y || 0,
          step: 0.1,
        });
        properties.push({
          name: 'positionZ',
          type: 'number',
          value: preview.selectedObject.position.z || 0,
          step: 0.1,
        });
      }

      // Rotation
      if (preview.selectedObject.rotation) {
        properties.push({
          name: 'rotationX',
          type: 'number',
          value: preview.selectedObject.rotation.x || 0,
          min: 0,
          max: Math.PI * 2,
          step: 0.01,
        });
        properties.push({
          name: 'rotationY',
          type: 'number',
          value: preview.selectedObject.rotation.y || 0,
          min: 0,
          max: Math.PI * 2,
          step: 0.01,
        });
        properties.push({
          name: 'rotationZ',
          type: 'number',
          value: preview.selectedObject.rotation.z || 0,
          min: 0,
          max: Math.PI * 2,
          step: 0.01,
        });
      }

      // Scale
      if (preview.selectedObject.scale) {
        properties.push({
          name: 'scaleX',
          type: 'number',
          value: preview.selectedObject.scale.x || 1,
          min: 0.1,
          max: 10,
          step: 0.1,
        });
        properties.push({
          name: 'scaleY',
          type: 'number',
          value: preview.selectedObject.scale.y || 1,
          min: 0.1,
          max: 10,
          step: 0.1,
        });
        properties.push({
          name: 'scaleZ',
          type: 'number',
          value: preview.selectedObject.scale.z || 1,
          min: 0.1,
          max: 10,
          step: 0.1,
        });
      }

      // Material
      if (preview.selectedObject.material) {
        properties.push({
          name: 'color',
          type: 'color',
          value: preview.selectedObject.material.color || '#ffffff',
        });
        properties.push({
          name: 'metalness',
          type: 'number',
          value: preview.selectedObject.material.metalness || 0,
          min: 0,
          max: 1,
          step: 0.1,
        });
        properties.push({
          name: 'roughness',
          type: 'number',
          value: preview.selectedObject.material.roughness || 0.5,
          min: 0,
          max: 1,
          step: 0.1,
        });
      }

      // Physics
      if (preview.selectedObject.physics) {
        properties.push({
          name: 'enablePhysics',
          type: 'boolean',
          value: preview.selectedObject.physics.enabled || false,
        });
        if (preview.selectedObject.physics.enabled) {
          properties.push({
            name: 'mass',
            type: 'number',
            value: preview.selectedObject.physics.mass || 1,
            min: 0.01,
            max: 100,
            step: 0.1,
          });
          properties.push({
            name: 'friction',
            type: 'number',
            value: preview.selectedObject.physics.friction || 0.5,
            min: 0,
            max: 1,
            step: 0.1,
          });
        }
      }

      setInspectedObject({
        id: preview.selectedObject.id || '',
        name: preview.selectedObject.name || 'Unnamed Object',
        type: preview.selectedObject.type || 'object',
        properties,
      });
    }
  }, [preview.selectedObject]);

  const handlePropertyChange = (property: ObjectProperty, newValue: any) => {
    if (!inspectedObject) return;

    // Update local state
    const updatedProperties = inspectedObject.properties.map((p) =>
      p.name === property.name ? { ...p, value: newValue } : p
    );

    setInspectedObject({
      ...inspectedObject,
      properties: updatedProperties,
    });

    // Emit change event
    const event = new CustomEvent('propertyChanged', {
      detail: {
        objectId: inspectedObject.id,
        property: property.name,
        value: newValue,
      },
    });
    window.dispatchEvent(event);
  };

  const renderPropertyInput = (property: ObjectProperty) => {
    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={property.value}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="w-full px-2 py-1 bg-gray-700 text-gray-100 text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={property.value}
            onChange={(e) => handlePropertyChange(property, parseFloat(e.target.value))}
            min={property.min}
            max={property.max}
            step={property.step || 1}
            className="w-full px-2 py-1 bg-gray-700 text-gray-100 text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={property.value}
              onChange={(e) => handlePropertyChange(property, e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-300">
              {property.value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={property.value}
              onChange={(e) => handlePropertyChange(property, e.target.value)}
              className="w-12 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={property.value}
              onChange={(e) => handlePropertyChange(property, e.target.value)}
              className="flex-1 px-2 py-1 bg-gray-700 text-gray-100 text-xs rounded border border-gray-600"
            />
          </div>
        );

      case 'enum':
        return (
          <select
            value={property.value}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="w-full px-2 py-1 bg-gray-700 text-gray-100 text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
          >
            {property.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'vector':
        return (
          <div className="grid grid-cols-3 gap-1">
            <input
              type="number"
              placeholder="X"
              step="0.1"
              className="px-1 py-1 bg-gray-700 text-gray-100 text-xs rounded border border-gray-600"
            />
            <input
              type="number"
              placeholder="Y"
              step="0.1"
              className="px-1 py-1 bg-gray-700 text-gray-100 text-xs rounded border border-gray-600"
            />
            <input
              type="number"
              placeholder="Z"
              step="0.1"
              className="px-1 py-1 bg-gray-700 text-gray-100 text-xs rounded border border-gray-600"
            />
          </div>
        );

      default:
        return <div className="text-gray-400 text-sm">Unsupported type</div>;
    }
  };

  if (!inspectedObject) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-sm">Select an object in the preview to inspect its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="text-xs text-gray-400 mb-1">OBJECT</div>
        <h3 className="text-lg font-semibold text-gray-100">{inspectedObject.name}</h3>
        <div className="text-xs text-gray-500 mt-1">
          ID: {inspectedObject.id} | Type: {inspectedObject.type}
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-800">
          {inspectedObject.properties.map((property) => (
            <div
              key={property.name}
              className={`px-4 py-3 hover:bg-gray-800/50 cursor-pointer transition ${
                selectedProperty === property.name ? 'bg-gray-800' : ''
              }`}
              onClick={() => setSelectedProperty(property.name)}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  {property.name
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                    .split(' ')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </label>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {property.type}
                </span>
              </div>
              {renderPropertyInput(property)}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 bg-gray-800/50 p-3 space-y-2">
        <button className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
          Apply Changes
        </button>
        <button className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition">
          Reset to Default
        </button>
      </div>
    </div>
  );
};

export default PropertyInspector;
