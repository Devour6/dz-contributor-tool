"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { StatsRibbon } from "@/components/stats-ribbon";
import { SectionHeading } from "@/components/section-heading";
import { NetworkMap } from "@/components/network-map";
import { ContributorGrid } from "@/components/contributors/contributor-grid";
import { SimulateTab } from "@/components/simulator/simulate-tab";
import { ValidatorRewards } from "@/components/validators/validator-rewards";
import { NetworkEconomics } from "@/components/economics/network-economics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { useFees } from "@/lib/hooks/use-fees";
import { useEpochs } from "@/lib/hooks/use-epochs";
import { usePublishers } from "@/lib/hooks/use-publishers";
import { useShapleyValues } from "@/lib/hooks/use-shapley";
import { computeValidatorRewards } from "@/lib/utils/reward-estimator";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("network");
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-dark">
      <Header activeTab={activeTab} onTabChange={handleTabChange} />

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
        <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-6">
          {/* Compact context bar — always visible */}
          <StatsRibbon
            snapshot={enrichedSnapshot}
            feeHistory={feeHistory}
            feesLoading={feesLoading}
            epochs={epochsData?.available || []}
            selectedEpoch={selectedEpoch}
            onEpochChange={setSelectedEpoch}
          />

          {/* Tabs — each section gets full viewport */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4 sm:mt-6">
            {/* Mobile tab strip */}
            <TabsList variant="line" className="sm:hidden w-full overflow-x-auto mb-4">
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="simulate">Simulate</TabsTrigger>
              <TabsTrigger value="validators">Validators</TabsTrigger>
              <TabsTrigger value="economics">Economics</TabsTrigger>
            </TabsList>

            <TabsContent value="network">
              <section className="space-y-4">
                <SectionHeading title="The DoubleZero Network" />
                <NetworkMap snapshot={enrichedSnapshot} />
              </section>
            </TabsContent>

            <TabsContent value="contributors">
              <section className="space-y-6">
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
            </TabsContent>

            <TabsContent value="simulate">
              <section className="space-y-6">
                <SectionHeading
                  title="Simulate"
                  subtitle="Model link changes and see Shapley-based reward impact"
                />
                <SimulateTab
                  snapshot={enrichedSnapshot}
                  feeHistory={feeHistory}
                  selectedEpoch={selectedEpoch}
                />
              </section>
            </TabsContent>

            <TabsContent value="validators">
              <section className="space-y-6">
                <SectionHeading
                  title="Validator Rewards"
                  subtitle="Current epoch publishers and projected reward distribution under the 45/45/10 split"
                />
                <ValidatorRewards
                  rewards={validatorRewards}
                  isLoading={publishersLoading || feesLoading}
                />
              </section>
            </TabsContent>

            <TabsContent value="economics">
              <section className="space-y-6">
                <SectionHeading
                  title="Network Economics"
                  subtitle="Historical fee data and reward distribution"
                />
                <NetworkEconomics
                  feeHistory={feeHistory}
                  snapshot={enrichedSnapshot}
                />
              </section>
            </TabsContent>
          </Tabs>
        </main>
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
