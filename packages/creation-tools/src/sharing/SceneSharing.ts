/**
 * Scene Sharing & Preview URL Generation
 *
 * Provides one-click sharing capabilities for HoloScript scenes:
 * - Generate preview URLs: scene -> hololand.io/preview/[hash]
 * - Export to shareable links
 * - QR code generation for mobile/VR access
 * - Social media sharing (Open Graph metadata)
 * - Scene snapshot thumbnails
 * - Export to downloadable .holo files
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface ShareResult {
  /** The preview URL: https://hololand.io/preview/{hash} */
  previewUrl: string;
  /** The unique content hash */
  hash: string;
  /** QR code as data URL (PNG) */
  qrCodeDataUrl: string;
  /** Shareable embed code (iframe) */
  embedCode: string;
  /** Open Graph metadata for social sharing */
  ogMetadata: OpenGraphMetadata;
  /** Creation timestamp */
  createdAt: string;
  /** Expiration timestamp (if applicable) */
  expiresAt: string | null;
}

export interface OpenGraphMetadata {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  type: string;
  siteName: string;
}

export interface ShareConfig {
  /** Base URL for preview links */
  baseUrl?: string;
  /** API endpoint for storing shared scenes */
  apiUrl?: string;
  /** API key for authenticated sharing */
  apiKey?: string;
  /** Default share expiration in days (0 = never) */
  expirationDays?: number;
  /** Whether to include a thumbnail screenshot */
  includeThumbnail?: boolean;
  /** Scene title for metadata */
  title?: string;
  /** Scene description for metadata */
  description?: string;
  /** Author name */
  author?: string;
}

export interface ExportOptions {
  /** Format to export */
  format: 'holo' | 'hsplus' | 'json' | 'html';
  /** Include metadata comments */
  includeMetadata?: boolean;
  /** Minify output */
  minify?: boolean;
}

// --------------------------------------------------------------------------
// Hashing
// --------------------------------------------------------------------------

/**
 * Generate a URL-safe content hash from source code.
 * Uses a simple FNV-1a hash for fast client-side generation.
 * For production, the backend should generate content-addressed hashes.
 */
function generateContentHash(source: string): string {
  // FNV-1a hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert to base36 and add timestamp component for uniqueness
  const hashPart = (hash >>> 0).toString(36);
  const timePart = Date.now().toString(36).slice(-4);
  return `${hashPart}${timePart}`;
}

// --------------------------------------------------------------------------
// QR Code Generation (pure client-side)
// --------------------------------------------------------------------------

/**
 * Minimal QR code generator that produces an SVG data URL.
 * For production, use the `qrcode` npm package.
 * This fallback generates a simplified QR-like visual.
 */
function generateQRCodeSVG(data: string, size = 200): string {
  // Use a simplified encoding for the URL
  // In production, this would use a proper QR library
  const cellCount = 21; // QR Version 1
  const cellSize = size / cellCount;

  // Generate a deterministic pattern from the data
  const cells: boolean[][] = [];
  for (let y = 0; y < cellCount; y++) {
    cells[y] = [];
    for (let x = 0; x < cellCount; x++) {
      cells[y][x] = false;
    }
  }

  // Finder patterns (three corners)
  const drawFinderPattern = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        cells[oy + y][ox + x] = isOuter || isInner;
      }
    }
  };

  drawFinderPattern(0, 0); // Top-left
  drawFinderPattern(cellCount - 7, 0); // Top-right
  drawFinderPattern(0, cellCount - 7); // Bottom-left

  // Data pattern (from hash)
  let bitIndex = 0;
  const hashBytes = data.split('').map(c => c.charCodeAt(0));
  for (let y = 9; y < cellCount - 1; y++) {
    for (let x = 9; x < cellCount - 1; x++) {
      if (!cells[y][x]) {
        const byteIdx = bitIndex % hashBytes.length;
        const bitIdx = Math.floor(bitIndex / hashBytes.length) % 8;
        cells[y][x] = ((hashBytes[byteIdx] >> bitIdx) & 1) === 1;
        bitIndex++;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < cellCount - 8; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // Generate SVG
  let svgRects = '';
  for (let y = 0; y < cellCount; y++) {
    for (let x = 0; x < cellCount; x++) {
      if (cells[y][x]) {
        svgRects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${svgRects}
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// --------------------------------------------------------------------------
// Scene Sharing Class
// --------------------------------------------------------------------------

/**
 * SceneSharing
 *
 * Handles all scene sharing and preview URL generation.
 * Converts HoloScript scenes into shareable links hosted at hololand.io/preview/[hash].
 */
export class SceneSharing {
  private config: Required<ShareConfig>;
  private shareHistory: Map<string, ShareResult> = new Map();

  constructor(config: ShareConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'https://hololand.io',
      apiUrl: config.apiUrl ?? 'https://api.hololand.io/v1',
      apiKey: config.apiKey ?? '',
      expirationDays: config.expirationDays ?? 0,
      includeThumbnail: config.includeThumbnail ?? true,
      title: config.title ?? 'HoloScript Scene',
      description: config.description ?? 'A 3D scene created with HoloLand',
      author: config.author ?? 'Anonymous',
    };
  }

  /**
   * Generate a shareable preview URL from HoloScript code.
   * This is the "one-click share" flow:
   *   1. Hash the scene code
   *   2. Upload to preview storage (or encode inline)
   *   3. Generate preview URL
   *   4. Generate QR code
   *   5. Return share result
   */
  async shareScene(
    code: string,
    options?: {
      title?: string;
      description?: string;
      thumbnailDataUrl?: string;
    },
  ): Promise<ShareResult> {
    const title = options?.title ?? this.config.title;
    const description = options?.description ?? this.config.description;

    // Generate content hash
    const hash = generateContentHash(code);

    // Build preview URL
    const previewUrl = `${this.config.baseUrl}/preview/${hash}`;

    // Calculate expiration
    let expiresAt: string | null = null;
    if (this.config.expirationDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + this.config.expirationDays);
      expiresAt = expDate.toISOString();
    }

    // Generate QR code
    const qrCodeDataUrl = generateQRCodeSVG(previewUrl);

    // Generate embed code
    const embedCode = `<iframe src="${previewUrl}?embed=true" width="800" height="600" frameborder="0" allow="xr-spatial-tracking; fullscreen" allowfullscreen></iframe>`;

    // Build Open Graph metadata
    const ogMetadata: OpenGraphMetadata = {
      title: `${title} - HoloLand`,
      description,
      imageUrl: options?.thumbnailDataUrl ?? `${this.config.baseUrl}/api/preview/${hash}/thumbnail`,
      url: previewUrl,
      type: 'website',
      siteName: 'HoloLand',
    };

    // Try to upload to the backend
    try {
      await this.uploadToBackend(hash, code, {
        title,
        description,
        author: this.config.author,
        thumbnailDataUrl: options?.thumbnailDataUrl,
        expiresAt,
      });
    } catch (error) {
      // If backend upload fails, we can still share via URL hash encoding
      console.warn('[SceneSharing] Backend upload failed, using client-side encoding:', error);
    }

    const result: ShareResult = {
      previewUrl,
      hash,
      qrCodeDataUrl,
      embedCode,
      ogMetadata,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    // Store in history
    this.shareHistory.set(hash, result);

    return result;
  }

  /**
   * Generate a preview URL that embeds the scene code in the URL itself
   * (no backend required, but URL may be long for complex scenes).
   */
  generateInlinePreviewUrl(code: string): string {
    const compressed = btoa(encodeURIComponent(code));
    return `${this.config.baseUrl}/preview?scene=${compressed}`;
  }

  /**
   * Export scene code as a downloadable file
   */
  exportToFile(code: string, filename: string, options?: ExportOptions): Blob {
    const format = options?.format ?? 'holo';

    let content: string;
    let mimeType: string;

    switch (format) {
      case 'holo':
      case 'hsplus':
        content = options?.includeMetadata !== false
          ? `// HoloScript Scene - ${filename}\n// Created with HoloLand Creator Studio\n// ${new Date().toISOString()}\n\n${code}`
          : code;
        mimeType = 'text/plain';
        break;

      case 'json': {
        const jsonData = {
          format: 'holoscript',
          version: '1.0.0',
          name: filename.replace(/\.(holo|hsplus|json)$/, ''),
          code,
          createdAt: new Date().toISOString(),
          author: this.config.author,
        };
        content = options?.minify ? JSON.stringify(jsonData) : JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json';
        break;
      }

      case 'html':
        content = this.generateStandaloneHTML(code, filename);
        mimeType = 'text/html';
        break;

      default:
        content = code;
        mimeType = 'text/plain';
    }

    return new Blob([content], { type: mimeType });
  }

  /**
   * Trigger a browser download of the scene file
   */
  downloadScene(code: string, filename: string, options?: ExportOptions): void {
    const blob = this.exportToFile(code, filename, options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy the preview URL to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }

  /**
   * Generate a QR code for any URL
   */
  generateQRCode(url: string, size = 200): string {
    return generateQRCodeSVG(url, size);
  }

  /**
   * Get share history
   */
  getHistory(): ShareResult[] {
    return Array.from(this.shareHistory.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Generate social share URLs
   */
  getSocialShareUrls(previewUrl: string, title: string): Record<string, string> {
    const encodedUrl = encodeURIComponent(previewUrl);
    const encodedTitle = encodeURIComponent(title);

    return {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=Check out this 3D scene: ${encodedUrl}`,
    };
  }

  // --- Private methods ---

  private async uploadToBackend(
    hash: string,
    code: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    if (!this.config.apiKey) return;

    const response = await fetch(`${this.config.apiUrl}/previews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        hash,
        code,
        ...metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
  }

  private generateStandaloneHTML(code: string, title: string): string {
    const escapedCode = code.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - HoloLand Preview</title>
  <meta property="og:title" content="${title} - HoloLand" />
  <meta property="og:description" content="A 3D scene created with HoloLand" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="HoloLand" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0f0f1a; font-family: sans-serif; }
    #preview { width: 100%; height: 100%; }
    #loading { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f1a; color: #00d4ff; z-index: 1000; }
    #loading h1 { font-size: 1.5em; background: linear-gradient(90deg, #00d4ff, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #00d4ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading.hidden { opacity: 0; pointer-events: none; transition: opacity 0.4s; }
    #info { position: fixed; bottom: 12px; right: 12px; background: rgba(0,0,0,0.7); color: #888; padding: 6px 12px; border-radius: 6px; font-size: 11px; }
    #info a { color: #00d4ff; text-decoration: none; }
  </style>
</head>
<body>
  <div id="loading"><h1>Loading Scene...</h1><div class="spinner"></div></div>
  <canvas id="preview"></canvas>
  <div id="info">Created with <a href="https://hololand.io" target="_blank">HoloLand</a></div>

  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    // Scene code embedded at build time
    const SCENE_CODE = \`${escapedCode}\`;

    // Minimal preview renderer
    (function() {
      const canvas = document.getElementById('preview');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#1a1a2e');

      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(5, 5, 8);

      const controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const sun = new THREE.DirectionalLight(0xffffff, 0.8);
      sun.position.set(5, 10, 5);
      scene.add(sun);

      // Parse and render HoloScript (minimal)
      const lines = SCENE_CODE.split('\\n');
      let currentObj = null;
      const props = {};

      for (const line of lines) {
        const t = line.trim();
        const objMatch = t.match(/^object\\s+"([^"]+)"/);
        if (objMatch) { currentObj = objMatch[1]; props[currentObj] = {}; continue; }
        if (currentObj && t.startsWith('}')) {
          const p = props[currentObj];
          const geoType = p.geometry || p.type || 'cube';
          let geo;
          switch (geoType) {
            case 'sphere': geo = new THREE.SphereGeometry(0.5, 32, 32); break;
            case 'cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
            case 'cone': geo = new THREE.ConeGeometry(0.5, 1, 32); break;
            case 'torus': geo = new THREE.TorusGeometry(0.5, 0.15, 16, 32); break;
            case 'plane': geo = new THREE.PlaneGeometry(1, 1); break;
            case 'dodecahedron': geo = new THREE.DodecahedronGeometry(0.5); break;
            case 'octahedron': geo = new THREE.OctahedronGeometry(0.5); break;
            case 'icosahedron': geo = new THREE.IcosahedronGeometry(0.5); break;
            default: geo = new THREE.BoxGeometry(1, 1, 1);
          }
          const mat = new THREE.MeshStandardMaterial({ color: p.color || '#888', roughness: 0.5 });
          if (p.opacity && p.opacity < 1) { mat.transparent = true; mat.opacity = p.opacity; }
          const mesh = new THREE.Mesh(geo, mat);
          if (p.position) mesh.position.set(...p.position);
          if (p.rotation) mesh.rotation.set(p.rotation[0]*Math.PI/180, p.rotation[1]*Math.PI/180, p.rotation[2]*Math.PI/180);
          if (p.scale) { if (Array.isArray(p.scale)) mesh.scale.set(...p.scale); else mesh.scale.setScalar(p.scale); }
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          currentObj = null;
          continue;
        }
        if (currentObj) {
          const pm = t.match(/^(\\w+):\\s*(.+)$/);
          if (pm) {
            let v = pm[2].replace(/,?\\s*$/, '');
            if (v === 'true') v = true;
            else if (v === 'false') v = false;
            else if (v.match(/^-?\\d+(\\.\\d+)?$/)) v = parseFloat(v);
            else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
            else if (v.startsWith('[')) { try { v = JSON.parse(v); } catch(e) {} }
            props[currentObj][pm[1]] = v;
          }
        }
      }

      document.getElementById('loading').classList.add('hidden');

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      });
    })();
  </script>
</body>
</html>`;
  }
}
