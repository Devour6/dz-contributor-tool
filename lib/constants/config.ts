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

// Economics — 45/45/10 split
export const BURN_RATE = 0.10; // 10% of revenue burned
export const CONTRIBUTOR_SHARE = 0.45; // 45% distributed to contributors (Shapley)
export const VALIDATOR_SHARE = 0.45; // 45% distributed to validators (stake-weighted)
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const EPOCHS_PER_MONTH = 12; // ~2.5 days per epoch ≈ 12 epochs/month
export const EPOCHS_PER_YEAR = 144;

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

// Contributor code → full display name mapping
export const CONTRIBUTOR_NAMES: Record<string, string> = {
  "jump_": "Jump Crypto",
  "dgt": "Distributed Global",
  "tsw": "Teraswitch",
  "glxy": "Galaxy Digital",
  "stakefac": "Staking Facilities",
  "cherry": "Cherry Servers",
  "rox": "RockawayX",
  "s3v": "South 3rd Ventures",
  "laconic": "Laconic Network",
  "infiber": "InFiber",
  "cdrw": "Cumberland/DRW",
  "latitude": "Latitude.sh",
  "velia": "Velia.net",
  "allnodes": "Allnodes",
};

export function getContributorDisplayName(code: string): string {
  return CONTRIBUTOR_NAMES[code] || code;
}

// Contributor code → color for map and cards
export const CONTRIBUTOR_COLORS: Record<string, string> = {
  jump_: "#FF6B6B",
  dgt: "#4ECDC4",
  tsw: "#45B7D1",
  glxy: "#96CEB4",
  stakefac: "#FFEAA7",
  cherry: "#DDA0DD",
  rox: "#98D8C8",
  s3v: "#F7DC6F",
  laconic: "#BB8FCE",
  infiber: "#85C1E9",
  cdrw: "#F0B27A",
  latitude: "#82E0AA",
  velia: "#F1948A",
  allnodes: "#AED6F1",
};

export function getContributorColor(code: string): string {
  return CONTRIBUTOR_COLORS[code] || "#F3EED9";
}
