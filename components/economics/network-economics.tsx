"use client";

import { useMemo } from "react";
import type { FeeHistory } from "@/lib/types/fees";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSolFromSol } from "@/lib/utils/format";
import { computeFeeTrend } from "@/lib/utils/reward-estimator";
import { FEE_EPOCH_START, FEE_EPOCH_END } from "@/lib/constants/config";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface NetworkEconomicsProps {
  feeHistory: FeeHistory | undefined;
  snapshot: ParsedSnapshot;
}

export function NetworkEconomics({ feeHistory, snapshot }: NetworkEconomicsProps) {
  const feeTrend = useMemo(
    () => (feeHistory ? computeFeeTrend(feeHistory) : null),
    [feeHistory]
  );

  if (!feeHistory || feeHistory.epochs.length === 0) {
    return (
      <Card className="bg-cream-5 border-cream-8">
        <CardContent className="py-8 text-center text-sm text-cream-40">
          Fee history data is currently unavailable. Check back later.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total fees collected"
          value={`${formatSolFromSol(feeHistory.totalFeeSol)} SOL`}
          note={`Over ${feeHistory.epochs.length} epochs`}
        />
        <MetricCard
          label="Average per epoch"
          value={`${formatSolFromSol(feeHistory.averageFeeSol)} SOL`}
          note="~2.5 days per epoch"
        />
        <MetricCard
          label="Fee split"
          value="45 / 45 / 10"
          note="Contributors / Validators / Burn"
        />
        <MetricCard
          label="Fee trend"
          value={
            feeTrend?.direction === "growing"
              ? "Growing"
              : feeTrend?.direction === "declining"
              ? "Declining"
              : "Stable"
          }
          icon={
            feeTrend?.direction === "growing" ? (
              <TrendingUp className="size-4 text-green" />
            ) : feeTrend?.direction === "declining" ? (
              <TrendingDown className="size-4 text-red" />
            ) : (
              <Minus className="size-4 text-cream-30" />
            )
          }
        />
      </div>

      {/* Fee history chart */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wide text-cream">
            Fee History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[1px] sm:gap-[2px] h-24 sm:h-32">
            {feeHistory.epochs.slice(-40).map((e) => {
              const maxFee = Math.max(
                ...feeHistory.epochs.slice(-40).map((ep) => ep.totalFeeSol)
              );
              const height =
                maxFee > 0 ? (e.totalFeeSol / maxFee) * 100 : 0;
              return (
                <div
                  key={e.solanaEpoch}
                  className="flex-1 rounded-t bg-cream-15 hover:bg-cream-30 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`Epoch ${e.solanaEpoch}: ${formatSolFromSol(e.totalFeeSol)} SOL`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-cream-20 mt-2">
            <span>
              Epoch {feeHistory.epochs.slice(-40)[0]?.solanaEpoch}
            </span>
            <span>
              Epoch{" "}
              {feeHistory.epochs[feeHistory.epochs.length - 1]?.solanaEpoch}
            </span>
          </div>
          <p className="text-xs text-cream-20 mt-3">
            Fees were collected from Solana epochs {FEE_EPOCH_START}–{FEE_EPOCH_END}. The program is
            currently paused as the network transitions to a shred-based
            economy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="bg-cream-5 border-cream-8">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-cream-40 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-lg sm:text-xl font-display text-cream">{value}</p>
        </div>
        {note && <p className="text-xs text-cream-20 mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}
