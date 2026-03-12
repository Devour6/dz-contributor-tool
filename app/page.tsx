"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { StatsRibbon } from "@/components/stats-ribbon";
import { SectionHeading } from "@/components/section-heading";
import { NetworkMap } from "@/components/network-map";
import { ContributorGrid } from "@/components/contributors/contributor-grid";
import { LinkPlanner } from "@/components/planner/link-planner";
import { NetworkEconomics } from "@/components/economics/network-economics";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { useFees } from "@/lib/hooks/use-fees";
import { useEpochs } from "@/lib/hooks/use-epochs";
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

  const isLoading = epochsLoading || snapshotLoading;

  return (
    <div className="min-h-screen bg-dark">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 text-cream-30 animate-spin" />
              <p className="text-sm text-cream-40">
                Loading network data...
              </p>
            </div>
          </div>
        ) : snapshot ? (
          <>
            {/* Stats ribbon */}
            <StatsRibbon
              snapshot={snapshot}
              feeHistory={feeHistory}
              feesLoading={feesLoading}
              epochs={epochsData?.available || []}
              selectedEpoch={selectedEpoch}
              onEpochChange={setSelectedEpoch}
            />

            {/* Section 1: Network Map */}
            <section id="network" className="space-y-6">
              <SectionHeading
                title="The DoubleZero Network"
                subtitle={`A global fiber backbone connecting data centers across ${snapshot.locations.length}+ cities`}
              />
              <NetworkMap snapshot={snapshot} />
            </section>

            {/* Section 2: Contributors */}
            <section id="contributors" className="space-y-6">
              <SectionHeading
                title="Contributors"
                subtitle={`${snapshot.contributors.filter((c) => c.linkCount > 0).length} organizations building the network`}
              />
              <ContributorGrid
                contributors={snapshot.contributors}
                feeHistory={feeHistory}
              />
            </section>

            {/* Section 3: Plan Your Link */}
            <section id="plan" className="space-y-6">
              <SectionHeading
                title="Plan Your Link"
                subtitle="See where the network needs coverage and estimate your potential rewards"
              />
              <LinkPlanner
                snapshot={snapshot}
                feeHistory={feeHistory}
              />
            </section>

            {/* Section 4: Network Economics */}
            <section id="economics" className="space-y-6">
              <SectionHeading
                title="Network Economics"
                subtitle="Historical fee data and reward distribution"
              />
              <NetworkEconomics
                feeHistory={feeHistory}
                snapshot={snapshot}
              />
            </section>
          </>
        ) : (
          <div className="flex items-center justify-center py-32">
            <p className="text-sm text-cream-40">
              No data available. Try selecting a different epoch.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
