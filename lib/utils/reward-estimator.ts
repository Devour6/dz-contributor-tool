import { CONTRIBUTOR_SHARE, VALIDATOR_SHARE, LAMPORTS_PER_SOL, EPOCHS_PER_MONTH, EPOCHS_PER_YEAR } from "@/lib/constants/config";
import type { FeeHistory } from "@/lib/types/fees";
import type {
  PublisherCheckResponse,
  ValidatorRewardProjection,
  ValidatorRewardsSummary,
} from "@/lib/types/publisher";

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

  return {
    perEpochSol: perEpoch,
    monthlySol: perEpoch * EPOCHS_PER_MONTH,
    yearlySol: perEpoch * EPOCHS_PER_YEAR,
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

/**
 * Compute projected validator rewards from publisher data and historical fee average.
 * Publishing validators share the 45% validator pool proportional to their activated_stake.
 */
export function computeValidatorRewards(
  publisherData: PublisherCheckResponse,
  averageFeePerEpochSol: number
): ValidatorRewardsSummary {
  const validatorPoolPerEpoch = averageFeePerEpochSol * VALIDATOR_SHARE;

  const publishingValidators = publisherData.publishers.filter(
    (p) => p.publishing_leader_shreds === true
  );

  const totalPublishingStake = publishingValidators.reduce(
    (sum, p) => sum + p.activated_stake,
    0
  );

  const validators: ValidatorRewardProjection[] = publisherData.publishers.map(
    (p) => {
      const isPublishing = p.publishing_leader_shreds;
      const stakeShare =
        isPublishing && totalPublishingStake > 0
          ? p.activated_stake / totalPublishingStake
          : 0;
      const perEpoch = stakeShare * validatorPoolPerEpoch;

      return {
        nodePubkey: p.node_pubkey,
        votePubkey: p.vote_pubkey,
        validatorName: p.validator_name || "",
        activatedStake: p.activated_stake,
        stakeSharePercent: stakeShare * 100,
        publishingLeaderShreds: p.publishing_leader_shreds,
        leaderSlots: p.leader_slots,
        totalSlots: p.total_slots,
        dzMetroCode: p.dz_metro_code,
        dzDeviceCode: p.dz_device_code,
        validatorClient: p.validator_client,
        validatorVersion: p.validator_version,
        isBackup: p.is_backup,
        multicastConnected: p.multicast_connected,
        projectedRewardPerEpochSol: perEpoch,
        projectedRewardMonthlySol: perEpoch * EPOCHS_PER_MONTH,
        projectedRewardYearlySol: perEpoch * EPOCHS_PER_YEAR,
      };
    }
  );

  validators.sort((a, b) => b.stakeSharePercent - a.stakeSharePercent);

  return {
    epoch: publisherData.epoch,
    totalNetworkStake: publisherData.total_network_stake,
    publishingValidatorCount: publishingValidators.length,
    totalPublishingStake,
    projectedValidatorPoolPerEpochSol: validatorPoolPerEpoch,
    validators,
  };
}
