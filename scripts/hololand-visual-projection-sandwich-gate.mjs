#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const SCHEMA = 'hololand.visual-projection-sandwich-gate.receipt.v0.1.0';
const DEFAULT_GATE_DIR = path.join('apps', 'holoshell', 'enterprise-gates', 'geolocation-gis-map-room');
const DEFAULT_OUTPUT_DIR = path.join('.tmp', 'hololand', 'visual-projection-sandwich', 'geolocation-gis-map-room');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    gateDir: DEFAULT_GATE_DIR,
    manifest: '',
    source: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    receipt: '',
    html: '',
    js: '',
    mcpStatus: '',
    mcpFormat: '',
    mcpSummary: '',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    if (arg === '--gate-dir') args.gateDir = next();
    else if (arg === '--manifest') args.manifest = next();
    else if (arg === '--source') args.source = next();
    else if (arg === '--output-dir') args.outputDir = next();
    else if (arg === '--receipt') args.receipt = next();
    else if (arg === '--html') args.html = next();
    else if (arg === '--js') args.js = next();
    else if (arg === '--mcp-status') args.mcpStatus = next();
    else if (arg === '--mcp-format') args.mcpFormat = next();
    else if (arg === '--mcp-summary') args.mcpSummary = next();
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  args.gateDir = resolveRepoPath(args.gateDir);
  args.manifest = args.manifest ? resolveRepoPath(args.manifest) : path.join(args.gateDir, 'package-gate.json');
  args.outputDir = resolveRepoPath(args.outputDir);
  args.receipt = args.receipt ? resolveRepoPath(args.receipt) : path.join(args.outputDir, 'receipt.json');
  args.html = args.html ? resolveRepoPath(args.html) : path.join(args.outputDir, 'gate.html');
  args.js = args.js ? resolveRepoPath(args.js) : path.join(args.outputDir, 'gate-receipt.js');
  return args;
}

function usage() {
  return `Usage: node scripts/hololand-visual-projection-sandwich-gate.mjs [options]

Builds a HoloLand visual projection sandwich gate from HoloScript-facing source
and a package-gate manifest. The output is a receipt plus a renderable HTML
projection for local/browser proof.

Options:
  --gate-dir <dir>       Gate directory (default: ${DEFAULT_GATE_DIR})
  --manifest <file>      Gate manifest JSON
  --source <file>        HoloScript source override
  --output-dir <dir>     Evidence directory (default: ${DEFAULT_OUTPUT_DIR})
  --receipt <file>       Receipt JSON path
  --html <file>          Render HTML path
  --js <file>            Receipt bootstrap JS path
  --mcp-status <status>  Optional mcp__holoscript.validate_holoscript status
  --mcp-format <format>  Optional MCP validator format
  --mcp-summary <text>   Optional MCP validator summary
  --json                 Print receipt JSON
  -h, --help             Show this help
`;
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(REPO_ROOT, filePath);
}

function relativeToRepo(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function bracesBalanced(source) {
  let depth = 0;
  for (const char of source) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function extractQuotedBlockNames(source, keyword) {
  const names = [];
  const regex = new RegExp(`${keyword}\\s+"([^"]+)"`, 'g');
  let match;
  while ((match = regex.exec(source))) names.push(match[1]);
  return names;
}

function requireArrayIncludes(errors, array, field, requiredValues) {
  if (!Array.isArray(array)) {
    errors.push(`${field} must be an array`);
    return;
  }
  for (const value of requiredValues) {
    if (!array.includes(value)) errors.push(`${field} missing ${value}`);
  }
}

function validateManifest(manifest, sourcePath) {
  const errors = [];
  if (manifest.schema !== 'hololand.visual-projection-sandwich-gate.v0.1.0') errors.push('manifest schema mismatch');
  if (manifest.id !== 'geolocation-gis-map-room') errors.push('manifest id must be geolocation-gis-map-room');
  if (manifest.packageClass !== 'enterprise_business_solution') errors.push('manifest packageClass must be enterprise_business_solution');
  if (manifest.developerPackageSurface !== false) errors.push('developerPackageSurface must be false');
  if (manifest.humanUserSurface !== 'deployed_hololand_room') errors.push('humanUserSurface must be deployed_hololand_room');
  if (manifest.sourcePath !== relativeToRepo(sourcePath)) errors.push(`manifest sourcePath mismatch: ${manifest.sourcePath}`);
  if (!manifest.businessWorkflow?.id) errors.push('businessWorkflow.id is required');
  if (manifest.sourceProjection?.contractOwner !== 'HoloScript') errors.push('sourceProjection.contractOwner must be HoloScript');
  if (manifest.sourceProjection?.schemaVersion !== 'holoscript.visual.projection.v1') {
    errors.push('sourceProjection.schemaVersion must be holoscript.visual.projection.v1');
  }
  if (manifest.sourceProjection?.projectionId !== 'geolocation-gis.base-map-room') {
    errors.push('sourceProjection.projectionId must be geolocation-gis.base-map-room');
  }
  if (!String(manifest.sourceProjection?.sourcePackage || '').startsWith('@holoscript/')) {
    errors.push('sourceProjection.sourcePackage must be an upstream HoloScript package');
  }
  requireArrayIncludes(errors, manifest.sourceProjection?.requiredObjectMappings, 'sourceProjection.requiredObjectMappings', [
    'map-layer',
    'poi-marker',
    'route-path',
    'geofence-zone',
  ]);
  requireArrayIncludes(errors, manifest.sourceProjection?.requiredPanelMappings, 'sourceProjection.requiredPanelMappings', [
    'location-detail-panel',
    'route-timeline-panel',
    'geo-receipt-panel',
  ]);
  requireArrayIncludes(errors, manifest.sourceProjection?.requiredInteractions, 'sourceProjection.requiredInteractions', [
    'inspect_location',
    'compare_routes',
    'review_geofence',
  ]);
  if (manifest.hololandLayer?.adapterId !== '@hololand/plugin-geolocation-gis') {
    errors.push('hololandLayer.adapterId must be @hololand/plugin-geolocation-gis');
  }
  if (manifest.hololandLayer?.adapterRole !== 'visual_runtime_sandwich') {
    errors.push('hololandLayer.adapterRole must be visual_runtime_sandwich');
  }
  if (manifest.hololandLayer?.sourceSemanticsOwner !== 'HoloScript') {
    errors.push('hololandLayer.sourceSemanticsOwner must be HoloScript');
  }
  if (manifest.hololandLayer?.sourceSemanticsRewritten !== false) {
    errors.push('hololandLayer.sourceSemanticsRewritten must be false');
  }
  if (manifest.hololandLayer?.localRewriteAllowed !== false) {
    errors.push('hololandLayer.localRewriteAllowed must be false');
  }
  if (!Array.isArray(manifest.holoscriptPackages) || manifest.holoscriptPackages.length < 3) {
    errors.push('holoscriptPackages must name at least three consumed upstream packages');
  }
  if (!Array.isArray(manifest.benchmarkGates) || manifest.benchmarkGates.length < 1) {
    errors.push('benchmarkGates must contain at least one gate');
  }
  requireArrayIncludes(errors, manifest.requiredReceipts, 'requiredReceipts', [
    'source',
    'visual_projection_source',
    'validation',
    'hololand_visual_adapter',
    'runtime',
    'render',
    'interaction',
    'enterprise_receipt',
  ]);
  if (!manifest.promotion?.requires?.some((item) => String(item).includes('mcp__holoscript.validate_holoscript'))) {
    errors.push('promotion.requires must include mcp__holoscript.validate_holoscript');
  }
  return errors;
}

function validateSource(source, sourcePath) {
  const requiredTokens = [
    'composition "HoloLand Visual Projection Sandwich: Geolocation GIS Map Room"',
    'gateId: "geolocation-gis-map-room"',
    'visualProjectionSchema: "holoscript.visual.projection.v1"',
    'sourceProjectionPackageScope: "holoscript"',
    'sourceProjectionPackageName: "plugin-geolocation-gis"',
    'sourceProjectionId: "geolocation-gis.base-map-room"',
    'hololandPluginScope: "hololand"',
    'hololandPluginName: "plugin-geolocation-gis"',
    'template "VisualProjectionSandwichReceipt"',
    'benchmarkGate: "holoscript_visual_projection_geolocation_gis"',
    'policy "HoloScriptOwnsBaseProjection"',
    'policy "HoloLandOwnsVisualSandwich"',
    'policy "EnterpriseVisualPackagesAreGates"',
    'action accept_holoscript_visual_projection',
    'action compose_hololand_visual_sandwich',
    'action capture_visual_projection_receipt',
    'mcp__holoscript.validate_holoscript',
    'sourceSemanticsRewritten: false',
    'localRewriteAllowed: false',
    'receiptRequired: true',
  ];
  const errors = [];
  const extension = path.extname(sourcePath);
  if (extension !== '.hsplus') errors.push(`expected .hsplus source, got ${extension || '<none>'}`);
  if (!bracesBalanced(source)) errors.push('curly braces are not balanced');
  for (const token of requiredTokens) {
    if (!source.includes(token)) errors.push(`missing token: ${token}`);
  }
  return {
    status: errors.length ? 'fail' : 'pass',
    tool: 'hololand-visual-projection-sandwich.local-bridge-guard',
    format: 'hsplus',
    errors,
    warnings: [],
    policies: extractQuotedBlockNames(source, 'policy'),
    templates: extractQuotedBlockNames(source, 'template'),
    actions: Array.from(source.matchAll(/action\s+([A-Za-z0-9_]+)/g)).map((match) => match[1]),
  };
}

function sourceExcerpt(source) {
  return source
    .split(/\r?\n/)
    .slice(0, 90)
    .join('\n')
    .trim();
}

function statusFromMcp(args) {
  if (!args.mcpStatus) {
    return {
      tool: 'mcp__holoscript.validate_holoscript',
      status: 'not_embedded',
      format: 'hsplus',
      summary: 'Run through the agent MCP surface during promotion validation.',
    };
  }
  return {
    tool: 'mcp__holoscript.validate_holoscript',
    status: args.mcpStatus,
    format: args.mcpFormat || 'unknown',
    summary: args.mcpSummary || '',
  };
}

function createReceipt(args) {
  if (!existsSync(args.manifest)) throw new Error(`Gate manifest not found: ${args.manifest}`);
  const manifest = readJson(args.manifest);
  const sourcePath = args.source ? resolveRepoPath(args.source) : resolveRepoPath(manifest.sourcePath);
  if (!existsSync(sourcePath)) throw new Error(`Source file not found: ${sourcePath}`);
  const source = readFileSync(sourcePath, 'utf8');
  const sourceValidation = validateSource(source, sourcePath);
  const manifestErrors = validateManifest(manifest, sourcePath);
  const localStatus = sourceValidation.status === 'pass' && manifestErrors.length === 0 ? 'pass' : 'fail';
  const mcpValidation = statusFromMcp(args);
  const validationStatus = localStatus === 'pass' &&
    (!args.mcpStatus || args.mcpStatus === 'pass' || args.mcpStatus === 'valid')
    ? 'pass'
    : 'fail';
  const sourceHash = sha256(source);
  const manifestHash = sha256(JSON.stringify(manifest));
  const receipt = {
    schema: SCHEMA,
    status: validationStatus === 'pass' ? 'pass' : 'fail',
    generatedAt: new Date().toISOString(),
    gate: {
      id: manifest.id,
      title: manifest.title,
      vertical: manifest.vertical,
      packageClass: manifest.packageClass,
      humanUserSurface: manifest.humanUserSurface,
      developerPackageSurface: manifest.developerPackageSurface,
      manifest: relativeToRepo(args.manifest),
      manifestSha256: manifestHash,
    },
    businessWorkflow: manifest.businessWorkflow,
    source: {
      status: 'inspectable',
      path: relativeToRepo(sourcePath),
      sha256: sourceHash,
      format: 'hsplus',
      excerpt: sourceExcerpt(source),
    },
    sourceProjection: {
      status: validationStatus === 'pass' ? 'accepted' : 'blocked',
      ...manifest.sourceProjection,
    },
    hololandLayer: {
      status: validationStatus === 'pass' ? 'adapter_contract_ready' : 'blocked',
      ...manifest.hololandLayer,
    },
    holoscriptPackages: manifest.holoscriptPackages,
    benchmarkGates: manifest.benchmarkGates,
    validation: {
      status: validationStatus,
      local: {
        status: localStatus,
        source: sourceValidation,
        manifest: {
          status: manifestErrors.length ? 'fail' : 'pass',
          errors: manifestErrors,
        },
      },
      mcp: mcpValidation,
      failureBlocksPromotion: true,
    },
    runtime: {
      status: validationStatus === 'pass' ? 'ready' : 'blocked',
      surface: 'local_browser_file_runtime',
      url: pathToFileURL(args.html).href,
      requiredSelector: '#visual-projection-sandwich-root',
    },
    render: {
      status: validationStatus === 'pass' ? 'ready' : 'blocked',
      html: relativeToRepo(args.html),
      js: relativeToRepo(args.js),
      renderer: 'HoloLand visual sandwich projection generated from HoloScript-facing source and gate manifest',
      sourceSemanticsRewritten: false,
    },
    interaction: {
      status: 'pending_browser_receipt',
      requiredSelector: '#visual-sandwich-verify',
      expectedDomState: '#visual-sandwich-interaction-status[data-interacted="true"]',
    },
    enterpriseReceipt: {
      status: validationStatus === 'pass' ? 'ready' : 'blocked',
      requiredReceipts: manifest.requiredReceipts,
      rawSecretsIncluded: false,
    },
    promotion: manifest.promotion,
    openWork: manifest.openWork || [],
    commands: {
      build: 'node scripts/hololand-visual-projection-sandwich-gate.mjs',
      test: 'node scripts/__tests__/hololand-visual-projection-sandwich-gate.test.mjs',
      mcpValidation: 'mcp__holoscript.validate_holoscript',
    },
    receipt: {
      output: relativeToRepo(args.receipt),
      rawSecretsIncluded: false,
      hashInput: 'source.sha256 + manifest.sha256 + validation.status + gate.id',
    },
  };
  receipt.receipt.sha256 = sha256(JSON.stringify({
    source: receipt.source.sha256,
    manifest: receipt.gate.manifestSha256,
    validation: receipt.validation.status,
    gate: receipt.gate.id,
  }));
  return receipt;
}

function renderList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n          ');
}

function renderHtml(receipt) {
  const embeddedReceipt = JSON.stringify(receipt).replace(/</g, '\\u003c');
  const packages = receipt.holoscriptPackages
    .map((pkg) => `<li><strong>${escapeHtml(pkg.name)}</strong><span>${escapeHtml(pkg.gates.join(', '))}</span></li>`)
    .join('\n          ');
  const responsibilities = renderList(receipt.hololandLayer.visualResponsibilities);
  const interactions = renderList(receipt.sourceProjection.requiredInteractions);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(receipt.gate.title)} Visual Projection Sandwich</title>
  <style>
    :root {
      color-scheme: dark;
      background: #101312;
      color: #eef2f0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #101312; }
    #visual-projection-sandwich-root {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(280px, 0.92fr) minmax(320px, 1.08fr);
      gap: 18px;
      padding: clamp(16px, 3vw, 34px);
    }
    main, aside {
      min-width: 0;
      border: 1px solid #33403c;
      border-radius: 8px;
      background: #161b1a;
      padding: clamp(16px, 2vw, 26px);
    }
    h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 54px);
      line-height: 1.03;
      letter-spacing: 0;
    }
    h2 {
      margin: 22px 0 8px;
      font-size: 15px;
      letter-spacing: 0;
    }
    p, li, span {
      color: #c6d2cc;
      line-height: 1.55;
    }
    ul { padding-left: 20px; }
    li strong {
      display: block;
      color: #7bd9c0;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .metric {
      border: 1px solid #34433f;
      border-radius: 8px;
      background: #0e1110;
      padding: 12px;
      overflow-wrap: anywhere;
    }
    .metric strong {
      display: block;
      margin-bottom: 5px;
      color: #7bd9c0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    pre {
      max-height: 360px;
      overflow: auto;
      margin: 0;
      padding: 12px;
      border-radius: 8px;
      background: #090c0b;
      color: #dce7e2;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    button {
      min-height: 42px;
      border: 0;
      border-radius: 8px;
      padding: 0 16px;
      background: #7bd9c0;
      color: #07110e;
      font-weight: 760;
      cursor: pointer;
    }
    #visual-sandwich-interaction-status {
      margin-top: 12px;
      min-height: 24px;
      color: #f0ce68;
    }
    #visual-sandwich-interaction-status[data-interacted="true"] { color: #7bd9c0; }
    @media (max-width: 820px) {
      #visual-projection-sandwich-root { grid-template-columns: minmax(0, 1fr); }
      .metric-grid { grid-template-columns: minmax(0, 1fr); }
    }
  </style>
</head>
<body data-gate-status="${escapeHtml(receipt.status)}">
  <div id="visual-projection-sandwich-root" data-source-sha256="${escapeHtml(receipt.source.sha256)}" data-source-semantics-rewritten="false">
    <main>
      <h1>${escapeHtml(receipt.gate.title)}</h1>
      <p id="business-workflow">${escapeHtml(receipt.businessWorkflow.summary)}</p>
      <div class="metric-grid">
        <div class="metric" id="source-projection"><strong>HoloScript Projection</strong>${escapeHtml(receipt.sourceProjection.projectionId)}</div>
        <div class="metric" id="hololand-adapter"><strong>Hololand Adapter</strong>${escapeHtml(receipt.hololandLayer.adapterId)}</div>
        <div class="metric" id="source-semantics"><strong>Semantics Rewritten</strong>${escapeHtml(receipt.hololandLayer.sourceSemanticsRewritten)}</div>
        <div class="metric" id="gate-validation"><strong>Validation</strong>${escapeHtml(receipt.validation.status)}</div>
      </div>
      <h2>Preserved Interaction Verbs</h2>
      <ul id="source-interactions">
        ${interactions}
      </ul>
      <h2>Hololand Visual Responsibilities</h2>
      <ul id="hololand-responsibilities">
        ${responsibilities}
      </ul>
      <button id="visual-sandwich-verify" type="button">Verify Visual Sandwich</button>
      <div id="visual-sandwich-interaction-status" data-interacted="false">Interaction receipt pending</div>
      <pre id="visual-sandwich-interaction-receipt" aria-live="polite"></pre>
    </main>
    <aside>
      <h2>Consumed HoloScript Packages</h2>
      <ul id="holoscript-packages">
        ${packages}
      </ul>
      <h2>Gate Receipt</h2>
      <pre id="visual-sandwich-receipt">${escapeHtml(JSON.stringify({
        schema: receipt.schema,
        gate: receipt.gate.id,
        status: receipt.status,
        projectionId: receipt.sourceProjection.projectionId,
        adapterId: receipt.hololandLayer.adapterId,
        sourceSemanticsRewritten: receipt.hololandLayer.sourceSemanticsRewritten,
        validation: receipt.validation.status,
      }, null, 2))}</pre>
    </aside>
  </div>
  <script>
    window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_GATE = ${embeddedReceipt};
    document.querySelector('#visual-sandwich-verify').addEventListener('click', () => {
      const status = document.querySelector('#visual-sandwich-interaction-status');
      const receipt = {
        schema: 'hololand.visual-projection-sandwich.interaction.v0.1.0',
        status: 'pass',
        gate: window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_GATE.gate.id,
        projectionId: window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_GATE.sourceProjection.projectionId,
        adapterId: window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_GATE.hololandLayer.adapterId,
        interactedAt: new Date().toISOString(),
        sourceSemanticsRewritten: false,
        interaction: 'visual-sandwich-verify-click'
      };
      status.dataset.interacted = 'true';
      status.textContent = 'Interaction receipt captured';
      document.querySelector('#visual-sandwich-interaction-receipt').textContent = JSON.stringify(receipt, null, 2);
      window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_INTERACTION = receipt;
    });
  </script>
</body>
</html>
`;
}

function writeOutputs(args, receipt) {
  mkdirSync(args.outputDir, { recursive: true });
  writeFileSync(args.html, renderHtml(receipt), 'utf8');
  writeFileSync(args.receipt, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  writeFileSync(
    args.js,
    `window.HOLOLAND_VISUAL_PROJECTION_SANDWICH_RECEIPT = ${JSON.stringify(receipt, null, 2)};\n`,
    'utf8',
  );
}

function main() {
  try {
    const args = parseArgs();
    if (args.help) {
      process.stdout.write(usage());
      return;
    }
    const receipt = createReceipt(args);
    writeOutputs(args, receipt);
    if (args.json) {
      process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    } else {
      process.stdout.write(
        [
          `HoloLand visual projection sandwich gate: ${receipt.status}`,
          `gate: ${receipt.gate.id}`,
          `projection: ${receipt.sourceProjection.projectionId}`,
          `html: ${receipt.render.html}`,
          `receipt: ${receipt.receipt.output}`,
        ].join('\n') + '\n',
      );
    }
    if (receipt.status !== 'pass') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
