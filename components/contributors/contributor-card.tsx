"use client";

import type { Contributor } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getContributorDisplayName,
  getContributorColor,
  CONTRIBUTOR_SHARE,
} from "@/lib/constants/config";
import { formatPercent, formatSolFromSol } from "@/lib/utils/format";
import { ChevronRight } from "lucide-react";

interface ContributorCardProps {
  contributor: Contributor;
  feeHistory: FeeHistory | undefined;
  onSelect: (contributor: Contributor) => void;
}

export function ContributorCard({ contributor, feeHistory, onSelect }: ContributorCardProps) {
  const avgFee = feeHistory?.averageFeeSol || 0;
  const rewardPerEpoch = contributor.estimatedShare * avgFee * CONTRIBUTOR_SHARE;
  const color = getContributorColor(contributor.code);

  return (
    <Card
      className="bg-cream-5 border-cream-8 cursor-pointer hover:border-cream-15 transition-colors"
      onClick={() => onSelect(contributor)}
    >
      <CardContent className="pt-4 pb-4">
        {/* Header: colored dot + name + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-display text-sm tracking-wide text-cream">
              {getContributorDisplayName(contributor.code)}
            </span>
          </div>
          <Badge
            variant="secondary"
            className={
              contributor.status === "Active"
                ? "bg-green/10 text-green border-green/20 text-xs"
                : "bg-amber/10 text-amber border-amber/20 text-xs"
            }
          >
            {contributor.status}
          </Badge>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm text-cream-60">
          <span>{contributor.linkCount} links</span>
          <span>{contributor.cities.length} cities</span>
          <span>{contributor.deviceCount} devices</span>
        </div>

        {/* Reward share bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-cream-40">Est. reward share</span>
            <span className="text-cream-60">
              {formatPercent(contributor.estimatedShare)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-cream-8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(contributor.estimatedShare * 100 * 5, 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          {avgFee > 0 && (
            <p className="text-xs text-cream-30 mt-1">
              ~{formatSolFromSol(rewardPerEpoch)} SOL per epoch (est.)
            </p>
          )}
        </div>

        {/* City pills */}
        <div className="mt-3 flex flex-wrap gap-1">
          {contributor.cities.slice(0, 5).map((city) => (
            <span
              key={city}
              className="rounded-full bg-cream-5 border border-cream-8 px-2 py-0.5 text-[11px] text-cream-40"
            >
              {city}
            </span>
          ))}
          {contributor.cities.length > 5 && (
            <span className="text-[11px] text-cream-20 px-1 py-0.5">
              +{contributor.cities.length - 5} more
            </span>
          )}
        </div>

        {/* View details hint */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-cream-30 text-xs">
          <span>View details</span>
          <ChevronRight className="size-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}
