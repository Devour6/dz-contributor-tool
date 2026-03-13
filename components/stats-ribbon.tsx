"use client";

import type { ParsedSnapshot } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatSolFromSol } from "@/lib/utils/format";

interface StatsRibbonProps {
  snapshot: ParsedSnapshot | undefined;
  feeHistory: FeeHistory | undefined;
  feesLoading: boolean;
  epochs: number[];
  selectedEpoch: number | null;
  onEpochChange: (epoch: number) => void;
}

export function StatsRibbon({
  snapshot,
  feeHistory,
  feesLoading,
  epochs,
  selectedEpoch,
  onEpochChange,
}: StatsRibbonProps) {
  if (!snapshot) return null;

  const avgFee = feeHistory?.averageFeeSol || 0;
  const totalLinks = snapshot.contributors.reduce((sum, c) => sum + c.linkCount, 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-cream-5 border border-cream-8 px-5 py-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:items-center sm:gap-6 text-sm">
        <Stat label="Contributors" value={formatNumber(snapshot.contributors.length)} />
        <span className="text-cream-15 hidden sm:block">|</span>
        <Stat label="Links" value={formatNumber(totalLinks)} />
        <span className="text-cream-15 hidden sm:block">|</span>
        <Stat label="Cities" value={formatNumber(snapshot.locations.length)} />
        <span className="text-cream-15 hidden sm:block">|</span>
        <Stat
          label="Avg Fee/Epoch"
          value={feesLoading ? "..." : avgFee > 0 ? `${formatSolFromSol(avgFee)} SOL` : "—"}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-cream-30">Epoch</span>
        <Select
          value={selectedEpoch?.toString() || ""}
          onValueChange={(v) => onEpochChange(parseInt(v, 10))}
        >
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="..." />
          </SelectTrigger>
          <SelectContent>
            {epochs.map((e) => (
              <SelectItem key={e} value={e.toString()}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-cream-40 text-xs">{label}</span>
      <span className="text-cream font-medium">{value}</span>
    </div>
  );
}
