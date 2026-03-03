/**
 * SSOConfigWizard Component
 *
 * Multi-step SSO configuration wizard supporting both SAML 2.0 and OIDC protocols.
 *
 * SAML Path:
 *   Step 1: Choose protocol
 *   Step 2: Enter IdP metadata (Entity ID, SSO URL, Certificate, Attribute Mapping)
 *   Step 3: Download SP metadata XML, copy ACS URL
 *   Step 4: Test connection
 *
 * OIDC Path:
 *   Step 1: Choose protocol
 *   Step 2: Enter OIDC config (Issuer URL, Client ID, Client Secret, Scopes)
 *   Step 3: Copy redirect URI
 *   Step 4: Test connection
 *
 * Both paths end with "Save & Enable" button.
 * Uses Tailwind CSS with full ARIA accessibility.
 *
 * @module enterprise/SSOConfigWizard
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type SSOProtocol,
  type SAMLConfig,
  type OIDCConfig,
  type SSOConfiguration,
  type SSOTestResult,
} from './EnterpriseTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface SSOConfigWizardProps {
  existingConfig?: SSOConfiguration;
  onSave: (protocol: SSOProtocol, config: SAMLConfig | OIDCConfig) => void;
  onTestConnection: (protocol: SSOProtocol, config: SAMLConfig | OIDCConfig) => Promise<SSOTestResult>;
  onDownloadSPMetadata?: () => void;
  acsUrl?: string;
  redirectUri?: string;
}

// =============================================================================
// WIZARD STEP TYPE
// =============================================================================

type WizardStep = 1 | 2 | 3 | 4;

const SAML_STEPS = ['Choose Protocol', 'IdP Metadata', 'SP Configuration', 'Test Connection'];
const OIDC_STEPS = ['Choose Protocol', 'OIDC Configuration', 'Redirect URI', 'Test Connection'];

// =============================================================================
// STEP INDICATOR SUB-COMPONENT
// =============================================================================

const StepIndicator: React.FC<{
  currentStep: WizardStep;
  steps: string[];
}> = ({ currentStep, steps }) => (
  <div className="flex items-center gap-0 px-6 py-4" role="navigation" aria-label="Wizard progress">
    {steps.map((label, index) => {
      const stepNum = (index + 1) as WizardStep;
      const isActive = currentStep === stepNum;
      const isComplete = currentStep > stepNum;

      return (
        <React.Fragment key={label}>
          {index > 0 && (
            <div
              className={`flex-1 h-px mx-2 ${
                isComplete ? 'bg-indigo-500' : 'bg-white/[0.08]'
              }`}
              aria-hidden="true"
            />
          )}
          <div className="flex items-center gap-2">
            <span
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border transition-all
                ${isComplete
                  ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-300'
                  : isActive
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-zinc-600'
                }
              `}
              aria-current={isActive ? 'step' : undefined}
            >
              {isComplete ? '\u2713' : stepNum}
            </span>
            <span
              className={`text-[10px] font-medium hidden sm:inline ${
                isActive ? 'text-indigo-400' : isComplete ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              {label}
            </span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

// =============================================================================
// PROTOCOL CHOOSER (STEP 1)
// =============================================================================

const ProtocolChooser: React.FC<{
  selected: SSOProtocol | null;
  onSelect: (protocol: SSOProtocol) => void;
}> = ({ selected, onSelect }) => (
  <div className="p-6 space-y-4">
    <h3 className="text-sm font-bold text-zinc-300 mb-2">Choose SSO Protocol</h3>
    <p className="text-[11px] text-zinc-500 mb-6">
      Select the identity federation protocol supported by your identity provider.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* SAML 2.0 Card */}
      <button
        className={`
          text-left p-5 rounded-lg border transition-all duration-150
          ${selected === 'saml'
            ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20'
            : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }
        `}
        onClick={() => onSelect('saml')}
        aria-pressed={selected === 'saml'}
        aria-label="Select SAML 2.0 protocol"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-extrabold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded">SAML</span>
          <span className="text-xs font-bold text-zinc-200">SAML 2.0</span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Security Assertion Markup Language. Industry standard for enterprise SSO.
          Supports Okta, Azure AD, OneLogin, and most enterprise identity providers.
        </p>
      </button>

      {/* OIDC Card */}
      <button
        className={`
          text-left p-5 rounded-lg border transition-all duration-150
          ${selected === 'oidc'
            ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20'
            : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }
        `}
        onClick={() => onSelect('oidc')}
        aria-pressed={selected === 'oidc'}
        aria-label="Select OIDC protocol"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">OIDC</span>
          <span className="text-xs font-bold text-zinc-200">OpenID Connect</span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          OAuth 2.0 based identity layer. Modern, lightweight protocol with auto-discovery.
          Supports Google, Auth0, Keycloak, and OpenID-compatible providers.
        </p>
      </button>
    </div>
  </div>
);

// =============================================================================
// SAML CONFIG FORM (STEP 2 - SAML PATH)
// =============================================================================

const SAMLConfigForm: React.FC<{
  config: SAMLConfig;
  onChange: (config: SAMLConfig) => void;
}> = ({ config, onChange }) => {
  const updateField = useCallback(
    <K extends keyof SAMLConfig>(field: K, value: SAMLConfig[K]) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  const updateMapping = useCallback(
    (field: keyof SAMLConfig['attributeMapping'], value: string) => {
      onChange({
        ...config,
        attributeMapping: { ...config.attributeMapping, [field]: value },
      });
    },
    [config, onChange],
  );

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-sm font-bold text-zinc-300">SAML 2.0 Identity Provider Metadata</h3>

      {/* Entity ID */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Entity ID (Issuer URL)
        </label>
        <input
          type="url"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
          placeholder="https://idp.example.com/metadata"
          value={config.entityId}
          onChange={(e) => updateField('entityId', e.target.value)}
          aria-label="Entity ID URL"
        />
      </div>

      {/* SSO URL */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          SSO URL (Login Endpoint)
        </label>
        <input
          type="url"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
          placeholder="https://idp.example.com/sso/saml"
          value={config.ssoUrl}
          onChange={(e) => updateField('ssoUrl', e.target.value)}
          aria-label="SSO URL"
        />
      </div>

      {/* Certificate */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          X.509 Certificate (PEM format)
        </label>
        <textarea
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[10px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors resize-y min-h-[100px]"
          rows={6}
          placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDpDCCAoygAwIBAgIGAX...&#10;-----END CERTIFICATE-----"
          value={config.certificate}
          onChange={(e) => updateField('certificate', e.target.value)}
          aria-label="X.509 Certificate in PEM format"
        />
      </div>

      {/* Attribute Mapping */}
      <div>
        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Attribute Mapping
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[9px] text-zinc-600 mb-1">Email Attribute</label>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
              placeholder="email"
              value={config.attributeMapping.email}
              onChange={(e) => updateMapping('email', e.target.value)}
              aria-label="Email attribute mapping"
            />
          </div>
          <div>
            <label className="block text-[9px] text-zinc-600 mb-1">Name Attribute</label>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
              placeholder="displayName"
              value={config.attributeMapping.name}
              onChange={(e) => updateMapping('name', e.target.value)}
              aria-label="Name attribute mapping"
            />
          </div>
          <div>
            <label className="block text-[9px] text-zinc-600 mb-1">Role Attribute</label>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
              placeholder="role"
              value={config.attributeMapping.role}
              onChange={(e) => updateMapping('role', e.target.value)}
              aria-label="Role attribute mapping"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SAML SP METADATA (STEP 3 - SAML PATH)
// =============================================================================

const SAMLSPMetadata: React.FC<{
  acsUrl?: string;
  onDownloadMetadata?: () => void;
}> = ({ acsUrl = 'https://app.hololand.dev/api/auth/saml/callback', onDownloadMetadata }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyACS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(acsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  }, [acsUrl]);

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-sm font-bold text-zinc-300">Service Provider Configuration</h3>
      <p className="text-[11px] text-zinc-500">
        Configure your Identity Provider with the following details from HoloLand.
      </p>

      {/* Download SP Metadata */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          SP Metadata XML
        </label>
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-md text-[11px] font-semibold hover:bg-indigo-500/25 transition-colors"
          onClick={onDownloadMetadata}
          aria-label="Download SP metadata XML file"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download SP Metadata XML
        </button>
      </div>

      {/* ACS URL */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Assertion Consumer Service (ACS) URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-300 font-mono"
            value={acsUrl}
            aria-label="ACS URL"
          />
          <button
            className={`
              px-3 py-2 rounded-md text-[10px] font-semibold border transition-colors
              ${copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
              }
            `}
            onClick={handleCopyACS}
            aria-label={copied ? 'Copied' : 'Copy ACS URL'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// OIDC CONFIG FORM (STEP 2 - OIDC PATH)
// =============================================================================

const OIDCConfigForm: React.FC<{
  config: OIDCConfig;
  onChange: (config: OIDCConfig) => void;
}> = ({ config, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);

  const updateField = useCallback(
    <K extends keyof OIDCConfig>(field: K, value: OIDCConfig[K]) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  const toggleScope = useCallback(
    (scope: string) => {
      const scopes = config.scopes.includes(scope)
        ? config.scopes.filter((s) => s !== scope)
        : [...config.scopes, scope];
      onChange({ ...config, scopes });
    },
    [config, onChange],
  );

  const availableScopes = ['openid', 'profile', 'email', 'groups'];
  // Auto-discovery indicator
  const hasIssuer = config.issuerUrl.trim().length > 0;

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-sm font-bold text-zinc-300">OpenID Connect Configuration</h3>

      {/* Issuer URL */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Issuer URL
        </label>
        <div className="relative">
          <input
            type="url"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 pr-32 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
            placeholder="https://accounts.google.com"
            value={config.issuerUrl}
            onChange={(e) => updateField('issuerUrl', e.target.value)}
            aria-label="Issuer URL"
          />
          {/* Auto-discovery indicator */}
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold px-2 py-0.5 rounded ${
              hasIssuer
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-zinc-700/50 text-zinc-500'
            }`}
          >
            {hasIssuer ? 'Auto-discovery ready' : 'Enter issuer URL'}
          </span>
        </div>
        <p className="text-[9px] text-zinc-600 mt-1">
          OpenID configuration will be auto-discovered from <code className="text-zinc-500">.well-known/openid-configuration</code>
        </p>
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Client ID
        </label>
        <input
          type="text"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
          placeholder="your-client-id"
          value={config.clientId}
          onChange={(e) => updateField('clientId', e.target.value)}
          aria-label="Client ID"
        />
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Client Secret
        </label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 pr-16 text-[11px] text-zinc-200 font-mono placeholder-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
            placeholder="your-client-secret"
            value={config.clientSecret}
            onChange={(e) => updateField('clientSecret', e.target.value)}
            aria-label="Client Secret"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded transition-colors"
            onClick={() => setShowSecret((s) => !s)}
            aria-label={showSecret ? 'Hide client secret' : 'Show client secret'}
          >
            {showSecret ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Scopes */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Scopes
        </label>
        <div className="flex flex-wrap gap-3">
          {availableScopes.map((scope) => {
            const isChecked = config.scopes.includes(scope);
            const isRequired = scope === 'openid';
            return (
              <label
                key={scope}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-[11px] font-medium transition-all
                  ${isChecked
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:border-white/[0.15]'
                  }
                  ${isRequired ? 'opacity-80 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="checkbox"
                  className="w-3 h-3 rounded border-white/20 bg-transparent text-indigo-500 focus:ring-indigo-500/30"
                  checked={isChecked}
                  onChange={() => !isRequired && toggleScope(scope)}
                  disabled={isRequired}
                  aria-label={`Scope: ${scope}`}
                />
                {scope}
                {isRequired && <span className="text-[8px] text-zinc-600">(required)</span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// OIDC REDIRECT URI (STEP 3 - OIDC PATH)
// =============================================================================

const OIDCRedirectURI: React.FC<{
  redirectUri?: string;
}> = ({ redirectUri = 'https://app.hololand.dev/api/auth/oidc/callback' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [redirectUri]);

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-sm font-bold text-zinc-300">Redirect URI</h3>
      <p className="text-[11px] text-zinc-500">
        Add this redirect URI to your OpenID Connect application configuration.
      </p>

      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          Redirect URI
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[11px] text-zinc-300 font-mono"
            value={redirectUri}
            aria-label="Redirect URI"
          />
          <button
            className={`
              px-3 py-2 rounded-md text-[10px] font-semibold border transition-colors
              ${copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
              }
            `}
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy redirect URI'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TEST CONNECTION (STEP 4 - BOTH PATHS)
// =============================================================================

const TestConnection: React.FC<{
  protocol: SSOProtocol;
  onTest: () => Promise<SSOTestResult>;
  testResult: SSOTestResult | null;
  isTesting: boolean;
}> = ({ protocol, onTest, testResult, isTesting }) => (
  <div className="p-6 space-y-5">
    <h3 className="text-sm font-bold text-zinc-300">Test Connection</h3>
    <p className="text-[11px] text-zinc-500">
      Verify that the {protocol === 'saml' ? 'SAML 2.0' : 'OIDC'} connection is correctly configured
      by testing a login flow.
    </p>

    <button
      className={`
        flex items-center gap-2 px-5 py-3 rounded-md text-xs font-bold border transition-all
        ${isTesting
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 cursor-wait'
          : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25'
        }
      `}
      onClick={onTest}
      disabled={isTesting}
      aria-label={isTesting ? 'Testing connection...' : 'Test SSO connection'}
    >
      {isTesting ? (
        <>
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          Testing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Test Connection
        </>
      )}
    </button>

    {/* Test Result */}
    {testResult && (
      <div
        className={`
          p-4 rounded-lg border
          ${testResult.success
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
          }
        `}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-bold ${
              testResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {testResult.success ? 'Connection Successful' : 'Connection Failed'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">{testResult.message}</p>
        {testResult.details && (
          <div className="mt-3 space-y-1">
            {Object.entries(testResult.details).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[10px]">
                <span className="text-zinc-600 font-medium">{key}:</span>
                <span className="text-zinc-400 font-mono">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SSOConfigWizard = React.memo<SSOConfigWizardProps>(
  function SSOConfigWizard({
    existingConfig,
    onSave,
    onTestConnection,
    onDownloadSPMetadata,
    acsUrl,
    redirectUri,
  }) {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    const [step, setStep] = useState<WizardStep>(1);
    const [protocol, setProtocol] = useState<SSOProtocol | null>(
      existingConfig?.protocol || null,
    );
    const [samlConfig, setSamlConfig] = useState<SAMLConfig>(
      existingConfig?.samlConfig || {
        entityId: '',
        ssoUrl: '',
        certificate: '',
        attributeMapping: { email: 'email', name: 'displayName', role: 'role' },
      },
    );
    const [oidcConfig, setOidcConfig] = useState<OIDCConfig>(
      existingConfig?.oidcConfig || {
        issuerUrl: '',
        clientId: '',
        clientSecret: '',
        scopes: ['openid', 'profile', 'email'],
      },
    );
    const [testResult, setTestResult] = useState<SSOTestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const steps = protocol === 'saml' ? SAML_STEPS : OIDC_STEPS;

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------
    const canProceed = useMemo(() => {
      switch (step) {
        case 1:
          return protocol !== null;
        case 2:
          if (protocol === 'saml') {
            return samlConfig.entityId.trim() !== '' && samlConfig.ssoUrl.trim() !== '' && samlConfig.certificate.trim() !== '';
          }
          return oidcConfig.issuerUrl.trim() !== '' && oidcConfig.clientId.trim() !== '' && oidcConfig.clientSecret.trim() !== '';
        case 3:
          return true;
        case 4:
          return testResult?.success === true;
        default:
          return false;
      }
    }, [step, protocol, samlConfig, oidcConfig, testResult]);

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------
    const handleNext = useCallback(() => {
      if (step < 4) {
        setStep((s) => (s + 1) as WizardStep);
        setTestResult(null);
      }
    }, [step]);

    const handleBack = useCallback(() => {
      if (step > 1) {
        setStep((s) => (s - 1) as WizardStep);
        setTestResult(null);
      }
    }, [step]);

    const handleProtocolSelect = useCallback((p: SSOProtocol) => {
      setProtocol(p);
    }, []);

    // -----------------------------------------------------------------------
    // Test connection
    // -----------------------------------------------------------------------
    const handleTest = useCallback(async () => {
      if (!protocol) return;
      setIsTesting(true);
      setTestResult(null);
      try {
        const config = protocol === 'saml' ? samlConfig : oidcConfig;
        const result = await onTestConnection(protocol, config);
        setTestResult(result);
      } catch (err) {
        setTestResult({
          success: false,
          message: err instanceof Error ? err.message : 'Connection test failed unexpectedly.',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsTesting(false);
      }
    }, [protocol, samlConfig, oidcConfig, onTestConnection]);

    // -----------------------------------------------------------------------
    // Save & Enable
    // -----------------------------------------------------------------------
    const handleSave = useCallback(() => {
      if (!protocol) return;
      setIsSaving(true);
      const config = protocol === 'saml' ? samlConfig : oidcConfig;
      onSave(protocol, config);
      setIsSaving(false);
    }, [protocol, samlConfig, oidcConfig, onSave]);

    // -----------------------------------------------------------------------
    // Render step content
    // -----------------------------------------------------------------------
    const renderStepContent = () => {
      switch (step) {
        case 1:
          return <ProtocolChooser selected={protocol} onSelect={handleProtocolSelect} />;
        case 2:
          return protocol === 'saml' ? (
            <SAMLConfigForm config={samlConfig} onChange={setSamlConfig} />
          ) : (
            <OIDCConfigForm config={oidcConfig} onChange={setOidcConfig} />
          );
        case 3:
          return protocol === 'saml' ? (
            <SAMLSPMetadata acsUrl={acsUrl} onDownloadMetadata={onDownloadSPMetadata} />
          ) : (
            <OIDCRedirectURI redirectUri={redirectUri} />
          );
        case 4:
          return (
            <TestConnection
              protocol={protocol!}
              onTest={handleTest}
              testResult={testResult}
              isTesting={isTesting}
            />
          );
        default:
          return null;
      }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div className="flex flex-col h-full" role="form" aria-label="SSO Configuration Wizard">
        {/* Step indicator */}
        <StepIndicator currentStep={step} steps={steps} />

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-6" />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-black/20">
          <button
            className="px-4 py-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handleBack}
            disabled={step === 1}
            aria-label="Go to previous step"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {step === 4 && testResult?.success && (
              <button
                className={`
                  px-5 py-2 rounded-md text-[11px] font-bold border transition-all
                  ${isSaving
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 cursor-wait'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  }
                `}
                onClick={handleSave}
                disabled={isSaving}
                aria-label="Save and enable SSO configuration"
              >
                {isSaving ? 'Saving...' : 'Save & Enable'}
              </button>
            )}
            {step < 4 && (
              <button
                className="px-5 py-2 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={handleNext}
                disabled={!canProceed}
                aria-label="Go to next step"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default SSOConfigWizard;
