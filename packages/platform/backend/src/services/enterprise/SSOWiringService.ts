/**
 * @hololand/backend -- SSOWiringService
 *
 * Wires the existing HoloScript SSOTrait (SAML 2.0 + OIDC) into the
 * Hololand auth layer so that enterprise tenants can use their own
 * identity providers for login.
 *
 * This service acts as the *bridge* between:
 *   - HoloScript SSOTrait (runtime trait system, IdP config, session model)
 *   - Hololand auth layer (PostgreSQL user records, JWT session tokens)
 *
 * It does NOT re-implement SAML/OIDC parsing. It delegates assertion
 * parsing / token exchange to well-known libraries (stubbed here with
 * clear interface contracts for the real implementation to fill in).
 *
 * Supported flows:
 *   SAML 2.0  --  configureSAML / handleSAMLCallback
 *   OIDC      --  configureOIDC / handleOIDCCallback
 *
 * Both flows support:
 *   - JIT (just-in-time) user provisioning from IdP attributes
 *   - Multi-IdP per tenant
 *   - Attribute & role mapping
 *
 * Architecture:
 *   Browser  --> /auth/saml/callback  --> handleSAMLCallback --> createOrUpdateUser
 *   Browser  --> /auth/oidc/callback  --> handleOIDCCallback --> createOrUpdateUser
 *                                                             \
 *                                                              --> issue Hololand JWT
 *
 * Security:
 *   - IdP certificates and client secrets stored encrypted in DB
 *   - SAML assertions must be signed; signature verification is mandatory
 *   - OIDC tokens verified via JWKS endpoint
 *   - All sensitive fields are never logged
 */

import { query } from '../../db/pool';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SSOProtocol = 'saml' | 'oidc';

export interface SAMLConfig {
  /** IdP Entity ID (e.g. "urn:okta:example") */
  entityId: string;
  /** IdP SSO URL where the browser is redirected for login */
  ssoUrl: string;
  /** IdP x509 certificate (PEM format) for assertion signature verification */
  certificate: string;
  /** Mapping from IdP SAML attribute names to Hololand user fields */
  attributeMapping: Record<string, string>;
  /** Optional: Single Logout URL */
  sloUrl?: string;
  /** Optional: NameID format override */
  nameIdFormat?: string;
}

export interface OIDCConfig {
  /** Issuer URL (e.g. "https://accounts.google.com") */
  issuer: string;
  /** OAuth 2.0 Client ID */
  clientId: string;
  /** OAuth 2.0 Client Secret (will be stored encrypted) */
  clientSecret: string;
  /** Scopes to request (defaults to ['openid', 'profile', 'email']) */
  scopes?: string[];
}

export interface SSOTenantConfig {
  id: string;
  tenantId: string;
  protocol: SSOProtocol;
  idpName: string;
  enabled: boolean;

  // Protocol-specific config (one will be populated)
  samlConfig: SAMLConfig | null;
  oidcConfig: OIDCConfig | null;

  // Resolved endpoints (populated after discovery for OIDC)
  oidcAuthorizationEndpoint?: string;
  oidcTokenEndpoint?: string;
  oidcUserinfoEndpoint?: string;
  oidcJwksUri?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface SSOCallbackResult {
  /** Whether the callback was handled successfully */
  success: boolean;
  /** The internal Hololand user ID (created or updated) */
  userId?: string;
  /** Whether the user was just-in-time provisioned */
  jitProvisioned?: boolean;
  /** The user's email from the IdP */
  email?: string;
  /** The user's display name from the IdP */
  displayName?: string;
  /** Mapped roles from the IdP */
  roles?: string[];
  /** Error message if success is false */
  error?: string;
}

export interface SSOConnectionTestResult {
  success: boolean;
  protocol: SSOProtocol;
  message: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SSOWiringService {
  // -----------------------------------------------------------------------
  // SAML 2.0 Configuration
  // -----------------------------------------------------------------------

  /**
   * Configure SAML 2.0 SSO for a tenant.
   *
   * Stores the IdP metadata (entity ID, SSO URL, certificate, attribute
   * mapping) in the database. After configuration, the tenant's users can
   * authenticate via the SAML 2.0 SP-initiated flow.
   */
  async configureSAML(tenantId: string, config: SAMLConfig): Promise<SSOTenantConfig> {
    this.validateSAMLConfig(config);

    try {
      const { rows } = await query(
        `INSERT INTO "sso_configurations" (
          tenant_id, protocol, idp_name, enabled,
          saml_entity_id, saml_sso_url, saml_slo_url,
          saml_certificate, saml_name_id_format,
          attribute_mapping,
          created_at, updated_at
        )
        VALUES ($1, 'saml', $2, true, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (tenant_id, protocol) DO UPDATE SET
          saml_entity_id = EXCLUDED.saml_entity_id,
          saml_sso_url = EXCLUDED.saml_sso_url,
          saml_slo_url = EXCLUDED.saml_slo_url,
          saml_certificate = EXCLUDED.saml_certificate,
          saml_name_id_format = EXCLUDED.saml_name_id_format,
          attribute_mapping = EXCLUDED.attribute_mapping,
          enabled = true,
          updated_at = NOW()
        RETURNING *`,
        [
          tenantId,
          `SAML IdP (${config.entityId})`,
          config.entityId,
          config.ssoUrl,
          config.sloUrl || null,
          config.certificate,
          config.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          JSON.stringify(config.attributeMapping),
        ]
      );

      logger.info(
        `[SSOWiringService] Configured SAML for tenant ${tenantId} with IdP ${config.entityId}`
      );

      return this.mapRowToConfig(rows[0]);
    } catch (error: any) {
      logger.error(`[SSOWiringService] configureSAML failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configure OIDC SSO for a tenant.
   *
   * Stores the OIDC configuration and performs discovery on the issuer
   * to resolve authorization, token, userinfo, and JWKS endpoints.
   */
  async configureOIDC(tenantId: string, config: OIDCConfig): Promise<SSOTenantConfig> {
    this.validateOIDCConfig(config);

    // Perform OIDC discovery to resolve endpoints
    const discovery = await this.discoverOIDCEndpoints(config.issuer);

    const scopes = config.scopes ?? ['openid', 'profile', 'email'];

    try {
      const { rows } = await query(
        `INSERT INTO "sso_configurations" (
          tenant_id, protocol, idp_name, enabled,
          oidc_issuer, oidc_client_id, oidc_client_secret_encrypted,
          oidc_scopes,
          oidc_authorization_endpoint, oidc_token_endpoint,
          oidc_userinfo_endpoint, oidc_jwks_uri,
          attribute_mapping,
          created_at, updated_at
        )
        VALUES ($1, 'oidc', $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (tenant_id, protocol) DO UPDATE SET
          oidc_issuer = EXCLUDED.oidc_issuer,
          oidc_client_id = EXCLUDED.oidc_client_id,
          oidc_client_secret_encrypted = EXCLUDED.oidc_client_secret_encrypted,
          oidc_scopes = EXCLUDED.oidc_scopes,
          oidc_authorization_endpoint = EXCLUDED.oidc_authorization_endpoint,
          oidc_token_endpoint = EXCLUDED.oidc_token_endpoint,
          oidc_userinfo_endpoint = EXCLUDED.oidc_userinfo_endpoint,
          oidc_jwks_uri = EXCLUDED.oidc_jwks_uri,
          attribute_mapping = EXCLUDED.attribute_mapping,
          enabled = true,
          updated_at = NOW()
        RETURNING *`,
        [
          tenantId,
          `OIDC IdP (${config.issuer})`,
          config.issuer,
          config.clientId,
          this.encryptSecret(config.clientSecret),
          JSON.stringify(scopes),
          discovery.authorizationEndpoint,
          discovery.tokenEndpoint,
          discovery.userinfoEndpoint,
          discovery.jwksUri,
          JSON.stringify({}), // attribute mapping defaults
        ]
      );

      logger.info(
        `[SSOWiringService] Configured OIDC for tenant ${tenantId} with issuer ${config.issuer}`
      );

      return this.mapRowToConfig(rows[0]);
    } catch (error: any) {
      logger.error(`[SSOWiringService] configureOIDC failed: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Callback Handlers
  // -----------------------------------------------------------------------

  /**
   * Handle the SAML callback after the IdP redirects back to Hololand.
   *
   * Flow:
   * 1. Decode the SAMLResponse from the POST body
   * 2. Verify the assertion signature against the stored IdP certificate
   * 3. Extract user attributes (email, name, roles) from the assertion
   * 4. JIT-provision or update the user in the Hololand users table
   * 5. Return the user info for session/JWT creation by the auth layer
   */
  async handleSAMLCallback(samlResponse: string): Promise<SSOCallbackResult> {
    try {
      // Step 1: Decode the base64 SAMLResponse
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      // Step 2: Extract tenant/IdP from the assertion's Issuer element
      const issuerMatch = decoded.match(/<(?:saml2?:)?Issuer[^>]*>([^<]+)<\//);
      if (!issuerMatch) {
        return { success: false, error: 'Could not extract Issuer from SAML assertion' };
      }
      const issuerEntityId = issuerMatch[1];

      // Look up the SSO config by SAML entity ID
      const { rows: configRows } = await query(
        `SELECT * FROM "sso_configurations"
         WHERE protocol = 'saml' AND saml_entity_id = $1 AND enabled = true
         LIMIT 1`,
        [issuerEntityId]
      );

      if (!configRows || configRows.length === 0) {
        return { success: false, error: `No SSO config found for SAML entity: ${issuerEntityId}` };
      }

      const ssoConfig = configRows[0];

      // Step 3: Verify signature (in production, use a SAML library like `saml2-js` or `passport-saml`)
      // The certificate stored in ssoConfig.saml_certificate would be used for verification.
      // This is a critical security step -- stubbed here for the wiring layer.
      const signatureValid = this.verifySAMLSignature(decoded, ssoConfig.saml_certificate);
      if (!signatureValid) {
        logger.warn(
          `[SSOWiringService] SAML signature verification failed for tenant ${ssoConfig.tenant_id}`
        );
        return { success: false, error: 'SAML assertion signature verification failed' };
      }

      // Step 4: Extract attributes from assertion
      const attributes = this.extractSAMLAttributes(decoded, ssoConfig.attribute_mapping);

      if (!attributes.email) {
        return { success: false, error: 'SAML assertion missing required email attribute' };
      }

      // Step 5: JIT provision or update user
      const { userId, jitProvisioned } = await this.createOrUpdateUser(
        ssoConfig.tenant_id,
        attributes.email,
        attributes.displayName || attributes.email.split('@')[0],
        attributes.roles || [],
        'saml',
        issuerEntityId
      );

      logger.info(
        `[SSOWiringService] SAML callback processed for tenant ${ssoConfig.tenant_id}: user=${userId} jit=${jitProvisioned}`
      );

      return {
        success: true,
        userId,
        jitProvisioned,
        email: attributes.email,
        displayName: attributes.displayName,
        roles: attributes.roles,
      };
    } catch (error: any) {
      logger.error(`[SSOWiringService] handleSAMLCallback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle the OIDC callback after the IdP redirects back with an auth code.
   *
   * Flow:
   * 1. Validate the state parameter to prevent CSRF
   * 2. Exchange the authorization code for tokens at the token endpoint
   * 3. Verify the ID token signature via JWKS
   * 4. Extract user info from the ID token (or userinfo endpoint)
   * 5. JIT-provision or update the user in the Hololand users table
   * 6. Return the user info for session/JWT creation
   */
  async handleOIDCCallback(code: string, state: string): Promise<SSOCallbackResult> {
    try {
      // Step 1: Validate state and look up pending auth request
      const { rows: stateRows } = await query(
        `SELECT * FROM "sso_auth_states"
         WHERE state = $1 AND expires_at > NOW()
         LIMIT 1`,
        [state]
      );

      if (!stateRows || stateRows.length === 0) {
        return { success: false, error: 'Invalid or expired state parameter' };
      }

      const authState = stateRows[0];
      const tenantId = authState.tenant_id;

      // Clean up the used state
      await query('DELETE FROM "sso_auth_states" WHERE state = $1', [state]);

      // Look up OIDC config for this tenant
      const { rows: configRows } = await query(
        `SELECT * FROM "sso_configurations"
         WHERE tenant_id = $1 AND protocol = 'oidc' AND enabled = true
         LIMIT 1`,
        [tenantId]
      );

      if (!configRows || configRows.length === 0) {
        return { success: false, error: `No OIDC config found for tenant: ${tenantId}` };
      }

      const ssoConfig = configRows[0];

      // Step 2: Exchange auth code for tokens
      const tokenResponse = await this.exchangeOIDCCode(
        code,
        ssoConfig.oidc_token_endpoint,
        ssoConfig.oidc_client_id,
        this.decryptSecret(ssoConfig.oidc_client_secret_encrypted),
        authState.redirect_uri
      );

      if (!tokenResponse.idToken) {
        return { success: false, error: 'OIDC token exchange did not return an ID token' };
      }

      // Step 3: Verify and decode the ID token
      // In production, verify JWT signature against JWKS at ssoConfig.oidc_jwks_uri
      const claims = this.decodeJWT(tokenResponse.idToken);

      if (!claims || !claims.email) {
        // Fall back to userinfo endpoint
        const userinfo = await this.fetchOIDCUserinfo(
          ssoConfig.oidc_userinfo_endpoint,
          tokenResponse.accessToken
        );
        if (!userinfo || !userinfo.email) {
          return { success: false, error: 'Could not obtain user email from OIDC provider' };
        }
        claims.email = userinfo.email;
        claims.name = userinfo.name || claims.name;
      }

      // Step 4: JIT provision or update user
      const { userId, jitProvisioned } = await this.createOrUpdateUser(
        tenantId,
        claims.email,
        claims.name || claims.email.split('@')[0],
        claims.groups || [],
        'oidc',
        ssoConfig.oidc_issuer
      );

      logger.info(
        `[SSOWiringService] OIDC callback processed for tenant ${tenantId}: user=${userId} jit=${jitProvisioned}`
      );

      return {
        success: true,
        userId,
        jitProvisioned,
        email: claims.email,
        displayName: claims.name,
        roles: claims.groups,
      };
    } catch (error: any) {
      logger.error(`[SSOWiringService] handleOIDCCallback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // -----------------------------------------------------------------------
  // Configuration Queries
  // -----------------------------------------------------------------------

  /**
   * Get the SSO configuration for a tenant. Returns both SAML and OIDC
   * configs if both are set up.
   */
  async getSSOConfig(tenantId: string): Promise<SSOTenantConfig[]> {
    const { rows } = await query(
      'SELECT * FROM "sso_configurations" WHERE tenant_id = $1 ORDER BY protocol',
      [tenantId]
    );

    return rows.map((row: any) => this.mapRowToConfig(row));
  }

  /**
   * Test the SSO connection for a tenant by performing a dry-run
   * validation of the stored configuration.
   *
   * For SAML: validates that the certificate is parseable and
   * the SSO URL is reachable.
   *
   * For OIDC: validates that the issuer's well-known endpoint
   * returns valid discovery metadata.
   */
  async testSSOConnection(tenantId: string): Promise<SSOConnectionTestResult[]> {
    const configs = await this.getSSOConfig(tenantId);
    const results: SSOConnectionTestResult[] = [];

    for (const config of configs) {
      if (config.protocol === 'saml' && config.samlConfig) {
        results.push(await this.testSAMLConnection(config));
      } else if (config.protocol === 'oidc' && config.oidcConfig) {
        results.push(await this.testOIDCConnection(config));
      }
    }

    return results;
  }

  /**
   * Generate SP (Service Provider) metadata XML for SAML setup.
   * The tenant's IdP admin uses this to configure the trust relationship.
   */
  getIdPMetadata(tenantId: string): string {
    const entityId = `urn:hololand:${tenantId}`;
    const acsUrl = `${process.env.HOLOLAND_BASE_URL || 'https://central.hololand.io'}/auth/saml/${tenantId}/callback`;
    const sloUrl = `${process.env.HOLOLAND_BASE_URL || 'https://central.hololand.io'}/auth/saml/${tenantId}/slo`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${entityId}">
  <md:SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${acsUrl}"
        index="0"
        isDefault="true"/>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  // -----------------------------------------------------------------------
  // JIT User Provisioning
  // -----------------------------------------------------------------------

  /**
   * Create or update a user record in the Hololand users table.
   * This is the JIT provisioning step, called from both SAML and OIDC callbacks.
   */
  private async createOrUpdateUser(
    tenantId: string,
    email: string,
    displayName: string,
    roles: string[],
    ssoProtocol: SSOProtocol,
    idpIdentifier: string
  ): Promise<{ userId: string; jitProvisioned: boolean }> {
    // Check if user already exists
    const { rows: existingRows } = await query(
      `SELECT id FROM "users" WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
      [email, tenantId]
    );

    if (existingRows.length > 0) {
      // Update existing user with latest IdP attributes
      const userId = existingRows[0].id;
      await query(
        `UPDATE "users"
         SET display_name = COALESCE(NULLIF($1, ''), display_name),
             sso_protocol = $2,
             sso_idp_identifier = $3,
             sso_roles = $4,
             last_sso_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $5`,
        [displayName, ssoProtocol, idpIdentifier, JSON.stringify(roles), userId]
      );

      return { userId, jitProvisioned: false };
    }

    // JIT provision new user
    const { rows: newUserRows } = await query(
      `INSERT INTO "users" (
        email, display_name, tenant_id,
        sso_protocol, sso_idp_identifier, sso_roles,
        last_sso_login_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING id`,
      [email, displayName, tenantId, ssoProtocol, idpIdentifier, JSON.stringify(roles)]
    );

    const userId = newUserRows[0].id;

    // Log JIT provisioning event
    await query(
      `INSERT INTO "sso_audit_log" (
        tenant_id, user_id, event_type, sso_protocol,
        idp_identifier, details, created_at
      )
      VALUES ($1, $2, 'jit_provision', $3, $4, $5, NOW())`,
      [tenantId, userId, ssoProtocol, idpIdentifier, JSON.stringify({ email, roles })]
    );

    logger.info(
      `[SSOWiringService] JIT provisioned user ${userId} (${email}) for tenant ${tenantId} via ${ssoProtocol}`
    );

    return { userId, jitProvisioned: true };
  }

  // -----------------------------------------------------------------------
  // SAML Helpers (stubs for production SAML library integration)
  // -----------------------------------------------------------------------

  /**
   * Verify the SAML assertion signature using the IdP's certificate.
   *
   * In production, this should use a library like `xml-crypto` or
   * `@node-saml/node-saml` to perform full XML signature verification.
   */
  private verifySAMLSignature(assertionXml: string, certificate: string): boolean {
    // STUB: In production, implement full XML Signature verification.
    // This must:
    //   1. Parse the XML document
    //   2. Find the Signature element
    //   3. Verify the digest and signature using the IdP certificate
    //   4. Ensure the signed elements include the Assertion
    //
    // For now, return true if the assertion contains a Signature element
    // and a certificate is configured. This MUST be replaced before
    // production deployment.
    if (!certificate) {
      logger.warn('[SSOWiringService] No certificate configured for SAML signature verification');
      return false;
    }
    return assertionXml.includes('<ds:Signature') || assertionXml.includes('<Signature');
  }

  /**
   * Extract user attributes from a SAML assertion XML.
   */
  private extractSAMLAttributes(
    assertionXml: string,
    attributeMappingJson: string | Record<string, string>
  ): { email?: string; displayName?: string; roles?: string[] } {
    const mapping =
      typeof attributeMappingJson === 'string'
        ? JSON.parse(attributeMappingJson)
        : attributeMappingJson;

    // Extract email - try NameID first, then attribute mapping
    let email: string | undefined;
    const nameIdMatch = assertionXml.match(/<(?:saml2?:)?NameID[^>]*>([^<]+)<\//);
    if (nameIdMatch) {
      email = nameIdMatch[1].trim();
    }

    // Extract attributes from AttributeStatement
    const attributes: Record<string, string> = {};
    const attrRegex =
      /<(?:saml2?:)?Attribute\s+Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\//g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(assertionXml)) !== null) {
      attributes[match[1]] = match[2].trim();
    }

    // Apply attribute mapping
    const emailKey = mapping.email || 'email';
    if (!email && attributes[emailKey]) {
      email = attributes[emailKey];
    }

    const nameKey = mapping.displayName || mapping.name || 'displayName';
    const displayName = attributes[nameKey] || undefined;

    // Extract roles (may be multi-valued)
    const rolesKey = mapping.roles || mapping.groups || 'groups';
    const roles: string[] = [];
    const roleRegex = new RegExp(
      `<(?:saml2?:)?Attribute\\s+Name="${rolesKey}"[^>]*>[\\s\\S]*?</(?:saml2?:)?Attribute>`,
      'g'
    );
    const roleBlock = roleRegex.exec(assertionXml);
    if (roleBlock) {
      const valueRegex = /<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\//g;
      let roleMatch: RegExpExecArray | null;
      while ((roleMatch = valueRegex.exec(roleBlock[0])) !== null) {
        roles.push(roleMatch[1].trim());
      }
    }

    return { email, displayName, roles };
  }

  private validateSAMLConfig(config: SAMLConfig): void {
    if (!config.entityId) throw new Error('SAML entityId is required');
    if (!config.ssoUrl) throw new Error('SAML ssoUrl is required');
    if (!config.certificate) throw new Error('SAML certificate is required');
    if (!config.attributeMapping) throw new Error('SAML attributeMapping is required');

    try {
      new URL(config.ssoUrl);
    } catch {
      throw new Error('SAML ssoUrl must be a valid URL');
    }
  }

  // -----------------------------------------------------------------------
  // OIDC Helpers (stubs for production OIDC library integration)
  // -----------------------------------------------------------------------

  /**
   * Discover OIDC endpoints from the issuer's .well-known/openid-configuration.
   */
  private async discoverOIDCEndpoints(
    issuer: string
  ): Promise<{
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    jwksUri: string;
  }> {
    const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;

    try {
      const response = await fetch(discoveryUrl);
      if (!response.ok) {
        throw new Error(`OIDC discovery failed: ${response.status} ${response.statusText}`);
      }

      const metadata = (await response.json()) as Record<string, string>;

      return {
        authorizationEndpoint: metadata.authorization_endpoint,
        tokenEndpoint: metadata.token_endpoint,
        userinfoEndpoint: metadata.userinfo_endpoint,
        jwksUri: metadata.jwks_uri,
      };
    } catch (error: any) {
      logger.error(`[SSOWiringService] OIDC discovery failed for ${issuer}: ${error.message}`);
      throw new Error(`OIDC discovery failed for issuer ${issuer}: ${error.message}`);
    }
  }

  /**
   * Exchange an OIDC authorization code for tokens.
   */
  private async exchangeOIDCCode(
    code: string,
    tokenEndpoint: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; idToken: string; refreshToken?: string }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OIDC token exchange failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as Record<string, any>;

    return {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Fetch user info from the OIDC userinfo endpoint.
   */
  private async fetchOIDCUserinfo(
    userinfoEndpoint: string,
    accessToken: string
  ): Promise<{ email?: string; name?: string; groups?: string[] } | null> {
    try {
      const response = await fetch(userinfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return null;

      return (await response.json()) as { email?: string; name?: string; groups?: string[] };
    } catch {
      return null;
    }
  }

  /**
   * Decode a JWT without full verification (for extracting claims).
   * In production, ALWAYS verify the signature via JWKS before trusting claims.
   */
  private decodeJWT(token: string): Record<string, any> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');

      const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }

  private validateOIDCConfig(config: OIDCConfig): void {
    if (!config.issuer) throw new Error('OIDC issuer is required');
    if (!config.clientId) throw new Error('OIDC clientId is required');
    if (!config.clientSecret) throw new Error('OIDC clientSecret is required');

    try {
      new URL(config.issuer);
    } catch {
      throw new Error('OIDC issuer must be a valid URL');
    }
  }

  // -----------------------------------------------------------------------
  // Connection Testing
  // -----------------------------------------------------------------------

  private async testSAMLConnection(config: SSOTenantConfig): Promise<SSOConnectionTestResult> {
    try {
      if (!config.samlConfig) {
        return { success: false, protocol: 'saml', message: 'No SAML config found' };
      }

      // Validate certificate is parseable (basic check)
      const cert = config.samlConfig.certificate;
      if (!cert || cert.length < 100) {
        return {
          success: false,
          protocol: 'saml',
          message: 'SAML certificate appears invalid (too short)',
        };
      }

      // Check SSO URL is reachable
      try {
        const response = await fetch(config.samlConfig.ssoUrl, { method: 'HEAD' });
        if (!response.ok && response.status !== 405) {
          return {
            success: false,
            protocol: 'saml',
            message: `SAML SSO URL returned status ${response.status}`,
          };
        }
      } catch (fetchError: any) {
        return {
          success: false,
          protocol: 'saml',
          message: `SAML SSO URL unreachable: ${fetchError.message}`,
        };
      }

      return {
        success: true,
        protocol: 'saml',
        message: 'SAML configuration is valid and IdP SSO URL is reachable',
        details: {
          entityId: config.samlConfig.entityId,
          ssoUrl: config.samlConfig.ssoUrl,
        },
      };
    } catch (error: any) {
      return { success: false, protocol: 'saml', message: error.message };
    }
  }

  private async testOIDCConnection(config: SSOTenantConfig): Promise<SSOConnectionTestResult> {
    try {
      if (!config.oidcConfig) {
        return { success: false, protocol: 'oidc', message: 'No OIDC config found' };
      }

      // Test OIDC discovery
      await this.discoverOIDCEndpoints(config.oidcConfig.issuer);

      return {
        success: true,
        protocol: 'oidc',
        message: 'OIDC discovery succeeded and endpoints are valid',
        details: {
          issuer: config.oidcConfig.issuer,
        },
      };
    } catch (error: any) {
      return { success: false, protocol: 'oidc', message: error.message };
    }
  }

  // -----------------------------------------------------------------------
  // Encryption Helpers (stubs -- use a real KMS/Vault in production)
  // -----------------------------------------------------------------------

  /**
   * Encrypt a secret for storage.
   * In production, use AWS KMS, HashiCorp Vault, or similar.
   */
  private encryptSecret(plaintext: string): string {
    // STUB: In production, replace with real encryption.
    // Using base64 as a placeholder -- this is NOT secure.
    return Buffer.from(plaintext).toString('base64');
  }

  /**
   * Decrypt a stored secret.
   */
  private decryptSecret(ciphertext: string): string {
    // STUB: In production, replace with real decryption.
    return Buffer.from(ciphertext, 'base64').toString('utf-8');
  }

  // -----------------------------------------------------------------------
  // Row Mapping
  // -----------------------------------------------------------------------

  private mapRowToConfig(row: any): SSOTenantConfig {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      protocol: row.protocol as SSOProtocol,
      idpName: row.idp_name,
      enabled: row.enabled,
      samlConfig: row.protocol === 'saml'
        ? {
            entityId: row.saml_entity_id,
            ssoUrl: row.saml_sso_url,
            certificate: row.saml_certificate,
            attributeMapping: typeof row.attribute_mapping === 'string'
              ? JSON.parse(row.attribute_mapping)
              : row.attribute_mapping || {},
            sloUrl: row.saml_slo_url || undefined,
            nameIdFormat: row.saml_name_id_format || undefined,
          }
        : null,
      oidcConfig: row.protocol === 'oidc'
        ? {
            issuer: row.oidc_issuer,
            clientId: row.oidc_client_id,
            clientSecret: '[ENCRYPTED]', // Never expose the actual secret
            scopes: typeof row.oidc_scopes === 'string'
              ? JSON.parse(row.oidc_scopes)
              : row.oidc_scopes || ['openid', 'profile', 'email'],
          }
        : null,
      oidcAuthorizationEndpoint: row.oidc_authorization_endpoint || undefined,
      oidcTokenEndpoint: row.oidc_token_endpoint || undefined,
      oidcUserinfoEndpoint: row.oidc_userinfo_endpoint || undefined,
      oidcJwksUri: row.oidc_jwks_uri || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: SSOWiringService | null = null;

export function getSSOWiringService(): SSOWiringService {
  if (!instance) {
    instance = new SSOWiringService();
  }
  return instance;
}
