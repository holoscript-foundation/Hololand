/**
 * @hololand/backend -- CustomDomainService
 *
 * Custom domain management for enterprise tenants, enabling them to
 * serve their Hololand spaces under their own branded domain
 * (e.g. `vr.acmecorp.com` instead of `acmecorp.hololand.io`).
 *
 * Lifecycle:
 *   1. addDomain()        -- Tenant registers a custom domain
 *   2. verifyDomain()     -- DNS TXT record is checked for ownership proof
 *   3. provisionSSL()     -- TLS certificate is provisioned (Let's Encrypt ACME)
 *   4. getDomainStatus()  -- Returns current verification / SSL state
 *   5. removeDomain()     -- Tears down domain mapping
 *
 * DNS Verification:
 *   A unique TXT record value is generated per domain. The tenant adds
 *   `_hololand-verify.domain.com  TXT  hololand-verify=<token>`
 *   to their DNS. The service polls DNS for up to 48 hours.
 *
 * SSL Provisioning:
 *   Stubs the Let's Encrypt ACME HTTP-01 challenge flow. In production
 *   this would integrate with a reverse proxy (Caddy, Nginx, Cloudflare)
 *   to serve the challenge token and install the certificate.
 *
 * Domain Routing:
 *   Stores a tenant-to-domain mapping consumed by the reverse proxy
 *   configuration to route incoming traffic to the correct tenant.
 *
 * Architecture:
 *   Tenant UI  -->  addDomain()        -->  DB (pending)
 *   Cron job   -->  verifyDomain()     -->  DNS lookup
 *                   provisionSSL()     -->  ACME stub
 *   Rev proxy  <--  getDomainStatus()  <--  DB (active)
 *
 * Security:
 *   - Domain ownership is proven via DNS TXT records (not just CNAME)
 *   - Verification tokens are cryptographically random
 *   - SSL provisioning uses ACME challenge -- no wildcards or manual certs
 *   - Removed domains are immediately delisted from routing
 */

import { randomBytes } from 'crypto';
import { query } from '../../db/pool';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DomainStatus =
  | 'pending_verification'
  | 'verification_failed'
  | 'verified'
  | 'provisioning_ssl'
  | 'ssl_failed'
  | 'active'
  | 'removed';

export interface CustomDomain {
  id: string;
  tenantId: string;
  domain: string;
  status: DomainStatus;
  /** The TXT record value the tenant must set in their DNS. */
  verificationToken: string;
  /** The full TXT record name (e.g. "_hololand-verify.example.com"). */
  verificationDnsName: string;
  /** When verification was first attempted. */
  verificationStartedAt: Date | null;
  /** When verification succeeded. */
  verifiedAt: Date | null;
  /** When SSL was provisioned. */
  sslProvisionedAt: Date | null;
  /** SSL certificate expiry. */
  sslExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainVerificationResult {
  verified: boolean;
  domain: string;
  expectedTxtRecord: string;
  foundTxtRecords: string[];
  message: string;
}

export interface SSLProvisionResult {
  success: boolean;
  domain: string;
  message: string;
  expiresAt?: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum time to wait for DNS verification before marking as failed. */
const MAX_VERIFICATION_HOURS = 48;

/** TXT record prefix for domain verification. */
const VERIFICATION_PREFIX = '_hololand-verify';

/** Token prefix for easy identification in DNS records. */
const TOKEN_PREFIX = 'hololand-verify=';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CustomDomainService {
  // -----------------------------------------------------------------------
  // Domain Registration
  // -----------------------------------------------------------------------

  /**
   * Register a custom domain for a tenant.
   *
   * Generates a unique verification token and stores the domain
   * in `pending_verification` status. The tenant must add a TXT
   * record to their DNS before calling `verifyDomain()`.
   */
  async addDomain(tenantId: string, domain: string): Promise<CustomDomain> {
    this.validateDomain(domain);

    // Check for existing domain (any tenant)
    const { rows: existing } = await query(
      `SELECT * FROM "custom_domains" WHERE domain = $1 AND status != 'removed' LIMIT 1`,
      [domain.toLowerCase()]
    );

    if (existing.length > 0) {
      if (existing[0].tenant_id === tenantId) {
        // Same tenant re-adding -- return existing
        return this.mapRowToDomain(existing[0]);
      }
      throw new Error(`Domain ${domain} is already registered by another tenant.`);
    }

    const verificationToken = this.generateVerificationToken();
    const normalizedDomain = domain.toLowerCase().trim();
    const verificationDnsName = `${VERIFICATION_PREFIX}.${normalizedDomain}`;

    try {
      const { rows } = await query(
        `INSERT INTO "custom_domains" (
          tenant_id, domain, status, verification_token,
          verification_dns_name, created_at, updated_at
        )
        VALUES ($1, $2, 'pending_verification', $3, $4, NOW(), NOW())
        RETURNING *`,
        [tenantId, normalizedDomain, verificationToken, verificationDnsName]
      );

      logger.info(
        `[CustomDomainService] Domain ${normalizedDomain} added for tenant ${tenantId}. Verification TXT: ${verificationDnsName} = ${TOKEN_PREFIX}${verificationToken}`
      );

      return this.mapRowToDomain(rows[0]);
    } catch (error: any) {
      logger.error(`[CustomDomainService] addDomain failed: ${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // DNS Verification
  // -----------------------------------------------------------------------

  /**
   * Verify domain ownership by checking for the expected TXT record in DNS.
   *
   * Uses Node.js `dns` module (via dynamic import) to perform the lookup.
   * Returns the verification result including which TXT records were found.
   */
  async verifyDomain(tenantId: string, domain: string): Promise<DomainVerificationResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Look up the domain record
    const { rows } = await query(
      `SELECT * FROM "custom_domains"
       WHERE tenant_id = $1 AND domain = $2 AND status != 'removed'
       LIMIT 1`,
      [tenantId, normalizedDomain]
    );

    if (!rows || rows.length === 0) {
      return {
        verified: false,
        domain: normalizedDomain,
        expectedTxtRecord: '',
        foundTxtRecords: [],
        message: 'Domain not found. Call addDomain() first.',
      };
    }

    const domainRecord = rows[0];
    const expectedValue = `${TOKEN_PREFIX}${domainRecord.verification_token}`;
    const verificationDnsName = domainRecord.verification_dns_name;

    // Check if verification has expired
    if (domainRecord.verification_started_at) {
      const startedAt = new Date(domainRecord.verification_started_at);
      const hoursElapsed = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed > MAX_VERIFICATION_HOURS) {
        await query(
          `UPDATE "custom_domains"
           SET status = 'verification_failed', updated_at = NOW()
           WHERE id = $1`,
          [domainRecord.id]
        );
        return {
          verified: false,
          domain: normalizedDomain,
          expectedTxtRecord: expectedValue,
          foundTxtRecords: [],
          message: `Verification expired after ${MAX_VERIFICATION_HOURS} hours. Please remove and re-add the domain.`,
        };
      }
    } else {
      // Mark verification start time
      await query(
        `UPDATE "custom_domains"
         SET verification_started_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [domainRecord.id]
      );
    }

    // Perform DNS TXT lookup
    const foundRecords = await this.lookupTxtRecords(verificationDnsName);

    const isVerified = foundRecords.some((record) =>
      record.includes(expectedValue)
    );

    if (isVerified) {
      await query(
        `UPDATE "custom_domains"
         SET status = 'verified', verified_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [domainRecord.id]
      );

      logger.info(
        `[CustomDomainService] Domain ${normalizedDomain} verified for tenant ${tenantId}`
      );

      return {
        verified: true,
        domain: normalizedDomain,
        expectedTxtRecord: expectedValue,
        foundTxtRecords: foundRecords,
        message: 'Domain ownership verified successfully.',
      };
    }

    return {
      verified: false,
      domain: normalizedDomain,
      expectedTxtRecord: expectedValue,
      foundTxtRecords: foundRecords,
      message: `Expected TXT record not found. Add "${verificationDnsName}" TXT "${expectedValue}" to your DNS.`,
    };
  }

  // -----------------------------------------------------------------------
  // SSL Provisioning
  // -----------------------------------------------------------------------

  /**
   * Provision an SSL/TLS certificate for a verified domain.
   *
   * This stubs the Let's Encrypt ACME HTTP-01 challenge flow.
   * In production, this would:
   *   1. Create an ACME order for the domain
   *   2. Serve the HTTP-01 challenge token via the reverse proxy
   *   3. Finalize the order and download the certificate
   *   4. Install the certificate in the reverse proxy configuration
   *
   * Prerequisites: Domain must be in 'verified' status.
   */
  async provisionSSL(tenantId: string, domain: string): Promise<SSLProvisionResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    const { rows } = await query(
      `SELECT * FROM "custom_domains"
       WHERE tenant_id = $1 AND domain = $2 AND status = 'verified'
       LIMIT 1`,
      [tenantId, normalizedDomain]
    );

    if (!rows || rows.length === 0) {
      return {
        success: false,
        domain: normalizedDomain,
        message: 'Domain must be verified before SSL provisioning. Current status is not "verified".',
      };
    }

    const domainRecord = rows[0];

    try {
      // Update status to provisioning
      await query(
        `UPDATE "custom_domains"
         SET status = 'provisioning_ssl', updated_at = NOW()
         WHERE id = $1`,
        [domainRecord.id]
      );

      // ACME challenge stub
      // In production: integrate with Let's Encrypt / Caddy / cert-manager
      const acmeResult = await this.performACMEChallenge(normalizedDomain);

      if (!acmeResult.success) {
        await query(
          `UPDATE "custom_domains"
           SET status = 'ssl_failed', updated_at = NOW()
           WHERE id = $1`,
          [domainRecord.id]
        );

        return {
          success: false,
          domain: normalizedDomain,
          message: `SSL provisioning failed: ${acmeResult.error}`,
        };
      }

      // SSL provisioned successfully
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days (Let's Encrypt default)

      await query(
        `UPDATE "custom_domains"
         SET status = 'active',
             ssl_provisioned_at = NOW(),
             ssl_expires_at = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [expiresAt.toISOString(), domainRecord.id]
      );

      logger.info(
        `[CustomDomainService] SSL provisioned for ${normalizedDomain} (tenant ${tenantId}), expires ${expiresAt.toISOString()}`
      );

      return {
        success: true,
        domain: normalizedDomain,
        message: 'SSL certificate provisioned successfully. Domain is now active.',
        expiresAt,
      };
    } catch (error: any) {
      logger.error(`[CustomDomainService] provisionSSL failed: ${error.message}`);

      await query(
        `UPDATE "custom_domains"
         SET status = 'ssl_failed', updated_at = NOW()
         WHERE id = $1`,
        [domainRecord.id]
      );

      return {
        success: false,
        domain: normalizedDomain,
        message: `SSL provisioning failed: ${error.message}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Domain Status
  // -----------------------------------------------------------------------

  /**
   * Get the current status of all custom domains for a tenant.
   */
  async getDomainStatus(tenantId: string): Promise<CustomDomain[]> {
    const { rows } = await query(
      `SELECT * FROM "custom_domains"
       WHERE tenant_id = $1 AND status != 'removed'
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return rows.map((row: any) => this.mapRowToDomain(row));
  }

  /**
   * Get routing information for a specific domain.
   * Used by the reverse proxy to map incoming requests to tenants.
   */
  async getDomainRouting(
    domain: string
  ): Promise<{ tenantId: string; status: DomainStatus } | null> {
    const { rows } = await query(
      `SELECT tenant_id, status FROM "custom_domains"
       WHERE domain = $1 AND status = 'active'
       LIMIT 1`,
      [domain.toLowerCase()]
    );

    if (!rows || rows.length === 0) return null;

    return {
      tenantId: rows[0].tenant_id,
      status: rows[0].status,
    };
  }

  // -----------------------------------------------------------------------
  // Domain Removal
  // -----------------------------------------------------------------------

  /**
   * Remove a custom domain for a tenant.
   * Marks the domain as 'removed' (soft delete) so it can be re-registered.
   */
  async removeDomain(tenantId: string, domain: string): Promise<void> {
    const normalizedDomain = domain.toLowerCase().trim();

    const { rowCount } = await query(
      `UPDATE "custom_domains"
       SET status = 'removed', updated_at = NOW()
       WHERE tenant_id = $1 AND domain = $2 AND status != 'removed'`,
      [tenantId, normalizedDomain]
    );

    if (rowCount === 0) {
      throw new Error(`Domain ${normalizedDomain} not found for tenant ${tenantId}.`);
    }

    logger.info(
      `[CustomDomainService] Domain ${normalizedDomain} removed for tenant ${tenantId}`
    );
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  /**
   * Generate a cryptographically random verification token.
   */
  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Validate that the domain is syntactically correct and not a reserved domain.
   */
  private validateDomain(domain: string): void {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain is required');
    }

    const normalized = domain.toLowerCase().trim();

    // Basic domain format validation
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(normalized)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    // Prevent registering hololand's own domains
    const reservedDomains = ['hololand.io', 'hololand.com', 'central.hololand.io'];
    if (reservedDomains.some((rd) => normalized === rd || normalized.endsWith(`.${rd}`))) {
      throw new Error(`Cannot register reserved domain: ${domain}`);
    }
  }

  /**
   * Perform DNS TXT record lookup.
   * Uses Node.js dns.promises.resolveTxt.
   */
  private async lookupTxtRecords(hostname: string): Promise<string[]> {
    try {
      // Dynamic import to avoid issues in non-Node environments (e.g. edge)
      const dns = await import('dns');
      const { resolveTxt } = dns.promises;

      const records = await resolveTxt(hostname);
      // resolveTxt returns string[][] -- flatten and join
      return records.map((chunks) => chunks.join(''));
    } catch (error: any) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        // No TXT records found -- this is normal before the tenant sets them
        return [];
      }
      logger.warn(
        `[CustomDomainService] DNS lookup failed for ${hostname}: ${error.message}`
      );
      return [];
    }
  }

  /**
   * Perform ACME HTTP-01 challenge for SSL certificate provisioning.
   *
   * STUB: In production, this would:
   *   1. Use an ACME client (e.g. `acme-client` npm package)
   *   2. Create an order with Let's Encrypt
   *   3. Serve the challenge token via HTTP on the domain
   *   4. Finalize the order and store the certificate
   *
   * For now, this simulates a successful provision.
   */
  private async performACMEChallenge(
    domain: string
  ): Promise<{ success: boolean; error?: string }> {
    // STUB: Simulate ACME challenge
    // In production, replace with real ACME client integration.
    logger.info(
      `[CustomDomainService] ACME challenge initiated for ${domain} (stub -- would use Let's Encrypt in production)`
    );

    // Simulate a brief delay for the challenge
    await new Promise((resolve) => setTimeout(resolve, 100));

    // For the stub, always succeed. Production implementation would
    // actually perform the HTTP-01 challenge and may fail.
    return { success: true };
  }

  // -----------------------------------------------------------------------
  // Row Mapping
  // -----------------------------------------------------------------------

  private mapRowToDomain(row: any): CustomDomain {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      domain: row.domain,
      status: row.status as DomainStatus,
      verificationToken: row.verification_token,
      verificationDnsName: row.verification_dns_name,
      verificationStartedAt: row.verification_started_at
        ? new Date(row.verification_started_at)
        : null,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      sslProvisionedAt: row.ssl_provisioned_at ? new Date(row.ssl_provisioned_at) : null,
      sslExpiresAt: row.ssl_expires_at ? new Date(row.ssl_expires_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: CustomDomainService | null = null;

export function getCustomDomainService(): CustomDomainService {
  if (!instance) {
    instance = new CustomDomainService();
  }
  return instance;
}
