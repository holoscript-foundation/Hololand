# @hololand/ar-embeddings

Person re-identification (ReID) embeddings for AR tracking.

## Overview

This package provides person re-identification capabilities for multi-user AR:

- **Feature Extraction** - Extract 512-dim embeddings from person crops
- **Gallery Matching** - Match against known persons
- **Quality Assessment** - Filter poor quality detections
- **Clustering** - Group similar appearances

## Installation

```bash
npm install @hololand/ar-embeddings
```

For ONNX backend (recommended):
```bash
npm install onnxruntime-web
```

For TensorFlow.js backend:
```bash
npm install @tensorflow/tfjs
```

## Quick Start

```typescript
import { EmbeddingExtractor, EmbeddingMatcher } from '@hololand/ar-embeddings';

// Initialize extractor
const extractor = new EmbeddingExtractor({
  model: 'osnet',
  backend: 'onnx',
  modelPath: 'https://cdn.example.com/models/osnet_x0_25.onnx',
});
await extractor.initialize();

// Initialize matcher
const matcher = new EmbeddingMatcher({
  metric: 'cosine',
  threshold: 0.6,
});

// Extract embedding from person crop
const embedding = await extractor.extract(personCrop);

// Match against gallery
const matches = matcher.match(embedding);
if (matches.length > 0) {
  console.log(`Matched: ${matches[0].personId} (${matches[0].similarity.toFixed(2)})`);
}

// Add new person to gallery
matcher.addToGallery('user_abc123', embedding, 'Alice');
```

## Embedding Extraction

### Configuration

```typescript
const extractor = new EmbeddingExtractor({
  model: 'osnet',           // Model type
  backend: 'onnx',          // 'onnx' or 'tfjs'
  modelPath: '...',         // Model URL or path
  inputSize: {              // Input dimensions
    width: 128,
    height: 256,
  },
  outputDimensions: 512,    // Embedding size
  normalize: true,          // L2 normalize output
  mean: [0.485, 0.456, 0.406],  // ImageNet normalization
  std: [0.229, 0.224, 0.225],
});
```

### With Quality Metadata

```typescript
const embedding = await extractor.extractWithMetadata(
  personCrop,
  boundingBox,
  detectionId
);

console.log('Quality:', embedding.quality);
console.log('Occlusion:', embedding.occlusion);
```

### Batch Extraction

```typescript
const crops = detections.map(d => ({
  source: d.crop,
  boundingBox: d.boundingBox,
  detectionId: d.id,
}));

const embeddings = await extractor.extractBatch(crops);
```

## Matching

### Distance Metrics

```typescript
const matcher = new EmbeddingMatcher({
  metric: 'cosine',     // Default: cosine similarity
  threshold: 0.6,       // Minimum similarity for match
  topK: 5,              // Return top K matches
});

// Or Euclidean distance
const euclideanMatcher = new EmbeddingMatcher({
  metric: 'euclidean',
  threshold: 0.7,
});
```

### Quality Filtering

```typescript
const matcher = new EmbeddingMatcher({
  minQuality: 0.5,      // Reject low quality
  maxOcclusion: 0.5,    // Reject heavily occluded
});

// Use quality-aware matching
const matches = matcher.matchWithQuality(personEmbedding);
```

### Gallery Management

```typescript
// Add to gallery
matcher.addToGallery('user_123', embedding, 'Alice', {
  role: 'host',
});

// Multiple embeddings improve matching
matcher.addToGallery('user_123', embedding2);
matcher.addToGallery('user_123', embedding3);

// Remove from gallery
matcher.removeFromGallery('user_123');

// Clear gallery
matcher.clearGallery();

// Export/Import for persistence
const galleryData = matcher.exportGallery();
localStorage.setItem('gallery', JSON.stringify(galleryData));

// Later...
const saved = JSON.parse(localStorage.getItem('gallery'));
matcher.importGallery(saved);
```

## Integration with AR Pipeline

```typescript
import { BlazePoseDetector } from '@hololand/ar-detection';
import { EmbeddingExtractor, EmbeddingMatcher } from '@hololand/ar-embeddings';
import { ARTrackingClient } from '@hololand/ar-tracking/client';

// Setup
const detector = new BlazePoseDetector({ extractCrops: true });
const extractor = new EmbeddingExtractor();
const matcher = new EmbeddingMatcher();
const client = new ARTrackingClient('wss://tracking.server.com');

await detector.initialize();
await extractor.initialize();

// Detection loop
async function onFrame(video: HTMLVideoElement) {
  const result = await detector.detect(video);
  
  for (const person of result.persons) {
    // Skip if no crop
    if (!person.crop) continue;
    
    // Extract embedding
    const embedding = await extractor.extractWithMetadata(
      person.crop,
      person.skeleton2D.boundingBox,
      person.id
    );
    
    // Send to tracking server
    client.sendDetection({
      position: person.skeleton3D?.rootPosition ?? { x: 0, y: 0, z: 0 },
      embedding: Array.from(embedding.vector),
      skeleton: person.skeleton3D,
    });
    
    // Local matching (optional)
    const matches = matcher.matchWithQuality(embedding);
    if (matches.length > 0) {
      console.log(`Local match: ${matches[0].personId}`);
    }
  }
}
```

## Clustering

Group similar appearances together:

```typescript
// Extract embeddings from multiple detections
const embeddings = await Promise.all(
  crops.map(c => extractor.extract(c))
);

// Cluster by appearance similarity
const clusters = matcher.clusterEmbeddings(embeddings, 0.6);

// clusters = [[0, 3, 7], [1, 4], [2, 5, 6, 8]]
// Each cluster contains indices of similar persons
```

## Models

### OSNet (Recommended)

OSNet (Omni-Scale Network) is lightweight and accurate:

- **osnet_x0_25** - 0.25x width, 512-dim output, ~0.6MB
- **osnet_x0_5** - 0.5x width, 512-dim output, ~1.8MB
- **osnet_x1_0** - Full width, 512-dim output, ~6.5MB

### FastReID

High-accuracy models from Facebook Research:

- **fastreid_sbs** - Strong Baseline, 2048-dim
- **fastreid_mgn** - Multiple Granularity Network

### Model Sources

Pre-trained models can be obtained from:
- [OSNet GitHub](https://github.com/KaiyangZhou/deep-person-reid)
- [FastReID GitHub](https://github.com/JDAI-CV/fast-reid)

Convert to ONNX for web deployment:
```bash
python -m onnxruntime.transformers.models.export --model osnet_x0_25 --output osnet.onnx
```

## API Reference

### EmbeddingExtractor

| Method | Description |
|--------|-------------|
| `initialize()` | Load model |
| `extract(image, boundingBox?)` | Extract embedding |
| `extractWithMetadata(image, box, id)` | Extract with quality |
| `extractBatch(crops)` | Extract multiple |
| `dispose()` | Release resources |

### EmbeddingMatcher

| Method | Description |
|--------|-------------|
| `match(query)` | Find matches |
| `matchBest(query)` | Find best match |
| `matchWithQuality(query)` | Quality-filtered match |
| `addToGallery(id, embedding)` | Add to gallery |
| `removeFromGallery(id)` | Remove from gallery |
| `clusterEmbeddings(embeddings, threshold)` | Cluster similar |
| `exportGallery()` / `importGallery()` | Persistence |

### ImagePreprocessor

| Method | Description |
|--------|-------------|
| `preprocess(image, boundingBox?)` | Prepare for model |
| `calculateQuality(image)` | Estimate quality |
| `estimateOcclusion(image, box)` | Estimate occlusion |

## Types

```typescript
interface Embedding {
  vector: Float32Array;
  dimensions: number;
  normalized: boolean;
  timestamp: number;
}

interface PersonEmbedding extends Embedding {
  detectionId: number;
  boundingBox: BoundingBox;
  quality: number;
  occlusion: number;
}

interface MatchResult {
  personId: string;
  similarity: number;
  distance: number;
  confidence: number;
}
```

## License

MIT - see LICENSE file
