import type { EpochFee, FeeHistory } from "@/lib/types/fees";
import { LAMPORTS_PER_SOL } from "@/lib/constants/config";

/**
 * Parse individual epoch CSV: pubkey,votekey,dz_fee_lamports
 */
export function parseFeesCsv(csv: string, solanaEpoch: number): EpochFee | null {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;

  let totalLamports = 0;
  let validatorCount = 0;

  // Skip header row (pubkey,votekey,dz_fee_lamports)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 3) {
      const fee = parseInt(cols[2], 10);
      if (!isNaN(fee) && fee > 0) {
        totalLamports += fee;
        validatorCount++;
      }
    }
  }

  if (validatorCount === 0) return null;

  return {
    solanaEpoch,
    totalFeeLamports: totalLamports,
    totalFeeSol: totalLamports / LAMPORTS_PER_SOL,
    validatorCount,
  };
}

/**
 * Parse consolidated CSV with columns:
 * pubkey,votekey,dz_fee_lamports_934,dz_fee_lamports_935,...,dz_fee_lamports_938,previous_fees,paid_*,previous_paid
 *
 * We pivot this into per-epoch totals.
 */
export function parseConsolidatedCsv(csv: string): EpochFee[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",");

  // Find fee columns (dz_fee_lamports_NNN)
  const feeColumns: { index: number; epoch: number }[] = [];
  for (let i = 0; i < header.length; i++) {
    const match = header[i].match(/^dz_fee_lamports_(\d+)$/);
    if (match) {
      feeColumns.push({ index: i, epoch: parseInt(match[1], 10) });
    }
  }

  if (feeColumns.length === 0) return [];

  // Accumulate per-epoch totals
  const epochTotals = new Map<number, { totalLamports: number; validatorCount: number }>();
  for (const fc of feeColumns) {
    epochTotals.set(fc.epoch, { totalLamports: 0, validatorCount: 0 });
  }

  // Parse each validator row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    for (const fc of feeColumns) {
      if (fc.index < cols.length) {
        const fee = parseInt(cols[fc.index], 10);
        if (!isNaN(fee) && fee > 0) {
          const entry = epochTotals.get(fc.epoch)!;
          entry.totalLamports += fee;
          entry.validatorCount++;
        }
      }
    }
  }

  // Also extract previous_fees as a historical aggregate
  // We know fees ran from epoch 859–938, but the consolidated CSV only has the last 5 explicitly
  // The "previous_fees" column is the sum of all fees before epoch 934
  const previousFeesIdx = header.indexOf("previous_fees");

  // For epochs before 934, we'll estimate per-epoch from the "previous_fees" total
  if (previousFeesIdx >= 0) {
    let totalPreviousFees = 0;
    let validatorsWithPrevious = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (previousFeesIdx < cols.length) {
        const prev = parseInt(cols[previousFeesIdx], 10);
        if (!isNaN(prev) && prev > 0) {
          totalPreviousFees += prev;
          validatorsWithPrevious++;
        }
      }
    }

    // Epochs 859–933 = 75 epochs
    const previousEpochCount = 75;
    if (totalPreviousFees > 0 && previousEpochCount > 0) {
      const avgPerEpoch = totalPreviousFees / previousEpochCount;
      for (let e = 859; e <= 933; e++) {
        epochTotals.set(e, {
          totalLamports: Math.round(avgPerEpoch),
          validatorCount: validatorsWithPrevious,
        });
      }
    }
  }

  // Convert to array
  const epochs: EpochFee[] = [];
  for (const [epoch, data] of epochTotals) {
    epochs.push({
      solanaEpoch: epoch,
      totalFeeLamports: data.totalLamports,
      totalFeeSol: data.totalLamports / LAMPORTS_PER_SOL,
      validatorCount: data.validatorCount,
    });
  }

  return epochs;
}

export function computeFeeHistory(epochs: EpochFee[]): FeeHistory {
  if (epochs.length === 0) {
    return {
      epochs: [],
      averageFeeSol: 0,
      totalFeeSol: 0,
      latestEpoch: 0,
      earliestEpoch: 0,
    };
  }

  const sorted = [...epochs].sort((a, b) => a.solanaEpoch - b.solanaEpoch);
  const totalFeeSol = sorted.reduce((sum, e) => sum + e.totalFeeSol, 0);

  return {
    epochs: sorted,
    averageFeeSol: totalFeeSol / sorted.length,
    totalFeeSol,
    latestEpoch: sorted[sorted.length - 1].solanaEpoch,
    earliestEpoch: sorted[0].solanaEpoch,
  };
}
