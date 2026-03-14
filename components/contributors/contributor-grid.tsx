"use client";

import { useState } from "react";
import type { Contributor } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { ContributorCard } from "./contributor-card";
import { ContributorDetail } from "./contributor-detail";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getContributorDisplayName,
  getContributorColor,
  CONTRIBUTOR_SHARE,
} from "@/lib/constants/config";
import { formatPercent, formatSolFromSol } from "@/lib/utils/format";
import { Cable, MapPin, Server } from "lucide-react";

interface ContributorGridProps {
  contributors: Contributor[];
  feeHistory: FeeHistory | undefined;
  shapleyLoaded?: boolean;
}

export function ContributorGrid({ contributors, feeHistory, shapleyLoaded }: ContributorGridProps) {
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

  const sorted = [...contributors]
    .filter((c) => c.linkCount > 0)
    .sort((a, b) => b.linkCount - a.linkCount);

  const avgFee = feeHistory?.averageFeeSol || 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <ContributorCard
            key={c.code}
            contributor={c}
            feeHistory={feeHistory}
            onSelect={setSelectedContributor}
          />
        ))}
      </div>
      <p className="text-xs text-cream-30 text-center">
        {shapleyLoaded
          ? "Reward shares computed using Shapley value analysis of operator contributions."
          : "Reward shares are estimated using demand-weighted coverage. Computing Shapley values..."}
      </p>

      {/* Contributor detail modal */}
      <Dialog
        open={!!selectedContributor}
        onOpenChange={(open) => !open && setSelectedContributor(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col">
          {selectedContributor && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-3.5 rounded-full"
                      style={{ backgroundColor: getContributorColor(selectedContributor.code) }}
                    />
                    <DialogTitle>
                      {getContributorDisplayName(selectedContributor.code)}
                    </DialogTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      selectedContributor.status === "Active"
                        ? "bg-green/10 text-green border-green/20 text-xs"
                        : "bg-amber/10 text-amber border-amber/20 text-xs"
                    }
                  >
                    {selectedContributor.status}
                  </Badge>
                </div>

                {/* Quick stats */}
                <DialogDescription asChild>
                  <div className="flex items-center gap-4 text-sm text-cream-60">
                    <span className="flex items-center gap-1.5">
                      <Cable className="size-3.5 text-cream-30" />
                      {selectedContributor.linkCount} links
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-cream-30" />
                      {selectedContributor.cities.length} cities
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Server className="size-3.5 text-cream-30" />
                      {selectedContributor.deviceCount} devices
                    </span>
                  </div>
                </DialogDescription>

                {/* Reward share bar */}
                <div className="mt-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-cream-40">Est. reward share</span>
                    <span className="text-cream-60">
                      {formatPercent(selectedContributor.estimatedShare)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream-8 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(selectedContributor.estimatedShare * 100 * 5, 100)}%`,
                        backgroundColor: getContributorColor(selectedContributor.code),
                      }}
                    />
                  </div>
                  {avgFee > 0 && (
                    <p className="text-xs text-cream-30 mt-1">
                      ~{formatSolFromSol(selectedContributor.estimatedShare * avgFee * CONTRIBUTOR_SHARE)} SOL per epoch (est.)
                    </p>
                  )}
                </div>
              </DialogHeader>

              {/* Scrollable detail body */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 pt-4">
                <ContributorDetail contributor={selectedContributor} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
