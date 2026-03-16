"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ParsedSnapshot } from "@/lib/types/contributor";
import type { FeeHistory } from "@/lib/types/fees";
import type { SimulateResponse } from "@/lib/types/shapley";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getContributorDisplayName,
  getContributorColor,
  CONTRIBUTOR_SHARE,
  FEE_EPOCH_START,
  FEE_EPOCH_END,
} from "@/lib/constants/config";
import { findCoverageGaps } from "@/lib/utils/demand";
import {
  formatPercent,
  formatSolFromSol,
} from "@/lib/utils/format";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  X,
  Plus,
  Zap,
} from "lucide-react";

const NEW_CONTRIBUTOR_VALUE = "__new__";

interface SimulateTabProps {
  snapshot: ParsedSnapshot;
  feeHistory: FeeHistory | undefined;
  selectedEpoch: number | null;
}

/**
 * Round a 0-1 ratio to a percentage with `decimals` digits, returning the number.
 * e.g. roundPct(0.062149, 2) = 6.21
 */
function roundPct(ratio: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(ratio * 100 * factor) / factor;
}

/**
 * Format a pre-rounded percentage number as a string.
 */
function fmtPct(pct: number, decimals = 2): string {
  return pct.toFixed(decimals) + "%";
}

/**
 * Round a SOL amount for display, keeping full precision until this point.
 */
function roundSol(sol: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(sol * factor) / factor;
}

export function SimulateTab({ snapshot, feeHistory, selectedEpoch }: SimulateTabProps) {
  const [contributorCode, setContributorCode] = useState<string>("");
  const [removedLinks, setRemovedLinks] = useState<Set<string>>(new Set());
  const [addedLinks, setAddedLinks] = useState<Array<{ cityA: string; cityZ: string }>>([]);
  const [newCityA, setNewCityA] = useState("");
  const [newCityZ, setNewCityZ] = useState("");
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to results when they arrive
  useEffect(() => {
    if (simResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [simResult]);

  const isNewContributor = contributorCode === NEW_CONTRIBUTOR_VALUE;
  const contributor = isNewContributor
    ? null
    : snapshot.contributors.find((c) => c.code === contributorCode);

  const sortedContributors = useMemo(
    () =>
      [...snapshot.contributors]
        .filter((c) => c.linkCount > 0)
        .sort((a, b) => b.linkCount - a.linkCount),
    [snapshot]
  );

  const activeCities = useMemo(
    () =>
      snapshot.cityDemands
        .filter((d) => d.totalSlots > 0)
        .sort((a, b) => b.demandScore - a.demandScore),
    [snapshot]
  );

  const coverageGaps = useMemo(
    () => findCoverageGaps(snapshot.cityDemands, 5),
    [snapshot]
  );

  const demandThresholds = useMemo(() => {
    const scores = activeCities
      .map((d) => d.demandScore)
      .filter((s) => s < 999 && s > 0)
      .sort((a, b) => a - b);
    if (scores.length === 0) return { high: 0.5, moderate: 0.1 };
    const p75 = scores[Math.floor(scores.length * 0.75)];
    const p25 = scores[Math.floor(scores.length * 0.25)];
    return { high: p75, moderate: p25 };
  }, [activeCities]);

  const demandLabel = (score: number) => {
    if (score >= 999) return { text: "Unserved", cls: "text-green" };
    if (score > demandThresholds.high) return { text: "High demand", cls: "text-green" };
    if (score > demandThresholds.moderate) return { text: "Moderate", cls: "text-amber" };
    if (score === 0) return { text: "No demand", cls: "text-cream-20" };
    return { text: "Well covered", cls: "text-cream-30" };
  };

  const hasChanges = isNewContributor
    ? addedLinks.length > 0
    : removedLinks.size > 0 || addedLinks.length > 0;
  const avgFee = feeHistory?.averageFeeSol || 0;

  const handleContributorChange = (code: string) => {
    setContributorCode(code);
    setRemovedLinks(new Set());
    setAddedLinks([]);
    setSimResult(null);
    setSimError(null);
    setNewCityA("");
    setNewCityZ("");
  };

  const toggleLink = (pubkey: string) => {
    setRemovedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(pubkey)) {
        next.delete(pubkey);
      } else {
        next.add(pubkey);
      }
      return next;
    });
    setSimResult(null);
  };

  const addLink = () => {
    if (!newCityA || !newCityZ || newCityA === newCityZ) return;
    setAddedLinks((prev) => [...prev, { cityA: newCityA, cityZ: newCityZ }]);
    setNewCityA("");
    setNewCityZ("");
    setSimResult(null);
  };

  const removeAddedLink = (index: number) => {
    setAddedLinks((prev) => prev.filter((_, i) => i !== index));
    setSimResult(null);
  };

  const handleSimulate = async () => {
    if (!selectedEpoch || !contributorCode) return;
    setSimLoading(true);
    setSimError(null);
    try {
      const apiCode = isNewContributor ? `new_contributor_sim` : contributorCode;
      const res = await fetch("/api/shapley/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epoch: selectedEpoch,
          contributorCode: apiCode,
          removeLinks: isNewContributor ? [] : Array.from(removedLinks),
          addLinks: addedLinks,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data: SimulateResponse = await res.json();
      setSimResult(data);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const getCityName = (locationCode: string) => {
    const city = snapshot.cityDemands.find((d) => d.locationCode === locationCode);
    return city ? `${city.locationName}` : locationCode;
  };

  // --- Consistent rounding for results ---
  // Round before & after from full precision, then derive delta from the rounded values.
  // This ensures before + delta = after visually.
  const results = useMemo(() => {
    if (!simResult) return null;
    const beforePct = roundPct(simResult.before.share);
    const afterPct = roundPct(simResult.after.share);
    const deltaPct = Math.round((afterPct - beforePct) * 100) / 100; // keep 2 decimals

    // SOL: compute from full-precision shares, round only at display
    const beforeSolEpoch = simResult.before.share * avgFee * CONTRIBUTOR_SHARE;
    const afterSolEpoch = simResult.after.share * avgFee * CONTRIBUTOR_SHARE;
    const deltaSolEpoch = afterSolEpoch - beforeSolEpoch;

    return {
      beforePct, afterPct, deltaPct,
      beforeSolEpoch: roundSol(beforeSolEpoch),
      afterSolEpoch: roundSol(afterSolEpoch),
      deltaSolEpoch: roundSol(deltaSolEpoch),
      beforeSolMonthly: roundSol(beforeSolEpoch * 12, 2),
      afterSolMonthly: roundSol(afterSolEpoch * 12, 2),
      beforeSolYearly: roundSol(beforeSolEpoch * 144, 2),
      afterSolYearly: roundSol(afterSolEpoch * 144, 2),
    };
  }, [simResult, avgFee]);

  const showExistingLinks = contributor && !isNewContributor;
  const showAddLinks = contributorCode !== "";

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-lg bg-amber/5 border border-amber/20 px-3 py-2 text-xs text-amber">
        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
        <span>
          Simulations use Shapley value analysis with historical fee averages (epochs{" "}
          {FEE_EPOCH_START}–{FEE_EPOCH_END}). No fees are currently being collected — results
          are projections based on the upcoming 45/45/10 reward split.
        </span>
      </div>

      {/* Step 1: Contributor selector */}
      <Card className="bg-cream-5 border-cream-8">
        <CardHeader>
          <CardTitle className="font-display text-sm tracking-wide text-cream">
            Select your contributor
          </CardTitle>
          <CardDescription className="text-cream-40">
            Choose an existing operator or simulate as a new contributor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={contributorCode} onValueChange={handleContributorChange}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Choose a contributor..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_CONTRIBUTOR_VALUE}>
                <span className="flex items-center gap-2">
                  <Plus className="size-3 text-green" />
                  <span className="text-green">New contributor</span>
                </span>
              </SelectItem>
              {sortedContributors.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full inline-block"
                      style={{ backgroundColor: getContributorColor(c.code) }}
                    />
                    {getContributorDisplayName(c.code)}
                    <span className="text-cream-30 ml-1">{c.linkCount} links</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Current links with remove toggles (only for existing contributors) */}
      {showExistingLinks && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm tracking-wide text-cream">
                Current links
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {contributor.linkCount - removedLinks.size} of {contributor.linkCount} active
              </Badge>
            </div>
            <CardDescription className="text-cream-40">
              Toggle off links to simulate removing them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {contributor.links.map((link) => {
                const isRemoved = removedLinks.has(link.pubkey);
                return (
                  <button
                    key={link.pubkey}
                    onClick={() => toggleLink(link.pubkey)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      isRemoved
                        ? "border-red/20 bg-red/5 opacity-50"
                        : "border-cream-8 bg-cream-3 hover:border-cream-15"
                    }`}
                  >
                    <div
                      className={`size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isRemoved
                          ? "border-red/40 bg-red/20"
                          : "border-cream-15 bg-transparent"
                      }`}
                    >
                      {isRemoved && <X className="size-3 text-red" />}
                    </div>
                    <span className={`flex-1 ${isRemoved ? "line-through text-cream-30" : "text-cream-60"}`}>
                      {link.sideA.city || link.sideA.locationCode}
                    </span>
                    <ArrowRight className="size-3 text-cream-20 shrink-0" />
                    <span className={`flex-1 ${isRemoved ? "line-through text-cream-30" : "text-cream-60"}`}>
                      {link.sideZ.city || link.sideZ.locationCode}
                    </span>
                    <span className="text-xs text-cream-20 shrink-0">
                      {link.bandwidthGbps}G
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Add new links */}
      {showAddLinks && (
        <Card className="bg-cream-5 border-cream-8">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wide text-cream">
              {isNewContributor ? "Your links" : "Add new links"}
            </CardTitle>
            <CardDescription className="text-cream-40">
              {isNewContributor
                ? "Add the fiber routes you plan to contribute to the network"
                : "Simulate adding new fiber routes to the network"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coverage gap suggestions */}
            {coverageGaps.length > 0 && (
              <div>
                <p className="text-xs text-cream-30 mb-2">Suggested routes:</p>
                <div className="flex flex-wrap gap-2">
                  {coverageGaps.map((gap, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAddedLinks((prev) => [
                          ...prev,
                          { cityA: gap.cityA.locationCode, cityZ: gap.cityB.locationCode },
                        ]);
                        setSimResult(null);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-cream-8 hover:border-cream-20 px-2.5 py-1 text-xs text-cream-60 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Zap className="size-3 text-amber" />
                      {gap.cityA.locationName}
                      <ArrowRight className="size-2.5 text-cream-20" />
                      {gap.cityB.locationName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* City pair selectors */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-cream-40">Origin</label>
                <Select value={newCityA} onValueChange={setNewCityA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCities.map((d) => {
                      const dl = demandLabel(d.demandScore);
                      return (
                        <SelectItem key={d.locationCode} value={d.locationCode}>
                          {d.locationName}, {d.country}
                          <span className={`ml-2 text-xs ${dl.cls}`}>{dl.text}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="size-4 text-cream-30 mb-2 hidden sm:block shrink-0" />
              <div className="space-y-1.5 flex-1">
                <label className="text-xs text-cream-40">Destination</label>
                <Select value={newCityZ} onValueChange={setNewCityZ}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCities
                      .filter((d) => d.locationCode !== newCityA)
                      .map((d) => {
                        const dl = demandLabel(d.demandScore);
                        return (
                          <SelectItem key={d.locationCode} value={d.locationCode}>
                            {d.locationName}, {d.country}
                            <span className={`ml-2 text-xs ${dl.cls}`}>{dl.text}</span>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={addLink}
                disabled={!newCityA || !newCityZ || newCityA === newCityZ}
                className="rounded-lg bg-cream-8 border border-cream-15 px-4 py-2 text-sm text-cream-60 hover:text-cream hover:bg-cream-10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-4 inline mr-1" />
                Add
              </button>
            </div>

            {/* Added links list */}
            {addedLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-cream-30">
                  {isNewContributor ? "Your planned links:" : "Links to add:"}
                </p>
                {addedLinks.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-green/20 bg-green/5 px-3 py-2 text-sm"
                  >
                    <Plus className="size-3.5 text-green shrink-0" />
                    <span className="text-cream-60">{getCityName(link.cityA)}</span>
                    <ArrowRight className="size-3 text-cream-20 shrink-0" />
                    <span className="text-cream-60">{getCityName(link.cityZ)}</span>
                    <button
                      onClick={() => removeAddedLink(i)}
                      aria-label="Remove link"
                      className="ml-auto text-cream-30 hover:text-cream transition-colors rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Calculate button */}
      {showAddLinks && (
        <button
          onClick={handleSimulate}
          disabled={!hasChanges || simLoading}
          className="w-full rounded-lg bg-cream text-dark font-display text-sm tracking-wide py-3 transition-all hover:bg-cream-80 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {simLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Computing Shapley values...
            </span>
          ) : (
            "Calculate Impact"
          )}
        </button>
      )}

      {/* Error */}
      {simError && (
        <div className="rounded-lg bg-red/5 border border-red/20 px-3 py-2 text-xs text-red">
          {simError}
        </div>
      )}

      {/* Step 5: Results */}
      {simResult && results && (
        <Card ref={resultsRef} className="bg-cream-5 border-cream-8">
          <CardHeader>
            <CardTitle className="font-display text-sm tracking-wide text-cream">
              Simulation results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Before / Delta / After comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Before */}
              <div className="rounded-xl bg-cream-3 border border-cream-8 p-4 text-center">
                <p className="text-xs text-cream-40 mb-1">
                  {isNewContributor ? "Before you join" : "Current share"}
                </p>
                <p className="text-2xl font-display text-cream">
                  {fmtPct(results.beforePct)}
                </p>
                {avgFee > 0 && (
                  <p className="text-xs text-cream-30 mt-1">
                    ~{formatSolFromSol(results.beforeSolEpoch, 3)} SOL/epoch
                  </p>
                )}
              </div>

              {/* Delta — derived from rounded before/after so arithmetic is visually consistent */}
              <div className="rounded-xl bg-cream-3 border border-cream-8 p-4 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-cream-40 mb-1">Change</p>
                <div className="flex items-center gap-1">
                  {results.deltaPct > 0.001 ? (
                    <ArrowUpRight className="size-5 text-green" />
                  ) : results.deltaPct < -0.001 ? (
                    <ArrowDownRight className="size-5 text-red" />
                  ) : (
                    <Minus className="size-5 text-cream-30" />
                  )}
                  <span
                    className={`text-2xl font-display ${
                      results.deltaPct > 0.001
                        ? "text-green"
                        : results.deltaPct < -0.001
                        ? "text-red"
                        : "text-cream-30"
                    }`}
                  >
                    {results.deltaPct > 0 ? "+" : ""}
                    {fmtPct(results.deltaPct)}
                  </span>
                </div>
                {avgFee > 0 && (
                  <p className="text-xs text-cream-30 mt-1">
                    {results.deltaSolEpoch >= 0 ? "+" : ""}
                    {formatSolFromSol(results.deltaSolEpoch, 3)} SOL/epoch
                  </p>
                )}
              </div>

              {/* After */}
              <div className="rounded-xl bg-cream-3 border border-cream-8 p-4 text-center">
                <p className="text-xs text-cream-40 mb-1">Projected share</p>
                <p className="text-2xl font-display text-cream">
                  {fmtPct(results.afterPct)}
                </p>
                {avgFee > 0 && (
                  <p className="text-xs text-cream-30 mt-1">
                    ~{formatSolFromSol(results.afterSolEpoch, 3)} SOL/epoch
                  </p>
                )}
              </div>
            </div>

            {/* Monthly/Yearly projections */}
            {avgFee > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cream-3 border border-cream-8 p-4 text-center">
                  <p className="text-xs text-cream-40 mb-1">Projected monthly</p>
                  <p className="text-lg font-display text-cream">
                    {formatSolFromSol(results.afterSolMonthly)} SOL
                  </p>
                  {!isNewContributor && (
                    <p className="text-xs text-cream-20 mt-0.5">
                      was {formatSolFromSol(results.beforeSolMonthly)} SOL
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-cream-3 border border-cream-8 p-4 text-center">
                  <p className="text-xs text-cream-40 mb-1">Projected yearly</p>
                  <p className="text-lg font-display text-cream">
                    {formatSolFromSol(results.afterSolYearly)} SOL
                  </p>
                  {!isNewContributor && (
                    <p className="text-xs text-cream-20 mt-0.5">
                      was {formatSolFromSol(results.beforeSolYearly)} SOL
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Impact on other contributors */}
            <div>
              <p className="text-xs text-cream-40 mb-2">Impact on all contributors</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {simResult.allContributors
                  .filter((c) => c.beforeShare > 0 || c.afterShare > 0)
                  .sort((a, b) => b.afterShare - a.afterShare)
                  .map((c) => {
                    const bPct = roundPct(c.beforeShare);
                    const aPct = roundPct(c.afterShare);
                    const dPct = Math.round((aPct - bPct) * 100) / 100;
                    const apiCode = isNewContributor ? "new_contributor_sim" : contributorCode;
                    const isTarget = c.code === apiCode;
                    return (
                      <div
                        key={c.code}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                          isTarget ? "bg-cream-8" : ""
                        }`}
                      >
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: getContributorColor(c.code) }}
                        />
                        <span className={`flex-1 ${isTarget ? "text-cream font-medium" : "text-cream-60"}`}>
                          {c.code === "new_contributor_sim" ? "You (new)" : getContributorDisplayName(c.code)}
                        </span>
                        <span className="text-cream-40 tabular-nums">
                          {fmtPct(bPct)}
                        </span>
                        <ArrowRight className="size-2.5 text-cream-20" />
                        <span className="text-cream-60 tabular-nums">
                          {fmtPct(aPct)}
                        </span>
                        <span
                          className={`tabular-nums w-16 text-right ${
                            dPct > 0.001
                              ? "text-green"
                              : dPct < -0.001
                              ? "text-red"
                              : "text-cream-20"
                          }`}
                        >
                          {dPct > 0 ? "+" : ""}
                          {fmtPct(dPct)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <p className="text-xs text-cream-20 text-center">
              Based on Shapley value analysis with historical fee averages (epochs{" "}
              {FEE_EPOCH_START}–{FEE_EPOCH_END}).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
