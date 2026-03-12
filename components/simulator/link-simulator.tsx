"use client";

import { useState, useMemo } from "react";
import type { ParsedSnapshot, Contributor, CityDemand } from "@/lib/types/contributor";
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
import { formatPercent, formatSolFromSol, formatNumber } from "@/lib/utils/format";
import { CONTRIBUTOR_SHARE } from "@/lib/constants/config";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LinkSimulatorProps {
  snapshot: ParsedSnapshot;
  feeHistory: FeeHistory | undefined;
}

export function LinkSimulator({ snapshot, feeHistory }: LinkSimulatorProps) {
  const [selectedContributor, setSelectedContributor] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const contributor = snapshot.contributors.find(
    (c) => c.code === selectedContributor
  );

  const link = contributor?.links.find((l) => l.pubkey === selectedLink);

  const avgFee = feeHistory?.averageFeeSol || 0;

  // Compute demand delta if a new destination is selected
  const rewardDelta = useMemo(() => {
    if (!contributor || !link || !selectedDestination) return null;

    const currentDemandA =
      snapshot.cityDemands.find(
        (d) => d.locationCode === link.sideA.locationCode
      )?.demandScore || 0;
    const currentDemandZ =
      snapshot.cityDemands.find(
        (d) => d.locationCode === link.sideZ.locationCode
      )?.demandScore || 0;
    const newDemand =
      snapshot.cityDemands.find(
        (d) => d.locationCode === selectedDestination
      )?.demandScore || 0;

    const currentAvg = (currentDemandA + currentDemandZ) / 2;
    const newAvg = (currentDemandA + newDemand) / 2; // keeping side A, switching side Z

    const totalDemand = snapshot.cityDemands.reduce(
      (sum, d) => sum + d.demandScore,
      0
    );

    if (totalDemand === 0) return null;

    // Estimate: how much does our share change?
    const currentValue = currentAvg;
    const newValue = newAvg;
    const shareChange = (newValue - currentValue) / totalDemand;
    const newShare = Math.max(0, contributor.estimatedShare + shareChange);

    return {
      currentShare: contributor.estimatedShare,
      newShare,
      shareChange,
      currentReward: contributor.estimatedShare * avgFee * CONTRIBUTOR_SHARE,
      newReward: newShare * avgFee * CONTRIBUTOR_SHARE,
    };
  }, [contributor, link, selectedDestination, snapshot, avgFee]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-cream-40">Contributor</label>
          <Select
            value={selectedContributor}
            onValueChange={(v) => {
              setSelectedContributor(v);
              setSelectedLink("");
              setSelectedDestination("");
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select contributor" />
            </SelectTrigger>
            <SelectContent>
              {snapshot.contributors
                .filter((c) => c.linkCount > 0)
                .sort((a, b) => b.linkCount - a.linkCount)
                .map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.linkCount} links)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {contributor && (
          <div className="space-y-1.5">
            <label className="text-xs text-cream-40">Link to Switch</label>
            <Select
              value={selectedLink}
              onValueChange={(v) => {
                setSelectedLink(v);
                setSelectedDestination("");
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select link" />
              </SelectTrigger>
              <SelectContent>
                {contributor.links.map((l) => (
                  <SelectItem key={l.pubkey} value={l.pubkey}>
                    {l.sideA.city || l.sideA.locationCode} →{" "}
                    {l.sideZ.city || l.sideZ.locationCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {link && (
          <div className="space-y-1.5">
            <label className="text-xs text-cream-40">New Destination</label>
            <Select
              value={selectedDestination}
              onValueChange={setSelectedDestination}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {snapshot.cityDemands
                  .filter((d) => d.locationCode !== link.sideZ.locationCode)
                  .map((d) => (
                    <SelectItem key={d.locationCode} value={d.locationCode}>
                      {d.locationName} ({d.country})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Current link info */}
      {link && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cream-60">Current Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-cream">
              <span>{link.sideA.city || link.sideA.locationCode}</span>
              <ArrowRight className="size-4 text-cream-30" />
              <span>{link.sideZ.city || link.sideZ.locationCode}</span>
              <Badge variant="secondary">{link.linkType}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward delta */}
      {rewardDelta && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cream-60">
              Estimated Reward Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-cream-40 mb-1">Current Share</p>
                <p className="text-lg text-cream">
                  {formatPercent(rewardDelta.currentShare)}
                </p>
                <p className="text-xs text-cream-30">
                  ~{formatSolFromSol(rewardDelta.currentReward)} SOL/epoch
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                {rewardDelta.shareChange > 0.0001 ? (
                  <TrendingUp className="size-6 text-green" />
                ) : rewardDelta.shareChange < -0.0001 ? (
                  <TrendingDown className="size-6 text-red" />
                ) : (
                  <Minus className="size-6 text-cream-30" />
                )}
                <span
                  className={`text-sm mt-1 ${
                    rewardDelta.shareChange > 0
                      ? "text-green"
                      : rewardDelta.shareChange < 0
                      ? "text-red"
                      : "text-cream-30"
                  }`}
                >
                  {rewardDelta.shareChange > 0 ? "+" : ""}
                  {formatPercent(rewardDelta.shareChange)}
                </span>
              </div>
              <div>
                <p className="text-xs text-cream-40 mb-1">Projected Share</p>
                <p className="text-lg text-cream">
                  {formatPercent(rewardDelta.newShare)}
                </p>
                <p className="text-xs text-cream-30">
                  ~{formatSolFromSol(rewardDelta.newReward)} SOL/epoch
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* City demand table */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-cream-60">
            City Demand Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-cream-8 hover:bg-transparent">
                <TableHead className="text-cream-40">City</TableHead>
                <TableHead className="text-cream-40">Country</TableHead>
                <TableHead className="text-cream-40 text-right">
                  Validators
                </TableHead>
                <TableHead className="text-cream-40 text-right">
                  Slots
                </TableHead>
                <TableHead className="text-cream-40 text-right">
                  Links
                </TableHead>
                <TableHead className="text-cream-40 text-right">
                  Demand Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.cityDemands
                .filter((d) => d.totalSlots > 0)
                .slice(0, 20)
                .map((d) => (
                  <TableRow key={d.locationCode} className="border-cream-8">
                    <TableCell className="text-cream">
                      {d.locationName}
                    </TableCell>
                    <TableCell className="text-cream-60">
                      {d.country}
                    </TableCell>
                    <TableCell className="text-right text-cream-60">
                      {formatNumber(d.validatorCount)}
                    </TableCell>
                    <TableCell className="text-right text-cream-60">
                      {formatNumber(d.totalSlots)}
                    </TableCell>
                    <TableCell className="text-right text-cream-60">
                      {d.linkCount}
                    </TableCell>
                    <TableCell className="text-right text-cream">
                      {d.demandScore >= 999
                        ? "Unserved"
                        : d.demandScore.toFixed(4)}
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
