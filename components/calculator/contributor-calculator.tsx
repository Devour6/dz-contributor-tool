"use client";

import { useState, useMemo } from "react";
import type { ParsedSnapshot, CityDemand } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatPercent,
  formatSolFromSol,
  formatNumber,
} from "@/lib/utils/format";
import {
  estimateNewContributorShare,
  findCoverageGaps,
} from "@/lib/utils/demand";
import {
  projectEarnings,
  computeFeeTrend,
} from "@/lib/utils/reward-estimator";
import { CONTRIBUTOR_SHARE } from "@/lib/constants/config";
import { ArrowRight, TrendingUp, TrendingDown, Minus, DollarSign, AlertTriangle } from "lucide-react";

interface ContributorCalculatorProps {
  snapshot: ParsedSnapshot;
  feeHistory: FeeHistory | undefined;
}

export function ContributorCalculator({
  snapshot,
  feeHistory,
}: ContributorCalculatorProps) {
  const [cityA, setCityA] = useState<string>("");
  const [cityZ, setCityZ] = useState<string>("");

  const activeCities = snapshot.cityDemands.filter((d) => d.totalSlots > 0);

  const totalDemand = useMemo(
    () => snapshot.cityDemands.reduce((sum, d) => sum + d.demandScore, 0),
    [snapshot]
  );

  const coverageGaps = useMemo(
    () => findCoverageGaps(snapshot.cityDemands),
    [snapshot]
  );

  const feeTrend = useMemo(
    () => (feeHistory ? computeFeeTrend(feeHistory) : null),
    [feeHistory]
  );

  // Estimate rewards for selected city pair
  const projection = useMemo(() => {
    if (!cityA || !cityZ || !feeHistory) return null;

    const demandA =
      snapshot.cityDemands.find((d) => d.locationCode === cityA)
        ?.demandScore || 0;
    const demandZ =
      snapshot.cityDemands.find((d) => d.locationCode === cityZ)
        ?.demandScore || 0;

    const share = estimateNewContributorShare(
      demandA,
      demandZ,
      totalDemand,
      snapshot.contributors.length
    );

    const earnings = projectEarnings(share, feeHistory);

    return {
      share,
      ...earnings,
    };
  }, [cityA, cityZ, feeHistory, snapshot, totalDemand]);

  return (
    <div className="space-y-6">
      {/* Mock data warning */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>All projections use historical fee data (epochs 859–938). DZ fees are currently paused and transitioning to a shred-based economy — actual future rewards will differ.</span>
      </div>

      {/* Link builder */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wide text-cream">
            Link Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-cream-40">City A</label>
              <Select
                value={cityA}
                onValueChange={(v) => setCityA(v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  {activeCities.map((d) => (
                    <SelectItem key={d.locationCode} value={d.locationCode}>
                      {d.locationName} ({d.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="size-4 text-cream-30 mb-2" />

            <div className="space-y-1.5">
              <label className="text-xs text-cream-40">City B</label>
              <Select
                value={cityZ}
                onValueChange={(v) => setCityZ(v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeCities
                    .filter((d) => d.locationCode !== cityA)
                    .map((d) => (
                      <SelectItem key={d.locationCode} value={d.locationCode}>
                        {d.locationName} ({d.country})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection */}
      {projection && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wide text-cream">
              Revenue Projection
              <span className="ml-2 text-xs text-amber-400 font-normal font-body">(estimated — mock data)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-cream-40 mb-1">Est. Reward Share</p>
                <p className="text-2xl font-display text-cream">
                  {formatPercent(projection.share)}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Per Epoch</p>
                <p className="text-2xl font-display text-cream">
                  {formatSolFromSol(projection.perEpochSol, 3)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Monthly Est.</p>
                <p className="text-2xl font-display text-cream">
                  {formatSolFromSol(projection.monthlySol)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Yearly Est.</p>
                <p className="text-2xl font-display text-cream">
                  {formatSolFromSol(projection.yearlySol)} SOL
                </p>
              </div>
            </div>

            {feeTrend && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-cream-40">Fee trend:</span>
                {feeTrend.direction === "growing" ? (
                  <>
                    <TrendingUp className="size-4 text-green" />
                    <span className="text-green">Growing</span>
                  </>
                ) : feeTrend.direction === "declining" ? (
                  <>
                    <TrendingDown className="size-4 text-red" />
                    <span className="text-red">Declining</span>
                  </>
                ) : (
                  <>
                    <Minus className="size-4 text-cream-30" />
                    <span className="text-cream-30">Stable</span>
                  </>
                )}
                <span className="text-cream-20">|</span>
                <span className="text-cream-40">
                  Avg fee: {formatSolFromSol(feeHistory?.averageFeeSol || 0)}{" "}
                  SOL/epoch
                </span>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-cream-5 border border-cream-8 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-cream-40" />
                <span className="text-sm text-cream-60">
                  Investment Context
                </span>
              </div>
              <p className="text-xs text-cream-30">
                Typical hardware cost per link: $60K–$130K depending on
                distance. These projections are estimates based on historical
                fee data and simplified demand modeling. Actual rewards depend
                on Shapley value computation across all contributor coalitions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee history summary */}
      {feeHistory && feeHistory.epochs.length > 0 && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wide text-cream">
              Fee History (Epochs {feeHistory.earliestEpoch}–
              {feeHistory.latestEpoch})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <p className="text-xs text-cream-40 mb-1">Total Epochs</p>
                <p className="text-lg text-cream">
                  {feeHistory.epochs.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Total Fees</p>
                <p className="text-lg text-cream">
                  {formatSolFromSol(feeHistory.totalFeeSol)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Average/Epoch</p>
                <p className="text-lg text-cream">
                  {formatSolFromSol(feeHistory.averageFeeSol)} SOL
                </p>
              </div>
            </div>

            {/* Mini fee chart using bars */}
            <div className="flex items-end gap-[2px] h-24">
              {feeHistory.epochs.slice(-40).map((e) => {
                const maxFee = Math.max(
                  ...feeHistory.epochs.slice(-40).map((ep) => ep.totalFeeSol)
                );
                const height =
                  maxFee > 0
                    ? (e.totalFeeSol / maxFee) * 100
                    : 0;
                return (
                  <div
                    key={e.solanaEpoch}
                    className="flex-1 rounded-t bg-cream-20 hover:bg-cream-40 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`Epoch ${e.solanaEpoch}: ${formatSolFromSol(e.totalFeeSol)} SOL`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-cream-20 mt-1">
              <span>
                Epoch{" "}
                {feeHistory.epochs.slice(-40)[0]?.solanaEpoch}
              </span>
              <span>
                Epoch{" "}
                {feeHistory.epochs[feeHistory.epochs.length - 1]?.solanaEpoch}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage gaps */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wide text-cream">
            Top Coverage Gaps (Underserved Routes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-cream-8 hover:bg-transparent">
                <TableHead className="text-cream-40">City A</TableHead>
                <TableHead className="text-cream-40">City B</TableHead>
                <TableHead className="text-cream-40 text-right">
                  Combined Links
                </TableHead>
                <TableHead className="text-cream-40 text-right">
                  Combined Demand
                </TableHead>
                <TableHead className="text-cream-40 text-right">
                  Gap Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverageGaps.slice(0, 15).map((gap, i) => (
                <TableRow key={i} className="border-cream-8">
                  <TableCell className="text-cream">
                    {gap.cityA.locationName}
                    <span className="text-cream-30 text-xs ml-1">
                      ({gap.cityA.country})
                    </span>
                  </TableCell>
                  <TableCell className="text-cream">
                    {gap.cityB.locationName}
                    <span className="text-cream-30 text-xs ml-1">
                      ({gap.cityB.country})
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-cream-60">
                    {gap.cityA.linkCount + gap.cityB.linkCount}
                  </TableCell>
                  <TableCell className="text-right text-cream-60">
                    {(gap.cityA.demandScore + gap.cityB.demandScore).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={
                        gap.score > 1
                          ? "bg-green/10 text-green border-green/20"
                          : gap.score > 0.1
                          ? "bg-amber/10 text-amber border-amber/20"
                          : "text-cream-40"
                      }
                    >
                      {gap.score.toFixed(4)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
