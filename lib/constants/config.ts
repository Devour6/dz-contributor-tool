export const S3_SNAPSHOT_URL_TEMPLATE =
  "https://doublezero-contributor-rewards-mn-beta-snapshots.s3.us-east-1.amazonaws.com/mn-epoch-{N}-snapshot.json";

export const FEE_CSV_URL_TEMPLATE =
  "https://raw.githubusercontent.com/doublezerofoundation/fees/main/epoch/fees_{N}.csv";

export const FEE_CONSOLIDATED_URL =
  "https://raw.githubusercontent.com/doublezerofoundation/fees/main/fees_and_payments_consolidated.csv";

// DZ epoch range
export const MIN_DZ_EPOCH = 48;
export const MAX_DZ_EPOCH = 120; // Will be dynamically discovered

// Fee epoch range (Solana epochs)
export const FEE_EPOCH_START = 859;
export const FEE_EPOCH_END = 938; // Paused at 939

// Economics
export const BURN_RATE = 0.10; // 10% of revenue burned
export const CONTRIBUTOR_SHARE = 0.90; // 90% distributed to contributors
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Shapley parameters (for reference — full computation done off-chain)
export const SHAPLEY_PARAMS = {
  operatorUptime: 0.98,
  contiguityBonus: 5.0,
  demandMultiplier: 1.2,
};

export function getSnapshotUrl(epoch: number): string {
  return S3_SNAPSHOT_URL_TEMPLATE.replace("{N}", epoch.toString());
}

export function getFeeCsvUrl(epoch: number): string {
  return FEE_CSV_URL_TEMPLATE.replace("{N}", epoch.toString());
}
