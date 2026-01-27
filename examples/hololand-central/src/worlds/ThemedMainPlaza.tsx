import React, { useRef, useState } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Portal } from '../components/Portal';
import { ThemedEnvironment } from '../components/ThemedEnvironment';
import { getTheme, getNextTheme } from '../themes/themes';
import { Theme } from '../themes/types';
import { EasterEggsProximityLayer } from '../easter-eggs/EasterEggsProximityLayer';
import { usePlayerPositionGetter } from '../easter-eggs/usePlayerPosition';

interface ThemedMainPlazaProps {
  onPortalClick: (worldName: string) => void;
  currentTheme?: string;
  onThemeChange?: (themeName: string) => void;
}

export const ThemedMainPlaza: React.FC<ThemedMainPlazaProps> = ({
  onPortalClick,
  currentTheme = 'cyberpunk',
  onThemeChange,
}) => {
  const platformRef = useRef<Mesh>(null);
  const [theme, setTheme] = useState<Theme>(getTheme(currentTheme));
  const getPlayerPosition = usePlayerPositionGetter();

  // Subtle platform animation
  useFrame((state) => {
    if (platformRef.current) {
      platformRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const handleThemeChange = () => {
    const nextTheme = getNextTheme(theme.name);
    setTheme(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme.name);
    }
  };

  const plazaCode = `
    environment #mainEnv {
      name: "${theme.name === 'cyberpunk' ? 'cyberpunk_city' : 'forest_sunset'}"
    }

    cylinder #platform {
      position: [0, 0.1, 0]
      size: 15
      color: "${theme.colors.secondary}"
      @material(type: "pbr", metallic: 0.7, roughness: 0.3)
    }

    # ... other objects can be dynamically generated here or loaded from .holo
  `;

  // For this POC, we'll use the HoloScriptR3FRenderer with a parsed AST
  // In a real scenario, we'd load the .holo file via a loader.
  const { HoloScriptPlusParser } = require('@holoscript/core');
  const parser = useMemo(() => new HoloScriptPlusParser(), []);
  const ast = useMemo(() => parser.parse(plazaCode).ast, [plazaCode, parser]);

  return (
    <HoloScriptR3FRenderer ast={ast} debug={false} />
  );
};
