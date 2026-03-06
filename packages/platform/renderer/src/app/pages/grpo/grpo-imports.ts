/**
 * GRPO Dashboard Import Bridge
 *
 * Re-exports GRPO dashboard components from the co-located component library.
 * Now that this module lives inside the Hololand renderer package, we use a
 * direct relative import instead of a tsconfig path alias.
 *
 * @module pages/grpo/grpo-imports
 */

export {
  GRPODashboard,
  useGRPOData,
  type UseGRPODataConfig,
  type GRPODashboardProps,
} from '../../../components/grpo-training-dashboard';
