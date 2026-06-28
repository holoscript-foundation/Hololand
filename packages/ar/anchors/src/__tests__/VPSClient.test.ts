import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VPSClient,
  VPS_PROVIDER_CREDENTIALS,
  createEnvVPSCredentialResolver,
  type VPSCredentialRequest,
  type VPSRequest,
} from '../detectors/VPSClient';

const baseRequest: VPSRequest = {
  image: new Uint8Array([1, 2, 3]).buffer,
  intrinsics: {
    width: 640,
    height: 480,
    fx: 400,
    fy: 400,
    cx: 320,
    cy: 240,
  },
  gpsHint: { latitude: 47.6019, longitude: -122.3331 },
};

const baseConfig = {
  timeout: 100,
  enableCache: false,
  cacheTTL: 0,
  minConfidence: 0.7,
  debug: false,
};

describe('VPSClient credential and receipt preflight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('publishes canonical ARCore and Niantic HoloKey names', () => {
    expect(VPS_PROVIDER_CREDENTIALS.arcore).toMatchObject({
      canonicalName: 'ARCORE_GEOSPATIAL_API_KEY',
      holokeyRef: 'vault:arcore-geospatial-api-key',
    });
    expect(VPS_PROVIDER_CREDENTIALS.niantic).toMatchObject({
      canonicalName: 'NIANTIC_LIGHTSHIP_API_KEY',
      holokeyRef: 'vault:niantic-lightship-api-key',
    });
    expect(VPS_PROVIDER_CREDENTIALS.niantic?.aliases).toContain('LIGHTSHIP_API_KEY');
  });

  it('blocks Niantic preflight when no credential resolver or env key exists', async () => {
    const client = new VPSClient({
      ...baseConfig,
      provider: 'niantic',
      credentialResolver: () => null,
    });

    const receipt = await client.preflight();

    expect(receipt.status).toBe('blocked');
    expect(receipt.credential.present).toBe(false);
    expect(receipt.credential.canonicalName).toBe('NIANTIC_LIGHTSHIP_API_KEY');
    expect(receipt.noSecretValues).toBe(true);
    expect(JSON.stringify(receipt)).not.toContain('Bearer');
  });

  it('uses a resolver credential for Niantic without leaking it into receipts', async () => {
    const secret = 'niantic-live-secret-for-test';
    const authorizationHeaders: string[] = [];

    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      authorizationHeaders.push(String(init?.headers && (init.headers as Record<string, string>).Authorization));
      return {
        ok: true,
        json: async () => ({
          localization_result: {
            status: 'SUCCESS',
            confidence: 0.91,
            wayspot_id: 'wayspot-123',
            horizontal_accuracy: 0.8,
            vertical_accuracy: 1.2,
            heading_accuracy: 2.5,
            pose: {
              position: { x: 1, y: 2, z: 3 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
          },
        }),
      } as unknown as Response;
    });

    const client = new VPSClient({
      ...baseConfig,
      provider: 'niantic',
      credentialResolver: () => ({
        value: secret,
        source: 'resolver',
        keyName: 'NIANTIC_LIGHTSHIP_API_KEY',
        holokeyRef: 'vault:niantic-lightship-api-key',
      }),
    });

    const response = await client.resolve(baseRequest);

    expect(response.success).toBe(true);
    expect(authorizationHeaders).toEqual([`Bearer ${secret}`]);
    expect(response.receipt).toMatchObject({
      status: 'pass',
      provider: 'niantic',
      operation: 'resolve',
      locationId: 'wayspot-123',
      credential: {
        present: true,
        source: 'resolver',
        canonicalName: 'NIANTIC_LIGHTSHIP_API_KEY',
        redacted: true,
      },
      metrics: {
        confidence: 0.91,
        horizontalAccuracy: 0.8,
        gpsHintProvided: true,
        rawFrameIncluded: false,
      },
      noSecretValues: true,
    });
    expect(JSON.stringify(response.receipt)).not.toContain(secret);
  });

  it('resolves legacy Lightship aliases through the env resolver', async () => {
    const descriptor = VPS_PROVIDER_CREDENTIALS.niantic!;
    const request: VPSCredentialRequest = {
      ...descriptor,
      namesChecked: [descriptor.canonicalName, ...descriptor.aliases],
    };
    const resolution = await createEnvVPSCredentialResolver({
      LIGHTSHIP_API_KEY: 'legacy-lightship-secret',
    })(request);

    expect(resolution).toMatchObject({
      present: true,
      source: 'environment',
      keyName: 'LIGHTSHIP_API_KEY',
      holokeyRef: 'vault:niantic-lightship-api-key',
    });
    expect(JSON.stringify({ ...resolution, value: undefined })).not.toContain('legacy-lightship-secret');
  });

  it('records ARCore device and credential blockers in Node without claiming phone proof', async () => {
    const client = new VPSClient({
      ...baseConfig,
      provider: 'arcore',
      credentialResolver: () => null,
    });

    const receipt = await client.preflight();

    expect(receipt.status).toBe('blocked');
    expect(receipt.credential.canonicalName).toBe('ARCORE_GEOSPATIAL_API_KEY');
    expect(receipt.device.runtime).toBe('node');
    expect(receipt.device.nativeBridgeExpected).toBe(true);
    expect(receipt.blockers.join('\n')).toContain('current runtime is Node');
  });
});
