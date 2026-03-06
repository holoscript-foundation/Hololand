/**
 * Real-Time Failure Detection
 *
 * Implements the Partnership on AI framework for responsible agent behavior:
 * - Pre-action permission checks (risk assessment, stake/reversibility analysis)
 * - During-execution anomaly detection (rate, sequence, target, scope analysis)
 * - Post-action rollback readiness (checkpoints, state snapshots)
 * - Cross-step trajectory coherence analysis (goal inference, drift detection)
 *
 * Calibrated by stakes, reversibility, and agent affordances.
 *
 * @module failure-detection
 */

// Core engine
export { FailureDetector } from './FailureDetector';

// Types
export type {
  // Actions
  AgentAction,
  ActionType,
  ActionPhase,
  ActionResult,
  ActionTarget,
  SideEffect,
  // Risk
  RiskAssessment,
  RiskCategory,
  RiskFactor,
  RiskRecommendation,
  // PAI Framework
  StakesAssessment,
  ReversibilityAssessment,
  AgentAffordances,
  // Anomaly detection
  AnomalyDetectionResult,
  AnomalyType,
  AnomalyRecommendation,
  // Trajectory
  TrajectoryStep,
  TrajectoryAnalysis,
  // Rollback
  RollbackCheckpoint,
  RollbackResult,
  // Config
  FailureDetectionConfig,
  // Events
  FailureDetectionEventMap,
  FailureEventType,
  FailureEventHandler,
} from './types';
