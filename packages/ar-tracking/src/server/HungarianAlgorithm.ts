/**
 * Hungarian Algorithm (Kuhn-Munkres) for optimal assignment
 * 
 * Solves the assignment problem: given an NxM cost matrix,
 * find the assignment that minimizes total cost.
 * 
 * Used for: matching detections to existing tracks
 */

export interface AssignmentResult {
  /** Track index → Detection index mapping (-1 if unmatched) */
  trackToDetection: number[];
  /** Detection index → Track index mapping (-1 if unmatched) */
  detectionToTrack: number[];
  /** Unmatched track indices */
  unmatchedTracks: number[];
  /** Unmatched detection indices */
  unmatchedDetections: number[];
  /** Total assignment cost */
  totalCost: number;
}

/**
 * Solve optimal assignment using Hungarian algorithm
 * 
 * @param costMatrix NxM matrix where costMatrix[i][j] is cost of assigning track i to detection j
 * @param maxCost Maximum allowed cost for a valid assignment (gating threshold)
 */
export function hungarianAssignment(
  costMatrix: number[][],
  maxCost: number = Infinity
): AssignmentResult {
  const numTracks = costMatrix.length;
  const numDetections = costMatrix[0]?.length ?? 0;

  if (numTracks === 0 || numDetections === 0) {
    return {
      trackToDetection: Array(numTracks).fill(-1),
      detectionToTrack: Array(numDetections).fill(-1),
      unmatchedTracks: Array.from({ length: numTracks }, (_, i) => i),
      unmatchedDetections: Array.from({ length: numDetections }, (_, i) => i),
      totalCost: 0,
    };
  }

  // Make square matrix by padding with maxCost
  const n = Math.max(numTracks, numDetections);
  const matrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i < numTracks && j < numDetections) {
        matrix[i][j] = costMatrix[i][j];
      } else {
        matrix[i][j] = maxCost; // Padding for dummy assignments
      }
    }
  }

  // Run Hungarian algorithm
  const assignment = munkres(matrix);

  // Extract results
  const trackToDetection: number[] = Array(numTracks).fill(-1);
  const detectionToTrack: number[] = Array(numDetections).fill(-1);
  const unmatchedTracks: number[] = [];
  const unmatchedDetections: number[] = [];
  let totalCost = 0;

  for (let i = 0; i < n; i++) {
    const j = assignment[i];
    
    if (i < numTracks && j < numDetections) {
      const cost = costMatrix[i][j];
      
      if (cost <= maxCost) {
        trackToDetection[i] = j;
        detectionToTrack[j] = i;
        totalCost += cost;
      } else {
        unmatchedTracks.push(i);
        unmatchedDetections.push(j);
      }
    } else if (i < numTracks) {
      unmatchedTracks.push(i);
    }
  }

  // Find detections that weren't assigned
  for (let j = 0; j < numDetections; j++) {
    if (detectionToTrack[j] === -1 && !unmatchedDetections.includes(j)) {
      unmatchedDetections.push(j);
    }
  }

  return {
    trackToDetection,
    detectionToTrack,
    unmatchedTracks,
    unmatchedDetections,
    totalCost,
  };
}

/**
 * Munkres (Hungarian) algorithm implementation
 * Returns array where result[row] = assigned column
 */
function munkres(costMatrix: number[][]): number[] {
  const n = costMatrix.length;
  
  // Copy matrix
  const C: number[][] = costMatrix.map(row => [...row]);
  
  // Step 1: Subtract row minimum from each row
  for (let i = 0; i < n; i++) {
    const rowMin = Math.min(...C[i]);
    for (let j = 0; j < n; j++) {
      C[i][j] -= rowMin;
    }
  }

  // Step 2: Subtract column minimum from each column
  for (let j = 0; j < n; j++) {
    let colMin = Infinity;
    for (let i = 0; i < n; i++) {
      colMin = Math.min(colMin, C[i][j]);
    }
    for (let i = 0; i < n; i++) {
      C[i][j] -= colMin;
    }
  }

  // Marking arrays
  const rowCover: boolean[] = Array(n).fill(false);
  const colCover: boolean[] = Array(n).fill(false);
  const starred: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
  const primed: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));

  // Step 3: Star zeros
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (C[i][j] === 0 && !rowCover[i] && !colCover[j]) {
        starred[i][j] = true;
        rowCover[i] = true;
        colCover[j] = true;
      }
    }
  }
  rowCover.fill(false);
  colCover.fill(false);

  // Main loop
  let step = 4;
  let maxIterations = n * n * 10;
  
  while (maxIterations-- > 0) {
    if (step === 4) {
      // Cover columns containing starred zeros
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          if (starred[i][j]) {
            colCover[j] = true;
            break;
          }
        }
      }
      
      // Check if done
      const coveredCols = colCover.filter(c => c).length;
      if (coveredCols >= n) {
        break;
      }
      step = 5;
    }
    
    if (step === 5) {
      // Find uncovered zero and prime it
      let found = false;
      let primeRow = -1;
      let primeCol = -1;
      
      for (let i = 0; i < n && !found; i++) {
        if (rowCover[i]) continue;
        for (let j = 0; j < n && !found; j++) {
          if (colCover[j]) continue;
          if (C[i][j] === 0) {
            primed[i][j] = true;
            primeRow = i;
            primeCol = j;
            found = true;
          }
        }
      }
      
      if (!found) {
        // Step 6: Adjust matrix
        let minVal = Infinity;
        for (let i = 0; i < n; i++) {
          if (rowCover[i]) continue;
          for (let j = 0; j < n; j++) {
            if (colCover[j]) continue;
            minVal = Math.min(minVal, C[i][j]);
          }
        }
        
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (rowCover[i]) C[i][j] += minVal;
            if (!colCover[j]) C[i][j] -= minVal;
          }
        }
        continue;
      }
      
      // Check for starred zero in same row
      let starCol = -1;
      for (let j = 0; j < n; j++) {
        if (starred[primeRow][j]) {
          starCol = j;
          break;
        }
      }
      
      if (starCol !== -1) {
        rowCover[primeRow] = true;
        colCover[starCol] = false;
      } else {
        // Step 7: Augment path
        const path: [number, number][] = [[primeRow, primeCol]];
        
        while (true) {
          // Find starred zero in column
          const lastCol = path[path.length - 1][1];
          let starRow = -1;
          for (let i = 0; i < n; i++) {
            if (starred[i][lastCol]) {
              starRow = i;
              break;
            }
          }
          
          if (starRow === -1) break;
          path.push([starRow, lastCol]);
          
          // Find primed zero in row
          let primeColInRow = -1;
          for (let j = 0; j < n; j++) {
            if (primed[starRow][j]) {
              primeColInRow = j;
              break;
            }
          }
          path.push([starRow, primeColInRow]);
        }
        
        // Augment
        for (const [pi, pj] of path) {
          starred[pi][pj] = !starred[pi][pj];
        }
        
        // Clear covers and primes
        rowCover.fill(false);
        colCover.fill(false);
        for (let i = 0; i < n; i++) {
          primed[i].fill(false);
        }
        
        step = 4;
      }
    }
  }

  // Extract assignment
  const result: number[] = Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (starred[i][j]) {
        result[i] = j;
        break;
      }
    }
  }

  return result;
}

/**
 * Compute cost matrix from tracks and detections
 */
export function computeCostMatrix(
  tracks: { position: { x: number; y: number; z: number }; appearanceEmbedding?: number[] }[],
  detections: { position: { x: number; y: number; z: number }; appearanceEmbedding?: number[] }[],
  positionWeight: number = 0.6,
  appearanceWeight: number = 0.4,
  maxDistance: number = 5.0
): number[][] {
  const costMatrix: number[][] = [];

  for (let i = 0; i < tracks.length; i++) {
    costMatrix[i] = [];
    const track = tracks[i];
    
    for (let j = 0; j < detections.length; j++) {
      const detection = detections[j];
      
      // Position distance (Euclidean)
      const dx = track.position.x - detection.position.x;
      const dy = track.position.y - detection.position.y;
      const dz = track.position.z - detection.position.z;
      const positionDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Normalize position distance
      const normalizedPosition = Math.min(positionDistance / maxDistance, 1.0);
      
      // Appearance distance (cosine distance)
      let appearanceDistance = 0.5; // Default if no embeddings
      
      if (track.appearanceEmbedding && detection.appearanceEmbedding) {
        appearanceDistance = cosineDistance(
          track.appearanceEmbedding,
          detection.appearanceEmbedding
        );
      }
      
      // Combined cost
      costMatrix[i][j] = positionWeight * normalizedPosition + 
                         appearanceWeight * appearanceDistance;
    }
  }

  return costMatrix;
}

/**
 * Cosine distance between two vectors (1 - cosine similarity)
 */
function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 1.0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 1.0;
  
  const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1.0 - cosineSimilarity;
}
