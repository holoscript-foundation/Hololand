/**
 * Enterprise Admin Components
 *
 * Barrel export for enterprise administration features including
 * SSO configuration, domain management, and billing.
 *
 * @module enterprise
 */

export { EnterpriseAdmin, type EnterpriseAdminProps } from './EnterpriseAdmin';
export { SSOConfigWizard, type SSOConfigWizardProps } from './SSOConfigWizard';
export { DomainManagement, type DomainManagementProps } from './DomainManagement';
export { BillingPage, type BillingPageProps } from './BillingPage';

// Types
export type {
  PlanTier,
  PlanFeature,
  Plan,
  UsageMetric,
  SSOProtocol,
  SAMLConfig,
  OIDCConfig,
  SSOConnectionStatus,
  SSOConfiguration,
  SSOTestResult,
  DomainStatus,
  CustomDomain,
  InvoiceStatus,
  Invoice,
  PaymentMethod,
  UpcomingInvoice,
  EnterpriseTab,
  EnterpriseTabMeta,
} from './EnterpriseTypes';

export {
  ENTERPRISE_TABS,
  PLAN_FEATURES,
  PLANS,
} from './EnterpriseTypes';
