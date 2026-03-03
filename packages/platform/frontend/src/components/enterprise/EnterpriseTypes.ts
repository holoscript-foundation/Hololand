/**
 * Enterprise Admin Types
 *
 * Defines the type system for enterprise administration including SSO,
 * domain management, billing, and plan configuration.
 *
 * @module enterprise/EnterpriseTypes
 */

// =============================================================================
// PLAN TYPES
// =============================================================================

/** Plan tier for billing */
export type PlanTier = 'free' | 'pro' | 'enterprise';

/** Plan feature entry */
export interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

/** Plan definition */
export interface Plan {
  tier: PlanTier;
  name: string;
  price: number; // monthly in cents, 0 for free
  annualPrice?: number; // annual in cents
  description: string;
  features: string[];
}

/** Plan usage metric */
export interface UsageMetric {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

// =============================================================================
// SSO TYPES
// =============================================================================

/** SSO protocol */
export type SSOProtocol = 'saml' | 'oidc';

/** SAML configuration */
export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: {
    email: string;
    name: string;
    role: string;
  };
}

/** OIDC configuration */
export interface OIDCConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

/** SSO connection status */
export type SSOConnectionStatus = 'unconfigured' | 'configured' | 'testing' | 'active' | 'failed';

/** SSO configuration */
export interface SSOConfiguration {
  id: string;
  protocol: SSOProtocol;
  status: SSOConnectionStatus;
  samlConfig?: SAMLConfig;
  oidcConfig?: OIDCConfig;
  createdAt: string;
  updatedAt: string;
}

/** SSO test result */
export interface SSOTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: Record<string, string>;
}

// =============================================================================
// DOMAIN TYPES
// =============================================================================

/** Domain verification status */
export type DomainStatus = 'pending' | 'verified' | 'active' | 'failed';

/** Custom domain */
export interface CustomDomain {
  id: string;
  domain: string;
  status: DomainStatus;
  txtRecordName: string;
  txtRecordValue: string;
  sslStatus: 'none' | 'provisioning' | 'active' | 'expired';
  verifiedAt?: string;
  createdAt: string;
  lastCheckedAt?: string;
}

// =============================================================================
// BILLING TYPES
// =============================================================================

/** Invoice status */
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

/** Invoice */
export interface Invoice {
  id: string;
  date: string;
  amount: number; // in cents
  status: InvoiceStatus;
  pdfUrl: string;
  description: string;
}

/** Payment method */
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/** Upcoming invoice preview */
export interface UpcomingInvoice {
  amount: number;
  date: string;
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
  prorationDetails?: {
    currentPlan: string;
    newPlan: string;
    prorationAmount: number;
    credit: number;
  };
}

// =============================================================================
// ENTERPRISE ADMIN TAB
// =============================================================================

/** Enterprise admin tabs */
export type EnterpriseTab = 'sso' | 'domains' | 'billing';

/** Enterprise tab metadata */
export interface EnterpriseTabMeta {
  id: EnterpriseTab;
  label: string;
  icon: string;
}

export const ENTERPRISE_TABS: EnterpriseTabMeta[] = [
  { id: 'sso', label: 'SSO Configuration', icon: 'SSO' },
  { id: 'domains', label: 'Domain Management', icon: 'DNS' },
  { id: 'billing', label: 'Billing & Plans', icon: 'PAY' },
];

// =============================================================================
// PLAN DEFINITIONS
// =============================================================================

export const PLAN_FEATURES: PlanFeature[] = [
  { name: 'Worlds', free: '3', pro: '25', enterprise: 'Unlimited' },
  { name: 'Storage', free: '500 MB', pro: '50 GB', enterprise: 'Unlimited' },
  { name: 'Collaborators', free: '2', pro: '25', enterprise: 'Unlimited' },
  { name: 'Custom Domains', free: false, pro: '1', enterprise: 'Unlimited' },
  { name: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { name: 'Priority Support', free: false, pro: true, enterprise: true },
  { name: 'Analytics Dashboard', free: false, pro: true, enterprise: true },
  { name: 'API Access', free: false, pro: true, enterprise: true },
  { name: 'Audit Logs', free: false, pro: false, enterprise: true },
  { name: 'SLA Guarantee', free: false, pro: false, enterprise: true },
  { name: 'Dedicated Account Manager', free: false, pro: false, enterprise: true },
];

export const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    description: 'For individuals and small experiments',
    features: ['3 worlds', '500 MB storage', '2 collaborators', 'Community support'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 2900, // $29/mo
    annualPrice: 29000, // $290/yr
    description: 'For teams and growing projects',
    features: ['25 worlds', '50 GB storage', '25 collaborators', '1 custom domain', 'Priority support', 'Analytics'],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 9900, // $99/mo
    annualPrice: 99000, // $990/yr
    description: 'For organizations requiring full control',
    features: ['Unlimited worlds', 'Unlimited storage', 'Unlimited collaborators', 'SSO / SAML', 'Audit logs', 'SLA guarantee'],
  },
];
