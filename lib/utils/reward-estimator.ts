import { CONTRIBUTOR_SHARE } from "@/lib/constants/config";
import type { FeeHistory } from "@/lib/types/fees";

/**
 * Estimate rewards for a contributor based on their share and fee history.
 */
export function estimateEpochReward(
  contributorShare: number,
  averageFeePerEpoch: number
): number {
  return contributorShare * averageFeePerEpoch * CONTRIBUTOR_SHARE;
}

/**
 * Project monthly and yearly earnings based on historical fees.
 * Solana epochs are ~2-3 days, so roughly 10-15 per month.
 */
export function projectEarnings(
  contributorShare: number,
  feeHistory: FeeHistory
): {
  perEpochSol: number;
  monthlySol: number;
  yearlySol: number;
} {
  const avgFee = feeHistory.averageFeeSol;
  const perEpoch = estimateEpochReward(contributorShare, avgFee);

  // Estimate epochs per month: ~12 (avg 2.5 day epochs)
  const epochsPerMonth = 12;
  const epochsPerYear = epochsPerMonth * 12;

  return {
    perEpochSol: perEpoch,
    monthlySol: perEpoch * epochsPerMonth,
    yearlySol: perEpoch * epochsPerYear,
  };
}

/**
 * Compute a fee trend (simple linear slope).
 * Returns SOL change per epoch.
 */
export function computeFeeTrend(feeHistory: FeeHistory): {
  slope: number;
  direction: "growing" | "declining" | "stable";
} {
  const epochs = feeHistory.epochs;
  if (epochs.length < 2) return { slope: 0, direction: "stable" };

  // Simple linear regression
  const n = epochs.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += epochs[i].totalFeeSol;
    sumXY += i * epochs[i].totalFeeSol;
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  const direction =
    slope > 0.5 ? "growing" : slope < -0.5 ? "declining" : "stable";

  return { slope, direction };
}
