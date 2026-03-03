/**
 * @hololand/backend -- Enterprise Services Module
 *
 * Enterprise-tier backend services for plan management, SSO wiring,
 * and custom domain management.
 *
 * - EnterpriseTierService: Plan definitions, feature gates, billing via Stripe
 * - SSOWiringService: SAML 2.0 + OIDC wiring into Hololand auth layer
 * - CustomDomainService: DNS verification, SSL provisioning, domain routing
 */

// --- EnterpriseTierService ---
export {
  EnterpriseTierService,
  getEnterpriseTierService,
} from './EnterpriseTierService';

export type {
  PlanId,
  PlanDefinition,
  UserPlan,
  FeatureName,
  UsageVsPlan,
  InvoiceSummary,
  PaginatedInvoices,
  EnterpriseTierServiceConfig,
} from './EnterpriseTierService';

// --- SSOWiringService ---
export {
  SSOWiringService,
  getSSOWiringService,
} from './SSOWiringService';

export type {
  SSOProtocol,
  SAMLConfig,
  OIDCConfig,
  SSOTenantConfig,
  SSOCallbackResult,
  SSOConnectionTestResult,
} from './SSOWiringService';

// --- CustomDomainService ---
export {
  CustomDomainService,
  getCustomDomainService,
} from './CustomDomainService';

export type {
  DomainStatus,
  CustomDomain,
  DomainVerificationResult,
  SSLProvisionResult,
} from './CustomDomainService';
