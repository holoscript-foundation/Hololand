/**
 * HoloScriptGenerator - Generate .hsplus visualizations from token metadata
 *
 * Creates ready-to-render HoloScript code from Base chain token data.
 * Supports multiple visualization styles for different use cases.
 *
 * @example
 * ```typescript
 * import { HoloScriptGenerator } from '@hololand/base-token-viz';
 *
 * const generator = new HoloScriptGenerator();
 * const script = generator.generateOrb({
 *   name: 'USD Coin',
 *   symbol: 'USDC',
 *   decimals: 6,
 *   address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
 * });
 * ```
 *
 * @module
 */

import type { TokenMetadata } from './BaseTokenFetcher';
import type { ClankerTokenMetadata } from './ClankerTokenFetcher';

/**
 * Visualization style options
 */
export type VizStyle = 'orb' | 'cube' | 'pedestal' | 'floating' | 'galaxy';

/**
 * Color scheme presets
 */
export interface ColorScheme {
  primary: string;
  secondary: string;
  glow: string;
  background: string;
}

/**
 * Generator configuration
 */
export interface GeneratorOptions {
  /** Visualization style */
  style?: VizStyle;
  /** Color scheme */
  colors?: Partial<ColorScheme>;
  /** Enable glow effect */
  glow?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Enable grabbable trait */
  grabbable?: boolean;
  /** Custom scale factor */
  scale?: number;
  /** Include world configuration */
  includeWorld?: boolean;
  /** Show Clanker-specific info (fid, factory, etc.) */
  showClankerInfo?: boolean;
  /** Show warning indicators for risky tokens */
  showWarnings?: boolean;
  /** Show token logo as texture (default: true if logoUrl available) */
  showLogo?: boolean;
}

/**
 * Default color schemes by token type
 */
const COLOR_SCHEMES: Record<string, ColorScheme> = {
  default: {
    primary: '#00d4ff',
    secondary: '#0088cc',
    glow: '#00ffff',
    background: '#16213e',
  },
  stablecoin: {
    primary: '#00ff88',
    secondary: '#00cc66',
    glow: '#66ffaa',
    background: '#0f2f1f',
  },
  meme: {
    primary: '#ff6600',
    secondary: '#ff3300',
    glow: '#ffaa00',
    background: '#2f1f0f',
  },
  defi: {
    primary: '#8b5cf6',
    secondary: '#6d28d9',
    glow: '#a78bfa',
    background: '#1f0f2f',
  },
  clanker: {
    primary: '#7c3aed',
    secondary: '#5b21b6',
    glow: '#a78bfa',
    background: '#1a0a2e',
  },
  warning: {
    primary: '#ef4444',
    secondary: '#dc2626',
    glow: '#f87171',
    background: '#2f0f0f',
  },
};

/**
 * Detect token category from symbol/name
 */
function detectTokenCategory(symbol: string, name: string): keyof typeof COLOR_SCHEMES {
  const combined = `${symbol} ${name}`.toLowerCase();

  // Stablecoins
  if (/usdc|usdt|dai|busd|tusd|frax|usd/i.test(combined)) {
    return 'stablecoin';
  }

  // Meme tokens (common patterns)
  if (/doge|shib|pepe|wojak|inu|cat|dog|frog|moon|elon/i.test(combined)) {
    return 'meme';
  }

  // DeFi protocols
  if (/aave|comp|uni|sushi|curve|lido|maker|yearn/i.test(combined)) {
    return 'defi';
  }

  return 'default';
}

/**
 * HoloScript code generator for token visualizations
 */
export class HoloScriptGenerator {
  private defaultOptions: GeneratorOptions = {
    style: 'orb',
    glow: true,
    animated: true,
    grabbable: true,
    scale: 1,
    includeWorld: true,
    showClankerInfo: true,
    showWarnings: true,
  };

  /**
   * Check if metadata is Clanker metadata
   */
  private isClankerMetadata(
    metadata: Partial<TokenMetadata>
  ): metadata is Partial<ClankerTokenMetadata> {
    return (
      'isClanker' in metadata && (metadata as Partial<ClankerTokenMetadata>).isClanker === true
    );
  }

  /**
   * Generate complete HoloScript for a token
   *
   * @param metadata - Token metadata from BaseTokenFetcher
   * @param options - Visualization options
   * @returns HoloScript code string
   */
  generate(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const style = opts.style || 'orb';

    switch (style) {
      case 'orb':
        return this.generateOrb(metadata, opts);
      case 'cube':
        return this.generateCube(metadata, opts);
      case 'pedestal':
        return this.generatePedestal(metadata, opts);
      case 'floating':
        return this.generateFloating(metadata, opts);
      case 'galaxy':
        return this.generateGalaxy(metadata, opts);
      default:
        return this.generateOrb(metadata, opts);
    }
  }

  /**
   * Generate a glowing orb visualization
   */
  generateOrb(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const colors = this.resolveColors(metadata, opts.colors, opts.showWarnings);
    const traits = this.buildTraits(opts, metadata);
    const id = this.sanitizeId(metadata.symbol || 'token');
    const showLogo = opts.showLogo !== false && metadata.logoUrl;

    let script = '';

    if (opts.includeWorld) {
      script += this.generateWorldConfig(colors);
    }

    script += `
composition "TokenViz_${id}" {
  template "TokenOrb" {
    ${
      traits
        .split(' ')
        .filter((t) => t)
        .map((t) => `    ${t}`)
        .join('\n') || '    @physics\n    @collidable'
    }
    geometry: "sphere"
    color: "${showLogo ? '#ffffff' : colors.primary}"
    ${opts.glow ? `emissive: "${colors.glow}"` : ''}
    ${opts.glow ? `emissiveIntensity: ${showLogo ? 0.15 : 0.4}` : ''}
    ${showLogo ? `texture: "${metadata.logoUrl}"` : ''}
    ${showLogo ? 'textureRepeat: [3, 3]' : ''}
    ${showLogo ? 'textureOffset: [0.33, 0.33]' : ''}

    label: "${metadata.symbol || 'TOKEN'} - ${metadata.name || 'Unknown Token'}"
    labelPosition: [0, 0.8, 0]
    labelColor: "#ffffff"
    labelSize: 0.15
${opts.animated ? this.generateAnimation('orb', id) : ''}
  }

  object "${id}" using "TokenOrb" {
    position: [0, 1.5, 0]
    scale: [${opts.scale}, ${opts.scale}, ${opts.scale}]
  }
}
`.trim();

    // Add info panel
    script += this.generateInfoPanel(metadata, colors, opts);

    return script.trim();
  }

  /**
   * Generate a cube visualization
   */
  generateCube(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const colors = this.resolveColors(metadata, opts.colors, opts.showWarnings);
    const traits = this.buildTraits(opts, metadata);
    const id = this.sanitizeId(metadata.symbol || 'token');
    const showLogo = opts.showLogo !== false && metadata.logoUrl;

    let script = '';

    if (opts.includeWorld) {
      script += this.generateWorldConfig(colors);
    }

    const cubeScale = (opts.scale ?? 1) * 0.8;

    script += `
composition "TokenCubeViz_${id}" {
  template "TokenCube" {
    ${
      traits
        .split(' ')
        .filter((t) => t)
        .map((t) => `    ${t}`)
        .join('\n') || '    @physics\n    @collidable'
    }
    geometry: "box"
    color: "${colors.primary}"
    ${opts.glow ? `emissive: "${colors.glow}"` : ''}
    ${opts.glow ? 'emissiveIntensity: 0.3' : ''}

    label: "${metadata.symbol || 'TOKEN'}"
    labelPosition: [0, 0.7, 0]
    labelColor: "#ffffff"
${opts.animated ? this.generateAnimation('cube', id) : ''}
  }

  object "${id}" using "TokenCube" {
    position: [0, 1.5, 0]
    scale: [${cubeScale}, ${cubeScale}, ${cubeScale}]
  }
}
`.trim();

    // Add floating logo on front of cube
    if (showLogo && metadata.logoUrl) {
      script += this.generateFloatingLogo(metadata.logoUrl, cubeScale);
    }

    script += this.generateInfoPanel(metadata, colors, opts);

    return script.trim();
  }

  /**
   * Generate a pedestal display
   */
  generatePedestal(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const colors = this.resolveColors(metadata, opts.colors, opts.showWarnings);
    const traits = this.buildTraits(opts, metadata);
    const id = this.sanitizeId(metadata.symbol || 'token');
    const showLogo = opts.showLogo !== false && metadata.logoUrl;

    let script = '';

    if (opts.includeWorld) {
      script += this.generateWorldConfig(colors);
    }

    script += `
composition "TokenPedestal_${id}" {
  template "PedestalBase" {
    @static
    geometry: "cylinder"
    color: "#2a2a3a"
  }

  template "TokenOrb" {
    ${
      traits
        .split(' ')
        .filter((t) => t)
        .map((t) => `    ${t}`)
        .join('\n') || '    @physics\n    @collidable'
    }
    geometry: "sphere"
    color: "${colors.primary}"
    ${opts.glow ? `emissive: "${colors.glow}"` : ''}
    ${opts.glow ? 'emissiveIntensity: 0.5' : ''}
  }
${
  showLogo && metadata.logoUrl
    ? `
  template "TokenLogo" {
    @billboard
    type: "image"
    src: "${metadata.logoUrl}"
    opacity: 0.95
  }
`
    : ''
}
  template "TokenLabel" {
    type: "text"
    content: "${metadata.symbol || 'TOKEN'} - ${metadata.name || 'Unknown'}"
    color: "#ffffff"
    fontSize: 0.2
    align: "center"
  }

  // Pedestal base
  object "PedestalBase" using "PedestalBase" {
    position: [0, 0.25, 0]
    scale: [1.2, 0.5, 1.2]
  }

  // Token orb on pedestal
  object "${id}" using "TokenOrb" {
    position: [0, 1.2, 0]
    scale: [${(opts.scale ?? 1) * 0.6}, ${(opts.scale ?? 1) * 0.6}, ${(opts.scale ?? 1) * 0.6}]
  }
${
  showLogo && metadata.logoUrl
    ? `
  // Token logo
  object "LogoFront" using "TokenLogo" {
    position: [0, 1.2, ${(opts.scale ?? 1) * 0.35}]
    scale: [${(opts.scale ?? 1) * 0.3}, ${(opts.scale ?? 1) * 0.3}, 1]
  }
`
    : ''
}
  // Token label
  object "Label" using "TokenLabel" {
    position: [0, 2, 0]
  }
${opts.animated ? this.generateAnimation('pedestal', id) : ''}
}
`.trim();

    script += this.generateInfoPanel(metadata, colors, opts);

    return script.trim();
  }

  /**
   * Generate floating particles visualization
   */
  generateFloating(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const colors = this.resolveColors(metadata, opts.colors, opts.showWarnings);
    const traits = this.buildTraits(opts, metadata);
    const id = this.sanitizeId(metadata.symbol || 'token');

    let script = '';

    if (opts.includeWorld) {
      script += this.generateWorldConfig(colors);
    }

    // Generate multiple floating orbs
    const positions = [
      [0, 1.5, 0],
      [-1.5, 2, -0.5],
      [1.5, 1.8, 0.5],
      [-0.8, 2.5, 1],
      [1, 2.2, -1],
    ];

    script += `
composition "TokenFloating_${id}" {
  template "MainOrb" {
    ${
      traits
        .split(' ')
        .filter((t) => t)
        .map((t) => `    ${t}`)
        .join('\n') || '    @physics\n    @collidable'
    }
    geometry: "sphere"
    color: "${colors.primary}"
    emissive: "${colors.glow}"
    emissiveIntensity: 0.5
    label: "${metadata.symbol || 'TOKEN'}"
  }

  template "FloatingOrb" {
    @glowing
    geometry: "sphere"
    color: "${colors.secondary}"
    emissive: "${colors.glow}"
    emissiveIntensity: 0.3
  }
`;
    positions.forEach((pos, i) => {
      const size = i === 0 ? opts.scale! : opts.scale! * (0.3 + Math.random() * 0.3);
      if (i === 0) {
        script += `
  object "${id}_main" using "MainOrb" {
    position: [${pos.join(', ')}]
    scale: [${size}, ${size}, ${size}]
  }
`;
      } else {
        script += `
  object "${id}_${i}" using "FloatingOrb" {
    position: [${pos.join(', ')}]
    scale: [${size}, ${size}, ${size}]
  }
`;
      }
    });
    script += `
}
`;

    script += this.generateAnimation('floating', id);
    script += this.generateInfoPanel(metadata, colors, opts);

    return script.trim();
  }

  /**
   * Generate galaxy-style visualization
   */
  generateGalaxy(metadata: Partial<TokenMetadata>, options: GeneratorOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const colors = this.resolveColors(metadata, opts.colors, opts.showWarnings);
    const traits = this.buildTraits(opts, metadata);
    const id = this.sanitizeId(metadata.symbol || 'token');
    const showLogo = opts.showLogo !== false && metadata.logoUrl;

    let script = '';

    if (opts.includeWorld) {
      script += `
// Environment configuration
environment {
  backgroundColor: "#0a0a1a"
  fog: { type: "exponential", color: "#0a0a1a", density: 0.02 }
  camera: { position: [0, 3, 10], fov: 60 }
  ambient: 0.1
}

`;
    }

    const galaxyOrbScale = opts.scale! * 1.2;

    script += `
composition "TokenGalaxy_${id}" {
  template "CoreOrb" {
    ${
      traits
        .split(' ')
        .filter((t) => t)
        .map((t) => `    ${t}`)
        .join('\n') || '    @physics\n    @collidable'
    }
    geometry: "sphere"
    color: "${colors.primary}"
    emissive: "${colors.glow}"
    emissiveIntensity: 0.6
    label: "${metadata.symbol || 'TOKEN'}"
    labelPosition: [0, 1.5, 0]
  }
${
  showLogo && metadata.logoUrl
    ? `
  template "TokenLogo" {
    @billboard
    type: "image"
    src: "${metadata.logoUrl}"
    opacity: 0.95
  }
`
    : ''
}
  template "OrbitParticle" {
    @glowing
    geometry: "sphere"
    color: "${colors.secondary}"
    emissive: "${colors.glow}"
  }

  // Central token
  object "${id}_core" using "CoreOrb" {
    position: [0, 2, 0]
    scale: [${galaxyOrbScale}, ${galaxyOrbScale}, ${galaxyOrbScale}]
  }
${
  showLogo && metadata.logoUrl
    ? `
  // Token logo
  object "LogoFront" using "TokenLogo" {
    position: [0, 2, ${galaxyOrbScale * 0.65}]
    scale: [${galaxyOrbScale * 0.5}, ${galaxyOrbScale * 0.5}, 1]
  }
`
    : ''
}
  // Orbiting particles
`;

    // Add orbiting particles
    const orbitCount = 12;
    for (let i = 0; i < orbitCount; i++) {
      const angle = (i / orbitCount) * Math.PI * 2;
      const radius = 2 + Math.random();
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 2 + (Math.random() - 0.5) * 2;
      const size = 0.1 + Math.random() * 0.15;

      script += `  object "particle_${i}" using "OrbitParticle" { position: [${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}] scale: [${size.toFixed(2)}, ${size.toFixed(2)}, ${size.toFixed(2)}] }\n`;
    }
    script += `}`;

    script += this.generateAnimation('galaxy', id);
    script += this.generateInfoPanel(metadata, colors, opts);

    return script.trim();
  }

  /**
   * Generate world configuration block
   */
  private generateWorldConfig(colors: ColorScheme): string {
    return `// Environment configuration
environment {
  backgroundColor: "${colors.background}"
  fog: { type: "linear", color: "${colors.background}", near: 10, far: 50 }
  camera: { position: [0, 2, 6], fov: 60 }
  ambient: 0.3
  shadows: true
}

`;
  }

  /**
   * Build trait string from options
   */
  private buildTraits(options: GeneratorOptions, metadata?: Partial<TokenMetadata>): string {
    const traits: string[] = [];

    if (options.grabbable) traits.push('@grabbable');
    if (options.glow) traits.push('@glowing');
    if (options.animated) traits.push('@animated');

    // Add warning trait for Clanker tokens with warnings
    if (options.showWarnings && metadata && this.isClankerMetadata(metadata)) {
      const clankerMeta = metadata as Partial<ClankerTokenMetadata>;
      if (clankerMeta.warnings && clankerMeta.warnings.length > 0) {
        traits.push('@warning');
      }
    }

    return traits.join(' ');
  }

  /**
   * Resolve color scheme from metadata and overrides
   */
  private resolveColors(
    metadata: Partial<TokenMetadata>,
    overrides?: Partial<ColorScheme>,
    showWarnings?: boolean
  ): ColorScheme {
    // Check for Clanker tokens with warnings first
    if (showWarnings && this.isClankerMetadata(metadata)) {
      const clankerMeta = metadata as Partial<ClankerTokenMetadata>;
      if (clankerMeta.warnings && clankerMeta.warnings.length > 0) {
        return {
          ...COLOR_SCHEMES.warning,
          ...overrides,
        };
      }
      // Use clanker color scheme for Clanker tokens
      return {
        ...COLOR_SCHEMES.clanker,
        ...overrides,
      };
    }

    const category = detectTokenCategory(metadata.symbol || '', metadata.name || '');
    const baseColors = COLOR_SCHEMES[category] || COLOR_SCHEMES.default;

    return {
      ...baseColors,
      ...overrides,
    };
  }

  /**
   * Generate animation code for different styles
   */
  private generateAnimation(style: string, id: string): string {
    switch (style) {
      case 'orb':
      case 'cube':
        return `
  animation rotate {
    property: "rotation.y"
    from: 0
    to: 360
    duration: 8000
    loop: infinite
    easing: "linear"
  }
  
  animation float {
    property: "position.y"
    from: 1.5
    to: 1.8
    duration: 2000
    loop: infinite
    easing: "easeInOut"
    yoyo: true
  }
`;
      case 'pedestal':
        return `
animation#${id}_spin {
  target: "${id}"
  property: "rotation.y"
  from: 0
  to: 360
  duration: 10000
  loop: infinite
}
`;
      case 'floating':
      case 'galaxy':
        return `
animation#orbit {
  property: "rotation.y"
  from: 0
  to: 360
  duration: 20000
  loop: infinite
  easing: "linear"
}
`;
      default:
        return '';
    }
  }

  /**
   * Generate info panel with token details
   */
  private generateInfoPanel(
    metadata: Partial<TokenMetadata>,
    colors: ColorScheme,
    options?: GeneratorOptions
  ): string {
    const address = metadata.address || '0x...';
    const supply = metadata.totalSupplyFormatted || 'N/A';
    const chain = 'Base';

    // Check for Clanker metadata
    const isClanker = this.isClankerMetadata(metadata);
    const clankerMeta = isClanker ? (metadata as Partial<ClankerTokenMetadata>) : null;
    const showClankerInfo = options?.showClankerInfo ?? true;
    const showLogo = options?.showLogo !== false && metadata.logoUrl;

    let panelHeight = 2;
    let clankerSection = '';
    let logoSection = '';

    if (isClanker && clankerMeta && showClankerInfo) {
      panelHeight = 2.8;
      clankerSection = this.generateClankerInfoSection(clankerMeta, colors);
    }

    // Add logo if available
    if (showLogo && metadata.logoUrl) {
      logoSection = this.generateLogoSection(metadata.logoUrl);
    }

    return `

// Token info panel (using spatial_group for grouped elements)
spatial_group "InfoPanel" {
  position: [3, 1.5, 0]
  rotation: [0, -30, 0]

  object "PanelBackground" {
    type: "plane"
    position: [0, 0, -0.01]
    scale: [2.5, ${panelHeight}, 1]
    color: "#1a1a2e"
    opacity: 0.9
  }
${logoSection}
  object "Title" {
    type: "text"
    position: [${showLogo ? '0.3' : '0'}, 0.6, 0]
    content: "${metadata.symbol || 'TOKEN'}"
    color: "${colors.primary}"
    fontSize: 0.25
    fontWeight: "bold"
  }

  object "Name" {
    type: "text"
    position: [${showLogo ? '0.3' : '0'}, 0.3, 0]
    content: "${metadata.name || 'Unknown Token'}"
    color: "#cccccc"
    fontSize: 0.12
  }

  object "AddressLabel" {
    type: "text"
    position: [-0.8, 0, 0]
    content: "Address:"
    color: "#888888"
    fontSize: 0.08
  }

  object "AddressValue" {
    type: "text"
    position: [0.2, 0, 0]
    content: "${address.slice(0, 6)}...${address.slice(-4)}"
    color: "#00d4ff"
    fontSize: 0.08
  }

  object "SupplyLabel" {
    type: "text"
    position: [-0.8, -0.2, 0]
    content: "Supply:"
    color: "#888888"
    fontSize: 0.08
  }

  object "SupplyValue" {
    type: "text"
    position: [0.2, -0.2, 0]
    content: "${supply}"
    color: "#ffffff"
    fontSize: 0.08
  }

  object "ChainLabel" {
    type: "text"
    position: [-0.8, -0.4, 0]
    content: "Chain:"
    color: "#888888"
    fontSize: 0.08
  }

  object "ChainValue" {
    type: "text"
    position: [0.2, -0.4, 0]
    content: "${chain} (8453)"
    color: "#0052ff"
    fontSize: 0.08
  }
${clankerSection}
}
`;
  }

  /**
   * Generate Clanker-specific info section for the panel
   */
  private generateClankerInfoSection(
    metadata: Partial<ClankerTokenMetadata>,
    _colors: ColorScheme
  ): string {
    const lines: string[] = [];
    let yOffset = -0.6;

    // Clanker badge
    lines.push(`
  // Clanker badge
  object "ClankerBadge" {
    type: "plane"
    position: [0.8, 0.6, 0.01]
    scale: [0.4, 0.15, 1]
    color: "#7c3aed"
  }
  object "ClankerLabel" {
    type: "text"
    position: [0.8, 0.6, 0.02]
    content: "CLANKER"
    color: "#ffffff"
    fontSize: 0.06
  }`);

    // Factory version
    if (metadata.factoryVersion && metadata.factoryVersion !== 'unknown') {
      lines.push(`
  object "FactoryLabel" {
    type: "text"
    position: [-0.8, ${yOffset}, 0]
    content: "Factory:"
    color: "#888888"
    fontSize: 0.08
  }
  object "FactoryValue" {
    type: "text"
    position: [0.2, ${yOffset}, 0]
    content: "${metadata.factoryVersion}"
    color: "#a78bfa"
    fontSize: 0.08
  }`);
      yOffset -= 0.2;
    }

    // Farcaster ID
    if (metadata.fid) {
      lines.push(`
  object "FidLabel" {
    type: "text"
    position: [-0.8, ${yOffset}, 0]
    content: "Creator FID:"
    color: "#888888"
    fontSize: 0.08
  }
  object "FidValue" {
    type: "text"
    position: [0.2, ${yOffset}, 0]
    content: "#${metadata.fid}"
    color: "#8b5cf6"
    fontSize: 0.08
  }`);
      yOffset -= 0.2;
    }

    // Deployment date
    if (metadata.deployedAt) {
      const dateStr = metadata.deployedAt.toLocaleDateString();
      lines.push(`
  object "DeployedLabel" {
    type: "text"
    position: [-0.8, ${yOffset}, 0]
    content: "Deployed:"
    color: "#888888"
    fontSize: 0.08
  }
  object "DeployedValue" {
    type: "text"
    position: [0.2, ${yOffset}, 0]
    content: "${dateStr}"
    color: "#cccccc"
    fontSize: 0.08
  }`);
      yOffset -= 0.2;
    }

    // Warnings
    if (metadata.warnings && metadata.warnings.length > 0) {
      const warningText = metadata.warnings.join(', ');
      lines.push(`
  // Warning indicator
  object "WarningBackground" {
    type: "plane"
    position: [0, ${yOffset - 0.1}, 0]
    scale: [2.2, 0.25, 1]
    color: "#ef4444"
    opacity: 0.3
  }
  object "WarningIcon" {
    type: "text"
    position: [-0.9, ${yOffset - 0.1}, 0.01]
    content: "⚠"
    color: "#ef4444"
    fontSize: 0.12
  }
  object "WarningText" {
    type: "text"
    position: [0, ${yOffset - 0.1}, 0.01]
    content: "${warningText.length > 30 ? warningText.slice(0, 27) + '...' : warningText}"
    color: "#fca5a5"
    fontSize: 0.07
  }`);
    }

    return lines.join('');
  }

  /**
   * Generate logo section for info panel
   */
  private generateLogoSection(logoUrl: string): string {
    return `
  // Token logo
  object "TokenLogo" {
    type: "image"
    position: [-0.9, 0.45, 0.02]
    scale: [0.35, 0.35, 1]
    src: "${logoUrl}"
    borderRadius: 0.18
  }
`;
  }

  /**
   * Generate floating logo plane on front of object
   */
  private generateFloatingLogo(logoUrl: string, scale: number): string {
    const logoScale = scale * 0.5; // Logo is 50% of orb size
    return `

// Token logo (front)
object "LogoFront" {
  @billboard
  type: "image"
  position: [0, 1.5, ${scale * 0.55}]
  scale: [${logoScale}, ${logoScale}, 1]
  src: "${logoUrl}"
  opacity: 0.95
  borderRadius: ${logoScale * 0.15}
}
`;
  }

  /**
   * Sanitize token symbol for use as ID
   */
  private sanitizeId(symbol: string): string {
    return symbol.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
}

/**
 * Create a HoloScriptGenerator with default options
 */
export function createGenerator(): HoloScriptGenerator {
  return new HoloScriptGenerator();
}

export default HoloScriptGenerator;
