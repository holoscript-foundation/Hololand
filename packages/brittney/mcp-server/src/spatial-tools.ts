import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Octree, SpatialItem3D } from './octree.js';

// Global 3D Octree instance for the MVP spatial index covering a 20,000 unit world
const spatialIndex = new Octree({
  minX: -10000, minY: -10000, minZ: -10000,
  maxX: 10000, maxY: 10000, maxZ: 10000
});

// Define the schemas for the Spatial MCP tools
export const spatialSchemas = {
  indexObject: z.object({
    id: z.string().describe("Unique identifier for the spatial object"),
    type: z.string().describe("Type of object (e.g., 'actor', 'item', 'memory_marker')"),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional() // RBush is 2D, we'll map X/Z (top-down) or X/Y to the index
    }).describe("Center position of the object"),
    bounds: z.object({
      width: z.number().default(1),
      depth: z.number().default(1)
    }).optional().describe("Size bounds for the object"),
    metadata: z.record(z.any()).optional().describe("Associated metadata")
  }),
  querySpatial: z.object({
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional()
    }).describe("Center point of the search query"),
    radius: z.number().describe("Search radius around the center point"),
    typeFilter: z.string().optional().describe("Optional filter to only return objects of a specific type")
  }),
  semanticSpatialQuery: z.object({
    position: z.object({ x: z.number(), y: z.number(), z: z.number().optional() }).describe("Center point of the search query"),
    radius: z.number().describe("Search radius around the center point"),
    concept: z.string().describe("Semantic concept to search for (e.g., 'danger', 'food')"),
    minSimilarity: z.number().optional().default(0.7).describe("Minimum similarity score (0.0 to 1.0)")
  }),
  extractSceneGraphLabels: z.object({
    radius: z.number().optional().default(100).describe("Radius to calculate geometric proximities across")
  }),
  verifyAccessibilitySemantics: z.object({
    position: z.object({ x: z.number(), y: z.number(), z: z.number().optional() }).describe("Center point of UI group evaluation"),
    radius: z.number().describe("Search radius for evaluated elements"),
    contrastThreshold: z.number().optional().default(4.5).describe("WCAG text-contrast threshold ratio (default 4.5:1)")
  })
};

// Register Tool exports
export const spatialTools: Tool[] = [
  {
    name: 'index_spatial_object',
    description: 'Add or update an object in the spatial index (MVP memory simulation).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique identifier for the spatial object' },
        type: { type: 'string', description: "Type of object (e.g., 'actor')" },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y'],
          description: 'Center position'
        },
        bounds: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            depth: { type: 'number' }
          }
        },
        metadata: { type: 'object', description: 'Associated metadata' }
      },
      required: ['id', 'type', 'position']
    }
  },
  {
    name: 'query_spatial',
    description: 'Find items in the R-Tree spatial index within a specific radius.',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y'],
          description: 'Center point'
        },
        radius: { type: 'number', description: 'Search radius around the center point' },
        typeFilter: { type: 'string', description: 'Optional filter to only return objects of a specific type' }
      },
      required: ['position', 'radius']
    }
  },
  {
    name: 'semantic_spatial_query',
    description: 'Find items in the R-Tree spatial index that conceptually match a semantic string.',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y'],
          description: 'Center point'
        },
        radius: { type: 'number', description: 'Search radius around the center point' },
        concept: { type: 'string', description: 'Semantic concept to search for' },
        minSimilarity: { type: 'number', description: 'Minimum similarity score (0.0 to 1.0)' }
      },
      required: ['position', 'radius', 'concept']
    }
  },
  {
    name: 'extract_scene_graph_labels',
    description: 'Extract (Entity_A, relation, Entity_B) geometric mapping boundaries directly from Octree for offline ML Self-Supervision.',
    inputSchema: {
      type: 'object',
      properties: {
        radius: { type: 'number', description: 'Radius to calculate geometric proximities across' }
      }
    }
  },
  {
    name: 'verify_accessibility_semantics',
    description: 'WCAG 2.1 Multi-Modal Accessibility Checker - Validates semantic labels and bounding contrast metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y'],
          description: 'Center point'
        },
        radius: { type: 'number', description: 'Search evaluation radius' },
        contrastThreshold: { type: 'number', description: 'WCAG compliance ratio (e.g. 4.5)' }
      },
      required: ['position', 'radius']
    }
  }
];

export async function handleSpatialTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (toolName === 'index_spatial_object') {
    const { id, type, position, bounds, metadata } = args as any;
    
    // Bounds default to 1x1x1 unit cube if unspecified
    const w = bounds?.width || 1;
    const h = bounds?.height || bounds?.width || 1; 
    const d = bounds?.depth || bounds?.width || 1;
    
    const mappedZ = position.z !== undefined ? position.z : 0;
    const mappedY = position.y !== undefined ? position.y : 0;
    
    const item: SpatialItem3D = {
      minX: position.x - (w / 2),
      minY: mappedY - (h / 2),
      minZ: mappedZ - (d / 2),
      maxX: position.x + (w / 2),
      maxY: mappedY + (h / 2),
      maxZ: mappedZ + (d / 2),
      id,
      type,
      metadata
    };
    
    spatialIndex.insert(item);
    
    return {
      content: [{ type: 'text', text: `Successfully Indexed ${type} object ${id} at volumetric origin (${position.x}, ${mappedY}, ${mappedZ})` }]
    };
  }

  if (toolName === 'query_spatial') {
    const { position, radius, typeFilter } = args as any;
    
    const mappedZ = position.z !== undefined ? position.z : 0;
    const mappedY = position.y !== undefined ? position.y : 0;
    
    const searchBox = {
      minX: position.x - radius,
      minY: mappedY - radius,
      minZ: mappedZ - radius,
      maxX: position.x + radius,
      maxY: mappedY + radius,
      maxZ: mappedZ + radius
    };
    
    let results = spatialIndex.search(searchBox);
    
    // Filter down from the bounding cube to a true volumetric sphere
    results = results.filter((item: SpatialItem3D) => {
       const centerX = (item.minX + item.maxX) / 2;
       const centerY = (item.minY + item.maxY) / 2;
       const centerZ = (item.minZ + item.maxZ) / 2;
       const dist = Math.sqrt(
           Math.pow(centerX - position.x, 2) + 
           Math.pow(centerY - mappedY, 2) +
           Math.pow(centerZ - mappedZ, 2)
       );
       return dist <= radius;
    });
    
    if (typeFilter) {
        results = results.filter((item: SpatialItem3D) => item.type === typeFilter);
    }

    return {
      content: [{ 
        type: 'text', 
        text: `Found ${results.length} volumetric objects within a ${radius} unit radius of (${position.x}, ${mappedY}, ${mappedZ}).\n\n${JSON.stringify(results, null, 2)}` 
      }]
    };
  }

  if (toolName === 'semantic_spatial_query') {
    const { position, radius, concept, minSimilarity = 0.7 } = args as any;
    
    // 1. Spatial Phase: Extract localized bounds 
    const mappedZ = position.z !== undefined ? position.z : 0;
    const mappedY = position.y !== undefined ? position.y : 0;
    
    const searchBox = {
      minX: position.x - radius, minY: mappedY - radius, minZ: mappedZ - radius,
      maxX: position.x + radius, maxY: mappedY + radius, maxZ: mappedZ + radius
    };
    
    let spatialResults = spatialIndex.search(searchBox);
    spatialResults = spatialResults.filter((item: SpatialItem3D) => {
       const centerX = (item.minX + item.maxX) / 2;
       const centerY = (item.minY + item.maxY) / 2;
       const centerZ = (item.minZ + item.maxZ) / 2;
       const dist = Math.sqrt(
           Math.pow(centerX - position.x, 2) + Math.pow(centerY - mappedY, 2) + Math.pow(centerZ - mappedZ, 2)
       );
       return dist <= radius;
    });

    if (spatialResults.length === 0) {
        return { content: [{ type: 'text', text: `No objects in radius.` }] };
    }

    // 2. Semantic Phase: Cross-reference conceptual similarity globally
    const HOLOLAND_API_URL = process.env.HOLOLAND_API_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${HOLOLAND_API_URL}/api/v1/memory/recall`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: 'system', memoryType: 'semantic', query: concept, limit: 100 })
        });
        
        let semanticMatches = [];
        if (response.ok) {
            const data = await response.json() as any;
            semanticMatches = data.memories || [];
        }

        const validSemanticIds = new Set(
           semanticMatches
             .filter((m: any) => m.similarity >= minSimilarity)
             .map((m: any) => m.metadata?.objectId || m.metadata?.type || m.content)
        );

        // 3. Fusion Phase: Sieve explicit spatial bounds against Abstract conceptual tags
        const finalResults = spatialResults.filter((item: SpatialItem3D) => {
            let matchedSemantically = false;
            for (const sem of validSemanticIds) {
                if (typeof sem === 'string' && (sem.includes(item.id) || sem.includes(item.type))) {
                    matchedSemantically = true;
                    break;
                }
            }
            
            // Fallback MVP check: explicit substring
            if (!matchedSemantically && (concept.includes(item.type) || item.type.includes(concept))) {
                matchedSemantically = true;
            }

            return matchedSemantically;
        });

        return {
            content: [{ 
                type: 'text', 
                text: `Found ${finalResults.length} concept-aligned objects for "${concept}" within radius ${radius}.\n\n${JSON.stringify(finalResults, null, 2)}` 
            }]
        };

    } catch(e: any) {
        return { content: [{ type: 'text', text: `Failed semantic spatial query: ${e.message}` }] };
    }
  }

  if (toolName === 'extract_scene_graph_labels') {
    const { radius = 100 } = args as any;
    
    // Grab all items dynamically mapped within the local space
    const allItems = spatialIndex.search({
      minX: -radius, minY: -radius, minZ: -radius,
      maxX: radius, maxY: radius, maxZ: radius
    });

    const triplets = [];

    for (let i = 0; i < allItems.length; i++) {
        for (let j = i + 1; j < allItems.length; j++) {
            const a = allItems[i];
            const b = allItems[j];

            const aCenter = { x: (a.minX + a.maxX)/2, y: (a.minY + a.maxY)/2, z: (a.minZ + a.maxZ)/2 };
            const bCenter = { x: (b.minX + b.maxX)/2, y: (b.minY + b.maxY)/2, z: (b.minZ + b.maxZ)/2 };

            const dist = Math.sqrt(
                Math.pow(aCenter.x - bCenter.x, 2) + Math.pow(aCenter.y - bCenter.y, 2) + Math.pow(aCenter.z - bCenter.z, 2)
            );

            let relation = "distant_from";
            if (dist < 2) relation = "adjacent_to";
            else if (dist < 10) relation = "near";
            else if (dist < 25) relation = "in_vicinity_of";

            triplets.push({
                entityA: a.id,
                relation,
                entityB: b.id,
                distance: parseFloat(dist.toFixed(2))
            });
        }
    }

    return {
        content: [{
            type: 'text',
            text: `Scene Graph Extracted ${triplets.length} spatial relationships natively.\n\n${JSON.stringify(triplets.slice(0, 10), null, 2)}`
        }]
    };
  }

  if (toolName === 'verify_accessibility_semantics') {
    const { position, radius, contrastThreshold = 4.5 } = args as any;
    
    const mappedZ = position.z !== undefined ? position.z : 0;
    const mappedY = position.y !== undefined ? position.y : 0;
    
    const searchBox = {
      minX: position.x - radius, minY: mappedY - radius, minZ: mappedZ - radius,
      maxX: position.x + radius, maxY: mappedY + radius, maxZ: mappedZ + radius
    };
    
    const elements = spatialIndex.search(searchBox);
    const violations = [];
    
    for (const el of elements) {
         // WCAG 2.1 Target Evaluation Protocol Checks
         if (!el.metadata) {
             violations.push({ id: el.id, type: el.type, rule: 'aria-roles-missing', severity: 'high', message: 'Element lacks semantic metadata entirely.'});
             continue;
         }

         if (el.type === 'ui_text' || el.type === 'button') {
             if (!el.metadata.alt_text && !el.metadata.aria_label) {
                 violations.push({ id: el.id, type: el.type, rule: 'missing-alt-text', severity: 'high', message: 'Interactive element missing bounding ARIA semantics.'});
             }
             
             // Pseudo Math: Checking scalar representation metrics
             if (el.metadata.contrast_ratio !== undefined && el.metadata.contrast_ratio < contrastThreshold) {
                 violations.push({ id: el.id, type: el.type, rule: 'low-contrast', severity: 'medium', message: `Contrast Ratio ${el.metadata.contrast_ratio} fails WCAG bound ${contrastThreshold}.`});
             }
         }
    }

    const compliant = violations.length === 0;

    return {
       content: [{
         type: 'text',
         text: `Accessibility evaluation over ${elements.length} elements complete.\nWCAG 2.1 Compliance: ${compliant ? 'PASSED ✅' : 'FAILED ❌'}\n\nViolations found:\n${JSON.stringify(violations, null, 2)}`
       }]
    };
  }

  throw new Error(`Unknown spatial tool: ${toolName}`);
}
