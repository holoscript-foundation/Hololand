/**
 * Root tRPC Router
 *
 * Combines all API routers into the main application router
 */

import { router } from './trpc';
import { authRouter } from './routers/auth';
import { questRouter } from './routers/quest';
import { userRouter } from './routers/user';
import { portalRouter } from './routers/portal';
import { companionRouter } from './routers/companion';
import { creatorRouter } from './routers/creator';

/**
 * Main application router
 */
export const appRouter = router({
  auth: authRouter,
  quest: questRouter,
  user: userRouter,
  portal: portalRouter,
  companion: companionRouter,
  creator: creatorRouter,
});

/**
 * Export type for client-side type safety
 */
export type AppRouter = typeof appRouter;
