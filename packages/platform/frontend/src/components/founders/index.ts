/**
 * Founders Program Module
 *
 * Frontend components for the HoloLand Founders Program:
 *   - Application form (multi-step wizard)
 *   - Founder dashboard (quotas, referrals, features)
 *   - Waitlist status page
 *   - Onboarding wizard (6-step guided setup)
 *
 * @module founders
 */

// API Client
export {
  foundersAPI,
  onboardingAPI,
  type Founder,
  type FounderApplicationStatus,
  type FounderBadgeTier,
  type FounderOnboardingStep,
  type OnboardingProgress,
  type OnboardingStepConfig,
  type WaitlistInfo,
  type FounderQuotas,
  type FounderUsage,
  type ActivityItem,
  type LeaderboardEntry,
  type EarlyAccessFeature,
} from './foundersApi';

// Components
export { FoundersApplication } from './FoundersApplication';
export { FoundersDashboard } from './FoundersDashboard';
export { FounderWaitlist } from './FounderWaitlist';
export { FounderOnboarding } from './FounderOnboarding';
