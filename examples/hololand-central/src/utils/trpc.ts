/**
 * tRPC Client Setup
 *
 * Configures the type-safe tRPC client for API calls
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/api/root';
import superjson from 'superjson';

/**
 * Create typed tRPC hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('hololand-auth-token');
}

/**
 * tRPC client configuration
 */
export const trpcClientConfig = {
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/trpc`,

      // Include auth token in all requests
      headers() {
        const token = getAuthToken();
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }),
  ],
  transformer: superjson,
};
