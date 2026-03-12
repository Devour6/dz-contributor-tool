"use client";

import { useState } from "react";
import type { Contributor } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContributorDetail } from "./contributor-detail";
import { formatPercent, formatSolFromSol } from "@/lib/utils/format";
import { CONTRIBUTOR_SHARE, getContributorDisplayName } from "@/lib/constants/config";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface ContributorTableProps {
  contributors: Contributor[];
  feeHistory: FeeHistory | undefined;
}

export function ContributorTable({
  contributors,
  feeHistory,
}: ContributorTableProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const sorted = [...contributors].sort((a, b) => b.linkCount - a.linkCount);
  const avgFee = feeHistory?.averageFeeSol || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>Fee and reward data are estimates based on historical epochs (859–938). DZ fees are currently paused — actual future rewards may differ significantly.</span>
      </div>
    <Table>
      <TableHeader>
        <TableRow className="border-cream-8 hover:bg-transparent">
          <TableHead className="w-8 text-cream-40" />
          <TableHead className="text-cream-40">Contributor</TableHead>
          <TableHead className="text-cream-40 text-right">Devices</TableHead>
          <TableHead className="text-cream-40 text-right">Links</TableHead>
          <TableHead className="text-cream-40">Cities</TableHead>
          <TableHead className="text-cream-40 text-right">
            Est. Share
          </TableHead>
          <TableHead className="text-cream-40 text-right">
            Est. Reward / Epoch
          </TableHead>
          <TableHead className="text-cream-40">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((c) => {
          const isExpanded = expandedCode === c.code;
          const rewardPerEpoch = c.estimatedShare * avgFee * CONTRIBUTOR_SHARE;

          return (
            <TableRow
              key={c.code}
              className="border-cream-8 cursor-pointer"
              onClick={() =>
                setExpandedCode(isExpanded ? null : c.code)
              }
            >
              <TableCell className="text-cream-30">
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </TableCell>
              <TableCell className="font-medium text-cream">
                {getContributorDisplayName(c.code)}
              </TableCell>
              <TableCell className="text-right text-cream-60">
                {c.deviceCount}
              </TableCell>
              <TableCell className="text-right text-cream-60">
                {c.linkCount}
              </TableCell>
              <TableCell className="text-cream-60 max-w-[200px] truncate">
                {c.cities.slice(0, 3).join(", ")}
                {c.cities.length > 3 && ` +${c.cities.length - 3}`}
              </TableCell>
              <TableCell className="text-right text-cream-60">
                {formatPercent(c.estimatedShare)}
              </TableCell>
              <TableCell className="text-right text-cream-60">
                {avgFee > 0 ? `${formatSolFromSol(rewardPerEpoch)} SOL` : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    c.status === "Active"
                      ? "bg-green/10 text-green border-green/20"
                      : "bg-amber/10 text-amber border-amber/20"
                  }
                >
                  {c.status}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
        {sorted.map((c) =>
          expandedCode === c.code ? (
            <TableRow key={`${c.code}-detail`} className="border-cream-8 hover:bg-transparent">
              <TableCell colSpan={8} className="p-0">
                <ContributorDetail contributor={c} />
              </TableCell>
            </TableRow>
          ) : null
        )}
      </TableBody>
    </Table>
    </div>
  );
}
