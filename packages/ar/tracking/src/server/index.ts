/**
 * @hololand/ar-tracking - Server Module
 * 
 * Server-side multi-target tracking with:
 * - Kalman filter state estimation
 * - Hungarian algorithm data association
 * - ReID appearance embedding matching
 */

export { KalmanFilter3D } from './KalmanFilter';
export { 
  hungarianAssignment, 
  computeCostMatrix,
  type AssignmentResult 
} from './HungarianAlgorithm';
export { MultiTargetTracker } from './MultiTargetTracker';
export { 
  ARTrackingService,
  type ConnectedHeadset,
  type TrackingServiceEvents 
} from './ARTrackingService';
