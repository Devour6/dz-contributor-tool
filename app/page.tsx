"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContributorTable } from "@/components/contributors/contributor-table";
import { LinkSimulator } from "@/components/simulator/link-simulator";
import { ContributorCalculator } from "@/components/calculator/contributor-calculator";
import { NetworkMap } from "@/components/network-map";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { useFees } from "@/lib/hooks/use-fees";
import { useEpochs } from "@/lib/hooks/use-epochs";
import { formatNumber, formatSolFromSol } from "@/lib/utils/format";
import { CONTRIBUTOR_SHARE } from "@/lib/constants/config";
import { Users, Cable, MapPin, Coins, Loader2 } from "lucide-react";

export default function Home() {
  const { data: epochsData, isLoading: epochsLoading } = useEpochs();
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);

  // Auto-select latest epoch when data loads
  useEffect(() => {
    if (epochsData?.latest && selectedEpoch === null) {
      setSelectedEpoch(epochsData.latest);
    }
  }, [epochsData, selectedEpoch]);

  const { data: snapshot, isLoading: snapshotLoading } =
    useSnapshot(selectedEpoch);
  const { data: feeHistory, isLoading: feesLoading } = useFees();

  const isLoading = epochsLoading || snapshotLoading;

  const avgFee = feeHistory?.averageFeeSol || 0;

  return (
    <div className="min-h-screen bg-dark">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Epoch selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg tracking-wide text-cream">
              Contributor Analytics
            </h2>
            {snapshot && (
              <p className="text-sm text-cream-40 mt-1">
                DZ Epoch {snapshot.dzEpoch} · Solana Epoch{" "}
                {snapshot.solanaEpoch}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-cream-40">Epoch</label>
            <Select
              value={selectedEpoch?.toString() || ""}
              onValueChange={(v) => setSelectedEpoch(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[120px]" size="sm">
                <SelectValue placeholder={epochsLoading ? "Loading..." : "Select"} />
              </SelectTrigger>
              <SelectContent>
                {epochsData?.available.map((e) => (
                  <SelectItem key={e} value={e.toString()}>
                    Epoch {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 text-cream-30 animate-spin" />
              <p className="text-sm text-cream-40">
                Loading snapshot data...
              </p>
            </div>
          </div>
        ) : snapshot ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                icon={<Users className="size-4" />}
                label="Contributors"
                value={formatNumber(snapshot.contributors.length)}
              />
              <SummaryCard
                icon={<Cable className="size-4" />}
                label="Links"
                value={formatNumber(
                  snapshot.contributors.reduce(
                    (sum, c) => sum + c.linkCount,
                    0
                  )
                )}
              />
              <SummaryCard
                icon={<MapPin className="size-4" />}
                label="Locations"
                value={formatNumber(snapshot.locations.length)}
              />
              <SummaryCard
                icon={<Coins className="size-4" />}
                label="Avg Fee/Epoch (est.)"
                value={
                  feesLoading
                    ? "..."
                    : avgFee > 0
                    ? `${formatSolFromSol(avgFee)} SOL`
                    : "—"
                }
                footnote="Based on historical data — fees currently paused"
              />
            </div>

            {/* Main tabs */}
            <Tabs defaultValue="contributors">
              <TabsList variant="line" className="mb-6">
                <TabsTrigger value="contributors">Contributors</TabsTrigger>
                <TabsTrigger value="map">Network Map</TabsTrigger>
                <TabsTrigger value="simulator">Link Simulator</TabsTrigger>
                <TabsTrigger value="calculator">
                  Contributor Calculator
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contributors">
                <ContributorTable
                  contributors={snapshot.contributors}
                  feeHistory={feeHistory}
                />
              </TabsContent>

              <TabsContent value="map">
                <NetworkMap snapshot={snapshot} />
              </TabsContent>

              <TabsContent value="simulator">
                <LinkSimulator
                  snapshot={snapshot}
                  feeHistory={feeHistory}
                />
              </TabsContent>

              <TabsContent value="calculator">
                <ContributorCalculator
                  snapshot={snapshot}
                  feeHistory={feeHistory}
                />
              </TabsContent>
            </Tabs>
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

function SummaryCard({
  icon,
  label,
  value,
  footnote,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  footnote?: string;
}) {
  return (
    <Card className="bg-cream-5 border-cream-8">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-cream-40 mb-2">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-display text-cream">{value}</p>
        {footnote && (
          <p className="text-[10px] text-amber-400/70 mt-1">{footnote}</p>
        )}
      </CardContent>
    </Card>
  );
}
