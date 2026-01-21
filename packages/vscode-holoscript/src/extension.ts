import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('HoloScript extension activated');

  // Register completion provider for .holo files
  const holoCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'holoscript',
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        return getHoloCompletions();
      }
    }
  );

  // Register completion provider for .hsplus files
  const hsplusCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'holoscript-plus',
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        return [...getHoloCompletions(), ...getHsplusCompletions()];
      }
    }
  );

  context.subscriptions.push(holoCompletionProvider, hsplusCompletionProvider);
}

function getHoloCompletions(): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];

  // Object types
  const objectTypes = ['cube', 'sphere', 'cylinder', 'plane', 'box', 'mesh', 'model', 'text', 'panel', 'button', 'slider', 'image', 'light', 'camera', 'audio', 'video', 'particle', 'animation', 'trigger', 'zone', 'portal', 'npc', 'item'];

  objectTypes.forEach(type => {
    const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
    item.insertText = new vscode.SnippetString(`${type} \${1:name} {\n\t\${0}\n}`);
    item.documentation = `Create a new ${type} object`;
    completions.push(item);
  });

  // Properties
  const properties = ['position', 'rotation', 'scale', 'size', 'color', 'opacity', 'material', 'visible', 'enabled', 'interactive'];

  properties.forEach(prop => {
    const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
    item.insertText = new vscode.SnippetString(`${prop}: \${0}`);
    completions.push(item);
  });

  // Events
  const events = ['on_click', 'on_hover', 'on_enter', 'on_exit', 'on_collision', 'on_trigger'];

  events.forEach(event => {
    const item = new vscode.CompletionItem(event, vscode.CompletionItemKind.Event);
    item.insertText = new vscode.SnippetString(`${event}: \${0}`);
    completions.push(item);
  });

  return completions;
}

function getHsplusCompletions(): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];

  // Networked objects
  const networkedItem = new vscode.CompletionItem('networked_object', vscode.CompletionItemKind.Class);
  networkedItem.insertText = new vscode.SnippetString('networked_object ${1:name} {\n\tsync_rate: ${2:20hz}\n\tinterpolation: ${3:true}\n\t${0}\n}');
  networkedItem.documentation = 'Create a multiplayer-synced object';
  completions.push(networkedItem);

  // Physics constraint
  const constraintItem = new vscode.CompletionItem('constraint', vscode.CompletionItemKind.Class);
  constraintItem.insertText = new vscode.SnippetString('constraint ${1:name} {\n\ttype: ${2|hinge,slider,spring,ball,fixed|}\n\tbody_a: ${3}\n\tbody_b: ${4}\n\t${0}\n}');
  constraintItem.documentation = 'Create a physics constraint';
  completions.push(constraintItem);

  // Terrain
  const terrainItem = new vscode.CompletionItem('terrain', vscode.CompletionItemKind.Class);
  terrainItem.insertText = new vscode.SnippetString('terrain ${1:name} {\n\tgenerator: ${2|perlin,simplex,voronoi|}\n\tsize: [${3:100}, ${4:100}]\n\theight_scale: ${5:10}\n\tseed: ${6:random}\n}');
  terrainItem.documentation = 'Create procedurally generated terrain';
  completions.push(terrainItem);

  // Party system
  const partyItem = new vscode.CompletionItem('party', vscode.CompletionItemKind.Class);
  partyItem.insertText = new vscode.SnippetString('party ${1:name} {\n\tmax_players: ${2:4}\n\tdiscovery: ${3|local_network,peer_to_peer|}\n\t\n\ton_player_join: ${4}\n\ton_player_leave: ${5}\n}');
  partyItem.documentation = 'Create a multiplayer party/lobby';
  completions.push(partyItem);

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
    'ExampleWorlds'
  ];

  systems.forEach(system => {
    const item = new vscode.CompletionItem(system, vscode.CompletionItemKind.Module);
    item.insertText = new vscode.SnippetString(`import { ${system} } from "./systems/${system}.hsplus"`);
    item.documentation = `Import the ${system} system`;
    completions.push(item);
  });

  return completions;
}

export function deactivate() {}
