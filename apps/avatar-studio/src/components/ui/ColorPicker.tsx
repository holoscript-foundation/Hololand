'use client';

import { useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

const DEFAULT_SKIN_PRESETS = [
  '#f5d6b8', '#e0b896', '#c99a6b', '#a67b50', '#8d5e3c', '#6b4226',
  '#4a2d12', '#3a1f09',
];

const DEFAULT_HAIR_PRESETS = [
  '#0a0a0a', '#4a3728', '#8b6f47', '#c4a35a', '#d4a574', '#c43e1c',
  '#8b1a1a', '#e8e0d0',
];

export function ColorPicker({
  label,
  value,
  onChange,
  presets,
}: ColorPickerProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-studio-muted">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
          />
          <div
            className="w-8 h-8 rounded-md border border-studio-border cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className="studio-input w-24 font-mono text-xs"
          maxLength={7}
        />
      </div>
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {presets.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded-md border transition-all ${
                value === color
                  ? 'border-holo-500 ring-2 ring-holo-500/30 scale-110'
                  : 'border-studio-border hover:border-studio-muted'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

ColorPicker.SKIN_PRESETS = DEFAULT_SKIN_PRESETS;
ColorPicker.HAIR_PRESETS = DEFAULT_HAIR_PRESETS;
