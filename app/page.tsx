"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { StatsRibbon } from "@/components/stats-ribbon";
import { SectionHeading } from "@/components/section-heading";
import { NetworkMap } from "@/components/network-map";
import { ContributorGrid } from "@/components/contributors/contributor-grid";
import { LinkPlanner } from "@/components/planner/link-planner";
import { ValidatorRewards } from "@/components/validators/validator-rewards";
import { NetworkEconomics } from "@/components/economics/network-economics";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { useFees } from "@/lib/hooks/use-fees";
import { useEpochs } from "@/lib/hooks/use-epochs";
import { usePublishers } from "@/lib/hooks/use-publishers";
import { useShapleyValues } from "@/lib/hooks/use-shapley";
import { computeValidatorRewards } from "@/lib/utils/reward-estimator";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: epochsData, isLoading: epochsLoading } = useEpochs();
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);

  useEffect(() => {
    if (epochsData?.latest && selectedEpoch === null) {
      setSelectedEpoch(epochsData.latest);
    }
  }, [epochsData, selectedEpoch]);

  const { data: snapshot, isLoading: snapshotLoading } =
    useSnapshot(selectedEpoch);
  const { data: feeHistory, isLoading: feesLoading } = useFees();
  const { data: publisherData, isLoading: publishersLoading } = usePublishers();

  const { data: shapleyData, isLoading: shapleyLoading } =
    useShapleyValues(selectedEpoch);

  const validatorRewards = useMemo(() => {
    if (!publisherData || !feeHistory) return null;
    return computeValidatorRewards(publisherData, feeHistory.averageFeeSol);
  }, [publisherData, feeHistory]);

  // Merge Shapley values into snapshot when available
  const enrichedSnapshot = useMemo(() => {
    if (!snapshot) return undefined;
    if (!shapleyData?.values) return snapshot;

    return {
      ...snapshot,
      contributors: snapshot.contributors.map((c) => {
        const shapley = shapleyData.values[c.code];
        return {
          ...c,
          estimatedShare: shapley?.share ?? c.estimatedShare,
        };
      }),
    };
  }, [snapshot, shapleyData]);

  const isLoading = epochsLoading || snapshotLoading;

  return (
    <div className="min-h-screen bg-dark">
      <Header />

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-cream-30 animate-spin" />
            <p className="text-sm text-cream-40">
              Loading network data...
            </p>
          </div>
        </div>
      ) : enrichedSnapshot ? (
        <>
          {/* Hero: Network Map — full width, first thing after header */}
          <section id="network" className="px-6 pt-4 pb-8 mx-auto max-w-7xl">
            <SectionHeading
              title="The DoubleZero Network"
            />
            <div className="mt-4">
              <NetworkMap snapshot={enrichedSnapshot} />
            </div>
          </section>

          {/* Rest of page */}
          <main className="mx-auto max-w-7xl px-6 pb-6 space-y-16">
            {/* Stats ribbon — below the hero map */}
            <StatsRibbon
              snapshot={enrichedSnapshot}
              feeHistory={feeHistory}
              feesLoading={feesLoading}
              epochs={epochsData?.available || []}
              selectedEpoch={selectedEpoch}
              onEpochChange={setSelectedEpoch}
            />

            {/* Section 2: Contributors */}
            <section id="contributors" className="space-y-6">
              <SectionHeading
                title="Contributors"
                subtitle={`${enrichedSnapshot.contributors.filter((c) => c.linkCount > 0).length} organizations building the network`}
              />
              <ContributorGrid
                contributors={enrichedSnapshot.contributors}
                feeHistory={feeHistory}
                shapleyLoaded={!!shapleyData?.values}
              />
            </section>

            {/* Section 3: Plan Your Link */}
            <section id="plan" className="space-y-6">
              <SectionHeading
                title="Plan Your Link"
                subtitle="See where the network needs coverage and estimate your potential rewards"
              />
              <LinkPlanner
                snapshot={enrichedSnapshot}
                feeHistory={feeHistory}
              />
            </section>

            {/* Section 4: Validator Rewards */}
            <section id="validators" className="space-y-6">
              <SectionHeading
                title="Validator Rewards"
                subtitle="Current epoch publishers and projected reward distribution under the 45/45/10 split"
              />
              <ValidatorRewards
                rewards={validatorRewards}
                isLoading={publishersLoading || feesLoading}
              />
            </section>

            {/* Section 5: Network Economics */}
            <section id="economics" className="space-y-6">
              <SectionHeading
                title="Network Economics"
                subtitle="Historical fee data and reward distribution"
              />
              <NetworkEconomics
                feeHistory={feeHistory}
                snapshot={enrichedSnapshot}
              />
            </section>
          </main>
        </>
      ) : (
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-2">
            <p className="text-sm text-cream-40">
              No snapshot data available for this epoch.
            </p>
            <p className="text-xs text-cream-30">
              Try selecting a more recent epoch from the selector above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
