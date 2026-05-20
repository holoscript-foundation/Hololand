#!/usr/bin/env node
import crypto from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'hololand.holoshell.local-codebase-absorb-bundle.v0.1.0';
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'local-codebase-absorb-bundle.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'local-codebase-absorb-bundle.js');
const DEFAULT_HOLOSCRIPT_ROOT = path.resolve(REPO_ROOT, '..', 'HoloScript');
const DEFAULT_MAX_FILES = 500;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

const SUPPORTED_EXTENSIONS = new Set([
  '.holo',
  '.hs',
  '.hsplus',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.md',
]);

const EXCLUDED_DIRS = new Set([
  '.git',
  '.tmp',
  '.turbo',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
  '.venv',
]);

const SECRET_ADJACENT_NAMES = [
  '.env',
  '.npmrc',
  'auth.json',
  'secrets',
  'secret',
  'token',
  'credential',
  'private-key',
  'id_rsa',
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    roots: [],
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    maxFiles: DEFAULT_MAX_FILES,
    maxBytes: DEFAULT_MAX_BYTES,
    maxFileBytes: DEFAULT_MAX_FILE_BYTES,
    json: false,
    selfTest: false,
    outputExplicit: false,
    jsOutputExplicit: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') args.roots.push(argv[++index]);
    else if (arg === '--output') {
      args.output = argv[++index] || args.output;
      args.outputExplicit = true;
    } else if (arg === '--js-output') {
      args.jsOutput = argv[++index] || args.jsOutput;
      args.jsOutputExplicit = true;
    }
    else if (arg === '--max-files') args.maxFiles = Number(argv[++index] || args.maxFiles);
    else if (arg === '--max-bytes') args.maxBytes = Number(argv[++index] || args.maxBytes);
    else if (arg === '--max-file-bytes')
      args.maxFileBytes = Number(argv[++index] || args.maxFileBytes);
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.roots.length) {
    args.roots = [DEFAULT_HOLOSCRIPT_ROOT, REPO_ROOT];
  }
  if (!Number.isFinite(args.maxFiles) || args.maxFiles < 1) args.maxFiles = DEFAULT_MAX_FILES;
  if (!Number.isFinite(args.maxBytes) || args.maxBytes < 1) args.maxBytes = DEFAULT_MAX_BYTES;
  if (!Number.isFinite(args.maxFileBytes) || args.maxFileBytes < 1)
    args.maxFileBytes = DEFAULT_MAX_FILE_BYTES;

  if (args.selfTest) {
    if (!args.outputExplicit) {
      args.output = path.join('.tmp', 'holoshell', 'self-test', 'local-codebase-absorb-bundle.json');
    }
    if (!args.jsOutputExplicit) {
      args.jsOutput = path.join('.tmp', 'holoshell', 'self-test', 'local-codebase-absorb-bundle.js');
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write(`HoloShell local codebase absorb bundle

Usage:
  node scripts/holoshell-local-codebase-absorb-bundle.mjs --root <repo> [--root <repo>] [--json]
  node scripts/holoshell-local-codebase-absorb-bundle.mjs --self-test

Options:
  --root <dir>            Local repo root to snapshot. Defaults to HoloScript + HoloLand.
  --max-files <n>         Max included files. Default: ${DEFAULT_MAX_FILES}
  --max-bytes <n>         Max included bytes. Default: ${DEFAULT_MAX_BYTES}
  --max-file-bytes <n>    Per-file byte cap. Default: ${DEFAULT_MAX_FILE_BYTES}
  --output <file>         JSON output. Default: ${DEFAULT_OUTPUT}
  --js-output <file>      Browser bootstrap output. Default: ${DEFAULT_JS_OUTPUT}
  --json                  Print bundle JSON.
  --self-test             Build a fixture bundle and assert policy invariants.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function writeText(filePath, text) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const temp = `${resolved}.${process.pid}.${Date.now().toString(36)}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(temp, text, 'utf8');
  renameSync(temp, resolved);
  return resolved;
}

function writeJson(filePath, value) {
  return writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeBrowserBootstrap(filePath, value) {
  const payload = JSON.stringify(value, null, 2).replace(/<\/script/gi, '<\\/script');
  return writeText(filePath, `window.HOLOSHELL_LOCAL_CODEBASE_ABSORB_BUNDLE = ${payload};\n`);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function hashBytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function rootId(rootPath, index) {
  const name = path.basename(rootPath).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return name || `root-${index}`;
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function relativeSafe(root, filePath) {
  return normalizeSlashes(path.relative(root, filePath));
}

function isSecretAdjacent(filePath) {
  const normalized = normalizeSlashes(filePath).toLowerCase();
  return SECRET_ADJACENT_NAMES.some((needle) => normalized.includes(needle));
}

function isLikelyBinary(bytes) {
  return bytes.subarray(0, Math.min(bytes.length, 4096)).includes(0);
}

function languageForExtension(extension) {
  if (extension === '.holo') return 'holo';
  if (extension === '.hs') return 'hs';
  if (extension === '.hsplus') return 'hsplus';
  if (extension === '.ts' || extension === '.tsx') return 'typescript';
  if (extension === '.js' || extension === '.mjs') return 'javascript';
  if (extension === '.json') return 'json';
  if (extension === '.md') return 'markdown';
  return 'unknown';
}

function privacyClassForPath(filePath) {
  const normalized = normalizeSlashes(filePath).toLowerCase();
  if (normalized.includes('/dist/') || normalized.includes('/build/')) return 'generated';
  if (isSecretAdjacent(filePath)) return 'secret-adjacent';
  return 'source';
}

function skip(pathLabel, reason, message = '', sizeBytes = undefined) {
  return {
    path: pathLabel,
    pathHash: pathLabel ? hashText(pathLabel) : undefined,
    reason,
    sizeBytes,
    message,
  };
}

function snapshotRoot(rootPath, index, limits) {
  const resolvedRoot = path.resolve(rootPath);
  const id = rootId(resolvedRoot, index);
  const root = {
    id,
    redactedRoot: `[${id}-root]`,
    rootHash: hashText(resolvedRoot),
    runtimeNamespace: process.platform === 'win32' ? 'local-windows' : 'local-posix',
    exists: existsSync(resolvedRoot),
    selectedFileCount: 0,
    skippedFileCount: 0,
  };
  const selected = [];
  const skipped = [];
  const sourceFiles = [];

  function visit(dirPath) {
    if (selected.length >= limits.remainingFiles || limits.remainingBytes <= 0) return;
    let entries = [];
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
      skipped.push(skip(relativeSafe(resolvedRoot, dirPath), 'read-error', error.message));
      return;
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const fullPath = path.join(dirPath, entry.name);
      const rel = relativeSafe(resolvedRoot, fullPath);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name) || isSecretAdjacent(rel)) {
          skipped.push(skip(rel, isSecretAdjacent(rel) ? 'secret-adjacent' : 'excluded-directory'));
          continue;
        }
        visit(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (selected.length >= limits.remainingFiles) {
        skipped.push(skip(rel, 'file-cap'));
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      let stats;
      try {
        stats = statSync(fullPath);
      } catch (error) {
        skipped.push(skip(rel, 'read-error', error.message));
        continue;
      }
      if (isSecretAdjacent(rel)) {
        skipped.push(skip(rel, 'secret-adjacent', '', stats.size));
        continue;
      }
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        skipped.push(skip(rel, 'unsupported-extension', '', stats.size));
        continue;
      }
      if (stats.size > limits.maxFileBytes) {
        skipped.push(skip(rel, 'too-large', '', stats.size));
        continue;
      }
      if (stats.size > limits.remainingBytes) {
        skipped.push(skip(rel, 'byte-cap', '', stats.size));
        continue;
      }

      let bytes;
      try {
        bytes = readFileSync(fullPath);
      } catch (error) {
        skipped.push(skip(rel, 'read-error', error.message, stats.size));
        continue;
      }
      if (isLikelyBinary(bytes)) {
        skipped.push(skip(rel, 'binary', '', stats.size));
        continue;
      }

      const bundlePath = `${id}/${rel}`;
      const content = bytes.toString('utf8');
      const contentHash = hashBytes(bytes);
      selected.push({
        path: bundlePath,
        sizeBytes: stats.size,
        contentHash,
        hashAlgorithm: 'sha256',
        privacyClass: privacyClassForPath(rel),
        includedInSourceFiles: true,
        language: languageForExtension(extension),
        modifiedAt: stats.mtime.toISOString(),
      });
      sourceFiles.push({ path: bundlePath, content, contentHash, sizeBytes: stats.size });
      limits.remainingBytes -= stats.size;
    }
  }

  if (root.exists) visit(resolvedRoot);
  else skipped.push(skip('', 'read-error', `Root does not exist: ${resolvedRoot}`));

  root.selectedFileCount = selected.length;
  root.skippedFileCount = skipped.length;
  return { root, selected, skipped, sourceFiles };
}

export function buildLocalCodebaseBundle(options) {
  const startedAt = new Date().toISOString();
  const limits = {
    remainingFiles: options.maxFiles,
    remainingBytes: options.maxBytes,
    maxFileBytes: options.maxFileBytes,
  };
  const roots = [];
  const files = [];
  const skippedFiles = [];
  const sourceFilesWithContent = [];

  for (const [index, rootPath] of options.roots.entries()) {
    const result = snapshotRoot(rootPath, index, limits);
    roots.push(result.root);
    files.push(...result.selected);
    skippedFiles.push(...result.skipped);
    sourceFilesWithContent.push(...result.sourceFiles);
    limits.remainingFiles = Math.max(0, options.maxFiles - files.length);
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const redactionStatus = files.some((file) => file.privacyClass === 'secret-adjacent')
    ? 'fail'
    : skippedFiles.some((file) => file.reason === 'secret-adjacent')
      ? 'warn'
      : 'pass';
  const status = redactionStatus === 'fail' || files.length === 0 ? 'blocked' : 'ready';
  const sourceFiles = sourceFilesWithContent.map(({ path: filePath, contentHash, sizeBytes }) => ({
    path: filePath,
    contentHash,
    sizeBytes,
  }));
  const endedAt = new Date().toISOString();
  const receiptBase = {
    id: `local_codebase_snapshot_${hashText(`${startedAt}:${files.length}:${totalBytes}`).slice(0, 12)}`,
    workflow: 'ready-to-build-hololand-world',
    startedAt,
    endedAt,
    roots,
    files,
    skippedFiles,
    sourceFiles,
    totalFiles: files.length,
    totalBytes,
    maxFiles: options.maxFiles,
    maxBytes: options.maxBytes,
    redactionStatus,
    status,
    excludes: [...EXCLUDED_DIRS, ...SECRET_ADJACENT_NAMES].sort(),
    replayCommand: [
      'node scripts/holoshell-local-codebase-absorb-bundle.mjs',
      ...options.roots.flatMap((rootPath) => ['--root', rootPath]),
      '--max-files',
      String(options.maxFiles),
      '--max-bytes',
      String(options.maxBytes),
    ].join(' '),
    hashAlgorithm: 'sha256',
    verificationCommands: ['node scripts/holoshell-local-codebase-absorb-bundle.mjs --self-test'],
  };
  const receipt = {
    ...receiptBase,
    hash: hashValue(receiptBase),
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: endedAt,
    receiptType: 'HoloShellLocalCodebaseSnapshotReceipt',
    receipt,
    mcp: {
      tool: 'holo_absorb_repo',
      arguments: {
        outputFormat: 'stats',
        sourceFiles: sourceFilesWithContent.map(({ path: filePath, content }) => ({
          path: filePath,
          content,
        })),
      },
    },
    summary: {
      status,
      roots: roots.length,
      files: files.length,
      skipped: skippedFiles.length,
      totalBytes,
      redactionStatus,
      mutationPerformed: false,
    },
  };
}

function assertSelfTest(bundle) {
  const sourcePaths = bundle.mcp.arguments.sourceFiles.map((file) => file.path);
  if (!sourcePaths.includes('fixture/src/index.ts')) {
    throw new Error('Self-test expected fixture/src/index.ts to be included.');
  }
  if (sourcePaths.some((filePath) => filePath.includes('.env'))) {
    throw new Error('Self-test leaked .env into sourceFiles payload.');
  }
  if (!bundle.receipt.skippedFiles.some((file) => file.reason === 'secret-adjacent')) {
    throw new Error('Self-test expected a secret-adjacent skipped-file receipt.');
  }
  if (bundle.receipt.redactionStatus !== 'warn') {
    throw new Error(`Self-test expected redactionStatus warn, got ${bundle.receipt.redactionStatus}.`);
  }
  if (bundle.receipt.status !== 'ready') {
    throw new Error(`Self-test expected ready status, got ${bundle.receipt.status}.`);
  }
}

function runSelfTest(args) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'holoshell-local-codebase-'));
  const root = path.join(dir, 'fixture');
  mkdirSync(path.join(root, 'src'), { recursive: true });
  mkdirSync(path.join(root, 'dist'), { recursive: true });
  writeFileSync(path.join(root, 'src', 'index.ts'), 'export const answer = 42;\n', 'utf8');
  writeFileSync(path.join(root, '.env'), 'TOKEN=do-not-include\n', 'utf8');
  writeFileSync(path.join(root, 'dist', 'bundle.js'), 'generated\n', 'utf8');

  try {
    const bundle = buildLocalCodebaseBundle({ ...args, roots: [root] });
    assertSelfTest(bundle);
    return bundle;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs();
  const bundle = args.selfTest
    ? runSelfTest(args)
    : buildLocalCodebaseBundle({
        roots: args.roots.map(resolveRepoPath),
        maxFiles: args.maxFiles,
        maxBytes: args.maxBytes,
        maxFileBytes: args.maxFileBytes,
      });

  writeJson(args.output, bundle);
  writeBrowserBootstrap(args.jsOutput, bundle);
  if (args.json) process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  else {
    process.stdout.write(
      `HoloShell local codebase bundle ${bundle.summary.status}: ${bundle.summary.files} files, ${bundle.summary.skipped} skipped\n`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
