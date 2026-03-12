"use client";

import type { Contributor } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { ContributorCard } from "./contributor-card";

interface ContributorGridProps {
  contributors: Contributor[];
  feeHistory: FeeHistory | undefined;
}

export function ContributorGrid({ contributors, feeHistory }: ContributorGridProps) {
  const sorted = [...contributors]
    .filter((c) => c.linkCount > 0)
    .sort((a, b) => b.linkCount - a.linkCount);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((c) => (
        <ContributorCard key={c.code} contributor={c} feeHistory={feeHistory} />
      ))}
    </div>
  );
}
