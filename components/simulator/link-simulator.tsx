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
import { CONTRIBUTOR_SHARE, getContributorDisplayName } from "@/lib/constants/config";
import { ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface LinkSimulatorProps {
  snapshot: ParsedSnapshot;
  feeHistory: FeeHistory | undefined;
}

export function LinkSimulator({ snapshot, feeHistory }: LinkSimulatorProps) {
  const [selectedContributor, setSelectedContributor] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<string>("");
  const [newOrigin, setNewOrigin] = useState<string>("");
  const [newDestination, setNewDestination] = useState<string>("");

  const contributor = snapshot.contributors.find(
    (c) => c.code === selectedContributor
  );

  const link = contributor?.links.find((l) => l.pubkey === selectedLink);

  const avgFee = feeHistory?.averageFeeSol || 0;

  // Pre-fill new origin/destination when a link is selected
  const handleLinkChange = (pubkey: string) => {
    setSelectedLink(pubkey);
    const l = contributor?.links.find((lk) => lk.pubkey === pubkey);
    if (l) {
      setNewOrigin(l.sideA.locationCode);
      setNewDestination(l.sideZ.locationCode);
    } else {
      setNewOrigin("");
      setNewDestination("");
    }
  };

  // Compute demand delta when either endpoint changes
  const rewardDelta = useMemo(() => {
    if (!contributor || !link || !newOrigin || !newDestination) return null;

    const currentDemandA =
      snapshot.cityDemands.find(
        (d) => d.locationCode === link.sideA.locationCode
      )?.demandScore || 0;
    const currentDemandZ =
      snapshot.cityDemands.find(
        (d) => d.locationCode === link.sideZ.locationCode
      )?.demandScore || 0;
    const newDemandA =
      snapshot.cityDemands.find(
        (d) => d.locationCode === newOrigin
      )?.demandScore || 0;
    const newDemandZ =
      snapshot.cityDemands.find(
        (d) => d.locationCode === newDestination
      )?.demandScore || 0;

    const currentAvg = (currentDemandA + currentDemandZ) / 2;
    const newAvg = (newDemandA + newDemandZ) / 2;

    const totalDemand = snapshot.cityDemands.reduce(
      (sum, d) => sum + d.demandScore,
      0
    );

    if (totalDemand === 0) return null;

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
  }, [contributor, link, newOrigin, newDestination, snapshot, avgFee]);

  return (
    <div className="space-y-6">
      {/* Mock data warning */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>Reward estimates use historical fee data (epochs 859–938). DZ fees are currently paused — projections are illustrative only.</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-cream-40">Contributor</label>
          <Select
            value={selectedContributor}
            onValueChange={(v) => {
              setSelectedContributor(v);
              setSelectedLink("");
              setNewOrigin("");
              setNewDestination("");
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select contributor" />
            </SelectTrigger>
            <SelectContent>
              {snapshot.contributors
                .filter((c) => c.linkCount > 0)
                .sort((a, b) => b.linkCount - a.linkCount)
                .map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {getContributorDisplayName(c.code)} ({c.linkCount} links)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {contributor && (
          <div className="space-y-1.5">
            <label className="text-xs text-cream-40">Current Link</label>
            <Select
              value={selectedLink}
              onValueChange={handleLinkChange}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select link to modify" />
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
      </div>

      {/* New origin + new destination selectors */}
      {link && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cream-60">Modify Link Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-cream-40">New Origin</label>
                <Select value={newOrigin} onValueChange={setNewOrigin}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshot.cityDemands.map((d) => (
                      <SelectItem key={d.locationCode} value={d.locationCode}>
                        {d.locationName} ({d.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="size-4 text-cream-30 mb-2" />

              <div className="space-y-1.5">
                <label className="text-xs text-cream-40">New Destination</label>
                <Select value={newDestination} onValueChange={setNewDestination}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshot.cityDemands
                      .filter((d) => d.locationCode !== newOrigin)
                      .map((d) => (
                        <SelectItem key={d.locationCode} value={d.locationCode}>
                          {d.locationName} ({d.country})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 text-xs text-cream-20">
              Currently: {link.sideA.city || link.sideA.locationCode} → {link.sideZ.city || link.sideZ.locationCode}
              <Badge variant="secondary" className="ml-2">{link.linkType}</Badge>
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
              <span className="ml-2 text-xs text-amber-400 font-normal">(mock data)</span>
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
