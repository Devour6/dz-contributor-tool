"use client";

import { useState, useMemo } from "react";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  estimateNewContributorShare,
  findCoverageGaps,
} from "@/lib/utils/demand";
import { projectEarnings } from "@/lib/utils/reward-estimator";
import { formatPercent, formatSolFromSol } from "@/lib/utils/format";
import { FEE_EPOCH_START, FEE_EPOCH_END } from "@/lib/constants/config";
import { ArrowRight, Zap } from "lucide-react";

interface LinkPlannerProps {
  snapshot: ParsedSnapshot;
  feeHistory: FeeHistory | undefined;
}

export function LinkPlanner({ snapshot, feeHistory }: LinkPlannerProps) {
  const [cityA, setCityA] = useState<string>("");
  const [cityZ, setCityZ] = useState<string>("");

  const activeCities = snapshot.cityDemands
    .filter((d) => d.totalSlots > 0)
    .sort((a, b) => b.demandScore - a.demandScore);

  const coverageGaps = useMemo(
    () => findCoverageGaps(snapshot.cityDemands, 5),
    [snapshot]
  );

  const totalDemand = useMemo(
    () => snapshot.cityDemands.reduce((sum, d) => sum + d.demandScore, 0),
    [snapshot]
  );

  const projection = useMemo(() => {
    if (!cityA || !cityZ || !feeHistory) return null;
    const demandA =
      snapshot.cityDemands.find((d) => d.locationCode === cityA)?.demandScore ||
      0;
    const demandZ =
      snapshot.cityDemands.find((d) => d.locationCode === cityZ)?.demandScore ||
      0;
    const share = estimateNewContributorShare(
      demandA,
      demandZ,
      totalDemand,
      snapshot.contributors.length
    );
    const earnings = projectEarnings(share, feeHistory);
    return { share, ...earnings };
  }, [cityA, cityZ, feeHistory, snapshot, totalDemand]);

  // Demand level label
  const demandLabel = (score: number) => {
    if (score >= 999) return { text: "Unserved", cls: "text-green" };
    if (score > 0.5) return { text: "High demand", cls: "text-green" };
    if (score > 0.1) return { text: "Moderate", cls: "text-amber" };
    return { text: "Well covered", cls: "text-cream-30" };
  };

  return (
    <div className="space-y-6">
      {/* Coverage gap suggestions */}
      <div>
        <p className="text-sm text-cream-40 mb-3">
          Top opportunities based on network coverage gaps:
        </p>
        <div className="flex flex-wrap gap-2">
          {coverageGaps.map((gap, i) => (
            <button
              key={i}
              onClick={() => {
                setCityA(gap.cityA.locationCode);
                setCityZ(gap.cityB.locationCode);
              }}
              className="flex items-center gap-2 rounded-full border border-cream-8 hover:border-cream-20 px-3 py-1.5 text-sm text-cream-60 transition-colors"
            >
              <Zap className="size-3 text-amber" />
              {gap.cityA.locationName}
              <ArrowRight className="size-3 text-cream-20" />
              {gap.cityB.locationName}
            </button>
          ))}
        </div>
      </div>

      {/* City selectors */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wide text-cream">
            Where would you build your link?
          </CardTitle>
          <CardDescription className="text-cream-40">
            Pick two cities to see estimated rewards for that route
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-cream-40">Origin city</label>
              <Select value={cityA} onValueChange={setCityA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCities.map((d) => {
                    const dl = demandLabel(d.demandScore);
                    return (
                      <SelectItem key={d.locationCode} value={d.locationCode}>
                        {d.locationName}, {d.country}
                        <span className={`ml-2 text-xs ${dl.cls}`}>
                          {dl.text}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="size-4 text-cream-30 mb-2 hidden sm:block" />

            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-cream-40">Destination city</label>
              <Select value={cityZ} onValueChange={setCityZ}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCities
                    .filter((d) => d.locationCode !== cityA)
                    .map((d) => {
                      const dl = demandLabel(d.demandScore);
                      return (
                        <SelectItem
                          key={d.locationCode}
                          value={d.locationCode}
                        >
                          {d.locationName}, {d.country}
                          <span className={`ml-2 text-xs ${dl.cls}`}>
                            {dl.text}
                          </span>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {projection && (
        <Card className="bg-cream-5 border-cream-8">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <p className="text-cream-60 text-sm mb-1">
                Estimated reward share for this route
              </p>
              <p className="text-4xl font-display text-cream">
                {formatPercent(projection.share)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-cream-5 border border-cream-8 p-4">
                <p className="text-xs text-cream-40 mb-1">Per Epoch</p>
                <p className="text-lg font-display text-cream">
                  {formatSolFromSol(projection.perEpochSol, 3)} SOL
                </p>
              </div>
              <div className="rounded-xl bg-cream-5 border border-cream-8 p-4">
                <p className="text-xs text-cream-40 mb-1">Monthly</p>
                <p className="text-lg font-display text-cream">
                  {formatSolFromSol(projection.monthlySol)} SOL
                </p>
              </div>
              <div className="rounded-xl bg-cream-5 border border-cream-8 p-4">
                <p className="text-xs text-cream-40 mb-1">Yearly</p>
                <p className="text-lg font-display text-cream">
                  {formatSolFromSol(projection.yearlySol)} SOL
                </p>
              </div>
            </div>

            <p className="text-xs text-cream-20 text-center mt-4">
              Based on historical fee averages (epochs {FEE_EPOCH_START}–{FEE_EPOCH_END}). Fees are
              currently paused.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
