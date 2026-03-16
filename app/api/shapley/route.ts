import { NextRequest, NextResponse } from "next/server";
import { getSnapshotUrl } from "@/lib/constants/config";
import type { RawSnapshot } from "@/lib/types/snapshot";
import { parseSnapshot } from "@/lib/utils/snapshot-parser";
import { buildShapleyInput } from "@/lib/utils/shapley-input-builder";
import { computeShapley } from "@/lib/utils/shapley-solver";

// Cache computed Shapley values per epoch (they're expensive to compute)
const shapleyCache = new Map<
  number,
  { data: unknown; timestamp: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const epochStr = searchParams.get("epoch");

  if (!epochStr) {
    return NextResponse.json(
      { error: "epoch parameter required" },
      { status: 400 }
    );
  }

  const epoch = parseInt(epochStr, 10);
  if (isNaN(epoch)) {
    return NextResponse.json(
      { error: "epoch must be a number" },
      { status: 400 }
    );
  }

  // Check cache
  const cached = shapleyCache.get(epoch);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = getSnapshotUrl(epoch);
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Epoch ${epoch} not found` },
        { status: res.status === 404 ? 404 : 500 }
      );
    }

    const raw: RawSnapshot = await res.json();
    const parsed = parseSnapshot(raw);
    const input = buildShapleyInput(raw, parsed);
    const output = computeShapley(input);

    const result = {
      epoch,
      method: "coalition-enumeration-v1",
      operatorCount: Object.keys(output).length,
      values: output,
      inputSummary: {
        deviceCount: input.devices.length,
        privateLinkCount: input.private_links.length,
        publicLinkCount: input.public_links.length,
        demandCount: input.demands.length,
      },
    };

    shapleyCache.set(epoch, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Shapley computation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
