import { NextRequest, NextResponse } from "next/server";
import { getSnapshotUrl, MIN_DZ_EPOCH, MAX_DZ_EPOCH } from "@/lib/constants/config";
import type { RawSnapshot } from "@/lib/types/snapshot";
import type { ShapleyInput, ShapleyOutput } from "@/lib/types/shapley";
import { parseSnapshot } from "@/lib/utils/snapshot-parser";
import { buildShapleyInput } from "@/lib/utils/shapley-input-builder";
import { computeShapley } from "@/lib/utils/shapley-solver";
import { modifyShapleyInput } from "@/lib/utils/shapley-input-modifier";

// Cache baseline computation per epoch — bounded to MAX_CACHE_SIZE entries
const MAX_CACHE_SIZE = 10;
const CACHE_TTL = 30 * 60 * 1000;

const baselineCache = new Map<
  number,
  {
    raw: RawSnapshot;
    input: ShapleyInput;
    baseline: ShapleyOutput;
    timestamp: number;
  }
>();

function evictStaleCache() {
  const now = Date.now();
  for (const [key, entry] of baselineCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      baselineCache.delete(key);
    }
  }
  // If still over limit, evict oldest
  if (baselineCache.size > MAX_CACHE_SIZE) {
    const oldest = [...baselineCache.entries()].sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    while (baselineCache.size > MAX_CACHE_SIZE && oldest.length > 0) {
      baselineCache.delete(oldest.shift()![0]);
    }
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { epoch, contributorCode, removeLinks, addLinks } = body;

  if (
    typeof epoch !== "number" ||
    typeof contributorCode !== "string" ||
    !contributorCode
  ) {
    return NextResponse.json(
      { error: "epoch (number) and contributorCode (string) required" },
      { status: 400 }
    );
  }

  if (epoch < MIN_DZ_EPOCH || epoch > MAX_DZ_EPOCH + 50) {
    return NextResponse.json(
      { error: `Epoch ${epoch} out of valid range (${MIN_DZ_EPOCH}-${MAX_DZ_EPOCH})` },
      { status: 400 }
    );
  }

  const safeRemoveLinks = Array.isArray(removeLinks) ? removeLinks : [];
  const safeAddLinks = Array.isArray(addLinks) ? addLinks : [];

  try {
    evictStaleCache();

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
      safeRemoveLinks,
      safeAddLinks
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Simulation failed: ${message}` },
      { status: 500 }
    );
  }
}
