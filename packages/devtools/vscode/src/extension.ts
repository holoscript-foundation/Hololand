import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('HoloScript extension activated');

  // Path to the LSP server
  const serverModule = context.asAbsolutePath(
    path.join('..', 'holoscript-lsp', 'dist', 'server.js')
  );

  // Check if LSP server exists, fall back to basic mode if not
  const fs = require('fs');
  const lspAvailable = fs.existsSync(serverModule);

  if (lspAvailable) {
    // Start the Language Server
    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=6009'] },
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'holoscript' },
        { scheme: 'file', language: 'holoscript-plus' },
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{holo,hsplus}'),
      },
    };

    client = new LanguageClient(
      'holoscriptLanguageServer',
      'HoloScript Language Server',
      serverOptions,
      clientOptions
    );

    // Start the client (also starts the server)
    await client.start();
    console.log('HoloScript LSP client started');
  } else {
    console.log('HoloScript LSP server not found, using basic mode');
    // Fall back to basic completion providers
    activateBasicMode(context);
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('holoscript.compile', compileCurrentFile),
    vscode.commands.registerCommand('holoscript.preview', previewCurrentFile),
    vscode.commands.registerCommand('holoscript.format', formatCurrentFile)
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = lspAvailable ? '$(check) HoloScript' : '$(warning) HoloScript (Basic)';
  statusBarItem.tooltip = lspAvailable
    ? 'HoloScript Language Server active'
    : 'HoloScript running in basic mode (LSP not available)';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

/**
 * Fallback mode when LSP server is not available
 */
function activateBasicMode(context: vscode.ExtensionContext) {
  // Register completion provider for .holo files
  const holoCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'holoscript',
    {
      provideCompletionItems() {
        return getHoloCompletions();
      },
    }
  );

  // Register completion provider for .hsplus files
  const hsplusCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'holoscript-plus',
    {
      provideCompletionItems() {
        return [...getHoloCompletions(), ...getHsplusCompletions()];
      },
    }
  );

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    ['holoscript', 'holoscript-plus'],
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);
        const docs = getKeywordDocumentation(word);

        if (docs) {
          return new vscode.Hover(new vscode.MarkdownString(docs));
        }
        return null;
      },
    }
  );

  context.subscriptions.push(holoCompletionProvider, hsplusCompletionProvider, hoverProvider);
}

function getHoloCompletions(): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];

  // Top-level keywords
  const orbItem = new vscode.CompletionItem('orb', vscode.CompletionItemKind.Class);
  orbItem.insertText = new vscode.SnippetString('orb ${1:name} {\n\t${0}\n}');
  orbItem.documentation = 'Create a new 3D object';
  completions.push(orbItem);

  const worldItem = new vscode.CompletionItem('world', vscode.CompletionItemKind.Module);
  worldItem.insertText = new vscode.SnippetString('world ${1:name} {\n\t${0}\n}');
  worldItem.documentation = 'Create a new world container';
  completions.push(worldItem);

  // Object types
  const objectTypes = [
    'cube', 'sphere', 'cylinder', 'plane', 'box', 'mesh', 'model',
    'text', 'panel', 'button', 'slider', 'image', 'light', 'camera',
    'audio', 'video', 'particle', 'animation', 'trigger', 'zone', 'portal', 'npc', 'item',
  ];

  objectTypes.forEach((type) => {
    const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
    item.insertText = new vscode.SnippetString(`${type} \${1:name} {\n\t\${0}\n}`);
    item.documentation = `Create a new ${type} object`;
    completions.push(item);
  });

  // Properties
  const properties = [
    { name: 'position', snippet: 'position: [${1:0}, ${2:0}, ${3:0}]' },
    { name: 'rotation', snippet: 'rotation: [${1:0}, ${2:0}, ${3:0}]' },
    { name: 'scale', snippet: 'scale: [${1:1}, ${2:1}, ${3:1}]' },
    { name: 'color', snippet: 'color: "${1:#ffffff}"' },
    { name: 'opacity', snippet: 'opacity: ${1:1.0}' },
    { name: 'visible', snippet: 'visible: ${1:true}' },
    { name: 'interactive', snippet: 'interactive: ${1:true}' },
    { name: 'model', snippet: 'model: "${1:path/to/model.glb}"' },
    { name: 'material', snippet: 'material: {\n\ttype: "${1:standard}"\n\t${0}\n}' },
  ];

  properties.forEach((prop) => {
    const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
    item.insertText = new vscode.SnippetString(prop.snippet);
    completions.push(item);
  });

  // Events
  const events = ['on_click', 'on_hover', 'on_enter', 'on_exit', 'on_collision', 'on_trigger'];

  events.forEach((event) => {
    const item = new vscode.CompletionItem(event, vscode.CompletionItemKind.Event);
    item.insertText = new vscode.SnippetString(`${event}: {\n\t\${0}\n}`);
    completions.push(item);
  });

  return completions;
}

function getHsplusCompletions(): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];

  // Networked objects
  const networkedItem = new vscode.CompletionItem('networked', vscode.CompletionItemKind.Property);
  networkedItem.insertText = new vscode.SnippetString('networked: ${1:true}');
  networkedItem.documentation = 'Enable multiplayer synchronization';
  completions.push(networkedItem);

  // Physics
  const physicsItem = new vscode.CompletionItem('physics', vscode.CompletionItemKind.Property);
  physicsItem.insertText = new vscode.SnippetString(
    'physics: {\n\ttype: "${1|dynamic,static,kinematic|}"\n\tmass: ${2:1.0}\n}'
  );
  physicsItem.documentation = 'Add physics simulation to this orb';
  completions.push(physicsItem);

  // Constraint
  const constraintItem = new vscode.CompletionItem('constraint', vscode.CompletionItemKind.Class);
  constraintItem.insertText = new vscode.SnippetString(
    'constraint ${1:name} {\n\ttype: ${2|hinge,slider,spring,ball,fixed|}\n\tbody_a: ${3}\n\tbody_b: ${4}\n}'
  );
  constraintItem.documentation = 'Create a physics constraint';
  completions.push(constraintItem);

  // Terrain
  const terrainItem = new vscode.CompletionItem('terrain', vscode.CompletionItemKind.Class);
  terrainItem.insertText = new vscode.SnippetString(
    'terrain ${1:name} {\n\tgenerator: ${2|perlin,simplex,voronoi|}\n\tsize: [${3:100}, ${4:100}]\n\theight_scale: ${5:10}\n\tseed: ${6:random}\n}'
  );
  terrainItem.documentation = 'Create procedurally generated terrain';
  completions.push(terrainItem);

  // Audio
  const audioItem = new vscode.CompletionItem('audio', vscode.CompletionItemKind.Property);
  audioItem.insertText = new vscode.SnippetString(
    'audio: {\n\tsrc: "${1:sound.mp3}"\n\tspatial: ${2:true}\n\tloop: ${3:false}\n}'
  );
  audioItem.documentation = 'Add spatial audio to this orb';
  completions.push(audioItem);

  // Animation
  const animItem = new vscode.CompletionItem('animation', vscode.CompletionItemKind.Property);
  animItem.insertText = new vscode.SnippetString(
    'animation: {\n\tname: "${1:idle}"\n\tloop: ${2:true}\n\tautoplay: ${3:true}\n}'
  );
  animItem.documentation = 'Add animation to this orb';
  completions.push(animItem);

  // System imports
  const systems = [
    'NetworkedWorldState',
    'PhysicsConstraints',
    'ProceduralGeneration',
    'HoloScriptMarketplace',
    'SceneVersionControl',
    'PartySystem',
    'LocalAnalytics',
    'OfflineSync',
    'LocalNetworking',
    'ExampleWorlds',
  ];

  systems.forEach((system) => {
    const item = new vscode.CompletionItem(system, vscode.CompletionItemKind.Module);
    item.insertText = new vscode.SnippetString(`import { ${system} } from "@hololand/systems"`);
    item.documentation = `Import the ${system} system`;
    completions.push(item);
  });

  return completions;
}

function getKeywordDocumentation(word: string): string | null {
  const docs: Record<string, string> = {
    orb: '**orb** - A 3D object in the scene.\n\n```holoscript\norb my_cube {\n  position: [0, 1, 0]\n  scale: [1, 1, 1]\n}\n```',
    world: '**world** - A container for orbs and scene configuration.',
    position: '**position** - 3D coordinates `[x, y, z]`\n\nDefault: `[0, 0, 0]`',
    rotation: '**rotation** - Euler angles in degrees `[x, y, z]`\n\nDefault: `[0, 0, 0]`',
    scale: '**scale** - Size multiplier `[x, y, z]`\n\nDefault: `[1, 1, 1]`',
    on_click: '**on_click** - Handler for click/tap events',
    on_hover: '**on_hover** - Handler for hover events',
    networked: '**networked** *(HSPlus)* - Enable multiplayer sync across all clients',
    physics: '**physics** *(HSPlus)* - Enable physics simulation\n\nTypes: `dynamic`, `static`, `kinematic`',
    terrain: '**terrain** *(HSPlus)* - Procedurally generated terrain',
    constraint: '**constraint** *(HSPlus)* - Physics constraint between objects',
  };

  return docs[word] || null;
}

/**
 * Compile current HoloScript file to R3F
 */
async function compileCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active file to compile');
    return;
  }

  const document = editor.document;
  if (!['holoscript', 'holoscript-plus'].includes(document.languageId)) {
    vscode.window.showWarningMessage('Not a HoloScript file');
    return;
  }

  vscode.window.showInformationMessage('Compiling HoloScript...');
  // TODO: Integrate with R3F compiler
}

/**
 * Preview current HoloScript file in 3D viewer
 */
async function previewCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active file to preview');
    return;
  }

  vscode.window.showInformationMessage('Opening 3D preview...');
  // TODO: Open preview panel
}

/**
 * Format current HoloScript file
 */
async function formatCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  vscode.window.showInformationMessage('Formatting HoloScript...');
  // TODO: Implement formatter
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}
