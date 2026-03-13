"use client";

import type { Contributor } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { ContributorCard } from "./contributor-card";

interface ContributorGridProps {
  contributors: Contributor[];
  feeHistory: FeeHistory | undefined;
  shapleyLoaded?: boolean;
}

export function ContributorGrid({ contributors, feeHistory, shapleyLoaded }: ContributorGridProps) {
  const sorted = [...contributors]
    .filter((c) => c.linkCount > 0)
    .sort((a, b) => b.linkCount - a.linkCount);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <ContributorCard key={c.code} contributor={c} feeHistory={feeHistory} />
        ))}
      </div>
      <p className="text-xs text-cream-30 text-center">
        {shapleyLoaded
          ? "Reward shares computed using Shapley value analysis of operator contributions."
          : "Reward shares are estimated using demand-weighted coverage. Computing Shapley values..."}
      </p>
    </div>
  );
}
