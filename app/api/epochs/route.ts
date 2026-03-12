import { NextResponse } from "next/server";
import { getSnapshotUrl } from "@/lib/constants/config";

let epochsCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  // Check cache
  if (epochsCache && Date.now() - epochsCache.timestamp < CACHE_TTL) {
    return NextResponse.json(epochsCache.data);
  }

  try {
    // Binary search for the latest available epoch
    // Start from a known good epoch and scan forward
    let latestEpoch = 48; // known minimum
    let high = 200; // reasonable upper bound
    let low = 48;

    // Binary search for upper bound
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const res = await fetch(getSnapshotUrl(mid), {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        latestEpoch = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Return the last N available epochs (we'll check the most recent 20)
    const epochs: number[] = [];
    for (let e = latestEpoch; e >= Math.max(48, latestEpoch - 30); e--) {
      epochs.push(e);
    }

    const result = {
      latest: latestEpoch,
      earliest: 48,
      available: epochs,
    };

    epochsCache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to discover epochs: ${err}` },
      { status: 500 }
    );
  }
}
