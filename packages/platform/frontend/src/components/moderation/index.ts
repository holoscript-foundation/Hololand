/**
 * Moderation Dashboard Module
 *
 * Content moderation UI for the HoloLand platform including queue management,
 * settings configuration, appeal reviews, and analytics metrics.
 * Exports all moderation components, types, and constants.
 *
 * @module moderation
 */

// Types
export * from './ModerationTypes';

// Components
export { ModerationDashboard, type ModerationDashboardProps } from './ModerationDashboard';
export { ModerationSettings, type ModerationSettingsProps } from './ModerationSettings';
export { AppealReviewPanel, type AppealReviewPanelProps } from './AppealReviewPanel';
export { ModerationMetrics, type ModerationMetricsProps } from './ModerationMetrics';
