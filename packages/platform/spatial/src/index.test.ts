/**
 * @hololand/spatial - Test Suite
 *
 * Tests for GLBAssetLibrary, MentalWorldStateService, SpatialEmbeddingExtractor, and HoloScriptToGLBConverter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  // GLB
  GLBAssetLibrary,
  getGLBAssetLibrary,
  resetGLBAssetLibrary,
  type GLBAsset,
  type GLBMetadata,
  type BoundingBox,
  type LoadOptions,
  type LODConfig,
  
  // Mental
  MentalWorldStateService,
  getMentalWorldStateService,
  resetMentalWorldState,
  type Belief,
  type Goal,
  type SpatialContext,
  type AgentModel,
  
  // Embedding
  SpatialEmbeddingExtractor,
  getSpatialEmbeddingExtractor,
  resetSpatialEmbeddingExtractor,
  type SpatialEntity,
  type Connection,
  type LayoutAlgorithm,
  type Cluster,
  
  // Converter
  HoloScriptToGLBConverter,
  getHoloScriptToGLBConverter,
  type HoloScriptNode,
  type GLBExportOptions,
} from './index'

// =============================================================================
// GLB ASSET LIBRARY TESTS
// =============================================================================

describe('GLBAssetLibrary', () => {
  let library: GLBAssetLibrary

  beforeEach(() => {
    resetGLBAssetLibrary()
    library = getGLBAssetLibrary()
  })

  describe('initialization', () => {
    it('should create library instance', () => {
      expect(library).toBeDefined()
      expect(library).toBeInstanceOf(GLBAssetLibrary)
    })

    it('should return singleton instance', () => {
      const another = getGLBAssetLibrary()
      expect(library).toBe(another)
    })
  })

  describe('asset loading', () => {
    it('should have loadAsset method', () => {
      expect(typeof library.loadAsset).toBe('function')
    })
  })
})

// =============================================================================
// MENTAL WORLD STATE TESTS
// =============================================================================

describe('MentalWorldStateService', () => {
  let mental: MentalWorldStateService

  beforeEach(() => {
    resetMentalWorldState()
    mental = getMentalWorldStateService()
  })

  describe('initialization', () => {
    it('should create mental state instance', () => {
      expect(mental).toBeDefined()
      expect(mental).toBeInstanceOf(MentalWorldStateService)
    })

    it('should return singleton instance', () => {
      const another = getMentalWorldStateService()
      expect(mental).toBe(another)
    })
  })
})

// =============================================================================
// SPATIAL EMBEDDING EXTRACTOR TESTS
// =============================================================================

describe('SpatialEmbeddingExtractor', () => {
  let extractor: SpatialEmbeddingExtractor

  beforeEach(() => {
    resetSpatialEmbeddingExtractor()
    extractor = getSpatialEmbeddingExtractor()
  })

  describe('initialization', () => {
    it('should create extractor instance', () => {
      expect(extractor).toBeDefined()
      expect(extractor).toBeInstanceOf(SpatialEmbeddingExtractor)
    })

    it('should return singleton instance', () => {
      const another = getSpatialEmbeddingExtractor()
      expect(extractor).toBe(another)
    })
  })
})

// =============================================================================
// HOLOSCRIPT TO GLB CONVERTER TESTS
// =============================================================================

describe('HoloScriptToGLBConverter', () => {
  let converter: HoloScriptToGLBConverter

  beforeEach(() => {
    converter = getHoloScriptToGLBConverter()
  })

  describe('initialization', () => {
    it('should create converter instance', () => {
      expect(converter).toBeDefined()
      expect(converter).toBeInstanceOf(HoloScriptToGLBConverter)
    })
  })
})
