"use client";

import { useState, useMemo } from "react";
import type { ValidatorRewardsSummary } from "@/lib/types/publisher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatSolFromSol,
  formatPercent,
  formatNumber,
  shortenPubkey,
} from "@/lib/utils/format";
import { LAMPORTS_PER_SOL, FEE_EPOCH_START, FEE_EPOCH_END } from "@/lib/constants/config";
import { Search, AlertTriangle, Loader2 } from "lucide-react";

interface ValidatorRewardsProps {
  rewards: ValidatorRewardsSummary | null;
  isLoading: boolean;
}

function StatusBadge({ publishing, backup }: { publishing: boolean; backup: boolean }) {
  if (publishing) {
    return (
      <Badge className="bg-green/10 text-green border-green/20 text-xs">
        Publishing
      </Badge>
    );
  }
  if (backup) {
    return (
      <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20 text-xs">
        Backup
      </Badge>
    );
  }
  return (
    <Badge className="bg-cream-5 text-cream-40 border-cream-8 text-xs">
      Not Publishing
    </Badge>
  );
}

export function ValidatorRewards({ rewards, isLoading }: ValidatorRewardsProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!rewards) return [];
    if (!search.trim()) return rewards.validators;
    const q = search.toLowerCase();
    return rewards.validators.filter(
      (v) =>
        v.validatorName.toLowerCase().includes(q) ||
        v.nodePubkey.toLowerCase().includes(q) ||
        v.votePubkey.toLowerCase().includes(q) ||
        v.dzMetroCode.toLowerCase().includes(q)
    );
  }, [rewards, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-cream-30 animate-spin" />
          <p className="text-sm text-cream-40">Loading publisher data...</p>
        </div>
      </div>
    );
  }

  if (!rewards || rewards.validators.length === 0) {
    return (
      <Card className="bg-cream-5 border-cream-8">
        <CardContent className="py-8 text-center text-sm text-cream-40">
          No publisher data available for the current epoch.
        </CardContent>
      </Card>
    );
  }

  const avgReward =
    rewards.projectedValidatorPoolPerEpochSol /
    Math.max(rewards.publishingValidatorCount, 1);

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        <span>
          Projected rewards use historical fee averages (epochs {FEE_EPOCH_START}–{FEE_EPOCH_END}) and the
          new 45/45/10 split. No validator rewards have been paid yet — actual
          amounts will depend on future fee volume.
        </span>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Publishing validators"
          value={formatNumber(rewards.publishingValidatorCount)}
          note={`of ${formatNumber(rewards.validators.length)} connected`}
        />
        <MetricCard
          label="Publishing stake"
          value={`${formatSolFromSol(rewards.totalPublishingStake / LAMPORTS_PER_SOL, 0)} SOL`}
          note="Combined activated stake"
        />
        <MetricCard
          label="Validator pool / epoch"
          value={`${formatSolFromSol(rewards.projectedValidatorPoolPerEpochSol)} SOL`}
          note="45% of total fees"
        />
        <MetricCard
          label="Avg reward / epoch"
          value={`${formatSolFromSol(avgReward, 4)} SOL`}
          note="Per publishing validator"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cream-30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by validator name, pubkey, or metro..."
          className="w-full rounded-lg bg-cream-5 border border-cream-8 pl-10 pr-4 py-2.5 text-sm text-cream placeholder:text-cream-30 focus:outline-none focus:border-cream-20 transition-colors"
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <Card className="bg-cream-5 border-cream-8 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wide text-cream">
              Epoch {rewards.epoch} Publishers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cream-8 hover:bg-transparent">
                    <TableHead className="text-cream-40">Validator</TableHead>
                    <TableHead className="text-cream-40">Metro</TableHead>
                    <TableHead className="text-cream-40 text-right">Stake (SOL)</TableHead>
                    <TableHead className="text-cream-40 text-right">Share</TableHead>
                    <TableHead className="text-cream-40 text-right">Leader Slots</TableHead>
                    <TableHead className="text-cream-40">Client</TableHead>
                    <TableHead className="text-cream-40">Status</TableHead>
                    <TableHead className="text-cream-40 text-right">Est. / Epoch</TableHead>
                    <TableHead className="text-cream-40 text-right">Est. / Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow
                      key={v.nodePubkey}
                      className={`border-cream-8 ${!v.publishingLeaderShreds ? "opacity-40" : ""}`}
                    >
                      <TableCell className="text-cream">
                        <div>
                          <span className="font-medium">{v.validatorName || "Unknown"}</span>
                          <span className="block text-xs text-cream-30">{shortenPubkey(v.nodePubkey)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-cream-60 uppercase text-xs">{v.dzMetroCode}</TableCell>
                      <TableCell className="text-right text-cream-60 tabular-nums">
                        {formatNumber(v.activatedStake / LAMPORTS_PER_SOL, 0)}
                      </TableCell>
                      <TableCell className="text-right text-cream-60 tabular-nums">
                        {v.publishingLeaderShreds ? formatPercent(v.stakeSharePercent / 100) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-cream-60 tabular-nums">
                        {formatNumber(v.leaderSlots)}
                      </TableCell>
                      <TableCell className="text-cream-60 text-xs">{v.validatorClient}</TableCell>
                      <TableCell>
                        <StatusBadge publishing={v.publishingLeaderShreds} backup={v.isBackup} />
                      </TableCell>
                      <TableCell className="text-right text-cream-60 tabular-nums">
                        {v.publishingLeaderShreds ? `${formatSolFromSol(v.projectedRewardPerEpochSol, 4)} SOL` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-cream-60 tabular-nums">
                        {v.publishingLeaderShreds ? `${formatSolFromSol(v.projectedRewardMonthlySol)} SOL` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <p className="text-center text-sm text-cream-40 py-8">
                  No validators match your search.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3 max-h-[600px] overflow-y-auto">
        <p className="font-display text-sm tracking-wide text-cream">
          Epoch {rewards.epoch} Publishers
        </p>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-cream-40 py-8">
            No validators match your search.
          </p>
        )}
        {filtered.map((v) => (
          <Card
            key={v.nodePubkey}
            className={`bg-cream-5 border-cream-8 ${!v.publishingLeaderShreds ? "opacity-40" : ""}`}
          >
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-cream">
                    {v.validatorName || "Unknown"}
                  </p>
                  <p className="text-xs text-cream-30">{shortenPubkey(v.nodePubkey)}</p>
                </div>
                <StatusBadge publishing={v.publishingLeaderShreds} backup={v.isBackup} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-cream-40">Metro </span>
                  <span className="text-cream-60 uppercase">{v.dzMetroCode}</span>
                </div>
                <div>
                  <span className="text-cream-40">Stake </span>
                  <span className="text-cream-60 tabular-nums">
                    {formatNumber(v.activatedStake / LAMPORTS_PER_SOL, 0)} SOL
                  </span>
                </div>
                <div>
                  <span className="text-cream-40">Share </span>
                  <span className="text-cream-60 tabular-nums">
                    {v.publishingLeaderShreds ? formatPercent(v.stakeSharePercent / 100) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-cream-40">Slots </span>
                  <span className="text-cream-60 tabular-nums">{formatNumber(v.leaderSlots)}</span>
                </div>
              </div>
              {v.publishingLeaderShreds && (
                <div className="flex items-center justify-between pt-2 border-t border-cream-8 text-xs">
                  <span className="text-cream-40">Est. reward / epoch</span>
                  <span className="text-cream font-medium tabular-nums">
                    {formatSolFromSol(v.projectedRewardPerEpochSol, 4)} SOL
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Card className="bg-cream-5 border-cream-8">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-cream-40 mb-1">{label}</p>
        <p className="text-xl font-display text-cream">{value}</p>
        {note && <p className="text-xs text-cream-20 mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}
