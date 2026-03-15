import { NextRequest, NextResponse } from "next/server";
import { getSnapshotUrl } from "@/lib/constants/config";
import type { RawSnapshot } from "@/lib/types/snapshot";
import type { ShapleyInput, ShapleyOutput } from "@/lib/types/shapley";
import { parseSnapshot } from "@/lib/utils/snapshot-parser";
import { buildShapleyInput } from "@/lib/utils/shapley-input-builder";
import { computeShapley } from "@/lib/utils/shapley-solver";
import { modifyShapleyInput } from "@/lib/utils/shapley-input-modifier";

// Cache baseline computation per epoch
const baselineCache = new Map<
  number,
  {
    raw: RawSnapshot;
    input: ShapleyInput;
    baseline: ShapleyOutput;
    timestamp: number;
  }
>();
const CACHE_TTL = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { epoch, contributorCode, removeLinks, addLinks } = body;

  if (!epoch || !contributorCode) {
    return NextResponse.json(
      { error: "epoch and contributorCode required" },
      { status: 400 }
    );
  }

  try {
    // Get or build baseline
    let cached = baselineCache.get(epoch);
    if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
      const url = getSnapshotUrl(epoch);
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Epoch ${epoch} not found` },
          { status: 404 }
        );
      }

      const raw: RawSnapshot = await res.json();
      const parsed = parseSnapshot(raw);
      const input = buildShapleyInput(raw, parsed);
      const baseline = computeShapley(input);

      cached = { raw, input, baseline, timestamp: Date.now() };
      baselineCache.set(epoch, cached);
    }

    const { raw, input: baselineInput, baseline } = cached;
    const parsed = parseSnapshot(raw);

    // Build modified input
    const modifiedInput = modifyShapleyInput(
      baselineInput,
      parsed,
      raw,
      contributorCode,
      removeLinks || [],
      addLinks || []
    );

    // Compute modified Shapley
    const modified = computeShapley(modifiedInput);

    const beforeShare = baseline[contributorCode]?.share ?? 0;
    const beforeValue = baseline[contributorCode]?.value ?? 0;
    const afterShare = modified[contributorCode]?.share ?? 0;
    const afterValue = modified[contributorCode]?.value ?? 0;

    return NextResponse.json({
      epoch,
      contributorCode,
      before: { share: beforeShare, value: beforeValue },
      after: { share: afterShare, value: afterValue },
      delta: { share: afterShare - beforeShare },
      allContributors: Object.keys({ ...baseline, ...modified }).map(
        (code) => ({
          code,
          beforeShare: baseline[code]?.share ?? 0,
          afterShare: modified[code]?.share ?? 0,
        })
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Simulation failed: ${err}` },
      { status: 500 }
    );
  }
}
